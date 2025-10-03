import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { DatePickerWithRange } from "@/components/ui/date-range-picker";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { DateRange } from "react-day-picker";
import { 
  FileText, 
  Filter, 
  Search, 
  Eye, 
  User, 
  Settings, 
  AlertCircle,
  CheckCircle,
  Clock,
  Download
} from "lucide-react";

interface AuditLog {
  id: string;
  actor: string;
  action: string;
  targetType?: string;
  targetId?: string;
  payloadHash: string;
  payloadPreview: string;
  timestamp: string;
}

export default function AuditLogs() {
  const { toast } = useToast();
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [actorFilter, setActorFilter] = useState("");
  const [actionFilter, setActionFilter] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [showLogDetails, setShowLogDetails] = useState(false);

  const { data: logs = [], isLoading } = useQuery<AuditLog[]>({
    queryKey: ["/api/audit-logs", { since: dateRange?.from, actor: actorFilter }],
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: "Failed to load audit logs",
        variant: "destructive",
      });
    }
  });

  const filteredLogs = logs.filter(log => {
    if (actionFilter && !log.action.toLowerCase().includes(actionFilter.toLowerCase())) {
      return false;
    }
    if (searchQuery && !log.payloadPreview.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    return true;
  });

  const handleViewDetails = (log: AuditLog) => {
    setSelectedLog(log);
    setShowLogDetails(true);
  };

  const handleExport = () => {
    // In production, this would generate and download a CSV/JSON file
    console.log("Exporting audit logs...");
    toast({
      title: "Export Started",
      description: "Audit logs are being prepared for download",
    });
  };

  const getActionIcon = (action: string) => {
    if (action.includes("login") || action.includes("auth")) {
      return <User className="w-4 h-4" />;
    }
    if (action.includes("error") || action.includes("failed")) {
      return <AlertCircle className="w-4 h-4 text-red-500" />;
    }
    if (action.includes("success") || action.includes("completed")) {
      return <CheckCircle className="w-4 h-4 text-green-500" />;
    }
    if (action.includes("system") || action.includes("job")) {
      return <Settings className="w-4 h-4" />;
    }
    return <Clock className="w-4 h-4" />;
  };

  const getActionBadge = (action: string) => {
    if (action.includes("error") || action.includes("failed")) {
      return <Badge variant="outline" className="text-red-500 border-red-500">Error</Badge>;
    }
    if (action.includes("success") || action.includes("completed")) {
      return <Badge variant="outline" className="text-green-500 border-green-500">Success</Badge>;
    }
    if (action.includes("warning") || action.includes("alert")) {
      return <Badge variant="outline" className="text-amber-500 border-amber-500">Warning</Badge>;
    }
    return <Badge variant="outline">Info</Badge>;
  };

  const formatActor = (actor: string) => {
    if (actor === "system") {
      return "System";
    }
    return `User: ${actor}`;
  };

  const totalLogs = logs.length;
  const systemLogs = logs.filter(log => log.actor === "system").length;
  const userLogs = logs.filter(log => log.actor !== "system").length;
  const errorLogs = logs.filter(log => 
    log.action.includes("error") || log.action.includes("failed")
  ).length;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Audit Logs</h1>
          <p className="text-sm text-muted-foreground">System activity and security audit trail</p>
        </div>
        <Button 
          variant="outline" 
          onClick={handleExport}
          data-testid="button-export-logs"
        >
          <Download className="w-4 h-4 mr-2" />
          Export Logs
        </Button>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Logs</p>
                <p className="text-2xl font-bold">{totalLogs}</p>
              </div>
              <FileText className="w-8 h-8 text-primary" />
            </div>
            <p className="text-xs text-muted-foreground mt-2">Last 24 hours</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">System Events</p>
                <p className="text-2xl font-bold">{systemLogs}</p>
              </div>
              <Settings className="w-8 h-8 text-blue-500" />
            </div>
            <p className="text-xs text-muted-foreground mt-2">Automated actions</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">User Actions</p>
                <p className="text-2xl font-bold">{userLogs}</p>
              </div>
              <User className="w-8 h-8 text-green-500" />
            </div>
            <p className="text-xs text-muted-foreground mt-2">Manual operations</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Errors</p>
                <p className="text-2xl font-bold text-red-500">{errorLogs}</p>
              </div>
              <AlertCircle className="w-8 h-8 text-red-500" />
            </div>
            <p className="text-xs text-muted-foreground mt-2">Failed operations</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Filters */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="w-4 h-4" />
              Filters
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="date-range">Date Range</Label>
              <DatePickerWithRange
                date={dateRange}
                onDateChange={setDateRange}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="actor-filter">Actor</Label>
              <Select value={actorFilter} onValueChange={setActorFilter}>
                <SelectTrigger id="actor-filter" data-testid="select-actor-filter">
                  <SelectValue placeholder="All actors" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All actors</SelectItem>
                  <SelectItem value="system">System</SelectItem>
                  <SelectItem value="user">Users only</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="action-filter">Action Type</Label>
              <Select value={actionFilter} onValueChange={setActionFilter}>
                <SelectTrigger id="action-filter" data-testid="select-action-filter">
                  <SelectValue placeholder="All actions" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All actions</SelectItem>
                  <SelectItem value="login">Authentication</SelectItem>
                  <SelectItem value="bet">Betting</SelectItem>
                  <SelectItem value="arbitrage">Arbitrage</SelectItem>
                  <SelectItem value="hedge">Hedging</SelectItem>
                  <SelectItem value="job">Job execution</SelectItem>
                  <SelectItem value="feature_flag">Feature flags</SelectItem>
                  <SelectItem value="error">Errors</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="search">Search</Label>
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="Search logs..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8"
                  data-testid="input-search-logs"
                />
              </div>
            </div>

            <Button 
              variant="outline" 
              className="w-full"
              onClick={() => {
                setDateRange(undefined);
                setActorFilter("");
                setActionFilter("");
                setSearchQuery("");
              }}
              data-testid="button-clear-filters"
            >
              Clear Filters
            </Button>
          </CardContent>
        </Card>

        {/* Logs List */}
        <div className="lg:col-span-3 space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Audit Trail</CardTitle>
                <Badge variant="secondary">
                  {filteredLogs.length} entries
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3, 4, 5].map(i => (
                    <div key={i} className="animate-pulse">
                      <div className="h-16 bg-muted rounded-lg"></div>
                    </div>
                  ))}
                </div>
              ) : filteredLogs.length > 0 ? (
                <div className="space-y-4">
                  {filteredLogs.map((log) => (
                    <div key={log.id} className="border border-border rounded-lg p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3">
                          {getActionIcon(log.action)}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="font-medium text-sm">{log.action.replace(/_/g, ' ')}</h3>
                              {getActionBadge(log.action)}
                            </div>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                              <span>{formatActor(log.actor)}</span>
                              <span>•</span>
                              <span>{new Date(log.timestamp).toLocaleString()}</span>
                              {log.targetType && log.targetId && (
                                <>
                                  <span>•</span>
                                  <span>{log.targetType}:{log.targetId.slice(0, 8)}</span>
                                </>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground truncate">
                              {log.payloadPreview}
                            </p>
                          </div>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleViewDetails(log)}
                          data-testid={`button-view-log-${log.id}`}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">No Audit Logs Found</h3>
                  <p className="text-muted-foreground mb-4">
                    No logs match your current filters.
                  </p>
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      setDateRange(undefined);
                      setActorFilter("");
                      setActionFilter("");
                      setSearchQuery("");
                    }}
                    data-testid="button-clear-filters-empty"
                  >
                    Clear Filters
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Log Details Dialog */}
      <Dialog open={showLogDetails} onOpenChange={setShowLogDetails}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>Audit Log Details</DialogTitle>
          </DialogHeader>
          {selectedLog && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Action</p>
                  <p className="font-medium">{selectedLog.action.replace(/_/g, ' ')}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Actor</p>
                  <p className="font-medium">{formatActor(selectedLog.actor)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Timestamp</p>
                  <p className="font-medium">{new Date(selectedLog.timestamp).toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Log ID</p>
                  <p className="font-mono text-sm">{selectedLog.id}</p>
                </div>
              </div>

              {selectedLog.targetType && selectedLog.targetId && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Target Type</p>
                    <p className="font-medium">{selectedLog.targetType}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Target ID</p>
                    <p className="font-mono text-sm">{selectedLog.targetId}</p>
                  </div>
                </div>
              )}

              <div>
                <p className="text-sm text-muted-foreground mb-2">Payload Preview</p>
                <div className="bg-muted rounded-lg p-3">
                  <pre className="text-sm overflow-auto whitespace-pre-wrap">
                    {selectedLog.payloadPreview}
                  </pre>
                </div>
              </div>

              <div>
                <p className="text-sm text-muted-foreground mb-2">Payload Hash</p>
                <p className="font-mono text-sm bg-muted rounded p-2 break-all">
                  {selectedLog.payloadHash}
                </p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
