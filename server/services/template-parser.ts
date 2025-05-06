import { LeadInsert, ParsingPattern } from '@shared/schema';
import { storage } from '../storage';

/**
 * Parse email using stored templates instead of AI
 */
export async function parseEmailWithTemplates(
  emailContent: string,
  subject: string,
  emailFrom: string
): Promise<Partial<LeadInsert> | null> {
  try {
    // First detect the likely source of the email
    const source = detectSourceFromEmail(emailContent, subject, emailFrom);
    
    if (!source) {
      console.log('Unable to detect source from email');
      return null;
    }
    
    console.log(`Detected source: ${source}, attempting to parse using templates`);
    
    // Get stored pattern for this source
    const storedPattern = await storage.getParsingPatternBySource(source);
    
    if (!storedPattern) {
      console.log(`No parsing pattern found for source: ${source}`);
      return null;
    }
    
    console.log(`Found pattern for ${source}, last used: ${storedPattern.lastUsed}`);
    
    // Use the template to extract data
    const extractedData = extractDataFromTemplate(emailContent, subject, emailFrom, storedPattern);
    
    if (extractedData) {
      // Increment success count for pattern
      await storage.incrementParsingPatternSuccessCount(storedPattern.id);
      console.log(`Successfully parsed email using template for ${source}`);
    }
    
    return extractedData;
  } catch (error) {
    console.error('Template parsing error:', error);
    return null;
  }
}

/**
 * Detect the source of the email based on domain, content patterns, etc.
 */
function detectSourceFromEmail(emailContent: string, subject: string, emailFrom: string): string | null {
  // Convert all inputs to lowercase for case-insensitive matching
  const contentLower = emailContent.toLowerCase();
  const subjectLower = subject.toLowerCase();
  const fromLower = emailFrom.toLowerCase();
  
  // Check the email sender domain first
  if (fromLower.includes('@zumper.com') || fromLower.includes('zumper.com')) {
    return 'Zumper';
  }
  
  if (fromLower.includes('@zillow.com') || fromLower.includes('zillow.com')) {
    return 'Zillow';
  }
  
  if (fromLower.includes('@myspacenyc.com') || fromLower.includes('myspacenyc.com')) {
    return 'MySpace NYC';
  }
  
  if (fromLower.includes('@cazamio.com') || fromLower.includes('cazamio.com')) {
    return 'Cazamio';
  }
  
  if (fromLower.includes('@compass.com') || fromLower.includes('compass.com')) {
    return 'Compass';
  }
  
  if (fromLower.includes('@theguarantors.com') || fromLower.includes('guarantors')) {
    return 'TheGuarantors';
  }
  
  if (fromLower.includes('@bondnewyork.com') || fromLower.includes('bond new york')) {
    return 'Bond New York';
  }
  
  // Check email content and subject line for clues
  if (contentLower.includes('zumper') || subjectLower.includes('zumper')) {
    return 'Zumper';
  }
  
  if (contentLower.includes('zillow') || subjectLower.includes('zillow')) {
    return 'Zillow';
  }
  
  if (contentLower.includes('myspace nyc') || subjectLower.includes('myspace nyc')) {
    return 'MySpace NYC';
  }
  
  if (contentLower.includes('cazamio') || subjectLower.includes('cazamio')) {
    return 'Cazamio';
  }
  
  if (contentLower.includes('guarantors') || subjectLower.includes('guarantors')) {
    return 'TheGuarantors';
  }
  
  if (contentLower.includes('bond') || subjectLower.includes('bond new york')) {
    return 'Bond New York';
  }
  
  // If we can't determine the source, return null
  return null;
}

/**
 * Extract data using the stored template pattern
 */
function extractDataFromTemplate(
  emailContent: string,
  subject: string,
  emailFrom: string,
  pattern: ParsingPattern
): Partial<LeadInsert> | null {
  try {
    // The pattern.pattern field contains a JSON string of a previously successful extraction
    // Parse it to use as a template
    const templateData = JSON.parse(pattern.pattern);
    
    // Create a new lead object based on the template
    const leadData: Partial<LeadInsert> = {
      // Always use these fields from the current email
      originalEmail: emailContent,
      subject,
      source: pattern.source,
      receivedAt: new Date(),
      updatedAt: new Date(),
      
      // Extract data from email using regex patterns based on the source
      ...extractSourceSpecificData(emailContent, subject, emailFrom, pattern.source)
    };
    
    // Use template data as fallback for any missing fields
    // This ensures we parse what we can from the email but still have reasonable defaults
    const result = {
      ...templateData,  // Template data as base
      ...leadData,      // Overwrite with any fields we successfully extracted
      
      // Always use current email and timestamp data
      originalEmail: emailContent,
      subject,
      receivedAt: new Date(),
      updatedAt: new Date(),
    };
    
    // Format the name field by combining firstName and lastName if they exist
    if (result.firstName || result.lastName) {
      result.name = [result.firstName, result.lastName].filter(Boolean).join(' ');
    }
    
    console.log('Extracted data using template:', {
      source: pattern.source,
      name: result.name,
      email: result.email,
      phone: result.phone,
      address: result.address,
      zipCode: result.zipCode
    });
    
    return result;
  } catch (error) {
    console.error('Error extracting data from template:', error);
    return null;
  }
}

