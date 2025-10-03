import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { HedgeAlertDisplay } from "@/types";

interface HedgeAlertProps {
  alert: HedgeAlertDisplay;
}

export default function HedgeAlert({ alert }: HedgeAlertProps) {
  const handleAction = () => {
    console.log(`${alert.action || 'Review'} hedge alert:`, alert.id);
  };

  const statusStyles = {
    warning: "bg-amber-500/10 border-amber-500/20",
    success: "bg-green-500/10 border-green-500/20",
    info: "bg-blue-500/10 border-blue-500/20"
  };

  const dotStyles = {
    warning: "bg-amber-500",
    success: "bg-green-500", 
    info: "bg-blue-500"
  };

  return (
    <div className={cn("flex items-center gap-3 p-3 border rounded-lg", statusStyles[alert.type])}>
      <div className={cn("w-2 h-2 rounded-full", dotStyles[alert.type])}></div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium">{alert.betDescription}</p>
        <p className="text-xs text-muted-foreground">{alert.suggestion}</p>
      </div>
      <Button 
        size="sm"
        onClick={handleAction}
        data-testid={`button-hedge-${alert.id}`}
      >
        {alert.action || "Review"}
      </Button>
    </div>
  );
}
