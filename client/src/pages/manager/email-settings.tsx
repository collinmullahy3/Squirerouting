import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { InfoIcon, ClipboardIcon, AlertCircleIcon, MailIcon, CheckCircleIcon, XCircleIcon, SettingsIcon, SaveIcon } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

const simulatedEmailSchema = z.object({
  subject: z.string().min(1, "Subject is required"),
  text: z.string().min(10, "Email body must contain at least 10 characters"),
  from: z.string().email("From must be a valid email address")
});

const deduplicationSchema = z.object({
  value: z.string().min(1).refine(val => !isNaN(parseInt(val)) && parseInt(val) > 0, {
    message: "Must be a positive number"
  })
});

type DeduplicationFormValues = z.infer<typeof deduplicationSchema>;

export default function EmailSettings() {
  const [copied, setCopied] = useState(false);
  const queryClient = useQueryClient();

  // Fetch email service status
  const { data: emailStatus, isLoading } = useQuery<{
    isRunning: boolean;
    initialized: boolean;
    forwardingEmail: string;
  }>({
    queryKey: ["/api/admin/email-service-status"],
    staleTime: 60000, // Cache for 1 minute
  });
  
  // Fetch lead deduplication setting
  const { data: deduplicationSetting, isLoading: isDeduplicationLoading } = useQuery<{
    key: string;
    value: string;
    type: string;
    description: string;
  }>({
    queryKey: ["/api/settings/LEAD_DEDUPLICATION_DAYS"],
    staleTime: 60000, // Cache for 1 minute
  });

  // Copy forwarding email to clipboard
  const copyForwardingEmail = () => {
    if (emailStatus?.forwardingEmail) {
      navigator.clipboard.writeText(emailStatus.forwardingEmail);
      setCopied(true);
      toast({
        title: "Email copied to clipboard",
        description: `${emailStatus.forwardingEmail} has been copied to your clipboard.`,
      });

      setTimeout(() => setCopied(false), 3000);
    }
  };

  // Type for the email simulation form
  type SimulatedEmailFormValues = z.infer<typeof simulatedEmailSchema>;

  // Form for simulating an email
  const simulateForm = useForm<SimulatedEmailFormValues>({
    resolver: zodResolver(simulatedEmailSchema),
    defaultValues: {
      subject: "John Smith",
      text: "Interested in buying a house in zip 90210. My email is john@example.com and phone is 555-123-4567. Looking in the price range of $500,000.",
      from: "john@example.com"
    }
  });

  // For demo purposes - simulate receiving an email
  const handleSimulateEmail = async (data: SimulatedEmailFormValues) => {
    try {
      const response = await apiRequest<{ success: boolean }>("POST", "/api/admin/simulate-email", data);
      
      if (response && response.success) {
        toast({
          title: "Test email processed",
          description: "The test lead has been successfully processed and routed."
        });
      }
    } catch (error) {
      console.error("Error simulating email:", error);
      toast({
        title: "Error",
        description: "Failed to process test email",
        variant: "destructive"
      });
    }
  };

  // Form for lead deduplication window
  const deduplicationForm = useForm<DeduplicationFormValues>({
    resolver: zodResolver(deduplicationSchema),
    defaultValues: {
      value: deduplicationSetting?.value || "7",
    }
  });
  
  // Update form values when settings are loaded
  React.useEffect(() => {
    if (deduplicationSetting) {
      deduplicationForm.reset({
        value: deduplicationSetting.value
      });
    }
  }, [deduplicationSetting, deduplicationForm]);
  
  // Update deduplication setting
  const updateDeduplicationMutation = useMutation({
    mutationFn: async (data: DeduplicationFormValues) => {
      return await apiRequest("PUT", `/api/settings/LEAD_DEDUPLICATION_DAYS`, {
        value: data.value,
        type: "system",
        description: "Number of days to consider emails from the same sender as part of the same lead"
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings/LEAD_DEDUPLICATION_DAYS"] });
      toast({
        title: "Setting Updated",
        description: "Lead deduplication window has been updated."
      });
    },
    onError: (error) => {
      console.error("Error updating setting:", error);
      toast({
        title: "Error",
        description: "Failed to update lead deduplication window",
        variant: "destructive"
      });
    }
  });
  
  const handleDeduplicationUpdate = (data: DeduplicationFormValues) => {
    updateDeduplicationMutation.mutate(data);
  };

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-6">Email Settings</h1>
      
      <div className="grid gap-6 mb-8">
        {/* Email Forwarding Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MailIcon className="h-5 w-5" />
              Email Forwarding Address
            </CardTitle>
            <CardDescription>
              This is the email address where agents should forward leads to. All emails sent to this address will be processed as new leads.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="h-24 flex items-center justify-center">
                <div className="animate-spin h-6 w-6 border-2 border-primary border-opacity-50 border-t-primary rounded-full"></div>
              </div>
            ) : emailStatus?.forwardingEmail ? (
              <div className="space-y-4">
                <div className="bg-muted p-4 rounded-md">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-base">{emailStatus.forwardingEmail}</span>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={copyForwardingEmail}
                      className="flex items-center gap-1"
                    >
                      <ClipboardIcon className="h-4 w-4" />
                      {copied ? "Copied!" : "Copy"}
                    </Button>
                  </div>
                </div>
                
                <div className="flex items-center gap-3 mt-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">Service Status:</span>
                    {emailStatus.isRunning ? (
                      <span className="inline-flex items-center gap-1 text-green-600 dark:text-green-500">
                        <CheckCircleIcon className="h-4 w-4" /> Connected
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-red-600 dark:text-red-500">
                        <XCircleIcon className="h-4 w-4" /> Disconnected
                      </span>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">Initialization:</span>
                    {emailStatus.initialized ? (
                      <span className="inline-flex items-center gap-1 text-green-600 dark:text-green-500">
                        <CheckCircleIcon className="h-4 w-4" /> Success
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-red-600 dark:text-red-500">
                        <XCircleIcon className="h-4 w-4" /> Failed
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <Alert variant="destructive">
                <AlertCircleIcon className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>
                  Could not retrieve forwarding email address.
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
          <CardFooter className="flex flex-col items-start gap-4">
            <Alert>
              <InfoIcon className="h-4 w-4" />
              <AlertTitle>How it works</AlertTitle>
              <AlertDescription>
                When agents receive potential leads via email, they should forward them to this address. 
                The system will automatically parse the email for lead information (name, email, phone, price, etc.) 
                and route it to the appropriate agent group based on your routing rules.
              </AlertDescription>
            </Alert>
          </CardFooter>
        </Card>
        
        {/* Simulate Email Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MailIcon className="h-5 w-5" />
              Simulate Lead Email
            </CardTitle>
            <CardDescription>
              Use this form to simulate receiving a lead email for testing purposes.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...simulateForm}>
              <form onSubmit={simulateForm.handleSubmit(handleSimulateEmail)} className="space-y-4">
                <FormField
                  control={simulateForm.control}
                  name="subject"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Subject (Name)</FormLabel>
                      <FormControl>
                        <Input placeholder="John Smith" {...field} />
                      </FormControl>
                      <FormDescription>
                        This will be parsed as the lead's name if it looks like a name.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={simulateForm.control}
                  name="from"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>From</FormLabel>
                      <FormControl>
                        <Input placeholder="john@example.com" {...field} />
                      </FormControl>
                      <FormDescription>
                        The email address of the sender.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={simulateForm.control}
                  name="text"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email Body</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Include information like email, phone, price, zip code, and address."
                          className="min-h-32" 
                          {...field} 
                        />
                      </FormControl>
                      <FormDescription>
                        The system will extract lead information from this text.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <Button 
                  type="submit" 
                  className="flex items-center gap-2"
                >
                  <MailIcon className="h-4 w-4" />
                  Simulate Email
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
        
        {/* Lead Deduplication Settings Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <SettingsIcon className="h-5 w-5" />
              Lead Deduplication Settings
            </CardTitle>
            <CardDescription>
              Configure how long emails from the same sender should be treated as part of the same lead.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isDeduplicationLoading ? (
              <div className="h-24 flex items-center justify-center">
                <div className="animate-spin h-6 w-6 border-2 border-primary border-opacity-50 border-t-primary rounded-full"></div>
              </div>
            ) : (
              <Form {...deduplicationForm}>
                <form onSubmit={deduplicationForm.handleSubmit(handleDeduplicationUpdate)} className="space-y-4">
                  <FormField
                    control={deduplicationForm.control}
                    name="value"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Deduplication Window (Days)</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            min="1" 
                            max="365"
                            {...field} 
                            onChange={(e) => {
                              // Ensure number input is valid
                              const value = e.target.value === "" ? "1" : e.target.value;
                              field.onChange(value);
                            }}
                          />
                        </FormControl>
                        <FormDescription>
                          Multiple emails from the same sender within this time window will be treated as part of the same lead and routed to the same agent.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <Button 
                    type="submit" 
                    className="flex items-center gap-2"
                    disabled={updateDeduplicationMutation.isPending}
                  >
                    <SaveIcon className="h-4 w-4" />
                    {updateDeduplicationMutation.isPending ? "Saving..." : "Save Settings"}
                  </Button>
                </form>
              </Form>
            )}
          </CardContent>
          <CardFooter>
            <Alert>
              <InfoIcon className="h-4 w-4" />
              <AlertTitle>How it works</AlertTitle>
              <AlertDescription>
                When emails arrive from the same sender within this time window, the system treats them as updates to an existing lead rather than creating new leads.
                This ensures that all communications from the same renter are routed to the same agent, improving customer experience.
              </AlertDescription>
            </Alert>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
