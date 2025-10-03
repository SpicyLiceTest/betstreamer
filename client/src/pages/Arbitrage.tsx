import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import ArbitrageCard from "@/components/ArbitrageCard";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Search, Filter, TrendingUp, DollarSign, Target, Clock, AlertTriangle, Crown, CreditCard } from "lucide-react";
import type { ArbitrageOpportunityDisplay } from "@/types";

interface ScanRequest {
  states: string[];
  sports?: string[];
  regions?: string[];
  markets?: string[];
  minProfitPct?: number;
}

interface MaxProfitPick {
  eventId: string;
  marketId: string;
  legs: Array<{
    outcome: string;
    sportsbook: string;
    odds: string;
    stake: number;
  }>;
  expectedProfitPct: number;
  recommendedStakes: { [outcome: string]: number };
  confidenceScore: number;
}

interface ArbitrageScanResult {
  success: boolean;
  maxProfitPick?: MaxProfitPick;
  allOpportunities: ArbitrageOpportunityDisplay[];
  creditUsage: {
    requestsUsed: number;
    creditsConsumed: number;
  };
  cacheExpiresAt: string;
}

export default function Arbitrage() {
  const { toast } = useToast();
  const [scanResults, setScanResults] = useState<ArbitrageScanResult | null>(null);
  const [lastScanTime, setLastScanTime] = useState<Date | null>(null);
  
  const [filters, setFilters] = useState<ScanRequest>({
    states: [],
    sports: ['all'],
    regions: ['us', 'us2'],
    markets: ['h2h', 'spreads', 'totals'],
    minProfitPct: 1.0
  });

  // Get available states and their supported sportsbooks
  const { data: stateMap } = useQuery<{
    success: boolean;
    stateMap: Record<string, string[]>;
    totalStates: number;
    availableSportsbooks: string[];
  }>({
    queryKey: ['/api/state-map'],
  });
  
  // Execute arbitrage scan mutation
  const scanMutation = useMutation({
    mutationFn: async (request: ScanRequest) => {
      const response = await apiRequest('POST', '/api/scan/arbs', { ...request, confirmed: true });
      return await response.json();
    },
    onSuccess: (data: ArbitrageScanResult) => {
      setScanResults(data);
      setLastScanTime(new Date());
      toast({
        title: "Scan Complete",
        description: `Found ${data.allOpportunities?.length || 0} opportunities. Credits used: ${data.creditUsage?.creditsConsumed || 0}`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Scan Failed", 
        description: error.message || "Failed to execute arbitrage scan",
        variant: "destructive",
      });
    }
  });

  const handleStartScan = () => {
    if (!filters.states.length) {
      toast({
        title: "State Required",
        description: "Please select at least one state to search sportsbooks",
        variant: "destructive",
      });
      return;
    }
    scanMutation.mutate(filters);
  };
  
  const availableStates = stateMap?.stateMap ? Object.keys(stateMap.stateMap) : [];
  
  // Calculate stats based on current results
  const opportunities = scanResults?.allOpportunities || [];
  const maxProfitPick = scanResults?.maxProfitPick;
  const totalOpportunities = opportunities.length;
  const maxProfit = maxProfitPick?.expectedProfitPct || 0;
  const creditsUsed = scanResults?.creditUsage?.creditsConsumed || 0;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Arbitrage Scanner</h1>
          <p className="text-sm text-muted-foreground">
            Search all available sportsbooks in your selected states for arbitrage opportunities
          </p>
        </div>
        <div className="flex items-center gap-2">
          {lastScanTime && (
            <span className="text-sm text-muted-foreground">
              Last scan: {lastScanTime.toLocaleTimeString()}
            </span>
          )}
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Opportunities</p>
                <p className="text-2xl font-bold">{totalOpportunities}</p>
              </div>
              <TrendingUp className="w-8 h-8 text-primary" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Max Profit %</p>
                <p className="text-2xl font-bold text-green-500">{maxProfit.toFixed(2)}%</p>
              </div>
              <Crown className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Credits Used</p>
                <p className="text-2xl font-bold">{creditsUsed}</p>
              </div>
              <CreditCard className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Cache Expires</p>
                <p className="text-2xl font-bold">
                  {scanResults?.cacheExpiresAt 
                    ? `${Math.max(0, Math.ceil((new Date(scanResults.cacheExpiresAt).getTime() - Date.now()) / 60000))}m`
                    : "0m"
                  }
                </p>
              </div>
              <Clock className="w-8 h-8 text-amber-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Scan Configuration */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="w-4 h-4" />
              Scan Settings
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <div className="space-y-3">
                <Label className="text-sm font-medium flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-500" />
                  States (Required)
                </Label>
                {availableStates.length > 0 ? availableStates.map(state => (
                  <div key={state} className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id={`state-${state}`}
                      checked={filters.states.includes(state)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setFilters(prev => ({ ...prev, states: [...prev.states, state] }));
                        } else {
                          setFilters(prev => ({ ...prev, states: prev.states.filter(s => s !== state) }));
                        }
                      }}
                      data-testid={`checkbox-state-${state}`}
                    />
                    <Label htmlFor={`state-${state}`} className="text-sm">{state}</Label>
                  </div>
                )) : (
                  <div className="text-sm text-muted-foreground">Loading states...</div>
                )}
                {filters.states.length > 0 && stateMap?.stateMap && (
                  <p className="text-xs text-green-600 dark:text-green-400">
                    ✓ {Array.from(new Set(filters.states.flatMap(state => stateMap.stateMap[state] || []))).length} sportsbooks available
                  </p>
                )}
              </div>
              
              <Separator />
              
              <div className="space-y-2">
                <Label htmlFor="sports-select">Sports</Label>
                <Select 
                  value={filters.sports?.[0] || 'all'} 
                  onValueChange={(value) => setFilters(prev => ({ ...prev, sports: [value] }))}
                >
                  <SelectTrigger id="sports-select" data-testid="select-sports">
                    <SelectValue placeholder="All Sports" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Sports</SelectItem>
                    <SelectItem value="americanfootball_nfl">NFL</SelectItem>
                    <SelectItem value="basketball_nba">NBA</SelectItem>
                    <SelectItem value="baseball_mlb">MLB</SelectItem>
                    <SelectItem value="icehockey_nhl">NHL</SelectItem>
                    <SelectItem value="soccer_epl">Soccer (EPL)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="min-profit">Min Profit %</Label>
                <Input 
                  id="min-profit"
                  type="number"
                  step="0.1"
                  min="0.1"
                  placeholder="1.0"
                  value={filters.minProfitPct}
                  onChange={(e) => setFilters(prev => ({ ...prev, minProfitPct: parseFloat(e.target.value) || 1.0 }))}
                  data-testid="input-min-profit"
                />
              </div>
              
              <div className="space-y-2">
                <Label>Markets</Label>
                <div className="space-y-2">
                  {['h2h', 'spreads', 'totals'].map(market => (
                    <div key={market} className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id={`market-${market}`}
                        checked={filters.markets?.includes(market)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setFilters(prev => ({ ...prev, markets: [...(prev.markets || []), market] }));
                          } else {
                            setFilters(prev => ({ ...prev, markets: (prev.markets || []).filter(m => m !== market) }));
                          }
                        }}
                        data-testid={`checkbox-market-${market}`}
                      />
                      <Label htmlFor={`market-${market}`} className="text-sm capitalize">
                        {market === 'h2h' ? 'Moneyline' : market === 'spreads' ? 'Point Spreads' : 'Totals (O/U)'}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            
            <Separator />
            
            <Button 
              className="w-full"
              onClick={handleStartScan}
              disabled={scanMutation.isPending || filters.states.length === 0}
              data-testid="button-start-scan"
            >
              {scanMutation.isPending ? (
                <><Search className="w-4 h-4 mr-2 animate-spin" /> Scanning...</>
              ) : (
                <><Search className="w-4 h-4 mr-2" /> Search All Sportsbooks</>
              )}
            </Button>
            
            {filters.states.length === 0 && (
              <Alert className="border-red-500/20 bg-red-50 dark:bg-red-950/20">
                <AlertTriangle className="h-4 w-4 text-red-500" />
                <AlertTitle className="text-red-700 dark:text-red-400">State Required</AlertTitle>
                <AlertDescription className="text-red-600 dark:text-red-300">
                  Select at least one state to search available sportsbooks
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* Results */}
        <div className="lg:col-span-3 space-y-6">
          {maxProfitPick && (
            <Card className="border-2 border-green-500/20 bg-green-50/50 dark:bg-green-950/20">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-green-700 dark:text-green-400">
                    <Crown className="w-5 h-5" />
                    Maximum Profit Opportunity
                  </CardTitle>
                  <Badge className="bg-green-600 text-white">
                    {maxProfitPick.expectedProfitPct.toFixed(2)}% Profit
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <h4 className="font-medium">Betting Legs</h4>
                    {maxProfitPick.legs.map((leg, idx) => (
                      <div key={idx} className="flex items-center justify-between p-3 bg-white dark:bg-gray-900 rounded-lg border">
                        <div>
                          <p className="font-medium">{leg.outcome}</p>
                          <p className="text-sm text-muted-foreground">{leg.sportsbook}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-medium text-green-600">{leg.odds}</p>
                          <p className="text-sm text-muted-foreground">${leg.stake}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  <div className="space-y-3">
                    <h4 className="font-medium">Performance Metrics</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-center p-3 bg-white dark:bg-gray-900 rounded-lg border">
                        <p className="text-sm text-muted-foreground">Expected Profit</p>
                        <p className="text-lg font-bold text-green-600">{maxProfitPick.expectedProfitPct.toFixed(2)}%</p>
                      </div>
                      <div className="text-center p-3 bg-white dark:bg-gray-900 rounded-lg border">
                        <p className="text-sm text-muted-foreground">Confidence</p>
                        <p className="text-lg font-bold text-blue-600">{(maxProfitPick.confidenceScore * 100).toFixed(0)}%</p>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>All Opportunities</CardTitle>
                <Badge variant="secondary">{opportunities.length} Found</Badge>
              </div>
            </CardHeader>
            <CardContent>
              {scanMutation.isPending ? (
                <div className="space-y-4">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="animate-pulse">
                      <div className="h-24 bg-muted rounded-lg"></div>
                    </div>
                  ))}
                </div>
              ) : opportunities.length > 0 ? (
                <div className="space-y-4">
                  {[...opportunities]
                    .sort((a, b) => (b.profitPct || 0) - (a.profitPct || 0)) // Sort by profit descending
                    .map((opportunity, idx) => {
                      const isFeatured = maxProfitPick && opportunity.id === maxProfitPick.eventId;
                      return (
                        <div key={opportunity.id} className={isFeatured ? 'opacity-50 relative' : ''}>
                          {isFeatured && (
                            <div className="absolute inset-0 bg-green-500/10 rounded-lg border border-green-500/20 flex items-center justify-center">
                              <Badge className="bg-green-600 text-white">Featured Above</Badge>
                            </div>
                          )}
                          <ArbitrageCard opportunity={opportunity} />
                        </div>
                      );
                    })}
                </div>
              ) : scanResults ? (
                <div className="text-center py-12">
                  <TrendingUp className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">No Opportunities Found</h3>
                  <p className="text-muted-foreground mb-4">
                    No arbitrage opportunities found with your current settings. Try adjusting your filters.
                  </p>
                </div>
              ) : (
                <div className="text-center py-12">
                  <Search className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">Ready to Scan</h3>
                  <p className="text-muted-foreground mb-4">
                    Configure your settings and click "Search All Sportsbooks" to find arbitrage opportunities.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}