/**
 * Extract source-specific data using regex patterns
 */
function extractSourceSpecificData(
  emailContent: string,
  subject: string,
  emailFrom: string,
  source: string
): Partial<LeadInsert> {
  const data: Partial<LeadInsert> = {};
  
  // Common patterns that work across multiple sources
  // Email address
  const emailRegex = /([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9._-]+)/gi;
  const emailMatches = emailContent.match(emailRegex) || [];
  if (emailMatches.length > 0) {
    // Filter out sender domains that shouldn't be considered as the renter's email
    const excludeDomains = ['zumper.com', 'zillow.com', 'myspacenyc.com', 'cazamio.com', 'compass.com', 'theguarantors.com', 'bondnewyork.com'];
    const validEmails = emailMatches.filter(email => {
      const domain = email.split('@')[1].toLowerCase();
      return !excludeDomains.some(excl => domain.includes(excl));
    });
    
    if (validEmails.length > 0) {
      data.email = validEmails[0].toLowerCase();
    }
  }
  
  // Phone number (various formats)
  const phoneRegex = /\(?([0-9]{3})\)?[-. ]?([0-9]{3})[-. ]?([0-9]{4})/g;
  const phoneMatches = emailContent.match(phoneRegex) || [];
  if (phoneMatches.length > 0) {
    // Clean up phone format to just digits
    data.phone = phoneMatches[0].replace(/\D/g, '');
  }
  
  // ZIP code
  const zipRegex = /\b\d{5}(?:-\d{4})?\b/g;
  const zipMatches = emailContent.match(zipRegex) || [];
  if (zipMatches.length > 0) {
    data.zipCode = zipMatches[0];
  }
  
  // Common price formats ($X,XXX, $X.XK, etc.)
  const priceRegex = /\$([0-9]{1,3}(,[0-9]{3})*?(\.[0-9]+)?|[0-9]+k|[0-9]+(\.[0-9]+)?k)/gi;
  const priceMatches = emailContent.match(priceRegex) || [];
  if (priceMatches.length > 0) {
    const cleanPrice = priceMatches[0].replace(/[$,]/g, '');
    
    // Handle 'k' notation (e.g., '$3.5k' -> '3500')
    if (cleanPrice.toLowerCase().endsWith('k')) {
      const numValue = parseFloat(cleanPrice.toLowerCase().replace('k', '')) * 1000;
      data.price = String(numValue);
    } else {
      data.price = cleanPrice;
    }
  }
  
  // Source-specific extraction patterns
  switch (source) {
    case 'Zumper':
      // Zumper-specific extraction
      if (emailContent.includes('bedroom')) {
        const bedRegex = /(\d+)\s*bedroom/i;
        const bedMatch = emailContent.match(bedRegex);
        if (bedMatch && bedMatch[1]) {
          data.bedCount = parseInt(bedMatch[1]);
        }
      }
      
      // Zumper often includes property URLs
      const zumperUrlRegex = /(https:\/\/www\.zumper\.com\/[^\s"]+)/i;
      const zumperUrlMatch = emailContent.match(zumperUrlRegex);
      if (zumperUrlMatch && zumperUrlMatch[1]) {
        data.propertyUrl = zumperUrlMatch[1];
      }
      break;
      
    case 'Zillow':
      // Zillow-specific extraction
      const zillowUrlRegex = /(https:\/\/www\.zillow\.com\/[^\s"]+)/i;
      const zillowUrlMatch = emailContent.match(zillowUrlRegex);
      if (zillowUrlMatch && zillowUrlMatch[1]) {
        data.propertyUrl = zillowUrlMatch[1];
      }
      break;
      
    case 'Cazamio':
      // Cazamio-specific extraction
      const cazamioUrlRegex = /(https:\/\/landlord\.cazamio\.com\/[^\s"]+)/i;
      const cazamioUrlMatch = emailContent.match(cazamioUrlRegex);
      if (cazamioUrlMatch && cazamioUrlMatch[1]) {
        data.propertyUrl = cazamioUrlMatch[1];
      }
      break;
      
    // Add more source-specific extractors as needed
  }
  
  return data;
}
