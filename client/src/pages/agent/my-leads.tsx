import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import LeadCard from "@/components/lead-card";
import { Badge } from "@/components/ui/badge";

export default function MyLeads() {
  const { isAuthenticated, user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedLead, setSelectedLead] = useState<any>(null);
  const [statusDialog, setStatusDialog] = useState(false);
  const [newStatus, setNewStatus] = useState("");
  const [statusNote, setStatusNote] = useState("");

  // Fetch agent's leads
  const { data: leads, isLoading } = useQuery({
    queryKey: ["/api/leads/agent", user?.id],
    enabled: isAuthenticated && !!user?.id
  });

  // Update lead status mutation
  const updateLeadStatusMutation = useMutation({
    mutationFn: async ({ leadId, status, notes }: { leadId: number; status: string; notes: string }) => {
      const response = await apiRequest(
        "POST", 
        `/api/leads/${leadId}/status`,
        { status, notes }
      );
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/leads/agent", user?.id] });
      toast({
        title: "Status updated",
        description: "Lead status has been updated successfully.",
      });
      setStatusDialog(false);
      setSelectedLead(null);
      setNewStatus("");
      setStatusNote("");
    },
    onError: (error) => {
      toast({
        title: "Status update failed",
        description: error instanceof Error ? error.message : "An error occurred",
        variant: "destructive",
      });
    },
  });

  const handleStatusUpdate = () => {
    if (!selectedLead || !newStatus) return;
    
    updateLeadStatusMutation.mutate({
      leadId: selectedLead.id,
      status: newStatus,
      notes: statusNote
    });
  };

  const handleUpdateClick = (lead: any) => {
    setSelectedLead(lead);
    setNewStatus(lead.status || "pending");
    setStatusNote("");
    setStatusDialog(true);
  };

  const filteredLeads = leads?.filter((lead: any) => {
    if (statusFilter === "all") return true;
    return lead.status === statusFilter;
  });

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
              <h2 className="text-2xl font-semibold text-slate-800">My Leads</h2>
            </div>
            <div className="mt-4 flex md:mt-0 md:ml-4">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="assigned">Assigned</SelectItem>
                  <SelectItem value="contacted">Contacted</SelectItem>
                  <SelectItem value="not_interested">Not Interested</SelectItem>
                  <SelectItem value="closed">Closed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Leads List */}
          <Card>
            <CardHeader>
              <CardTitle>Your Assigned Leads</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-center py-8">Loading your leads...</div>
              ) : filteredLeads && filteredLeads.length > 0 ? (
                <div className="space-y-4">
                  {filteredLeads.map((lead: any) => (
                    <div key={lead.id} className="bg-white overflow-hidden shadow-sm rounded-lg">
                      <div className="px-4 py-5 sm:p-6">
                        <div className="flex items-center justify-between">
                          <h3 className="text-lg font-medium text-primary-600 truncate">
                            {lead.name}
                          </h3>
                          <div className="flex items-center space-x-2">
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
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => handleUpdateClick(lead)}
                            >
                              Update Status
                            </Button>
                          </div>
                        </div>
                        <div className="mt-2 sm:flex sm:justify-between">
                          <div className="sm:flex">
                            <p className="flex items-center text-sm text-slate-500">
                              <svg className="flex-shrink-0 mr-1.5 h-5 w-5 text-slate-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                              </svg>
                              {lead.email}
                            </p>
                            <p className="mt-2 flex items-center text-sm text-slate-500 sm:mt-0 sm:ml-6">
                              <svg className="flex-shrink-0 mr-1.5 h-5 w-5 text-slate-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                              </svg>
                              {lead.phone || "No phone provided"}
                            </p>
                          </div>
                          <div className="mt-2 flex items-center text-sm text-slate-500 sm:mt-0">
                            <svg className="flex-shrink-0 mr-1.5 h-5 w-5 text-slate-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            <p>
                              Received <time dateTime={lead.receivedAt}>{new Date(lead.receivedAt).toLocaleDateString()}</time>
                            </p>
                          </div>
                        </div>
                        <div className="mt-2 sm:flex sm:justify-between">
                          <div className="sm:flex">
                            <p className="flex items-center text-sm text-slate-500">
                              <svg className="flex-shrink-0 mr-1.5 h-5 w-5 text-slate-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                              </svg>
                              {lead.address || (lead.zipCode ? `ZIP: ${lead.zipCode}` : "No address provided")}
                            </p>
                          </div>
                          <div className="mt-2 flex items-center text-sm text-slate-500 sm:mt-0">
                            <svg className="flex-shrink-0 mr-1.5 h-5 w-5 text-slate-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <p>
                              {lead.price ? `$${Number(lead.price).toLocaleString()}` : "No price specified"}
                            </p>
                          </div>
                        </div>
                        {lead.notes && (
                          <div className="mt-2 p-2 bg-slate-50 rounded-md">
                            <p className="text-sm text-slate-700">
                              <span className="font-medium">Notes:</span> {lead.notes}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-muted-foreground mb-2">No leads found</p>
                  <p className="text-sm text-muted-foreground">
                    You don't have any leads assigned to you yet.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Update Status Dialog */}
      <Dialog open={statusDialog} onOpenChange={setStatusDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Update Lead Status</DialogTitle>
            <DialogDescription>
              Update the status for {selectedLead?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Status</label>
              <Select value={newStatus} onValueChange={setNewStatus}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select new status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="assigned">Assigned</SelectItem>
                  <SelectItem value="contacted">Contacted</SelectItem>
                  <SelectItem value="not_interested">Not Interested</SelectItem>
                  <SelectItem value="closed">Closed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Notes</label>
              <Textarea
                placeholder="Add any relevant notes about this status change"
                value={statusNote}
                onChange={(e) => setStatusNote(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button 
              onClick={handleStatusUpdate} 
              disabled={updateLeadStatusMutation.isPending}
            >
              {updateLeadStatusMutation.isPending ? "Updating..." : "Update Status"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
