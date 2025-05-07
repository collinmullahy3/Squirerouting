/**
 * CRM Integration Service
 * Handles export and import of leads data for integration with external CRM systems
 */

import { Lead, User } from '@shared/schema';
import { storage } from '../storage';

/**
 * Formats for exporting lead data
 */
export enum ExportFormat {
  CSV = 'csv',
  JSON = 'json',
}

/**
 * Options for exporting leads
 */
export interface ExportOptions {
  format: ExportFormat;
  agentId?: number;
  dateRange?: {
    startDate: Date;
    endDate: Date;
  };
  leadStatus?: string;
  includeNotes?: boolean;
}

/**
 * Export leads to CSV format
 */
async function exportToCSV(leads: Lead[], options: ExportOptions): Promise<string> {
  // Header row
  const header = [
    'ID', 'Name', 'Email', 'Phone', 'Address', 'Unit', 'Zip Code', 
    'Price', 'Price Max', 'Source', 'Status', 'Created At', 
    'Assigned Agent', 'Bed Count', 'Neighborhood'
  ];
  
  if (options.includeNotes) {
    header.push('Notes');
  }
  
  const rows = [header.join(',')];
  
  // Get all agent names for reference
  const agents = await storage.getAllAgents();
  const agentMap = new Map<number, string>();
  
  agents.forEach(agent => {
    agentMap.set(agent.id, agent.name || agent.username);
  });
  
  // Process each lead
  for (const lead of leads) {
    const agentName = lead.agentId ? agentMap.get(lead.agentId) || 'Unassigned' : 'Unassigned';
    
    // Escape and format each field to handle commas, quotes, etc.
    const row = [
      lead.id,
      formatCSVField(lead.name),
      formatCSVField(lead.email),
      formatCSVField(lead.phone || ''),
      formatCSVField(lead.address || ''),
      formatCSVField(lead.unitNumber || ''),
      formatCSVField(lead.zipCode || ''),
      lead.price || '',
      lead.priceMax || '',
      formatCSVField(lead.source || ''),
      lead.status,
      formatDate(lead.createdAt),
      formatCSVField(agentName),
      lead.bedCount || '',
      formatCSVField(lead.neighborhood || '')
    ];
    
    if (options.includeNotes) {
      row.push(formatCSVField(lead.notes || ''));
    }
    
    rows.push(row.join(','));
  }
  
  return rows.join('\n');
}

/**
 * Export leads to JSON format
 */
async function exportToJSON(leads: Lead[], options: ExportOptions): Promise<string> {
  // If we need to include agent names instead of just IDs
  const agents = await storage.getAllAgents();
  const agentMap = new Map<number, User>();
  
  agents.forEach(agent => {
    agentMap.set(agent.id, agent);
  });
  
  // Transform leads to include full agent info and other enhancements
  const enrichedLeads = leads.map(lead => {
    const result: any = { ...lead };
    
    // Add agent info if assigned
    if (lead.agentId && agentMap.has(lead.agentId)) {
      const agent = agentMap.get(lead.agentId);
      result.agent = {
        id: agent?.id,
        name: agent?.name,
        email: agent?.email,
      };
    } else {
      result.agent = null;
    }
    
    // Format date for better readability
    result.createdAtFormatted = formatDate(lead.createdAt);
    result.updatedAtFormatted = lead.updatedAt ? formatDate(lead.updatedAt) : null;
    
    // Remove any sensitive fields that shouldn't be exported
    delete result.agentNotes;
    
    return result;
  });
  
  return JSON.stringify(enrichedLeads, null, 2);
}

/**
 * Export leads based on the specified format and filters
 */
export async function exportLeads(options: ExportOptions): Promise<{ data: string, filename: string }> {
  console.log('Exporting leads with options:', options);
  
  // Determine the query filters based on options
  const filters: Record<string, any> = {};
  
  if (options.agentId) {
    filters.agentId = options.agentId;
  }
  
  if (options.leadStatus) {
    filters.status = options.leadStatus;
  }
  
  if (options.dateRange) {
    filters.dateRange = options.dateRange;
  }
  
  // Get all leads matching the filters - passing undefined for recentHours to get all leads
  const leads = await storage.getAllLeads(1, 1000);
  
  // Generate the filename
  const timestamp = new Date().toISOString().replace(/[:.-]/g, '').substring(0, 14);
  const filename = `squire_leads_export_${timestamp}.${options.format}`;
  
  // Export based on the requested format
  let data: string;
  
  if (options.format === ExportFormat.CSV) {
    data = await exportToCSV(leads, options);
  } else if (options.format === ExportFormat.JSON) {
    data = await exportToJSON(leads, options);
  } else {
    throw new Error(`Unsupported export format: ${options.format}`);
  }
  
  return { data, filename };
}

/**
 * Import leads from CSV format
 */
