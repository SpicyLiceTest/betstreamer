import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import {
  BarChart3,
  TrendingUp,
  Shield,
  BarChart,
  Activity,
  DollarSign,
  Settings,
  UserCheck,
  FileText,
  LogOut,
  User,
} from "lucide-react";

const navigationItems = [
  {
    name: "Dashboard",
    href: "/",
    icon: BarChart3,
  },
  {
    name: "Arbitrage",
    href: "/arbitrage",
    icon: TrendingUp,
  },
  {
    name: "Hedge Center",
    href: "/hedge",
    icon: Shield,
  },
  {
    name: "Analytics",
    href: "/analytics",
    icon: BarChart,
  },
  {
    name: "Lines & Odds",
    href: "/lines",
    icon: Activity,
  },
  {
    name: "PnL & Expenses",
    href: "/pnl",
    icon: DollarSign,
  },
  {
    name: "Jobs & Polling",
    href: "/jobs",
    icon: Settings,
  },
];

const adminItems = [
  {
    name: "Admin",
    href: "/admin",
    icon: UserCheck,
  },
  {
    name: "Audit Logs",
    href: "/audit-logs",
    icon: FileText,
  },
];

export default function Sidebar() {
  const [location] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();

  const handleLogout = () => {
    toast({
      title: "Logging out...",
      description: "Redirecting to login page",
    });
    setTimeout(() => {
      window.location.href = "/api/logout";
    }, 500);
  };

  return (
    <aside className="w-64 bg-sidebar border-r border-sidebar-border sidebar-shadow flex flex-col">
      {/* Header */}
      <div className="p-6 border-b border-sidebar-border">
        <h1 className="text-xl font-bold text-sidebar-primary">ASBS</h1>
        <p className="text-sm text-sidebar-foreground/70">Sports Arbitrage System</p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-2">
        {navigationItems.map((item) => {
          const Icon = item.icon;
          const isActive = location === item.href;
          
          return (
            <Link key={item.name} href={item.href}>
              <a
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-md transition-colors",
                  isActive
                    ? "bg-sidebar-primary text-sidebar-primary-foreground"
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                )}
                data-testid={`nav-${item.name.toLowerCase().replace(/\s+/g, '-')}`}
              >
                <Icon className="w-4 h-4" />
                <span>{item.name}</span>
              </a>
            </Link>
          );
        })}

        <div className="pt-4 mt-4 border-t border-sidebar-border space-y-2">
          {adminItems.map((item) => {
            const Icon = item.icon;
            const isActive = location === item.href;
            
            return (
              <Link key={item.name} href={item.href}>
                <a
                  className={cn(
                    "flex items-center gap-3 px-3 py-2 rounded-md transition-colors",
                    isActive
                      ? "bg-sidebar-primary text-sidebar-primary-foreground"
                      : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                  )}
                  data-testid={`nav-${item.name.toLowerCase().replace(/\s+/g, '-')}`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.name}</span>
                </a>
              </Link>
            );
          })}
        </div>
      </nav>

      {/* User Profile */}
      <div className="p-4 border-t border-sidebar-border">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-sidebar-primary rounded-full flex items-center justify-center">
            <User className="w-4 h-4 text-sidebar-primary-foreground" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-sidebar-foreground">
              {user?.firstName && user?.lastName 
                ? `${user.firstName} ${user.lastName}`
                : user?.email || "User"
              }
            </p>
            <p className="text-xs text-sidebar-foreground/70">
              {user?.role === "admin" ? "Admin" : "Member"}
            </p>
          </div>
          <button
            onClick={handleLogout}
            className="text-sidebar-foreground/70 hover:text-sidebar-foreground transition-colors"
            data-testid="button-logout"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
