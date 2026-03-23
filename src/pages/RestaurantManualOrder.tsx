import { useState, useRef, useEffect, useCallback } from "react";
import { useProducts, CartItem, generateOrderCode, useCreateOrder, TABLE_COUNT } from "@/lib/restaurant-store";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Plus, Minus, Trash2, ShoppingCart, Check, Camera, X } from "lucide-react";
import { toast } from "sonner";
import InvoiceActions from "@/components/InvoiceActions";
import type { InvoiceData } from "@/lib/invoice";

export default function RestaurantManualOrder() {
  const { data: products = [] } = useProducts();
  const createOrder = useCreateOrder();

  const [visitorQuery, setVisitorQuery] = useState("");
  const [visitorId, setVisitorId] = useState<string | null>(null);
  const [visitorName, setVisitorName] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [tableNumber, setTableNumber] = useState("");
  const [searchProduct, setSearchProduct] = useState("");
  const [orderDone, setOrderDone] = useState<string | null>(null);
  const [doneInvoice, setDoneInvoice] = useState<InvoiceData | null>(null);

  // QR camera state
  const [cameraActive, setCameraActive] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const scanIntervalRef = useRef<number | null>(null);

  const lookupVisitor = async (id?: string) => {
    const q = (id || visitorQuery).trim().toUpperCase();
    if (!q) return;
    const { data } = await supabase.from("visitors").select("visitor_id, full_name").eq("visitor_id", q).maybeSingle();
    if (data) {
      setVisitorId(data.visitor_id);
      setVisitorName(data.full_name);
      setVisitorQuery(data.visitor_id);
      toast.success(`Visiteur trouvé : ${data.full_name}`);
    } else {
      toast.error("Visiteur introuvable");
    }
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
      streamRef.current = stream;
      setCameraActive(true);
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play();
          startQRScanning();
        }
      }, 100);
    } catch {
      toast.error("Impossible d'accéder à la caméra.");
      setCameraActive(false);
    }
  };

  const startQRScanning = () => {
    import("jsqr").then((jsQRModule) => {
      const jsQR = jsQRModule.default;
      const interval = window.setInterval(() => {
        if (!videoRef.current || !canvasRef.current) return;
        const video = videoRef.current;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext("2d");
        if (!ctx || video.readyState !== video.HAVE_ENOUGH_DATA) return;
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        ctx.drawImage(video, 0, 0);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const qrCode = jsQR(imageData.data, canvas.width, canvas.height);
        if (qrCode) {
          stopCamera();
          lookupVisitor(qrCode.data);
        }
      }, 300);
      scanIntervalRef.current = interval;
    });
  };

  const stopCamera = useCallback(() => {
    if (scanIntervalRef.current) { clearInterval(scanIntervalRef.current); scanIntervalRef.current = null; }
    if (streamRef.current) { streamRef.current.getTracks().forEach(t => t.stop()); streamRef.current = null; }
    setCameraActive(false);
  }, []);

  useEffect(() => () => { stopCamera(); }, [stopCamera]);

  const available = products.filter(p => p.is_available && p.stock > 0 && p.name.toLowerCase().includes(searchProduct.toLowerCase()));

  const addToCart = (product: typeof products[0]) => {
    setCart(prev => {
      const existing = prev.find(c => c.product.id === product.id);
      if (existing) {
        if (existing.quantity >= product.stock) { toast.error("Stock insuffisant"); return prev; }
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

  const total = cart.reduce((s, c) => s + c.product.price * c.quantity, 0);

  const handleSubmit = async () => {
    if (!visitorId || !tableNumber || cart.length === 0) return;
    try {
      const orderCode = await generateOrderCode();
      await createOrder.mutateAsync({
        order: { order_code: orderCode, visitor_id: visitorId, table_number: parseInt(tableNumber), total_amount: total },
        items: cart.map(c => ({ product_id: c.product.id, quantity: c.quantity, unit_price: c.product.price })),
      });
      setOrderDone(orderCode);
      setCart([]);
      toast.success("Commande créée !");
    } catch {
      toast.error("Erreur");
    }
  };

  const reset = () => {
    setVisitorId(null); setVisitorName(""); setVisitorQuery("");
    setCart([]); setTableNumber(""); setOrderDone(null);
  };

  if (orderDone) {
    return (
      <div className="max-w-md mx-auto space-y-6">
        <Card className="text-center">
          <CardContent className="pt-8 space-y-4">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-success/10">
              <Check className="h-8 w-8 text-success" />
            </div>
            <h2 className="text-xl font-bold">Commande créée</h2>
            <p className="font-mono text-lg text-primary">{orderDone}</p>
            <Button onClick={reset} className="w-full">Nouvelle commande</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Commande Manuelle</h1>
        <p className="text-muted-foreground">Créer une commande pour un visiteur</p>
      </div>

      {/* Step 1: Visitor */}
      <Card>
        <CardHeader><CardTitle className="text-base">1. Identifier le visiteur</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {visitorId ? (
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">{visitorName}</p>
                <p className="text-sm text-muted-foreground font-mono">{visitorId}</p>
              </div>
              <Button variant="outline" size="sm" onClick={() => { setVisitorId(null); setVisitorName(""); }}>Changer</Button>
            </div>
          ) : (
            <>
              {cameraActive && (
                <div className="relative rounded-xl overflow-hidden border border-border">
                  <video ref={videoRef} className="w-full" playsInline muted />
                  <canvas ref={canvasRef} className="hidden" />
                  <div className="absolute inset-0 border-2 border-primary/30 rounded-xl pointer-events-none" />
                  <div className="absolute top-1/2 left-1/4 right-1/4 h-0.5 bg-primary/50 animate-pulse" />
                  <Button size="icon" variant="destructive" className="absolute top-3 right-3 rounded-full shadow-lg" onClick={stopCamera}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              )}
              <div className="flex gap-2">
                <Button
                  variant={cameraActive ? "destructive" : "outline"}
                  className="gap-2"
                  onClick={cameraActive ? stopCamera : startCamera}
                >
                  <Camera className="h-4 w-4" />
                  {cameraActive ? "Fermer" : "Scanner"}
                </Button>
                <Input placeholder="GSS-XXXXXX" value={visitorQuery} onChange={e => setVisitorQuery(e.target.value)} className="font-mono"
                  onKeyDown={e => e.key === "Enter" && lookupVisitor()} />
                <Button onClick={() => lookupVisitor()}><Search className="h-4 w-4" /></Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Step 2: Table */}
      <Card>
        <CardHeader><CardTitle className="text-base">2. Table</CardTitle></CardHeader>
        <CardContent>
          <Select value={tableNumber} onValueChange={setTableNumber}>
            <SelectTrigger><SelectValue placeholder="Choisir une table" /></SelectTrigger>
            <SelectContent>
              {Array.from({ length: TABLE_COUNT }, (_, i) => (
                <SelectItem key={i + 1} value={String(i + 1)}>Table {i + 1}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Step 3: Products */}
      <Card>
        <CardHeader><CardTitle className="text-base">3. Sélectionner les produits</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <Input placeholder="Rechercher un produit..." value={searchProduct} onChange={e => setSearchProduct(e.target.value)} />
          <div className="max-h-60 overflow-y-auto space-y-2">
            {available.map(p => {
              const inCart = cart.find(c => c.product.id === p.id);
              return (
                <div key={p.id} className="flex items-center justify-between border rounded-lg p-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{p.name}</p>
                    <p className="text-xs text-muted-foreground">{p.price.toLocaleString()} BIF • Stock: {p.stock}</p>
                  </div>
                  {inCart ? (
                    <div className="flex items-center gap-1">
                      <Button size="icon" variant="outline" className="h-7 w-7" onClick={() => updateQty(p.id, -1)}><Minus className="h-3 w-3" /></Button>
                      <span className="w-6 text-center text-sm font-semibold">{inCart.quantity}</span>
                      <Button size="icon" variant="outline" className="h-7 w-7" onClick={() => updateQty(p.id, 1)}><Plus className="h-3 w-3" /></Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => setCart(c => c.filter(x => x.product.id !== p.id))}><Trash2 className="h-3 w-3" /></Button>
                    </div>
                  ) : (
                    <Button size="sm" variant="outline" onClick={() => addToCart(p)}><Plus className="h-3 w-3 mr-1" /> Ajouter</Button>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Cart summary */}
      {cart.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base">Récapitulatif</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {cart.map(c => (
              <div key={c.product.id} className="flex justify-between text-sm">
                <span>{c.product.name} ×{c.quantity}</span>
                <span>{(c.product.price * c.quantity).toLocaleString()} BIF</span>
              </div>
            ))}
            <div className="border-t pt-2 flex justify-between font-bold">
              <span>Total</span>
              <span className="text-primary">{total.toLocaleString()} BIF</span>
            </div>
            <Button className="w-full mt-2" disabled={!visitorId || !tableNumber || createOrder.isPending} onClick={handleSubmit}>
              <ShoppingCart className="h-4 w-4 mr-2" /> Créer la commande
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
