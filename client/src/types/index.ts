export interface DashboardStats {
  activeOpportunities: number;
  avgProfit: string;
  trackedBets: number;
  dailyPnl: number;
  hedgeAlerts: number;
}

export interface ArbitrageOpportunityDisplay {
  id: string;
  event: {
    homeTeam: string;
    awayTeam: string;
    league: string;
    startTime: string;
  };
  market: {
    type: string;
    description: string;
  };
  legs: Array<{
    outcome: string;
    sportsbook: string;
    odds: string;
    stake: number;
  }>;
  profitPct: number;
  validityWindow: number;
  confidenceScore: number;
}

export interface HedgeAlertDisplay {
  id: string;
  betDescription: string;
  suggestion: string;
  type: 'warning' | 'success' | 'info';
  action?: string;
}

export interface JobStatusDisplay {
  name: string;
  status: 'running' | 'success' | 'failed';
  lastRun: string;
  displayName: string;
}

export interface StateAccessDisplay {
  state: string;
  status: 'active' | 'maintenance' | 'unavailable';
}

export interface ExpenseSummary {
  realizedPnl: number;
  unrealizedPnl: number;
  apiCosts: number;
  computeCosts: number;
}
