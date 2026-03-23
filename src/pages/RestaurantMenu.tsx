import { useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useProducts, CartItem, CATEGORIES, generateOrderCode, useCreateOrder } from "@/lib/restaurant-store";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ShoppingCart, Plus, Minus, Trash2, UtensilsCrossed, ArrowLeft, Check } from "lucide-react";
import { toast } from "sonner";
import { TABLE_COUNT } from "@/lib/restaurant-store";
import InvoiceActions from "@/components/InvoiceActions";
import type { InvoiceData } from "@/lib/invoice";

export default function RestaurantMenu() {
  const { visitorId } = useParams<{ visitorId: string }>();
  const navigate = useNavigate();
  const { data: products = [], isLoading } = useProducts();
  const createOrder = useCreateOrder();

  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [showCart, setShowCart] = useState(false);
  const [showCheckout, setShowCheckout] = useState(false);
  const [tableNumber, setTableNumber] = useState<string>("");
  const [orderConfirmed, setOrderConfirmed] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const available = products.filter(p => p.is_available && p.stock > 0);
    if (selectedCategory === "all") return available;
    return available.filter(p => p.category === selectedCategory);
  }, [products, selectedCategory]);

  const addToCart = (product: typeof products[0]) => {
    setCart(prev => {
      const existing = prev.find(c => c.product.id === product.id);
      if (existing) {
        if (existing.quantity >= product.stock) {
          toast.error("Stock insuffisant");
          return prev;
        }
        return prev.map(c => c.product.id === product.id ? { ...c, quantity: c.quantity + 1 } : c);
      }
      return [...prev, { product, quantity: 1 }];
    });
  };

  const updateQty = (productId: string, delta: number) => {
    setCart(prev => prev.map(c => {
      if (c.product.id !== productId) return c;
      const newQty = c.quantity + delta;
      if (newQty <= 0) return c;
      if (newQty > c.product.stock) { toast.error("Stock insuffisant"); return c; }
      return { ...c, quantity: newQty };
    }));
  };

  const removeFromCart = (productId: string) => {
    setCart(prev => prev.filter(c => c.product.id !== productId));
  };

  const total = cart.reduce((s, c) => s + c.product.price * c.quantity, 0);
  const cartCount = cart.reduce((s, c) => s + c.quantity, 0);

  const handleCheckout = async () => {
    if (!tableNumber || cart.length === 0 || !visitorId) return;
    try {
      const orderCode = await generateOrderCode();
      await createOrder.mutateAsync({
        order: {
          order_code: orderCode,
          visitor_id: visitorId,
          table_number: parseInt(tableNumber),
          total_amount: total,
        },
        items: cart.map(c => ({
          product_id: c.product.id,
          quantity: c.quantity,
          unit_price: c.product.price,
        })),
      });
      setOrderConfirmed(orderCode);
      setCart([]);
      setShowCheckout(false);
      toast.success("Commande passée avec succès !");
    } catch {
      toast.error("Erreur lors de la commande");
    }
  };

  const shareWhatsApp = () => {
    if (!orderConfirmed) return;
    const items = cart.length > 0
      ? cart.map(c => `${c.product.name} x${c.quantity}`).join("\n")
      : "Voir détails sur le système";
    const msg = encodeURIComponent(
      `Bonjour,\nVoici ma commande:\n\n${items}\n\nTotal: ${total.toLocaleString()} BIF\nTable: ${tableNumber}\nCommande: ${orderConfirmed}`
    );
    window.open(`https://wa.me/?text=${msg}`, "_blank");
  };

  if (orderConfirmed) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <Card className="w-full max-w-sm text-center">
          <CardContent className="pt-8 space-y-4">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-success/10">
              <Check className="h-8 w-8 text-success" />
            </div>
            <h2 className="text-xl font-bold">Commande confirmée !</h2>
            <p className="font-mono text-lg text-primary">{orderConfirmed}</p>
            <p className="text-sm text-muted-foreground">Table {tableNumber}</p>
            <div className="flex gap-2 pt-2">
              <Button variant="outline" className="flex-1" onClick={shareWhatsApp}>
                <Send className="h-4 w-4 mr-1" /> WhatsApp
              </Button>
              <Button className="flex-1" onClick={() => { setOrderConfirmed(null); setTableNumber(""); }}>
                Nouveau
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-card border-b px-4 py-3">
        <div className="flex items-center justify-between max-w-lg mx-auto">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={() => navigate("/restaurant")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="font-bold text-lg">Menu</h1>
              <p className="text-xs text-muted-foreground">{visitorId}</p>
            </div>
          </div>
          <Button variant="outline" size="sm" className="relative" onClick={() => setShowCart(true)}>
            <ShoppingCart className="h-4 w-4" />
            {cartCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center">
                {cartCount}
              </span>
            )}
          </Button>
        </div>
      </div>

      {/* Categories */}
      <div className="max-w-lg mx-auto px-4 pt-4">
        <div className="flex gap-2 overflow-x-auto pb-3 no-scrollbar">
          <Button size="sm" variant={selectedCategory === "all" ? "default" : "outline"} onClick={() => setSelectedCategory("all")}>
            Tout
          </Button>
          {CATEGORIES.map(c => (
            <Button key={c.value} size="sm" variant={selectedCategory === c.value ? "default" : "outline"} onClick={() => setSelectedCategory(c.value)}>
              {c.label}
            </Button>
          ))}
        </div>

        {/* Products grid */}
        {isLoading ? (
          <p className="text-center text-muted-foreground py-8">Chargement...</p>
        ) : filtered.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">Aucun produit disponible</p>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {filtered.map(product => {
              const inCart = cart.find(c => c.product.id === product.id);
              return (
                <Card key={product.id} className="overflow-hidden">
                  {product.image_url ? (
                    <img src={product.image_url} alt={product.name} className="w-full h-28 object-cover" />
                  ) : (
                    <div className="w-full h-28 bg-muted flex items-center justify-center">
                      <UtensilsCrossed className="h-8 w-8 text-muted-foreground/40" />
                    </div>
                  )}
                  <CardContent className="p-3 space-y-2">
                    <p className="font-medium text-sm leading-tight line-clamp-2">{product.name}</p>
                    <p className="font-bold text-primary">{product.price.toLocaleString()} BIF</p>
                    {inCart ? (
                      <div className="flex items-center justify-between">
                        <Button size="icon" variant="outline" className="h-7 w-7" onClick={() => updateQty(product.id, -1)}>
                          <Minus className="h-3 w-3" />
                        </Button>
                        <span className="font-semibold text-sm">{inCart.quantity}</span>
                        <Button size="icon" variant="outline" className="h-7 w-7" onClick={() => updateQty(product.id, 1)}>
                          <Plus className="h-3 w-3" />
                        </Button>
                      </div>
                    ) : (
                      <Button size="sm" className="w-full h-8" onClick={() => addToCart(product)}>
                        <Plus className="h-3 w-3 mr-1" /> Ajouter
                      </Button>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Floating cart bar */}
      {cartCount > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-40 bg-card border-t p-3">
          <div className="max-w-lg mx-auto flex items-center justify-between">
            <div>
              <p className="font-bold">{total.toLocaleString()} BIF</p>
              <p className="text-xs text-muted-foreground">{cartCount} article(s)</p>
            </div>
            <Button onClick={() => setShowCart(true)}>
              <ShoppingCart className="h-4 w-4 mr-2" /> Voir le panier
            </Button>
          </div>
        </div>
      )}

      {/* Cart Dialog */}
      <Dialog open={showCart} onOpenChange={setShowCart}>
        <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Mon Panier</DialogTitle>
          </DialogHeader>
          {cart.length === 0 ? (
            <p className="text-center text-muted-foreground py-6">Votre panier est vide</p>
          ) : (
            <div className="space-y-3">
              {cart.map(c => (
                <div key={c.product.id} className="flex items-center gap-3 border rounded-lg p-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{c.product.name}</p>
                    <p className="text-xs text-muted-foreground">{c.product.price.toLocaleString()} BIF × {c.quantity}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button size="icon" variant="outline" className="h-7 w-7" onClick={() => updateQty(c.product.id, -1)}>
                      <Minus className="h-3 w-3" />
                    </Button>
                    <span className="w-6 text-center text-sm font-semibold">{c.quantity}</span>
                    <Button size="icon" variant="outline" className="h-7 w-7" onClick={() => updateQty(c.product.id, 1)}>
                      <Plus className="h-3 w-3" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => removeFromCart(c.product.id)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}
              <div className="border-t pt-3 flex items-center justify-between font-bold">
                <span>Total</span>
                <span className="text-primary">{total.toLocaleString()} BIF</span>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button className="w-full" disabled={cart.length === 0} onClick={() => { setShowCart(false); setShowCheckout(true); }}>
              Passer la commande
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Checkout Dialog */}
      <Dialog open={showCheckout} onOpenChange={setShowCheckout}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Finaliser la commande</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-1 block">Numéro de table</label>
              <Select value={tableNumber} onValueChange={setTableNumber}>
                <SelectTrigger>
                  <SelectValue placeholder="Choisir une table" />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: TABLE_COUNT }, (_, i) => (
                    <SelectItem key={i + 1} value={String(i + 1)}>Table {i + 1}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="border rounded-lg p-3 space-y-1">
              {cart.map(c => (
                <div key={c.product.id} className="flex justify-between text-sm">
                  <span>{c.product.name} ×{c.quantity}</span>
                  <span>{(c.product.price * c.quantity).toLocaleString()} BIF</span>
                </div>
              ))}
              <div className="border-t pt-2 mt-2 flex justify-between font-bold">
                <span>Total</span>
                <span>{total.toLocaleString()} BIF</span>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button className="w-full" disabled={!tableNumber || createOrder.isPending} onClick={handleCheckout}>
              {createOrder.isPending ? "Envoi..." : "Confirmer la commande"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
