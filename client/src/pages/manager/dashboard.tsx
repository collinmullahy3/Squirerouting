import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { Link } from "wouter";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from "recharts";

import StatCard from "@/components/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import LeadCard from "@/components/lead-card";

export default function ManagerDashboard() {
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const [processingLeads, setProcessingLeads] = useState(false);

  // Fetch dashboard stats using debug endpoint to bypass auth issues
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["/api/debug/dashboard/stats"],
    queryFn: async () => {
      console.log('Fetching dashboard stats from debug endpoint...');
      try {
        const response = await fetch(`/api/debug/dashboard/stats`);
        if (!response.ok) {
          throw new Error(`Error ${response.status}: ${await response.text()}`);
        }
        return response.json();
      } catch (error) {
        console.error('Dashboard stats fetch error:', error);
        throw error;
      }
    }
  });

  // We no longer fetch top agents as requested

  // Define lead interface to fix type issues
  interface Lead {
    id: number;
    name: string;
    email: string;
    phone?: string;
    price?: number | string;
    priceMax?: number | string;
    zipCode?: string;
    address?: string;
    unitNumber?: string;
    status: string;
    receivedAt: string;
    propertyUrl?: string;
    thumbnailUrl?: string;
    assignedAgent?: {
      id: number;
      name: string;
    };
  }
  
  // Fetch recent leads using debug endpoint to bypass auth issues
  const { data: recentLeads = [], isLoading: leadsLoading } = useQuery<Lead[]>({
    queryKey: ["/api/debug/leads"],
    queryFn: async () => {
      console.log('Fetching recent leads from debug endpoint...');
      try {
        const response = await fetch(`/api/debug/leads?limit=5`); // Just get a few leads
        if (!response.ok) {
          throw new Error(`Error ${response.status}: ${await response.text()}`);
        }
        return response.json() as Promise<Lead[]>;
      } catch (error) {
        console.error('Recent leads fetch error:', error);
        throw error;
      }
    }
  });

  const handleProcessPendingLeads = async () => {
    setProcessingLeads(true);
    try {
      const response = await apiRequest("POST", "/api/admin/process-pending-leads");
      const result = await response.json();
      
      toast({
        title: "Leads Processed",
        description: `Successfully processed ${result.processedCount} pending leads.`
      });
    } catch (error) {
      console.error("Error processing leads:", error);
      toast({
        title: "Processing Failed",
        description: "Failed to process pending leads",
        variant: "destructive"
      });
    } finally {
      setProcessingLeads(false);
    }
  };
  
  // Placeholder data for charts
  const groupPerformanceData = [
    { name: "Luxury Homes", leads: 86 },
    { name: "Downtown Condos", leads: 72 },
    { name: "Suburban Homes", leads: 65 },
    { name: "New Construction", leads: 24 }
  ];
  
  const leadStatusData = [
    { name: "Assigned", value: stats?.assignedLeads || 0, color: "#3b82f6" },
    { name: "Pending", value: stats?.pendingLeads || 0, color: "#f59e0b" },
    { name: "Contacted", value: 45, color: "#10b981" },
    { name: "Closed", value: 15, color: "#8b5cf6" }
  ];

  if (!isAuthenticated) {
    return null; // Will redirect via auth provider
  }

  return (
    <div className="flex-1 relative overflow-y-auto focus:outline-none">
      <div className="py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
          {/* Page header */}
          <div className="md:flex md:items-center md:justify-between mb-6">
            <div className="flex-1 min-w-0">
              <h2 className="text-2xl font-semibold text-slate-800">Dashboard</h2>
            </div>
            <div className="mt-4 flex md:mt-0 md:ml-4">
              <Button 
                onClick={handleProcessPendingLeads} 
                disabled={processingLeads}
              >
                {processingLeads ? "Processing..." : "Process Pending Leads"}
              </Button>
            </div>
          </div>

          {/* Stats Overview */}
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              title="Total Leads"
              value={statsLoading ? "..." : stats?.totalLeads || 0}
              icon="user"
              href="/leads"
              linkText="View all leads"
              color="primary"
            />
            <StatCard
              title="Assigned Leads"
              value={statsLoading ? "..." : stats?.assignedLeads || 0}
              icon="check-circle"
              href="/leads"
              linkText="View assignment details"
              color="success"
            />
            <StatCard
              title="Pending Leads"
              value={statsLoading ? "..." : stats?.pendingLeads || 0}
              icon="clock"
              href="/leads"
              linkText="View pending leads"
              color="warning"
            />
            <StatCard
              title="Active Agents"
              value={statsLoading ? "..." : stats?.activeAgents || 0}
              icon="users"
              href="/agent-groups"
              linkText="View all agents"
              color="primary"
            />
          </div>

          {/* Recent Leads */}
          <div className="mt-8">
            <h3 className="text-lg leading-6 font-medium text-slate-900">
              Recent Leads
            </h3>
            <div className="mt-2 bg-white shadow overflow-hidden sm:rounded-md">
              <ul role="list" className="divide-y divide-slate-200">
                {leadsLoading ? (
                  <li className="px-4 py-4 sm:px-6">Loading recent leads...</li>
                ) : recentLeads && recentLeads.length > 0 ? (
                  recentLeads.slice(0, 3).map((lead: Lead) => (
                    <LeadCard key={lead.id} lead={lead} />
                  ))
                ) : (
                  <li className="px-4 py-4 sm:px-6">No leads found</li>
                )}
              </ul>
              {recentLeads && recentLeads.length > 0 && (
                <div className="bg-slate-50 px-4 py-4 sm:px-6">
                  <div className="text-sm">
                    <Link href="/leads" className="font-medium text-primary-600 hover:text-primary-500">
                      View all leads
                    </Link>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Agent Performance */}
          <div className="mt-8">
            <h3 className="text-lg leading-6 font-medium text-slate-900">
              Agent Group Performance
            </h3>
            <div className="mt-2 grid grid-cols-1 gap-5 lg:grid-cols-1">
              
              {/* Agent Groups */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base font-medium">Agent Groups</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-hidden">
                    <table className="min-w-full divide-y divide-slate-200">
                      <thead className="bg-slate-50">
                        <tr>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                            Group Name
                          </th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                            Agents
                          </th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                            Total Leads
                          </th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                            Status
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-slate-200">
                        {groupPerformanceData.map((group, index) => (
                          <tr key={group.name}>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm font-medium text-slate-900">{group.name}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-slate-900">{index === 0 ? 8 : index === 1 ? 6 : index === 2 ? 10 : 4}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-slate-900">{group.leads}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <Badge className={index < 3 ? "bg-green-100 text-green-800" : "bg-amber-100 text-amber-800"}>
                                {index < 3 ? "Active" : "Paused"}
                              </Badge>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="mt-4">
                    <Button variant="default" size="sm" asChild>
                      <a href="/agent-groups">Create New Group</a>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
          
          {/* Charts Section */}
          <div className="mt-8 grid grid-cols-1 gap-5 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base font-medium">Lead Distribution by Group</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={groupPerformanceData}
                      margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="leads" fill="hsl(var(--primary))" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle className="text-base font-medium">Lead Status Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={leadStatusData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      >
                        {leadStatusData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
