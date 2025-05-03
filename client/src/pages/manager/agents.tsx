import { useState } from "react";
import { useQuery, useMutation, QueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";

// Creating a schema for the new agent form
const agentFormSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Must be a valid email address"),
  username: z.string().min(3, "Username must be at least 3 characters"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  phone: z.string().optional(),
});

type AgentFormValues = z.infer<typeof agentFormSchema>;

const Agents = () => {
  const { toast } = useToast();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Fetch agents
  const { data: agents, isLoading: isLoadingAgents, error } = useQuery({
    queryKey: ["/api/agents"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/agents");
      return response;
    },
  });

  // Form setup
  const form = useForm<AgentFormValues>({
    resolver: zodResolver(agentFormSchema),
    defaultValues: {
      name: "",
      email: "",
      username: "",
      password: "",
      phone: "",
    },
  });

  // Create agent mutation
  const createAgentMutation = useMutation({
    mutationFn: async (values: AgentFormValues) => {
      const response = await apiRequest("POST", "/api/agents", values);
      return response;
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Agent created successfully",
      });
      form.reset();
      setIsCreateDialogOpen(false);
      // Invalidate agents query to refresh the list
      queryClient.invalidateQueries({ queryKey: ["/api/agents"] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create agent",
        variant: "destructive",
      });
    },
  });

  // Submit handler for create form
  const onSubmit = async (data: AgentFormValues) => {
    createAgentMutation.mutate(data);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Agents</h1>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <svg
                className="mr-2 h-4 w-4"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                />
              </svg>
              Add Agent
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Agent</DialogTitle>
              <DialogDescription>
                Add a new agent to the system. They will receive an email with login instructions.
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Full Name</FormLabel>
                      <FormControl>
                        <Input placeholder="John Doe" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input placeholder="john.doe@example.com" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="username"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Username</FormLabel>
                      <FormControl>
                        <Input placeholder="johndoe" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Password</FormLabel>
                      <FormControl>
                        <Input type="password" placeholder="******" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone (Optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="+1 (555) 123-4567" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <DialogFooter>
                  <Button type="submit" disabled={createAgentMutation.isPending}>
                    {createAgentMutation.isPending ? "Creating..." : "Create Agent"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Agent Management</CardTitle>
          <CardDescription>
            Manage agents and assign them to groups. Agents can handle leads assigned to their groups.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingAgents ? (
            <div className="p-8 text-center">Loading agents...</div>
          ) : error ? (
            <div className="p-8 text-center text-red-500">
              Error loading agents: {error instanceof Error ? error.message : "Unknown error"}
            </div>
          ) : agents && agents.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Username</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Groups</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {agents.map((agent: any) => (
                  <TableRow key={agent.id}>
                    <TableCell className="font-medium">{agent.name}</TableCell>
                    <TableCell>{agent.email}</TableCell>
                    <TableCell>{agent.username}</TableCell>
                    <TableCell>{agent.phone || "—"}</TableCell>
                    <TableCell>
                      {agent.groups && agent.groups.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {agent.groups.map((group: {id: number, name: string}) => (
                            <Badge key={group.id} variant="outline">
                              {group.name}
                            </Badge>
                          ))}
                        </div>
                      ) : (
                        <span className="text-slate-400 text-sm">No groups</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <Button variant="outline" size="sm">
                          Edit
                        </Button>
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button variant="outline" size="sm">
                              Assign Groups
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Assign Agent to Groups</DialogTitle>
                              <DialogDescription>
                                Select which agent groups {agent.name} should belong to.
                              </DialogDescription>
                            </DialogHeader>
                            <AssignGroupsContent agentId={agent.id} currentGroups={agent.groups || []} />
                          </DialogContent>
                        </Dialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="p-8 text-center text-slate-500">
              No agents found. Add your first agent to get started.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

// Component for the assign groups dialog content
interface AssignGroupsContentProps {
  agentId: number;
  currentGroups: {id: number, name: string}[];
}

const AssignGroupsContent = ({ agentId, currentGroups }: AssignGroupsContentProps) => {
  const [selectedGroups, setSelectedGroups] = useState<number[]>(
    currentGroups.map(group => group.id)
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  // Fetch all groups
  const { data: groups, isLoading } = useQuery({
    queryKey: ["/api/agent-groups"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/agent-groups");
      return response;
    },
  });

  const handleToggleGroup = (groupId: number) => {
    setSelectedGroups(prev => {
      if (prev.includes(groupId)) {
        return prev.filter(id => id !== groupId);
      } else {
        return [...prev, groupId];
      }
    });
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    
    try {
      // First, get current assignments to determine what changed
      const currentAssignments = currentGroups.map(g => g.id);
      
      // Groups to add (in selected but not in current)
      const groupsToAdd = selectedGroups.filter(id => !currentAssignments.includes(id));
      
      // Groups to remove (in current but not in selected)
      const groupsToRemove = currentAssignments.filter(id => !selectedGroups.includes(id));
      
      // Add agent to new groups
      for (const groupId of groupsToAdd) {
        await apiRequest(
          "POST", 
          `/api/agent-groups/${groupId}/members/${agentId}`
        );
      }
      
      // Remove agent from groups they should no longer be in
      for (const groupId of groupsToRemove) {
        await apiRequest(
          "DELETE", 
          `/api/agent-groups/${groupId}/members/${agentId}`
        );
      }
      
      // Show success message
      toast({
        title: "Groups updated",
        description: "The agent's group assignments have been updated.",
      });
      
      // Refresh the agents list
      queryClient.invalidateQueries({ queryKey: ["/api/agents"] });
    } catch (error) {
      console.error("Error updating agent groups:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update agent groups",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="py-4">
      {isLoading ? (
        <div className="py-8 text-center">Loading groups...</div>
      ) : groups && groups.length > 0 ? (
        <>
          <div className="space-y-4 mb-6">
            {groups.map((group: any) => (
              <div key={group.id} className="flex items-center space-x-2">
                <Checkbox 
                  id={`group-${group.id}`}
                  checked={selectedGroups.includes(group.id)}
                  onCheckedChange={() => handleToggleGroup(group.id)}
                />
                <label 
                  htmlFor={`group-${group.id}`}
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  {group.name}
                </label>
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </>
      ) : (
        <div className="py-8 text-center text-muted-foreground">
          No agent groups found. Please create agent groups first.
        </div>
      )}
    </div>
  );
};

export default Agents;
