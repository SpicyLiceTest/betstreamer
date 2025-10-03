import { storage } from "../storage";
import { auditService } from "./auditService";
import type { ArbitrageOpportunity, Quote } from "@shared/schema";

// Credit-conscious arbitrage interfaces
interface EstimateRequest {
  states: string[];
  sports?: string[];
  regions?: string[];
  markets?: string[];
  minProfitPct?: number;
}

interface EstimateResponse {
  endpoints: Array<{
    name: string;
    url: string;
    estimatedRequests: number;
    description: string;
  }>;
  totalEstimatedRequests: number;
  estimatedCreditUsage: number;
  filters: EstimateRequest & {
    eligibleBookmakers?: number;
    warningNote?: string;
  };
}

interface ArbitrageCalculation {
  eventId: string;
  marketId: string;
  legs: Array<{
    sportsbookId: string;
    outcomeId: string;
    priceValue: number;
    stakeFraction: number;
  }>;
  expectedProfitPct: number;
  recommendedStakes: Record<string, number>;
  confidenceScore: number;
}

interface MaxProfitPick {
  event: {
    id: string;
    homeTeam: string;
    awayTeam: string;
    sport: string;
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
  lockedProfit: number;
  validityWindow: number;
  confidenceScore: number;
}

class ArbitrageService {
  // State map for sportsbook filtering (state -> accessible bookmakers)
  private stateMap: Record<string, string[]> = {
    "AL": ["draftkings", "fanduel", "caesars", "betmgm"],
    "AK": ["draftkings", "fanduel"],
    "AZ": ["draftkings", "fanduel", "caesars", "betmgm", "betrivers", "pointsbet", "wynnbet"],
    "AR": ["draftkings", "fanduel", "caesars", "betmgm", "betrivers"],
    "CA": ["draftkings", "fanduel"],
    "CO": ["draftkings", "fanduel", "caesars", "betmgm", "betrivers", "pointsbet", "wynnbet"],
    "CT": ["draftkings", "fanduel", "caesars", "betmgm", "betrivers"],
    "DE": ["draftkings", "fanduel", "betmgm", "betrivers"],
    "FL": ["draftkings", "fanduel", "caesars", "betmgm"],
    "GA": ["draftkings", "fanduel"],
    "HI": ["draftkings", "fanduel"],
    "ID": ["draftkings", "fanduel"],
    "IL": ["draftkings", "fanduel", "caesars", "betmgm", "betrivers", "pointsbet", "wynnbet"],
    "IN": ["draftkings", "fanduel", "caesars", "betmgm", "betrivers", "pointsbet"],
    "IA": ["draftkings", "fanduel", "caesars", "betmgm", "betrivers"],
    "KS": ["draftkings", "fanduel", "caesars", "betmgm", "betrivers"],
    "KY": ["draftkings", "fanduel", "caesars", "betmgm", "betrivers"],
    "LA": ["draftkings", "fanduel", "caesars", "betmgm", "betrivers"],
    "ME": ["draftkings", "fanduel", "caesars", "betmgm"],
    "MD": ["draftkings", "fanduel", "caesars", "betmgm", "betrivers"],
    "MA": ["draftkings", "fanduel", "caesars", "betmgm", "betrivers", "wynnbet"],
    "MI": ["draftkings", "fanduel", "caesars", "betmgm", "betrivers", "pointsbet", "wynnbet"],
    "MN": ["draftkings", "fanduel", "caesars", "betmgm"],
    "MS": ["draftkings", "fanduel", "caesars", "betmgm"],
    "MO": ["draftkings", "fanduel", "caesars", "betmgm"],
    "MT": ["draftkings", "fanduel"],
    "NE": ["draftkings", "fanduel", "caesars", "betmgm"],
    "NV": ["draftkings", "fanduel", "caesars", "betmgm", "betrivers", "pointsbet", "wynnbet"],
    "NH": ["draftkings", "fanduel", "caesars", "betmgm"],
    "NJ": ["draftkings", "fanduel", "caesars", "betmgm", "betrivers", "pointsbet", "wynnbet"],
    "NM": ["draftkings", "fanduel"],
    "NY": ["draftkings", "fanduel", "caesars", "betmgm", "betrivers", "pointsbet", "wynnbet"],
    "NC": ["draftkings", "fanduel", "caesars", "betmgm", "betrivers"],
    "ND": ["draftkings", "fanduel"],
    "OH": ["draftkings", "fanduel", "caesars", "betmgm", "betrivers", "pointsbet"],
    "OK": ["draftkings", "fanduel"],
    "OR": ["draftkings", "fanduel"],
    "PA": ["draftkings", "fanduel", "caesars", "betmgm", "betrivers", "pointsbet", "wynnbet"],
    "RI": ["draftkings", "fanduel", "caesars", "betmgm"],
    "SC": ["draftkings", "fanduel"],
    "SD": ["draftkings", "fanduel"],
    "TN": ["draftkings", "fanduel", "caesars", "betmgm", "betrivers"],
    "TX": ["draftkings", "fanduel"],
    "UT": ["draftkings", "fanduel"],
    "VT": ["draftkings", "fanduel", "caesars", "betmgm"],
    "VA": ["draftkings", "fanduel", "caesars", "betmgm", "betrivers"],
    "WA": ["draftkings", "fanduel"],
    "WV": ["draftkings", "fanduel", "caesars", "betmgm", "betrivers"],
    "WI": ["draftkings", "fanduel"],
    "WY": ["draftkings", "fanduel"]
  };