export async function importFromCSV(csvData: string): Promise<{ 
  success: boolean; 
  imported: number; 
  errors: string[]; 
  warnings: string[];
}> {
  const lines = csvData.split('\n');
  const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
  
  const result = {
    success: false,
    imported: 0,
    errors: [] as string[],
    warnings: [] as string[]
  };
  
  // Make sure we have the minimum required fields
  const requiredFields = ['name', 'email'];
  const missingFields = requiredFields.filter(field => !headers.includes(field));
  
  if (missingFields.length > 0) {
    result.errors.push(`Missing required fields: ${missingFields.join(', ')}`);
    return result;
  }
  
  // Process each line (skip header)
  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue;
    
    try {
      const values = parseCSVLine(lines[i]);
      const leadData: any = {};
      
      // Map CSV values to lead properties
      headers.forEach((header, index) => {
        if (values[index] !== undefined && values[index] !== '') {
          // Convert header names to camelCase for our schema
          const key = header
            .replace(/(?:^|_)([a-z])/g, (_, letter) => letter.toUpperCase())
            .replace(/^(.)/, (_, letter) => letter.toLowerCase())
            .replace(/\s+/g, '');
            
          leadData[key] = values[index];
        }
      });
      
      // Special handling for critical fields
      if (!leadData.email) {
        result.warnings.push(`Row ${i}: Missing email, skipping`);
        continue;
      }
      
      // Check if this lead already exists
      const existingLead = await storage.getLeadByEmailAndWindow(leadData.email, 30); // 30 day window
      
      if (existingLead) {
        // Update existing lead
        await storage.updateLeadFromNewInquiry(existingLead.id, leadData);
        result.warnings.push(`Row ${i}: Updated existing lead for ${leadData.email}`);
      } else {
        // Create new lead
        await storage.createLead({
          ...leadData,
          status: 'pending',
          createdAt: new Date()
        });
        result.imported++;
      }
    } catch (error) {
      result.errors.push(`Error processing row ${i}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  
  result.success = result.errors.length === 0;
  return result;
}

/**
 * Import leads from JSON format
 */
export async function importFromJSON(jsonData: string): Promise<{ 
  success: boolean; 
  imported: number; 
  errors: string[]; 
  warnings: string[];
}> {
  const result = {
    success: false,
    imported: 0,
    errors: [] as string[],
    warnings: [] as string[]
  };
  
  let leads: any[];
  
  try {
    leads = JSON.parse(jsonData);
    if (!Array.isArray(leads)) {
      leads = [leads]; // Convert single object to array
    }
  } catch (error) {
    result.errors.push(`Invalid JSON format: ${error instanceof Error ? error.message : String(error)}`);
    return result;
  }
  
  // Process each lead
  for (let i = 0; i < leads.length; i++) {
    const leadData = leads[i];
    
    try {
      // Validate required fields
      if (!leadData.email) {
        result.warnings.push(`Lead ${i}: Missing email, skipping`);
        continue;
      }
      
      if (!leadData.name) {
        result.warnings.push(`Lead ${i}: Missing name, using email as name`);
        leadData.name = leadData.email;
      }
      
      // Check if this lead already exists
      const existingLead = await storage.getLeadByEmailAndWindow(leadData.email, 30); // 30 day window
      
      if (existingLead) {
        // Update existing lead
        await storage.updateLeadFromNewInquiry(existingLead.id, leadData);
        result.warnings.push(`Lead ${i}: Updated existing lead for ${leadData.email}`);
      } else {
        // Create new lead
        await storage.createLead({
          ...leadData,
          status: 'pending',
          createdAt: new Date()
        });
        result.imported++;
      }
    } catch (error) {
      result.errors.push(`Error processing lead ${i}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  
  result.success = result.errors.length === 0 || result.imported > 0;
  return result;
}

/**
 * Import leads from the specified format
 */
export async function importLeads(format: ExportFormat, data: string): Promise<{ 
  success: boolean; 
  imported: number; 
  errors: string[]; 
  warnings: string[];
}> {
  console.log(`Importing leads from ${format} format`);
  
  if (format === ExportFormat.CSV) {
    return importFromCSV(data);
  } else if (format === ExportFormat.JSON) {
    return importFromJSON(data);
  } else {
    return {
      success: false,
      imported: 0,
      errors: [`Unsupported import format: ${format}`],
      warnings: []
    };
  }
}

/**
 * Format a field for CSV output, adding quotes if needed
 */
function formatCSVField(value: string): string {
  if (!value) return '';
  
  // If the value contains quotes, commas, or newlines, it needs to be quoted
  if (value.includes('"') || value.includes(',') || value.includes('\n')) {
    // Double up any quotes and wrap the whole thing in quotes
    return `"${value.replace(/"/g, '""')}"`;
  }
  
  return value;
}

/**
 * Format a date value for export
 */
function formatDate(date: Date | string | null): string {
  if (!date) return '';
  
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return dateObj.toISOString().split('T')[0];
}

/**
 * Parse a CSV line, handling quoted fields and special characters
 */
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      // Check for escaped quotes (double quotes)
      if (i < line.length - 1 && line[i + 1] === '"') {
        current += '"';
        i++; // Skip the next quote
      } else {
        // Toggle quote mode
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      // End of field
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  
  // Add the last field
  result.push(current);
  
  return result;
}