import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DatePickerWithRange } from "@/components/ui/date-range-picker";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from "recharts";
import { DateRange } from "react-day-picker";
import { TrendingUp, TrendingDown, DollarSign, Download, Calendar, Filter } from "lucide-react";

// Mock data - in production this would come from APIs
const mockPnLData = [
  { date: '2024-01-01', realized: 120, unrealized: 45, fees: -15, net: 150 },
  { date: '2024-01-02', realized: 200, unrealized: -30, fees: -12, net: 158 },
  { date: '2024-01-03', realized: 80, unrealized: 120, fees: -18, net: 182 },
  { date: '2024-01-04', realized: 300, unrealized: 60, fees: -25, net: 335 },
  { date: '2024-01-05', realized: 150, unrealized: -40, fees: -20, net: 90 },
  { date: '2024-01-06', realized: 250, unrealized: 80, fees: -22, net: 308 },
  { date: '2024-01-07', realized: 180, unrealized: 100, fees: -19, net: 261 },
];

const mockCostBreakdown = [
  { category: 'API Calls', amount: 245, percentage: 45 },
  { category: 'Compute Costs', amount: 180, percentage: 33 },
  { category: 'Data Storage', amount: 75, percentage: 14 },
  { category: 'Misc', amount: 45, percentage: 8 },
];

const mockTransactions = [
  { id: '1', date: '2024-01-07', type: 'realized', description: 'Lakers vs Warriors ML Arb', amount: 85, sport: 'Basketball' },
  { id: '2', date: '2024-01-07', type: 'fee', description: 'DraftKings placement fee', amount: -5, sport: 'Basketball' },
  { id: '3', date: '2024-01-06', type: 'realized', description: 'Ravens vs Steelers O/U', amount: 120, sport: 'Football' },
  { id: '4', date: '2024-01-06', type: 'unrealized', description: 'Celtics +6.5 position', amount: 45, sport: 'Basketball' },
  { id: '5', date: '2024-01-05', type: 'realized', description: 'Arsenal Win hedge', amount: 67, sport: 'Soccer' },
];

