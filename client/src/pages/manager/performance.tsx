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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export default function Performance() {
  const { isAuthenticated, user } = useAuth();
  const [timeRange, setTimeRange] = useState("30days");

  // Fetch top agents
  const { data: topAgents, isLoading: agentsLoading } = useQuery({
    queryKey: ["/api/dashboard/top-agents"],
    enabled: isAuthenticated
  });

  // Mock data for charts
  const leadsByGroupData = [
    { name: "Luxury Homes", leads: 86 },
    { name: "Downtown Condos", leads: 72 },
    { name: "Suburban Homes", leads: 65 },
    { name: "New Construction", leads: 24 }
  ];

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

  const responseTimeData = [
    { name: "Luxury Homes", avgTime: 5 },
    { name: "Downtown Condos", avgTime: 7 },
    { name: "Suburban Homes", avgTime: 10 },
    { name: "New Construction", avgTime: 15 }
  ];

  if (!isAuthenticated || (user && user.role !== "manager")) {
    return null; // Will redirect via auth provider
  }

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
                <div className="text-2xl font-bold">247</div>
                <p className="text-xs text-muted-foreground mt-1">
                  <span className="text-green-500">+12%</span> from previous period
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Conversion Rate</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">24.3%</div>
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
                <div className="text-2xl font-bold">8.4 min</div>
                <p className="text-xs text-muted-foreground mt-1">
                  <span className="text-green-500">-1.2 min</span> from previous period
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Active Agents</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">28</div>
                <p className="text-xs text-muted-foreground mt-1">
                  <span className="text-amber-500">+0</span> from previous period
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 mb-8">
            <Card>
              <CardHeader>
                <CardTitle>Leads by Group</CardTitle>
                <CardDescription>Distribution of leads across agent groups</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={leadsByGroupData}
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
                        stroke="hsl(var(--primary))" 
                        activeDot={{ r: 8 }} 
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Response Time by Group</CardTitle>
                <CardDescription>Average lead response time in minutes</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={responseTimeData}
                      margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="avgTime" fill="hsl(var(--chart-2))" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Top Performing Agents</CardTitle>
                <CardDescription>Agents with the highest lead volume</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Agent</TableHead>
                        <TableHead>Leads</TableHead>
                        <TableHead>Response Time</TableHead>
                        <TableHead>Conversion Rate</TableHead>
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
                            <TableCell>{agent.leadCount}</TableCell>
                            <TableCell>
                              <div className="flex items-center">
                                <svg className="w-4 h-4 text-green-500 mr-1.5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                {agent.avgResponseTimeMinutes} min
                              </div>
                            </TableCell>
                            <TableCell>{Math.round(Math.random() * 40 + 20)}%</TableCell>
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