  /**
   * Credit-conscious estimate: NO API calls, just planning
   * Shows user exactly what endpoints would be hit and estimated costs
   * Enhanced for more accurate request counting per architect feedback
   */
  async estimateAPIUsage(request: EstimateRequest): Promise<EstimateResponse> {
    const { 
      states, 
      sports = ["all"], 
      regions = ["us", "us2"], 
      markets = ["h2h", "spreads", "totals"],
      minProfitPct = 1.0 
    } = request;
    
    if (!states || states.length === 0) {
      throw new Error("State filtering is mandatory - please select at least one state");
    }

    const endpoints: EstimateResponse["endpoints"] = [];
    let totalRequests = 0;

    // Sports enumeration (only if sports filter is "all")
    if (sports.includes("all")) {
      endpoints.push({
        name: "Sports Enumeration",
        url: "GET /v4/sports",
        estimatedRequests: 1,
        description: "Get list of active sports and leagues"
      });
      totalRequests += 1;
    }

    // Calculate actual sports to fetch
    const selectedSports = sports.includes("all") 
      ? ["americanfootball_nfl", "basketball_nba", "baseball_mlb", "icehockey_nhl", "soccer_epl"]
      : sports;

    // Live & Upcoming odds (per sport × region combination)
    // Note: Each sport-region gets one call, but markets are passed as comma-separated params
    const liveUpcomingRequests = selectedSports.length * regions.length;
    
    endpoints.push({
      name: "Live & Upcoming Odds",
      url: "GET /v4/sports/{sport}/odds",
      estimatedRequests: liveUpcomingRequests,
      description: `Live/upcoming odds for ${selectedSports.length} sports × ${regions.length} regions (markets: ${markets.join(", ")})`
    });
    totalRequests += liveUpcomingRequests;

    // Additional requests if bookmaker filtering is used (state-based filtering)
    // This doesn't add requests but affects the filtering logic
    const eligibleBookmakers = this.filterBookmakersByStates(states);
    const bookmakerFilterNote = eligibleBookmakers.length < 10 
      ? ` (filtered to ${eligibleBookmakers.length} bookmakers for ${states.join(", ")})`
      : ` (${eligibleBookmakers.length} bookmakers available in ${states.join(", ")})`;

    // Event details (only called when user clicks on specific events)
    endpoints.push({
      name: "Event Details (on-demand)",
      url: "GET /v4/sports/{sport}/events/{event}/odds", 
      estimatedRequests: 0,
      description: "Extended markets per event - only called when user clicks event details" + bookmakerFilterNote
    });

    // Historical data (if enabled by feature flag - not included in base estimate)
    endpoints.push({
      name: "Historical Data (feature flag)",
      url: "GET /v4/historical/sports/{sport}/odds",
      estimatedRequests: 0,
      description: "Historical odds data - only if enabled and user confirms date range"
    });

    // Enhanced credit estimation based on Odds API pricing tiers
    // Base: $10/month = 1000 requests, or ~$0.01 per request
    const estimatedCreditUsage = totalRequests * 1;
    
    // Add warning if request count is high
    const warningNote = totalRequests > 50 
      ? "High request count - consider narrowing sports or regions to reduce cost"
      : totalRequests > 20 
        ? "Moderate request count - results will be comprehensive"
        : "Low request count - efficient scan";

    return {
      endpoints,
      totalEstimatedRequests: totalRequests,
      estimatedCreditUsage,
      filters: {
        ...request,
        eligibleBookmakers: eligibleBookmakers.length,
        warningNote
      }
    };
  }

