import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart, LineChart, Line, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { TrendingUp, BarChart3, PieChart as PieChartIcon, Clock, Target, DollarSign } from "lucide-react";

const COLORS = ['hsl(217, 91%, 60%)', 'hsl(159, 100%, 36%)', 'hsl(42, 92%, 56%)', 'hsl(147, 78%, 42%)', 'hsl(341, 75%, 51%)'];

// Mock data - in production this would come from APIs
const mockProfitabilityData = [
  { month: 'Jan', profit: 450, opportunities: 12 },
  { month: 'Feb', profit: 380, opportunities: 8 },
  { month: 'Mar', profit: 620, opportunities: 15 },
  { month: 'Apr', profit: 290, opportunities: 6 },
  { month: 'May', profit: 540, opportunities: 13 },
  { month: 'Jun', profit: 670, opportunities: 18 },
];

const mockSportBreakdown = [
  { name: 'Basketball', value: 35, profit: 1250 },
  { name: 'Football', value: 28, profit: 980 },
  { name: 'Baseball', value: 20, profit: 650 },
  { name: 'Soccer', value: 17, profit: 420 },
];

const mockBookmakerPerformance = [
  { name: 'DraftKings', opportunities: 45, avgProfit: 2.8, reliability: 92 },
  { name: 'FanDuel', opportunities: 38, avgProfit: 3.1, reliability: 89 },
  { name: 'Caesars', opportunities: 32, avgProfit: 2.5, reliability: 95 },
  { name: 'BetMGM', opportunities: 28, avgProfit: 3.4, reliability: 87 },
  { name: 'PointsBet', opportunities: 22, avgProfit: 2.9, reliability: 84 },
];

const mockLatencyData = [
  { provider: 'OddsAPI', avgLatency: 1.2, uptime: 99.5 },
  { provider: 'DraftKings', avgLatency: 0.8, uptime: 99.8 },
  { provider: 'FanDuel', avgLatency: 1.1, uptime: 99.2 },
  { provider: 'Caesars', avgLatency: 1.5, uptime: 98.9 },
];

