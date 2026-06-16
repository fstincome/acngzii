import { useState, useEffect, useMemo } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, ClipboardList, ChefHat, CheckCircle, Truck, XCircle, UtensilsCrossed } from "lucide-react";
import { STATUS_LABELS, PAYMENT_LABELS } from "@/lib/restaurant-store";
import type { Order, OrderItem } from "@/lib/restaurant-store";

const STATUS_STEPS = ["pending", "confirmed", "preparing", "ready", "delivered"];

const STATUS_ICONS: Record<string, React.ReactNode> = {
  pending: <Clock className="h-6 w-6" />,
  confirmed: <ClipboardList className="h-6 w-6" />,
  preparing: <ChefHat className="h-6 w-6" />,
  ready: <CheckCircle className="h-6 w-6" />,
  delivered: <Truck className="h-6 w-6" />,
  cancelled: <XCircle className="h-6 w-6" />,
};

const STATUS_BG_COLORS: Record<string, string> = {
  pending: "from-amber-400 to-orange-500",
  confirmed: "from-blue-400 to-blue-600",
  preparing: "from-purple-400 to-purple-600",
  ready: "from-emerald-400 to-green-600",
  delivered: "from-gray-400 to-gray-600",
  cancelled: "from-red-400 to-red-600",
};

export default function OrderTracking() {
  const { orderCode } = useParams<{ orderCode: string }>();
  const [expired, setExpired] = useState(false);

  const { data: order, isLoading } = useQuery({
    queryKey: ["track-order", orderCode],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("*")
        .eq("order_code", orderCode)
        .maybeSingle();
      if (error) throw error;
      return data as Order | null;
    },
    refetchInterval: 5000,
    enabled: !!orderCode && !expired,
  });

  const { data: items = [] } = useQuery({
    queryKey: ["track-order-items", order?.id],
    queryFn: async () => {
      if (!order?.id) return [];
      const { data, error } = await supabase.from("order_items").select("*").eq("order_id", order.id);
      if (error) throw error;
      return (data ?? []) as OrderItem[];
    },
    enabled: !!order?.id,
  });

  const { data: products = [] } = useQuery({
    queryKey: ["track-products"],
    queryFn: async () => {
      const { data } = await supabase.from("products").select("id, name");
      return data ?? [];
    },
  });

  const productMap = useMemo(() => {
    const m = new Map<string, string>();
    products.forEach((p: { id: string; name: string }) => m.set(p.id, p.name));
    return m;
  }, [products]);

  // Check if link should expire (1h after delivered/cancelled)
  useEffect(() => {
    if (!order) return;
    if (order.status === "delivered" || order.status === "cancelled") {
      const orderTime = new Date(order.created_at).getTime();
      const now = Date.now();
      // Check every 10s if 1h has passed since the order was last updated
      // We use created_at as proxy; in production you'd use an updated_at column
      const checkExpiry = () => {
        // 1 hour after final status
        const elapsed = Date.now() - now;
        if (elapsed > 3600000) {
          setExpired(true);
        }
      };
      const interval = setInterval(checkExpiry, 10000);
      // Also check if order was finalized more than 1h ago (rough check)
      const hourAgo = now - 3600000;
      if (orderTime < hourAgo) {
        // Order is old, check via a heuristic
        setExpired(true);
      }
      return () => clearInterval(interval);
    }
  }, [order]);

  if (expired) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <Card className="w-full max-w-sm text-center">
          <CardContent className="pt-8 space-y-4">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-muted">
              <XCircle className="h-8 w-8 text-muted-foreground" />
            </div>
            <h2 className="text-xl font-bold">Link expired</h2>
            <p className="text-muted-foreground">Ce lien de suivi n'est plus disponible.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <p className="text-muted-foreground">Chargement...</p>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <Card className="w-full max-w-sm text-center">
          <CardContent className="pt-8 space-y-4">
            <h2 className="text-xl font-bold">Commande introuvable</h2>
            <p className="text-muted-foreground">Check your order code.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const currentStep = STATUS_STEPS.indexOf(order.status);
  const isCancelled = order.status === "cancelled";
  const bgGradient = STATUS_BG_COLORS[order.status] || STATUS_BG_COLORS.pending;

  return (
    <div className={`min-h-screen bg-gradient-to-br ${bgGradient} transition-all duration-1000 p-4`}>
      <div className="max-w-md mx-auto space-y-4 pt-8">
        {/* Header */}
        <div className="text-center text-white space-y-2">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm">
            <UtensilsCrossed className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold">American Corner Restaurant</h1>
          <p className="text-white/80 text-sm">Suivi de commande</p>
        </div>

        {/* Status Card */}
        <Card className="overflow-hidden shadow-2xl">
          <div className="bg-card p-6 text-center space-y-3">
            <p className="font-mono text-lg font-bold text-primary">{order.order_code}</p>
            <div className="flex items-center justify-center gap-2">
              {STATUS_ICONS[order.status]}
              <span className="text-2xl font-bold">{STATUS_LABELS[order.status]}</span>
            </div>
            {isCancelled && (
              <Badge variant="destructive" className="text-sm">Order cancelled</Badge>
            )}
          </div>

          {/* Progress steps */}
          {!isCancelled && (
            <div className="px-6 py-4 bg-muted/30">
              <div className="flex items-center justify-between">
                {STATUS_STEPS.map((step, i) => {
                  const isActive = i <= currentStep;
                  const isCurrent = i === currentStep;
                  return (
                    <div key={step} className="flex flex-col items-center gap-1 flex-1">
                      <div className={`h-8 w-8 rounded-full flex items-center justify-center transition-all duration-500 ${
                        isCurrent ? "bg-primary text-primary-foreground scale-125 ring-4 ring-primary/30" :
                        isActive ? "bg-primary/80 text-primary-foreground" : "bg-muted text-muted-foreground"
                      }`}>
                        <span className="text-xs">{i + 1}</span>
                      </div>
                      <span className={`text-[10px] text-center leading-tight ${isActive ? "font-semibold text-foreground" : "text-muted-foreground"}`}>
                        {STATUS_LABELS[step]}
                      </span>
                    </div>
                  );
                })}
              </div>
              {/* Progress bar */}
              <div className="mt-3 h-1.5 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full transition-all duration-1000"
                  style={{ width: `${(currentStep / (STATUS_STEPS.length - 1)) * 100}%` }}
                />
              </div>
            </div>
          )}

          {/* Order details */}
          <CardContent className="pt-4 space-y-4">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="bg-muted/50 rounded-lg p-3">
                <p className="text-muted-foreground text-xs">Table</p>
                <p className="font-bold text-lg">{order.table_number}</p>
              </div>
              <div className="bg-muted/50 rounded-lg p-3">
                <p className="text-muted-foreground text-xs">Paiement</p>
                <p className="font-bold">{PAYMENT_LABELS[order.payment_status] || order.payment_status}</p>
              </div>
            </div>

            {/* Items */}
            <div className="border rounded-lg p-3 space-y-2">
              <p className="font-medium text-sm">Items ordered</p>
              {items.map(item => (
                <div key={item.id} className="flex justify-between text-sm">
                  <span>{productMap.get(item.product_id) || "Produit"} ×{item.quantity}</span>
                  <span className="font-medium">{(item.unit_price * item.quantity).toLocaleString()} BIF</span>
                </div>
              ))}
              <div className="border-t pt-2 mt-2 flex justify-between font-bold">
                <span>Total</span>
                <span className="text-primary">{order.total_amount.toLocaleString()} BIF</span>
              </div>
            </div>

            <p className="text-xs text-center text-muted-foreground">
              Ordered on {new Date(order.created_at).toLocaleString("en")}
            </p>
          </CardContent>
        </Card>

        <p className="text-center text-white/60 text-xs">
          This page updates automatically
        </p>
      </div>
    </div>
  );
}
