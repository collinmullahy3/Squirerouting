import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { emailService } from "./services/email-service";
import { leadRouter } from "./services/lead-router";
import { 
  userLoginSchema, 
  agentGroupInsertSchema, 
  routingRuleInsertSchema, 
  leadStatusUpdateSchema,
  leadGroupInsertSchema,
  users,
  leadGroupMembers,
  leads,
  leadStatusHistory
} from "@shared/schema";
import { z } from "zod";
import session from "express-session";
import pgSession from "connect-pg-simple";
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import bcrypt from "bcryptjs";
import { pool, db } from "@db";
import { eq } from "drizzle-orm";

export async function registerRoutes(app: Express): Promise<Server> {
  // Set up session store with PostgreSQL
  const PgSessionStore = pgSession(session);
  
  app.use(
    session({
      store: new PgSessionStore({
        pool,
        tableName: "session",
        createTableIfMissing: true,
      }),
      secret: process.env.SESSION_SECRET || "squire-session-secret",
      resave: true,
      saveUninitialized: true,
      cookie: { 
        secure: false, // Set to false for both development and production since we're not using HTTPS
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
        httpOnly: true,
        sameSite: 'lax'
      },
    })
  );
  
  // Log session to help with debugging
  app.use((req, res, next) => {
    console.log('Session ID:', req.sessionID);
    next();
  });
  
  // Initialize passport for authentication
  app.use(passport.initialize());
  app.use(passport.session());
  
  // Set up local strategy for authentication
  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        const user = await storage.getUserByUsername(username);
        if (!user) {
          return done(null, false, { message: "Incorrect username." });
        }
        
        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) {
          return done(null, false, { message: "Incorrect password." });
        }
        
        return done(null, user);
      } catch (err) {
        return done(err);
      }
    })
  );
  
  passport.serializeUser((user: any, done) => {
    done(null, user.id);
  });
  
  passport.deserializeUser(async (id: number, done) => {
    try {
      const user = await storage.getUserById(id);
      if (!user) {
        console.error('User not found in deserializeUser, id:', id);
        return done(null, false);
      }
      console.log('User deserialized:', { id: user.id, username: user.username, role: user.role });
      done(null, user);
    } catch (err) {
      console.error('Error in deserializeUser:', err);
      done(err);
    }
  });
  
  // Email service initialization
  const emailInitialized = await emailService.initialize();
  if (emailInitialized) {
    console.log("Email service started successfully");
  } else {
    console.log("Email service initialization failed");
  }
  
  // Authentication middleware
  const isAuthenticated = (req: Request, res: Response, next: Function) => {
    console.log('isAuthenticated middleware called', { 
      isAuthenticated: req.isAuthenticated(),
      user: req.user,
      session: req.session
    });
    if (req.isAuthenticated()) {
      return next();
    }
    res.status(401).json({ message: "Not authorized" });
  };
  
  const isManager = (req: Request, res: Response, next: Function) => {
    if (req.isAuthenticated() && req.user) {
      console.log('Checking manager role:', { 
        user: req.user, 
        role: (req.user as any).role,
        isManager: (req.user as any).role === 'manager'
      });
      if ((req.user as any).role === "manager") {
        return next();
      }
    }
    res.status(403).json({ message: "Forbidden: Manager role required" });
  };
  
  // Authentication routes
  app.post("/api/auth/login", (req, res, next) => {
    try {
      const { username, password } = userLoginSchema.parse(req.body);
      
      passport.authenticate("local", (err: any, user: any, info: any) => {
        if (err) {
          return next(err);
        }
        if (!user) {
          return res.status(400).json({ message: info.message });
        }
        req.logIn(user, (err) => {
          if (err) {
            return next(err);
          }
          console.log('User authenticated and session established:', { 
            id: user.id, 
            username: user.username, 
            sessionID: req.sessionID 
          });

          // Force session save to ensure it's written to the store
          req.session.save(err => {
            if (err) {
              console.error('Error saving session:', err);
              return next(err);
            }
            
            return res.json({
              id: user.id,
              username: user.username,
              name: user.name,
              email: user.email,
              role: user.role,
            });
          });
        });
      })(req, res, next);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ errors: error.errors });
      }
      next(error);
    }
  });
  
  app.post("/api/auth/logout", (req, res) => {
    req.logout(function() {
      res.json({ success: true });
    });
  });
  
  app.get("/api/auth/me", isAuthenticated, (req, res) => {
    const user = req.user as any;
    res.json({
      id: user.id,
      username: user.username,
      name: user.name,
      email: user.email,
      role: user.role,
      phone: user.phone,
      avatarUrl: user.avatarUrl,
    });
  });
  
  // Agent Group routes
  app.get("/api/agent-groups", isAuthenticated, async (req, res, next) => {
    try {
      const groups = await storage.getAllAgentGroups();
      res.json(groups);
    } catch (error) {
      next(error);
    }
  });
  
  app.get("/api/agent-groups/:id", isAuthenticated, async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid ID" });
      }
      
      const group = await storage.getAgentGroupById(id);
      if (!group) {
        return res.status(404).json({ message: "Group not found" });
      }
      
      res.json(group);
    } catch (error) {
      next(error);
    }
  });
  
  app.post("/api/agent-groups", isManager, async (req, res, next) => {
    try {
      const groupData = agentGroupInsertSchema.parse(req.body);
      const group = await storage.createAgentGroup(groupData);
      res.status(201).json(group);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ errors: error.errors });
      }
      next(error);
    }
  });
  
  app.put("/api/agent-groups/:id", isManager, async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid ID" });
      }
      
      const groupData = agentGroupInsertSchema.parse(req.body);
      const updatedGroup = await storage.updateAgentGroup(id, groupData);
      
      if (!updatedGroup) {
        return res.status(404).json({ message: "Group not found" });
      }
      
      res.json(updatedGroup);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ errors: error.errors });
      }
      next(error);
    }
  });
  
  app.post("/api/agent-groups/:groupId/members/:agentId", isManager, async (req, res, next) => {
    try {
      const groupId = parseInt(req.params.groupId);
      const agentId = parseInt(req.params.agentId);
      
      if (isNaN(groupId) || isNaN(agentId)) {
        return res.status(400).json({ message: "Invalid IDs" });
      }
      
      const success = await storage.addAgentToGroup(agentId, groupId);
      
      if (!success) {
        return res.status(400).json({ message: "Failed to add agent to group" });
      }
      
      res.status(201).json({ success: true });
    } catch (error) {
      next(error);
    }
  });
  
  app.delete("/api/agent-groups/:groupId/members/:agentId", isManager, async (req, res, next) => {
    try {
      const groupId = parseInt(req.params.groupId);
      const agentId = parseInt(req.params.agentId);
      
      if (isNaN(groupId) || isNaN(agentId)) {
        return res.status(400).json({ message: "Invalid IDs" });
      }
      
      const success = await storage.removeAgentFromGroup(agentId, groupId);
      
      res.json({ success });
    } catch (error) {
      next(error);
    }
  });
  
  app.get("/api/agent-groups/:id/members", isAuthenticated, async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid ID" });
      }
      
      const agents = await storage.getAgentsByGroupId(id);
      res.json(agents);
    } catch (error) {
      next(error);
    }
  });
  
  // Routing Rules routes
  app.get("/api/routing-rules", isAuthenticated, async (req, res, next) => {
    try {
      const rules = await storage.getAllRoutingRules();
      res.json(rules);
    } catch (error) {
      next(error);
    }
  });
  
  app.get("/api/routing-rules/:id", isAuthenticated, async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid ID" });
      }
      
      const rule = await storage.getRoutingRuleById(id);
      if (!rule) {
        return res.status(404).json({ message: "Rule not found" });
      }
      
      res.json(rule);
    } catch (error) {
      next(error);
    }
  });
  
  app.post("/api/routing-rules", isManager, async (req, res, next) => {
    try {
      const ruleData = routingRuleInsertSchema.parse(req.body);
      const rule = await storage.createRoutingRule(ruleData);
      res.status(201).json(rule);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ errors: error.errors });
      }
      next(error);
    }
  });
  
  app.put("/api/routing-rules/:id", isManager, async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid ID" });
      }
      
      const ruleData = routingRuleInsertSchema.parse(req.body);
      const updatedRule = await storage.updateRoutingRule(id, ruleData);
      
      if (!updatedRule) {
        return res.status(404).json({ message: "Rule not found" });
      }
      
      res.json(updatedRule);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ errors: error.errors });
      }
      next(error);
    }
  });
  
  app.delete("/api/routing-rules/:id", isManager, async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid ID" });
      }
      
      const success = await storage.deleteRoutingRule(id);
      
      res.json({ success });
    } catch (error) {
      next(error);
    }
  });
  
  app.get("/api/routing-rules/group/:groupId", isAuthenticated, async (req, res, next) => {
    try {
      const groupId = parseInt(req.params.groupId);
      if (isNaN(groupId)) {
        return res.status(400).json({ message: "Invalid group ID" });
      }
      
      const rules = await storage.getRoutingRulesByGroupId(groupId);
      res.json(rules);
    } catch (error) {
      next(error);
    }
  });
  
  // Debug Lead retrieval route - completely open for debugging
  app.get("/api/debug/leads", async (req, res, next) => {
    console.log('Debug leads endpoint accessed - bypassing auth check');
    try {
      const page = parseInt(req.query.page as string || "1");
      const limit = parseInt(req.query.limit as string || "10");
      
      const leads = await storage.getAllLeads(page, limit);
      res.json(leads);
    } catch (error) {
      console.error('Error in debug leads endpoint:', error);
      next(error);
    }
  });

  // Leads routes
  app.get("/api/leads", isAuthenticated, async (req, res, next) => {
    try {
      const page = parseInt(req.query.page as string || "1");
      const limit = parseInt(req.query.limit as string || "10");
      
      const leads = await storage.getAllLeads(page, limit);
      res.json(leads);
    } catch (error) {
      next(error);
    }
  });
  
  // Debug Lead details retrieval route - completely open for debugging
  app.get("/api/debug/leads/:id", async (req, res, next) => {
    console.log('Debug lead details endpoint accessed - bypassing auth check');
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid ID" });
      }
      
      const lead = await storage.getLeadById(id);
      if (!lead) {
        return res.status(404).json({ message: "Lead not found" });
      }
      
      res.json(lead);
    } catch (error) {
      console.error('Error in debug lead details endpoint:', error);
      next(error);
    }
  });

  app.get("/api/leads/:id", isAuthenticated, async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid ID" });
      }
      
      const lead = await storage.getLeadById(id);
      if (!lead) {
        return res.status(404).json({ message: "Lead not found" });
      }
      
      res.json(lead);
    } catch (error) {
      next(error);
    }
  });
  
  app.get("/api/leads/agent/:agentId", isAuthenticated, async (req, res, next) => {
    try {
      const agentId = parseInt(req.params.agentId);
      if (isNaN(agentId)) {
        return res.status(400).json({ message: "Invalid agent ID" });
      }
      
      // Check if the request is from the agent themselves or a manager
      const user = req.user as any;
      if (user.role !== "manager" && user.id !== agentId) {
        return res.status(403).json({ message: "You can only view your own leads" });
      }
      
      const page = parseInt(req.query.page as string || "1");
      const limit = parseInt(req.query.limit as string || "10");
      
      const leads = await storage.getLeadsByAgentId(agentId, page, limit);
      res.json(leads);
    } catch (error) {
      next(error);
    }
  });
  
  app.post("/api/leads/:id/status", isAuthenticated, async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid ID" });
      }
      
      const statusUpdate = leadStatusUpdateSchema.parse(req.body);
      const user = req.user as any;
      
      const lead = await storage.getLeadById(id);
      if (!lead) {
        return res.status(404).json({ message: "Lead not found" });
      }
      
      // Only the assigned agent or a manager can update status
      if (user.role !== "manager" && lead.assignedAgentId !== user.id) {
        return res.status(403).json({ message: "You can only update your own leads" });
      }
      
      const updatedLead = await storage.updateLeadStatus(id, user.id, statusUpdate);
      
      if (!updatedLead) {
        return res.status(404).json({ message: "Lead not found" });
      }
      
      res.json(updatedLead);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ errors: error.errors });
      }
      next(error);
    }
  });
  
  app.post("/api/leads/:id/assign/:agentId", isManager, async (req, res, next) => {
    try {
      const leadId = parseInt(req.params.id);
      const agentId = parseInt(req.params.agentId);
      
      if (isNaN(leadId) || isNaN(agentId)) {
        return res.status(400).json({ message: "Invalid IDs" });
      }
      
      const updatedLead = await storage.assignLeadToAgent(leadId, agentId);
      
      if (!updatedLead) {
        return res.status(404).json({ message: "Lead not found" });
      }
      
      // Send email notification to the assigned agent
      const { emailSender } = await import('./services/email-sender');
      const emailSent = await emailSender.forwardLeadToAgent(updatedLead);
      console.log(`Email notification to agent ${emailSent ? 'sent successfully' : 'failed'}`);
      
      res.json({ ...updatedLead, emailSent });
    } catch (error) {
      next(error);
    }
  });
  
  // Agent routes
  app.get("/api/agents", isAuthenticated, async (req, res, next) => {
    try {
      const agents = await storage.getAllAgents();
      
      // For each agent, get their lead groups
      const agentsWithGroups = await Promise.all(agents.map(async (agent) => {
        const groups = await storage.getLeadGroupsByAgentId(agent.id);
        return {
          id: agent.id,
          name: agent.name,
          email: agent.email,
          username: agent.username,
          phone: agent.phone,
          avatarUrl: agent.avatarUrl,
          groups
        };
      }));
      
      res.json(agentsWithGroups);
    } catch (error) {
      next(error);
    }
  });
  
  app.post("/api/agents", isManager, async (req, res, next) => {
    try {
      // Import the schema at the top of the file
      const { userInsertSchema } = await import("@shared/schema");
      
      // Parse and validate the request body
      const agentData = userInsertSchema.parse({
        ...req.body,
        role: "agent", // Force role to be "agent"
        // Hash the password
        password: await bcrypt.hash(req.body.password, 10)
      });
      
      // Create the agent
      const agent = await storage.createUser(agentData);
      
      // Remove the password from the response
      const { password, ...agentWithoutPassword } = agent;
      
      res.status(201).json(agentWithoutPassword);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ errors: error.errors });
      }
      next(error);
    }
  });
  
  // Debug Dashboard data routes - bypasses auth for debugging
  app.get("/api/debug/dashboard/stats", async (req, res, next) => {
    console.log('Debug dashboard stats endpoint accessed - bypassing auth check');
    try {
      const leadStats = await storage.getLeadStats();
      const agents = await storage.getAllAgents();
      
      res.json({
        totalLeads: leadStats.total,
        assignedLeads: leadStats.assigned,
        pendingLeads: leadStats.pending,
        activeAgents: agents.length,
      });
    } catch (error) {
      console.error('Error in debug dashboard stats endpoint:', error);
      next(error);
    }
  });

  // Dashboard data routes
  app.get("/api/dashboard/stats", isAuthenticated, async (req, res, next) => {
    try {
      const leadStats = await storage.getLeadStats();
      const agents = await storage.getAllAgents();
      
      res.json({
        totalLeads: leadStats.total,
        assignedLeads: leadStats.assigned,
        pendingLeads: leadStats.pending,
        activeAgents: agents.length,
      });
    } catch (error) {
      next(error);
    }
  });
  
  app.get("/api/dashboard/top-agents", isAuthenticated, async (req, res, next) => {
    try {
      const topAgents = await storage.getTopPerformingAgents();
      
      res.json(topAgents.map(item => ({
        id: item.agent.id,
        name: item.agent.name,
        email: item.agent.email,
        closedLeadCount: item.closedLeadCount,
        avatarUrl: item.agent.avatarUrl,
      })));
    } catch (error) {
      next(error);
    }
  });
  
  app.get("/api/dashboard/lead-sources", isAuthenticated, async (req, res, next) => {
    try {
      const sources = await storage.getLeadSourceMetrics();
      res.json(sources);
    } catch (error) {
      next(error);
    }
  });
  
  app.get("/api/dashboard/popular-properties", isAuthenticated, async (req, res, next) => {
    try {
      const properties = await storage.getPopularProperties();
      res.json(properties);
    } catch (error) {
      next(error);
    }
  });
  
  // Manual trigger for routing pending leads (for testing or scheduling)
  app.post("/api/admin/process-pending-leads", isManager, async (req, res, next) => {
    try {
      const count = await leadRouter.processAllPendingLeads();
      res.json({ success: true, processedCount: count });
    } catch (error) {
      next(error);
    }
  });
  
  // Check email service status (for admin/monitoring)
  app.get("/api/admin/email-service-status", isManager, (req, res) => {
    res.json({
      isRunning: emailService.isListening,
      initialized: emailInitialized,
      forwardingEmail: emailService.forwardingEmail
    });
  });
  
  // Get email credentials
  app.get("/api/admin/email-credentials", isManager, async (req, res, next) => {
    try {
      const emailUserSetting = await storage.getSettingByKey("EMAIL_USER");
      const emailPasswordSetting = await storage.getSettingByKey("EMAIL_PASSWORD");
      
      res.json({
        emailUser: emailUserSetting?.value || process.env.EMAIL_USER || '',
        // We don't send the actual password, just whether it exists
        hasPassword: !!(emailPasswordSetting?.value || process.env.EMAIL_PASSWORD)
      });
    } catch (error) {
      next(error);
    }
  });
  
  // Update email credentials
  app.post("/api/admin/email-credentials", isManager, async (req, res, next) => {
    try {
      const { emailUser, emailPassword } = req.body;
      const userId = (req.user as any).id;
      
      if (!emailUser) {
        return res.status(400).json({ error: "Email username is required" });
      }
      
      // Update the email username
      await storage.updateSetting("EMAIL_USER", emailUser, "email", userId, "Email account username");
      
      // Only update password if provided
      if (emailPassword) {
        await storage.updateSetting("EMAIL_PASSWORD", emailPassword, "email", userId, "Email account password");
      }
      
      // Restart the email service
      await emailService.initialize();
      
      res.json({ success: true });
    } catch (error) {
      next(error);
    }
  });
  
  // API endpoint to receive forwarded emails (for real implementation)
  app.post("/api/admin/process-email", isManager, async (req, res, next) => {
    try {
      const emailData = req.body;
      
      // Process the email data
      const success = await emailService.processEmail(emailData);
      res.json({ success });
    } catch (error) {
      next(error);
    }
  });
  
  // API endpoint to process a simulated email for testing
  app.post("/api/admin/simulate-email", isManager, async (req, res, next) => {
    try {
      const { subject, text, from, html, source } = req.body;
      if (!subject || !text) {
        console.error('Simulate email error: Missing subject or text', { subject, text });
        return res.status(400).json({ error: "Subject and text are required" });
      }
      
      console.log('Processing simulated email:', {
        subject,
        from: from || "test@example.com",
        source: source || undefined,
        textLength: text?.length || 0,
        htmlLength: html?.length || 0
      });
      
      const success = await emailService.processSimulatedEmail({
        subject,
        text,
        html,
        from: from || "test@example.com",
        source: source // Pass the explicit source to the email processor
      });
      
      console.log('Simulated email process result:', success ? 'SUCCESS' : 'FAILED');
      res.json({ success });
    } catch (error) {
      console.error('Error in simulate-email endpoint:', error);
      next(error);
    }
  });
  
  // Public endpoint for testing email forwarding (TEMPORARY, FOR TESTING ONLY)
  app.post("/api/test/email-forward", async (req, res, next) => {
    try {
      const { subject, text, html, address, unitNumber } = req.body;
      if (!subject || !text) {
        return res.status(400).json({ error: "Subject and text are required" });
      }
      
      // Create an email with sample property data
      const emailContent = {
        subject: subject || "Interest in property at " + (address || "123 Main Street"),
        text: text || `Hi, I'm interested in renting at ${address || "123 Main Street"}${unitNumber ? `, Unit ${unitNumber}` : ""}. Please contact me at test@example.com or 555-123-4567.`,
        html: html || `<p>Hi, I'm interested in renting at <strong>${address || "123 Main Street"}${unitNumber ? `, Unit ${unitNumber}` : ""}</strong>. Please contact me at test@example.com or 555-123-4567.</p>`,
        from: "test@example.com"
      };
      
      console.log("Processing test email for forwarding:", emailContent);
      const success = await emailService.processSimulatedEmail(emailContent);
      
      res.json({ success, message: success ? "Email processed successfully" : "Failed to process email" });
    } catch (error) {
      console.error("Error in test email forwarding:", error);
      next(error);
    }
  });
  
  // Test endpoint for direct email sending (bypassing database)
  app.post("/api/test/direct-email", async (req, res, next) => {
    try {
      const { 
        subject = "Test Real Estate Inquiry",
        text,
        html,
        recipientEmail,
        senderEmail = "michael.chen@example.com",
        address = "1435 Franklin Street",
        unitNumber = "502",
      } = req.body;
      
      if (!recipientEmail) {
        return res.status(400).json({ success: false, message: "Recipient email is required" });
      }
      
      // Create a fake agent and lead for testing
      const testAgent = {
        id: 999,
        name: "Test Agent",
        email: recipientEmail
      };
      
      const testLead = {
        id: 999,
        name: subject,
        email: senderEmail,
        phone: "(510) 555-1234",
        address: address,
        unitNumber: unitNumber,
        originalEmail: html || `<p>Hello,</p><p>I noticed your listing for the loft at <strong>${address}${unitNumber ? `, Unit ${unitNumber}` : ""}</strong>. I am very interested in this property and would like to arrange a viewing.</p><p>I am looking for a place starting next month with a budget around $4000-4500 per month.</p><p>Best regards,<br>Michael Chen<br>Phone: (510) 555-1234<br>Email: <a href="mailto:${senderEmail}">${senderEmail}</a></p>`,
        notes: text || `Hello,\n\nI noticed your listing for the loft at ${address}${unitNumber ? `, Unit ${unitNumber}` : ""}. I am very interested in this property and would like to arrange a viewing.\n\nI am looking for a place starting next month with a budget around $4000-4500 per month.\n\nBest regards,\nMichael Chen\nPhone: (510) 555-1234\nEmail: ${senderEmail}`
      };
      
      console.log("Sending direct test email to:", recipientEmail);
      // Call the email sender directly
      const success = await emailService.sendLeadNotification(testLead as any, testAgent as any);
      
      res.json({ success, message: success ? "Email sent successfully" : "Failed to send email" });
    } catch (error) {
      console.error("Error in direct email test:", error);
      next(error);
    }
  });

  // API endpoint to check emails manually
  // Debug route to check permissions
  app.get("/api/debug/user-role", (req, res) => {
    console.log('Debug user route accessed:', { 
      isAuthenticated: req.isAuthenticated(),
      user: req.user
    });
    res.json({
      isAuthenticated: req.isAuthenticated(),
      user: req.user ? {
        id: (req.user as any).id,
        username: (req.user as any).username,
        role: (req.user as any).role,
        isManager: (req.user as any).role === 'manager'
      } : null
    });
  });

  // Alternative check emails endpoint (temporary for debugging - more permissive)
  app.post("/api/admin/check-emails-debug", async (req, res, next) => {
    console.log('Debug email check endpoint accessed - bypassing auth check');
    try {
      console.log('Debug email check endpoint accessed by:', { 
        user: req.user ? {
          id: (req.user as any).id,
          username: (req.user as any).username,
          role: (req.user as any).role,
        } : null
      });
      
      // Try to check emails
      const emailCheckResult = await emailService.checkEmails();
      
      return res.json({
        success: true,
        message: "Email check completed. Any new leads have been processed.",
        forwardingEmail: emailService.forwardingEmail,
        result: emailCheckResult
      });
    } catch (error) {
      console.error("Error in debug email check endpoint:", error);
      res.json({ 
        success: false,
        message: "Error checking emails, but service is ready to receive forwarded leads at: " + emailService.forwardingEmail,
        forwardingEmail: emailService.forwardingEmail,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  app.post("/api/admin/check-emails", isManager, async (req, res, next) => {
    try {
      console.log('Email service ready to receive forwarded emails. Agents should forward leads to:', emailService.forwardingEmail);
      
      // Try to check emails
      const emailCheckResult = await emailService.checkEmails();
      
      // If the check was successful, return success message with the result
      if (emailCheckResult) {
        return res.json({
          success: true,
          message: "Email check completed successfully. Any new leads have been processed.",
          forwardingEmail: emailService.forwardingEmail
        });
      } else {
        // Email check was not successful but we still return a message about forwarding
        return res.json({ 
          success: false,
          message: "Email service is ready to receive forwarded leads at: " + emailService.forwardingEmail,
          forwardingEmail: emailService.forwardingEmail
        });
      }
    } catch (error) {
      console.error("Error in email check endpoint:", error);
      // Even on error, we should return a usable message
      res.json({ 
        success: false,
        message: "Email service is ready to receive forwarded leads at: " + emailService.forwardingEmail,
        forwardingEmail: emailService.forwardingEmail
      });
    }
  });
  
  // Endpoint to get email settings status
  app.get("/api/admin/email-settings", isManager, async (req, res, next) => {
    try {
      const emailUserSetting = await storage.getSettingByKey("EMAIL_USER");
      const emailPasswordSetting = await storage.getSettingByKey("EMAIL_PASSWORD");
      
      res.json({
        hasCredentials: !!(emailUserSetting?.value || process.env.EMAIL_USER) && 
                     !!(emailPasswordSetting?.value || process.env.EMAIL_PASSWORD),
        email: emailUserSetting?.value || process.env.EMAIL_USER || ''
      });
    } catch (error) {
      next(error);
    }
  });
  
  // Update email settings
  app.post("/api/admin/email-settings", isManager, async (req, res, next) => {
    try {
      const { email, password } = req.body;
      const userId = (req.user as any).id;
      
      if (!email || !password) {
        return res.status(400).json({ error: "Both email and password are required" });
      }
      
      // Update the email settings
      await storage.updateSetting(
        "EMAIL_USER", 
        email, 
        "email", 
        userId, 
        "Email account for notifications"
      );
      
      await storage.updateSetting(
        "EMAIL_PASSWORD", 
        password, 
        "email", 
        userId, 
        "Email account password"
      );
      
      // Reinitialize the email service
      await emailService.initialize();
      
      res.json({ success: true });
    } catch (error) {
      next(error);
    }
  });

  // System Settings endpoints
  app.get("/api/settings", isManager, async (req, res, next) => {
    try {
      const { type } = req.query;
      const settings = await storage.getAllSettings(type as string);
      res.json(settings);
    } catch (error) {
      next(error);
    }
  });
  
  app.get("/api/settings/:key", isManager, async (req, res, next) => {
    try {
      const { key } = req.params;
      const setting = await storage.getSettingByKey(key);
      if (!setting) {
        return res.status(404).json({ error: "Setting not found" });
      }
      res.json(setting);
    } catch (error) {
      next(error);
    }
  });
  
  app.put("/api/settings/:key", isManager, async (req, res, next) => {
    try {
      const { key } = req.params;
      const { value, type, description } = req.body;
      
      if (!value) {
        return res.status(400).json({ error: "Value is required" });
      }
      
      const userId = (req.user as any).id;
      const setting = await storage.updateSetting(key, value, type, userId, description);
      res.json(setting);
    } catch (error) {
      next(error);
    }
  });

  // Lead Groups API (new unified model)
  app.get("/api/lead-groups", isAuthenticated, async (req, res, next) => {
    try {
      const groups = await storage.getAllLeadGroups();
      res.json(groups);
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/lead-groups/:id", isAuthenticated, async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid ID" });
      }
      
      const group = await storage.getLeadGroupById(id);
      if (!group) {
        return res.status(404).json({ message: "Lead group not found" });
      }
      
      res.json(group);
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/lead-groups", isManager, async (req, res, next) => {
    try {
      const groupData = leadGroupInsertSchema.parse(req.body);
      const group = await storage.createLeadGroup(groupData);
      res.status(201).json(group);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ errors: error.errors });
      }
      next(error);
    }
  });

  app.put("/api/lead-groups/:id", isManager, async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid ID" });
      }
      
      const groupData = leadGroupInsertSchema.parse(req.body);
      const updatedGroup = await storage.updateLeadGroup(id, groupData);
      
      if (!updatedGroup) {
        return res.status(404).json({ message: "Lead group not found" });
      }
      
      res.json(updatedGroup);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ errors: error.errors });
      }
      next(error);
    }
  });

  app.delete("/api/lead-groups/:id", isManager, async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid ID" });
      }
      
      const success = await storage.deleteLeadGroup(id);
      
      res.json({ success });
    } catch (error) {
      next(error);
    }
  });
  
  // Duplicate a lead group with all its settings
  app.post("/api/lead-groups/:id/duplicate", isManager, async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid ID" });
      }
      
      // Get the original group
      const originalGroup = await storage.getLeadGroupById(id);
      if (!originalGroup) {
        return res.status(404).json({ message: "Lead group not found" });
      }
      
      // Create a new group with similar properties
      const newGroupData = {
        name: `${originalGroup.name} (Copy)`,
        description: originalGroup.description,
        minPrice: originalGroup.minPrice,
        maxPrice: originalGroup.maxPrice,
        zipCodes: originalGroup.zipCodes,
        addressPattern: originalGroup.addressPattern,
        priority: originalGroup.priority,
        isActive: originalGroup.isActive
      };
      
      const newGroup = await storage.createLeadGroup(newGroupData);
      
      // Get the original group members
      const members = await db.query.leadGroupMembers.findMany({
        where: eq(leadGroupMembers.groupId, id)
      });
      
      // Add the same members to the new group
      for (const member of members) {
        await storage.addAgentToLeadGroup(member.agentId, newGroup.id);
      }
      
      res.status(201).json(newGroup);
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/lead-groups/:groupId/members/:agentId", isManager, async (req, res, next) => {
    try {
      const groupId = parseInt(req.params.groupId);
      const agentId = parseInt(req.params.agentId);
      
      if (isNaN(groupId) || isNaN(agentId)) {
        return res.status(400).json({ message: "Invalid IDs" });
      }
      
      const success = await storage.addAgentToLeadGroup(agentId, groupId);
      
      if (!success) {
        return res.status(400).json({ message: "Failed to add agent to lead group" });
      }
      
      res.status(201).json({ success: true });
    } catch (error) {
      next(error);
    }
  });

  app.delete("/api/lead-groups/:groupId/members/:agentId", isManager, async (req, res, next) => {
    try {
      const groupId = parseInt(req.params.groupId);
      const agentId = parseInt(req.params.agentId);
      
      if (isNaN(groupId) || isNaN(agentId)) {
        return res.status(400).json({ message: "Invalid IDs" });
      }
      
      const success = await storage.removeAgentFromLeadGroup(agentId, groupId);
      
      res.json({ success });
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/lead-groups/:id/members", isAuthenticated, async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid ID" });
      }
      
      // Only get agents already in this group
      const memberAgents = await db.query.leadGroupMembers.findMany({
        where: eq(leadGroupMembers.groupId, id),
        with: {
          agent: true
        }
      }).then(members => members.map(m => m.agent));
      
      res.json(memberAgents);
    } catch (error) {
      next(error);
    }
  });

  // Get detailed rotation information for a lead group
  app.get("/api/lead-groups/:id/rotation", isAuthenticated, async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid ID" });
      }
      
      // Get all agents in the group with their membership details
      const agents = await db.query.leadGroupMembers.findMany({
        where: eq(leadGroupMembers.groupId, id),
        with: {
          agent: true
        }
      }).then(memberships => 
        memberships.map(membership => ({
          id: membership.agent.id,
          name: membership.agent.name,
          email: membership.agent.email,
          avatarUrl: membership.agent.avatarUrl,
          lastAssignment: membership.lastAssignment || null
        }))
      );
      
      console.log(`Found ${agents.length} agents for lead group ${id}:`, agents);
      
      // Sort agents by lastAssignment (null values first, then oldest first)
      const sortedAgents = [...agents].sort((a, b) => {
        if (!a.lastAssignment && !b.lastAssignment) return 0;
        if (!a.lastAssignment) return -1;
        if (!b.lastAssignment) return 1;
        return new Date(a.lastAssignment).getTime() - new Date(b.lastAssignment).getTime();
      });
      
      // Determine who's next and who was last
      const nextAgent = sortedAgents.length > 0 ? sortedAgents[0] : null;
      const lastAgent = sortedAgents.length > 0 
        ? [...sortedAgents]
            .filter(a => a.lastAssignment)
            .sort((a, b) => new Date(b.lastAssignment!).getTime() - new Date(a.lastAssignment!).getTime())[0] || null
        : null;
      
      res.json({
        groupId: id,
        agents: sortedAgents,
        nextAgent,
        lastAgent
      });
    } catch (error) {
      next(error);
    }
  });

  // Clear all leads (manager only)
  app.delete("/api/admin/clear-leads", isManager, async (req, res, next) => {
    try {
      console.log('Admin requested to clear all leads');
      
      // Execute direct delete query (we don't have a storage method for this)
      await db.delete(leads).execute();
      
      // Also clear the status history
      await db.delete(leadStatusHistory).execute();
      
      console.log('All leads cleared by admin');
      return res.json({ success: true, message: 'All leads cleared successfully' });
    } catch (error) {
      console.error('Error clearing leads:', error);
      return res.status(500).json({ error: 'Failed to clear leads' });
    }
  });

  const httpServer = createServer(app);
  
  return httpServer;
}
