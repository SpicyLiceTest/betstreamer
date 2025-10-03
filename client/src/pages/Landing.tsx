import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function Landing() {
  const handleLogin = () => {
    window.location.href = "/api/login";
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardContent className="pt-6">
          <div className="text-center space-y-6">
            <div className="space-y-2">
              <h1 className="text-3xl font-bold text-primary">ASBS</h1>
              <p className="text-lg text-muted-foreground">
                Automated Sports Bet Service
              </p>
              <p className="text-sm text-muted-foreground">
                Internal arbitrage detection and hedge management system
              </p>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-center">
                <div className="space-y-1">
                  <div className="text-2xl font-bold text-primary">12</div>
                  <div className="text-xs text-muted-foreground">Live Opportunities</div>
                </div>
                <div className="space-y-1">
                  <div className="text-2xl font-bold text-green-500">2.7%</div>
                  <div className="text-xs text-muted-foreground">Avg Profit</div>
                </div>
              </div>

              <Button 
                onClick={handleLogin}
                className="w-full"
                data-testid="button-login"
              >
                Sign In to Continue
              </Button>

              <div className="text-xs text-muted-foreground space-y-1">
                <p>Internal use only • Authorized users only</p>
                <p>Real-time arbitrage detection • Risk-managed hedging</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
