import { useState } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

// UI Components
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormField, FormItem, FormLabel, FormControl, FormDescription, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";

// Define form schema
const leadGroupFormSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  description: z.string().optional(),
  minPrice: z.coerce.number().optional(),
  maxPrice: z.coerce.number().optional(),
  zipCodes: z.string().optional(),
  addressPattern: z.string().optional(),
  priority: z.coerce.number().min(1, "Priority must be at least 1").max(20, "Priority must be at most 20"),
  isActive: z.boolean().default(true),
});

type LeadGroupFormValues = z.infer<typeof leadGroupFormSchema>;

export default function LeadGroups() {
  const { isAuthenticated, user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<number | null>(null);
  const [membersDialog, setMembersDialog] = useState(false);
  const [selectedGroupForMembers, setSelectedGroupForMembers] = useState<number | null>(null);

  // Fetch groups
  const { data: groups, isLoading: groupsLoading } = useQuery({
    queryKey: ["/api/lead-groups"],
    enabled: isAuthenticated
  });

  // Fetch agents
  const { data: agents, isLoading: agentsLoading } = useQuery({
    queryKey: ["/api/agents"],
    enabled: isAuthenticated
  });

  // Fetch group members for the selected group
  const { data: groupMembers, isLoading: membersLoading } = useQuery({
    queryKey: ["/api/lead-groups", selectedGroupForMembers, "members"],
    enabled: isAuthenticated && selectedGroupForMembers !== null
  });

  // Form setup
  const form = useForm<LeadGroupFormValues>({
    resolver: zodResolver(leadGroupFormSchema),
    defaultValues: {
      name: "",
      description: "",
      minPrice: undefined,
      maxPrice: undefined,
      zipCodes: "",
      addressPattern: "",
      priority: 5,
      isActive: true,
    },
  });

  // Mutations
  const createGroupMutation = useMutation({
    mutationFn: async (data: LeadGroupFormValues) => {
      // Convert zipCodes from comma-separated string to array
      const formattedData = {
        ...data,
        zipCodes: data.zipCodes ? data.zipCodes.split(",").map(zip => zip.trim()).filter(Boolean) : undefined,
      };
      
      return await apiRequest<any>("/api/lead-groups", {
        method: "POST",
        body: JSON.stringify(formattedData),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/lead-groups"] });
      setOpenDialog(false);
      toast({
        title: "Success",
        description: "Lead group created successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to create lead group: ${error instanceof Error ? error.message : "Unknown error"}`,
        variant: "destructive",
      });
    },
  });

  const updateGroupMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: LeadGroupFormValues }) => {
      // Convert zipCodes from comma-separated string to array
      const formattedData = {
        ...data,
        zipCodes: data.zipCodes ? data.zipCodes.split(",").map(zip => zip.trim()).filter(Boolean) : undefined,
      };
      
      return await apiRequest<any>(`/api/lead-groups/${id}`, {
        method: "PUT",
        body: JSON.stringify(formattedData),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/lead-groups"] });
      setOpenDialog(false);
      toast({
        title: "Success",
        description: "Lead group updated successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to update lead group: ${error instanceof Error ? error.message : "Unknown error"}`,
        variant: "destructive",
      });
    },
  });

  const addAgentToGroupMutation = useMutation({
    mutationFn: async ({ groupId, agentId }: { groupId: number; agentId: number }) => {
      return await apiRequest<any>(`/api/lead-groups/${groupId}/members/${agentId}`, {
        method: "POST",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/lead-groups", selectedGroupForMembers, "members"] });
      toast({
        title: "Success",
        description: "Agent added to lead group",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to add agent to lead group: ${error instanceof Error ? error.message : "Unknown error"}`,
        variant: "destructive",
      });
    },
  });

  const removeAgentFromGroupMutation = useMutation({
    mutationFn: async ({ groupId, agentId }: { groupId: number; agentId: number }) => {
      return await apiRequest<any>(`/api/lead-groups/${groupId}/members/${agentId}`, {
        method: "DELETE",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/lead-groups", selectedGroupForMembers, "members"] });
      toast({
        title: "Success",
        description: "Agent removed from lead group",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to remove agent from lead group: ${error instanceof Error ? error.message : "Unknown error"}`,
        variant: "destructive",
      });
    },
  });

  // Form submission handlers
  const onSubmit = (values: LeadGroupFormValues) => {
    if (selectedGroup) {
      updateGroupMutation.mutate({ id: selectedGroup, data: values });
    } else {
      createGroupMutation.mutate(values);
    }
  };

  // UI interaction handlers
  const handleNewGroup = () => {
    setSelectedGroup(null);
    form.reset({
      name: "",
      description: "",
      minPrice: undefined,
      maxPrice: undefined,
      zipCodes: "",
      addressPattern: "",
      priority: 5,
      isActive: true,
    });
    setOpenDialog(true);
  };

  const handleEditGroup = (group: any) => {
    setSelectedGroup(group.id);
    form.reset({
      name: group.name,
      description: group.description || "",
      minPrice: group.minPrice,
      maxPrice: group.maxPrice,
      zipCodes: group.zipCodes ? group.zipCodes.join(", ") : "",
      addressPattern: group.addressPattern || "",
      priority: group.priority,
      isActive: group.isActive,
    });
    setOpenDialog(true);
  };

  const handleOpenMembers = (groupId: number) => {
    setSelectedGroupForMembers(groupId);
    setMembersDialog(true);
  };

  const handleAddAgent = (agentId: number) => {
    if (selectedGroupForMembers === null) return;
    
    addAgentToGroupMutation.mutate({
      groupId: selectedGroupForMembers,
      agentId
    });
  };

  const handleRemoveAgent = (agentId: number) => {
    if (selectedGroupForMembers === null) return;
    
    removeAgentFromGroupMutation.mutate({
      groupId: selectedGroupForMembers,
      agentId
    });
  };

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
              <h2 className="text-2xl font-semibold text-slate-800">Lead Groups</h2>
              <p className="mt-1 text-sm text-slate-500">
                Manage lead groups and define routing criteria for assigning leads to agents.
              </p>
            </div>
            <div className="mt-4 flex md:mt-0 md:ml-4">
              <Button onClick={handleNewGroup}>
                Create New Lead Group
              </Button>
            </div>
          </div>

          {/* Main content */}
          <Card>
            <CardHeader>
              <CardTitle>Lead Group Management</CardTitle>
              <CardDescription>
                Create and manage lead groups with specific routing criteria. Leads will be matched to these groups 
                based on price range, zip codes, address patterns, and other criteria.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {groupsLoading ? (
                <div className="py-4 text-center">Loading lead groups...</div>
              ) : groups && groups.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Priority</TableHead>
                      <TableHead>Group Name</TableHead>
                      <TableHead>Price Range</TableHead>
                      <TableHead>Zip Codes</TableHead>
                      <TableHead>Address Pattern</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Members</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {groups.map((group: any) => (
                      <TableRow key={group.id}>
                        <TableCell>{group.priority}</TableCell>
                        <TableCell className="font-medium">
                          {group.name}
                          {group.description && (
                            <div className="text-xs text-slate-500">{group.description}</div>
                          )}
                        </TableCell>
                        <TableCell>
                          {group.minPrice && group.maxPrice ? (
                            `$${group.minPrice.toLocaleString()} - $${group.maxPrice.toLocaleString()}`
                          ) : group.minPrice ? (
                            `$${group.minPrice.toLocaleString()}+`
                          ) : group.maxPrice ? (
                            `Up to $${group.maxPrice.toLocaleString()}`
                          ) : (
                            "Any"
                          )}
                        </TableCell>
                        <TableCell>
                          {group.zipCodes && group.zipCodes.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {group.zipCodes.map((zip: string, i: number) => (
                                <Badge key={i} variant="outline">{zip}</Badge>
                              ))}
                            </div>
                          ) : (
                            "Any"
                          )}
                        </TableCell>
                        <TableCell>{group.addressPattern || "Any"}</TableCell>
                        <TableCell>
                          <Badge variant={group.isActive ? "success" : "warning"}>
                            {group.isActive ? "Active" : "Inactive"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Button 
                            variant="outline"
                            size="sm" 
                            onClick={() => handleOpenMembers(group.id)}
                          >
                            Manage Members
                            {group.members && (
                              <span className="ml-1 text-xs">({group.members.length})</span>
                            )}
                          </Button>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => handleEditGroup(group)}
                          >
                            Edit
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="py-8 text-center">
                  <p className="text-muted-foreground mb-4">No lead groups found</p>
                  <Button onClick={handleNewGroup}>Create Your First Lead Group</Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* New/Edit Group Dialog */}
      <Dialog open={openDialog} onOpenChange={setOpenDialog}>
        <DialogContent className="sm:max-w-[625px]">
          <DialogHeader>
            <DialogTitle>{selectedGroup ? "Edit Lead Group" : "Create Lead Group"}</DialogTitle>
            <DialogDescription>
              {selectedGroup ? 
                "Update the lead group settings and routing criteria." : 
                "Create a new lead group with specific routing criteria."}
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-2">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem className="col-span-2">
                      <FormLabel>Group Name</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Enter group name" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem className="col-span-2">
                      <FormLabel>Description (Optional)</FormLabel>
                      <FormControl>
                        <Textarea {...field} placeholder="Description of this lead group" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <div className="pt-4">
                <h3 className="text-lg font-medium mb-2">Routing Criteria</h3>
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="minPrice"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Minimum Price</FormLabel>
                        <FormControl>
                          <Input 
                            {...field} 
                            type="number" 
                            placeholder="Min price" 
                            value={field.value === undefined ? '' : field.value}
                          />
                        </FormControl>
                        <FormDescription>Leave blank for no minimum</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="maxPrice"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Maximum Price</FormLabel>
                        <FormControl>
                          <Input 
                            {...field} 
                            type="number" 
                            placeholder="Max price" 
                            value={field.value === undefined ? '' : field.value}
                          />
                        </FormControl>
                        <FormDescription>Leave blank for no maximum</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="zipCodes"
                    render={({ field }) => (
                      <FormItem className="col-span-2">
                        <FormLabel>Zip Codes</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Comma-separated list of zip codes" />
                        </FormControl>
                        <FormDescription>Enter comma-separated zip codes (e.g., 94103, 94102)</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="addressPattern"
                    render={({ field }) => (
                      <FormItem className="col-span-2">
                        <FormLabel>Address Pattern</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Address pattern to match" />
                        </FormControl>
                        <FormDescription>Case-insensitive partial match, leave blank to match any address</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4 pt-4">
                <FormField
                  control={form.control}
                  name="priority"
                  render={({ field }) => (
                    <FormItem className="col-span-2">
                      <FormLabel>Priority (1-20)</FormLabel>
                      <FormControl>
                        <div className="flex items-center space-x-4">
                          <Slider
                            defaultValue={[field.value]}
                            max={20}
                            min={1}
                            step={1}
                            className="flex-1"
                            onValueChange={(value) => field.onChange(value[0])}
                          />
                          <span className="w-12 text-center font-medium">{field.value}</span>
                        </div>
                      </FormControl>
                      <FormDescription>Higher priority groups are matched first (20 is highest)</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="isActive"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Active Status</FormLabel>
                        <FormDescription>
                          Enable or disable this lead group
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>
              
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpenDialog(false)} type="button">Cancel</Button>
                <Button type="submit" disabled={createGroupMutation.isPending || updateGroupMutation.isPending}>
                  {createGroupMutation.isPending || updateGroupMutation.isPending ? "Saving..." : "Save"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Members Dialog */}
      <Dialog open={membersDialog} onOpenChange={setMembersDialog}>
        <DialogContent className="sm:max-w-[525px]">
          <DialogHeader>
            <DialogTitle>Manage Group Members</DialogTitle>
            <DialogDescription>
              Add or remove agents from this lead group.
            </DialogDescription>
          </DialogHeader>
          
          {membersLoading || agentsLoading ? (
            <div className="py-8 text-center">Loading agents...</div>
          ) : agents && agents.length > 0 ? (
            <div className="max-h-[400px] overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Agent</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Member</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {agents.map((agent: any) => {
                    const isMember = Array.isArray(groupMembers) && 
                      groupMembers.some((member: any) => member.id === agent.id);
                    return (
                      <TableRow key={agent.id}>
                        <TableCell className="font-medium">{agent.name}</TableCell>
                        <TableCell>{agent.email}</TableCell>
                        <TableCell>
                          <Checkbox
                            id={`agent-${agent.id}`}
                            checked={isMember}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                handleAddAgent(agent.id);
                              } else {
                                handleRemoveAgent(agent.id);
                              }
                            }}
                          />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="py-8 text-center text-muted-foreground">
              No agents found. Add agents first.
            </div>
          )}
          
          <DialogFooter>
            <Button onClick={() => setMembersDialog(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
