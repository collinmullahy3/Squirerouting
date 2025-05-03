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
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";

// Schema for routing rule form
const routingRuleSchema = z.object({
  name: z.string().min(2, "Rule name must be at least 2 characters"),
  description: z.string().optional(),
  groupId: z.coerce.number().positive("Must select a group"),
  minPrice: z.coerce.number().optional(),
  maxPrice: z.coerce.number().optional(),
  zipCodes: z.string().optional(),
  addressPattern: z.string().optional(),
  priority: z.coerce.number().min(1).max(20).default(10),
  isActive: z.boolean().default(true),
});

// Check that max price is greater than min price
const formSchema = routingRuleSchema.refine(
  (data) => {
    if (data.minPrice && data.maxPrice) {
      return data.maxPrice > data.minPrice;
    }
    return true;
  },
  {
    message: "Maximum price must be greater than minimum price",
    path: ["maxPrice"],
  }
);

type RoutingRuleFormValues = z.infer<typeof formSchema>;

export default function RoutingRules() {
  const { isAuthenticated, user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedRule, setSelectedRule] = useState<number | null>(null);

  // Fetch routing rules
  const { data: rules, isLoading: rulesLoading } = useQuery({
    queryKey: ["/api/routing-rules"],
    enabled: isAuthenticated
  });

  // Fetch agent groups for select dropdown
  const { data: groups, isLoading: groupsLoading } = useQuery({
    queryKey: ["/api/agent-groups"],
    enabled: isAuthenticated
  });

  // Form setup
  const form = useForm<RoutingRuleFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      description: "",
      groupId: 0,
      minPrice: undefined,
      maxPrice: undefined,
      zipCodes: "",
      addressPattern: "",
      priority: 10,
      isActive: true,
    },
  });

  // Create rule mutation
  const createRuleMutation = useMutation({
    mutationFn: async (data: RoutingRuleFormValues) => {
      // Handle the zipCodes array conversion
      let formattedData = { ...data };
      if (data.zipCodes) {
        formattedData.zipCodes = data.zipCodes.split(",").map(zip => zip.trim());
      }
      
      const response = await apiRequest(
        "POST", 
        "/api/routing-rules",
        formattedData
      );
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/routing-rules"] });
      toast({
        title: "Rule created",
        description: "The routing rule has been created successfully.",
      });
      setOpenDialog(false);
      form.reset();
    },
    onError: (error) => {
      toast({
        title: "Failed to create rule",
        description: error instanceof Error ? error.message : "An error occurred",
        variant: "destructive",
      });
    },
  });

  // Update rule mutation
  const updateRuleMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: RoutingRuleFormValues }) => {
      // Handle the zipCodes array conversion
      let formattedData = { ...data };
      if (data.zipCodes) {
        formattedData.zipCodes = data.zipCodes.split(",").map(zip => zip.trim());
      }
      
      const response = await apiRequest(
        "PUT", 
        `/api/routing-rules/${id}`,
        formattedData
      );
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/routing-rules"] });
      toast({
        title: "Rule updated",
        description: "The routing rule has been updated successfully.",
      });
      setOpenDialog(false);
      setSelectedRule(null);
      form.reset();
    },
    onError: (error) => {
      toast({
        title: "Failed to update rule",
        description: error instanceof Error ? error.message : "An error occurred",
        variant: "destructive",
      });
    },
  });

  // Delete rule mutation
  const deleteRuleMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest(
        "DELETE", 
        `/api/routing-rules/${id}`,
        {}
      );
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/routing-rules"] });
      toast({
        title: "Rule deleted",
        description: "The routing rule has been deleted.",
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to delete rule",
        description: error instanceof Error ? error.message : "An error occurred",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: RoutingRuleFormValues) => {
    if (selectedRule !== null) {
      updateRuleMutation.mutate({ id: selectedRule, data });
    } else {
      createRuleMutation.mutate(data);
    }
  };

  const handleEditRule = (rule: any) => {
    setSelectedRule(rule.id);
    
    // Format zipCodes from array to comma-separated string
    const zipCodesString = rule.zipCodes ? rule.zipCodes.join(", ") : "";
    
    form.reset({
      name: rule.name,
      description: rule.description || "",
      groupId: rule.groupId,
      minPrice: rule.minPrice || undefined,
      maxPrice: rule.maxPrice || undefined,
      zipCodes: zipCodesString,
      addressPattern: rule.addressPattern || "",
      priority: rule.priority,
      isActive: rule.isActive,
    });
    setOpenDialog(true);
  };

  const handleNewRule = () => {
    setSelectedRule(null);
    form.reset({
      name: "",
      description: "",
      groupId: 0,
      minPrice: undefined,
      maxPrice: undefined,
      zipCodes: "",
      addressPattern: "",
      priority: 10,
      isActive: true,
    });
    setOpenDialog(true);
  };

  const handleDeleteRule = (id: number) => {
    if (confirm("Are you sure you want to delete this routing rule? This action cannot be undone.")) {
      deleteRuleMutation.mutate(id);
    }
  };

  const getGroupName = (groupId: number) => {
    if (!groups) return "Unknown Group";
    const group = groups.find((g: any) => g.id === groupId);
    return group ? group.name : "Unknown Group";
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
              <h2 className="text-2xl font-semibold text-slate-800">Routing Rules</h2>
            </div>
            <div className="mt-4 flex md:mt-0 md:ml-4">
              <Button onClick={handleNewRule}>
                Create New Rule
              </Button>
            </div>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Rule Management</CardTitle>
              <CardDescription>
                Define rules for routing leads to specific agent groups based on properties like price range, zip code, or address pattern.
                Rules are evaluated in order of priority (highest first).
              </CardDescription>
            </CardHeader>
            <CardContent>
              {rulesLoading ? (
                <div className="py-4 text-center">Loading rules...</div>
              ) : rules && rules.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Priority</TableHead>
                      <TableHead>Rule Name</TableHead>
                      <TableHead>Group</TableHead>
                      <TableHead>Price Range</TableHead>
                      <TableHead>Zip Codes</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rules.map((rule: any) => (
                      <TableRow key={rule.id}>
                        <TableCell>{rule.priority}</TableCell>
                        <TableCell className="font-medium">
                          {rule.name}
                          {rule.description && (
                            <p className="text-xs text-muted-foreground">{rule.description}</p>
                          )}
                        </TableCell>
                        <TableCell>{getGroupName(rule.groupId)}</TableCell>
                        <TableCell>
                          {rule.minPrice && rule.maxPrice ? (
                            `$${rule.minPrice.toLocaleString()} - $${rule.maxPrice.toLocaleString()}`
                          ) : rule.minPrice ? (
                            `> $${rule.minPrice.toLocaleString()}`
                          ) : rule.maxPrice ? (
                            `< $${rule.maxPrice.toLocaleString()}`
                          ) : (
                            "Any"
                          )}
                        </TableCell>
                        <TableCell>
                          {rule.zipCodes && rule.zipCodes.length > 0 ? (
                            rule.zipCodes.join(", ")
                          ) : (
                            "Any"
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant={rule.isActive ? "success" : "warning"}>
                            {rule.isActive ? "Active" : "Inactive"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end space-x-2">
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={() => handleEditRule(rule)}
                            >
                              Edit
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              className="text-red-500 hover:text-red-700" 
                              onClick={() => handleDeleteRule(rule.id)}
                            >
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
                  <p className="text-muted-foreground mb-4">No routing rules found</p>
                  <Button onClick={handleNewRule}>Create Your First Rule</Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Create/Edit Rule Dialog */}
      <Dialog open={openDialog} onOpenChange={setOpenDialog}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>{selectedRule !== null ? "Edit Routing Rule" : "Create New Routing Rule"}</DialogTitle>
            <DialogDescription>
              {selectedRule !== null
                ? "Edit the criteria for routing leads to agent groups."
                : "Create a rule to automatically route leads to a specific agent group based on criteria."}
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Rule Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter rule name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="groupId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Agent Group</FormLabel>
                      <Select 
                        onValueChange={(value) => field.onChange(Number(value))} 
                        defaultValue={field.value ? field.value.toString() : undefined}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a group" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {groupsLoading ? (
                            <SelectItem value="loading">Loading groups...</SelectItem>
                          ) : groups && groups.length > 0 ? (
                            groups.map((group: any) => (
                              <SelectItem key={group.id} value={group.id.toString()}>
                                {group.name}
                              </SelectItem>
                            ))
                          ) : (
                            <SelectItem value="none">No groups available</SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

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

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="minPrice"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Minimum Price</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          placeholder="No minimum" 
                          {...field} 
                          onChange={(e) => {
                            const value = e.target.value;
                            field.onChange(value === "" ? undefined : Number(value));
                          }}
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
                          type="number" 
                          placeholder="No maximum" 
                          {...field} 
                          onChange={(e) => {
                            const value = e.target.value;
                            field.onChange(value === "" ? undefined : Number(value));
                          }}
                        />
                      </FormControl>
                      <FormDescription>Leave blank for no maximum</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="zipCodes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Zip Codes</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. 94103, 94102, 94105" {...field} />
                      </FormControl>
                      <FormDescription>Comma-separated list of zip codes</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="addressPattern"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Address Pattern</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. San Francisco" {...field} />
                      </FormControl>
                      <FormDescription>Case insensitive text search</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="priority"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Priority (Higher values are evaluated first)</FormLabel>
                    <FormControl>
                      <div className="flex flex-col w-full gap-1">
                        {/* Priority ruler with rule name chips */}
                        <div className="relative h-20 w-full mb-2 mt-6">
                          {/* Ruler background */}
                          <div className="absolute h-1 w-full bg-slate-200 top-6 rounded-full"></div>
                          
                          {/* Priority labels */}
                          <div className="absolute -top-4 left-0 text-xs text-slate-500">1 (Low)</div>
                          <div className="absolute -top-4 right-0 text-xs text-slate-500">20 (High)</div>
                          
                          {/* Rule name chips */}
                          {rules && Array.isArray(rules) && rules.filter((r: any) => 
                            // Don't show chip for the rule being edited
                            selectedRule !== r.id
                          ).map((rule: any) => {
                            // Convert 0-100 scale to 1-20 scale if needed
                            const priority = rule.priority > 20 ? Math.ceil(rule.priority / 5) : rule.priority;
                            const position = ((priority - 1) / 19) * 100; // Convert to percentage (1-20 range)
                            
                            // Alternate position above/below line to prevent overlap
                            const isAbove = rule.id % 2 === 0;
                            
                            return (
                              <div 
                                key={rule.id}
                                className={`absolute px-2 py-0.5 rounded-full border text-xs font-medium whitespace-nowrap max-w-[120px] truncate ${isAbove ? '-top-2' : 'top-8'}`}
                                style={{ 
                                  left: `${position}%`, 
                                  transform: 'translateX(-50%)',
                                  backgroundColor: rule.isActive ? 
                                    (priority > 15 ? '#fef2f2' : (priority > 10 ? '#fefce8' : (priority > 5 ? '#eff6ff' : '#f0fdf4'))) : 
                                    '#f8fafc',
                                  borderColor: rule.isActive ? 
                                    (priority > 15 ? '#ef4444' : (priority > 10 ? '#f59e0b' : (priority > 5 ? '#3b82f6' : '#10b981'))) : 
                                    '#94a3b8',
                                  color: rule.isActive ? 
                                    (priority > 15 ? '#b91c1c' : (priority > 10 ? '#b45309' : (priority > 5 ? '#1d4ed8' : '#047857'))) : 
                                    '#64748b',
                                }}
                                title={`${rule.name}: Priority ${priority}`}
                              >
                                <span className="inline-block mr-1">{priority}</span>
                                {rule.name}
                              </div>
                            );
                          })}
                          
                          {/* Ruler tick marks */}
                          {[...Array(5)].map((_, i) => {
                            const value = i * 5; // 0, 5, 10, 15
                            if (value === 0) return null; // Skip 0
                            const percentage = ((value - 1) / 19) * 100;
                            return (
                              <div 
                                key={i}
                                className="absolute h-2 w-0.5 bg-slate-300 top-5.5"
                                style={{ 
                                  left: `${percentage}%`, 
                                  transform: 'translateX(-50%)',
                                }}
                              />
                            );
                          })}
                        </div>
                        
                        {/* The actual slider */}
                        <div className="flex items-center space-x-4">
                          <Slider
                            onValueChange={(values) => field.onChange(values[0])}
                            defaultValue={[field.value]}
                            min={1}
                            max={20}
                            step={1}
                            className="flex-1"
                          />
                          <Input
                            type="number"
                            min={1}
                            max={20}
                            value={field.value}
                            onChange={(e) => {
                              const value = Number(e.target.value);
                              // Ensure value is within 1-20 range
                              const cappedValue = Math.min(Math.max(value, 1), 20);
                              field.onChange(cappedValue);
                            }}
                            className="w-16"
                          />
                        </div>
                      </div>
                    </FormControl>
                    
                    {/* Small description to explain the chips */}
                    <FormDescription>
                      Colored chips show where your existing rules are set on the priority scale. Higher priorities (closer to 20) take precedence over lower ones.
                    </FormDescription>
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
                        Inactive rules won't be used for routing
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
                  disabled={createRuleMutation.isPending || updateRuleMutation.isPending}
                >
                  {createRuleMutation.isPending || updateRuleMutation.isPending
                    ? "Saving..."
                    : selectedRule !== null
                    ? "Save Changes"
                    : "Create Rule"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
