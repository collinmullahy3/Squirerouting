import { storage } from '../storage';
import { type Lead, type LeadGroup } from '@shared/schema';
import { emailService } from './email-service';

class LeadRouter {
  /**
   * Routes a lead to the appropriate lead group based on matching criteria
   */
  async routeLead(lead: Lead): Promise<boolean> {
    try {
      // Skip leads that are already assigned
      if (lead.assignedAgentId) {
        return false;
      }

      // Find matching lead groups based on lead criteria
      const matchingGroups = await storage.findMatchingLeadGroups(lead);
      
      if (!matchingGroups || matchingGroups.length === 0) {
        console.log(`No matching lead group found for lead ${lead.id}`);
        return false;
      }

      // Get the highest priority group that has agents
      let selectedGroup: LeadGroup | null = null;
      let selectedAgent: { id: number; name: string } | null = null;
      
      // Try groups in priority order until we find one with available agents
      for (const group of matchingGroups) {
        const agent = await this.getNextAgentInLeadGroup(group.id);
        if (agent) {
          selectedGroup = group;
          selectedAgent = agent;
          break;
        }
      }
      
      if (!selectedGroup || !selectedAgent) {
        console.log(`No available agents in any matching groups for lead ${lead.id}`);
        return false;
      }

      // Record the lead group that was used
      await storage.assignLeadToLeadGroup(lead.id, selectedGroup.id);
      
      // Assign the lead to the agent
      await storage.assignLeadToAgent(lead.id, selectedAgent.id);
      
      // Update the last assignment timestamp for this agent in this group
      await storage.updateAgentLastAssignmentInLeadGroup(selectedAgent.id, selectedGroup.id);
      
      console.log(`Lead ${lead.id} assigned to agent ${selectedAgent.id} in lead group ${selectedGroup.id}`);
      
      // Get the updated lead with assignment details
      const updatedLead = await storage.getLeadById(lead.id);
      if (updatedLead) {
        // Get agent details for notification
        const agentDetails = await storage.getUserById(selectedAgent.id);
        if (agentDetails) {
          // Send email notification to the assigned agent using the native email service
          const emailSent = await emailService.sendLeadNotification(updatedLead, agentDetails);
          console.log(`Email notification to agent ${emailSent ? 'sent successfully' : 'failed'}`);
        }
      }
      
      return true;
    } catch (error) {
      console.error('Error routing lead:', error);
      return false;
    }
  }

  /**
   * Gets the next agent in the lead group using round-robin algorithm
   */
  private async getNextAgentInLeadGroup(groupId: number): Promise<{ id: number; name: string } | null> {
    try {
      // Get all agents in the group
      const agents = await storage.getAgentsByLeadGroupId(groupId);
      
      if (!agents.length) {
        return null;
      }
      
      // Get the group
      const group = await storage.getLeadGroupById(groupId);
      
      if (!group) {
        return null;
      }
      
      // Get agent memberships to access lastAssignment
      const memberships = await db.query.leadGroupMembers.findMany({
        where: eq(leadGroupMembers.groupId, groupId)
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
import { leadGroupMembers, agentGroupMembers } from "@shared/schema";
