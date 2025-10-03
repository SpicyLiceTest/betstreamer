import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import StatsCard from "@/components/StatsCard";
import ArbitrageCard from "@/components/ArbitrageCard";
import HedgeAlert from "@/components/HedgeAlert";
import JobStatus from "@/components/JobStatus";
import { useToast } from "@/hooks/use-toast";
import { 
  TrendingUp, 
  Shield, 
  BarChart3, 
  DollarSign,
  RefreshCw,
  Filter,
  Bell
} from "lucide-react";
import type { DashboardStats, ArbitrageOpportunityDisplay, HedgeAlertDisplay, JobStatusDisplay, StateAccessDisplay, ExpenseSummary } from "@/types";

export default function Dashboard() {
  const { toast } = useToast();

  const { data: stats, isLoading: statsLoading } = useQuery<DashboardStats>({
    queryKey: ["/api/dashboard/stats"],
  });

  const { data: arbitrageOpportunities = [], isLoading: arbLoading } = useQuery<ArbitrageOpportunityDisplay[]>({
    queryKey: ["/api/arbs"],
    select: (data: any[]) => data.slice(0, 3).map(opp => ({
      id: opp.id,
      event: {
        homeTeam: "Lakers", // Mock data structure
        awayTeam: "Warriors",
        league: "NBA",
        startTime: "7:30 PM EST"
      },
      market: {
        type: "ML",
        description: "Moneyline"
      },
      legs: [
        { outcome: "Lakers (+110)", sportsbook: "DraftKings", odds: "+110", stake: 1247 },
        { outcome: "Warriors (-115)", sportsbook: "FanDuel", odds: "-115", stake: 1158 }
      ],
      profitPct: parseFloat(opp.expectedProfitPct) || 3.2,
      validityWindow: 272, // seconds
      confidenceScore: parseFloat(opp.confidenceScore) || 0.85
    }))
  });

  const { data: jobs = [], isLoading: jobsLoading } = useQuery<JobStatusDisplay[]>({
    queryKey: ["/api/jobs"],
    select: (data: any[]) => data.slice(0, 3).map(job => ({
      name: job.jobName,
      status: job.status,
      lastRun: job.finishedAt ? new Date(job.finishedAt).toLocaleString() : "Running...",
      displayName: job.jobName.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())
    }))
  });

  const handleRefresh = async () => {
    try {
      await fetch('/api/arbs/recalc', { method: 'POST', credentials: 'include' });
      toast({
        title: "Success",
        description: "Arbitrage recalculation triggered",
      });
    } catch (error) {
      toast({
        title: "Error", 
        description: "Failed to trigger recalculation",
        variant: "destructive",
      });
    }
  };

  const mockHedgeAlerts: HedgeAlertDisplay[] = [
    {
      id: "1",
      betDescription: "Bulls +4.5 vs Knicks",
      suggestion: "Hedge: Knicks -4.5 at +102 • Stake: $445",
      type: "warning"
    },
    {
      id: "2", 
      betDescription: "Arsenal Win vs Chelsea",
      suggestion: "Lock Profit: $67 guaranteed • Stake: $234",
      type: "success",
      action: "Execute"
    }
  ];

  const mockStateAccess: StateAccessDisplay[] = [
    { state: "NJ", status: "active" },
    { state: "PA", status: "active" },
    { state: "NY", status: "active" },
    { state: "AZ", status: "maintenance" },
    { state: "CA", status: "unavailable" },
    { state: "CO", status: "active" }
  ];

  const mockExpenseSummary: ExpenseSummary = {
    realizedPnl: 347,
    unrealizedPnl: 89,
    apiCosts: -23,
    computeCosts: -12
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-sm text-muted-foreground">Live arbitrage opportunities and system status</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-sm text-muted-foreground">Live Data</span>
          </div>
          <Button variant="outline" size="sm" className="relative" data-testid="button-notifications">
            <Bell className="w-4 h-4" />
            <Badge variant="destructive" className="absolute -top-1 -right-1 w-5 h-5 text-xs p-0 flex items-center justify-center">
              3
            </Badge>
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatsCard
          title="Active Opportunities"
          value={stats?.activeOpportunities.toString() || "0"}
          change="+2 from last hour"
          icon={TrendingUp}
          variant="primary"
          isLoading={statsLoading}
        />
        <StatsCard
          title="Avg Profit %"
          value={`${stats?.avgProfit || "0"}%`}
          change="+0.3% improvement"
          icon={BarChart3}
          variant="success"
          isLoading={statsLoading}
        />
        <StatsCard
          title="Tracked Bets"
          value={stats?.trackedBets.toString() || "0"}
          change="2 hedge alerts"
          icon={Shield}
          variant="info"
          isLoading={statsLoading}
        />
        <StatsCard
          title="Daily PnL"
          value={`$${stats?.dailyPnl || 0}`}
          change="ROI: 1.8%"
          icon={DollarSign}
          variant={stats && stats.dailyPnl > 0 ? "success" : "destructive"}
          isLoading={statsLoading}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Arbitrage Opportunities */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Live Arbitrage Opportunities</CardTitle>
              <div className="flex items-center gap-2">
                <Button 
                  size="sm" 
                  onClick={handleRefresh}
                  data-testid="button-refresh-arbitrage"
                >
                  <RefreshCw className="w-4 h-4 mr-1" />
                  Refresh
                </Button>
                <Button variant="outline" size="sm" data-testid="button-filters">
                  <Filter className="w-4 h-4 mr-1" />
                  Filters
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {arbLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map(i => (
                  <div key={i} className="animate-pulse">
                    <div className="h-20 bg-muted rounded-lg"></div>
                  </div>
                ))}
              </div>
            ) : arbitrageOpportunities.length > 0 ? (
              arbitrageOpportunities.map(opportunity => (
                <ArbitrageCard key={opportunity.id} opportunity={opportunity} />
              ))
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No arbitrage opportunities found
              </div>
            )}
          </CardContent>
        </Card>

        {/* System Status Column */}
        <div className="space-y-6">
          {/* Hedge Alerts */}
          <Card>
            <CardHeader>
              <CardTitle>Hedge Alerts</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {mockHedgeAlerts.map(alert => (
                <HedgeAlert key={alert.id} alert={alert} />
              ))}
            </CardContent>
          </Card>

          {/* Job Status */}
          <Card>
            <CardHeader>
              <CardTitle>System Jobs</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {jobsLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="animate-pulse">
                      <div className="h-12 bg-muted rounded"></div>
                    </div>
                  ))}
                </div>
              ) : jobs.length > 0 ? (
                jobs.map(job => (
                  <JobStatus key={job.name} job={job} />
                ))
              ) : (
                <div className="text-center py-4 text-muted-foreground">
                  No recent job runs
                </div>
              )}
            </CardContent>
          </Card>

          {/* State Access */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>State Access</CardTitle>
                <Button variant="ghost" size="sm" data-testid="button-manage-states">
                  Manage
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-2 text-xs">
                {mockStateAccess.map(state => (
                  <div key={state.state} className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${
                      state.status === 'active' ? 'bg-green-500' :
                      state.status === 'maintenance' ? 'bg-amber-500' :
                      'bg-red-500'
                    }`}></div>
                    <span>{state.state}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Expense Summary */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Daily Expense & PnL Summary</CardTitle>
            <Button variant="outline" size="sm" data-testid="button-view-details">
              View Details
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="text-center">
              <p className={`text-2xl font-bold ${mockExpenseSummary.realizedPnl > 0 ? 'text-green-500' : 'text-red-500'}`}>
                {mockExpenseSummary.realizedPnl > 0 ? '+' : ''}${mockExpenseSummary.realizedPnl}
              </p>
              <p className="text-sm text-muted-foreground">Realized PnL</p>
            </div>
            <div className="text-center">
              <p className={`text-2xl font-bold ${mockExpenseSummary.unrealizedPnl > 0 ? 'text-green-500' : 'text-red-500'}`}>
                {mockExpenseSummary.unrealizedPnl > 0 ? '+' : ''}${mockExpenseSummary.unrealizedPnl}
              </p>
              <p className="text-sm text-muted-foreground">Unrealized PnL</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-red-500">
                ${mockExpenseSummary.apiCosts}
              </p>
              <p className="text-sm text-muted-foreground">API Costs</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-red-500">
                ${mockExpenseSummary.computeCosts}
              </p>
              <p className="text-sm text-muted-foreground">Compute Costs</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
