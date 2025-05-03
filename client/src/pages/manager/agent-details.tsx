import { useParams } from "wouter";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeftIcon, InboxIcon, MailIcon, PhoneIcon } from "lucide-react";
import { Link } from "wouter";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function AgentDetails() {
  const { id } = useParams<{ id: string }>();
  const agentId = parseInt(id || "0", 10);
  const [statusFilter, setStatusFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  // Fetch agent details
  const { data: agent, isLoading: isLoadingAgent } = useQuery({
    queryKey: ["/api/agents", agentId],
    queryFn: async () => {
      // First get all agents (we don't have a get-by-id endpoint yet)
      const agents = await apiRequest("GET", "/api/agents");
      return agents.find((a: any) => a.id === agentId) || null;
    },
    enabled: !!agentId
  });

  // Fetch agent's leads
  const { data: leads, isLoading: isLoadingLeads } = useQuery({
    queryKey: ["/api/leads/agent", agentId, currentPage, pageSize, statusFilter],
    queryFn: async () => {
      let url = `/api/leads/agent/${agentId}?page=${currentPage}&limit=${pageSize}`;
      
      const response = await apiRequest("GET", url);
      return response;
    },
    enabled: !!agentId
  });

  // Filter leads by status
  const filteredLeads = leads && statusFilter !== "all" 
    ? leads.filter((lead: any) => lead.status === statusFilter)
    : leads;

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'pending':
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case 'assigned':
        return "bg-blue-100 text-blue-800 border-blue-200";
      case 'contacted':
        return "bg-purple-100 text-purple-800 border-purple-200";
      case 'closed':
        return "bg-green-100 text-green-800 border-green-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  if (!agentId) {
    return (
      <div className="p-8">
        <div className="text-center py-10">
          <h2 className="text-2xl font-bold">Invalid Agent ID</h2>
          <p className="mt-2 text-gray-600">Please select a valid agent.</p>
          <Button asChild className="mt-4">
            <Link href="/manager/agents">Back to Agents</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center gap-4">
        <Button asChild variant="outline" size="sm">
          <Link href="/manager/agents" className="flex items-center gap-1">
            <ArrowLeftIcon className="h-4 w-4" /> Back to Agents
          </Link>
        </Button>
        <h1 className="text-2xl font-bold">Agent Details</h1>
      </div>

      {isLoadingAgent ? (
        <div className="py-12 text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]"></div>
          <p className="mt-2">Loading agent details...</p>
        </div>
      ) : agent ? (
        <>
          <Card>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-xl">{agent.name}</CardTitle>
                  <CardDescription className="mt-2">
                    Role: <Badge>Agent</Badge>
                  </CardDescription>
                </div>
                {agent.avatarUrl && (
                  <img 
                    src={agent.avatarUrl} 
                    alt={agent.name} 
                    className="h-16 w-16 rounded-full object-cover" 
                  />
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Contact Information</h3>
                  <div className="mt-3 space-y-2">
                    <div className="flex items-center gap-2">
                      <MailIcon className="h-4 w-4 text-gray-400" />
                      <span>{agent.email}</span>
                    </div>
                    {agent.phone && (
                      <div className="flex items-center gap-2">
                        <PhoneIcon className="h-4 w-4 text-gray-400" />
                        <span>{agent.phone}</span>
                      </div>
                    )}
                  </div>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Groups</h3>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {agent.groups && agent.groups.length > 0 ? (
                      agent.groups.map((group: any) => (
                        <Badge key={group.id} variant="outline">
                          {group.name}
                        </Badge>
                      ))
                    ) : (
                      <span className="text-sm text-gray-500">Not assigned to any groups</span>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold">Assigned Leads</h2>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500">Filter by status:</span>
              <Select
                value={statusFilter}
                onValueChange={setStatusFilter}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="assigned">Assigned</SelectItem>
                  <SelectItem value="contacted">Contacted</SelectItem>
                  <SelectItem value="closed">Closed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Card>
            <CardContent className="p-0">
              {isLoadingLeads ? (
                <div className="py-12 text-center">
                  <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]"></div>
                  <p className="mt-2">Loading leads...</p>
                </div>
              ) : filteredLeads && filteredLeads.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Price</TableHead>
                      <TableHead>Zip Code</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Received</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredLeads.map((lead: any) => (
                      <TableRow key={lead.id}>
                        <TableCell className="font-medium">{lead.name}</TableCell>
                        <TableCell>{lead.email}</TableCell>
                        <TableCell>
                          {lead.price ? `$${Number(lead.price).toLocaleString()}` : "—"}
                        </TableCell>
                        <TableCell>{lead.zipCode || "—"}</TableCell>
                        <TableCell>
                          <Badge className={getStatusBadgeClass(lead.status)}>
                            {lead.status.charAt(0).toUpperCase() + lead.status.slice(1)}
                          </Badge>
                        </TableCell>
                        <TableCell>{formatDate(lead.receivedAt)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="py-8 text-center text-gray-500">
                  <ArrowDownTrayIcon className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                  <p>No leads assigned to this agent yet.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      ) : (
        <div className="py-12 text-center">
          <h2 className="text-xl font-bold">Agent Not Found</h2>
          <p className="mt-2 text-gray-600">The agent you're looking for doesn't exist.</p>
          <Button asChild className="mt-4">
            <Link href="/manager/agents">Back to Agents</Link>
          </Button>
        </div>
      )}
    </div>
  );
}