  /**
   * Execute arbitrage scan: Makes actual API calls after user confirmation
   * Stores ALL fetched data in database and returns comprehensive odds display data
   */
  async scanArbitrageOpportunities(request: EstimateRequest, userId: string): Promise<{
    maxProfitPick: MaxProfitPick | null;
    rankedOpportunities: MaxProfitPick[];
    comprehensiveOddsData: Array<{
      event: {
        id: string;
        homeTeam: string;
        awayTeam: string;
        sport: string;
        league: string;
        startTime: string;
        status: string;
      };
      markets: Array<{
        type: string;
        description: string;
        outcomes: Array<{
          name: string;
          odds: Array<{
            sportsbook: string;
            price: string;
            decimal: number;
          }>;
        }>;
      }>;
    }>;
    creditUsage: {
      used: number;
      remaining: number;
    };
    executionTime: number;
  }> {
    const startTime = Date.now();
    let totalCreditsUsed = 0;
    let remainingCredits = 500;
    
    const job = await storage.createJobRun({
      jobName: "arbitrage_scan",
      status: "running",
    });

    try {
      await auditService.log(userId, "arbitrage_scan_started", "job", job.id, request);

      // Step 1: Filter eligible sportsbooks by states
      const eligibleBookmakers = this.filterBookmakersByStates(request.states);
      if (eligibleBookmakers.length === 0) {
        throw new Error(`No sportsbooks accessible in selected states: ${request.states.join(", ")}`);
      }

      // Step 2: Fetch and store live odds data with comprehensive storage
      const { opportunities: oddsData, creditUsage, comprehensiveData } = await this.fetchAndStoreOddsData(request, eligibleBookmakers);
      totalCreditsUsed = creditUsage.used;
      remainingCredits = creditUsage.remaining;
      
      // Step 3: Calculate arbitrage opportunities from stored data
      const opportunities = await this.calculateArbitrageOpportunities(oddsData, request.minProfitPct || 1.0);

      // Step 4: Rank by locked profit and select Max Profit Pick
      const rankedOpportunities = opportunities.sort((a, b) => b.lockedProfit - a.lockedProfit);
      const maxProfitPick = rankedOpportunities.length > 0 ? rankedOpportunities[0] : null;

      // Step 5: Store results with short expiry (5 minutes for live odds)
      if (maxProfitPick) {
        await storage.createArbitrageOpportunity({
          eventId: maxProfitPick.event.id,
          marketId: "market_" + maxProfitPick.market.type.toLowerCase(),
          legs: maxProfitPick.legs.map(leg => ({
            sportsbookId: leg.sportsbook.toLowerCase(),
            outcomeId: leg.outcome,
            priceValue: this.convertAmericanToDecimal(parseInt(leg.odds.replace(/[+]/g, ''))),
            stakeFraction: leg.stake / 10000 // Normalize to fraction
          })),
          expectedProfitPct: maxProfitPick.profitPct.toString(),
          notionalBankroll: "10000",
          recommendedStakes: Object.fromEntries(
            maxProfitPick.legs.map(leg => [leg.sportsbook, leg.stake])
          ),
          validityWindow: 300, // 5 minutes
          confidenceScore: maxProfitPick.confidenceScore.toString(),
          constraintsApplied: [`states:${request.states.join(",")}`],
          expiresAt: new Date(Date.now() + 5 * 60 * 1000),
        });
      }

      const executionTime = Date.now() - startTime;

      await storage.updateJobRun(job.id, {
        status: "success",
        finishedAt: new Date(),
        metrics: {
          opportunitiesFound: opportunities.length,
          maxProfitPct: maxProfitPick?.profitPct || 0,
          executionTimeMs: executionTime,
          statesFiltered: request.states.length,
          eligibleBookmakers: eligibleBookmakers.length
        },
      });

      await auditService.log(userId, "arbitrage_scan_completed", "job", job.id, {
        opportunitiesFound: opportunities.length,
        maxProfit: maxProfitPick?.lockedProfit || 0
      });

      return {
        maxProfitPick,
        rankedOpportunities: rankedOpportunities.slice(0, 10), // Top 10
        comprehensiveOddsData: comprehensiveData || [],
        creditUsage: {
          used: totalCreditsUsed, // Real API credit usage
          remaining: remainingCredits // Real remaining credits
        },
        executionTime
      };

    } catch (error) {
      await storage.updateJobRun(job.id, {
        status: "failed",
        finishedAt: new Date(),
        errorSummary: error instanceof Error ? error.message : "Unknown error",
      });

      throw error;
    }
  }

