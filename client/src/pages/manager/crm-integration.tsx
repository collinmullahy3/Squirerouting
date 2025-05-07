import React, { useState, useRef } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
// We'll create the DateRangePicker component later
// import { DateRangePicker } from "@/components/ui/date-range-picker";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
// FileUploader component doesn't exist, so we'll use the standard Input component
import { AlertCircle, Download, Upload } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default function CRMIntegration() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("export");
  const [exportFormat, setExportFormat] = useState("csv");
  const [importFormat, setImportFormat] = useState("csv");
  const [selectedAgent, setSelectedAgent] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [includeNotes, setIncludeNotes] = useState(true);
  // Simplified date range without using a DateRange component
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // Fetch agents for the dropdown
  const { data: agents } = useQuery({
    queryKey: ["/api/debug/agents"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/debug/agents");
      return response.json();
    },
  });

  // Export mutation
  const exportMutation = useMutation({
    mutationFn: async () => {
      let url = `/api/debug/crm/export?format=${exportFormat}`;
      
      if (selectedAgent !== "all") {
        url += `&agentId=${selectedAgent}`;
      }
      
      if (selectedStatus !== "all") {
        url += `&status=${selectedStatus}`;
      }
      
      url += `&includeNotes=${includeNotes}`;
      
      if (startDate) {
        url += `&startDate=${startDate}`;
      }
      
      if (endDate) {
        url += `&endDate=${endDate}`;
      }
      
      // Trigger file download
      window.location.href = url;
      return true;
    },
    onSuccess: () => {
      toast({
        title: "Export Started",
        description: "Your file download should begin shortly.",
      });
    },
    onError: (error) => {
      toast({
        title: "Export Failed",
        description: error instanceof Error ? error.message : "Failed to export data",
        variant: "destructive",
      });
    },
  });

  // Import mutation
  const importMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      if (!selectedFile) {
        throw new Error("Please select a file to import");
      }
      
      const fileContent = await selectedFile.text();
      
      const response = await fetch(
        `/api/debug/crm/import?format=${importFormat}`,
        {
          method: "POST",
          body: fileContent,
          headers: {
            'Content-Type': importFormat === 'csv' ? 'text/csv' : 'application/json'
          }
        }
      );
      
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Import Successful",
        description: `Successfully imported ${data.importedCount} leads.`,
      });
      
      // Reset file selection
      setSelectedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      
      // Invalidate queries to refresh the data
      queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
    },
    onError: (error) => {
      toast({
        title: "Import Failed",
        description: error instanceof Error ? error.message : "Failed to import data",
        variant: "destructive",
      });
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleImport = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      toast({
        title: "No File Selected",
        description: "Please select a file to import.",
        variant: "destructive",
      });
      return;
    }
    
    const formData = new FormData();
    formData.append('file', selectedFile);
    importMutation.mutate(formData);
  };

  return (
    <div className="container py-6">
      <h1 className="text-3xl font-bold mb-6">CRM Integration</h1>
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="export">Export Leads</TabsTrigger>
          <TabsTrigger value="import">Import Leads</TabsTrigger>
        </TabsList>
        
        {/* Export Tab */}
        <TabsContent value="export" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Export Leads</CardTitle>
              <CardDescription>
                Export your leads data to use in other applications.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form 
                className="space-y-6"
                onSubmit={(e) => {
                  e.preventDefault();
                  exportMutation.mutate();
                }}
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <Label htmlFor="format">Export Format</Label>
                    <Select 
                      value={exportFormat} 
                      onValueChange={setExportFormat}
                    >
                      <SelectTrigger id="format">
                        <SelectValue placeholder="Select format" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="csv">CSV (Spreadsheet)</SelectItem>
                        <SelectItem value="json">JSON (Data)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-3">
                    <Label htmlFor="agent">Filter by Agent</Label>
                    <Select 
                      value={selectedAgent} 
                      onValueChange={setSelectedAgent}
                    >
                      <SelectTrigger id="agent">
                        <SelectValue placeholder="Select agent" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Agents</SelectItem>
                        {agents?.map((agent: any) => (
                          <SelectItem key={agent.id} value={agent.id.toString()}>
                            {agent.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 gap-6">
                  <div className="space-y-3">
                    <Label htmlFor="status">Filter by Status</Label>
                    <Select 
                      value={selectedStatus} 
                      onValueChange={setSelectedStatus}
                    >
                      <SelectTrigger id="status">
                        <SelectValue placeholder="Select status" />
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
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <Label htmlFor="startDate">Start Date</Label>
                    <Input
                      id="startDate"
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                    />
                  </div>
                  <div className="space-y-3">
                    <Label htmlFor="endDate">End Date</Label>
                    <Input
                      id="endDate"
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                    />
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="includeNotes" 
                    checked={includeNotes}
                    onCheckedChange={(checked) => 
                      setIncludeNotes(checked === true)
                    }
                  />
                  <Label 
                    htmlFor="includeNotes"
                    className="cursor-pointer"
                  >
                    Include lead notes and email content
                  </Label>
                </div>
                
                <Button 
                  type="submit" 
                  className="w-full md:w-auto"
                  disabled={exportMutation.isPending}
                >
                  {exportMutation.isPending ? (
                    "Exporting..."
                  ) : (
                    <>
                      <Download className="mr-2 h-4 w-4" />
                      Export Leads
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Import Tab */}
        <TabsContent value="import" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Import Leads</CardTitle>
              <CardDescription>
                Import leads data from external sources.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Alert className="mb-6">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Important</AlertTitle>
                <AlertDescription>
                  The imported file must match the exact format of exported leads data.
                  For CSV imports, ensure the column names match those in exported files.
                </AlertDescription>
              </Alert>
              
              <form className="space-y-6" onSubmit={handleImport}>
                <div className="space-y-3">
                  <Label htmlFor="importFormat">File Format</Label>
                  <Select 
                    value={importFormat} 
                    onValueChange={setImportFormat}
                  >
                    <SelectTrigger id="importFormat">
                      <SelectValue placeholder="Select format" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="csv">CSV (Spreadsheet)</SelectItem>
                      <SelectItem value="json">JSON (Data)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-3">
                  <Label htmlFor="file">Upload File</Label>
                  <Input
                    ref={fileInputRef}
                    id="file"
                    type="file"
                    accept={importFormat === "csv" ? ".csv" : ".json"}
                    onChange={handleFileChange}
                  />
                </div>
                
                {selectedFile && (
                  <div className="text-sm">
                    Selected file: <span className="font-medium">{selectedFile.name}</span> ({(selectedFile.size / 1024).toFixed(2)} KB)
                  </div>
                )}
                
                <Button 
                  type="submit" 
                  className="w-full md:w-auto"
                  disabled={importMutation.isPending || !selectedFile}
                >
                  {importMutation.isPending ? (
                    "Importing..."
                  ) : (
                    <>
                      <Upload className="mr-2 h-4 w-4" />
                      Import Leads
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}