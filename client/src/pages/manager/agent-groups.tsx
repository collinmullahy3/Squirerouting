import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";

// Schema for group form
const groupFormSchema = z.object({
  name: z.string().min(2, "Group name must be at least 2 characters"),
  description: z.string().optional(),
  isActive: z.boolean().default(true),
});

type GroupFormValues = z.infer<typeof groupFormSchema>;

export default function AgentGroups() {
  const { isAuthenticated, user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<number | null>(null);
  const [membersDialog, setMembersDialog] = useState(false);
  const [selectedGroupForMembers, setSelectedGroupForMembers] = useState<number | null>(null);

  // Fetch groups
  const { data: groups, isLoading: groupsLoading } = useQuery({
    queryKey: ["/api/agent-groups"],
    enabled: isAuthenticated
  });

  // Fetch agents
  const { data: agents, isLoading: agentsLoading } = useQuery({
    queryKey: ["/api/agents"],
    enabled: isAuthenticated
  });

  // Fetch group members for the selected group
  const { data: groupMembers, isLoading: membersLoading } = useQuery({
    queryKey: ["/api/agent-groups", selectedGroupForMembers, "members"],
    enabled: isAuthenticated && selectedGroupForMembers !== null
  });

  // Form setup
  const form = useForm<GroupFormValues>({
    resolver: zodResolver(groupFormSchema),
    defaultValues: {
      name: "",
      description: "",
      isActive: true,
    },
  });

  // Create group mutation
  const createGroupMutation = useMutation({
    mutationFn: async (data: GroupFormValues) => {
      const response = await apiRequest(
        "POST", 
        "/api/agent-groups",
        data
      );
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/agent-groups"] });
      toast({
        title: "Group created",
        description: "The agent group has been created successfully.",
      });
      setOpenDialog(false);
      form.reset();
    },
    onError: (error) => {
      toast({
        title: "Failed to create group",
        description: error instanceof Error ? error.message : "An error occurred",
        variant: "destructive",
      });
    },
  });

  // Update group mutation
  const updateGroupMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: GroupFormValues }) => {
      const response = await apiRequest(
        "PUT", 
        `/api/agent-groups/${id}`,
        data
      );
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/agent-groups"] });
      toast({
        title: "Group updated",
        description: "The agent group has been updated successfully.",
      });
      setOpenDialog(false);
      setSelectedGroup(null);
      form.reset();
    },
    onError: (error) => {
      toast({
        title: "Failed to update group",
        description: error instanceof Error ? error.message : "An error occurred",
        variant: "destructive",
      });
    },
  });

  // Add agent to group mutation
  const addAgentToGroupMutation = useMutation({
    mutationFn: async ({ groupId, agentId }: { groupId: number; agentId: number }) => {
      const response = await apiRequest(
        "POST", 
        `/api/agent-groups/${groupId}/members/${agentId}`,
        {}
      );
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/agent-groups", selectedGroupForMembers, "members"] });
      toast({
        title: "Agent added",
        description: "The agent has been added to the group successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to add agent",
        description: error instanceof Error ? error.message : "An error occurred",
        variant: "destructive",
      });
    },
  });

  // Remove agent from group mutation
  const removeAgentFromGroupMutation = useMutation({
    mutationFn: async ({ groupId, agentId }: { groupId: number; agentId: number }) => {
      const response = await apiRequest(
        "DELETE", 
        `/api/agent-groups/${groupId}/members/${agentId}`,
        {}
      );
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/agent-groups", selectedGroupForMembers, "members"] });
      toast({
        title: "Agent removed",
        description: "The agent has been removed from the group successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to remove agent",
        description: error instanceof Error ? error.message : "An error occurred",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: GroupFormValues) => {
    if (selectedGroup !== null) {
      updateGroupMutation.mutate({ id: selectedGroup, data });
    } else {
      createGroupMutation.mutate(data);
    }
  };

  const handleEditGroup = (group: any) => {
    setSelectedGroup(group.id);
    form.reset({
      name: group.name,
      description: group.description || "",
      isActive: group.isActive,
    });
    setOpenDialog(true);
  };

  const handleNewGroup = () => {
    setSelectedGroup(null);
    form.reset({
      name: "",
      description: "",
      isActive: true,
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
              <h2 className="text-2xl font-semibold text-slate-800">Agent Groups</h2>
            </div>
            <div className="mt-4 flex md:mt-0 md:ml-4">
              <Button onClick={handleNewGroup}>
                Create New Group
              </Button>
            </div>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Group Management</CardTitle>
              <CardDescription>Manage agent groups and their members</CardDescription>
            </CardHeader>
            <CardContent>
              {groupsLoading ? (
                <div className="py-4 text-center">Loading groups...</div>
              ) : groups && groups.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Group Name</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Members</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {groups.map((group: any) => (
                      <TableRow key={group.id}>
                        <TableCell className="font-medium">{group.name}</TableCell>
                        <TableCell>{group.description || "-"}</TableCell>
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
                <div className="py-4 text-center">No agent groups found</div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Create/Edit Group Dialog */}
      <Dialog open={openDialog} onOpenChange={setOpenDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{selectedGroup !== null ? "Edit Group" : "Create New Group"}</DialogTitle>
            <DialogDescription>
              {selectedGroup !== null
                ? "Edit the details for this agent group."
                : "Create a new group for organizing agents."}
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Group Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter group name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Enter description" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="isActive"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                    <div className="space-y-0.5">
                      <FormLabel>Active</FormLabel>
                      <FormDescription>
                        Active groups can receive new leads.
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
              <DialogFooter>
                <Button 
                  type="submit" 
                  disabled={createGroupMutation.isPending || updateGroupMutation.isPending}
                >
                  {createGroupMutation.isPending || updateGroupMutation.isPending
                    ? "Saving..."
                    : selectedGroup !== null
                    ? "Save Changes"
                    : "Create Group"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Manage Members Dialog */}
      <Dialog open={membersDialog} onOpenChange={setMembersDialog}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Manage Group Members</DialogTitle>
            <DialogDescription>
              Add or remove agents from this group
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-6 grid-cols-1 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Current Members</CardTitle>
              </CardHeader>
              <CardContent className="h-64 overflow-y-auto">
                {membersLoading ? (
                  <div className="text-center py-4">Loading members...</div>
                ) : groupMembers && groupMembers.length > 0 ? (
                  <ul className="space-y-2">
                    {groupMembers.map((member: any) => (
                      <li key={member.id} className="flex items-center justify-between p-2 border rounded">
                        <div className="flex items-center">
                          <Avatar className="h-8 w-8 mr-2">
                            <AvatarImage src={member.avatarUrl} alt={member.name} />
                            <AvatarFallback>{member.name.split(' ').map((n: string) => n[0]).join('')}</AvatarFallback>
                          </Avatar>
                          <span>{member.name}</span>
                        </div>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => handleRemoveAgent(member.id)}
                          disabled={removeAgentFromGroupMutation.isPending}
                        >
                          Remove
                        </Button>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="text-center py-4">No members in this group</div>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Available Agents</CardTitle>
              </CardHeader>
              <CardContent className="h-64 overflow-y-auto">
                {agentsLoading ? (
                  <div className="text-center py-4">Loading agents...</div>
                ) : agents && agents.length > 0 ? (
                  <ul className="space-y-2">
                    {agents
                      .filter((agent: any) => {
                        // Filter out agents that are already members
                        return !groupMembers || !groupMembers.find((member: any) => member.id === agent.id);
                      })
                      .map((agent: any) => (
                        <li key={agent.id} className="flex items-center justify-between p-2 border rounded">
                          <div className="flex items-center">
                            <Avatar className="h-8 w-8 mr-2">
                              <AvatarImage src={agent.avatarUrl} alt={agent.name} />
                              <AvatarFallback>{agent.name.split(' ').map((n: string) => n[0]).join('')}</AvatarFallback>
                            </Avatar>
                            <span>{agent.name}</span>
                          </div>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => handleAddAgent(agent.id)}
                            disabled={addAgentToGroupMutation.isPending}
                          >
                            Add
                          </Button>
                        </li>
                      ))}
                  </ul>
                ) : (
                  <div className="text-center py-4">No available agents</div>
                )}
              </CardContent>
            </Card>
          </div>
          <DialogFooter>
            <Button onClick={() => setMembersDialog(false)}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