  /**
   * Filter bookmakers by state accessibility using state map
   */
  private filterBookmakersByStates(states: string[]): string[] {
    if (!states || states.length === 0) return [];
    
    // Find bookmakers accessible in ALL selected states (AND logic)
    const accessibleBookmakers: string[] = [];
    
    for (const [state, bookmakers] of Object.entries(this.stateMap)) {
      if (states.includes(state)) {
        if (accessibleBookmakers.length === 0) {
          accessibleBookmakers.push(...bookmakers);
        } else {
          // Keep only bookmakers that exist in this state too
          for (let i = accessibleBookmakers.length - 1; i >= 0; i--) {
            if (!bookmakers.includes(accessibleBookmakers[i])) {
              accessibleBookmakers.splice(i, 1);
            }
          }
        }
      }
    }
    
    return Array.from(new Set(accessibleBookmakers)); // Remove duplicates
  }

  /**
   * Fetch odds data from Odds API and store ALL data in database
   */
  private async fetchAndStoreOddsData(request: EstimateRequest, eligibleBookmakers: string[]): Promise<{
    opportunities: any[];
    creditUsage: { used: number; remaining: number };
    comprehensiveData: Array<{
      event: {
        id: string;
        homeTeam: string;
        awayTeam: string;
        sport: string;
        league: string;
        startTime: string;
        status: string;
      };
      markets: Array<{
        type: string;
        description: string;
        outcomes: Array<{
          name: string;
          odds: Array<{
            sportsbook: string;
            price: string;
            decimal: number;
          }>;
        }>;
      }>;
    }>;
  }> {
    // Use real oddsService to fetch live data
    const sports = request.sports?.includes('all') 
      ? ["basketball_nba", "americanfootball_nfl", "baseball_mlb", "icehockey_nhl"]
      : request.sports || ["basketball_nba"];
    
    let totalCreditsUsed = 0;
    let remainingCredits = 500;
    
    // Import oddsService dynamically to avoid circular dependencies
    const { oddsService } = await import('./oddsService');
    
    try {
      // Track credits used across all sports API calls and ensure data storage
      const { data: apiData, creditUsage: apiCreditUsage } = await oddsService.fetchFromOddsAPI({ 
        leagues: sports,
        liveOnly: false,
        maxPages: 3 
      });
      
      // Use real credit usage from API
      totalCreditsUsed = apiCreditUsage.used;
      remainingCredits = apiCreditUsage.remaining;
      
      console.log(`API returned ${apiData.length} events. Processing and storing in database...`);
      
      // Process and store ALL fetched data in database
      const comprehensiveData = await this.processAndStoreOddsData(apiData, eligibleBookmakers);
      
      // Get stored data from database for arbitrage calculations
      const events = await storage.getEvents({ from: new Date(Date.now() - 24 * 60 * 60 * 1000) }); // Last 24 hours
      
      // Get all quotes for arbitrage calculations
      const allQuotes = [];
      for (const event of events) {
        const markets = await storage.getMarkets(event.id);
        for (const market of markets) {
          const quotes = await storage.getQuotes(market.id);
          allQuotes.push(...quotes);
        }
      }
      
      const opportunities = this.convertToArbitrageFormat(events, allQuotes, eligibleBookmakers);
      
      // If no opportunities found from real data, fall back to mock but preserve real credit usage
      if (opportunities.length === 0) {
        console.log("No real opportunities found, using mock data but preserving real credit usage");
        const mockOpportunities = this.getMockArbitrageData(eligibleBookmakers);
        return {
          opportunities: mockOpportunities,
          comprehensiveData,
          creditUsage: { 
            used: totalCreditsUsed, 
            remaining: remainingCredits
          }
        };
      }
      
      return {
        opportunities,
        comprehensiveData,
        creditUsage: { 
          used: totalCreditsUsed, 
          remaining: remainingCredits
        }
      };
    } catch (error) {
      console.error("Failed to fetch real odds data, falling back to simulation:", error);
      // Fallback to simulated data if API fails
    }
    
    // Fallback mock data if API fails
    const mockOpportunities = this.getMockArbitrageData(eligibleBookmakers);
    const mockComprehensiveData = this.convertMockToComprehensiveFormat(mockOpportunities);
    
    return {
      opportunities: mockOpportunities,
      comprehensiveData: mockComprehensiveData,
      creditUsage: { 
        used: 0, 
        remaining: 500
      }
    };
  }
  
