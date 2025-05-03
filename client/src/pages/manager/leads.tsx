import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import LeadCard from '@/components/lead-card';

export default function Leads() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
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

  // Status update handler (if needed)
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

  // Filter leads
  const filteredLeads = leads.filter((lead) => {
    // Status filter
    if (statusFilter !== 'all' && lead.status !== statusFilter) {
      return false;
    }

    // Search filter
    if (searchTerm && !(lead.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                        lead.email?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                        lead.phone?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                        lead.address?.toLowerCase().includes(searchTerm.toLowerCase()))) {
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

      {/* Leads list */}
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredLeads.map((lead) => (
            <LeadCard 
              key={lead.id} 
              lead={lead} 
              showActions={true}
              onStatusUpdate={handleStatusUpdate}
            />
          ))}
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
