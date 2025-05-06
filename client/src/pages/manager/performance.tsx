import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  LineChart,
  Line,
  Legend,
  PieChart,
  Pie,
  Cell
} from "recharts";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

export default function Performance() {
  const { isAuthenticated, user } = useAuth();
  const [timeRange, setTimeRange] = useState("30days");

  // Fetch dashboard stats
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["/api/dashboard/stats"],
    enabled: isAuthenticated
  });

  // Fetch lead sources metrics
  const { data: leadSources, isLoading: sourcesLoading } = useQuery({
    queryKey: ["/api/dashboard/lead-sources"],
    enabled: isAuthenticated
  });

  // Fetch popular properties data
  const { data: popularProperties, isLoading: propertiesLoading } = useQuery({
    queryKey: ["/api/dashboard/popular-properties"],
    enabled: isAuthenticated
  });

  // Fetch top agents
  const { data: topAgents, isLoading: agentsLoading } = useQuery({
    queryKey: ["/api/dashboard/top-agents"],
    enabled: isAuthenticated
  });

  // Monthly leads data (would come from the API in a more complete implementation)
  const monthlyLeadsData = [
    { name: "Jan", leads: 15 },
    { name: "Feb", leads: 22 },
    { name: "Mar", leads: 28 },
    { name: "Apr", leads: 35 },
    { name: "May", leads: 42 },
    { name: "Jun", leads: 38 },
    { name: "Jul", leads: 47 },
    { name: "Aug", leads: 55 },
    { name: "Sep", leads: 60 },
    { name: "Oct", leads: 52 },
    { name: "Nov", leads: 48 },
    { name: "Dec", leads: 45 }
  ];

  // Colors for the pie chart
  const COLORS = ['#6A584C', '#C9AD6A', '#3A2F28', '#1E1E1E', '#EDE8DF'];

  if (!isAuthenticated || (user && user.role !== "manager")) {
    return null; // Will redirect via auth provider
  }

  // Calculate overall closing rate for display
  const calculateOverallClosingRate = () => {
    if (!leadSources || leadSources.length === 0) return 0;
    
    const totalLeads = leadSources.reduce((sum, source) => sum + source.total, 0);
    const closedLeads = leadSources.reduce((sum, source) => sum + source.closed, 0);
    
    return totalLeads > 0 ? Math.round((closedLeads / totalLeads) * 100) : 0;
  };

  // Get buildings with most leads
  const getPopularBuildings = () => {
    if (!popularProperties) return [];
    return popularProperties
      .filter(prop => prop.address)
      .map(building => ({
        address: building.address,
        leadsCount: building.count,
        unitRequests: 1 // Default to 1 for now, can be updated if we track this data
      }))
      .slice(0, 5);
  };

  // Get leads per agent data
  const getLeadsPerAgent = () => {
    if (!topAgents) return [];
    return topAgents.map(agent => ({
      agent: {
        id: agent.id,
        name: agent.name
      },
      totalLeads: agent.leadCount || 0,
      closedLeads: agent.closedLeadCount || 0
    }));
  };

  const popularBuildings = getPopularBuildings();
  const leadsPerAgent = getLeadsPerAgent();

  return (
    <div className="flex-1 relative overflow-y-auto focus:outline-none">
      <div className="py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
          {/* Page header */}
          <div className="md:flex md:items-center md:justify-between mb-6">
            <div className="flex-1 min-w-0">
              <h2 className="text-2xl font-semibold text-slate-800">Performance Metrics</h2>
            </div>
            <div className="mt-4 flex md:mt-0 md:ml-4">
              <Select value={timeRange} onValueChange={setTimeRange}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Select time range" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7days">Last 7 days</SelectItem>
                  <SelectItem value="30days">Last 30 days</SelectItem>
                  <SelectItem value="90days">Last 90 days</SelectItem>
                  <SelectItem value="year">Last year</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 mb-8">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total Leads</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{statsLoading ? '...' : stats?.totalLeads || 0}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  {!statsLoading && <span className="text-green-500">All incoming inquiries</span>}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Conversion Rate</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{sourcesLoading ? '...' : `${calculateOverallClosingRate()}%`}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  <span className="text-green-500">Leads marked as closed</span>
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Active Leads</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{statsLoading ? '...' : stats?.assignedLeads || 0}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  <span className="text-amber-500">Assigned to agents</span>
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Active Agents</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{statsLoading ? '...' : stats?.activeAgents || 0}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  <span className="text-primary">Available for leads</span>
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 mb-8">
            <Card>
              <CardHeader>
                <CardTitle>Lead Source Performance</CardTitle>
                <CardDescription>Closing rates by website source</CardDescription>
              </CardHeader>
              <CardContent>
                {sourcesLoading ? (
                  <div className="h-80 flex items-center justify-center">Loading source data...</div>
                ) : leadSources && leadSources.length > 0 ? (
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={leadSources}
                        margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="source" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Bar name="Total Leads" dataKey="total" fill="#6A584C" />
                        <Bar name="Closed Deals" dataKey="closed" fill="#C9AD6A" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="h-80 flex items-center justify-center">No source data available</div>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Monthly Lead Trend</CardTitle>
                <CardDescription>Lead volume over time</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={monthlyLeadsData}
                      margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Line 
                        type="monotone" 
                        dataKey="leads" 
                        name="Total Leads"
                        stroke="#6A584C" 
                        activeDot={{ r: 8 }} 
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Buildings with Most Leads */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 mb-8">
            <Card>
              <CardHeader>
                <CardTitle>Buildings with Most Leads</CardTitle>
                <CardDescription>Properties generating the most interest</CardDescription>
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
                      {propertiesLoading ? (
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
                <CardTitle>Leads per Agent</CardTitle>
                <CardDescription>Lead distribution among agents</CardDescription>
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
                      {propertiesLoading ? (
                        <tr>
                          <td colSpan={4} className="px-4 py-3 text-center">
                            <div className="text-sm text-slate-500">Loading agent data...</div>
                          </td>
                        </tr>
                      ) : leadsPerAgent && leadsPerAgent.length > 0 ? (
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

          <div className="grid grid-cols-1 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Top Performing Agents</CardTitle>
                <CardDescription>Agents with the highest closing rate</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Agent</TableHead>
                        <TableHead>Closed Deals</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {agentsLoading ? (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center">Loading agent data...</TableCell>
                        </TableRow>
                      ) : topAgents && topAgents.length > 0 ? (
                        topAgents.map((agent: any) => (
                          <TableRow key={agent.id}>
                            <TableCell>
                              <div className="flex items-center gap-3">
                                <Avatar className="h-8 w-8">
                                  <AvatarImage src={agent.avatarUrl} alt={agent.name} />
                                  <AvatarFallback>{agent.name.split(' ').map((n: string) => n[0]).join('')}</AvatarFallback>
                                </Avatar>
                                <div>
                                  <p className="font-medium">{agent.name}</p>
                                  <p className="text-xs text-muted-foreground">{agent.email}</p>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="font-medium">{agent.closedLeadCount}</div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                                Active
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center">No agent data available</TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