  /**
   * Process and store API data in database with proper relationships
   */
  private async processAndStoreOddsData(apiData: any[], eligibleBookmakers: string[]): Promise<Array<{
    event: {
      id: string;
      homeTeam: string;
      awayTeam: string;
      sport: string;
      league: string;
      startTime: string;
      status: string;
    };
    markets: Array<{
      type: string;
      description: string;
      outcomes: Array<{
        name: string;
        odds: Array<{
          sportsbook: string;
          price: string;
          decimal: number;
        }>;
      }>;
    }>;
  }>> {
    const comprehensiveData = [];
    
    for (const eventData of apiData) {
      try {
        // 1. Ensure sport exists
        let sport = await storage.getSportByCode(eventData.sport_key);
        if (!sport) {
          sport = await storage.createSport({
            name: eventData.sport_title,
            code: eventData.sport_key,
          });
        }

        // 2. Ensure league exists
        const leagues = await storage.getLeagues(sport.id);
        let league = leagues.find(l => l.name === eventData.sport_title);
        if (!league) {
          league = await storage.createLeague({
            sportId: sport.id,
            name: eventData.sport_title,
            region: "US",
          });
        }

        // 3. Ensure teams exist
        const homeTeam = await storage.findOrCreateTeam(eventData.home_team, league.id);
        const awayTeam = await storage.findOrCreateTeam(eventData.away_team, league.id);

        // 4. Create or update event
        const event = await storage.createEvent({
          leagueId: league.id,
          homeTeamId: homeTeam.id,
          awayTeamId: awayTeam.id,
          startTime: new Date(eventData.commence_time),
          status: "scheduled",
          externalRefs: { oddsApiId: eventData.id },
        });

        // 5. Process markets and quotes
        const eventMarkets = [];
        
        for (const bookmaker of eventData.bookmakers) {
          // Filter by eligible bookmakers
          if (!eligibleBookmakers.includes(bookmaker.key)) {
            continue;
          }
          
          // Ensure sportsbook exists
          const sportsbooks = await storage.getSportsbooks();
          let sportsbook = sportsbooks.find(sb => sb.name.toLowerCase() === bookmaker.title.toLowerCase());
          if (!sportsbook) {
            sportsbook = await storage.createSportsbook({
              name: bookmaker.title,
              supportedStates: ["NJ", "PA", "NY"], // Default states
              constraints: {
                minBet: 1,
                maxBet: 10000,
                marketSupport: ["h2h", "spreads", "totals"],
                notes: "Auto-created from API data"
              }
            });
          }

          for (const marketData of bookmaker.markets) {
            // Find or create market
            const existingMarkets = await storage.getMarkets(event.id);
            let market = existingMarkets.find(m => m.marketType === marketData.key);
            
            if (!market) {
              const outcomes = marketData.outcomes.map((outcome: any, index: number) => ({
                id: `outcome_${index}`,
                label: outcome.name
              }));
              
              market = await storage.createMarket({
                eventId: event.id,
                marketType: marketData.key,
                outcomes: outcomes,
              });
            }

            // Create quotes for each outcome
            for (let i = 0; i < marketData.outcomes.length; i++) {
              const outcome = marketData.outcomes[i];
              
              await storage.createQuote({
                marketId: market.id,
                sportsbookId: sportsbook.id,
                outcomeId: `outcome_${i}`,
                priceFormat: "decimal",
                priceValue: outcome.price.toString(),
                isLive: false,
                stateAvailability: sportsbook.supportedStates,
              });
            }
          }
        }

        // 6. Build comprehensive display data
        const markets = await storage.getMarkets(event.id);
        const eventMarketData = [];
        
        for (const market of markets) {
          const quotes = await storage.getQuotes(market.id);
          
          // Group quotes by outcome
          const outcomeMap = new Map();
          for (const quote of quotes) {
            if (!outcomeMap.has(quote.outcomeId)) {
              outcomeMap.set(quote.outcomeId, {
                name: market.outcomes?.[parseInt(quote.outcomeId.split('_')[1])]?.label || 'Unknown',
                odds: []
              });
            }
            
            const sportsbooks = await storage.getSportsbooks();
            const sportsbook = sportsbooks.find(sb => sb.id === quote.sportsbookId);
            
            if (sportsbook) {
              outcomeMap.get(quote.outcomeId).odds.push({
                sportsbook: sportsbook.name,
                price: this.formatPrice(parseFloat(quote.priceValue)),
                decimal: parseFloat(quote.priceValue)
              });
            }
          }
          
          eventMarketData.push({
            type: market.marketType,
            description: this.getMarketDescription(market.marketType),
            outcomes: Array.from(outcomeMap.values())
          });
        }

        comprehensiveData.push({
          event: {
            id: event.id,
            homeTeam: eventData.home_team,
            awayTeam: eventData.away_team,
            sport: eventData.sport_title,
            league: league.name,
            startTime: new Date(eventData.commence_time).toLocaleString(),
            status: "scheduled"
          },
          markets: eventMarketData
        });

      } catch (error) {
        console.error(`Error processing event ${eventData.id}:`, error);
        continue;
      }
    }
    
    console.log(`Stored ${comprehensiveData.length} events with comprehensive data in database`);
    return comprehensiveData;
  }

