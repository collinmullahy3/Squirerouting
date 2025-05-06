import { Switch, Route, useLocation } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider, useAuth } from "@/lib/auth";

// Components
import Sidebar from "@/components/sidebar";

// Pages
import NotFound from "@/pages/not-found";
import Login from "@/pages/login";
import Profile from "@/pages/profile";

// Manager Pages
import ManagerDashboard from "@/pages/manager/dashboard";
import Agents from "@/pages/manager/agents";
import AgentDetails from "@/pages/manager/agent-details";
import Performance from "@/pages/manager/performance";
import LeadGroups from "@/pages/manager/lead-groups";
import EmailSettings from "@/pages/manager/email-settings";
// Using EmailSettings instead of SendGridSettings
import Leads from "@/pages/manager/leads";

// Agent Pages
import MyLeads from "@/pages/agent/my-leads";
import MyPerformance from "@/pages/agent/my-performance";

// Protected Route component for authentication
const ProtectedRoute = ({ component: Component, ...rest }: { component: React.FC<any>, path?: string }) => {
  const { user, isLoading } = useAuth();
  const [, setLocation] = useLocation();
  
  // If loading, show a spinner
  if (isLoading) {
    return <div className="flex items-center justify-center h-screen">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
    </div>;
  }
  
  // If not authenticated, redirect to login
  if (!user) {
    setLocation('/login');
    return null;
  }
  
  // If authenticated, render the component
  return <Component {...rest} />;
};

const Router = () => {
  return (
    <AuthProvider>
      <div className="flex h-screen overflow-hidden">
        <Sidebar />
        <div className="flex flex-col md:ml-64 flex-1 overflow-hidden p-4">
          <Switch>
            {/* Auth Routes */}
            <Route path="/login" component={Login} />
            
            {/* Manager Routes - Protected */}
            <Route path="/" component={(props: any) => <ProtectedRoute component={ManagerDashboard} {...props} />} />
            <Route path="/leads" component={(props: any) => <ProtectedRoute component={Leads} {...props} />} />
            <Route path="/lead-groups" component={(props: any) => <ProtectedRoute component={LeadGroups} {...props} />} />
            <Route path="/agents" component={(props: any) => <ProtectedRoute component={Agents} {...props} />} />
            <Route path="/agents/:id" component={(props: any) => <ProtectedRoute component={AgentDetails} {...props} />} />
            <Route path="/performance" component={(props: any) => <ProtectedRoute component={Performance} {...props} />} />
            <Route path="/email-settings" component={(props: any) => <ProtectedRoute component={EmailSettings} {...props} />} />
            <Route path="/sendgrid-settings" component={(props: any) => <ProtectedRoute component={EmailSettings} {...props} />} />
            
            {/* Agent Routes - Protected */}
            <Route path="/my-leads" component={(props: any) => <ProtectedRoute component={MyLeads} {...props} />} />
            <Route path="/my-performance" component={(props: any) => <ProtectedRoute component={MyPerformance} {...props} />} />
            
            {/* Common Routes - Protected */}
            <Route path="/profile" component={(props: any) => <ProtectedRoute component={Profile} {...props} />} />
            
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
