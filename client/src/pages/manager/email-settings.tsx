import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Check, Mail, AlertTriangle, Loader2 } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import Sidebar from '@/components/sidebar';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

export default function EmailSettings() {
  // Removed ability to update email credentials as they are managed centrally by administrators
  const { toast } = useToast();
  
  // Query Email settings
  const { data } = useQuery<{ hasCredentials: boolean, email?: string }>({ 
    queryKey: ['/api/admin/email-settings'],
    refetchOnWindowFocus: false,
  });
  
  // Query System Settings
  const { data: systemSettings, isLoading: settingsLoading } = useQuery<any[]>({ 
    queryKey: ['/api/settings'],
    refetchOnWindowFocus: false,
  });
  
  // Get email polling frequency setting
  const pollingFrequencySetting = systemSettings?.find(s => s.key === 'EMAIL_POLLING_FREQUENCY_SECONDS');
  const pollingFrequencySeconds = pollingFrequencySetting ? parseInt(pollingFrequencySetting.value, 10) : 60;
  
  // State to track new polling frequency setting
  const [pollingFrequency, setPollingFrequency] = useState<string>(pollingFrequencySeconds.toString());
  const [updatingSettings, setUpdatingSettings] = useState(false);
  
  // Simulate Lead Form
  const [isSimulating, setIsSimulating] = useState(false);

  // Show the status based on hasCredentials
  const hasCredentials = data?.hasCredentials;

  return (
    <div className="flex min-h-screen bg-muted/40">
      <Sidebar />

      <main className="flex-1 p-6 overflow-auto">
        <div className="flex flex-col gap-6 max-w-5xl mx-auto pb-20">
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
                {hasCredentials ? (
                  <Alert className="bg-green-50 text-green-800 border-green-200">
                    <Check className="h-4 w-4" />
                    <AlertTitle>Email is configured</AlertTitle>
                    <AlertDescription>
                      <p>Lead notifications will be sent to agents via email using the <strong>{data?.email || 'squirerouting@gmail.com'}</strong> account.</p>
                      <p className="mt-2">This email account is centrally managed by administrators.</p>
                    </AlertDescription>
                  </Alert>
                ) : (
                  <Alert className="bg-amber-50 text-amber-800 border-amber-200">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Email not configured</AlertTitle>
                    <AlertDescription>
                      <p>Email credentials are not properly configured. Please set up the email account credentials below.</p>
                    </AlertDescription>
                  </Alert>
                )}
                
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
                      {hasCredentials ? (
                        <span className="font-medium text-green-600 flex items-center gap-1">
                          <Check className="h-4 w-4" /> Active
                        </span>
                      ) : (
                        <span className="font-medium text-amber-600 flex items-center gap-1">
                          <AlertTriangle className="h-4 w-4" /> Not configured
                        </span>
                      )}
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
                      We recommend using a dedicated Gmail account like <strong>squirerouting@gmail.com</strong> for this purpose.
                    </p>
                  </AlertDescription>
                </Alert>

                <Alert className="bg-amber-50 border-amber-200 text-amber-800 mt-4">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Gmail Account Security</AlertTitle>
                  <AlertDescription>
                    <p className="font-medium">If using a Gmail account with 2-factor authentication (2FA):</p>
                    <ol className="list-decimal list-inside mt-2 space-y-1">
                      <li>You <strong>must</strong> use an App Password instead of your regular Gmail password</li>
                      <li>Go to <a href="https://myaccount.google.com/apppasswords" target="_blank" rel="noopener noreferrer" className="underline">Google Account App Passwords</a></li>
                      <li>Select "Mail" as the app and your computer as the device</li>
                      <li>Click "Generate" and copy the 16-character password</li>
                      <li>Paste this App Password in the password field below</li>
                    </ol>
                    <p className="mt-2 text-amber-700">
                      Without an App Password, Gmail will reject connection attempts with the error: "Application-specific password required"
                    </p>
                  </AlertDescription>
                </Alert>
              </CardContent>
              <CardFooter className="flex justify-end space-x-2">
                <Alert className="bg-blue-50 border-blue-200 text-blue-800">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Administrator Access Only</AlertTitle>
                  <AlertDescription>
                    <p>Email credentials can only be configured by system administrators.</p>
                    <p>Please contact your system administrator if you need changes to the email configuration.</p>
                  </AlertDescription>
                </Alert>
              </CardFooter>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Mail className="h-5 w-5" />
                  <span>Real-time Email Checking</span>
                </CardTitle>
                <CardDescription>
                  Configure how frequently the system automatically checks for new emails.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Alert className="bg-green-50 text-green-800 border-green-200">
                  <Check className="h-4 w-4" />
                  <AlertTitle>Automatic Email Checking Enabled</AlertTitle>
                  <AlertDescription>
                    <p>The system is automatically checking for new emails every <strong>{pollingFrequencySeconds}</strong> seconds.</p>
                  </AlertDescription>
                </Alert>

                <div className="space-y-4">
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      setUpdatingSettings(true);
                      
                      apiRequest('PUT', `/api/settings/EMAIL_POLLING_FREQUENCY_SECONDS`, {
                        value: pollingFrequency,
                        type: 'system',
                        description: 'How often the system automatically checks for new emails in seconds'
                      })
                        .then(() => {
                          toast({
                            title: 'Email Polling Frequency Updated',
                            description: `The system will now check for new emails every ${pollingFrequency} seconds.`
                          });
                          setUpdatingSettings(false);
                        })
                        .catch(error => {
                          toast({
                            title: 'Failed to Update Settings',
                            description: error.message || 'An unknown error occurred',
                            variant: 'destructive'
                          });
                          setUpdatingSettings(false);
                        });
                    }}
                    className="space-y-4"
                  >
                    <div className="space-y-2">
                      <Label htmlFor="pollingFrequency">Polling Frequency (seconds)</Label>
                      <div className="flex items-center gap-2">
                        <Input
                          id="pollingFrequency"
                          name="pollingFrequency"
                          type="number"
                          min="30"
                          max="600"
                          value={pollingFrequency}
                          onChange={(e) => setPollingFrequency(e.target.value)}
                          className="w-32"
                        />
                        <span className="text-sm text-muted-foreground">seconds</span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        How often the system should automatically check for new emails. Recommended value: 60 seconds.
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Lower values will make emails appear faster but may increase server load. Valid range: 30-600 seconds.
                      </p>
                    </div>

                    <Button type="submit" disabled={updatingSettings}>
                      {updatingSettings ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Updating...
                        </>
                      ) : (
                        'Update Frequency'
                      )}
                    </Button>
                  </form>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Simulate Lead</CardTitle>
                <CardDescription>
                  Test the lead processing system by simulating an email inquiry
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <form 
                    onSubmit={(e) => {
                      e.preventDefault();
                      const formData = new FormData(e.currentTarget);
                      const simulateData = {
                        from: formData.get('from') as string,
                        subject: formData.get('subject') as string,
                        text: formData.get('text') as string,
                        source: formData.get('source') as string
                      };
                      
                      // Send simulated email data to API
                      toast({
                        title: 'Processing simulated lead...',
                        description: 'Please wait while we process your test lead.'
                      });
                      
                      setIsSimulating(true);
                      apiRequest('POST', '/api/admin/simulate-email', simulateData)
                        .then(response => {
                          toast({
                            title: 'Lead Simulated Successfully',
                            description: 'The test lead has been processed and should appear in the leads list.'
                          });
                          setIsSimulating(false);
                        })
                        .catch(error => {
                          toast({
                            title: 'Failed to Simulate Lead',
                            description: error.message || 'An unknown error occurred',
                            variant: 'destructive'
                          });
                          setIsSimulating(false);
                        });
                    }}
                    className="space-y-4"
                  >
                    <div className="space-y-2">
                      <Label htmlFor="from">From Email</Label>
                      <Input 
                        id="from" 
                        name="from" 
                        defaultValue="test@example.com" 
                        placeholder="renter@example.com" 
                      />
                      <p className="text-sm text-muted-foreground">The email address of the inquiring renter</p>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="subject">Email Subject</Label>
                      <Input 
                        id="subject" 
                        name="subject" 
                        defaultValue="Interested in 123 Main Street, Unit 4B" 
                        placeholder="Interest in property..." 
                      />
                      <p className="text-sm text-muted-foreground">Subject line of the inquiry email</p>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="source">Lead Source</Label>
                      <Select name="source" defaultValue="StreetEasy.com">
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select source" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="StreetEasy.com">StreetEasy.com</SelectItem>
                          <SelectItem value="Zillow.com">Zillow.com</SelectItem>
                          <SelectItem value="Trulia.com">Trulia.com</SelectItem>
                          <SelectItem value="Realtor.com">Realtor.com</SelectItem>
                          <SelectItem value="Zumper.com">Zumper.com</SelectItem>
                          <SelectItem value="HotPads.com">HotPads.com</SelectItem>
                          <SelectItem value="Apartments.com">Apartments.com</SelectItem>
                          <SelectItem value="RentHop.com">RentHop.com</SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-sm text-muted-foreground">The website or platform this lead came from</p>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="emailFormat">Email Format</Label>
                      <Select name="emailFormat" defaultValue="freeform" onValueChange={(value) => {
                        const textarea = document.getElementById('text') as HTMLTextAreaElement;
                        if (value === 'structured') {
                          textarea.value = `Consumer Information:\nFirst Name: John\nLast Name: Smith\nEmail Address: test@example.com\nPhone: 555-123-4567\n\nProperty Information:\nAddress: 123 Main Street\nUnit Number: 4B\nRent: $2500\nBedrooms: 2\nBathrooms: 1\nProposed Move In: September 1st\nSource: StreetEasy.com\n\nAdditional Notes:\nI'm very interested in this property and would like to schedule a viewing as soon as possible.`;
                        } else {
                          textarea.value = `Hi,\n\nI'm John Smith and I'm interested in renting at 123 Main Street, Unit 4B. The listing price of $2500 is within my budget.\n\nPlease contact me at test@example.com or 555-123-4567 if this property is still available. I'm looking to move by September 1st.\n\nThanks,\nJohn`;
                        }
                      }}>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select email format" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="freeform">Freeform Email</SelectItem>
                          <SelectItem value="structured">Structured Format</SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-sm text-muted-foreground">Choose between freeform text or a structured format with labeled fields</p>
                      
                      <Alert className="mt-2 bg-blue-50 border-blue-200 text-blue-800">
                        <AlertTitle>About Structured Format</AlertTitle>
                        <AlertDescription>
                          <p>The structured format uses clearly labeled fields in specific sections:</p>
                          <ul className="list-disc list-inside mt-1 space-y-1">
                            <li><strong>Consumer Information:</strong> Details about the potential renter</li>
                            <li><strong>Property Information:</strong> Details about the property of interest</li>
                          </ul>
                          <p className="mt-1">This format is commonly used by real estate websites when forwarding leads.</p>
                        </AlertDescription>
                      </Alert>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="text">Email Content</Label>
                      <Textarea 
                        id="text" 
                        name="text" 
                        className="min-h-[150px]" 
                        defaultValue={`Hi,\n\nI'm John Smith and I'm interested in renting at 123 Main Street, Unit 4B. The listing price of $2500 is within my budget.\n\nPlease contact me at test@example.com or 555-123-4567 if this property is still available. I'm looking to move by September 1st.\n\nThanks,\nJohn`}
                        placeholder="Enter email body here..." 
                      />
                      <p className="text-sm text-muted-foreground">
                        Include details like name, phone, address, unit number, price and any other relevant information
                      </p>
                    </div>
                    
                    <Button type="submit" disabled={isSimulating}>
                      {isSimulating ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Simulating...
                        </>
                      ) : (
                        'Simulate Lead'
                      )}
                    </Button>
                  </form>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}