export default function Analytics() {
  const [timeRange, setTimeRange] = useState("30d");
  const [sportFilter, setSportFilter] = useState("");

  const { data: sports = [] } = useQuery({
    queryKey: ["/api/sports"]
  });

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Analytics</h1>
          <p className="text-sm text-muted-foreground">Performance insights and historical analysis</p>
        </div>
        <div className="flex items-center gap-4">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-32" data-testid="select-time-range">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
              <SelectItem value="1y">Last year</SelectItem>
            </SelectContent>
          </Select>
          <Select value={sportFilter} onValueChange={setSportFilter}>
            <SelectTrigger className="w-40" data-testid="select-sport-filter">
              <SelectValue placeholder="All Sports" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Sports</SelectItem>
              <SelectItem value="basketball">Basketball</SelectItem>
              <SelectItem value="football">Football</SelectItem>
              <SelectItem value="baseball">Baseball</SelectItem>
              <SelectItem value="soccer">Soccer</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Opportunities</p>
                <p className="text-2xl font-bold">147</p>
              </div>
              <TrendingUp className="w-8 h-8 text-primary" />
            </div>
            <p className="text-xs text-green-500 mt-2">+12% from last period</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Avg Profit Margin</p>
                <p className="text-2xl font-bold">2.8%</p>
              </div>
              <Target className="w-8 h-8 text-green-500" />
            </div>
            <p className="text-xs text-green-500 mt-2">+0.3% improvement</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Success Rate</p>
                <p className="text-2xl font-bold">89%</p>
              </div>
              <BarChart3 className="w-8 h-8 text-blue-500" />
            </div>
            <p className="text-xs text-blue-500 mt-2">Consistent performance</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Profit</p>
                <p className="text-2xl font-bold text-green-500">$3,300</p>
              </div>
              <DollarSign className="w-8 h-8 text-green-500" />
            </div>
            <p className="text-xs text-green-500 mt-2">ROI: 18.5%</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="profitability" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="profitability" data-testid="tab-profitability">Profitability</TabsTrigger>
          <TabsTrigger value="sports" data-testid="tab-sports">Sports Analysis</TabsTrigger>
          <TabsTrigger value="bookmakers" data-testid="tab-bookmakers">Bookmakers</TabsTrigger>
          <TabsTrigger value="performance" data-testid="tab-performance">Performance</TabsTrigger>
        </TabsList>

        <TabsContent value="profitability" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Profit & Opportunities Over Time</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={mockProfitabilityData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(217, 32%, 20%)" />
                  <XAxis dataKey="month" stroke="hsl(215, 20%, 65%)" />
                  <YAxis yAxisId="profit" orientation="left" stroke="hsl(215, 20%, 65%)" />
                  <YAxis yAxisId="opportunities" orientation="right" stroke="hsl(215, 20%, 65%)" />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(217, 32%, 15%)', 
                      border: '1px solid hsl(217, 32%, 20%)',
                      borderRadius: '8px'
                    }}
                  />
                  <Line 
                    yAxisId="profit" 
                    type="monotone" 
                    dataKey="profit" 
                    stroke="hsl(159, 100%, 36%)" 
                    strokeWidth={2}
                    name="Profit ($)"
                  />
                  <Line 
                    yAxisId="opportunities" 
                    type="monotone" 
                    dataKey="opportunities" 
                    stroke="hsl(217, 91%, 60%)" 
                    strokeWidth={2}
                    name="Opportunities"
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sports" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Opportunities by Sport</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={mockSportBreakdown}
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                      label={({ name, value }) => `${name}: ${value}%`}
                    >
                      {mockSportBreakdown.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(217, 32%, 15%)', 
                        border: '1px solid hsl(217, 32%, 20%)',
                        borderRadius: '8px'
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Profit by Sport</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {mockSportBreakdown.map((sport, index) => (
                    <div key={sport.name} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div 
                          className="w-3 h-3 rounded-full" 
                          style={{ backgroundColor: COLORS[index % COLORS.length] }}
                        ></div>
                        <span className="font-medium">{sport.name}</span>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-green-500">${sport.profit}</p>
                        <p className="text-xs text-muted-foreground">{sport.value}% of total</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="bookmakers" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Bookmaker Performance</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {mockBookmakerPerformance.map((bookmaker) => (
                  <div key={bookmaker.name} className="border border-border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-medium">{bookmaker.name}</h3>
                      <Badge variant="secondary">
                        {bookmaker.reliability}% Reliable
                      </Badge>
                    </div>
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">Opportunities</p>
                        <p className="font-bold">{bookmaker.opportunities}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Avg Profit</p>
                        <p className="font-bold text-green-500">{bookmaker.avgProfit}%</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Reliability</p>
                        <p className="font-bold">{bookmaker.reliability}%</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="performance" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Provider Latency</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={mockLatencyData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(217, 32%, 20%)" />
                    <XAxis dataKey="provider" stroke="hsl(215, 20%, 65%)" />
                    <YAxis stroke="hsl(215, 20%, 65%)" />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(217, 32%, 15%)', 
                        border: '1px solid hsl(217, 32%, 20%)',
                        borderRadius: '8px'
                      }}
                    />
                    <Bar dataKey="avgLatency" fill="hsl(217, 91%, 60%)" name="Avg Latency (s)" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>System Uptime</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {mockLatencyData.map((provider) => (
                    <div key={provider.provider} className="flex items-center justify-between">
                      <span className="font-medium">{provider.provider}</span>
                      <div className="flex items-center gap-2">
                        <div className="w-20 bg-muted rounded-full h-2">
                          <div 
                            className="bg-green-500 h-2 rounded-full" 
                            style={{ width: `${provider.uptime}%` }}
                          ></div>
                        </div>
                        <span className="text-sm font-bold">{provider.uptime}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Recent Recommendations</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-start gap-3 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                  <div>
                    <p className="text-sm font-medium">NBA games show highest edge frequency</p>
                    <p className="text-xs text-muted-foreground">
                      Tuesday-Thursday evenings between 7-9 PM EST have 23% more arbitrage opportunities
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3 p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
                  <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
                  <div>
                    <p className="text-sm font-medium">Moneyline markets most profitable</p>
                    <p className="text-xs text-muted-foreground">
                      Focus on moneyline bets for 18% higher average profit margins compared to spreads
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                  <div className="w-2 h-2 bg-amber-500 rounded-full mt-2"></div>
                  <div>
                    <p className="text-sm font-medium">Consider reducing stakes on low-confidence opportunities</p>
                    <p className="text-xs text-muted-foreground">
                      Opportunities with &lt;80% confidence score have 35% higher failure rate
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
