import { storage } from "../storage";
import { auditService } from "./auditService";
import type { UserBet, HedgeSuggestion } from "@shared/schema";

interface HedgeCalculation {
  suggestedLegs: Array<{
    sportsbookId: string;
    outcomeId: string;
    priceValue: number;
    stake: number;
  }>;
  lockedProfitLow: number;
  lockedProfitHigh: number;
  rationale: string;
  confidence: number;
}

class HedgeService {
  private monitoredBets = new Set<string>();

  async monitorBet(betId: string) {
    if (this.monitoredBets.has(betId)) {
      return; // Already monitoring
    }

    this.monitoredBets.add(betId);
    
    await auditService.log("system", "hedge_monitoring_started", "user_bet", betId, {});

    // In a real implementation, this would set up continuous monitoring
    // For demo purposes, we'll calculate an initial hedge suggestion
    await this.calculateHedgeSuggestion(betId);
  }

  async calculateHedgeSuggestion(betId: string): Promise<HedgeSuggestion | null> {
    const bet = await storage.getUserBet(betId);
    if (!bet || !bet.isTracked) {
      return null;
    }

    const event = await storage.getEvent(bet.eventId);
    if (!event || event.status !== "scheduled") {
      return null;
    }

    // Get current market quotes
    const quotes = await storage.getQuotes(bet.marketId);
    if (quotes.length === 0) {
      return null;
    }

    // Calculate hedge opportunity
    const hedgeCalculation = await this.calculateHedge(bet, quotes);
    if (!hedgeCalculation) {
      return null;
    }

    // Create hedge suggestion
    const suggestion = await storage.createHedgeSuggestion({
      userBetId: bet.id,
      suggestedLegs: hedgeCalculation.suggestedLegs,
      lockedProfitLow: hedgeCalculation.lockedProfitLow.toString(),
      lockedProfitHigh: hedgeCalculation.lockedProfitHigh.toString(),
      rationale: hedgeCalculation.rationale,
      confidence: hedgeCalculation.confidence.toString(),
      expiresAt: new Date(Date.now() + 10 * 60 * 1000), // Expires in 10 minutes
    });

    await auditService.log("system", "hedge_suggestion_created", "hedge_suggestion", suggestion.id, {
      userBetId: bet.id,
      lockedProfit: hedgeCalculation.lockedProfitLow,
    });

    return suggestion;
  }

  private async calculateHedge(bet: UserBet, quotes: any[]): Promise<HedgeCalculation | null> {
    const originalStake = parseFloat(bet.stake);
    const originalOdds = parseFloat(bet.priceAtBet);
    const potentialReturn = originalStake * originalOdds;

    // Find opposing outcomes to hedge against
    const opposingQuotes = quotes.filter(quote => quote.outcomeId !== bet.outcomeId);
    if (opposingQuotes.length === 0) {
      return null;
    }

    // Find best opposing odds
    const bestOpposingQuote = opposingQuotes.reduce((best, current) => {
      const currentPrice = parseFloat(current.priceValue);
      const bestPrice = parseFloat(best.priceValue);
      return currentPrice > bestPrice ? current : best;
    });

    const hedgeOdds = parseFloat(bestOpposingQuote.priceValue);
    
    // Calculate hedge stake to lock profit
    // Formula: hedge_stake = (original_potential_return) / hedge_odds
    const hedgeStake = potentialReturn / hedgeOdds;
    const hedgeReturn = hedgeStake * hedgeOdds;

    // Calculate locked profit scenarios
    const profitIfOriginalWins = potentialReturn - originalStake - hedgeStake;
    const profitIfHedgeWins = hedgeReturn - originalStake - hedgeStake;

    const lockedProfitLow = Math.min(profitIfOriginalWins, profitIfHedgeWins);
    const lockedProfitHigh = Math.max(profitIfOriginalWins, profitIfHedgeWins);

    // Only suggest hedge if it locks in profit
    if (lockedProfitLow <= 0) {
      return null;
    }

    const confidence = this.calculateHedgeConfidence(bet, bestOpposingQuote);
    
    return {
      suggestedLegs: [{
        sportsbookId: bestOpposingQuote.sportsbookId,
        outcomeId: bestOpposingQuote.outcomeId,
        priceValue: hedgeOdds,
        stake: Math.round(hedgeStake),
      }],
      lockedProfitLow,
      lockedProfitHigh,
      rationale: `Lock in guaranteed profit of $${lockedProfitLow.toFixed(2)} - $${lockedProfitHigh.toFixed(2)} by placing hedge bet`,
      confidence,
    };
  }

  private calculateHedgeConfidence(bet: UserBet, hedgeQuote: any): number {
    // Simple confidence based on:
    // - Time until event (more time = lower confidence)
    // - Quote freshness (newer = higher confidence)
    // - Odds movement (stable = higher confidence)

    const now = new Date();
    const quoteTime = new Date(hedgeQuote.timestamp);
    const quoteAge = now.getTime() - quoteTime.getTime();
    
    // Age score (newer quotes are more reliable)
    const ageScore = Math.max(0, 1 - (quoteAge / (5 * 60 * 1000))); // 5 minutes = 0 points

    // Base confidence for having a hedge opportunity
    const baseScore = 0.7;

    return Math.round((baseScore + ageScore * 0.3) * 100) / 100;
  }

  async getActiveHedgeAlerts(): Promise<Array<{
    bet: UserBet;
    suggestion: HedgeSuggestion;
  }>> {
    const trackedBets = await storage.getUserBets("", { status: "pending" });
    const activeAlerts = [];

    for (const bet of trackedBets.filter(b => b.isTracked)) {
      const suggestions = await storage.getHedgeSuggestions(bet.id);
      const latestSuggestion = suggestions[0];
      
      if (latestSuggestion && new Date(latestSuggestion.expiresAt!) > new Date()) {
        activeAlerts.push({
          bet,
          suggestion: latestSuggestion,
        });
      }
    }

    return activeAlerts;
  }
}

export const hedgeService = new HedgeService();
