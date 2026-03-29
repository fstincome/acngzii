import { useMemo, useState } from "react";
import { useOrders, useProducts, PAYMENT_LABELS } from "@/lib/restaurant-store";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { TrendingUp, DollarSign, Package, ShoppingCart } from "lucide-react";
import type { OrderItem } from "@/lib/restaurant-store";

const COLORS = ["hsl(234,85%,60%)", "hsl(174,62%,47%)", "hsl(38,92%,50%)", "hsl(0,72%,55%)", "hsl(160,64%,43%)"];

type Period = "today" | "week" | "month" | "all";

export default function RestaurantAnalytics() {
  const { data: orders = [] } = useOrders();
  const { data: products = [] } = useProducts();
  const [period, setPeriod] = useState<Period>("month");

  const { data: allItems = [] } = useQuery({
    queryKey: ["all-order-items"],
    queryFn: async () => {
      const { data, error } = await supabase.from("order_items").select("*");
      if (error) throw error;
      return (data ?? []) as OrderItem[];
    },
  });

  const now = new Date();
  const getStart = (p: Period) => {
    const d = new Date(now);
    if (p === "today") { d.setHours(0, 0, 0, 0); return d; }
    if (p === "week") { d.setDate(d.getDate() - 7); return d; }
    if (p === "month") { d.setMonth(d.getMonth() - 1); return d; }
    return new Date(0);
  };

  const filteredOrders = useMemo(() => {
    const start = getStart(period);
    return orders.filter(o => new Date(o.created_at) >= start);
  }, [orders, period]);

  const paidOrders = filteredOrders.filter(o => o.payment_status !== "unpaid" && o.status !== "cancelled");
  const revenue = paidOrders.reduce((s, o) => s + o.total_amount, 0);

  const productMap = useMemo(() => {
    const m = new Map<string, typeof products[0]>();
    products.forEach(p => m.set(p.id, p));
    return m;
  }, [products]);

  // Profit — use order_items when available, fallback to avg margin estimate
  const profit = useMemo(() => {
    const paidIds = new Set(paidOrders.map(o => o.id));
    const itemsForPaid = allItems.filter(i => paidIds.has(i.order_id));

    // Calculate precise profit from items that have matching products
    let preciseProfit = 0;
    let preciseRevenue = 0;
    itemsForPaid.forEach(i => {
      const p = productMap.get(i.product_id);
      if (p) {
        preciseProfit += (p.price - p.cost_price) * i.quantity;
        preciseRevenue += p.price * i.quantity;
      }
    });

    // For orders without items, estimate using avg margin
    const ordersWithItems = new Set(itemsForPaid.map(i => i.order_id));
    const revenueWithoutItems = paidOrders
      .filter(o => !ordersWithItems.has(o.id))
      .reduce((s, o) => s + o.total_amount, 0);

    if (revenueWithoutItems > 0 && products.length > 0) {
      const avgMargin = products.reduce((s, p) => s + (p.price > 0 ? (p.price - p.cost_price) / p.price : 0), 0) / products.length;
      preciseProfit += Math.round(revenueWithoutItems * avgMargin);
    }

    return preciseProfit;
  }, [paidOrders, allItems, productMap, products]);

  // Top products
  const topProducts = useMemo(() => {
    const paidIds = new Set(paidOrders.map(o => o.id));
    const counts: Record<string, number> = {};
    allItems.filter(i => paidIds.has(i.order_id)).forEach(i => {
      counts[i.product_id] = (counts[i.product_id] || 0) + i.quantity;
    });
    return Object.entries(counts)
      .map(([id, qty]) => ({ name: productMap.get(id)?.name || "?", qty }))
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 5);
  }, [paidOrders, allItems, productMap]);

  // Daily revenue chart
  const dailyRevenue = useMemo(() => {
    const map: Record<string, number> = {};
    paidOrders.forEach(o => {
      const day = new Date(o.created_at).toLocaleDateString("fr", { day: "2-digit", month: "short" });
      map[day] = (map[day] || 0) + o.total_amount;
    });
    return Object.entries(map).map(([day, amount]) => ({ day, amount }));
  }, [paidOrders]);

  // Payment distribution
  const paymentDist = useMemo(() => {
    const map: Record<string, number> = {};
    paidOrders.forEach(o => {
      const label = PAYMENT_LABELS[o.payment_status] || o.payment_status;
      map[label] = (map[label] || 0) + 1;
    });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [paidOrders]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Analytiques Restaurant</h1>
        <p className="text-muted-foreground">Performance et revenus</p>
      </div>

      <Tabs value={period} onValueChange={v => setPeriod(v as Period)}>
        <TabsList>
          <TabsTrigger value="today">Aujourd'hui</TabsTrigger>
          <TabsTrigger value="week">Semaine</TabsTrigger>
          <TabsTrigger value="month">Mois</TabsTrigger>
          <TabsTrigger value="all">Tout</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card><CardContent className="pt-4 flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center"><DollarSign className="h-5 w-5 text-primary" /></div>
          <div><p className="text-xl font-bold">{revenue.toLocaleString()}</p><p className="text-xs text-muted-foreground">Revenus (BIF)</p></div>
        </CardContent></Card>
        <Card><CardContent className="pt-4 flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-success/10 flex items-center justify-center"><TrendingUp className="h-5 w-5 text-success" /></div>
          <div><p className="text-xl font-bold">{profit.toLocaleString()}</p><p className="text-xs text-muted-foreground">Profit (BIF)</p></div>
        </CardContent></Card>
        <Card><CardContent className="pt-4 flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-accent/10 flex items-center justify-center"><ShoppingCart className="h-5 w-5 text-accent" /></div>
          <div><p className="text-xl font-bold">{filteredOrders.length}</p><p className="text-xs text-muted-foreground">Commandes</p></div>
        </CardContent></Card>
        <Card><CardContent className="pt-4 flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-warning/10 flex items-center justify-center"><Package className="h-5 w-5 text-warning" /></div>
          <div><p className="text-xl font-bold">{products.filter(p => p.stock === 0).length}</p><p className="text-xs text-muted-foreground">Rupture de stock</p></div>
        </CardContent></Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Daily revenue */}
        <Card>
          <CardHeader><CardTitle className="text-base">Revenus par jour</CardTitle></CardHeader>
          <CardContent>
            {dailyRevenue.length === 0 ? <p className="text-muted-foreground text-sm py-8 text-center">Pas de données</p> : (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={dailyRevenue}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="day" fontSize={12} />
                  <YAxis fontSize={12} />
                  <Tooltip formatter={(v: number) => `${v.toLocaleString()} BIF`} />
                  <Bar dataKey="amount" fill="hsl(234,85%,60%)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Top products */}
        <Card>
          <CardHeader><CardTitle className="text-base">Produits les plus vendus</CardTitle></CardHeader>
          <CardContent>
            {topProducts.length === 0 ? <p className="text-muted-foreground text-sm py-8 text-center">Pas de données</p> : (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={topProducts} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" fontSize={12} />
                  <YAxis type="category" dataKey="name" fontSize={12} width={100} />
                  <Tooltip />
                  <Bar dataKey="qty" fill="hsl(174,62%,47%)" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Payment distribution */}
        <Card>
          <CardHeader><CardTitle className="text-base">Méthodes de paiement</CardTitle></CardHeader>
          <CardContent>
            {paymentDist.length === 0 ? <p className="text-muted-foreground text-sm py-8 text-center">Pas de données</p> : (
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie data={paymentDist} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                    {paymentDist.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
