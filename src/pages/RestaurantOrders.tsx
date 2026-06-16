import { useState, useMemo } from "react";
import { useOrders, useOrdersRealtime, useProducts, useUpdateOrderStatus, useUpdatePaymentStatus, useDeleteOrder, useUpdateOrder, STATUS_LABELS, STATUS_COLORS, PAYMENT_LABELS, ORDER_STATUSES, TABLE_COUNT } from "@/lib/restaurant-store";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { ClipboardList, Clock, ChefHat, CheckCircle, Truck, XCircle, Copy, Check, Trash2, Pencil, CalendarIcon } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { OrderItem } from "@/lib/restaurant-store";
import InvoiceActions from "@/components/InvoiceActions";
import type { InvoiceData } from "@/lib/invoice";
import { buildStaffConfirmationMessage } from "@/lib/whatsapp-order";
import { useAuth } from "@/hooks/useAuth";

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
  const { role } = useAuth();
  const isAdmin = role === "admin";
  const { data: orders = [] } = useOrders();
  const { data: products = [] } = useProducts();
  const updateStatus = useUpdateOrderStatus();
  const updatePayment = useUpdatePaymentStatus();
  const deleteOrder = useDeleteOrder();
  const updateOrder = useUpdateOrder();
  const qc = useQueryClient();
  const [selectedOrder, setSelectedOrder] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState("active");
  const [yearFilter, setYearFilter] = useState<string>("all");
  const [monthFilter, setMonthFilter] = useState<string>("all");
  const [customFrom, setCustomFrom] = useState<Date | undefined>(undefined);
  const [customTo, setCustomTo] = useState<Date | undefined>(undefined);
  const [confirmationMsg, setConfirmationMsg] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [editTable, setEditTable] = useState<number>(1);

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

  const MONTH_NAMES = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"];
  const START_YEAR = 2026;
  const START_MONTH = 2; // March (0-indexed)

  const yearOptions = useMemo(() => {
    const now = new Date();
    const opts: number[] = [];
    for (let y = now.getFullYear(); y >= START_YEAR; y--) opts.push(y);
    return opts;
  }, []);

  const monthOptions = useMemo(() => {
    const opts: { value: string; label: string }[] = [];
    const now = new Date();
    const start = new Date(START_YEAR, START_MONTH, 1);
    const cursor = new Date(now.getFullYear(), now.getMonth(), 1);
    while (cursor >= start) {
      const value = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, "0")}`;
      opts.push({ value, label: `${MONTH_NAMES[cursor.getMonth()]} ${cursor.getFullYear()}` });
      cursor.setMonth(cursor.getMonth() - 1);
    }
    return opts;
  }, []);

  const periodOrders = useMemo(() => {
    return orders.filter(o => {
      const d = new Date(o.created_at);
      if (yearFilter !== "all" && d.getFullYear() !== Number(yearFilter)) return false;
      if (monthFilter !== "all") {
        const [y, m] = monthFilter.split("-").map(Number);
        if (d.getFullYear() !== y || d.getMonth() !== m - 1) return false;
      }
      if (customFrom && d < customFrom) return false;
      if (customTo) {
        const end = new Date(customTo);
        end.setHours(23, 59, 59, 999);
        if (d > end) return false;
      }
      return true;
    });
  }, [orders, yearFilter, monthFilter, customFrom, customTo]);

  const filtered = useMemo(() => {
    if (statusFilter === "active") return periodOrders.filter(o => !["delivered", "cancelled"].includes(o.status));
    if (statusFilter === "all") return periodOrders;
    return periodOrders.filter(o => o.status === statusFilter);
  }, [periodOrders, statusFilter]);

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
      const order = orders.find(o => o.id === orderId);
      if (order) {
        const msg = buildStaffConfirmationMessage({ ...order, status }, STATUS_LABELS[status]);
        setConfirmationMsg(msg);
        setCopied(false);
      }
    } catch {
      toast.error("Error");
    }
  };

  const handlePayment = async (orderId: string, method: string) => {
    try {
      await updatePayment.mutateAsync({ id: orderId, payment_status: method, payment_method: method === "unpaid" ? undefined : method });
      toast.success("Paiement mis à jour");
    } catch {
      toast.error("Error");
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await deleteOrder.mutateAsync(deleteId);
      toast.success("Commande supprimée");
      setDeleteId(null);
      if (selectedOrder === deleteId) setSelectedOrder(null);
    } catch {
      toast.error("Error de suppression");
    }
  };

  const handleEditSave = async () => {
    if (!selOrder) return;
    try {
      await updateOrder.mutateAsync({ id: selOrder.id, updates: { table_number: editTable } });
      toast.success("Commande modifiée");
      setEditMode(false);
    } catch {
      toast.error("Error de modification");
    }
  };

  const today = new Date().toDateString();
  const todayOrders = orders.filter(o => new Date(o.created_at).toDateString() === today);
  const todayRevenue = todayOrders.filter(o => o.payment_status !== "unpaid").reduce((s, o) => s + o.total_amount, 0);
  const pendingCount = orders.filter(o => o.status === "pending").length;

  const counts = useMemo(() => ({
    active: periodOrders.filter(o => !["delivered", "cancelled"].includes(o.status)).length,
    pending: periodOrders.filter(o => o.status === "pending").length,
    preparing: periodOrders.filter(o => o.status === "preparing").length,
    ready: periodOrders.filter(o => o.status === "ready").length,
    all: periodOrders.length,
  }), [periodOrders]);

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
        <Card><CardContent className="pt-4 text-center"><p className="text-2xl font-bold text-success">{todayOrders.filter(o => o.status === "delivered").length}</p><p className="text-xs text-muted-foreground">Delivereds</p></CardContent></Card>
      </div>

      {/* Period filters */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Année</label>
          <Select value={yearFilter} onValueChange={setYearFilter}>
            <SelectTrigger><SelectValue placeholder="Année" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes</SelectItem>
              {yearOptions.map(y => (
                <SelectItem key={y} value={String(y)}>{y}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Mois</label>
          <Select value={monthFilter} onValueChange={setMonthFilter}>
            <SelectTrigger><SelectValue placeholder="Mois" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous</SelectItem>
              {monthOptions.map(o => (
                <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Période personnalisée</label>
          <div className="flex gap-2">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className={cn("flex-1 justify-start text-left font-normal", !customFrom && "text-muted-foreground")}>
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {customFrom ? format(customFrom, "dd/MM/yy", { locale: fr }) : "Du"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar mode="single" selected={customFrom} onSelect={setCustomFrom} initialFocus className={cn("p-3 pointer-events-auto")} />
              </PopoverContent>
            </Popover>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className={cn("flex-1 justify-start text-left font-normal", !customTo && "text-muted-foreground")}>
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {customTo ? format(customTo, "dd/MM/yy", { locale: fr }) : "Au"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar mode="single" selected={customTo} onSelect={setCustomTo} initialFocus className={cn("p-3 pointer-events-auto")} />
              </PopoverContent>
            </Popover>
            {(customFrom || customTo) && (
              <Button variant="ghost" size="icon" onClick={() => { setCustomFrom(undefined); setCustomTo(undefined); }}>
                <XCircle className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Status filter tabs */}
      <Tabs value={statusFilter} onValueChange={setStatusFilter}>
        <TabsList className="w-full">
          <TabsTrigger value="active" className="flex-1">Actives ({counts.active})</TabsTrigger>
          <TabsTrigger value="pending" className="flex-1">En attente ({counts.pending})</TabsTrigger>
          <TabsTrigger value="preparing" className="flex-1">Préparation ({counts.preparing})</TabsTrigger>
          <TabsTrigger value="ready" className="flex-1">Readys ({counts.ready})</TabsTrigger>
          <TabsTrigger value="all" className="flex-1">Toutes ({counts.all})</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Orders list */}
      <div className="space-y-3">
        {filtered.length === 0 && <p className="text-center text-muted-foreground py-8">Nonee commande</p>}
        {filtered.map(order => (
          <Card key={order.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => { setSelectedOrder(order.id); setEditMode(false); setEditTable(order.table_number); }}>
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
                <div className="text-right flex items-center gap-2">
                  <div>
                    <p className="font-bold">{order.total_amount.toLocaleString()} BIF</p>
                    <Badge variant="outline" className="text-xs">
                      {PAYMENT_LABELS[order.payment_status] || order.payment_status}
                    </Badge>
                  </div>
                  {isAdmin && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive hover:text-destructive h-8 w-8"
                      onClick={(e) => { e.stopPropagation(); setDeleteId(order.id); }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
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
      <Dialog open={!!selectedOrder} onOpenChange={() => { setSelectedOrder(null); setEditMode(false); }}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle>{selOrder?.order_code}</DialogTitle>
              {isAdmin && selOrder && (
                <div className="flex gap-1">
                  <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => { setEditMode(!editMode); setEditTable(selOrder.table_number); }}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => setDeleteId(selOrder.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
          </DialogHeader>
          {selOrder && (
            <div className="space-y-4">
              {editMode ? (
                <div className="space-y-3 border rounded-lg p-3 bg-muted/50">
                  <p className="text-sm font-medium">Edit la commande</p>
                  <div>
                    <label className="text-sm text-muted-foreground">Table number</label>
                    <Select value={String(editTable)} onValueChange={(v) => setEditTable(Number(v))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: TABLE_COUNT }, (_, i) => i + 1).map(n => (
                          <SelectItem key={n} value={String(n)}>Table {n}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button className="w-full" onClick={handleEditSave}>Save</Button>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div><span className="text-muted-foreground">Table:</span> {selOrder.table_number}</div>
                  <div><span className="text-muted-foreground">Visitor:</span> {selOrder.visitor_id}</div>
                  <div><span className="text-muted-foreground">Date:</span> {new Date(selOrder.created_at).toLocaleString("fr")}</div>
                  <div><span className="text-muted-foreground">Total:</span> <strong>{selOrder.total_amount.toLocaleString()} BIF</strong></div>
                </div>
              )}

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
                    <SelectItem value="unpaid">Unpaid</SelectItem>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="mobile_money">Mobile Money</SelectItem>
                    <SelectItem value="bitcoin">Bitcoin</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Invoice actions */}
              <div>
                <label className="text-sm font-medium mb-1 block">Facture</label>
                <InvoiceActions
                  compact
                  data={{
                    orderCode: selOrder.order_code,
                    visitorId: selOrder.visitor_id,
                    tableNumber: selOrder.table_number,
                    items: selectedItems.map(item => ({
                      name: productMap.get(item.product_id) || "Produit",
                      quantity: item.quantity,
                      unitPrice: item.unit_price,
                    })),
                    totalAmount: selOrder.total_amount,
                    paymentStatus: selOrder.payment_status,
                    paymentMethod: selOrder.payment_method,
                    createdAt: selOrder.created_at,
                  } as InvoiceData}
                />
              </div>

              {selOrder.status !== "cancelled" && selOrder.status !== "delivered" && (
                <Button variant="destructive" className="w-full" onClick={() => handleStatusChange(selOrder.id, "cancelled")}>
                  Cancel la commande
                </Button>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete cette commande ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. La commande et tous ses articles seront définitivement supprimés.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Staff confirmation message dialog */}
      <Dialog open={!!confirmationMsg} onOpenChange={() => { setConfirmationMsg(null); setCopied(false); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Message de confirmation</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">Copiez ce message et envoyez-le au client sur WhatsApp :</p>
          <div className="bg-muted rounded-lg p-3 text-sm whitespace-pre-wrap font-mono leading-relaxed max-h-60 overflow-y-auto">
            {confirmationMsg}
          </div>
          <Button
            className="w-full gap-2"
            onClick={() => {
              navigator.clipboard.writeText(confirmationMsg || "");
              setCopied(true);
              toast.success("Message copié !");
            }}
          >
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            {copied ? "Copié !" : "Copier le message"}
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
