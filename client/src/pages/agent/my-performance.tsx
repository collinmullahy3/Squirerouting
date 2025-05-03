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
  Legend
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
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function MyPerformance() {
  const { isAuthenticated, user } = useAuth();
  const [timeRange, setTimeRange] = useState("30days");

  // Fetch agent's leads
  const { data: leads, isLoading } = useQuery({
    queryKey: ["/api/leads/agent", user?.id],
    enabled: isAuthenticated && !!user?.id
  });

  // Mock data for charts
  const monthlyLeadsData = [
    { name: "Jan", leads: 3 },
    { name: "Feb", leads: 5 },
    { name: "Mar", leads: 4 },
    { name: "Apr", leads: 6 },
    { name: "May", leads: 8 },
    { name: "Jun", leads: 9 },
    { name: "Jul", leads: 7 },
    { name: "Aug", leads: 10 },
    { name: "Sep", leads: 8 },
    { name: "Oct", leads: 11 },
    { name: "Nov", leads: 9 },
    { name: "Dec", leads: 7 }
  ];

  const statusDistributionData = [
    { name: "Assigned", value: 0 },
    { name: "Contacted", value: 0 },
    { name: "Not Interested", value: 0 },
    { name: "Closed", value: 0 }
  ];

  // Process leads data to get status distribution
  if (leads && leads.length > 0) {
    leads.forEach((lead: any) => {
      if (lead.status === "assigned") {
        statusDistributionData[0].value += 1;
      } else if (lead.status === "contacted") {
        statusDistributionData[1].value += 1;
      } else if (lead.status === "not_interested") {
        statusDistributionData[2].value += 1;
      } else if (lead.status === "closed") {
        statusDistributionData[3].value += 1;
      }
    });
  }

  // Calculate conversion rate
  const totalLeads = leads?.length || 0;
  const closedLeads = leads?.filter((lead: any) => lead.status === "closed")?.length || 0;
  const conversionRate = totalLeads > 0 ? Math.round((closedLeads / totalLeads) * 100) : 0;

  // Response time (mock data)
  const avgResponseTime = 7;

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
              <h2 className="text-2xl font-semibold text-slate-800">My Performance</h2>
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
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 mb-8">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total Leads</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalLeads}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  <span className="text-green-500">+3</span> from previous period
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Conversion Rate</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{conversionRate}%</div>
                <p className="text-xs text-muted-foreground mt-1">
                  <span className="text-green-500">+2.1%</span> from previous period
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Avg. Response Time</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{avgResponseTime} min</div>
                <p className="text-xs text-muted-foreground mt-1">
                  <span className="text-green-500">-1.5 min</span> from previous period
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 mb-8">
            <Card>
              <CardHeader>
                <CardTitle>Lead Activity</CardTitle>
                <CardDescription>Leads assigned to you over time</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-72">
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
                        stroke="hsl(var(--primary))" 
                        activeDot={{ r: 8 }} 
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Lead Status Distribution</CardTitle>
                <CardDescription>Breakdown of leads by current status</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={statusDistributionData}
                      margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="value" fill="hsl(var(--chart-2))" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Recent Activities */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Lead Activities</CardTitle>
              <CardDescription>Your recent interactions with leads</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="py-4 text-center">Loading lead activities...</div>
              ) : leads && leads.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Lead</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Last Updated</TableHead>
                      <TableHead>Price</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {leads.slice(0, 5).map((lead: any) => (
                      <TableRow key={lead.id}>
                        <TableCell className="font-medium">
                          <div>
                            <div>{lead.name}</div>
                            <div className="text-xs text-muted-foreground">{lead.email}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={`
                            ${lead.status === 'pending' ? 'status-badge-pending' : ''}
                            ${lead.status === 'assigned' ? 'status-badge-assigned' : ''}
                            ${lead.status === 'contacted' ? 'status-badge-contacted' : ''}
                            ${lead.status === 'not_interested' ? 'status-badge-not-interested' : ''}
                            ${lead.status === 'closed' ? 'status-badge-closed' : ''}
                          `}>
                            {lead.status === 'pending' ? 'Pending' : ''}
                            {lead.status === 'assigned' ? 'Assigned' : ''}
                            {lead.status === 'contacted' ? 'Contacted' : ''}
                            {lead.status === 'not_interested' ? 'Not Interested' : ''}
                            {lead.status === 'closed' ? 'Closed' : ''}
                          </Badge>
                        </TableCell>
                        <TableCell>{new Date(lead.updatedAt).toLocaleDateString()}</TableCell>
                        <TableCell>{lead.price ? `$${Number(lead.price).toLocaleString()}` : "N/A"}</TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="sm" asChild>
                            <a href={`/my-leads?lead=${lead.id}`}>View</a>
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="py-4 text-center">No recent lead activities found</div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
