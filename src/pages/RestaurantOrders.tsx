import { useState, useMemo } from "react";
import { useOrders, useOrdersRealtime, useProducts, useUpdateOrderStatus, useUpdatePaymentStatus, STATUS_LABELS, STATUS_COLORS, PAYMENT_LABELS, ORDER_STATUSES } from "@/lib/restaurant-store";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ClipboardList, Clock, ChefHat, CheckCircle, Truck, XCircle, CreditCard } from "lucide-react";
import { toast } from "sonner";
import type { OrderItem } from "@/lib/restaurant-store";

const STATUS_ICONS: Record<string, React.ReactNode> = {
  pending: <Clock className="h-4 w-4" />,
  confirmed: <ClipboardList className="h-4 w-4" />,
  preparing: <ChefHat className="h-4 w-4" />,
  ready: <CheckCircle className="h-4 w-4" />,
  delivered: <Truck className="h-4 w-4" />,
  cancelled: <XCircle className="h-4 w-4" />,
};

export default function RestaurantOrders() {
  useOrdersRealtime();
  const { data: orders = [] } = useOrders();
  const { data: products = [] } = useProducts();
  const updateStatus = useUpdateOrderStatus();
  const updatePayment = useUpdatePaymentStatus();
  const [selectedOrder, setSelectedOrder] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState("active");

  const { data: selectedItems = [] } = useQuery({
    queryKey: ["order-items", selectedOrder],
    queryFn: async () => {
      if (!selectedOrder) return [];
      const { data, error } = await supabase.from("order_items").select("*").eq("order_id", selectedOrder);
      if (error) throw error;
      return (data ?? []) as OrderItem[];
    },
    enabled: !!selectedOrder,
  });

  const filtered = useMemo(() => {
    if (statusFilter === "active") return orders.filter(o => !["delivered", "cancelled"].includes(o.status));
    if (statusFilter === "all") return orders;
    return orders.filter(o => o.status === statusFilter);
  }, [orders, statusFilter]);

  const productMap = useMemo(() => {
    const m = new Map<string, string>();
    products.forEach(p => m.set(p.id, p.name));
    return m;
  }, [products]);

  const selOrder = orders.find(o => o.id === selectedOrder);

  const nextStatus = (current: string) => {
    const flow: Record<string, string> = {
      pending: "confirmed",
      confirmed: "preparing",
      preparing: "ready",
      ready: "delivered",
    };
    return flow[current];
  };

  const handleStatusChange = async (orderId: string, status: string) => {
    try {
      await updateStatus.mutateAsync({ id: orderId, status });
      toast.success(`Statut → ${STATUS_LABELS[status]}`);
    } catch {
      toast.error("Erreur");
    }
  };

  const handlePayment = async (orderId: string, method: string) => {
    try {
      await updatePayment.mutateAsync({ id: orderId, payment_status: method, payment_method: method === "unpaid" ? undefined : method });
      toast.success("Paiement mis à jour");
    } catch {
      toast.error("Erreur");
    }
  };

  const today = new Date().toDateString();
  const todayOrders = orders.filter(o => new Date(o.created_at).toDateString() === today);
  const todayRevenue = todayOrders.filter(o => o.payment_status !== "unpaid").reduce((s, o) => s + o.total_amount, 0);
  const pendingCount = orders.filter(o => o.status === "pending").length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Commandes Restaurant</h1>
        <p className="text-muted-foreground">Gestion en temps réel</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card><CardContent className="pt-4 text-center"><p className="text-2xl font-bold">{todayOrders.length}</p><p className="text-xs text-muted-foreground">Commandes aujourd'hui</p></CardContent></Card>
        <Card><CardContent className="pt-4 text-center"><p className="text-2xl font-bold text-primary">{todayRevenue.toLocaleString()}</p><p className="text-xs text-muted-foreground">Revenus (BIF)</p></CardContent></Card>
        <Card><CardContent className="pt-4 text-center"><p className="text-2xl font-bold text-warning">{pendingCount}</p><p className="text-xs text-muted-foreground">En attente</p></CardContent></Card>
        <Card><CardContent className="pt-4 text-center"><p className="text-2xl font-bold text-success">{todayOrders.filter(o => o.status === "delivered").length}</p><p className="text-xs text-muted-foreground">Livrées</p></CardContent></Card>
      </div>

      {/* Filter tabs */}
      <Tabs value={statusFilter} onValueChange={setStatusFilter}>
        <TabsList className="w-full">
          <TabsTrigger value="active" className="flex-1">Actives</TabsTrigger>
          <TabsTrigger value="pending" className="flex-1">En attente</TabsTrigger>
          <TabsTrigger value="preparing" className="flex-1">Préparation</TabsTrigger>
          <TabsTrigger value="ready" className="flex-1">Prêtes</TabsTrigger>
          <TabsTrigger value="all" className="flex-1">Toutes</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Orders list */}
      <div className="space-y-3">
        {filtered.length === 0 && <p className="text-center text-muted-foreground py-8">Aucune commande</p>}
        {filtered.map(order => (
          <Card key={order.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setSelectedOrder(order.id)}>
            <CardContent className="py-3 px-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-sm">{order.order_code}</span>
                    <Badge variant="outline" className={STATUS_COLORS[order.status]}>
                      {STATUS_ICONS[order.status]}
                      <span className="ml-1">{STATUS_LABELS[order.status]}</span>
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Table {order.table_number} • {order.visitor_id} • {new Date(order.created_at).toLocaleTimeString("fr")}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-bold">{order.total_amount.toLocaleString()} BIF</p>
                  <Badge variant="outline" className="text-xs">
                    {PAYMENT_LABELS[order.payment_status] || order.payment_status}
                  </Badge>
                </div>
              </div>
              {/* Quick action */}
              {nextStatus(order.status) && (
                <Button size="sm" className="mt-2 w-full" onClick={(e) => { e.stopPropagation(); handleStatusChange(order.id, nextStatus(order.status)!); }}>
                  → {STATUS_LABELS[nextStatus(order.status)!]}
                </Button>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Order detail dialog */}
      <Dialog open={!!selectedOrder} onOpenChange={() => setSelectedOrder(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{selOrder?.order_code}</DialogTitle>
          </DialogHeader>
          {selOrder && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div><span className="text-muted-foreground">Table:</span> {selOrder.table_number}</div>
                <div><span className="text-muted-foreground">Visiteur:</span> {selOrder.visitor_id}</div>
                <div><span className="text-muted-foreground">Date:</span> {new Date(selOrder.created_at).toLocaleString("fr")}</div>
                <div><span className="text-muted-foreground">Total:</span> <strong>{selOrder.total_amount.toLocaleString()} BIF</strong></div>
              </div>

              <div className="border rounded-lg p-3 space-y-1">
                <p className="font-medium text-sm mb-2">Articles</p>
                {selectedItems.map(item => (
                  <div key={item.id} className="flex justify-between text-sm">
                    <span>{productMap.get(item.product_id) || "Produit"} ×{item.quantity}</span>
                    <span>{(item.unit_price * item.quantity).toLocaleString()} BIF</span>
                  </div>
                ))}
              </div>

              {/* Status */}
              <div>
                <label className="text-sm font-medium mb-1 block">Statut</label>
                <Select value={selOrder.status} onValueChange={(s) => handleStatusChange(selOrder.id, s)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ORDER_STATUSES.map(s => (
                      <SelectItem key={s} value={s}>{STATUS_LABELS[s]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Payment */}
              <div>
                <label className="text-sm font-medium mb-1 block">Paiement</label>
                <Select value={selOrder.payment_status} onValueChange={(s) => handlePayment(selOrder.id, s)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unpaid">Non payé</SelectItem>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="mobile_money">Mobile Money</SelectItem>
                    <SelectItem value="bitcoin">Bitcoin</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {selOrder.status !== "cancelled" && selOrder.status !== "delivered" && (
                <Button variant="destructive" className="w-full" onClick={() => handleStatusChange(selOrder.id, "cancelled")}>
                  Annuler la commande
                </Button>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
