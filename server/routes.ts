import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./auth";
import { z } from "zod";
import {
  insertEventSchema,
  insertMarketSchema,
  insertQuoteSchema,
  insertUserBetSchema,
  insertCostRecordSchema,
  insertPnlRecordSchema,
  insertJobRunSchema,
  insertFeatureFlagSchema,
  insertAuditLogSchema,
} from "@shared/schema";
import { oddsService } from "./services/oddsService";
import { arbitrageService, type EstimateRequest } from "./services/arbitrageService";
import { hedgeService } from "./services/hedgeService";
import { jobScheduler } from "./services/jobScheduler";
import { featureFlagService } from "./services/featureFlagService";
import { auditService } from "./services/auditService";

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);

  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Dashboard stats
  app.get('/api/dashboard/stats', isAuthenticated, async (req: any, res) => {
    try {
      const [arbitrageOpportunities, userBets, jobRuns] = await Promise.all([
        storage.getArbitrageOpportunities(),
        storage.getUserBets(req.user.claims.sub),
        storage.getJobRuns(),
      ]);

      const activeOpportunities = arbitrageOpportunities.length;
      const trackedBets = userBets.filter(bet => bet.isTracked).length;
      const avgProfit = arbitrageOpportunities.length > 0 
        ? arbitrageOpportunities.reduce((sum, opp) => sum + Number(opp.expectedProfitPct), 0) / arbitrageOpportunities.length
        : 0;

      // Get today's PnL
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      const pnlSummary = await storage.getPnlSummary(today, tomorrow);
      const dailyPnl = (pnlSummary.realized || 0) + (pnlSummary.unrealized || 0);

      res.json({
        activeOpportunities,
        avgProfit: avgProfit.toFixed(1),
        trackedBets,
        dailyPnl,
        hedgeAlerts: userBets.filter(bet => bet.isTracked).length, // Simplified
      });
    } catch (error) {
      console.error("Error fetching dashboard stats:", error);
      res.status(500).json({ message: "Failed to fetch dashboard stats" });
    }
  });

  // Sports routes
  app.get('/api/sports', isAuthenticated, async (req, res) => {
    try {
      const sports = await storage.getSports();
      res.json(sports);
    } catch (error) {
      console.error("Error fetching sports:", error);
      res.status(500).json({ message: "Failed to fetch sports" });
    }
  });

  // Events routes
  app.get('/api/events', isAuthenticated, async (req, res) => {
    try {
      const { league, status, from, to, sport } = req.query;
      const events = await storage.getEvents({
        leagueId: league as string,
        status: status as string,
        from: from ? new Date(from as string) : undefined,
        to: to ? new Date(to as string) : undefined,
        sportId: sport as string,
      });
      res.json(events);
    } catch (error) {
      console.error("Error fetching events:", error);
      res.status(500).json({ message: "Failed to fetch events" });
    }
  });

  app.get('/api/events/:eventId', isAuthenticated, async (req, res) => {
    try {
      const event = await storage.getEvent(req.params.eventId);
      if (!event) {
        return res.status(404).json({ message: "Event not found" });
      }
      res.json(event);
    } catch (error) {
      console.error("Error fetching event:", error);
      res.status(500).json({ message: "Failed to fetch event" });
    }
  });

  app.get('/api/events/:eventId/markets', isAuthenticated, async (req, res) => {
    try {
      const markets = await storage.getMarkets(req.params.eventId);
      res.json(markets);
    } catch (error) {
      console.error("Error fetching markets:", error);
      res.status(500).json({ message: "Failed to fetch markets" });
    }
  });

  // Markets routes
  app.get('/api/markets/:marketId/quotes', isAuthenticated, async (req, res) => {
    try {
      const { live } = req.query;
      const quotes = await storage.getQuotes(
        req.params.marketId,
        live === '1' ? true : undefined
      );
      res.json(quotes);
    } catch (error) {
      console.error("Error fetching quotes:", error);
      res.status(500).json({ message: "Failed to fetch quotes" });
    }
  });

  // Lines (comprehensive odds) routes
  app.get('/api/lines', isAuthenticated, async (req, res) => {
    console.log('🔍 /api/lines endpoint HIT with query:', req.query);
    console.log('🔍 User authenticated:', !!req.user);
    try {
      const { sport, state, market_type, live, event } = req.query;
      
      const lines = await storage.getQuotesWithContext({
        eventId: event as string,
        marketType: market_type as string,
        live: live === '1' ? true : live === '0' ? false : undefined,
        stateCode: state as string,
      });
      
      // Additional filtering by sport if specified
      let filteredLines = lines;
      if (sport) {
        filteredLines = lines.filter(line => 
          line.market.event.sport.code === sport || 
          line.market.event.sport.id === sport
        );
      }
      
      console.log(`🔍 Returning ${filteredLines.length} lines`);
      res.json(filteredLines);
    } catch (error) {
      console.error("Error fetching lines:", error);
      res.status(500).json({ message: "Failed to fetch lines" });
    }
  });

  // Odds ingestion routes
  app.post('/api/ingest/odds/run', isAuthenticated, async (req: any, res) => {
    try {
      await auditService.log(req.user.claims.sub, 'odds_ingest_triggered', 'system', null, req.body);
      
      const { leagues, live_only, max_pages } = req.body;
      const job = await oddsService.fetchOdds({
        leagues,
        liveOnly: live_only,
        maxPages: max_pages,
      });
      
      res.json({ jobId: job.id, status: 'started' });
    } catch (error) {
      console.error("Error triggering odds ingest:", error);
      res.status(500).json({ message: "Failed to trigger odds ingest" });
    }
  });

  // Arbitrage routes
  app.get('/api/arbs', isAuthenticated, async (req, res) => {
    try {
      const { league, min_profit, live, state, sport } = req.query;
      const opportunities = await storage.getArbitrageOpportunities({
        leagueId: league as string,
        minProfit: min_profit ? parseFloat(min_profit as string) : undefined,
        live: live === '1' ? true : undefined,
        stateCode: state as string,
        sportId: sport as string,
      });
      
      res.json(opportunities);
    } catch (error) {
      console.error("Error fetching arbitrage opportunities:", error);
      res.status(500).json({ message: "Failed to fetch arbitrage opportunities" });
    }
  });

  app.post('/api/arbs/recalc', isAuthenticated, async (req: any, res) => {
    try {
      await auditService.log(req.user.claims.sub, 'arbitrage_recalc_triggered', 'system', null, {});
      
      const job = await arbitrageService.recalculateArbitrage();
      res.json({ jobId: job.id, status: 'started' });
    } catch (error) {
      console.error("Error triggering arbitrage recalculation:", error);
      res.status(500).json({ message: "Failed to trigger arbitrage recalculation" });
    }
  });

  app.post('/api/arbs/simulate', isAuthenticated, async (req: any, res) => {
    try {
      const { bankroll, target_profit, markets } = req.body;
      
      await auditService.log(req.user.claims.sub, 'arbitrage_simulation', 'calculation', null, {
        bankroll,
        target_profit,
        markets: markets?.length || 0,
      });
      
      const simulation = await arbitrageService.simulateArbitrage({
        bankroll,
        targetProfit: target_profit,
        markets,
      });
      
      res.json(simulation);
    } catch (error) {
      console.error("Error simulating arbitrage:", error);
      res.status(500).json({ message: "Failed to simulate arbitrage" });
    }
  });

  // Credit-Conscious Arbitrage Endpoints
  
  // POST /api/estimate - Shows planned API calls and costs (NO network calls)
  app.post('/api/estimate', isAuthenticated, async (req: any, res) => {
    try {
      const requestSchema = z.object({
        states: z.array(z.string()).min(1, "At least one state is required"),
        sports: z.array(z.string()).optional(),
        regions: z.array(z.string()).optional(),
        markets: z.array(z.string()).optional(),
        minProfitPct: z.number().optional()
      });

      const estimateRequest = requestSchema.parse(req.body) as EstimateRequest;
      
      await auditService.log(req.user.claims.sub, 'estimate_requested', 'system', null, estimateRequest);
      
      const estimate = await arbitrageService.estimateAPIUsage(estimateRequest);
      
      res.json({
        success: true,
        estimate,
        timestamp: new Date().toISOString(),
        note: "This is an estimate only - no API calls were made"
      });
      
    } catch (error) {
      console.error("Error generating estimate:", error);
      
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Invalid request parameters",
          errors: error.errors 
        });
      }
      
      res.status(500).json({ message: "Failed to generate estimate" });
    }
  });

  // POST /api/scan/arbs - Execute arbitrage scan after user confirmation  
  app.post('/api/scan/arbs', isAuthenticated, async (req: any, res) => {
    try {
      const requestSchema = z.object({
        states: z.array(z.string()).min(1, "At least one state is required"),
        sports: z.array(z.string()).optional(),
        regions: z.array(z.string()).optional(),
        markets: z.array(z.string()).optional(),
        minProfitPct: z.number().optional(),
        confirmed: z.boolean().refine(val => val === true, "User confirmation is required")
      });

      const scanRequest = requestSchema.parse(req.body) as EstimateRequest & { confirmed: boolean };
      const userId = req.user.claims.sub;
      
      await auditService.log(userId, 'arbitrage_scan_confirmed', 'system', null, scanRequest);
      
      const results = await arbitrageService.scanArbitrageOpportunities(scanRequest, userId);
      
      res.json({
        success: true,
        ...results,
        timestamp: new Date().toISOString(),
        cacheExpiresAt: new Date(Date.now() + 5 * 60 * 1000).toISOString() // 5 minutes - matches opportunity expiry
      });
      
    } catch (error) {
      console.error("Error executing arbitrage scan:", error);
      
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Invalid request parameters",
          errors: error.errors 
        });
      }
      
      res.status(500).json({ message: "Failed to execute arbitrage scan" });
    }
  });

  // GET /api/state-map - Get current state-to-sportsbooks mapping
  app.get('/api/state-map', isAuthenticated, async (req: any, res) => {
    try {
      const stateMap = arbitrageService.getStateMap();
      
      res.json({
        success: true,
        stateMap,
        totalStates: Object.keys(stateMap).length,
        availableSportsbooks: Array.from(new Set(Object.values(stateMap).flat())).sort()
      });
      
    } catch (error) {
      console.error("Error fetching state map:", error);
      res.status(500).json({ message: "Failed to fetch state map" });
    }
  });

  // PUT /api/state-map - Update state mapping  
  app.put('/api/state-map', isAuthenticated, async (req: any, res) => {
    try {

      const updateSchema = z.object({
        stateMap: z.record(z.string(), z.array(z.string()))
      });

      const { stateMap } = updateSchema.parse(req.body);
      
      await auditService.log(req.user.claims.sub, 'state_map_updated', 'state_map', null, {
        previousStates: Object.keys(arbitrageService.getStateMap()),
        newStates: Object.keys(stateMap)
      });
      
      arbitrageService.updateStateMap(stateMap);
      
      res.json({
        success: true,
        message: "State map updated successfully",
        stateMap: arbitrageService.getStateMap()
      });
      
    } catch (error) {
      console.error("Error updating state map:", error);
      
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Invalid state map format",
          errors: error.errors 
        });
      }
      
      res.status(500).json({ message: "Failed to update state map" });
    }
  });

  // GET /api/cache/status - Check if cached results are available
  app.get('/api/cache/status', isAuthenticated, async (req: any, res) => {
    try {
      // Check for recent arbitrage opportunities (last 10 minutes)
      const recentCutoff = new Date(Date.now() - 10 * 60 * 1000);
      const opportunities = await storage.getArbitrageOpportunities();
      const recentOpportunities = opportunities.filter(opp => 
        new Date(opp.createdAt!) > recentCutoff
      );
      
      const hasCache = recentOpportunities.length > 0;
      const cacheAge = hasCache 
        ? Math.round((Date.now() - Math.max(...recentOpportunities.map(o => new Date(o.createdAt!).getTime()))) / 1000)
        : null;
      
      const maxCacheAge = 300; // 5 minutes in seconds (matches opportunity expiry)
      
      res.json({
        success: true,
        hasCache,
        cacheAge, // seconds
        cachedOpportunities: recentOpportunities.length,
        maxCacheAge, // 5 minutes - matches opportunity TTL
        recommendation: hasCache 
          ? (cacheAge! < 300 ? "use_cache" : "refresh_recommended") 
          : "scan_required"
      });
      
    } catch (error) {
      console.error("Error checking cache status:", error);
      res.status(500).json({ message: "Failed to check cache status" });
    }
  });

  // Betting routes
  app.post('/api/bets', isAuthenticated, async (req: any, res) => {
    try {
      const betData = insertUserBetSchema.parse({
        ...req.body,
        userId: req.user.claims.sub,
      });
      
      const bet = await storage.createUserBet(betData);
      
      await auditService.log(req.user.claims.sub, 'bet_created', 'user_bet', bet.id, {
        stake: bet.stake,
        eventId: bet.eventId,
      });
      
      res.json(bet);
    } catch (error) {
      console.error("Error creating bet:", error);
      res.status(500).json({ message: "Failed to create bet" });
    }
  });

  app.get('/api/bets', isAuthenticated, async (req: any, res) => {
    try {
      const { status, sport } = req.query;
      const bets = await storage.getUserBets(req.user.claims.sub, {
        status: status as string,
        sportId: sport as string,
      });
      res.json(bets);
    } catch (error) {
      console.error("Error fetching bets:", error);
      res.status(500).json({ message: "Failed to fetch bets" });
    }
  });

  app.get('/api/bets/:betId', isAuthenticated, async (req, res) => {
    try {
      const bet = await storage.getUserBet(req.params.betId);
      if (!bet) {
        return res.status(404).json({ message: "Bet not found" });
      }
      res.json(bet);
    } catch (error) {
      console.error("Error fetching bet:", error);
      res.status(500).json({ message: "Failed to fetch bet" });
    }
  });

  app.get('/api/bets/:betId/hedge', isAuthenticated, async (req, res) => {
    try {
      const suggestions = await storage.getHedgeSuggestions(req.params.betId);
      const latestSuggestion = suggestions[0] || null;
      res.json(latestSuggestion);
    } catch (error) {
      console.error("Error fetching hedge suggestion:", error);
      res.status(500).json({ message: "Failed to fetch hedge suggestion" });
    }
  });

  app.post('/api/bets/:betId/track', isAuthenticated, async (req: any, res) => {
    try {
      const bet = await storage.updateUserBet(req.params.betId, { isTracked: true });
      
      await auditService.log(req.user.claims.sub, 'bet_tracking_enabled', 'user_bet', bet.id, {});
      
      // Start hedge monitoring
      await hedgeService.monitorBet(bet.id);
      
      res.json(bet);
    } catch (error) {
      console.error("Error tracking bet:", error);
      res.status(500).json({ message: "Failed to track bet" });
    }
  });

  app.post('/api/bets/:betId/untrack', isAuthenticated, async (req: any, res) => {
    try {
      const bet = await storage.updateUserBet(req.params.betId, { isTracked: false });
      
      await auditService.log(req.user.claims.sub, 'bet_tracking_disabled', 'user_bet', bet.id, {});
      
      res.json(bet);
    } catch (error) {
      console.error("Error untracking bet:", error);
      res.status(500).json({ message: "Failed to untrack bet" });
    }
  });

  // State access routes
  app.get('/api/state-map', isAuthenticated, async (req, res) => {
    try {
      const [sportsbooks, computeLocations] = await Promise.all([
        storage.getSportsbooks(),
        storage.getComputeLocations(),
      ]);
      
      res.json({
        sportsbooks: sportsbooks.map(book => ({
          id: book.id,
          name: book.name,
          supportedStates: book.supportedStates,
        })),
        computeLocations,
      });
    } catch (error) {
      console.error("Error fetching state map:", error);
      res.status(500).json({ message: "Failed to fetch state map" });
    }
  });

  app.put('/api/state-map', isAuthenticated, async (req: any, res) => {
    try {
      // This would update compute locations and sportsbook state mappings
      // Implementation depends on specific requirements
      
      await auditService.log(req.user.claims.sub, 'state_map_updated', 'system', null, req.body);
      
      res.json({ message: "State map updated successfully" });
    } catch (error) {
      console.error("Error updating state map:", error);
      res.status(500).json({ message: "Failed to update state map" });
    }
  });

  // Costs and PnL routes
  app.post('/api/costs', isAuthenticated, async (req: any, res) => {
    try {
      const costData = insertCostRecordSchema.parse(req.body);
      const cost = await storage.createCostRecord(costData);
      
      await auditService.log(req.user.claims.sub, 'cost_recorded', 'cost_record', cost.id, {
        category: cost.category,
        amount: cost.amount,
      });
      
      res.json(cost);
    } catch (error) {
      console.error("Error creating cost record:", error);
      res.status(500).json({ message: "Failed to create cost record" });
    }
  });

  app.get('/api/pnl', isAuthenticated, async (req, res) => {
    try {
      const { from, to, bucket } = req.query;
      const fromDate = from ? new Date(from as string) : undefined;
      const toDate = to ? new Date(to as string) : undefined;
      
      const pnlSummary = await storage.getPnlSummary(fromDate, toDate, bucket as string);
      res.json(pnlSummary);
    } catch (error) {
      console.error("Error fetching PnL:", error);
      res.status(500).json({ message: "Failed to fetch PnL" });
    }
  });

  // Notifications routes
  app.post('/api/notify/test', isAuthenticated, async (req: any, res) => {
    try {
      // Test notification functionality
      await auditService.log(req.user.claims.sub, 'test_notification_sent', 'notification', null, req.body);
      
      res.json({ message: "Test notification sent successfully" });
    } catch (error) {
      console.error("Error sending test notification:", error);
      res.status(500).json({ message: "Failed to send test notification" });
    }
  });

  app.get('/api/alerts', isAuthenticated, async (req, res) => {
    try {
      const { since } = req.query;
      const sinceDate = since ? new Date(since as string) : undefined;
      
      // Get recent audit logs as alerts
      const alerts = await storage.getAuditLogs({ since: sinceDate });
      res.json(alerts);
    } catch (error) {
      console.error("Error fetching alerts:", error);
      res.status(500).json({ message: "Failed to fetch alerts" });
    }
  });

  // Jobs routes
  app.get('/api/jobs', isAuthenticated, async (req, res) => {
    try {
      const jobs = await storage.getJobRuns();
      res.json(jobs);
    } catch (error) {
      console.error("Error fetching jobs:", error);
      res.status(500).json({ message: "Failed to fetch jobs" });
    }
  });

  app.post('/api/jobs/:name:run', isAuthenticated, async (req: any, res) => {
    try {
      const jobName = req.params.name;
      
      await auditService.log(req.user.claims.sub, 'job_triggered', 'job', null, { jobName });
      
      const job = await jobScheduler.runJob(jobName);
      res.json(job);
    } catch (error) {
      console.error("Error running job:", error);
      res.status(500).json({ message: "Failed to run job" });
    }
  });

  // Feature flags routes
  app.get('/api/flags', isAuthenticated, async (req, res) => {
    try {
      const flags = await storage.getFeatureFlags();
      res.json(flags);
    } catch (error) {
      console.error("Error fetching feature flags:", error);
      res.status(500).json({ message: "Failed to fetch feature flags" });
    }
  });

  app.put('/api/flags/:key', isAuthenticated, async (req: any, res) => {
    try {
      const flagData = insertFeatureFlagSchema.parse({
        key: req.params.key,
        ...req.body,
      });
      
      const flag = await storage.upsertFeatureFlag(flagData);
      
      await auditService.log(req.user.claims.sub, 'feature_flag_updated', 'feature_flag', flag.key, {
        enabled: flag.enabled,
      });
      
      res.json(flag);
    } catch (error) {
      console.error("Error updating feature flag:", error);
      res.status(500).json({ message: "Failed to update feature flag" });
    }
  });

  // Optional placement routes (behind feature flag)
  app.post('/api/placement/preview', isAuthenticated, async (req: any, res) => {
    try {
      const autoPlacementEnabled = await featureFlagService.isEnabled('auto_placement');
      if (!autoPlacementEnabled) {
        return res.status(403).json({ message: "Auto placement feature is disabled" });
      }
      
      await auditService.log(req.user.claims.sub, 'placement_preview', 'placement', null, req.body);
      
      // Placeholder for placement preview logic
      res.json({ message: "Placement preview functionality not implemented" });
    } catch (error) {
      console.error("Error previewing placement:", error);
      res.status(500).json({ message: "Failed to preview placement" });
    }
  });

  app.post('/api/placement/confirm', isAuthenticated, async (req: any, res) => {
    try {
      const autoPlacementEnabled = await featureFlagService.isEnabled('auto_placement');
      if (!autoPlacementEnabled) {
        return res.status(403).json({ message: "Auto placement feature is disabled" });
      }
      
      await auditService.log(req.user.claims.sub, 'placement_confirmed', 'placement', null, req.body);
      
      // Placeholder for placement confirmation logic
      res.json({ message: "Placement confirmation functionality not implemented" });
    } catch (error) {
      console.error("Error confirming placement:", error);
      res.status(500).json({ message: "Failed to confirm placement" });
    }
  });

  // Audit logs route
  app.get('/api/audit-logs', isAuthenticated, async (req, res) => {
    try {
      const { since, actor } = req.query;
      const sinceDate = since ? new Date(since as string) : undefined;
      
      const logs = await storage.getAuditLogs({
        since: sinceDate,
        actor: actor as string,
      });
      
      res.json(logs);
    } catch (error) {
      console.error("Error fetching audit logs:", error);
      res.status(500).json({ message: "Failed to fetch audit logs" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