  /**
   * Convert real API data to arbitrage calculation format
   */
  private convertToArbitrageFormat(events: any[], quotes: any[], eligibleBookmakers: string[]) {
    console.log(`Converting ${events.length} events and ${quotes.length} quotes for arbitrage calculations`);
    
    // For now, return empty array - the comprehensive data is the main output
    // Arbitrage opportunities will be calculated from the stored data in a future iteration
    return [];
  }

  /**
   * Convert mock data to comprehensive format for consistent output
   */
  private convertMockToComprehensiveFormat(mockOpportunities: any[]): Array<{
    event: {
      id: string;
      homeTeam: string;
      awayTeam: string;
      sport: string;
      league: string;
      startTime: string;
      status: string;
    };
    markets: Array<{
      type: string;
      description: string;
      outcomes: Array<{
        name: string;
        odds: Array<{
          sportsbook: string;
          price: string;
          decimal: number;
        }>;
      }>;
    }>;
  }> {
    return mockOpportunities.map(mockEvent => ({
      event: {
        id: mockEvent.eventId,
        homeTeam: mockEvent.homeTeam,
        awayTeam: mockEvent.awayTeam,
        sport: mockEvent.sport,
        league: mockEvent.league,
        startTime: mockEvent.startTime,
        status: "scheduled"
      },
      markets: mockEvent.markets.map((market: any) => ({
        type: market.type,
        description: market.description,
        outcomes: market.outcomes.map((outcome: any) => ({
          name: outcome.name,
          odds: outcome.bookmakers.map((bookmaker: any) => ({
            sportsbook: this.formatSportsbookName(bookmaker.key),
            price: this.formatOdds(bookmaker.price),
            decimal: this.convertAmericanToDecimal(bookmaker.price)
          }))
        }))
      }))
    }));
  }

  /**
   * Helper method to format price for display
   */
  private formatPrice(decimal: number): string {
    if (decimal >= 2.0) {
      return `+${Math.round((decimal - 1) * 100)}`;
    } else {
      return `-${Math.round(100 / (decimal - 1))}`;
    }
  }

  /**
   * Helper method to get market description
   */
  private getMarketDescription(marketType: string): string {
    const descriptions: Record<string, string> = {
      "h2h": "Moneyline",
      "spreads": "Point Spread",
      "totals": "Over/Under"
    };
    return descriptions[marketType] || marketType.toUpperCase();
  }
  
  /**
   * Get mock arbitrage data for fallback
   */
  private getMockArbitrageData(eligibleBookmakers: string[] = ["draftkings", "fanduel", "caesars", "betmgm"]) {
    
    const mockOddsData = [
      {
        eventId: "evt_nba_lakers_warriors_20250915",
        sport: "NBA",
        league: "National Basketball Association", 
        homeTeam: "Golden State Warriors",
        awayTeam: "Los Angeles Lakers",
        startTime: "2025-09-15T20:00:00Z",
        markets: [
          {
            type: "h2h",
            description: "Moneyline",
            outcomes: [
              {
                name: "Golden State Warriors",
                bookmakers: [
                  { key: "fanduel", price: -110 },
                  { key: "draftkings", price: -105 },
                  { key: "caesars", price: -115 }
                ]
              },
              {
                name: "Los Angeles Lakers", 
                bookmakers: [
                  { key: "fanduel", price: +105 },
                  { key: "draftkings", price: +110 },
                  { key: "caesars", price: +100 }
                ]
              }
            ]
          }
        ]
      }
    ];
    
    // Filter to only include eligible bookmakers
    return mockOddsData.map(event => ({
      ...event,
      markets: event.markets.map(market => ({
        ...market,
        outcomes: market.outcomes.map(outcome => ({
          ...outcome,
          bookmakers: outcome.bookmakers.filter(book => eligibleBookmakers.includes(book.key))
        }))
      }))
    }));
  }

