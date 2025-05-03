import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { emailService } from "./services/email-service";
import { leadRouter } from "./services/lead-router";
import { 
  userLoginSchema, 
  agentGroupInsertSchema, 
  routingRuleInsertSchema, 
  leadStatusUpdateSchema 
} from "@shared/schema";
import { z } from "zod";
import session from "express-session";
import pgSession from "connect-pg-simple";
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import bcrypt from "bcryptjs";
import { pool } from "@db";

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
      secret: process.env.SESSION_SECRET || "leadrouter-session-secret",
      resave: false,
      saveUninitialized: false,
      cookie: { 
        secure: process.env.NODE_ENV === "production",
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
      },
    })
  );
  
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
      done(null, user);
    } catch (err) {
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
    if (req.isAuthenticated()) {
      return next();
    }
    res.status(401).json({ message: "Not authorized" });
  };
  
  const isManager = (req: Request, res: Response, next: Function) => {
    if (req.isAuthenticated() && req.user && (req.user as any).role === "manager") {
      return next();
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
          return res.json({
            id: user.id,
            username: user.username,
            name: user.name,
            email: user.email,
            role: user.role,
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
      
      res.json(updatedLead);
    } catch (error) {
      next(error);
    }
  });
  
  // Agent routes
  app.get("/api/agents", isAuthenticated, async (req, res, next) => {
    try {
      const agents = await storage.getAllAgents();
      res.json(agents.map(agent => ({
        id: agent.id,
        name: agent.name,
        email: agent.email,
        phone: agent.phone,
        avatarUrl: agent.avatarUrl,
      })));
    } catch (error) {
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
        leadCount: item.leadCount,
        avgResponseTimeMinutes: item.avgResponseTimeMinutes,
        avatarUrl: item.agent.avatarUrl,
      })));
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
      initialized: true,
      forwardingEmail: emailService.forwardingEmail
    });
  });
  
  // API endpoint to receive forwarded emails (for real implementation) or process simulated emails (for testing)
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
  
  // Simulate receiving an email for testing
  app.post("/api/admin/simulate-email", isManager, async (req, res, next) => {
    try {
      const simData = req.body;
      
      // Process the simulated email
      const success = await emailService.processSimulatedEmail(simData);
      res.json({ success });
    } catch (error) {
      next(error);
    }
  });
  
  // Original API endpoint to receive forwarded emails (keeping for backward compatibility)
  app.post("/api/admin/process-email", isManager, async (req, res, next) => {
    try {
      const emailData = req.body;
      const success = await emailService.processEmail(emailData);
      res.json({ success });
    } catch (error) {
      next(error);
    }
  });
  
  // API endpoint to process a simulated email for testing
  app.post("/api/admin/simulate-email", isManager, async (req, res, next) => {
    try {
      const { subject, text, from } = req.body;
      if (!subject || !text) {
        return res.status(400).json({ error: "Subject and text are required" });
      }
      
      const success = await emailService.processSimulatedEmail({
        subject,
        text,
        from: from || "test@example.com"
      });
      
      res.json({ success });
    } catch (error) {
      next(error);
    }
  });

  const httpServer = createServer(app);
  
  return httpServer;
}
