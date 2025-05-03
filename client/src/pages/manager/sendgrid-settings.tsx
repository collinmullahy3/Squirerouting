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

export default function SendGridSettings() {
  const [apiKey, setApiKey] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  const { toast } = useToast();

  // Query SendGrid settings
  const { data, isLoading, refetch } = useQuery<{ hasApiKey: boolean }>({
    queryKey: ['/api/admin/sendgrid-credentials'],
    refetchOnWindowFocus: false,
  });

  // Set up the mutation for saving
  const { mutate: saveApiKey, isPending } = useMutation({
    mutationFn: async (newApiKey: string) => {
      return apiRequest<{ success: boolean; initialized: boolean }>('/api/admin/sendgrid-credentials', {
        method: 'POST',
        body: JSON.stringify({ apiKey: newApiKey }),
      });
    },
    onSuccess: () => {
      toast({
        title: "API Key Saved",
        description: "SendGrid API key has been saved successfully.",
        variant: "default",
      });
      refetch();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to save SendGrid API key: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  const handleSave = () => {
    if (!apiKey.trim()) {
      toast({
        title: "Error",
        description: "Please enter a valid API key",
        variant: "destructive",
      });
      return;
    }
    saveApiKey(apiKey);
  };

  return (
    <div className="flex min-h-screen bg-muted/40">
      <Sidebar />

      <main className="flex-1 p-6">
        <div className="flex flex-col gap-6 max-w-5xl mx-auto">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-semibold tracking-tight">SendGrid Settings</h1>
              <p className="text-muted-foreground mt-1">
                Configure SendGrid integration for agent email notifications
              </p>
            </div>
          </div>

          <Separator />

          <div className="grid gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Mail className="h-5 w-5" />
                  <span>SendGrid Configuration</span>
                </CardTitle>
                <CardDescription>
                  SendGrid is used to send lead notifications to agents. Add your API key below.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {data?.hasApiKey && (
                  <Alert className="bg-green-50 text-green-800 border-green-200">
                    <Check className="h-4 w-4" />
                    <AlertTitle>SendGrid is configured</AlertTitle>
                    <AlertDescription>
                      Lead notifications will be sent to agents via email.
                    </AlertDescription>
                  </Alert>
                )}

                {!data?.hasApiKey && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>SendGrid API key required</AlertTitle>
                    <AlertDescription>
                      Lead notification emails cannot be sent to agents until you add your SendGrid API key.
                    </AlertDescription>
                  </Alert>
                )}

                <div className="space-y-2">
                  <Label htmlFor="apiKey" className="flex items-center gap-1">
                    <KeyRound className="h-4 w-4" />
                    API Key
                  </Label>
                  <div className="flex space-x-2">
                    <Input
                      id="apiKey"
                      type={showApiKey ? "text" : "password"}
                      placeholder="Enter your SendGrid API key"
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                      className="flex-1"
                    />
                    <Button
                      variant="outline"
                      type="button"
                      onClick={() => setShowApiKey(!showApiKey)}
                    >
                      {showApiKey ? "Hide" : "Show"}
                    </Button>
                  </div>
                </div>

                <Alert variant="warning" className="bg-yellow-50 border-yellow-200 text-yellow-800">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Important</AlertTitle>
                  <AlertDescription>
                    <p>To get a SendGrid API key:</p>
                    <ol className="list-decimal list-inside mt-2 space-y-1">
                      <li>Create a SendGrid account at <a href="https://sendgrid.com" target="_blank" rel="noopener noreferrer" className="underline">sendgrid.com</a></li>
                      <li>Navigate to Settings → API Keys</li>
                      <li>Create a new API key with "Mail Send" permissions</li>
                    </ol>
                  </AlertDescription>
                </Alert>
              </CardContent>
              <CardFooter className="flex justify-end space-x-2">
                <Button
                  onClick={handleSave}
                  disabled={isPending || !apiKey}
                >
                  {isPending ? "Saving..." : "Save API Key"}
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
