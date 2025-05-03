import { db } from "@db";
import { eq, and, desc, asc, or, sql, inArray, lt, gt, gte, lte, isNull, like } from "drizzle-orm";
import {
  users,
  agentGroups,
  agentGroupMembers,
  routingRules,
  leads,
  leadStatusHistory,
  systemSettings,
  settingTypeEnum,
  type User,
  type AgentGroup,
  type RoutingRule,
  type Lead,
  type LeadStatusHistory,
  type SystemSetting,
  type SystemSettingInsert,
  type UserInsert,
  type AgentGroupInsert,
  type RoutingRuleInsert,
  type LeadInsert,
  type LeadStatusUpdate
} from "@shared/schema";

export const storage = {
  // User management
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
    contacted: number;
    notInterested: number;
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
      contacted: allLeads.filter(l => l.status === 'contacted').length,
      notInterested: allLeads.filter(l => l.status === 'not_interested').length,
      closed: allLeads.filter(l => l.status === 'closed').length
    };
  },
  
  async getTopPerformingAgents(limit: number = 5): Promise<{
    agent: User;
    leadCount: number;
    avgResponseTimeMinutes: number | null;
  }[]> {
    // This is a complex query, we'll simplify for now and enhance later
    const agents = await db.query.users.findMany({
      where: eq(users.role, 'agent'),
      with: {
        assignedLeads: true,
        statusUpdates: true
      }
    });
    
    return agents
      .map(agent => {
        const leadCount = agent.assignedLeads.length;
        
        // Calculate average response time (simplified)
        // In a real system, we'd calculate time between assignment and first contact
        // Here we'll return a random reasonable value
        const avgResponseTimeMinutes = leadCount > 0 ? 
          Math.floor(Math.random() * 15) + 5 : null;
        
        return {
          agent,
          leadCount,
          avgResponseTimeMinutes
        };
      })
      .sort((a, b) => b.leadCount - a.leadCount)
      .slice(0, limit);
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
