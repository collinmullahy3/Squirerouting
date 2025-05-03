import React, { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { AlertCircle, Check, Mail, KeyRound, AlertTriangle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import Sidebar from '@/components/sidebar';
import { Separator } from '@/components/ui/separator';

export default function EmailSettings() {
  const [emailAddress, setEmailAddress] = useState('');
  const [emailPassword, setEmailPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const { toast } = useToast();

  // Query Email settings
  const { data, isLoading, refetch } = useQuery<{ hasCredentials: boolean, email?: string }>({ 
    queryKey: ['/api/admin/email-settings'],
    refetchOnWindowFocus: false,
  });

  // Set up the mutation for saving
  const { mutate: saveCredentials, isPending } = useMutation({
    mutationFn: async (credentials: { email: string; password: string }) => {
      return apiRequest<{ success: boolean }>(('/api/admin/email-settings'), {
        method: 'POST',
        body: JSON.stringify(credentials),
      });
    },
    onSuccess: () => {
      toast({
        title: "Email Credentials Saved",
        description: "Your email credentials have been saved successfully.",
        variant: "default",
      });
      refetch();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to save email credentials: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  const handleSave = () => {
    if (!emailAddress.trim() || !emailPassword.trim()) {
      toast({
        title: "Error",
        description: "Please enter both email address and password",
        variant: "destructive",
      });
      return;
    }
    saveCredentials({ email: emailAddress, password: emailPassword });
  };

  // Update the email address field from data when loaded
  useEffect(() => {
    if (data?.email) {
      setEmailAddress(data.email);
    }
  }, [data]);

  return (
    <div className="flex min-h-screen bg-muted/40">
      <Sidebar />

      <main className="flex-1 p-6">
        <div className="flex flex-col gap-6 max-w-5xl mx-auto">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-semibold tracking-tight">Email Settings</h1>
              <p className="text-muted-foreground mt-1">
                Configure email service for lead notifications and processing
              </p>
            </div>
          </div>

          <Separator />

          <div className="grid gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Mail className="h-5 w-5" />
                  <span>Email Configuration</span>
                </CardTitle>
                <CardDescription>
                  Set up the email account used for sending notifications to agents and processing incoming leads.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {data?.hasCredentials && (
                  <Alert className="bg-green-50 text-green-800 border-green-200">
                    <Check className="h-4 w-4" />
                    <AlertTitle>Email is configured</AlertTitle>
                    <AlertDescription>
                      Lead notifications will be sent to agents via email.
                    </AlertDescription>
                  </Alert>
                )}

                {!data?.hasCredentials && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Email credentials required</AlertTitle>
                    <AlertDescription>
                      Lead notification emails cannot be sent to agents until you add your email credentials.
                    </AlertDescription>
                  </Alert>
                )}

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="emailAddress" className="flex items-center gap-1">
                      <Mail className="h-4 w-4" />
                      Email Address
                    </Label>
                    <Input
                      id="emailAddress"
                      type="email"
                      placeholder="Enter your email address"
                      value={emailAddress}
                      onChange={(e) => setEmailAddress(e.target.value)}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="emailPassword" className="flex items-center gap-1">
                      <KeyRound className="h-4 w-4" />
                      Email Password
                    </Label>
                    <div className="flex space-x-2">
                      <Input
                        id="emailPassword"
                        type={showPassword ? "text" : "password"}
                        placeholder="Enter your email password"
                        value={emailPassword}
                        onChange={(e) => setEmailPassword(e.target.value)}
                        className="flex-1"
                      />
                      <Button
                        variant="outline"
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? "Hide" : "Show"}
                      </Button>
                    </div>
                  </div>
                </div>

                <Alert className="bg-blue-50 border-blue-200 text-blue-800">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Important</AlertTitle>
                  <AlertDescription>
                    <p>This email account will be used for two purposes:</p>
                    <ol className="list-decimal list-inside mt-2 space-y-1">
                      <li>Sending lead assignment notifications to agents</li>
                      <li>Receiving forwarded leads from various property listing websites</li>
                    </ol>
                    <p className="mt-2">
                      We recommend using a dedicated Gmail account like <strong>squirerouting@gmail.com</strong> for this purpose. For Gmail accounts, you'll need to create an "App Password" instead of using your regular password.
                    </p>
                  </AlertDescription>
                </Alert>
              </CardContent>
              <CardFooter className="flex justify-end space-x-2">
                <Button
                  onClick={handleSave}
                  disabled={isPending || !emailAddress || !emailPassword}
                >
                  {isPending ? "Saving..." : "Save Credentials"}
                </Button>
              </CardFooter>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Email Notification Settings</CardTitle>
                <CardDescription>
                  Configure email notification content and behavior
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    When a lead is assigned to an agent, an email notification will be sent to them with the lead details.
                    These emails will include a Reply-To header set to the lead's email address, allowing agents to respond directly.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}