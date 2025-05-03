import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useLocation } from 'wouter';
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
    propertyUrl?: string;
    thumbnailUrl?: string;
    status: string;
    receivedAt: string;
    movingDate?: string | Date;
    notes?: string;
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

  return (
    <div className="p-8 w-full overflow-y-auto pb-20">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">All Leads</h1>
        <Button 
          variant="default" 
          onClick={() => setLocation('/email-settings')}
        >
          Simulate Lead
        </Button>
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
                    {lead.address || (lead.zipCode ? `ZIP: ${lead.zipCode}` : 'N/A')}
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
    </div>
  );
}