export default function PnL() {
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [sportFilter, setSportFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");

  const { data: pnlSummary } = useQuery({
    queryKey: ["/api/pnl", dateRange],
    select: (data) => ({
      realized: 2847,
      unrealized: 456,
      fees: -234,
      net: 3069,
      roi: 18.5
    })
  });

  const { data: costs } = useQuery({
    queryKey: ["/api/costs"],
    select: () => mockCostBreakdown
  });

  const handleExportCSV = () => {
    // In production, this would generate and download a CSV file
    console.log("Exporting PnL data to CSV...");
  };

  const filteredTransactions = mockTransactions.filter(transaction => {
    if (sportFilter && transaction.sport.toLowerCase() !== sportFilter) return false;
    if (typeFilter && transaction.type !== typeFilter) return false;
    return true;
  });

  const totalCosts = mockCostBreakdown.reduce((sum, cost) => sum + cost.amount, 0);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">PnL & Expenses</h1>
          <p className="text-sm text-muted-foreground">Track your profitability and system costs</p>
        </div>
        <div className="flex items-center gap-4">
          <DatePickerWithRange
            date={dateRange}
            onDateChange={setDateRange}
          />
          <Button 
            variant="outline" 
            onClick={handleExportCSV}
            data-testid="button-export-csv"
          >
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Realized PnL</p>
                <p className="text-2xl font-bold text-green-500">
                  ${pnlSummary?.realized.toLocaleString() || '0'}
                </p>
              </div>
              <TrendingUp className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Unrealized PnL</p>
                <p className="text-2xl font-bold text-blue-500">
                  ${pnlSummary?.unrealized.toLocaleString() || '0'}
                </p>
              </div>
              <DollarSign className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Fees</p>
                <p className="text-2xl font-bold text-red-500">
                  ${Math.abs(pnlSummary?.fees || 0).toLocaleString()}
                </p>
              </div>
              <TrendingDown className="w-8 h-8 text-red-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Net PnL</p>
                <p className="text-2xl font-bold text-green-500">
                  ${pnlSummary?.net.toLocaleString() || '0'}
                </p>
              </div>
              <DollarSign className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">ROI</p>
                <p className="text-2xl font-bold text-green-500">
                  {pnlSummary?.roi.toFixed(1) || '0.0'}%
                </p>
              </div>
              <TrendingUp className="w-8 h-8 text-green-500" />
            </div>
            <p className="text-xs text-muted-foreground mt-2">Annualized</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="pnl" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="pnl" data-testid="tab-pnl">PnL Overview</TabsTrigger>
          <TabsTrigger value="costs" data-testid="tab-costs">Cost Analysis</TabsTrigger>
          <TabsTrigger value="transactions" data-testid="tab-transactions">Transactions</TabsTrigger>
        </TabsList>

        <TabsContent value="pnl" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>PnL Over Time</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={mockPnLData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(217, 32%, 20%)" />
                  <XAxis dataKey="date" stroke="hsl(215, 20%, 65%)" />
                  <YAxis stroke="hsl(215, 20%, 65%)" />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(217, 32%, 15%)', 
                      border: '1px solid hsl(217, 32%, 20%)',
                      borderRadius: '8px'
                    }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="realized" 
                    stroke="hsl(159, 100%, 36%)" 
                    strokeWidth={2}
                    name="Realized"
                  />
                  <Line 
                    type="monotone" 
                    dataKey="unrealized" 
                    stroke="hsl(217, 91%, 60%)" 
                    strokeWidth={2}
                    name="Unrealized"
                  />
                  <Line 
                    type="monotone" 
                    dataKey="net" 
                    stroke="hsl(42, 92%, 56%)" 
                    strokeWidth={2}
                    name="Net PnL"
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="costs" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Cost Breakdown</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={mockCostBreakdown}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(217, 32%, 20%)" />
                    <XAxis dataKey="category" stroke="hsl(215, 20%, 65%)" />
                    <YAxis stroke="hsl(215, 20%, 65%)" />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(217, 32%, 15%)', 
                        border: '1px solid hsl(217, 32%, 20%)',
                        borderRadius: '8px'
                      }}
                    />
                    <Bar dataKey="amount" fill="hsl(0, 62%, 30%)" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Cost Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-lg font-semibold">Total Monthly Costs</span>
                    <span className="text-lg font-bold text-red-500">${totalCosts}</span>
                  </div>
                  
                  <div className="space-y-3">
                    {mockCostBreakdown.map((cost) => (
                      <div key={cost.category} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{cost.category}</span>
                          <Badge variant="outline">{cost.percentage}%</Badge>
                        </div>
                        <span className="font-bold text-red-500">${cost.amount}</span>
                      </div>
                    ))}
                  </div>

                  <div className="pt-4 border-t border-border">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">Cost per $1 Profit</span>
                      <span className="font-bold">$0.18</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="transactions" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Recent Transactions</CardTitle>
                <div className="flex items-center gap-2">
                  <Select value={sportFilter} onValueChange={setSportFilter}>
                    <SelectTrigger className="w-32" data-testid="select-sport-filter">
                      <SelectValue placeholder="All Sports" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Sports</SelectItem>
                      <SelectItem value="basketball">Basketball</SelectItem>
                      <SelectItem value="football">Football</SelectItem>
                      <SelectItem value="soccer">Soccer</SelectItem>
                    </SelectContent>
                  </Select>
                  
                  <Select value={typeFilter} onValueChange={setTypeFilter}>
                    <SelectTrigger className="w-32" data-testid="select-type-filter">
                      <SelectValue placeholder="All Types" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      <SelectItem value="realized">Realized</SelectItem>
                      <SelectItem value="unrealized">Unrealized</SelectItem>
                      <SelectItem value="fee">Fees</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {filteredTransactions.map((transaction) => (
                  <div key={transaction.id} className="flex items-center justify-between border border-border rounded-lg p-4">
                    <div className="flex items-center gap-4">
                      <div className={`w-3 h-3 rounded-full ${
                        transaction.type === 'realized' ? 'bg-green-500' :
                        transaction.type === 'unrealized' ? 'bg-blue-500' :
                        'bg-red-500'
                      }`}></div>
                      <div>
                        <p className="font-medium">{transaction.description}</p>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <span>{transaction.date}</span>
                          <span>•</span>
                          <Badge variant="outline" className="text-xs">
                            {transaction.sport}
                          </Badge>
                          <Badge variant="outline" className="text-xs capitalize">
                            {transaction.type}
                          </Badge>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`font-bold ${
                        transaction.amount > 0 ? 'text-green-500' : 'text-red-500'
                      }`}>
                        {transaction.amount > 0 ? '+' : ''}${Math.abs(transaction.amount)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
