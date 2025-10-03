import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatsCardProps {
  title: string;
  value: string;
  change: string;
  icon: LucideIcon;
  variant: "primary" | "success" | "info" | "destructive";
  isLoading?: boolean;
}

export default function StatsCard({
  title,
  value,
  change,
  icon: Icon,
  variant,
  isLoading
}: StatsCardProps) {
  const variantStyles = {
    primary: "bg-primary/10 text-primary",
    success: "bg-green-500/10 text-green-500",
    info: "bg-blue-500/10 text-blue-500",
    destructive: "bg-destructive/10 text-destructive"
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-8 w-16" />
            </div>
            <Skeleton className="w-12 h-12 rounded-lg" />
          </div>
          <Skeleton className="h-3 w-20 mt-2" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold text-foreground">{value}</p>
          </div>
          <div className={cn("w-12 h-12 rounded-lg flex items-center justify-center", variantStyles[variant])}>
            <Icon className="w-6 h-6" />
          </div>
        </div>
        <p className={cn("text-xs mt-2", 
          change.includes('+') ? "text-green-500" : 
          change.includes('-') ? "text-destructive" : 
          "text-muted-foreground"
        )}>
          {change}
        </p>
      </CardContent>
    </Card>
  );
}
