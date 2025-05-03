import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Check, Mail, AlertTriangle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import Sidebar from '@/components/sidebar';
import { Separator } from '@/components/ui/separator';

export default function EmailSettings() {
  // Query Email settings
  const { data } = useQuery<{ hasCredentials: boolean, email?: string }>({ 
    queryKey: ['/api/admin/email-settings'],
    refetchOnWindowFocus: false,
  });

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
                <Alert className="bg-green-50 text-green-800 border-green-200">
                  <Check className="h-4 w-4" />
                  <AlertTitle>Email is configured</AlertTitle>
                  <AlertDescription>
                    <p>Lead notifications will be sent to agents via email using the <strong>{data?.email || 'squirerouting@gmail.com'}</strong> account.</p>
                    <p className="mt-2">This email account is centrally managed by administrators.</p>
                  </AlertDescription>
                </Alert>
                
                <div className="p-4 border rounded-md bg-muted/10">
                  <div className="flex items-center gap-2 mb-2">
                    <Mail className="h-5 w-5 text-slate-600" />
                    <h3 className="font-medium">Email Configuration Status</h3>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="grid grid-cols-2 gap-2">
                      <span className="text-slate-600">Email Address:</span>
                      <span className="font-medium">{data?.email || 'squirerouting@gmail.com'}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <span className="text-slate-600">Status:</span>
                      <span className="font-medium text-green-600 flex items-center gap-1">
                        <Check className="h-4 w-4" /> Active
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <span className="text-slate-600">Used for:</span>
                      <span className="font-medium">Sending notifications & receiving leads</span>
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
                <div className="text-sm text-muted-foreground italic">
                  Email settings are managed by system administrators
                </div>
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