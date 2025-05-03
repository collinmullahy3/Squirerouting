import { db } from "@db";
import { eq, and, desc, asc, or, sql, inArray, lt, gt, gte, lte, isNull, like } from "drizzle-orm";
import {
  users,
  // New lead group tables
  leadGroups,
  leadGroupMembers,
  // Legacy tables - for backward compatibility
  agentGroups,
  agentGroupMembers,
  routingRules,
  leads,
  leadStatusHistory,
  systemSettings,
  settingTypeEnum,
  // Types
  type User,
  type Lead,
  type LeadStatusHistory,
  type SystemSetting,
  type SystemSettingInsert,
  type UserInsert,
  type LeadInsert,
  type LeadStatusUpdate,
  // New lead group types
  type LeadGroup,
  type LeadGroupInsert,
  type LeadGroupMember,
  // Legacy types
  type AgentGroup,
  type AgentGroupInsert,
  type RoutingRule,
  type RoutingRuleInsert
} from "@shared/schema";

export const storage = {
  // LEAD GROUPS (NEW UNIFIED SCHEMA)
  async createLeadGroup(groupData: LeadGroupInsert): Promise<LeadGroup> {
    const [group] = await db.insert(leadGroups)
      .values(groupData)
      .returning();
    return group;
  },

  async getLeadGroupById(id: number): Promise<LeadGroup | null> {
    const result = await db.query.leadGroups.findFirst({
      where: eq(leadGroups.id, id),
      with: {
        members: {
          with: {
            agent: true
          }
        },
        leads: true
      }
    });
    return result || null;
  },

  async getAllLeadGroups(): Promise<LeadGroup[]> {
    return await db.query.leadGroups.findMany({
      orderBy: [desc(leadGroups.priority), asc(leadGroups.name)],
      with: {
        members: {
          with: {
            agent: true
          }
        }
      }
    });
  },

  async updateLeadGroup(id: number, groupData: Partial<LeadGroupInsert>): Promise<LeadGroup | null> {
    const [updated] = await db.update(leadGroups)
      .set({ ...groupData, updatedAt: new Date() })
      .where(eq(leadGroups.id, id))
      .returning();
    return updated || null;
  },

  async deleteLeadGroup(id: number): Promise<boolean> {
    try {
      await db.delete(leadGroups)
        .where(eq(leadGroups.id, id));
      return true;
    } catch (error) {
      console.error("Error deleting lead group:", error);
      return false;
    }
  },

  async addAgentToLeadGroup(agentId: number, groupId: number): Promise<boolean> {
    try {
      await db.insert(leadGroupMembers)
        .values({ agentId, groupId })
        .onConflictDoNothing();
      return true;
    } catch (error) {
      console.error("Error adding agent to lead group:", error);
      return false;
    }
  },

  async removeAgentFromLeadGroup(agentId: number, groupId: number): Promise<boolean> {
    try {
      await db.delete(leadGroupMembers)
        .where(and(
          eq(leadGroupMembers.agentId, agentId),
          eq(leadGroupMembers.groupId, groupId)
        ));
      return true;
    } catch (error) {
      console.error("Error removing agent from lead group:", error);
      return false;
    }
  },

  async getAgentsByLeadGroupId(groupId: number): Promise<User[]> {
    return await db.query.users.findMany({
      where: eq(users.role, 'agent'),
      with: {
        leadGroupMemberships: {
          where: eq(leadGroupMembers.groupId, groupId)
        }
      }
    }).then(users => users.filter(user => user.leadGroupMemberships.length > 0));
  },

  async getLeadGroupsByAgentId(agentId: number): Promise<LeadGroup[]> {
    return await db.query.leadGroups.findMany({
      with: {
        members: {
          where: eq(leadGroupMembers.agentId, agentId)
        }
      }
    }).then(groups => groups.filter(group => group.members.length > 0));
  },

  async updateAgentLastAssignmentInLeadGroup(agentId: number, groupId: number): Promise<void> {
    await db.update(leadGroupMembers)
      .set({ lastAssignment: new Date() })
      .where(and(
        eq(leadGroupMembers.agentId, agentId),
        eq(leadGroupMembers.groupId, groupId)
      ));
  },

  async assignLeadToLeadGroup(leadId: number, groupId: number): Promise<Lead | null> {
    const [updated] = await db.update(leads)
      .set({ 
        leadGroupId: groupId,
        updatedAt: new Date() 
      })
      .where(eq(leads.id, leadId))
      .returning();
    return updated || null;
  },

  async findMatchingLeadGroups(lead: Lead): Promise<LeadGroup[]> {
    let query = db.select().from(leadGroups).where(eq(leadGroups.isActive, true));
    
    // Price range matching
    if (lead.price) {
      const price = parseFloat(lead.price);
      // Match groups where:
      // 1. Lead price is >= group minPrice (if set)
      // 2. Lead price is <= group maxPrice (if set)
      // 3. If neither min/max is set, then match all
      query = query.where(or(
        isNull(leadGroups.minPrice),
        lte(leadGroups.minPrice, price)
      )).where(or(
        isNull(leadGroups.maxPrice),
        gte(leadGroups.maxPrice, price)
      ));
    }
    
    // Zip code matching
    if (lead.zipCode) {
      // Match if group zipCodes is null OR if lead zipCode is in the group's zip code array
      query = query.where(or(
        isNull(leadGroups.zipCodes),
        sql`${lead.zipCode} = ANY(${leadGroups.zipCodes})`
      ));
    }
    
    // Address pattern matching
    if (lead.address && lead.address.trim() !== '') {
      query = query.where(or(
        isNull(leadGroups.addressPattern),
        sql`${leadGroups.addressPattern} IS NULL`,
        sql`${lead.address} ILIKE '%' || ${leadGroups.addressPattern} || '%'`
      ));
    }
    
    // Order by priority (highest first) then name
    const matchingGroups = await query.orderBy(desc(leadGroups.priority), asc(leadGroups.name));
    return matchingGroups;
  },
  
  // Legacy User management
  async getUserById(id: number): Promise<User | null> {
    const result = await db.query.users.findFirst({
      where: eq(users.id, id)
    });
    return result || null;
  },

  async getUserByUsername(username: string): Promise<User | null> {
    const result = await db.query.users.findFirst({
      where: eq(users.username, username)
    });
    return result || null;
  },

  async createUser(userData: UserInsert): Promise<User> {
    const [user] = await db.insert(users)
      .values(userData)
      .returning();
    return user;
  },

  async getAllAgents(): Promise<User[]> {
    return await db.query.users.findMany({
      where: eq(users.role, 'agent'),
      orderBy: asc(users.name)
    });
  },

  // Agent Groups
  async createAgentGroup(groupData: AgentGroupInsert): Promise<AgentGroup> {
    const [group] = await db.insert(agentGroups)
      .values(groupData)
      .returning();
    return group;
  },

  async getAgentGroupById(id: number): Promise<AgentGroup | null> {
    const result = await db.query.agentGroups.findFirst({
      where: eq(agentGroups.id, id)
    });
    return result || null;
  },

  async getAllAgentGroups(): Promise<AgentGroup[]> {
    return await db.query.agentGroups.findMany({
      orderBy: asc(agentGroups.name)
    });
  },

  async updateAgentGroup(id: number, groupData: Partial<AgentGroupInsert>): Promise<AgentGroup | null> {
    const [updated] = await db.update(agentGroups)
      .set({ ...groupData, updatedAt: new Date() })
      .where(eq(agentGroups.id, id))
      .returning();
    return updated || null;
  },

  async addAgentToGroup(agentId: number, groupId: number): Promise<boolean> {
    try {
      await db.insert(agentGroupMembers)
        .values({ agentId, groupId })
        .onConflictDoNothing();
      return true;
    } catch (error) {
      console.error("Error adding agent to group:", error);
      return false;
    }
  },

  async removeAgentFromGroup(agentId: number, groupId: number): Promise<boolean> {
    try {
      await db.delete(agentGroupMembers)
        .where(and(
          eq(agentGroupMembers.agentId, agentId),
          eq(agentGroupMembers.groupId, groupId)
        ));
      return true;
    } catch (error) {
      console.error("Error removing agent from group:", error);
      return false;
    }
  },

  async getAgentsByGroupId(groupId: number): Promise<User[]> {
    return await db.query.users.findMany({
      where: eq(users.role, 'agent'),
      with: {
        groupMemberships: {
          where: eq(agentGroupMembers.groupId, groupId)
        }
      }
    }).then(users => users.filter(user => user.groupMemberships.length > 0));
  },

  async getGroupsByAgentId(agentId: number): Promise<AgentGroup[]> {
    return await db.query.agentGroups.findMany({
      with: {
        members: {
          where: eq(agentGroupMembers.agentId, agentId)
        }
      }
    }).then(groups => groups.filter(group => group.members.length > 0));
  },

  // Routing Rules
  async createRoutingRule(ruleData: RoutingRuleInsert): Promise<RoutingRule> {
    const [rule] = await db.insert(routingRules)
      .values(ruleData)
      .returning();
    return rule;
  },

  async getRoutingRuleById(id: number): Promise<RoutingRule | null> {
    const result = await db.query.routingRules.findFirst({
      where: eq(routingRules.id, id)
    });
    return result || null;
  },

  async getAllRoutingRules(): Promise<RoutingRule[]> {
    return await db.query.routingRules.findMany({
      orderBy: [desc(routingRules.priority), asc(routingRules.name)]
    });
  },

  async getRoutingRulesByGroupId(groupId: number): Promise<RoutingRule[]> {
    return await db.query.routingRules.findMany({
      where: eq(routingRules.groupId, groupId),
      orderBy: [desc(routingRules.priority), asc(routingRules.name)]
    });
  },

  async updateRoutingRule(id: number, ruleData: Partial<RoutingRuleInsert>): Promise<RoutingRule | null> {
    const [updated] = await db.update(routingRules)
      .set({ ...ruleData, updatedAt: new Date() })
      .where(eq(routingRules.id, id))
      .returning();
    return updated || null;
  },

  async deleteRoutingRule(id: number): Promise<boolean> {
    try {
      await db.delete(routingRules)
        .where(eq(routingRules.id, id));
      return true;
    } catch (error) {
      console.error("Error deleting routing rule:", error);
      return false;
    }
  },

  // Leads
  async getLeadByEmailAndWindow(email: string, windowDays: number): Promise<Lead | null> {
    const windowDate = new Date();
    windowDate.setDate(windowDate.getDate() - windowDays);
    
    // Normalize email to lowercase for case-insensitive comparison
    const normalizedEmail = email.toLowerCase();
    console.log(`Looking for leads with email ${normalizedEmail} after ${windowDate}`);
    
    // Use SQL to make a case-insensitive query
    const result = await db.query.leads.findFirst({
      where: and(
        sql`LOWER(${leads.email}) = ${normalizedEmail}`,
        gte(leads.receivedAt, windowDate)
      ),
      orderBy: [desc(leads.receivedAt)],
      with: {
        assignedAgent: true
      }
    });
    
    if (result) {
      console.log(`Found existing lead with ID ${result.id} for email ${normalizedEmail}`);
    } else {
      console.log(`No existing lead found for email ${normalizedEmail} within date window`);
    }
    
    return result || null;
  },

  async createLead(leadData: LeadInsert): Promise<Lead> {
    const [lead] = await db.insert(leads)
      .values(leadData)
      .returning();
    return lead;
  },

  async getLeadById(id: number): Promise<Lead | null> {
    const result = await db.query.leads.findFirst({
      where: eq(leads.id, id),
      with: {
        assignedAgent: true,
        // Include new lead group relation
        leadGroup: true,
        // Legacy routing rule relation
        routingRule: true,
        statusHistory: {
          with: {
            agent: true
          },
          orderBy: desc(leadStatusHistory.createdAt)
        }
      }
    });
    return result || null;
  },

  async getAllLeads(page: number = 1, limit: number = 10): Promise<Lead[]> {
    return await db.query.leads.findMany({
      orderBy: desc(leads.receivedAt),
      limit: limit,
      offset: (page - 1) * limit,
      with: {
        assignedAgent: true
      }
    });
  },

  async getLeadsByAgentId(agentId: number, page: number = 1, limit: number = 10): Promise<Lead[]> {
    return await db.query.leads.findMany({
      where: eq(leads.assignedAgentId, agentId),
      orderBy: desc(leads.receivedAt),
      limit: limit,
      offset: (page - 1) * limit
    });
  },

  async updateLeadStatus(id: number, agentId: number | null, statusUpdate: LeadStatusUpdate): Promise<Lead | null> {
    // Start a transaction to update lead status and add history entry
    return await db.transaction(async (tx) => {
      // Update the lead status
      const [updatedLead] = await tx.update(leads)
        .set({ 
          status: statusUpdate.status, 
          updatedAt: new Date(),
          notes: statusUpdate.notes || null,
          assignedAgentId: agentId
        })
        .where(eq(leads.id, id))
        .returning();
      
      if (!updatedLead) {
        return null;
      }
      
      // Add a status history entry
      await tx.insert(leadStatusHistory).values({
        leadId: id,
        agentId: agentId,
        status: statusUpdate.status,
        notes: statusUpdate.notes || null
      });
      
      return updatedLead;
    });
  },

  async updateLeadFromNewInquiry(id: number, newData: Partial<LeadInsert>): Promise<Lead | null> {
    try {
      // First get the existing lead to combine data properly
      const existingLead = await this.getLeadById(id);
      if (!existingLead) {
        console.error('Cannot update - lead not found:', id);
        return null;
      }

      // Store all original emails in a combined format
      let combinedOriginalEmail = existingLead.originalEmail || '';
      if (newData.originalEmail) {
        // Add a separator between emails
        const dateStr = new Date().toLocaleString();
        const emailSeparator = `\n\n==== NEW INQUIRY (${dateStr}) ====\n\n`;
        combinedOriginalEmail = combinedOriginalEmail 
          ? combinedOriginalEmail + emailSeparator + newData.originalEmail
          : newData.originalEmail;
      }

      // Combine original notes with new notes if available
      let combinedNotes = existingLead.notes || '';
      if (newData.notes) {
        const newInquiryNote = `\n\n---\nNew inquiry on ${new Date().toLocaleDateString()}:\n${newData.notes}`;
        combinedNotes = combinedNotes ? combinedNotes + newInquiryNote : newData.notes;
      }

      // Check if zip code is different and track multiple zip codes in notes
      if (newData.zipCode && existingLead.zipCode && existingLead.zipCode !== newData.zipCode) {
        // Add the additional zip code to notes
        const zipAddition = `\n\nAdditional zip code from new inquiry: ${newData.zipCode}`;
        combinedNotes += zipAddition;
      }

      // Update to combine price information for price ranges
      let updatedPrice = existingLead.price;
      let updatedPriceMax = existingLead.priceMax;

      if (newData.price) {
        // Convert prices to numbers for comparison
        const oldPrice = existingLead.price ? parseFloat(existingLead.price) : null;
        const newPrice = parseFloat(newData.price);
        
        // If we have a max price from either existing or new, set up a range
        const oldPriceMax = existingLead.priceMax ? parseFloat(existingLead.priceMax) : null;
        const newPriceMax = newData.priceMax ? parseFloat(newData.priceMax) : null;
        
        // Calculate the new price range
        if (oldPrice !== null && newPrice) {
          if (oldPriceMax !== null || newPriceMax !== null) {
            // We have a range scenario
            updatedPrice = String(Math.min(oldPrice, newPrice));
            // Max will be the greatest of all values
            const maxValues = [oldPrice, newPrice];
            if (oldPriceMax !== null) maxValues.push(oldPriceMax);
            if (newPriceMax !== null) maxValues.push(newPriceMax);
            updatedPriceMax = String(Math.max(...maxValues));
          } else {
            // We have two prices but no explicit range
            if (oldPrice !== newPrice) {
              updatedPrice = String(Math.min(oldPrice, newPrice));
              updatedPriceMax = String(Math.max(oldPrice, newPrice));
            }
          }
        }
      }

      // Track additional addresses in notes if provided and different
      if (newData.address && existingLead.address && existingLead.address !== newData.address) {
        const addressAddition = `\n\nAdditional address from new inquiry:\n${newData.address}`;
        combinedNotes += addressAddition;
      }

      // Compile additional property information
      const propertyUrlAddition = existingLead.propertyUrl && newData.propertyUrl && 
                                 existingLead.propertyUrl !== newData.propertyUrl 
        ? `\n\nAdditional property link from new inquiry:\n${newData.propertyUrl}` 
        : '';

      if (propertyUrlAddition) {
        combinedNotes += propertyUrlAddition;
      }

      // For moving date, prefer the new one if the old one doesn't exist
      const movingDate = newData.movingDate && !existingLead.movingDate 
        ? newData.movingDate 
        : existingLead.movingDate;

      console.log('Updating lead with new inquiry data:', {
        id,
        oldPrice: existingLead.price,
        newPrice: newData.price,
        updatedPrice,
        updatedPriceMax,
        oldZipCode: existingLead.zipCode,
        newZipCode: newData.zipCode,
        hasNewNotes: Boolean(newData.notes),
        hasNewPropertyUrl: Boolean(newData.propertyUrl),
        combinedNotesLength: combinedNotes.length,
        hasNewEmail: Boolean(newData.originalEmail)
      });

      // Update the lead record
      const [updatedLead] = await db.update(leads)
        .set({
          price: updatedPrice,
          priceMax: updatedPriceMax,
          notes: combinedNotes || null,
          movingDate: movingDate,
          // Store all emails
          originalEmail: combinedOriginalEmail,
          // Keep the original values unless they were empty
          address: existingLead.address || newData.address || null,
          zipCode: existingLead.zipCode || newData.zipCode || null,
          propertyUrl: newData.propertyUrl && !existingLead.propertyUrl ? newData.propertyUrl : existingLead.propertyUrl,
          thumbnailUrl: newData.thumbnailUrl && !existingLead.thumbnailUrl ? newData.thumbnailUrl : existingLead.thumbnailUrl,
          updatedAt: new Date()
        })
        .where(eq(leads.id, id))
        .returning();

      return updatedLead || null;
    } catch (error) {
      console.error('Error updating lead from new inquiry:', error);
      return null;
    }
  },

  async updateLeadRoutingRule(leadId: number, ruleId: number): Promise<Lead | null> {
    const [updatedLead] = await db.update(leads)
      .set({
        routingRuleId: ruleId,
        updatedAt: new Date()
      })
      .where(eq(leads.id, leadId))
      .returning();
    
    return updatedLead || null;
  },

  async assignLeadToAgent(leadId: number, agentId: number): Promise<Lead | null> {
    return await this.updateLeadStatus(
      leadId, 
      agentId, 
      { status: 'assigned', notes: 'Automatically assigned via routing rules' }
    );
  },

  async updateAgentLastAssignment(agentId: number, groupId: number): Promise<void> {
    await db.update(agentGroupMembers)
      .set({ lastAssignment: new Date() })
      .where(and(
        eq(agentGroupMembers.agentId, agentId),
        eq(agentGroupMembers.groupId, groupId)
      ));
  },

  async getPendingLeads(): Promise<Lead[]> {
    return await db.query.leads.findMany({
      where: eq(leads.status, 'pending'),
      orderBy: asc(leads.receivedAt)
    });
  },

  async getLeadStats(): Promise<{ 
    total: number;
    assigned: number;
    pending: number;
    closed: number;
  }> {
    const allLeads = await db.query.leads.findMany({
      columns: {
        status: true
      }
    });
    
    return {
      total: allLeads.length,
      assigned: allLeads.filter(l => l.status === 'assigned').length,
      pending: allLeads.filter(l => l.status === 'pending').length,
      closed: allLeads.filter(l => l.status === 'closed').length
    };
  },
  
  async getTopPerformingAgents(limit: number = 5): Promise<{
    agent: User;
    closedLeadCount: number;
  }[]> {
    // Get all agents
    const agents = await db.query.users.findMany({
      where: eq(users.role, 'agent')
    });
    
    // Get all leads and count closed ones per agent
    const allLeads = await db.query.leads.findMany({
      where: sql`${leads.assignedAgentId} IS NOT NULL`,
      columns: {
        assignedAgentId: true,
        status: true
      }
    });
    
    // Count leads per agent
    const agentLeadCounts = new Map<number, number>();
    allLeads.forEach(lead => {
      if (lead.status === 'closed' && lead.assignedAgentId) {
        const currentCount = agentLeadCounts.get(lead.assignedAgentId) || 0;
        agentLeadCounts.set(lead.assignedAgentId, currentCount + 1);
      }
    });
    
    // Create result
    return agents
      .map(agent => ({
        agent,
        closedLeadCount: agentLeadCounts.get(agent.id) || 0
      }))
      .sort((a, b) => b.closedLeadCount - a.closedLeadCount)
      .slice(0, limit);
  },

  async getLeadSourceMetrics(): Promise<{
    source: string;
    total: number;
    closed: number;
    closingRate: number;
  }[]> {
    // Get all leads grouped by source
    const allLeads = await db.query.leads.findMany({
      columns: {
        source: true,
        status: true
      }
    });
    
    // Group leads by source
    const sourceMap = new Map<string, { total: number; closed: number }>();
    
    allLeads.forEach(lead => {
      const source = lead.source || 'Unknown';
      
      if (!sourceMap.has(source)) {
        sourceMap.set(source, { total: 0, closed: 0 });
      }
      
      const sourceData = sourceMap.get(source)!;
      sourceData.total++;
      
      if (lead.status === 'closed') {
        sourceData.closed++;
      }
    });
    
    // Convert map to array and calculate rates
    return Array.from(sourceMap.entries())
      .map(([source, data]) => ({
        source,
        total: data.total,
        closed: data.closed,
        closingRate: data.total > 0 ? Math.round((data.closed / data.total) * 100) : 0
      }))
      .sort((a, b) => b.total - a.total);
  },
  
  async getPopularProperties(): Promise<{
    zipCode?: string; 
    address?: string;
    priceRange: string;
    count: number;
  }[]> {
    // Get all leads
    const allLeads = await db.query.leads.findMany({
      columns: {
        address: true,
        zipCode: true,
        price: true,
        priceMax: true
      }
    });
    
    // Group by zip code
    const zipCodeMap = new Map<string, number>();
    const addressMap = new Map<string, number>();
    const priceRangeMap = new Map<string, number>();
    
    allLeads.forEach(lead => {
      // Handle zip codes
      if (lead.zipCode) {
        const count = zipCodeMap.get(lead.zipCode) || 0;
        zipCodeMap.set(lead.zipCode, count + 1);
      }
      
      // Handle addresses (partial matching on key parts)
      if (lead.address) {
        // Extract notable parts of address (keywords like street names, neighborhoods)
        const keywords = lead.address.split(/\s+/)
          .filter(word => word.length > 3 && !['road', 'street', 'avenue', 'lane', 'drive', 'place', 'court'].includes(word.toLowerCase()))
          .map(word => word.toLowerCase());
        
        keywords.forEach(keyword => {
          const count = addressMap.get(keyword) || 0;
          addressMap.set(keyword, count + 1);
        });
      }
      
      // Handle price ranges
      let priceRange = 'Unknown';
      
      if (lead.price) {
        const price = Number(lead.price);
        const priceMax = lead.priceMax ? Number(lead.priceMax) : price;
        
        if (price < 200000) {
          priceRange = 'Under $200K';
        } else if (price < 500000) {
          priceRange = '$200K - $500K';
        } else if (price < 1000000) {
          priceRange = '$500K - $1M';
        } else {
          priceRange = 'Over $1M';
        }
      }
      
      const rangeCount = priceRangeMap.get(priceRange) || 0;
      priceRangeMap.set(priceRange, rangeCount + 1);
    });
    
    // Create results array
    const results: { zipCode?: string; address?: string; priceRange: string; count: number }[] = [];
    
    // Add top zip codes
    Array.from(zipCodeMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .forEach(([zipCode, count]) => {
        results.push({ zipCode, count, priceRange: '' });
      });
      
    // Add top address keywords
    Array.from(addressMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .forEach(([address, count]) => {
        results.push({ address, count, priceRange: '' });
      });
    
    // Add price ranges
    Array.from(priceRangeMap.entries())
      .sort((a, b) => b[1] - a[1])
      .forEach(([priceRange, count]) => {
        results.push({ priceRange, count });
      });
    
    return results;
  },

  // System Settings Management
  async getSettingByKey(key: string): Promise<SystemSetting | null> {
    const result = await db.query.systemSettings.findFirst({
      where: eq(systemSettings.key, key)
    });
    return result || null;
  },

  async getAllSettings(type?: string): Promise<SystemSetting[]> {
    let query = db.query.systemSettings;
    
    if (type) {
      return await query.findMany({
        where: eq(systemSettings.type, type as any),
        orderBy: asc(systemSettings.key)
      });
    }
    
    return await query.findMany({
      orderBy: [asc(systemSettings.type), asc(systemSettings.key)]
    });
  },

  async updateSetting(
    key: string, 
    value: string, 
    type: string = 'system', 
    userId?: number,
    description?: string
  ): Promise<SystemSetting> {
    // Check if setting exists
    const existing = await this.getSettingByKey(key);
    
    if (existing) {
      // Update existing setting
      const [updated] = await db.update(systemSettings)
        .set({ 
          value, 
          updatedAt: new Date(),
          updatedBy: userId || null,
          description: description || existing.description
        })
        .where(eq(systemSettings.key, key))
        .returning();
      
      return updated;
    } else {
      // Create new setting
      const [setting] = await db.insert(systemSettings)
        .values({
          key,
          value,
          type: type as any,
          description,
          updatedBy: userId || null
        })
        .returning();
      
      return setting;
    }
  },

  async deleteSetting(key: string): Promise<boolean> {
    try {
      await db.delete(systemSettings)
        .where(eq(systemSettings.key, key));
      return true;
    } catch (error) {
      console.error("Error deleting setting:", error);
      return false;
    }
  }
};
