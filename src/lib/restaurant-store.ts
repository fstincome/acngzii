import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface Product {
  id: string;
  name: string;
  category: string;
  price: number;
  cost_price: number;
  stock: number;
  image_url: string | null;
  is_available: boolean;
  created_at: string;
}

export interface Order {
  id: string;
  order_code: string;
  visitor_id: string;
  table_number: number;
  total_amount: number;
  status: string;
  payment_status: string;
  payment_method: string | null;
  created_at: string;
}

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string;
  quantity: number;
  unit_price: number;
}

export interface CartItem {
  product: Product;
  quantity: number;
}

export const CATEGORIES = [
  { value: "boissons", label: "Boissons" },
  { value: "snacks", label: "Snacks" },
  { value: "repas", label: "Repas" },
];

export const ORDER_STATUSES = [
  "pending", "confirmed", "preparing", "ready", "delivered", "cancelled"
] as const;

export const STATUS_LABELS: Record<string, string> = {
  pending: "En attente",
  confirmed: "Confirmée",
  preparing: "En préparation",
  ready: "Prête",
  delivered: "Livrée",
  cancelled: "Annulée",
};

export const STATUS_COLORS: Record<string, string> = {
  pending: "bg-warning/10 text-warning border-warning/30",
  confirmed: "bg-primary/10 text-primary border-primary/30",
  preparing: "bg-accent/10 text-accent border-accent/30",
  ready: "bg-success/10 text-success border-success/30",
  delivered: "bg-muted text-muted-foreground border-border",
  cancelled: "bg-destructive/10 text-destructive border-destructive/30",
};

export const PAYMENT_LABELS: Record<string, string> = {
  unpaid: "Non payé",
  cash: "Cash",
  mobile_money: "Mobile Money",
  bitcoin: "Bitcoin",
};

export const TABLE_COUNT = 10;

// Generate order code like CMD-2026-00045
export async function generateOrderCode(): Promise<string> {
  const year = new Date().getFullYear();
  const ts = Date.now().toString(36);
  const rand = Math.random().toString(36).substring(2, 6);
  return `CMD-${year}-${ts}${rand}`.toUpperCase();
}

// ---- Hooks ----

export function useProducts() {
  return useQuery({
    queryKey: ["products"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .order("category")
        .order("name");
      if (error) throw error;
      return (data ?? []) as Product[];
    },
  });
}

export function useOrders() {
  return useQuery({
    queryKey: ["orders"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Order[];
    },
  });
}

export function useOrderItems(orderId?: string) {
  return useQuery({
    queryKey: ["order-items", orderId],
    queryFn: async () => {
      if (!orderId) return [];
      const { data, error } = await supabase
        .from("order_items")
        .select("*")
        .eq("order_id", orderId);
      if (error) throw error;
      return (data ?? []) as OrderItem[];
    },
    enabled: !!orderId,
  });
}

export function useVisitorOrders(visitorId?: string) {
  return useQuery({
    queryKey: ["visitor-orders", visitorId],
    queryFn: async () => {
      if (!visitorId) return [];
      const { data, error } = await supabase
        .from("orders")
        .select("*")
        .eq("visitor_id", visitorId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Order[];
    },
    enabled: !!visitorId,
  });
}

export function useAddProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (product: Omit<Product, "id" | "created_at">) => {
      const { data, error } = await supabase.from("products").insert(product).select().single();
      if (error) throw error;
      return data as Product;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["products"] }),
  });
}

export function useUpdateProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Product> }) => {
      const { data, error } = await supabase.from("products").update(updates).eq("id", id).select().single();
      if (error) throw error;
      return data as Product;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["products"] }),
  });
}

export function useDeleteProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("products").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["products"] }),
  });
}

export function useCreateOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ order, items }: {
      order: { order_code: string; visitor_id: string; table_number: number; total_amount: number };
      items: { product_id: string; quantity: number; unit_price: number }[];
    }) => {
      const { data: orderData, error: orderErr } = await supabase
        .from("orders")
        .insert(order)
        .select()
        .single();
      if (orderErr) throw orderErr;

      const orderItems = items.map(item => ({ ...item, order_id: orderData.id }));
      const { error: itemErr } = await supabase.from("order_items").insert(orderItems);
      if (itemErr) throw itemErr;

      // Decrease stock
      for (const item of items) {
        const { data: prod } = await supabase.from("products").select("stock").eq("id", item.product_id).single();
        if (prod) {
          await supabase.from("products").update({ stock: Math.max(0, prod.stock - item.quantity) }).eq("id", item.product_id);
        }
      }

      return orderData as Order;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["orders"] });
      qc.invalidateQueries({ queryKey: ["products"] });
    },
  });
}

export function useUpdateOrderStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("orders").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["orders"] }),
  });
}

export function useUpdatePaymentStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, payment_status, payment_method }: { id: string; payment_status: string; payment_method?: string }) => {
      const { error } = await supabase.from("orders").update({ payment_status, payment_method: payment_method || null }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["orders"] }),
  });
}

export function useDeleteOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      // Delete order items first
      const { error: itemErr } = await supabase.from("order_items").delete().eq("order_id", id);
      if (itemErr) throw itemErr;
      const { error } = await supabase.from("orders").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["orders"] });
      qc.invalidateQueries({ queryKey: ["order-items"] });
    },
  });
}

export function useUpdateOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: { table_number?: number; total_amount?: number } }) => {
      const { error } = await supabase.from("orders").update(updates).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["orders"] }),
  });
}

export function useOrdersRealtime() {
  const qc = useQueryClient();
  const channel = supabase
    .channel("orders-realtime")
    .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, () => {
      qc.invalidateQueries({ queryKey: ["orders"] });
    });
  if (channel.state !== "joined" && channel.state !== "joining") {
    channel.subscribe();
  }
}
