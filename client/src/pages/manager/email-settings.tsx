import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { InfoIcon, ClipboardIcon, AlertCircleIcon, MailIcon } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

export default function EmailSettings() {
  const [copied, setCopied] = useState(false);

  // Fetch email service status
  const { data: emailStatus, isLoading } = useQuery({
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

  // For demo purposes - simulate receiving an email
  const handleSimulateEmail = async () => {
    try {
      const response = await apiRequest("/api/admin/simulate-email", {
        method: "POST",
        body: JSON.stringify({
          subject: "John Smith",
          text: "Interested in buying a house in zip 90210. My email is john@example.com and phone is 555-123-4567. Looking in the price range of $500,000.",
          from: "john@example.com"
        })
      });
      
      if (response.success) {
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
            
            <div className="mt-4">
              <Button 
                onClick={handleSimulateEmail} 
                variant="secondary"
                className="flex items-center gap-2"
              >
                <MailIcon className="h-4 w-4" />
                Simulate Test Lead Email
              </Button>
              <p className="text-sm text-muted-foreground mt-2">
                This will create a sample lead in the system for testing purposes.
              </p>
            </div>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
