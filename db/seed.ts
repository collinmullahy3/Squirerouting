import { db } from "./index";
import * as schema from "@shared/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";

const BCRYPT_SALT_ROUNDS = 10;

async function seed() {
  try {
    console.log("Starting database seed...");
    
    // Check if we already have users to avoid re-seeding
    const existingUsers = await db.query.users.findMany();
    if (existingUsers.length > 0) {
      console.log("Database already has users. Skipping seed.");
      return;
    }
    
    // Create managers
    const adminPassword = await bcrypt.hash("admin123", BCRYPT_SALT_ROUNDS);
    
    const [adminUser] = await db.insert(schema.users).values({
      username: "admin",
      password: adminPassword,
      email: "admin@leadrouter.com",
      name: "Admin User",
      role: "manager",
      phone: "(555) 123-4567",
      avatarUrl: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80"
    }).returning();
    
    console.log("Created admin user:", adminUser.username);
    
    // Create agents
    const agents = [
      {
        username: "emily.j",
        password: await bcrypt.hash("emily123", BCRYPT_SALT_ROUNDS),
        email: "emily.j@example.com",
        name: "Emily Johnson",
        role: "agent",
        phone: "(555) 234-5678",
        avatarUrl: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facearea&facepad=4&w=256&h=256&q=60"
      },
      {
        username: "robert.c",
        password: await bcrypt.hash("robert123", BCRYPT_SALT_ROUNDS),
        email: "robert.c@example.com",
        name: "Robert Chen",
        role: "agent",
        phone: "(555) 345-6789",
        avatarUrl: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facearea&facepad=4&w=256&h=256&q=60"
      },
      {
        username: "david.w",
        password: await bcrypt.hash("david123", BCRYPT_SALT_ROUNDS),
        email: "david.w@example.com",
        name: "David Wilson",
        role: "agent",
        phone: "(555) 456-7890",
        avatarUrl: "https://images.unsplash.com/photo-1566492031773-4f4e44671857?ixlib=rb-1.2.1&auto=format&fit=facearea&facepad=4&w=256&h=256&q=60"
      }
    ];
    
    const createdAgents = await db.insert(schema.users).values(agents).returning();
    console.log(`Created ${createdAgents.length} agents`);
    
    // Create agent groups
    const groups = [
      {
        name: "Luxury Homes",
        description: "Agents specializing in high-end luxury properties",
        isActive: true
      },
      {
        name: "Downtown Condos",
        description: "Agents focused on urban condo sales",
        isActive: true
      },
      {
        name: "Suburban Homes",
        description: "Agents specializing in suburban residential properties",
        isActive: true
      },
      {
        name: "New Construction",
        description: "Agents handling new development properties",
        isActive: false
      }
    ];
    
    const createdGroups = await db.insert(schema.agentGroups).values(groups).returning();
    console.log(`Created ${createdGroups.length} agent groups`);
    
    // Assign agents to groups
    const memberships = [
      { agentId: createdAgents[0].id, groupId: createdGroups[0].id },
      { agentId: createdAgents[1].id, groupId: createdGroups[1].id },
      { agentId: createdAgents[2].id, groupId: createdGroups[2].id },
      // Cross-assignments for variety
      { agentId: createdAgents[0].id, groupId: createdGroups[1].id },
      { agentId: createdAgents[1].id, groupId: createdGroups[2].id },
      { agentId: createdAgents[2].id, groupId: createdGroups[0].id }
    ];
    
    await db.insert(schema.agentGroupMembers).values(memberships);
    console.log(`Created ${memberships.length} group memberships`);
    
    // Create routing rules
    const rules = [
      {
        groupId: createdGroups[0].id, // Luxury Homes
        name: "High-end Properties",
        description: "Properties over $1M",
        minPrice: 1000000,
        priority: 10,
        isActive: true
      },
      {
        groupId: createdGroups[1].id, // Downtown Condos
        name: "Downtown Area",
        description: "Properties in downtown zip codes",
        zipCodes: ["94103", "94102", "94105"],
        priority: 5,
        isActive: true
      },
      {
        groupId: createdGroups[2].id, // Suburban Homes
        name: "Mid-range Properties",
        description: "Suburban properties between $500K-$900K",
        minPrice: 500000,
        maxPrice: 900000,
        priority: 3,
        isActive: true
      }
    ];
    
    const createdRules = await db.insert(schema.routingRules).values(rules).returning();
    console.log(`Created ${createdRules.length} routing rules`);
    
    // Create sample leads
    const leads = [
      {
        name: "Sarah Thompson",
        email: "sarah.t@example.com",
        phone: "(555) 123-4567",
        price: 845000,
        zipCode: "94103",
        address: "123 Main Street, San Francisco, CA 94103",
        source: "Email",
        status: "assigned",
        assignedAgentId: createdAgents[0].id,
        receivedAt: new Date("2023-01-07")
      },
      {
        name: "Michael Rodriguez",
        email: "mike.rod@example.com",
        phone: "(555) 987-6543",
        price: 1250000,
        zipCode: "94041",
        address: "456 Oak Avenue, Mountain View, CA 94041",
        source: "Email",
        status: "pending",
        receivedAt: new Date("2023-01-05")
      },
      {
        name: "Jennifer Wu",
        email: "jwu@example.com",
        phone: "(555) 765-4321",
        price: 925000,
        zipCode: "95113",
        address: "789 Pine Street, San Jose, CA 95113",
        source: "Email",
        status: "assigned",
        assignedAgentId: createdAgents[2].id,
        receivedAt: new Date("2023-01-04")
      }
    ];
    
    const createdLeads = await db.insert(schema.leads).values(leads).returning();
    console.log(`Created ${createdLeads.length} leads`);
    
    // Create system settings
    await db.insert(schema.systemSettings).values([
      {
        key: "LEAD_DEDUPLICATION_DAYS",
        value: "7",
        type: "system",
        description: "Number of days to consider emails from the same sender as part of the same lead"
      },
      {
        key: "EMAIL_POLLING_FREQUENCY_SECONDS",
        value: "60",
        type: "system",
        description: "How often the system automatically checks for new emails in seconds"
      }
    ]);
    console.log("Created system settings");

    // Create lead status history
    const statusHistories = [
      {
        leadId: createdLeads[0].id,
        agentId: createdAgents[0].id,
        status: "assigned",
        notes: "Lead automatically assigned",
        createdAt: new Date("2023-01-07T12:30:00")
      },
      {
        leadId: createdLeads[0].id,
        agentId: createdAgents[0].id,
        status: "contacted",
        notes: "Initial contact made via email",
        createdAt: new Date("2023-01-07T14:15:00")
      },
      {
        leadId: createdLeads[2].id,
        agentId: createdAgents[2].id,
        status: "assigned",
        notes: "Lead automatically assigned",
        createdAt: new Date("2023-01-04T09:45:00")
      }
    ];
    
    await db.insert(schema.leadStatusHistory).values(statusHistories);
    console.log(`Created ${statusHistories.length} status history entries`);
    
    console.log("Database seed completed successfully!");
  } catch (error) {
    console.error("Error seeding database:", error);
  }
}

seed();
