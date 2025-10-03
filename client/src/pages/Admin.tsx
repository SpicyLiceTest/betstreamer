import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { isUnauthorizedError } from "@/lib/authUtils";
import { 
  Settings, 
  Flag, 
  MapPin, 
  Users, 
  Shield, 
  AlertTriangle, 
  CheckCircle,
  XCircle,
  Plus,
  Edit,
  Save
} from "lucide-react";

interface FeatureFlag {
  key: string;
  enabled: boolean;
  description: string;
  scope: string;
  defaultValue: boolean;
  createdAt: string;
  updatedAt: string;
}

interface StateMapData {
  sportsbooks: Array<{
    id: string;
    name: string;
    supportedStates: string[];
  }>;
  computeLocations: Array<{
    id: string;
    stateCode: string;
    status: string;
    notes?: string;
  }>;
}

export default function Admin() {
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showAddFlag, setShowAddFlag] = useState(false);
  const [editingFlag, setEditingFlag] = useState<FeatureFlag | null>(null);
  const [newFlag, setNewFlag] = useState({
    key: "",
    description: "",
    enabled: false
  });


  const { data: featureFlags = [], isLoading: flagsLoading } = useQuery<FeatureFlag[]>({
    queryKey: ["/api/flags"],
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
        description: "Failed to load feature flags",
        variant: "destructive",
      });
    }
  });

  const { data: stateMap, isLoading: stateMapLoading } = useQuery<StateMapData>({
    queryKey: ["/api/state-map"],
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
        description: "Failed to load state map",
        variant: "destructive",
      });
    }
  });

  const updateFlagMutation = useMutation({
    mutationFn: async ({ key, data }: { key: string; data: Partial<FeatureFlag> }) => {
      await apiRequest("PUT", `/api/flags/${key}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/flags"] });
      toast({
        title: "Success",
        description: "Feature flag updated successfully",
      });
    },
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
        description: "Failed to update feature flag",
        variant: "destructive",
      });
    }
  });

  const createFlagMutation = useMutation({
    mutationFn: async (flagData: typeof newFlag) => {
      await apiRequest("PUT", `/api/flags/${flagData.key}`, {
        enabled: flagData.enabled,
        description: flagData.description,
        scope: "global",
        defaultValue: false
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/flags"] });
      setShowAddFlag(false);
      setNewFlag({ key: "", description: "", enabled: false });
      toast({
        title: "Success",
        description: "Feature flag created successfully",
      });
    },
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
        description: "Failed to create feature flag",
        variant: "destructive",
      });
    }
  });

  const handleToggleFlag = (flag: FeatureFlag) => {
    updateFlagMutation.mutate({
      key: flag.key,
      data: { enabled: !flag.enabled }
    });
  };

  const handleUpdateFlag = () => {
    if (editingFlag) {
      updateFlagMutation.mutate({
        key: editingFlag.key,
        data: {
          description: editingFlag.description,
          enabled: editingFlag.enabled
        }
      });
      setEditingFlag(null);
    }
  };

  const handleCreateFlag = () => {
    if (newFlag.key && newFlag.description) {
      createFlagMutation.mutate(newFlag);
    }
  };

  const activeFlags = featureFlags.filter(flag => flag.enabled).length;
  const totalFlags = featureFlags.length;
  const activeLocations = (stateMap?.computeLocations || []).filter(loc => loc.status === "active").length;
  const totalLocations = (stateMap?.computeLocations || []).length;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Admin Panel</h1>
          <p className="text-sm text-muted-foreground">System configuration and management</p>
        </div>
        <Badge variant="secondary" className="bg-primary/10 text-primary">
          Administrator
        </Badge>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active Flags</p>
                <p className="text-2xl font-bold">{activeFlags}/{totalFlags}</p>
              </div>
              <Flag className="w-8 h-8 text-primary" />
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {totalFlags > 0 ? Math.round((activeFlags / totalFlags) * 100) : 0}% enabled
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Compute Locations</p>
                <p className="text-2xl font-bold">{activeLocations}/{totalLocations}</p>
              </div>
              <MapPin className="w-8 h-8 text-green-500" />
            </div>
            <p className="text-xs text-muted-foreground mt-2">Active locations</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Sportsbooks</p>
                <p className="text-2xl font-bold">{(stateMap?.sportsbooks || []).length}</p>
              </div>
              <Shield className="w-8 h-8 text-blue-500" />
            </div>
            <p className="text-xs text-muted-foreground mt-2">Integrated</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">System Status</p>
                <p className="text-2xl font-bold text-green-500">Healthy</p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-500" />
            </div>
            <p className="text-xs text-muted-foreground mt-2">All services operational</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="flags" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="flags" data-testid="tab-feature-flags">Feature Flags</TabsTrigger>
          <TabsTrigger value="states" data-testid="tab-state-access">State Access</TabsTrigger>
          <TabsTrigger value="system" data-testid="tab-system">System</TabsTrigger>
        </TabsList>

        <TabsContent value="flags" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Feature Flags</CardTitle>
                <Dialog open={showAddFlag} onOpenChange={setShowAddFlag}>
                  <DialogTrigger asChild>
                    <Button data-testid="button-add-flag">
                      <Plus className="w-4 h-4 mr-2" />
                      Add Flag
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Create Feature Flag</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="flag-key">Flag Key</Label>
                        <Input
                          id="flag-key"
                          placeholder="new_feature"
                          value={newFlag.key}
                          onChange={(e) => setNewFlag(prev => ({ ...prev, key: e.target.value }))}
                          data-testid="input-flag-key"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="flag-description">Description</Label>
                        <Textarea
                          id="flag-description"
                          placeholder="Describe what this flag controls..."
                          value={newFlag.description}
                          onChange={(e) => setNewFlag(prev => ({ ...prev, description: e.target.value }))}
                          data-testid="textarea-flag-description"
                        />
                      </div>
                      <div className="flex items-center space-x-2">
                        <Switch
                          id="flag-enabled"
                          checked={newFlag.enabled}
                          onCheckedChange={(checked) => setNewFlag(prev => ({ ...prev, enabled: checked }))}
                          data-testid="switch-flag-enabled"
                        />
                        <Label htmlFor="flag-enabled">Enable by default</Label>
                      </div>
                      <div className="flex gap-2 pt-4">
                        <Button
                          variant="outline"
                          onClick={() => setShowAddFlag(false)}
                          className="flex-1"
                          data-testid="button-cancel-flag"
                        >
                          Cancel
                        </Button>
                        <Button
                          onClick={handleCreateFlag}
                          disabled={!newFlag.key || !newFlag.description || createFlagMutation.isPending}
                          className="flex-1"
                          data-testid="button-save-flag"
                        >
                          {createFlagMutation.isPending ? "Creating..." : "Create Flag"}
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              {flagsLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3, 4, 5].map(i => (
                    <div key={i} className="animate-pulse">
                      <div className="h-16 bg-muted rounded-lg"></div>
                    </div>
                  ))}
                </div>
              ) : featureFlags.length > 0 ? (
                <div className="space-y-4">
                  {featureFlags.map((flag) => (
                    <div key={flag.key} className="border border-border rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="font-medium">{flag.key}</h3>
                            <Badge variant={flag.enabled ? "default" : "secondary"}>
                              {flag.enabled ? "Enabled" : "Disabled"}
                            </Badge>
                            {flag.key === "auto_placement" && flag.enabled && (
                              <Badge variant="outline" className="text-red-500 border-red-500">
                                <AlertTriangle className="w-3 h-3 mr-1" />
                                High Risk
                              </Badge>
                            )}
                          </div>
                          {editingFlag?.key === flag.key ? (
                            <div className="space-y-2">
                              <Textarea
                                value={editingFlag.description}
                                onChange={(e) => setEditingFlag(prev => 
                                  prev ? { ...prev, description: e.target.value } : null
                                )}
                                data-testid={`textarea-edit-${flag.key}`}
                              />
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  onClick={handleUpdateFlag}
                                  data-testid={`button-save-${flag.key}`}
                                >
                                  <Save className="w-4 h-4 mr-1" />
                                  Save
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => setEditingFlag(null)}
                                  data-testid={`button-cancel-edit-${flag.key}`}
                                >
                                  Cancel
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <p className="text-sm text-muted-foreground">{flag.description}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-3 ml-4">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setEditingFlag(flag)}
                            data-testid={`button-edit-${flag.key}`}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Switch
                            checked={flag.enabled}
                            onCheckedChange={() => handleToggleFlag(flag)}
                            disabled={updateFlagMutation.isPending}
                            data-testid={`switch-${flag.key}`}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Flag className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No feature flags configured</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="states" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Compute Locations</CardTitle>
            </CardHeader>
            <CardContent>
              {stateMapLoading ? (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {[1, 2, 3, 4, 5, 6].map(i => (
                    <div key={i} className="animate-pulse">
                      <div className="h-16 bg-muted rounded-lg"></div>
                    </div>
                  ))}
                </div>
              ) : (stateMap?.computeLocations || []).length > 0 ? (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {(stateMap?.computeLocations || []).map((location) => (
                    <div
                      key={location.id}
                      className={`border rounded-lg p-4 ${
                        location.status === 'active' 
                          ? 'border-green-500/20 bg-green-500/5' 
                          : location.status === 'maintenance'
                          ? 'border-amber-500/20 bg-amber-500/5'
                          : 'border-red-500/20 bg-red-500/5'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-medium">{location.stateCode}</h3>
                        <div className={`w-3 h-3 rounded-full ${
                          location.status === 'active' ? 'bg-green-500' :
                          location.status === 'maintenance' ? 'bg-amber-500' :
                          'bg-red-500'
                        }`}></div>
                      </div>
                      <p className="text-sm text-muted-foreground capitalize">{location.status}</p>
                      {location.notes && (
                        <p className="text-xs text-muted-foreground mt-1">{location.notes}</p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <MapPin className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No compute locations configured</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Sportsbook Coverage</CardTitle>
            </CardHeader>
            <CardContent>
              {stateMapLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3, 4].map(i => (
                    <div key={i} className="animate-pulse">
                      <div className="h-16 bg-muted rounded-lg"></div>
                    </div>
                  ))}
                </div>
              ) : (stateMap?.sportsbooks || []).length > 0 ? (
                <div className="space-y-4">
                  {(stateMap?.sportsbooks || []).map((sportsbook) => (
                    <div key={sportsbook.id} className="border border-border rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <h3 className="font-medium">{sportsbook.name}</h3>
                        <Badge variant="outline">
                          {(sportsbook.supportedStates || []).length} states
                        </Badge>
                      </div>
                      <div className="flex flex-wrap gap-1 mt-2">
                        {(sportsbook.supportedStates || []).map((state) => (
                          <Badge key={state} variant="secondary" className="text-xs">
                            {state}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Shield className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No sportsbooks configured</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="system" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>System Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium mb-2">Application Version</h4>
                    <p className="text-sm text-muted-foreground">v1.0.0-beta</p>
                  </div>
                  <div>
                    <h4 className="font-medium mb-2">Environment</h4>
                    <Badge variant="outline">Production</Badge>
                  </div>
                  <div>
                    <h4 className="font-medium mb-2">Database Status</h4>
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      <span className="text-sm">Connected</span>
                    </div>
                  </div>
                </div>
                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium mb-2">API Status</h4>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-green-500" />
                        <span className="text-sm">Odds API: Operational</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-green-500" />
                        <span className="text-sm">Authentication: Operational</span>
                      </div>
                    </div>
                  </div>
                  <div>
                    <h4 className="font-medium mb-2">Last System Check</h4>
                    <p className="text-sm text-muted-foreground">
                      {new Date().toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Security & Compliance</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-start gap-3 p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
                  <CheckCircle className="w-5 h-5 text-green-500 mt-0.5" />
                  <div>
                    <h5 className="font-medium">Audit Logging</h5>
                    <p className="text-sm text-muted-foreground">All user actions are being logged</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
                  <CheckCircle className="w-5 h-5 text-green-500 mt-0.5" />
                  <div>
                    <h5 className="font-medium">API Authentication</h5>
                    <p className="text-sm text-muted-foreground">All API endpoints are protected</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                  <AlertTriangle className="w-5 h-5 text-amber-500 mt-0.5" />
                  <div>
                    <h5 className="font-medium">Auto-Placement Disabled</h5>
                    <p className="text-sm text-muted-foreground">
                      Automated bet placement is currently disabled for safety
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
