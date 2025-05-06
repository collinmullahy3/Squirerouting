import { useState } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { format } from "date-fns";
// Import RequestInit from the DOM lib

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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";

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
  const [rotationTab, setRotationTab] = useState<"members" | "rotation">("members");

  // Define lead group type
  type LeadGroupType = {
    id: number;
    name: string;
    description?: string;
    minPrice?: number;
    maxPrice?: number;
    zipCodes?: string[];
    addressPattern?: string;
    priority: number;
    isActive: boolean;
    members?: { id: number; name: string }[];
  };

  // Fetch groups
  const { data: groups, isLoading: groupsLoading } = useQuery<LeadGroupType[]>({
    queryKey: ["/api/lead-groups"],
    enabled: isAuthenticated
  });

  // Define agent type
  type AgentType = {
    id: number;
    name: string;
    email: string;
    role: string;
    phone?: string;
    avatarUrl?: string;
  };

  // Define group member type
  type GroupMemberType = {
    id: number;
    name: string;
    email: string;
    avatarUrl?: string;
    lastAssignment?: string;
  };

  // Fetch agents
  const { data: agents, isLoading: agentsLoading } = useQuery<AgentType[]>({
    queryKey: ["/api/agents"],
    enabled: isAuthenticated
  });

  // Fetch group members for the selected group
  const { data: groupMembers, isLoading: membersLoading } = useQuery<GroupMemberType[]>({
    queryKey: ["/api/lead-groups", selectedGroupForMembers, "members"],
    queryFn: async () => {
      if (!selectedGroupForMembers) return [];
      const response = await apiRequest("GET", `/api/lead-groups/${selectedGroupForMembers}/members`);
      console.log('Group members response:', response); // Debug log
      return response;
    },
    enabled: isAuthenticated && selectedGroupForMembers !== null
  });

  // Define rotation data type
  type RotationDataType = {
    groupId: number;
    agents: Array<{
      id: number;
      name: string;
      email: string;
      avatarUrl?: string;
      lastAssignment: string | null;
    }>;
    nextAgent: {
      id: number;
      name: string;
      email: string;
      avatarUrl?: string;
      lastAssignment: string | null;
    } | null;
    lastAgent: {
      id: number;
      name: string;
      email: string;
      avatarUrl?: string;
      lastAssignment: string | null;
    } | null;
  }

  // Fetch rotation data for the selected group
  const { data: rotationData, isLoading: rotationLoading } = useQuery<RotationDataType>({
    queryKey: ["/api/lead-groups", selectedGroupForMembers, "rotation"],
    queryFn: async () => {
      if (!selectedGroupForMembers) return null;
      try {
        const response = await apiRequest("GET", `/api/lead-groups/${selectedGroupForMembers}/rotation`);
        console.log('Rotation data response:', response);
        return response || { groupId: selectedGroupForMembers, agents: [], nextAgent: null, lastAgent: null };
      } catch (error) {
        console.error('Error fetching rotation data:', error);
        return { groupId: selectedGroupForMembers, agents: [], nextAgent: null, lastAgent: null };
      }
    },
    enabled: isAuthenticated && selectedGroupForMembers !== null && rotationTab === "rotation"
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
        // Convert numeric fields explicitly
        minPrice: data.minPrice !== undefined ? Number(data.minPrice) : undefined,
        maxPrice: data.maxPrice !== undefined ? Number(data.maxPrice) : undefined,
        priority: Number(data.priority)
      };
      
      console.log('Creating lead group with data:', formattedData);
      return await apiRequest<any>("POST", "/api/lead-groups", formattedData);
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
      console.error('Error creating lead group:', error);
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
        // Convert numeric fields explicitly
        minPrice: data.minPrice !== undefined ? Number(data.minPrice) : undefined,
        maxPrice: data.maxPrice !== undefined ? Number(data.maxPrice) : undefined,
        priority: Number(data.priority)
      };
      
      console.log('Updating lead group with data:', formattedData);
      return await apiRequest<any>("PUT", `/api/lead-groups/${id}`, formattedData);
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
      console.error('Error updating lead group:', error);
      toast({
        title: "Error",
        description: `Failed to update lead group: ${error instanceof Error ? error.message : "Unknown error"}`,
        variant: "destructive",
      });
    },
  });

  const addAgentToGroupMutation = useMutation({
    mutationFn: async ({ groupId, agentId }: { groupId: number; agentId: number }) => {
      return await apiRequest<any>("POST", `/api/lead-groups/${groupId}/members/${agentId}`);
    },
    onSuccess: (_, variables) => {
      // Invalidate the lead group members list
      queryClient.invalidateQueries({ queryKey: ["/api/lead-groups", selectedGroupForMembers, "members"] });
      
      // Also invalidate agents data to refresh the agent's lead groups list
      queryClient.invalidateQueries({ queryKey: ["/api/agents"] });
      
      // And invalidate the specific agent's lead groups
      queryClient.invalidateQueries({ queryKey: ["/api/agents", variables.agentId, "lead-groups"] });
      
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
      return await apiRequest<any>("DELETE", `/api/lead-groups/${groupId}/members/${agentId}`);
    },
    onSuccess: (_, variables) => {
      // Invalidate the lead group members list
      queryClient.invalidateQueries({ queryKey: ["/api/lead-groups", selectedGroupForMembers, "members"] });
      
      // Also invalidate agents data to refresh the agent's lead groups list
      queryClient.invalidateQueries({ queryKey: ["/api/agents"] });
      
      // And invalidate the specific agent's lead groups
      queryClient.invalidateQueries({ queryKey: ["/api/agents", variables.agentId, "lead-groups"] });
      
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
  
  const duplicateGroupMutation = useMutation({
    mutationFn: async (id: number) => {
      return await apiRequest<any>("POST", `/api/lead-groups/${id}/duplicate`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/lead-groups"] });
      toast({
        title: "Success",
        description: "Lead group duplicated successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to duplicate lead group: ${error instanceof Error ? error.message : "Unknown error"}`,
        variant: "destructive",
      });
    },
  });
  
  const deleteGroupMutation = useMutation({
    mutationFn: async (id: number) => {
      return await apiRequest<any>("DELETE", `/api/lead-groups/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/lead-groups"] });
      toast({
        title: "Success",
        description: "Lead group deleted successfully",
      });
    },
    onError: (error: any) => {
      // Check if the error has a response with a message
      const errorMessage = error.response?.data?.message || 
                          (error instanceof Error ? error.message : "Unknown error");
      
      toast({
        title: "Error",
        description: `Failed to delete lead group: ${errorMessage}`,
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

  const handleEditGroup = (group: LeadGroupType) => {
    console.log('Editing group:', group);
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
    setRotationTab("members"); // Reset to members tab when opening
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
  
  const handleDuplicateGroup = (id: number) => {
    if (window.confirm("Are you sure you want to duplicate this lead group?")) {
      duplicateGroupMutation.mutate(id);
    }
  };
  
  const handleDeleteGroup = (id: number) => {
    if (window.confirm("Are you sure you want to delete this lead group? This action cannot be undone.")) {
      deleteGroupMutation.mutate(id);
    }
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
                          <Badge className={group.isActive ? "bg-green-100 text-green-800 hover:bg-green-200" : "bg-amber-100 text-amber-800 hover:bg-amber-200"}>
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
                          <div className="flex justify-end gap-2">
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => handleEditGroup(group)}
                              className="flex items-center gap-1"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                              Edit
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => handleDuplicateGroup(group.id)}
                              className="flex items-center gap-1"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                              </svg>
                              Duplicate
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => handleDeleteGroup(group.id)}
                              className="flex items-center gap-1 text-destructive hover:text-destructive hover:bg-destructive/10"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                              Delete
                            </Button>
                          </div>
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
              
              <div className="pt-5 border-t mt-4">
                <h3 className="text-lg font-medium mb-2 flex items-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                  <span>Lead Routing Criteria</span>
                </h3>
                <p className="text-sm text-slate-500 mb-4">Define the criteria for routing leads to this group. Leads matching these criteria will be assigned to agents in this group.</p>
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
                            value={field.value === undefined || field.value === null ? '' : field.value}
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
                            value={field.value === undefined || field.value === null ? '' : field.value}
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
              
              <div className="grid grid-cols-2 gap-4 pt-5 border-t mt-4">
                <FormField
                  control={form.control}
                  name="priority"
                  render={({ field }) => (
                    <FormItem className="col-span-2">
                      <FormLabel className="flex items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                        </svg>
                        <span>Priority (1-20)</span>
                      </FormLabel>
                      <FormControl>
                        <div className="flex flex-col space-y-2">
                          <div className="flex items-center space-x-4">
                            <Slider
                              defaultValue={[field.value]}
                              max={20}
                              min={1}
                              step={1}
                              className="flex-1"
                              onValueChange={(value) => field.onChange(value[0])}
                            />
                            <Badge variant="outline" className="w-10 h-10 text-center flex items-center justify-center text-lg font-bold rounded-full bg-indigo-50">
                              {field.value}
                            </Badge>
                          </div>
                          <div className="flex justify-between text-xs text-slate-500 px-1">
                            <span>Lower</span>
                            <span>Higher</span>
                          </div>
                        </div>
                      </FormControl>
                      <FormDescription>Higher priority groups are matched first when multiple rules match a lead (20 is highest)</FormDescription>
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
        <DialogContent className="sm:max-w-[700px]">
          <DialogHeader>
            <DialogTitle>Lead Group Management</DialogTitle>
            <DialogDescription>
              Manage agents in this lead group and view lead rotation status.
            </DialogDescription>
          </DialogHeader>
          
          <Tabs defaultValue="members" value={rotationTab} onValueChange={(value) => setRotationTab(value as "members" | "rotation")}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="members">Members</TabsTrigger>
              <TabsTrigger value="rotation">Lead Rotation</TabsTrigger>
            </TabsList>
            
            <TabsContent value="members" className="py-4">
              {membersLoading || agentsLoading ? (
                <div className="py-8 text-center">Loading agents...</div>
              ) : agents && agents.length > 0 ? (
                <div className="max-h-[500px] overflow-y-auto">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Group members list */}
                    <div>
                      <h3 className="text-lg font-semibold mb-3">Group Members</h3>
                      <p className="text-sm text-muted-foreground mb-4">
                        These agents will receive leads matching this group's criteria in rotation order.
                      </p>
                      
                      {/* Member list */}
                      <div className="border rounded-md">
                        {Array.isArray(groupMembers) && groupMembers.length > 0 ? (
                          <div className="divide-y">
                            {groupMembers.map((agent: any) => (
                              <div key={agent.id} className="p-3 flex items-center justify-between">
                                <div className="flex items-center space-x-3">
                                  <Avatar className="h-9 w-9">
                                    <AvatarImage src={agent.avatarUrl} />
                                    <AvatarFallback>
                                      {agent.name.split(' ').map((part: string) => part[0]).join('')}
                                    </AvatarFallback>
                                  </Avatar>
                                  <div>
                                    <p className="font-medium">{agent.name}</p>
                                    <p className="text-sm text-muted-foreground">{agent.email}</p>
                                  </div>
                                </div>
                                <Button 
                                  variant="outline" 
                                  size="sm" 
                                  onClick={() => handleRemoveAgent(agent.id)}
                                  className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                >
                                  Remove
                                </Button>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="p-6 text-center text-muted-foreground">
                            <div className="mb-2">No agents in this group yet</div>
                            <div className="text-sm">Add agents from the list on the right</div>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {/* Available agents list */}
                    <div>
                      <h3 className="text-lg font-semibold mb-3">Available Agents</h3>
                      <p className="text-sm text-muted-foreground mb-4">
                        Select agents to add to this lead group.
                      </p>
                      
                      {/* Filterable list of available agents */}
                      <div className="relative">
                        <Input 
                          placeholder="Filter agents..." 
                          className="mb-3" 
                          onChange={(e) => {
                            // TODO: Add filtering logic if needed
                          }} 
                        />
                      </div>
                      
                      <div className="border rounded-md">
                        <div className="divide-y">
                          {Array.isArray(agents) && agents.filter(agent => {
                            // Only show agents not already in the group
                            return !Array.isArray(groupMembers) || 
                              !groupMembers.some(member => member.id === agent.id);
                          }).map((agent: any) => (
                            <div key={agent.id} className="p-3 flex items-center justify-between">
                              <div className="flex items-center space-x-3">
                                <Avatar className="h-9 w-9">
                                  <AvatarImage src={agent.avatarUrl} />
                                  <AvatarFallback>
                                    {agent.name.split(' ').map((part: string) => part[0]).join('')}
                                  </AvatarFallback>
                                </Avatar>
                                <div>
                                  <p className="font-medium">{agent.name}</p>
                                  <p className="text-sm text-muted-foreground">{agent.email}</p>
                                </div>
                              </div>
                              <Button 
                                variant="outline" 
                                size="sm" 
                                onClick={() => handleAddAgent(agent.id)}
                                className="text-primary hover:text-primary hover:bg-primary/10"
                              >
                                Add
                              </Button>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="py-8 text-center text-muted-foreground">
                  No agents found. Add agents first.
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="rotation" className="py-4">
              {rotationLoading ? (
                <div className="py-8 text-center">Loading rotation data...</div>
              ) : rotationData ? (
                <div className="space-y-6">
                  <div className="mb-4">
                    <h3 className="text-lg font-medium mb-2">Lead Rotation Status</h3>
                    <p className="text-sm text-muted-foreground">
                      This shows the current lead rotation order for this group. Agents receive leads in a round-robin fashion based on when they last received a lead.                  
                    </p>
                  </div>
                  
                  {/* Next Agent */}
                  {rotationData && rotationData.nextAgent && (
                    <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
                      <h4 className="text-sm font-semibold mb-2 text-green-700 dark:text-green-400">Next to Receive a Lead</h4>
                      <div className="flex items-center space-x-3">
                        <Avatar className="h-12 w-12 border-2 border-green-200 dark:border-green-800">
                          <AvatarImage src={rotationData.nextAgent.avatarUrl} />
                          <AvatarFallback className="bg-green-100 text-green-700 dark:bg-green-800 dark:text-green-300">
                            {rotationData.nextAgent.name.split(' ').map((part: string) => part[0]).join('')}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{rotationData.nextAgent.name}</p>
                          <p className="text-sm text-green-600 dark:text-green-400">
                            {rotationData.nextAgent.lastAssignment 
                              ? `Last received a lead ${format(new Date(rotationData.nextAgent.lastAssignment), 'MMM d, yyyy')}` 
                              : "Has not received any leads yet"}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {/* Last Agent */}
                  {rotationData && rotationData.lastAgent && (
                    <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                      <h4 className="text-sm font-semibold mb-2 text-blue-700 dark:text-blue-400">Most Recently Received a Lead</h4>
                      <div className="flex items-center space-x-3">
                        <Avatar className="h-12 w-12 border-2 border-blue-200 dark:border-blue-800">
                          <AvatarImage src={rotationData.lastAgent.avatarUrl} />
                          <AvatarFallback className="bg-blue-100 text-blue-700 dark:bg-blue-800 dark:text-blue-300">
                            {rotationData.lastAgent.name.split(' ').map((part: string) => part[0]).join('')}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{rotationData.lastAgent.name}</p>
                          <p className="text-sm text-blue-600 dark:text-blue-400">
                            {rotationData.lastAgent.lastAssignment 
                              ? `Received a lead on ${format(new Date(rotationData.lastAgent.lastAssignment), 'MMM d, yyyy')}` 
                              : "Has not received any leads yet"}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  <Separator className="my-6" />
                  
                  {/* Full rotation order */}
                  <div>
                    <h4 className="text-sm font-semibold mb-3">Complete Rotation Order</h4>
                    {rotationData && rotationData.agents && rotationData.agents.length > 0 ? (
                      <div className="grid grid-cols-1 gap-3">
                        {rotationData.agents.map((agent: any, index: number) => (
                          <div 
                            key={agent.id}
                            className={`flex items-center p-3 rounded-md ${index === 0 ? 'bg-green-50 dark:bg-green-900/20' : 'bg-slate-50 dark:bg-slate-800/50'}`}
                          >
                            <div className="flex-shrink-0 mr-3">
                              <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-sm font-medium dark:bg-slate-700">
                                {index + 1}
                              </div>
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-medium truncate">{agent.name}</p>
                              <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                                {agent.lastAssignment 
                                  ? `Last assigned: ${format(new Date(agent.lastAssignment), 'MMM d, yyyy')}` 
                                  : "No previous assignments"}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground py-3">No agents in this group yet</p>
                    )}
                  </div>
                </div>
              ) : (
                <div className="py-8 text-center text-muted-foreground">
                  No rotation data available. Make sure the group has members.
                </div>
              )}
            </TabsContent>
          </Tabs>
          
          <DialogFooter>
            <Button onClick={() => setMembersDialog(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
