/**
 * This script migrates data from the legacy agent groups and routing rules 
 * to the new unified lead groups model.
 */
import { db } from "../db";
import { 
  agentGroups, 
  routingRules, 
  agentGroupMembers, 
  leadGroups, 
  leadGroupMembers,
  type LeadGroupInsert
} from "../shared/schema";
import { eq } from "drizzle-orm";

async function migrateToLeadGroups() {
  console.log('Starting migration to lead groups...');
  
  try {
    // Get all agent groups
    const groups = await db.query.agentGroups.findMany({
      with: {
        members: true,
        routingRules: true
      }
    });
    
    console.log(`Found ${groups.length} agent groups to migrate`);
    
    // For each agent group
    for (const group of groups) {
      console.log(`Migrating group: ${group.name}`);
      
      // For each routing rule associated with this group
      for (const rule of group.routingRules) {
        console.log(`  Processing rule: ${rule.name}`);
        
        // Create a new lead group based on the routing rule
        const leadGroupData: LeadGroupInsert = {
          name: `${group.name} - ${rule.name}`,
          description: rule.description || `Migrated from ${group.name} and rule ${rule.name}`,
          isActive: rule.isActive && group.isActive,
          priority: rule.priority,
          minPrice: rule.minPrice,
          maxPrice: rule.maxPrice,
          zipCodes: rule.zipCodes,
          addressPattern: rule.addressPattern,
          createdAt: new Date(),
          updatedAt: new Date()
        };
        
        // Insert the lead group
        const [newLeadGroup] = await db.insert(leadGroups)
          .values(leadGroupData)
          .returning();
        
        console.log(`  Created lead group: ${newLeadGroup.name} with ID ${newLeadGroup.id}`);
        
        // Copy over agent memberships
        for (const member of group.members) {
          await db.insert(leadGroupMembers)
            .values({
              agentId: member.agentId,
              groupId: newLeadGroup.id,
              last_assignment: member.lastAssignment
            })
            .onConflictDoNothing();
          
          console.log(`  Added agent ${member.agentId} to lead group ${newLeadGroup.id}`);
        }
      }
    }
    
    console.log('Migration completed successfully');
    return true;
  } catch (error) {
    console.error('Error during migration:', error);
    return false;
  }
}

// Run the migration immediately
migrateToLeadGroups()
  .then(success => {
    if (success) {
      console.log('Migration completed successfully');
      process.exit(0);
    } else {
      console.error('Migration failed');
      process.exit(1);
    }
  })
  .catch(error => {
    console.error('Unexpected error during migration:', error);
    process.exit(1);
  });
