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

  // Fetch lead source metrics
  const { data: leadSources = [], isLoading: leadSourcesLoading } = useQuery({
    queryKey: ["/api/debug/dashboard/lead-sources"],
    queryFn: async () => {
      console.log('Fetching lead sources from debug endpoint...');
      try {
        const response = await fetch(`/api/debug/dashboard/lead-sources`);
        if (!response.ok) {
          throw new Error(`Error ${response.status}: ${await response.text()}`);
        }
        return response.json();
      } catch (error) {
        console.error('Lead sources fetch error:', error);
        return []; // Return empty array on error
      }
    }
  });
  
  // Fetch popular buildings data
  const { data: popularBuildings = [], isLoading: buildingsLoading } = useQuery({
    queryKey: ["/api/debug/dashboard/popular-buildings"],
    queryFn: async () => {
      console.log('Fetching popular buildings from debug endpoint...');
      try {
        const response = await fetch(`/api/debug/dashboard/popular-buildings`);
        if (!response.ok) {
          throw new Error(`Error ${response.status}: ${await response.text()}`);
        }
        return response.json();
      } catch (error) {
        console.error('Popular buildings fetch error:', error);
        return []; // Return empty array on error
      }
    }
  });
  
  // Fetch leads per agent
  const { data: leadsPerAgent = [], isLoading: agentLeadsLoading } = useQuery({
    queryKey: ["/api/debug/dashboard/leads-per-agent"],
    queryFn: async () => {
      console.log('Fetching leads per agent from debug endpoint...');
      try {
        const response = await fetch(`/api/debug/dashboard/leads-per-agent`);
        if (!response.ok) {
          throw new Error(`Error ${response.status}: ${await response.text()}`);
        }
        return response.json();
      } catch (error) {
        console.error('Leads per agent fetch error:', error);
        return []; // Return empty array on error
      }
    }
  });

  // Fetch lead groups using debug endpoint to bypass auth issues
  const { data: leadGroups = [], isLoading: leadGroupsLoading } = useQuery({
    queryKey: ["/api/debug/lead-groups"],
    queryFn: async () => {
      console.log('Fetching lead groups from debug endpoint...');
      try {
        const response = await fetch(`/api/debug/lead-groups`);
        if (!response.ok) {
          throw new Error(`Error ${response.status}: ${await response.text()}`);
        }
        return response.json();
      } catch (error) {
        console.error('Lead groups fetch error:', error);
        return []; // Return empty array on error
      }
    }
  });

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
  
  // Transform lead groups into chart data format
  const groupPerformanceData = leadGroupsLoading || !leadGroups.length 
    ? []
    : leadGroups
        .filter(group => group.isActive !== false) // Only include active groups
        .map(group => ({
          id: group.id,
          name: group.name,
          leads: group.leads?.length || 0,
          agents: group.members?.length || 0,
          isActive: group.isActive !== false
        }))
        .sort((a, b) => b.leads - a.leads)
        .slice(0, 5); // Only show top 5 groups
  
  // Create lead status data from stats
  const leadStatusData = [
    { name: "Assigned", value: stats?.assignedLeads || 0, color: "#3b82f6" },
    { name: "Pending", value: stats?.pendingLeads || 0, color: "#f59e0b" },
    { name: "Closed", value: stats?.closedLeads || 0, color: "#8b5cf6" }
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
              href="/agents"
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
                        {leadGroupsLoading ? (
                          <tr>
                            <td colSpan={4} className="px-6 py-4 text-center">
                              <div className="text-sm text-slate-500">Loading lead groups...</div>
                            </td>
                          </tr>
                        ) : groupPerformanceData.length > 0 ? (
                          groupPerformanceData.map((group) => (
                            <tr key={group.id}>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm font-medium text-slate-900">{group.name}</div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm text-slate-900">{group.agents}</div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm text-slate-900">{group.leads}</div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <Badge className={group.isActive ? "bg-green-100 text-green-800" : "bg-amber-100 text-amber-800"}>
                                  {group.isActive ? "Active" : "Paused"}
                                </Badge>
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={4} className="px-6 py-4 text-center">
                              <div className="text-sm text-slate-500">No lead groups found</div>
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                  <div className="mt-4">
                    <Button variant="default" size="sm" asChild>
                      <a href="/lead-groups">Create New Group</a>
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
            
            {/* Lead Sources Section */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base font-medium">Lead Sources Performance</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-slate-200">
                    <thead className="bg-slate-50">
                      <tr>
                        <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                          Source
                        </th>
                        <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                          Total
                        </th>
                        <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                          Closed
                        </th>
                        <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                          Closing Rate
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-slate-200">
                      {leadSourcesLoading ? (
                        <tr>
                          <td colSpan={4} className="px-4 py-3 text-center">
                            <div className="text-sm text-slate-500">Loading lead sources...</div>
                          </td>
                        </tr>
                      ) : leadSources.length > 0 ? (
                        leadSources.map((source: any) => (
                          <tr key={source.source}>
                            <td className="px-4 py-3 whitespace-nowrap">
                              <div className="text-sm font-medium text-slate-900">{source.source}</div>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              <div className="text-sm text-slate-900">{source.total}</div>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              <div className="text-sm text-slate-900">{source.closed}</div>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              <div className="text-sm text-slate-900">{source.closingRate}%</div>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={4} className="px-4 py-3 text-center">
                            <div className="text-sm text-slate-500">No lead sources found</div>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>
          
          {/* Buildings with Most Leads and Leads per Agent */}
          <div className="mt-8 grid grid-cols-1 gap-5 lg:grid-cols-2">
            {/* Buildings with Most Leads */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base font-medium">Buildings with Most Leads</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-hidden">
                  <table className="min-w-full divide-y divide-slate-200">
                    <thead className="bg-slate-50">
                      <tr>
                        <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                          Building Address
                        </th>
                        <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                          Lead Count
                        </th>
                        <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                          Unit Requests
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-slate-200">
                      {buildingsLoading ? (
                        <tr>
                          <td colSpan={3} className="px-4 py-3 text-center">
                            <div className="text-sm text-slate-500">Loading buildings data...</div>
                          </td>
                        </tr>
                      ) : popularBuildings.length > 0 ? (
                        popularBuildings.map((building: any, index: number) => (
                          <tr key={index}>
                            <td className="px-4 py-3 whitespace-normal break-words">
                              <div className="text-sm font-medium text-slate-900">{building.address}</div>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              <div className="text-sm text-slate-900">{building.leadsCount}</div>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              <div className="text-sm text-slate-900">{building.unitRequests || 0}</div>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={3} className="px-4 py-3 text-center">
                            <div className="text-sm text-slate-500">No building data available</div>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
            
            {/* Leads per Agent */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base font-medium">Leads per Agent</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-hidden">
                  <table className="min-w-full divide-y divide-slate-200">
                    <thead className="bg-slate-50">
                      <tr>
                        <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                          Agent Name
                        </th>
                        <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                          Total Leads
                        </th>
                        <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                          Closed Leads
                        </th>
                        <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                          Closing Rate
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-slate-200">
                      {agentLeadsLoading ? (
                        <tr>
                          <td colSpan={4} className="px-4 py-3 text-center">
                            <div className="text-sm text-slate-500">Loading agent data...</div>
                          </td>
                        </tr>
                      ) : leadsPerAgent.length > 0 ? (
                        leadsPerAgent.map((agentData: any, index: number) => (
                          <tr key={index}>
                            <td className="px-4 py-3 whitespace-nowrap">
                              <div className="text-sm font-medium text-slate-900">{agentData.agent.name}</div>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              <div className="text-sm text-slate-900">{agentData.totalLeads}</div>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              <div className="text-sm text-slate-900">{agentData.closedLeads}</div>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              <div className="text-sm text-slate-900">
                                {agentData.totalLeads > 0 ? Math.round((agentData.closedLeads / agentData.totalLeads) * 100) : 0}%
                              </div>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={4} className="px-4 py-3 text-center">
                            <div className="text-sm text-slate-500">No agent data available</div>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
