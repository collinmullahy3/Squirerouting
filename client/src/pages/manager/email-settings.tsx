import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { InfoIcon, ClipboardIcon, AlertCircleIcon, MailIcon, CheckCircleIcon, XCircleIcon } from "lucide-react";
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

export default function EmailSettings() {
  const [copied, setCopied] = useState(false);

  // Fetch email service status
  const { data: emailStatus, isLoading } = useQuery<{
    isRunning: boolean;
    initialized: boolean;
    forwardingEmail: string;
  }>({
    queryKey: ["/api/admin/email-service-status"],
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
      const response = await apiRequest<{ success: boolean }>(
        "/api/admin/simulate-email", 
        { 
          method: "POST", 
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data)
        }
      );
      
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
      </div>
    </div>
  );
}
