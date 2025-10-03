import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Clock } from "lucide-react";
import type { ArbitrageOpportunityDisplay } from "@/types";

interface ArbitrageCardProps {
  opportunity: ArbitrageOpportunityDisplay;
}

export default function ArbitrageCard({ opportunity }: ArbitrageCardProps) {
  const formatValidityTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

  const handleSimulate = () => {
    // This would open a simulation modal
    console.log("Simulate arbitrage opportunity:", opportunity.id);
  };

  return (
    <div className="border border-border rounded-lg p-4 hover:bg-muted/50 transition-colors">
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="font-medium text-sm">
            {opportunity.event.homeTeam} vs {opportunity.event.awayTeam}
          </h3>
          <p className="text-xs text-muted-foreground">
            {opportunity.event.league} • {opportunity.market.description} • {opportunity.event.startTime}
          </p>
        </div>
        <Badge 
          variant="secondary" 
          className="bg-green-500/10 text-green-500 border-green-500/20"
        >
          +{opportunity.profitPct.toFixed(1)}%
        </Badge>
      </div>

      <div className="grid grid-cols-2 gap-3 text-xs">
        {opportunity.legs.map((leg, index) => (
          <div key={index}>
            <p className="text-muted-foreground mb-1">{leg.outcome}</p>
            <p className="font-medium">{leg.sportsbook} • ${leg.stake.toLocaleString()}</p>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between mt-3 pt-3 border-t border-border">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Clock className="w-3 h-3" />
          <span>Valid for {formatValidityTime(opportunity.validityWindow)}</span>
        </div>
        <Button 
          size="sm" 
          onClick={handleSimulate}
          data-testid={`button-simulate-${opportunity.id}`}
        >
          Simulate
        </Button>
      </div>
    </div>
  );
}