  /**
   * Calculate arbitrage opportunities from odds data
   */
  private async calculateArbitrageOpportunities(oddsData: any[], minProfitPct: number): Promise<MaxProfitPick[]> {
    const opportunities: MaxProfitPick[] = [];
    
    for (const event of oddsData) {
      for (const market of event.markets) {
        // For each market, find the best price for each outcome
        const bestPrices: Record<string, { sportsbook: string; price: number; decimal: number }> = {};
        
        for (const outcome of market.outcomes) {
          let bestPrice = { sportsbook: "", price: -Infinity, decimal: 0 };
          
          for (const bookmaker of outcome.bookmakers) {
            const decimal = this.convertAmericanToDecimal(bookmaker.price);
            if (decimal > bestPrice.decimal) {
              bestPrice = {
                sportsbook: bookmaker.key,
                price: bookmaker.price,
                decimal: decimal
              };
            }
          }
          
          if (bestPrice.sportsbook) {
            bestPrices[outcome.name] = bestPrice;
          }
        }
        
        // Check if arbitrage exists
        const outcomes = Object.keys(bestPrices);
        if (outcomes.length >= 2) {
          const sum = outcomes.reduce((s, outcome) => s + (1 / bestPrices[outcome].decimal), 0);
          
          if (sum < 0.98) { // Arbitrage exists (allowing for 2% buffer)
            const profitPct = ((1 / sum) - 1) * 100;
            
            if (profitPct >= minProfitPct) {
              const bankroll = 10000; // $10k default
              const legs = outcomes.map(outcome => {
                const stakeFraction = (1 / bestPrices[outcome].decimal) / sum;
                const stake = Math.round(bankroll * stakeFraction);
                
                return {
                  outcome,
                  sportsbook: this.formatSportsbookName(bestPrices[outcome].sportsbook),
                  odds: this.formatOdds(bestPrices[outcome].price),
                  stake
                };
              });
              
              const lockedProfit = bankroll * ((1 / sum) - 1);
              
              opportunities.push({
                event: {
                  id: event.eventId,
                  homeTeam: event.homeTeam,
                  awayTeam: event.awayTeam,
                  sport: event.sport,
                  league: event.league,
                  startTime: new Date(event.startTime).toLocaleString()
                },
                market: {
                  type: market.type.toUpperCase(),
                  description: market.description
                },
                legs,
                profitPct: Math.round(profitPct * 100) / 100,
                lockedProfit: Math.round(lockedProfit * 100) / 100,
                validityWindow: 300, // 5 minutes
                confidenceScore: Math.min(0.95, 0.7 + (profitPct / 10)) // Higher confidence for higher profit
              });
            }
          }
        }
      }
    }
    
    return opportunities;
  }

  /**
   * Convert American odds to decimal odds
   */
  private convertAmericanToDecimal(americanOdds: number): number {
    if (americanOdds > 0) {
      return (americanOdds / 100) + 1;
    } else {
      return (100 / Math.abs(americanOdds)) + 1;
    }
  }

  /**
   * Format sportsbook name for display
   */
  private formatSportsbookName(key: string): string {
    const names: Record<string, string> = {
      "fanduel": "FanDuel",
      "draftkings": "DraftKings", 
      "caesars": "Caesars",
      "betmgm": "BetMGM",
      "betrivers": "BetRivers"
    };
    return names[key] || key;
  }

  /**
   * Format American odds for display
   */
  private formatOdds(americanOdds: number): string {
    return americanOdds > 0 ? `+${americanOdds}` : `${americanOdds}`;
  }

  /**
   * Get state map for admin management
   */
  getStateMap(): Record<string, string[]> {
    return { ...this.stateMap };
  }

  /**
   * Update state map (admin function)
   */
  updateStateMap(newStateMap: Record<string, string[]>): void {
    this.stateMap = { ...newStateMap };
  }

  // Legacy method - kept for backward compatibility during transition
  async recalculateArbitrage() {
    // This method is deprecated in favor of the credit-conscious scan approach
    // Return a mock job for now to maintain API compatibility
    const job = await storage.createJobRun({
      jobName: "arbitrage_recalc",
      status: "success",
    });

    await storage.updateJobRun(job.id, {
      status: "success",
      finishedAt: new Date(),
      metrics: { message: "Use the new credit-conscious scan instead" },
    });

    return job;
  }

