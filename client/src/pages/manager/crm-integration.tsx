import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Loader2, Download, Upload, AlertCircle, Check } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { Separator } from "@/components/ui/separator";

interface AgentInfo {
  id: number;
  name: string;
}

function formatDate(date: Date) {
  return date.toISOString().split('T')[0];
}

export default function CRMIntegration() {
  const { toast } = useToast();
  const [exportFormat, setExportFormat] = useState<'csv' | 'json'>('csv');
  const [agentFilter, setAgentFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dateRange, setDateRange] = useState<{ from: Date | undefined; to: Date | undefined }>({
    from: undefined,
    to: undefined
  });
  const [includeNotes, setIncludeNotes] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  
  // Import state
  const [importFormat, setImportFormat] = useState<'csv' | 'json'>('csv');
  const [importFile, setImportFile] = useState<File | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<{
    success: boolean;
    imported: number;
    errors: string[];
    warnings: string[];
  } | null>(null);

  // Get agents for filter dropdown
  const { data: agents, isLoading: isLoadingAgents } = useQuery<AgentInfo[]>({
    queryKey: ['/api/agents'],
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  async function handleExport() {
    setIsExporting(true);
    
    try {
      // Build query parameters
      const params = new URLSearchParams();
      params.append('format', exportFormat);
      
      if (agentFilter !== 'all') {
        params.append('agentId', agentFilter);
      }
      
      if (statusFilter !== 'all') {
        params.append('status', statusFilter);
      }
      
      if (dateRange.from && dateRange.to) {
        params.append('startDate', formatDate(dateRange.from));
        params.append('endDate', formatDate(dateRange.to));
      }
      
      params.append('includeNotes', includeNotes.toString());
      
      // Create a download link for the export
      const response = await fetch(`/api/crm/export?${params.toString()}`, {
        method: 'GET',
        headers: {
          'Accept': exportFormat === 'csv' ? 'text/csv' : 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error(`Export failed: ${response.statusText}`);
      }
      
      // Extract filename from response headers or generate one
      let filename = 'squire-leads-export';
      const contentDisposition = response.headers.get('content-disposition');
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="(.+)"/i);
        if (filenameMatch && filenameMatch[1]) {
          filename = filenameMatch[1];
        }
      }
      
      // Create a blob and download link
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast({
        title: 'Export completed',
        description: 'Your leads have been exported successfully.',
      });
    } catch (error) {
      console.error('Export error:', error);
      toast({
        title: 'Export failed',
        description: error instanceof Error ? error.message : 'An unknown error occurred',
        variant: 'destructive',
      });
    } finally {
      setIsExporting(false);
    }
  }

  async function handleImport() {
    if (!importFile) {
      toast({
        title: 'No file selected',
        description: 'Please select a file to import.',
        variant: 'destructive',
      });
      return;
    }
    
    setIsImporting(true);
    setImportResult(null);
    
    try {
      const fileContent = await importFile.text();
      
      // Upload the file content
      const response = await fetch(`/api/crm/import?format=${importFormat}`, {
        method: 'POST',
        headers: {
          'Content-Type': importFormat === 'csv' ? 'text/csv' : 'application/json'
        },
        body: fileContent
      });
      
      if (!response.ok) {
        throw new Error(`Import failed: ${response.statusText}`);
      }
      
      const result = await response.json();
      setImportResult(result);
      
      if (result.success) {
        toast({
          title: 'Import completed',
          description: `Successfully imported ${result.imported} leads.`,
        });
      } else {
        toast({
          title: 'Import completed with issues',
          description: `Imported ${result.imported} leads with ${result.errors.length} errors.`,
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Import error:', error);
      toast({
        title: 'Import failed',
        description: error instanceof Error ? error.message : 'An unknown error occurred',
        variant: 'destructive',
      });
    } finally {
      setIsImporting(false);
    }
  }

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    if (event.target.files && event.target.files.length > 0) {
      setImportFile(event.target.files[0]);
    }
  }

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-6">CRM Integration</h1>
      <p className="text-gray-600 mb-8">
        Import and export lead data for integration with your external CRM system.
      </p>
      
      <Tabs defaultValue="export" className="w-full">
        <TabsList className="mb-6">
          <TabsTrigger value="export">Export Leads</TabsTrigger>
          <TabsTrigger value="import">Import Leads</TabsTrigger>
        </TabsList>
        
        <TabsContent value="export">
          <Card>
            <CardHeader>
              <CardTitle>Export Leads</CardTitle>
              <CardDescription>
                Download your leads in CSV or JSON format for use in external systems.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label>Export Format</Label>
                <RadioGroup 
                  defaultValue="csv" 
                  value={exportFormat}
                  onValueChange={(value) => setExportFormat(value as 'csv' | 'json')}
                  className="flex space-x-4"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="csv" id="csv" />
                    <Label htmlFor="csv">CSV (Excel Compatible)</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="json" id="json" />
                    <Label htmlFor="json">JSON (Full Data)</Label>
                  </div>
                </RadioGroup>
              </div>
              
              <Separator className="my-4" />
              
              <div className="space-y-2">
                <Label>Filter Options</Label>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                  <div className="space-y-2">
                    <Label htmlFor="agent-filter">Filter by Agent</Label>
                    <Select
                      value={agentFilter}
                      onValueChange={setAgentFilter}
                    >
                      <SelectTrigger id="agent-filter">
                        <SelectValue placeholder="Select an agent" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Agents</SelectItem>
                        {isLoadingAgents ? (
                          <SelectItem value="loading" disabled>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Loading agents...
                          </SelectItem>
                        ) : (
                          agents?.map((agent) => (
                            <SelectItem key={agent.id} value={agent.id.toString()}>
                              {agent.name}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="status-filter">Filter by Status</Label>
                    <Select
                      value={statusFilter}
                      onValueChange={setStatusFilter}
                    >
                      <SelectTrigger id="status-filter">
                        <SelectValue placeholder="Select a status" />
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
                
                <div className="space-y-2 mt-4">
                  <Label>Date Range (Optional)</Label>
                  <DateRangePicker
                    value={dateRange}
                    onChange={setDateRange}
                  />
                </div>
              </div>
              
              <Separator className="my-4" />
              
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="include-notes" 
                  checked={includeNotes}
                  onCheckedChange={(checked) => setIncludeNotes(checked === true)}
                />
                <Label htmlFor="include-notes" className="text-sm">Include notes and additional details</Label>
              </div>
            </CardContent>
            <CardFooter>
              <Button 
                onClick={handleExport} 
                disabled={isExporting}
                className="w-full md:w-auto"
              >
                {isExporting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    <span>Exporting...</span>
                  </>
                ) : (
                  <>
                    <Download className="mr-2 h-4 w-4" />
                    <span>Export Leads</span>
                  </>
                )}
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
        
        <TabsContent value="import">
          <Card>
            <CardHeader>
              <CardTitle>Import Leads</CardTitle>
              <CardDescription>
                Upload lead data from your CRM system to Squire.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label>Import Format</Label>
                <RadioGroup 
                  defaultValue="csv" 
                  value={importFormat}
                  onValueChange={(value) => setImportFormat(value as 'csv' | 'json')}
                  className="flex space-x-4"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="csv" id="import-csv" />
                    <Label htmlFor="import-csv">CSV</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="json" id="import-json" />
                    <Label htmlFor="import-json">JSON</Label>
                  </div>
                </RadioGroup>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="file-upload">Upload File</Label>
                <Input
                  id="file-upload"
                  type="file"
                  accept={importFormat === 'csv' ? '.csv' : '.json'}
                  onChange={handleFileChange}
                  disabled={isImporting}
                />
                <p className="text-sm text-gray-500 mt-1">
                  {importFormat === 'csv' 
                    ? 'Required fields: name, email. CSV should include a header row.' 
                    : 'JSON should contain an array of lead objects with at least name and email properties.'}
                </p>
              </div>
              
              {importResult && (
                <Alert variant={importResult.errors.length > 0 ? "destructive" : "default"}>
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>
                    {importResult.success 
                      ? `Imported ${importResult.imported} leads successfully` 
                      : 'Import completed with issues'}
                  </AlertTitle>
                  <AlertDescription>
                    {importResult.errors.length > 0 && (
                      <div className="mt-2">
                        <p className="font-semibold">Errors:</p>
                        <ul className="list-disc list-inside text-sm">
                          {importResult.errors.slice(0, 5).map((error, i) => (
                            <li key={i}>{error}</li>
                          ))}
                          {importResult.errors.length > 5 && <li>...and {importResult.errors.length - 5} more errors</li>}
                        </ul>
                      </div>
                    )}
                    {importResult.warnings.length > 0 && (
                      <div className="mt-2">
                        <p className="font-semibold">Warnings:</p>
                        <ul className="list-disc list-inside text-sm">
                          {importResult.warnings.slice(0, 5).map((warning, i) => (
                            <li key={i}>{warning}</li>
                          ))}
                          {importResult.warnings.length > 5 && <li>...and {importResult.warnings.length - 5} more warnings</li>}
                        </ul>
                      </div>
                    )}
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
            <CardFooter>
              <Button 
                onClick={handleImport} 
                disabled={isImporting || !importFile}
                className="w-full md:w-auto"
              >
                {isImporting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    <span>Importing...</span>
                  </>
                ) : (
                  <>
                    <Upload className="mr-2 h-4 w-4" />
                    <span>Import Leads</span>
                  </>
                )}
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}