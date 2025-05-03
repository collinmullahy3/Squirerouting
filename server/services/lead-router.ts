import { storage } from '../storage';
import { type Lead, type RoutingRule, type AgentGroup } from '@shared/schema';
import { emailSender } from './email-sender';

class LeadRouter {
  /**
   * Routes a lead to the appropriate agent group based on routing rules
   */
  async routeLead(lead: Lead): Promise<boolean> {
    try {
      // Skip leads that are already assigned
      if (lead.assignedAgentId) {
        return false;
      }

      // Get all active routing rules
      const rules = await storage.getAllRoutingRules();
      const activeRules = rules.filter(rule => rule.isActive);

      // Find the first matching rule
      const matchingRule = this.findMatchingRule(lead, activeRules);
      
      if (!matchingRule) {
        console.log(`No matching rule found for lead ${lead.id}`);
        return false;
      }

      // Get the agent group for the matching rule
      const group = await storage.getAgentGroupById(matchingRule.groupId);
      
      if (!group || !group.isActive) {
        console.log(`Group ${matchingRule.groupId} not found or inactive`);
        return false;
      }

      // Find the next agent in round-robin fashion
      const agent = await this.getNextAgentInGroup(group.id);
      
      if (!agent) {
        console.log(`No available agents in group ${group.id}`);
        return false;
      }

      // Record the routing rule that was used
      await storage.updateLeadRoutingRule(lead.id, matchingRule.id);
      
      // Assign the lead to the agent
      await storage.assignLeadToAgent(lead.id, agent.id);
      
      // Update the last assignment timestamp for this agent in this group
      await storage.updateAgentLastAssignment(agent.id, group.id);
      
      console.log(`Lead ${lead.id} assigned to agent ${agent.id} in group ${group.id}`);
      
      // Get the updated lead with assignment details
      const updatedLead = await storage.getLeadById(lead.id);
      if (updatedLead) {
        // Send email notification to the assigned agent
        const emailSent = await emailSender.forwardLeadToAgent(updatedLead);
        console.log(`Email notification to agent ${emailSent ? 'sent successfully' : 'failed'}`);
      }
      
      return true;
    } catch (error) {
      console.error('Error routing lead:', error);
      return false;
    }
  }

  /**
   * Finds the first routing rule that matches the lead criteria
   */
  private findMatchingRule(lead: Lead, rules: RoutingRule[]): RoutingRule | null {
    // Sort rules by priority (highest first)
    const sortedRules = [...rules].sort((a, b) => b.priority - a.priority);
    
    for (const rule of sortedRules) {
      let matches = true;
      
      // Check price range if specified
      if (rule.minPrice !== null && lead.price !== null) {
        if (Number(lead.price) < Number(rule.minPrice)) {
          matches = false;
          continue;
        }
      }
      
      if (rule.maxPrice !== null && lead.price !== null) {
        if (Number(lead.price) > Number(rule.maxPrice)) {
          matches = false;
          continue;
        }
      }
      
      // Check zip codes if specified
      if (rule.zipCodes?.length && lead.zipCode) {
        if (!rule.zipCodes.includes(lead.zipCode)) {
          matches = false;
          continue;
        }
      }
      
      // Check address pattern if specified
      if (rule.addressPattern && lead.address) {
        const regex = new RegExp(rule.addressPattern, 'i');
        if (!regex.test(lead.address)) {
          matches = false;
          continue;
        }
      }
      
      // If all checks pass, return this rule
      if (matches) {
        return rule;
      }
    }
    
    return null;
  }

  /**
   * Gets the next agent in the group using round-robin algorithm
   */
  private async getNextAgentInGroup(groupId: number): Promise<{ id: number; name: string } | null> {
    try {
      // Get all agents in the group
      const agents = await storage.getAgentsByGroupId(groupId);
      
      if (!agents.length) {
        return null;
      }
      
      // Get the group
      const group = await storage.getAgentGroupById(groupId);
      
      if (!group) {
        return null;
      }
      
      // Get agent memberships to access lastAssignment
      const memberships = await db.query.agentGroupMembers.findMany({
        where: eq(agentGroupMembers.groupId, groupId)
      });
      
      // Sort agents by last assignment time (oldest first)
      const sortedAgents = agents.map(agent => {
        const membership = memberships.find(m => m.agentId === agent.id);
        return {
          id: agent.id,
          name: agent.name,
          lastAssignment: membership?.lastAssignment || new Date(0) // Use epoch if no assignment
        };
      }).sort((a, b) => {
        return a.lastAssignment.getTime() - b.lastAssignment.getTime();
      });
      
      // Return the agent with the oldest last assignment
      if (sortedAgents.length > 0) {
        return {
          id: sortedAgents[0].id,
          name: sortedAgents[0].name
        };
      }
      
      return null;
    } catch (error) {
      console.error('Error getting next agent:', error);
      return null;
    }
  }

  /**
   * Processes all pending leads
   */
  async processAllPendingLeads(): Promise<number> {
    try {
      const pendingLeads = await storage.getPendingLeads();
      let assignedCount = 0;
      
      for (const lead of pendingLeads) {
        const success = await this.routeLead(lead);
        if (success) {
          assignedCount++;
        }
      }
      
      return assignedCount;
    } catch (error) {
      console.error('Error processing pending leads:', error);
      return 0;
    }
  }
}

// Export a singleton instance
export const leadRouter = new LeadRouter();

// Add database import to fix the method above
import { db } from "@db";
import { eq } from "drizzle-orm";
import { agentGroupMembers } from "@shared/schema";