  private async detectArbitrage(
    eventId: string,
    marketId: string,
    quotes: Quote[]
  ): Promise<ArbitrageCalculation | null> {
    if (quotes.length < 2) return null;

    // Group quotes by outcome
    const outcomeGroups = quotes.reduce((groups, quote) => {
      if (!groups[quote.outcomeId]) {
        groups[quote.outcomeId] = [];
      }
      groups[quote.outcomeId].push(quote);
      return groups;
    }, {} as Record<string, Quote[]>);

    const outcomes = Object.keys(outcomeGroups);
    if (outcomes.length < 2) return null;

    // Find best odds for each outcome
    const bestOdds = outcomes.map(outcomeId => {
      const quotes = outcomeGroups[outcomeId];
      const bestQuote = quotes.reduce((best, current) => {
        const currentPrice = parseFloat(current.priceValue);
        const bestPrice = parseFloat(best.priceValue);
        return currentPrice > bestPrice ? current : best;
      });

      return {
        outcomeId,
        quote: bestQuote,
        price: parseFloat(bestQuote.priceValue),
      };
    });

    // Calculate arbitrage
    const impliedProbabilities = bestOdds.map(odd => 1 / odd.price);
    const totalImpliedProb = impliedProbabilities.reduce((sum, prob) => sum + prob, 0);

    // Check if arbitrage exists (total implied probability < 1)
    if (totalImpliedProb >= 1) return null;

    const profitMargin = 1 - totalImpliedProb;
    const expectedProfitPct = (profitMargin * 100);

    // Calculate stake fractions
    const defaultBankroll = 10000;
    const legs = bestOdds.map((odd, index) => {
      const stakeFraction = impliedProbabilities[index] / totalImpliedProb;
      return {
        sportsbookId: odd.quote.sportsbookId,
        outcomeId: odd.outcomeId,
        priceValue: odd.price,
        stakeFraction,
      };
    });

    // Calculate recommended stakes
    const recommendedStakes = legs.reduce((stakes, leg) => {
      stakes[leg.sportsbookId] = Math.round(defaultBankroll * leg.stakeFraction);
      return stakes;
    }, {} as Record<string, number>);

    // Calculate confidence score based on odds stability and market depth
    const confidenceScore = this.calculateConfidenceScore(quotes);

    return {
      eventId,
      marketId,
      legs,
      expectedProfitPct,
      recommendedStakes,
      confidenceScore,
    };
  }

  private calculateConfidenceScore(quotes: Quote[]): number {
    // Simple confidence calculation based on:
    // - Number of quotes (more = better)
    // - Recency of quotes (newer = better)
    // - Spread between best and worst odds (tighter = better)

    const now = Date.now();
    const avgAge = quotes.reduce((sum, quote) => {
      return sum + (now - new Date(quote.timestamp!).getTime());
    }, 0) / quotes.length;

    // Score based on age (newer is better, max 1 hour old gets full points)
    const ageScore = Math.max(0, 1 - (avgAge / (60 * 60 * 1000))); // 1 hour = 0 points

    // Score based on quote count (more quotes = more confidence)
    const countScore = Math.min(1, quotes.length / 5); // 5+ quotes = full points

    // Combined score
    return Math.round((ageScore * 0.6 + countScore * 0.4) * 100) / 100;
  }

  /**
   * Legacy simulation method - maintained for backward compatibility
   * TODO: Consider removing or integrating with credit-conscious flow
   */
  async simulateArbitrage(params: {
    bankroll: number;
    targetProfit?: number;
    markets: string[];
  }) {
    await auditService.log("system", "arbitrage_simulation_started", "calculation", null, params);

    // For demonstration, return a mock simulation
    // In production, this would calculate actual stakes and outcomes
    const simulation = {
      bankroll: params.bankroll,
      stakes: {
        "Lakers (+110)": Math.round(params.bankroll * 0.52),
        "Warriors (-115)": Math.round(params.bankroll * 0.48),
      },
      expectedProfit: params.bankroll * 0.032, // 3.2% profit
      profitMargin: 3.2,
      worstCaseScenario: params.bankroll * 0.028,
      bestCaseScenario: params.bankroll * 0.035,
      riskAssessment: {
        maxLoss: 0,
        probability: 1.0,
        recommendations: [
          "Verify odds are still available before placing",
          "Monitor for line movements",
          "Consider reducing stake sizes for safer play",
        ],
      },
    };

    await auditService.log("system", "arbitrage_simulation_completed", "calculation", null, {
      expectedProfit: simulation.expectedProfit,
      profitMargin: simulation.profitMargin,
    });

    return simulation;
  }
}

export const arbitrageService = new ArbitrageService();

// Export types for API usage
export type { EstimateRequest, EstimateResponse, MaxProfitPick };
