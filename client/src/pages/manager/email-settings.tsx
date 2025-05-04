import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Check, Mail, AlertTriangle, Loader2 } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import Sidebar from '@/components/sidebar';
import { Separator } from '@/components/ui/separator';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

export default function EmailSettings() {
  const [showAddCredentials, setShowAddCredentials] = useState(false);
  const { toast } = useToast();
  
  // Email schema for form validation
  const emailFormSchema = z.object({
    email: z.string().email("Please enter a valid email address"),
    password: z.string().min(8, "Password must be at least 8 characters"),
  });

  // Query Email settings
  const { data, refetch } = useQuery<{ hasCredentials: boolean, email?: string }>({ 
    queryKey: ['/api/admin/email-settings'],
    refetchOnWindowFocus: false,
  });
  
  // Simulate Lead Form
  const [isSimulating, setIsSimulating] = useState(false);
  
  // Form setup
  const form = useForm<z.infer<typeof emailFormSchema>>({    
    resolver: zodResolver(emailFormSchema),
    defaultValues: {
      email: data?.email || '',
      password: '',
    },
  });
  
  // Update email settings mutation
  const updateEmailMutation = useMutation({
    mutationFn: async (values: z.infer<typeof emailFormSchema>) => {
      return await apiRequest(
        "POST",
        "/api/admin/email-settings",
        { email: values.email, password: values.password }
      );
    },
    onSuccess: () => {
      toast({
        title: "Email Settings Updated",
        description: "Your email credentials have been updated successfully."
      });
      refetch();
      setShowAddCredentials(false);
      form.reset();
    },
    onError: (error) => {
      toast({
        title: "Failed to Update Settings",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive",
      });
    },
  });
  
  // Handle form submission
  const onSubmit = (values: z.infer<typeof emailFormSchema>) => {
    updateEmailMutation.mutate(values);
  };

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
                      We recommend using a dedicated Gmail account like <strong>squirerouting@gmail.com</strong> for this purpose. For Gmail accounts, you'll need to create an "App Password" instead of using your regular password.
                    </p>
                  </AlertDescription>
                </Alert>
              </CardContent>
              <CardFooter className="flex justify-end space-x-2">
                <Button 
                  variant="outline" 
                  onClick={() => setShowAddCredentials(!showAddCredentials)}
                >
                  {showAddCredentials ? 'Cancel' : 'Update Email Credentials'}
                </Button>
              </CardFooter>
              
              {/* Email Credentials Form */}
              {showAddCredentials && (
                <div className="px-6 pb-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Update Email Credentials</CardTitle>
                      <CardDescription>
                        Enter the email account credentials for sending notifications and receiving leads
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                          <FormField
                            control={form.control}
                            name="email"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Email Address</FormLabel>
                                <FormControl>
                                  <Input placeholder="email@example.com" {...field} />
                                </FormControl>
                                <FormDescription>
                                  Enter the full email address to use for sending notifications and receiving leads
                                </FormDescription>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          
                          <FormField
                            control={form.control}
                            name="password"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Email Password</FormLabel>
                                <FormControl>
                                  <Input type="password" placeholder="••••••••" {...field} />
                                </FormControl>
                                <FormDescription>
                                  For Gmail accounts, create an App Password in your Google Account settings
                                </FormDescription>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          
                          <div className="flex justify-end pt-4">
                            <Button type="submit" disabled={updateEmailMutation.isPending}>
                              {updateEmailMutation.isPending ? (
                                <>
                                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                  Updating...
                                </>
                              ) : (
                                'Save Credentials'
                              )}
                            </Button>
                          </div>
                        </form>
                      </Form>
                    </CardContent>
                  </Card>
                </div>
              )}
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