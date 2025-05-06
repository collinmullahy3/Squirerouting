import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ResponsiveTable } from "@/components/responsive-table";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Info } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { queryClient } from "@/lib/queryClient";

interface ParsingPattern {
  id: number;
  source: string;
  pattern: string;
  patternType: string;
  successCount: number;
  createdAt: string;
  updatedAt: string;
}

export default function ParsingPatternsPage() {
  const { toast } = useToast();
  const [selectedPattern, setSelectedPattern] = useState<ParsingPattern | null>(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);

  const {
    data: patterns = [],
    isLoading,
    isError,
    refetch,
  } = useQuery<ParsingPattern[]>({
    queryKey: ["/api/parsing-patterns"],
    queryFn: async () => {
      const response = await fetch("/api/parsing-patterns");
      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${await response.text()}`);
      }
      const data = await response.json();
      return data.patterns || [];
    },
  });

  const handleViewPattern = (pattern: ParsingPattern) => {
    setSelectedPattern(pattern);
    setViewDialogOpen(true);
  };

  const formatPattern = (pattern: string) => {
    try {
      return JSON.stringify(JSON.parse(pattern), null, 2);
    } catch (e) {
      return pattern;
    }
  };

  const columns = [
    {
      header: "Source",
      accessorKey: "source",
      className: "font-medium",
    },
    {
      header: "Pattern Type",
      accessorKey: "patternType",
      cell: (item: ParsingPattern) => (
        <Badge variant={item.patternType === "ai" ? "outline" : "secondary"}>
          {item.patternType === "ai" ? "AI Generated" : "Regex"}
        </Badge>
      ),
    },
    {
      header: "Success Count",
      accessorKey: "successCount",
      cell: (item: ParsingPattern) => (
        <Badge variant="outline" className="bg-green-50 dark:bg-green-900/20">
          {item.successCount}
        </Badge>
      ),
    },
    {
      header: "Created",
      accessorKey: "createdAt",
      cell: (item: ParsingPattern) => (
        <span>{new Date(item.createdAt).toLocaleDateString()}</span>
      ),
      hideOnMobile: true,
    },
    {
      header: "Last Used",
      accessorKey: "updatedAt",
      cell: (item: ParsingPattern) => (
        <span>{new Date(item.updatedAt).toLocaleDateString()}</span>
      ),
      hideOnMobile: true,
    },
    {
      header: "Actions",
      accessorKey: "actions",
      cell: (item: ParsingPattern) => (
        <Button
          variant="outline"
          size="sm"
          onClick={() => handleViewPattern(item)}
        >
          View Pattern
        </Button>
      ),
    },
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <p className="text-destructive">Failed to load parsing patterns</p>
        <Button onClick={() => refetch()}>Retry</Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Parsing Patterns</h1>
          <p className="text-muted-foreground mt-1">
            Manage AI learning patterns for lead parsing by source
          </p>
        </div>
        <Button onClick={() => refetch()}>Refresh</Button>
      </div>

      <Separator className="my-6" />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span>AI Learning Patterns</span>
            <Badge variant="outline" className="ml-2">
              {patterns.length} Patterns
            </Badge>
          </CardTitle>
          <CardDescription>
            Patterns learned from successfully parsed emails by source
          </CardDescription>
        </CardHeader>
        <CardContent>
          {patterns.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 gap-4">
              <Info className="w-12 h-12 text-muted-foreground" />
              <p className="text-muted-foreground text-center max-w-md">
                No parsing patterns have been learned yet. The system will automatically learn
                patterns as emails are processed.
              </p>
            </div>
          ) : (
            <ResponsiveTable
              data={patterns}
              columns={columns}
              keyField="id"
              emptyMessage="No patterns found"
            />
          )}
        </CardContent>
      </Card>

      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedPattern?.source} Pattern
              <Badge variant="outline" className="ml-2">
                {selectedPattern?.patternType === "ai" ? "AI Generated" : "Regex"}
              </Badge>
            </DialogTitle>
            <DialogDescription>
              This pattern has been used successfully {selectedPattern?.successCount} times
            </DialogDescription>
          </DialogHeader>
          <Separator />
          <div className="mt-4">
            <pre className="bg-muted p-4 rounded-md overflow-x-auto">
              {selectedPattern ? formatPattern(selectedPattern.pattern) : ""}
            </pre>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
