import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { apiRequest } from '@/lib/queryClient';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';

export default function Leads() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedLeadId, setSelectedLeadId] = useState<number | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const limit = 10; // Items per page
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [isCheckingEmails, setIsCheckingEmails] = useState(false);

  // Check for new emails mutation
  const checkEmailsMutation = useMutation({
    mutationFn: async () => {
      setIsCheckingEmails(true);
      return await apiRequest<any>("POST", "/api/admin/check-emails");
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Email check completed successfully. New leads may have been processed.",
      });
      // Refetch leads to get any new ones
      refetch();
      setIsCheckingEmails(false);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to check emails: ${error instanceof Error ? error.message : "Unknown error"}`,
        variant: "destructive",
      });
      setIsCheckingEmails(false);
    },
  });

  // Handle checking for new emails
  const handleCheckEmails = () => {
    checkEmailsMutation.mutate();
  };

  // Fetch leads
  const { data: leads = [], isLoading, isError, refetch } = useQuery({
    queryKey: ['/api/leads', currentPage, limit],
    queryFn: async () => {
      const response = await fetch(`/api/leads?page=${currentPage}&limit=${limit}`);
      if (!response.ok) {
        throw new Error('Failed to fetch leads');
      }
      return response.json();
    },
  });
  
  // Fetch lead details when a lead is selected
  const { data: leadDetails, isLoading: isLoadingDetails } = useQuery({
    queryKey: ['/api/leads/details', selectedLeadId],
    queryFn: async () => {
      if (!selectedLeadId) return null;
      const response = await fetch(`/api/leads/${selectedLeadId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch lead details');
      }
      return response.json();
    },
    enabled: !!selectedLeadId,
  });
  
  // Handle opening the lead details dialog
  const openLeadDetails = (leadId: number) => {
    setSelectedLeadId(leadId);
    setDetailsOpen(true);
  };
  
  // Handle closing the lead details dialog
  const closeLeadDetails = () => {
    setDetailsOpen(false);
    // Delay clearing the selected lead to avoid UI flickering during close animation
    setTimeout(() => setSelectedLeadId(null), 300);
  };

  // Status update handler
  const handleStatusUpdate = async (leadId: number, status: string) => {
    try {
      // Implement status update logic here
      await fetch(`/api/leads/${leadId}/status`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status,
        }),
      });

      // Refetch leads to update the list
      refetch();

      toast({
        title: 'Lead status updated',
        description: `Lead status has been updated to ${status}`,
      });
    } catch (error) {
      toast({
        title: 'Error updating lead status',
        description: 'An error occurred while updating the lead status',
        variant: 'destructive',
      });
    }
  };

  // Define lead interface
  interface Lead {
    id: number;
    name: string;
    email: string;
    phone?: string;
    price?: number | string;
    priceMax?: number | string;
    zipCode?: string;
    address?: string;
    unitNumber?: string;
    neighborhood?: string;
    bedCount?: number;
    source?: string;
    propertyUrl?: string;
    thumbnailUrl?: string;
    status: string;
    receivedAt: string;
    movingDate?: string | Date;
    notes?: string;
    originalEmail?: string;
    assignedAgent?: {
      id: number;
      name: string;
    };
  }

  // Filter leads
  const filteredLeads = leads.filter((lead: Lead) => {
    // Status filter
    if (statusFilter !== 'all' && lead.status !== statusFilter) {
      return false;
    }

    // Search filter
    if (searchTerm && !(lead.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                        lead.email?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                        (lead.phone && lead.phone.toLowerCase().includes(searchTerm.toLowerCase())) || 
                        (lead.address && lead.address.toLowerCase().includes(searchTerm.toLowerCase())))) {
      return false;
    }

    return true;
  });

  // Handle pagination
  const handleNextPage = () => {
    setCurrentPage(currentPage + 1);
  };

  const handlePrevPage = () => {
    setCurrentPage(Math.max(1, currentPage - 1));
  };
  
  // Format date
  const formatDate = (dateString: string | Date | null | undefined): string => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString();
  };

  // Format currency
  const formatPrice = (price: number | string | null | undefined, priceMax?: number | string | null): string => {
    if (!price) return 'N/A';

    const formattedMin = typeof price === 'number' 
        ? `$${price.toLocaleString()}`
        : `$${parseFloat(price as string).toLocaleString()}`;
        
    // If we have a price range, format it as min-max
    if (priceMax) {
      const formattedMax = typeof priceMax === 'number' 
        ? `$${priceMax.toLocaleString()}`
        : `$${parseFloat(priceMax as string).toLocaleString()}`;
      return `${formattedMin} - ${formattedMax}`;
    }
    
    return formattedMin;
  };
  
  // Get a human-readable description of rule matching criteria
  const getMatchCriteria = (rule: any) => {
    const criteria = [];
    
    if (rule.minPrice && rule.maxPrice) {
      criteria.push(`Price: ${formatPrice(rule.minPrice)} to ${formatPrice(rule.maxPrice)}`);
    } else if (rule.minPrice) {
      criteria.push(`Price: From ${formatPrice(rule.minPrice)}`);
    } else if (rule.maxPrice) {
      criteria.push(`Price: Up to ${formatPrice(rule.maxPrice)}`);
    }
    
    if (rule.zipCodes?.length) {
      criteria.push(`ZIP: ${rule.zipCodes}`);
    }
    
    if (rule.addressPattern) {
      criteria.push(`Address: ${rule.addressPattern}`);
    }
    
    return criteria.length > 0 ? criteria.join(', ') : 'All leads';
  };

  return (
    <div className="p-8 w-full overflow-y-auto pb-20">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">All Leads</h1>
        <div className="flex gap-3">
          <Button 
            variant="outline" 
            onClick={handleCheckEmails}
            disabled={isCheckingEmails}
          >
            {isCheckingEmails ? (
              <>
                <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent"></span>
                Checking...
              </>
            ) : (
              "Check for New Emails"
            )}
          </Button>
          <Button 
            variant="default" 
            onClick={() => setLocation('/email-settings')}
          >
            Simulate Lead
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardHeader className="pb-3">
          <CardTitle>Filters</CardTitle>
          <CardDescription>
            Filter and search through leads
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4">
            <div className="w-full md:w-2/3">
              <Label htmlFor="search">Search</Label>
              <Input
                id="search"
                placeholder="Search by name, email, phone, or address"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="mt-1"
              />
            </div>
            <div className="w-full md:w-1/3">
              <Label htmlFor="status">Status</Label>
              <Select 
                value={statusFilter} 
                onValueChange={setStatusFilter}
              >
                <SelectTrigger id="status" className="mt-1">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="assigned">Assigned</SelectItem>
                  <SelectItem value="closed">Closed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Leads table */}
      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-opacity-50 border-t-primary rounded-full"></div>
        </div>
      ) : isError ? (
        <Card className="mb-6 border-red-300">
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-red-500">Error loading leads. Please try again.</p>
              <Button variant="outline" onClick={() => refetch()} className="mt-2">
                Retry
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : filteredLeads.length === 0 ? (
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-gray-500">No leads found. Try adjusting your filters.</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Moving Date</TableHead>
                <TableHead>Property Link</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Received</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredLeads.map((lead: Lead) => (
                <TableRow key={lead.id} className="cursor-pointer hover:bg-gray-50" onClick={() => openLeadDetails(lead.id)}>
                  <TableCell className="font-medium">{lead.name}</TableCell>
                  <TableCell>{lead.email}</TableCell>
                  <TableCell>{lead.phone || 'N/A'}</TableCell>
                  <TableCell>{formatPrice(lead.price, lead.priceMax)}</TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      {lead.address ? (
                        <span className="font-medium">{lead.address}</span>
                      ) : lead.zipCode ? (
                        <span>ZIP: {lead.zipCode}</span>
                      ) : (
                        <span className="text-gray-500">No location</span>
                      )}
                      
                      {lead.unitNumber && (
                        <span className="text-xs text-primary">Unit {lead.unitNumber}</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {lead.source ? (
                      <Badge variant="outline" className="bg-primary bg-opacity-10 text-primary hover:bg-opacity-20 border-primary border-opacity-20">
                        {lead.source}
                      </Badge>
                    ) : 'Unknown'}
                  </TableCell>
                  <TableCell>{lead.movingDate ? formatDate(lead.movingDate) : 'N/A'}</TableCell>
                  <TableCell>
                    {lead.propertyUrl ? (
                      <a 
                        href={lead.propertyUrl} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-primary hover:underline flex items-center"
                      >
                        {lead.thumbnailUrl && (
                          <img 
                            src={lead.thumbnailUrl} 
                            alt="Property" 
                            className="h-6 w-6 mr-2 object-cover rounded"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                            }}
                          />
                        )}
                        View
                      </a>
                    ) : 'N/A'}
                  </TableCell>
                  <TableCell>
                    <Badge className={`
                      ${lead.status === 'pending' ? 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200' : ''}
                      ${lead.status === 'assigned' ? 'bg-blue-100 text-blue-800 hover:bg-blue-200' : ''}
                      ${lead.status === 'closed' ? 'bg-green-100 text-green-800 hover:bg-green-200' : ''}
                    `}>
                      {lead.status.charAt(0).toUpperCase() + lead.status.slice(1)}
                    </Badge>
                  </TableCell>
                  <TableCell>{formatDate(lead.receivedAt)}</TableCell>
                  <TableCell>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => { e.stopPropagation(); handleStatusUpdate(lead.id, 'closed'); }}
                      disabled={lead.status === 'closed'}
                    >
                      {lead.status === 'closed' ? 'Closed' : 'Mark Closed'}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Pagination */}
      {!isLoading && !isError && leads.length > 0 && (
        <div className="flex justify-between items-center mt-8">
          <Button
            variant="outline"
            onClick={handlePrevPage}
            disabled={currentPage === 1}
          >
            Previous
          </Button>
          <span>Page {currentPage}</span>
          <Button
            variant="outline"
            onClick={handleNextPage}
            disabled={leads.length < limit}
          >
            Next
          </Button>
        </div>
      )}
      
      {/* Lead details dialog */}
      <Dialog open={detailsOpen} onOpenChange={(open) => !open && closeLeadDetails()}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          {isLoadingDetails || !leadDetails ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin h-8 w-8 border-4 border-primary border-opacity-50 border-t-primary rounded-full"></div>
            </div>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle className="text-2xl">{leadDetails.name}</DialogTitle>
                <div className="mt-2 space-y-1 text-sm">
                  <div><span className="font-semibold">Email:</span> {leadDetails.email}</div>
                  <div><span className="font-semibold">Phone:</span> {leadDetails.phone || 'N/A'}</div>
                  <div><span className="font-semibold">Status:</span> 
                    <Badge className={`ml-2 ${leadDetails.status === 'pending' ? 'bg-yellow-100 text-yellow-800' : 
                            leadDetails.status === 'assigned' ? 'bg-blue-100 text-blue-800' : 
                            'bg-green-100 text-green-800'}`}>
                      {leadDetails.status.charAt(0).toUpperCase() + leadDetails.status.slice(1)}
                    </Badge>
                  </div>
                  {leadDetails.assignedAgent && (
                    <div><span className="font-semibold">Assigned To:</span> {leadDetails.assignedAgent.name}</div>
                  )}
                  <div><span className="font-semibold">Received:</span> {formatDate(leadDetails.receivedAt)}</div>
                  <div><span className="font-semibold">Moving Date:</span> {leadDetails.movingDate ? formatDate(leadDetails.movingDate) : 'N/A'}</div>
                  <div><span className="font-semibold">Routing Rule:</span> {leadDetails.routingRule ? leadDetails.routingRule.name : 'Manual Assignment'}</div>
                </div>
              </DialogHeader>

              <Tabs defaultValue="details" className="mt-4">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="details">Primary Details</TabsTrigger>
                  <TabsTrigger value="properties">Property Info</TabsTrigger>
                  <TabsTrigger value="email">Original Email</TabsTrigger>
                </TabsList>
                
                {/* Primary details tab */}
                <TabsContent value="details" className="mt-4 space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle>Lead Details</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <h3 className="font-semibold mb-2">Price Range</h3>
                          <p className="text-lg">{formatPrice(leadDetails.price, leadDetails.priceMax)}</p>
                        </div>
                        <div>
                          <h3 className="font-semibold mb-2">Property Details</h3>
                          <p className="text-gray-800">
                            {leadDetails.bedCount ? <span className="font-medium">{leadDetails.bedCount} bed</span> : ''}
                          </p>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 gap-2 mt-4">
                        <div>
                          <h3 className="font-semibold mb-2">Building & Unit</h3>
                          <div className="bg-slate-50 p-3 rounded-md border">
                            {leadDetails.address ? (
                              <p className="font-medium">{leadDetails.address}</p>
                            ) : (
                              <p className="text-gray-500">No building address provided</p>
                            )}
                            
                            {leadDetails.unitNumber && (
                              <p className="mt-1 text-primary">Unit {leadDetails.unitNumber}</p>
                            )}
                            
                            {leadDetails.zipCode && (
                              <p className="text-sm text-gray-500 mt-1">ZIP: {leadDetails.zipCode}</p>
                            )}
                            
                            {leadDetails.neighborhood && (
                              <p className="text-sm text-gray-500 mt-1">Neighborhood: {leadDetails.neighborhood}</p>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4 mt-4">
                        <div>
                          <h3 className="font-semibold mb-2">Moving Date</h3>
                          <p>{leadDetails.movingDate ? formatDate(leadDetails.movingDate) : 'Not specified'}</p>
                        </div>
                        <div>
                          <h3 className="font-semibold mb-2">Source</h3>
                          <p>{leadDetails.source || 'Email'}</p>
                        </div>
                      </div>
                      
                      {leadDetails.routingRule && (
                        <div className="mt-4 p-3 bg-slate-50 rounded-md border">
                          <h3 className="font-semibold mb-2">Routing Information</h3>
                          <div className="grid grid-cols-2 gap-2 text-sm">
                            <div>
                              <span className="text-gray-500">Rule:</span> {leadDetails.routingRule.name}
                            </div>
                            <div>
                              <span className="text-gray-500">Agent Group:</span> {leadDetails.routingRule.group ? leadDetails.routingRule.group.name : 'Unknown'}
                            </div>
                            <div>
                              <span className="text-gray-500">Priority:</span> {leadDetails.routingRule.priority}
                            </div>
                            <div>
                              <span className="text-gray-500">Match Criteria:</span> {getMatchCriteria(leadDetails.routingRule)}
                            </div>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>
                
                {/* Properties tab */}
                <TabsContent value="properties" className="mt-4">
                  <Card>
                    <CardHeader>
                      <CardTitle>Property Information</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {leadDetails.propertyUrl ? (
                        <div className="flex flex-col md:flex-row gap-4 items-start">
                          {leadDetails.thumbnailUrl && (
                            <div className="w-full md:w-1/3">
                              <img 
                                src={leadDetails.thumbnailUrl} 
                                alt="Property" 
                                className="w-full rounded-md object-cover" 
                                onError={(e) => {
                                  e.currentTarget.style.display = 'none';
                                }}
                              />
                            </div>
                          )}
                          <div className="flex-1">
                            <h3 className="font-semibold mb-2">Primary Property</h3>
                            <a 
                              href={leadDetails.propertyUrl} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-primary hover:underline"
                            >
                              View Property Listing
                            </a>
                            <p className="mt-2 text-sm text-gray-600">Click above to see the main property this lead inquired about.</p>
                          </div>
                        </div>
                      ) : (
                        <p>No property information available.</p>
                      )}
                      
                      {/* Parse and display additional properties from notes */}
                      {leadDetails.notes && leadDetails.notes.includes('Additional property link') && (
                        <div className="mt-6">
                          <h3 className="font-semibold mb-3">Additional Properties</h3>
                          <div className="space-y-4">
                            {leadDetails.notes.split('Additional property link from new inquiry:').slice(1).map((part, index) => {
                              // Add explicit type casting to make TypeScript happy
                              const partStr = String(part);
                              const idx = Number(index);
                              const propertyUrl = partStr.split('\n')[1]?.trim();
                              return propertyUrl ? (
                                <div key={idx} className="p-3 border rounded-md">
                                  <a 
                                    href={propertyUrl} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="text-primary hover:underline"
                                  >
                                    Additional Property {idx + 1}
                                  </a>
                                </div>
                              ) : null;
                            })}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>
                
                {/* Original Email tab */}
                <TabsContent value="email" className="mt-4">
                  <Card className="overflow-hidden">
                    <CardHeader>
                      <CardTitle>Original Email</CardTitle>
                      <CardDescription>Raw email content as received from the sender</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ScrollArea className="h-[500px] w-full rounded-md border">
                        {leadDetails.originalEmail ? (
                          <div className="p-4">
                            <div className="space-y-2 mb-4 p-3 bg-slate-50 rounded border">
                              <div><span className="font-medium">From:</span> {leadDetails.name} &lt;{leadDetails.email}&gt;</div>
                              <div><span className="font-medium">Received:</span> {formatDate(leadDetails.receivedAt)}</div>
                              <div><span className="font-medium">Status:</span> {leadDetails.status}</div>
                            </div>
                            
                            {/* Determine if content is HTML or plain text */}
                            {leadDetails.originalEmail.includes('<html') || leadDetails.originalEmail.includes('<body') ? (
                              <div className="mt-4 rounded border p-4 bg-white">
                                <div className="font-medium text-sm mb-2 text-slate-500">HTML Email Content:</div>
                                <div className="w-full overflow-hidden">
                                  <iframe 
                                    srcDoc={leadDetails.originalEmail} 
                                    className="w-full h-[350px] border rounded" 
                                    sandbox=""
                                    title="Email Content"
                                    style={{ overflow: 'auto' }}
                                  />
                                </div>
                              </div>
                            ) : (
                              <div className="mt-4 rounded border p-4 bg-white">
                                <div className="font-medium text-sm mb-2 text-slate-500">Email Content:</div>
                                <div className="w-full overflow-hidden">
                                  <pre className="whitespace-pre-wrap font-sans text-sm max-h-[350px] overflow-y-auto p-2 border rounded w-full">
                                    {leadDetails.originalEmail}
                                  </pre>
                                </div>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="p-4 text-center text-gray-500">
                            <p>Original email content not available</p>
                          </div>
                        )}
                      </ScrollArea>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
              
              <DialogFooter className="mt-6">
                <Button variant="outline" onClick={closeLeadDetails}>Close</Button>
                {leadDetails.status !== 'closed' && (
                  <Button 
                    onClick={() => {
                      handleStatusUpdate(leadDetails.id, 'closed');
                      closeLeadDetails();
                    }}
                  >
                    Mark as Closed
                  </Button>
                )}
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}