import { Switch, Route } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider } from "@/lib/auth";

// Components
import Sidebar from "@/components/sidebar";

// Pages
import NotFound from "@/pages/not-found";
import Login from "@/pages/login";
import Profile from "@/pages/profile";

// Manager Pages
import ManagerDashboard from "@/pages/manager/dashboard";
import AgentGroups from "@/pages/manager/agent-groups";
import Agents from "@/pages/manager/agents";
import AgentDetails from "@/pages/manager/agent-details";
import Performance from "@/pages/manager/performance";
import RoutingRules from "@/pages/manager/routing-rules";
import EmailSettings from "@/pages/manager/email-settings";
// Using EmailSettings instead of SendGridSettings
import Leads from "@/pages/manager/leads";

// Agent Pages
import MyLeads from "@/pages/agent/my-leads";
import MyPerformance from "@/pages/agent/my-performance";

const Router = () => {
  return (
    <AuthProvider>
      <div className="flex h-screen overflow-hidden">
        <Sidebar />
        <div className="flex flex-col md:ml-64 flex-1 overflow-hidden p-4">
          <Switch>
            {/* Auth Routes */}
            <Route path="/login" component={Login} />
            
            {/* Manager Routes */}
            <Route path="/" component={ManagerDashboard} />
            <Route path="/leads" component={Leads} />
            <Route path="/agent-groups" component={AgentGroups} />
            <Route path="/agents" component={Agents} />
            <Route path="/agents/:id" component={AgentDetails} />
            <Route path="/performance" component={Performance} />
            <Route path="/routing-rules" component={RoutingRules} />
            <Route path="/email-settings" component={EmailSettings} />
            <Route path="/sendgrid-settings" component={EmailSettings} />
            
            {/* Agent Routes */}
            <Route path="/my-leads" component={MyLeads} />
            <Route path="/my-performance" component={MyPerformance} />
            
            {/* Common Routes */}
            <Route path="/profile" component={Profile} />
            
            {/* Fallback to 404 */}
            <Route component={NotFound} />
          </Switch>
        </div>
      </div>
      <Toaster />
    </AuthProvider>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router />
    </QueryClientProvider>
  );
}

export default App;
