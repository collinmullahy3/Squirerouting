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
import DebugDashboard from "@/pages/debug-dashboard";
import LandingPage from "@/pages/landing-page";

// Apartment Pages
import ApartmentsIndex from "@/pages/apartments/index";
import ApartmentDetails from "@/pages/apartments/[id]";
import CreateApartment from "@/pages/apartments/create";
import EditApartment from "@/pages/apartments/[id]/edit";

// Manager Pages
import ManagerDashboard from "@/pages/manager/dashboard";
import Agents from "@/pages/manager/agents";
import AgentDetails from "@/pages/manager/agent-details";
import Performance from "@/pages/manager/performance";
import LeadGroups from "@/pages/manager/lead-groups";
import EmailSettings from "@/pages/manager/email-settings";
import ParsingPatterns from "@/pages/manager/parsing-patterns";
import CRMIntegration from "@/pages/manager/crm-integration";
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
    console.log('Protected route - redirecting to login');
    setLocation('/login');
    return null;
  }
  
  // If authenticated, render the component
  return <Component {...rest} />;
};

const Router = () => {
  const [location] = useLocation();
  const isLandingPage = location === "/";

  return (
    <AuthProvider>
      {isLandingPage ? (
        // Landing page layout - no sidebar, full width
        <div className="min-h-screen">
          <LandingPage />
        </div>
      ) : (
        // App layout with sidebar for all other routes
        <div className="flex h-screen overflow-hidden">
          <Sidebar />
          <div className="flex flex-col md:ml-64 flex-1 overflow-hidden p-4">
            <Switch>
              {/* Landing page route (for deep links) */}
              <Route path="/" component={LandingPage} />
              
              {/* Auth Routes */}
              <Route path="/login" component={Login} />
              
              {/* Debug Dashboard - Direct Access (No Auth Check) */}
              <Route path="/debug-dashboard" component={DebugDashboard} />
              
              {/* Manager Routes - Protected */}
              <Route path="/dashboard" component={(props: any) => <ProtectedRoute component={ManagerDashboard} {...props} />} />
              <Route path="/leads" component={(props: any) => <ProtectedRoute component={Leads} {...props} />} />
              <Route path="/lead-groups" component={(props: any) => <ProtectedRoute component={LeadGroups} {...props} />} />
              <Route path="/agents" component={(props: any) => <ProtectedRoute component={Agents} {...props} />} />
              <Route path="/agents/:id" component={(props: any) => <ProtectedRoute component={AgentDetails} {...props} />} />
              <Route path="/performance" component={(props: any) => <ProtectedRoute component={Performance} {...props} />} />
              <Route path="/email-settings" component={(props: any) => <ProtectedRoute component={EmailSettings} {...props} />} />
              <Route path="/parsing-patterns" component={(props: any) => <ProtectedRoute component={ParsingPatterns} {...props} />} />
              <Route path="/crm-integration" component={(props: any) => <ProtectedRoute component={CRMIntegration} {...props} />} />
              <Route path="/sendgrid-settings" component={(props: any) => <ProtectedRoute component={EmailSettings} {...props} />} />
              
              {/* Agent Routes - Protected */}
              <Route path="/my-leads" component={(props: any) => <ProtectedRoute component={MyLeads} {...props} />} />
              <Route path="/my-performance" component={(props: any) => <ProtectedRoute component={MyPerformance} {...props} />} />
              
              {/* Apartment Routes */}
              <Route path="/apartments" component={ApartmentsIndex} />
              <Route path="/apartments/create" component={(props: any) => <ProtectedRoute component={CreateApartment} {...props} />} />
              <Route path="/apartments/:id/edit" component={(props: any) => <ProtectedRoute component={EditApartment} {...props} />} />
              <Route path="/apartments/:id" component={ApartmentDetails} />
              
              {/* Common Routes - Protected */}
              <Route path="/profile" component={(props: any) => <ProtectedRoute component={Profile} {...props} />} />
              
              {/* Fallback to 404 */}
              <Route component={NotFound} />
            </Switch>
          </div>
        </div>
      )}
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
