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
  parsingPatterns,
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
  type RoutingRuleInsert,
  // Parsing pattern types
  type ParsingPattern,
  type ParsingPatternInsert
} from "@shared/schema";

export const storage = {
  /**
   * Gets a list of buildings with the most leads
   */
  async getPopularBuildings(limit: number = 10): Promise<{
    address: string;
    leadsCount: number;
    unitRequests?: number;
  }[]> {
    try {
      // Get all leads with addresses
      const allLeads = await db.query.leads.findMany({
        columns: {
          address: true,
          unitNumber: true
        },
        where: sql`${leads.address} IS NOT NULL AND ${leads.address} != ''`
      });
      
      // Group by building/address
      const buildingMap = new Map<string, { total: number, units: Set<string> }>();
      
      allLeads.forEach(lead => {
        if (lead.address) {
          if (!buildingMap.has(lead.address)) {
            buildingMap.set(lead.address, { 
              total: 0, 
              units: new Set<string>() 
            });
          }
          
          const buildingData = buildingMap.get(lead.address)!;
          buildingData.total++;
          
          // Track unique unit numbers
          if (lead.unitNumber) {
            buildingData.units.add(lead.unitNumber);
          }
        }
      });
      
      // Create results
      return [...buildingMap.entries()]
        .map(([address, data]) => ({
          address,
          leadsCount: data.total,
          unitRequests: data.units.size
        }))
        .sort((a, b) => b.leadsCount - a.leadsCount)
        .slice(0, limit);
    } catch (error) {
      console.error('Error getting popular buildings:', error);
      return [];
    }
  },
  
  /**
   * Gets a list of agents with their lead counts
   */
  async getLeadsPerAgent(): Promise<{
    agent: {
      id: number;
      name: string;
    };
    totalLeads: number;
    closedLeads: number;
    pendingLeads: number;
  }[]> {
    try {
      // Get all agents
      const agents = await db.query.users.findMany({
        where: eq(users.role, 'agent'),
        columns: {
          id: true,
          name: true
        }
      });
      
      // Get all leads and group by agent
      const allLeads = await db.query.leads.findMany({
        where: sql`${leads.assignedAgentId} IS NOT NULL`,
        columns: {
          assignedAgentId: true,
          status: true
        }
      });
      
      // Count leads per agent by status
      const agentLeadStats = new Map<number, { total: number, closed: number, pending: number }>();
      
      // Initialize all agents with zero counts
      agents.forEach(agent => {
        agentLeadStats.set(agent.id, { total: 0, closed: 0, pending: 0 });
      });
      
      // Count leads
      allLeads.forEach(lead => {
        if (lead.assignedAgentId) {
          const stats = agentLeadStats.get(lead.assignedAgentId);
          
          if (stats) {
            stats.total++;
            
            if (lead.status === 'closed') {
              stats.closed++;
            } else if (lead.status === 'pending') {
              stats.pending++;
            }
          }
        }
      });
      
      // Create result
      return agents
        .map(agent => {
          const stats = agentLeadStats.get(agent.id) || { total: 0, closed: 0, pending: 0 };
          return {
            agent: {
              id: agent.id,
              name: agent.name
            },
            totalLeads: stats.total,
            closedLeads: stats.closed,
            pendingLeads: stats.pending
          };
        })
        .sort((a, b) => b.totalLeads - a.totalLeads);
    } catch (error) {
      console.error('Error getting leads per agent:', error);
      return [];
    }
  },

  /**
   * Store a parsing pattern for a specific source
   */
  async storeParsingPattern(patternData: ParsingPatternInsert): Promise<ParsingPattern> {
    try {
      // Check if a pattern already exists for this source
      const existingPattern = await db
        .select()
        .from(parsingPatterns)
        .where(eq(parsingPatterns.source, patternData.source))
        .limit(1);
        
      if (existingPattern.length > 0) {
        // Update existing pattern
        const [updated] = await db
          .update(parsingPatterns)
          .set({
            pattern: patternData.pattern,
            patternType: patternData.patternType || 'ai',
            successCount: existingPattern[0].successCount + 1,
            lastUsed: new Date(),
            updatedAt: new Date()
          })
          .where(eq(parsingPatterns.id, existingPattern[0].id))
          .returning();
          
        return updated;
      } else {
        // Create new pattern
        const [pattern] = await db
          .insert(parsingPatterns)
          .values({
            ...patternData,
            successCount: 1,
            lastUsed: new Date()
          })
          .returning();
          
        return pattern;
      }
    } catch (error) {
      console.error('Error storing parsing pattern:', error);
      throw error;
    }
  },
  
  /**
   * Get parsing pattern by source
   */
  async getParsingPatternBySource(source: string): Promise<ParsingPattern | null> {
    try {
      const patterns = await db
        .select()
        .from(parsingPatterns)
        .where(eq(parsingPatterns.source, source))
        .limit(1);
        
      return patterns.length > 0 ? patterns[0] : null;
    } catch (error) {
      console.error('Error getting parsing pattern:', error);
      return null;
    }
  },
  
  /**
   * Get all parsing patterns
   */
  async getAllParsingPatterns(): Promise<ParsingPattern[]> {
    try {
      return await db
        .select()
        .from(parsingPatterns)
        .orderBy(desc(parsingPatterns.successCount));
    } catch (error) {
      console.error('Error getting all parsing patterns:', error);
      return [];
    }
  },
  
  /**
   * Update parsing pattern success count
   */
  async incrementParsingPatternSuccessCount(id: number): Promise<void> {
    try {
      await db
        .update(parsingPatterns)
        .set({
          successCount: sql`${parsingPatterns.successCount} + 1`,
          lastUsed: new Date(),
          updatedAt: new Date()
        })
        .where(eq(parsingPatterns.id, id));
    } catch (error) {
      console.error('Error updating parsing pattern success count:', error);
    }
  },
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

  async deleteLeadGroup(id: number): Promise<{ success: boolean; errorMessage?: string }> {
    try {
      // Instead of hard-deleting, just mark the group as inactive and update its name
      // to indicate it's been deleted
      const [updated] = await db.update(leadGroups)
        .set({
          isActive: false,
          name: sql`CONCAT(${leadGroups.name}, ' (Deleted)')`,
          updatedAt: new Date()
        })
        .where(eq(leadGroups.id, id))
        .returning();
      
      if (!updated) {
        return {
          success: false,
          errorMessage: `Lead group with ID ${id} not found`
        };
      }
      
      // Remove all members from this group as it's now inactive
      await db.delete(leadGroupMembers)
        .where(eq(leadGroupMembers.groupId, id));
      
      return { success: true };
    } catch (error) {
      console.error("Error soft-deleting lead group:", error);
      return { 
        success: false,
        errorMessage: error instanceof Error ? error.message : 'Unknown error occurred'
      };
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
    // Get all agents and their membership status in this group
    const usersWithMemberships = await db.query.users.findMany({
      where: eq(users.role, 'agent'),
      with: {
        leadGroupMemberships: {
          where: eq(leadGroupMembers.groupId, groupId)
        }
      }
    });
    
    // Only return users who are actually members of this group
    return usersWithMemberships.filter(user => user.leadGroupMemberships.length > 0);
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
    // Build a base query to get all active lead groups
    const baseQuery = db.select().from(leadGroups);
    
    // Create a more complex query with all conditions
    const result = await baseQuery
      .where(eq(leadGroups.isActive, true))
      // Exclude groups that have been soft-deleted (name ends with '(Deleted)')
      .where(sql`${leadGroups.name} NOT LIKE '%(Deleted)'`)
      .where(lead.price ? 
        sql`(${leadGroups.minPrice} IS NULL OR ${leadGroups.minPrice} <= ${parseFloat(lead.price)})` : 
        sql`TRUE`)
      .where(lead.price ? 
        sql`(${leadGroups.maxPrice} IS NULL OR ${leadGroups.maxPrice} >= ${parseFloat(lead.price)})` : 
        sql`TRUE`)
      .where(lead.zipCode ? 
        sql`(${leadGroups.zipCodes} IS NULL OR ${lead.zipCode} = ANY(${leadGroups.zipCodes}))` : 
        sql`TRUE`)
      .where(lead.address && lead.address.trim() !== '' ? 
        sql`(${leadGroups.addressPattern} IS NULL OR ${lead.address} ILIKE '%' || ${leadGroups.addressPattern} || '%')` : 
        sql`TRUE`)
      .orderBy(desc(leadGroups.priority), asc(leadGroups.name));
    
    return result;
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
    
    try {
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
    } catch (error) {
      console.error('Error finding lead by email and window:', error);
      
      // Fallback to basic SQL query if there's a schema mismatch
      try {
        const result = await db.execute(sql`
          SELECT id, name, email, received_at as "receivedAt", updated_at as "updatedAt"
          FROM leads
          WHERE LOWER(email) = ${normalizedEmail}
          AND received_at >= ${windowDate}
          ORDER BY received_at DESC
          LIMIT 1
        `);
        
        if (result.rows.length > 0) {
          console.log(`Found existing lead with ID ${result.rows[0].id} for email ${normalizedEmail} (using SQL fallback)`);
          return result.rows[0] as unknown as Lead;
        } else {
          console.log('No existing lead found (using SQL fallback)');
          return null;
        }
      } catch (fallbackError) {
        console.error('Fallback query also failed:', fallbackError);
        return null;
      }
    }
  },

  async createLead(leadData: LeadInsert): Promise<Lead> {
    try {
      console.log('Creating lead with data:', {
        name: leadData.name,
        email: leadData.email,
        phone: leadData.phone,
        price: leadData.price,
        priceMax: leadData.priceMax,
        zipCode: leadData.zipCode,
        address: leadData.address,
        unitNumber: leadData.unitNumber,
        neighborhood: leadData.neighborhood,
        bedCount: leadData.bedCount,
        source: leadData.source,
        propertyUrl: leadData.propertyUrl ? 'Yes' : 'No',
        thumbnailUrl: leadData.thumbnailUrl ? 'Yes' : 'No',
        originalEmail: leadData.originalEmail ? 'Yes' : 'No',
        notes: leadData.notes ? 'Yes' : 'No'
      });
      
      // Create lead entry
      const [lead] = await db.insert(leads)
        .values(leadData)
        .returning();
        
      console.log('Lead created successfully with ID:', lead.id);
      return lead;
    } catch (error) {
      console.error('Failed to create lead:', error);
      // Rethrow to handle in the calling function
      throw error;
    }
  },

  async getLeadById(id: number): Promise<Lead | null> {
    try {
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
    } catch (error) {
      console.error('Error fetching lead by ID:', error);
      
      // Fallback to minimal SQL query if there's a schema mismatch
      const result = await db.execute(sql`
        SELECT 
          l.id, l.name, l.email, l.phone, l.price, l.price_max as "priceMax", 
          l.zip_code as "zipCode", l.address, l.unit_number as "unitNumber",
          l.neighborhood, l.bed_count as "bedCount", l.source, l.status,
          l.assigned_agent_id as "assignedAgentId", l.lead_group_id as "leadGroupId",
          l.routing_rule_id as "routingRuleId", l.original_email as "originalEmail",
          l.notes, l.property_url as "propertyUrl", 
          l.thumbnail_url as "thumbnailUrl", l.moving_date as "movingDate",
          l.received_at as "receivedAt", l.updated_at as "updatedAt",
          u.id as "agent_id", u.name as "agent_name", u.email as "agent_email"
        FROM leads l
        LEFT JOIN users u ON l.assigned_agent_id = u.id
        WHERE l.id = ${id}
      `);
      
      if (result.rows.length === 0) {
        return null;
      }
      
      const row = result.rows[0];
      
      // Fetch status history separately
      const historyResult = await db.query.leadStatusHistory.findMany({
        where: eq(leadStatusHistory.leadId, id),
        with: { agent: true },
        orderBy: desc(leadStatusHistory.createdAt)
      });
      
      // Process result to match the expected Lead type
      const lead = {
        ...row,
        assignedAgent: row.agent_id ? {
          id: row.agent_id,
          name: row.agent_name,
          email: row.agent_email
        } : null,
        statusHistory: historyResult
      };
      
      // Remove the raw agent fields
      delete lead.agent_id;
      delete lead.agent_name;
      delete lead.agent_email;
      
      return lead as unknown as Lead;
    }
  },

  async getAllLeads(page: number = 1, limit: number = 10, recentHours?: number): Promise<Lead[]> {
    // Using drizzle's findMany to avoid specific column issues
    try {
      // Create where condition if filtering by recent time
      let whereCondition = undefined;
      
      if (recentHours) {
        const cutoffDate = new Date();
        cutoffDate.setHours(cutoffDate.getHours() - recentHours);
        whereCondition = gte(leads.receivedAt, cutoffDate);
      }
      
      // Select only specific columns that we know exist in the schema
      return await db.query.leads.findMany({
        where: whereCondition,
        orderBy: desc(leads.receivedAt),
        limit: limit,
        offset: (page - 1) * limit,
        with: {
          assignedAgent: true
        },
        columns: {
          id: true,
          name: true,
          email: true,
          phone: true,
          price: true,
          priceMax: true,
          zipCode: true, 
          address: true,
          unitNumber: true,
          neighborhood: true,
          bedCount: true,
          source: true,
          status: true,
          assignedAgentId: true,
          leadGroupId: true,
          routingRuleId: true,
          originalEmail: true,
          notes: true,
          propertyUrl: true,
          thumbnailUrl: true,
          movingDate: true,
          receivedAt: true,
          updatedAt: true
        }
      });
    } catch (error) {
      console.error('Error fetching leads:', error);
      
      // Fallback to minimal SQL query if there's a schema mismatch
      let query = sql`
        SELECT 
          l.id, l.name, l.email, l.phone, l.price, l.price_max as "priceMax", 
          l.zip_code as "zipCode", l.address, l.unit_number as "unitNumber",
          l.neighborhood, l.bed_count as "bedCount", l.source, l.status,
          l.assigned_agent_id as "assignedAgentId", l.lead_group_id as "leadGroupId",
          l.routing_rule_id as "routingRuleId", l.original_email as "originalEmail",
          l.notes, l.property_url as "propertyUrl", 
          l.thumbnail_url as "thumbnailUrl", l.moving_date as "movingDate",
          l.received_at as "receivedAt", l.updated_at as "updatedAt",
          u.id as "agent_id", u.name as "agent_name", u.email as "agent_email"
        FROM leads l
        LEFT JOIN users u ON l.assigned_agent_id = u.id
      `;
      
      // Add where condition for recent hours filter
      if (recentHours) {
        const cutoffDate = new Date();
        cutoffDate.setHours(cutoffDate.getHours() - recentHours);
        query = sql`${query} WHERE l.received_at >= ${cutoffDate.toISOString()}`;
      }
      
      // Add ordering and limits
      query = sql`${query} ORDER BY l.received_at DESC LIMIT ${limit} OFFSET ${(page - 1) * limit}`;
      
      const result = await db.execute(query);
      
      // Process the results to match the expected Lead type
      return result.rows.map(row => {
        const lead = {
          ...row,
          assignedAgent: row.agent_id ? {
            id: row.agent_id,
            name: row.agent_name,
            email: row.agent_email
          } : null
        };
        
        // Remove the raw agent fields
        delete lead.agent_id;
        delete lead.agent_name;
        delete lead.agent_email;
        
        return lead as any as Lead;
      });
    }
  },

  async getLeadsByAgentId(agentId: number, page: number = 1, limit: number = 10, recentHours?: number): Promise<Lead[]> {
    try {
      // Create where condition that includes agent ID and (optionally) recent time filter
      let whereCondition = eq(leads.assignedAgentId, agentId);
      
      if (recentHours) {
        const cutoffDate = new Date();
        cutoffDate.setHours(cutoffDate.getHours() - recentHours);
        whereCondition = and(whereCondition, gte(leads.receivedAt, cutoffDate));
      }
      
      return await db.query.leads.findMany({
        where: whereCondition,
        orderBy: desc(leads.receivedAt),
        limit: limit,
        offset: (page - 1) * limit,
        columns: {
          id: true,
          name: true,
          email: true,
          phone: true,
          price: true,
          priceMax: true,
          zipCode: true, 
          address: true,
          unitNumber: true,
          neighborhood: true,
          bedCount: true,
          source: true,
          status: true,
          assignedAgentId: true,
          leadGroupId: true,
          routingRuleId: true,
          originalEmail: true,
          notes: true,
          propertyUrl: true,
          thumbnailUrl: true,
          movingDate: true,
          receivedAt: true,
          updatedAt: true
        }
      });
    } catch (error) {
      console.error('Error fetching leads for agent:', error);
      
      // Fallback to minimal SQL query if there's a schema mismatch
      let query = sql`
        SELECT 
          l.id, l.name, l.email, l.phone, l.price, l.price_max as "priceMax", 
          l.zip_code as "zipCode", l.address, l.unit_number as "unitNumber",
          l.neighborhood, l.bed_count as "bedCount", l.source, l.status,
          l.assigned_agent_id as "assignedAgentId", l.lead_group_id as "leadGroupId",
          l.routing_rule_id as "routingRuleId", l.original_email as "originalEmail",
          l.notes, l.property_url as "propertyUrl", 
          l.thumbnail_url as "thumbnailUrl", l.moving_date as "movingDate",
          l.received_at as "receivedAt", l.updated_at as "updatedAt"
        FROM leads l
        WHERE l.assigned_agent_id = ${agentId}
      `;

      // Add where condition for recent hours filter if provided
      if (recentHours) {
        const cutoffDate = new Date();
        cutoffDate.setHours(cutoffDate.getHours() - recentHours);
        query = sql`${query} AND l.received_at >= ${cutoffDate.toISOString()}`;
      }
      
      // Add ordering and limits
      query = sql`${query} ORDER BY l.received_at DESC LIMIT ${limit} OFFSET ${(page - 1) * limit}`;
      
      const result = await db.execute(query);
      
      // Process the results to match the expected Lead type
      return result.rows.map(row => row as any as Lead);
    }
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
      // Ensure movingDate is properly converted to a Date object if it exists
      let movingDate = null;
      
      if (newData.movingDate && !existingLead.movingDate) {
        // Convert string date or ensure Date object
        movingDate = typeof newData.movingDate === 'string' 
          ? new Date(newData.movingDate) 
          : newData.movingDate instanceof Date 
            ? newData.movingDate 
            : null;
      } else if (existingLead.movingDate) {
        // Use existing date, ensuring it's a Date object
        movingDate = typeof existingLead.movingDate === 'string'
          ? new Date(existingLead.movingDate)
          : existingLead.movingDate instanceof Date
            ? existingLead.movingDate
            : null;
      }

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

      // Update the lead record - making sure to include ALL AI-parsed fields
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
          // Add additional fields from AI parser that were previously missing
          unitNumber: newData.unitNumber || existingLead.unitNumber || null,
          bedCount: newData.bedCount || existingLead.bedCount || null,
          neighborhood: newData.neighborhood || existingLead.neighborhood || null,
          source: newData.source || existingLead.source || null,
          subject: newData.subject || existingLead.subject || null,
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
    try {
      return await db.query.leads.findMany({
        where: eq(leads.status, 'pending'),
        orderBy: asc(leads.receivedAt),
        with: {
          assignedAgent: true
        },
        columns: {
          id: true,
          name: true,
          email: true,
          phone: true,
          price: true,
          priceMax: true,
          zipCode: true, 
          address: true,
          unitNumber: true,
          neighborhood: true,
          bedCount: true,
          source: true,
          status: true,
          assignedAgentId: true,
          leadGroupId: true,
          routingRuleId: true,
          originalEmail: true,
          notes: true,
          propertyUrl: true,
          thumbnailUrl: true,
          movingDate: true,
          receivedAt: true,
          updatedAt: true
        }
      });
    } catch (error) {
      console.error('Error fetching pending leads:', error);
      
      // Fallback to minimal SQL query if there's a schema mismatch
      const result = await db.execute(sql`
        SELECT 
          l.id, l.name, l.email, l.phone, l.price, l.price_max as "priceMax", 
          l.zip_code as "zipCode", l.address, l.unit_number as "unitNumber",
          l.neighborhood, l.bed_count as "bedCount", l.source, l.status,
          l.assigned_agent_id as "assignedAgentId", l.lead_group_id as "leadGroupId",
          l.routing_rule_id as "routingRuleId", l.original_email as "originalEmail",
          l.notes, l.property_url as "propertyUrl", 
          l.thumbnail_url as "thumbnailUrl", l.moving_date as "movingDate",
          l.received_at as "receivedAt", l.updated_at as "updatedAt"
        FROM leads l
        WHERE l.status = 'pending'
        ORDER BY l.received_at ASC
      `);
      
      // Process the results to match the expected Lead type
      return result.rows.map(row => row as any as Lead);
    }
  },

  async getLeadStats(): Promise<{ 
    total: number;
    assigned: number;
    pending: number;
    closed: number;
  }> {
    try {
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
    } catch (error) {
      console.error('Error fetching lead stats:', error);
      
      // Fallback to minimal SQL query if there's a schema mismatch
      const result = await db.execute(sql`
        SELECT status, COUNT(*) as count
        FROM leads
        GROUP BY status
      `);
      
      let total = 0;
      let assigned = 0;
      let pending = 0;
      let closed = 0;
      
      result.rows.forEach(row => {
        const count = parseInt(row.count);
        total += count;
        
        if (row.status === 'assigned') assigned = count;
        else if (row.status === 'pending') pending = count;
        else if (row.status === 'closed') closed = count;
      });
      
      return { total, assigned, pending, closed };
    }
  },
  
  async getTopPerformingAgents(limit: number = 5): Promise<{
    agent: User;
    closedLeadCount: number;
  }[]> {
    try {
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
    } catch (error) {
      console.error('Error fetching top performing agents:', error);
      
      // Fallback to SQL query
      const agents = await db.query.users.findMany({
        where: eq(users.role, 'agent')
      });
      
      const result = await db.execute(sql`
        SELECT l.assigned_agent_id, COUNT(*) as count
        FROM leads l
        WHERE l.status = 'closed' AND l.assigned_agent_id IS NOT NULL
        GROUP BY l.assigned_agent_id
        ORDER BY count DESC
        LIMIT ${limit}
      `);
      
      // Create a map of agent IDs to lead counts
      const agentLeadCounts = new Map<number, number>();
      result.rows.forEach(row => {
        agentLeadCounts.set(parseInt(row.assigned_agent_id), parseInt(row.count));
      });
      
      // Create the result
      return agents
        .map(agent => ({
          agent,
          closedLeadCount: agentLeadCounts.get(agent.id) || 0
        }))
        .sort((a, b) => b.closedLeadCount - a.closedLeadCount)
        .slice(0, limit);
    }
  },

  async getLeadSourceMetrics(): Promise<{
    source: string;
    total: number;
    closed: number;
    closingRate: number;
  }[]> {
    try {
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
    } catch (error) {
      console.error('Error fetching lead source metrics:', error);
      
      // Fallback to SQL query
      const result = await db.execute(sql`
        SELECT 
          COALESCE(source, 'Unknown') as source, 
          COUNT(*) as total,
          SUM(CASE WHEN status = 'closed' THEN 1 ELSE 0 END) as closed
        FROM leads
        GROUP BY source
        ORDER BY total DESC
      `);
      
      return result.rows.map(row => {
        const total = parseInt(row.total);
        const closed = parseInt(row.closed);
        return {
          source: row.source,
          total,
          closed,
          closingRate: total > 0 ? Math.round((closed / total) * 100) : 0
        };
      });
    }
  },
  
  async getPopularProperties(): Promise<{
    zipCode?: string; 
    address?: string;
    priceRange: string;
    count: number;
  }[]> {
    try {
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
    } catch (error) {
      console.error('Error fetching popular properties:', error);
      
      // Fallback to SQL queries
      const results: { zipCode?: string; address?: string; priceRange: string; count: number }[] = [];
      
      // Get top zip codes
      try {
        const zipResult = await db.execute(sql`
          SELECT zip_code as zipCode, COUNT(*) as count
          FROM leads
          WHERE zip_code IS NOT NULL AND zip_code != ''
          GROUP BY zip_code
          ORDER BY count DESC
          LIMIT 5
        `);
        
        zipResult.rows.forEach(row => {
          results.push({ 
            zipCode: row.zipcode, 
            count: parseInt(row.count), 
            priceRange: '' 
          });
        });
      } catch (e) {
        console.error('Error fetching zip codes:', e);
      }
      
      // Get price ranges
      const priceRanges = ['Under $200K', '$200K - $500K', '$500K - $1M', 'Over $1M', 'Unknown'];
      priceRanges.forEach(range => {
        results.push({ priceRange: range, count: 0 });
      });
      
      return results;
    }
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
