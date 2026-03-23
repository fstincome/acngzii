import { useState } from "react";
import { useProducts, useAddProduct, useUpdateProduct, useDeleteProduct, CATEGORIES, Product } from "@/lib/restaurant-store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Trash2, Package, UtensilsCrossed } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";

const emptyProduct = { name: "", category: "snacks", price: 0, cost_price: 0, stock: 0, image_url: "", is_available: true };

export default function RestaurantProducts() {
  const { role } = useAuth();
  const { data: products = [], isLoading } = useProducts();
  const addProduct = useAddProduct();
  const updateProduct = useUpdateProduct();
  const deleteProduct = useDeleteProduct();

  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyProduct);

  const canDelete = role === "admin";
  const canEdit = role === "admin" || role === "director";

  const openNew = () => { setEditId(null); setForm(emptyProduct); setShowForm(true); };
  const openEdit = (p: Product) => {
    setEditId(p.id);
    setForm({ name: p.name, category: p.category, price: p.price, cost_price: p.cost_price, stock: p.stock, image_url: p.image_url || "", is_available: p.is_available });
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error("Nom requis"); return; }
    try {
      const data = { ...form, image_url: form.image_url || null };
      if (editId) {
        await updateProduct.mutateAsync({ id: editId, updates: data });
        toast.success("Produit mis à jour");
      } else {
        await addProduct.mutateAsync(data);
        toast.success("Produit ajouté");
      }
      setShowForm(false);
    } catch {
      toast.error("Erreur");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Supprimer ce produit ?")) return;
    try {
      await deleteProduct.mutateAsync(id);
      toast.success("Produit supprimé");
    } catch {
      toast.error("Erreur");
    }
  };

  const profit = form.price - form.cost_price;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Produits</h1>
          <p className="text-muted-foreground">Gérer le menu du restaurant</p>
        </div>
        {canEdit && (
          <Button onClick={openNew}><Plus className="h-4 w-4 mr-1" /> Ajouter</Button>
        )}
      </div>

      {isLoading ? <p className="text-muted-foreground">Chargement...</p> : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {products.map(p => (
            <Card key={p.id} className={!p.is_available ? "opacity-60" : ""}>
              {p.image_url ? (
                <img src={p.image_url} alt={p.name} className="w-full h-36 object-cover rounded-t-lg" />
              ) : (
                <div className="w-full h-36 bg-muted flex items-center justify-center rounded-t-lg">
                  <UtensilsCrossed className="h-10 w-10 text-muted-foreground/30" />
                </div>
              )}
              <CardContent className="p-4 space-y-2">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-semibold">{p.name}</p>
                    <Badge variant="secondary" className="mt-1">{CATEGORIES.find(c => c.value === p.category)?.label || p.category}</Badge>
                  </div>
                  {canEdit && (
                    <div className="flex gap-1">
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEdit(p)}><Pencil className="h-3 w-3" /></Button>
                      {canDelete && <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => handleDelete(p.id)}><Trash2 className="h-3 w-3" /></Button>}
                    </div>
                  )}
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="font-bold text-primary">{p.price.toLocaleString()} BIF</span>
                  <span className="text-muted-foreground flex items-center gap-1"><Package className="h-3 w-3" /> Stock: {p.stock}</span>
                </div>
                <div className="text-xs text-muted-foreground">
                  Coût: {p.cost_price.toLocaleString()} BIF • Profit: {(p.price - p.cost_price).toLocaleString()} BIF
                </div>
                {!p.is_available && <Badge variant="destructive">Indisponible</Badge>}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Form dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editId ? "Modifier le produit" : "Nouveau produit"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium">Nom</label>
              <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
            </div>
            <div>
              <label className="text-sm font-medium">Catégorie</label>
              <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium">Prix de vente (BIF)</label>
                <Input type="number" value={form.price} onChange={e => setForm(f => ({ ...f, price: Number(e.target.value) }))} />
              </div>
              <div>
                <label className="text-sm font-medium">Prix de revient (BIF)</label>
                <Input type="number" value={form.cost_price} onChange={e => setForm(f => ({ ...f, cost_price: Number(e.target.value) }))} />
              </div>
            </div>
            <p className="text-sm text-muted-foreground">Profit: <strong className="text-success">{profit.toLocaleString()} BIF</strong></p>
            <div>
              <label className="text-sm font-medium">Stock</label>
              <Input type="number" value={form.stock} onChange={e => setForm(f => ({ ...f, stock: Number(e.target.value) }))} />
            </div>
            <div>
              <label className="text-sm font-medium">URL de l'image</label>
              <Input value={form.image_url} onChange={e => setForm(f => ({ ...f, image_url: e.target.value }))} placeholder="https://..." />
            </div>
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Disponible</label>
              <Switch checked={form.is_available} onCheckedChange={v => setForm(f => ({ ...f, is_available: v }))} />
            </div>
          </div>
          <DialogFooter>
            <Button className="w-full" onClick={handleSave} disabled={addProduct.isPending || updateProduct.isPending}>
              {editId ? "Mettre à jour" : "Ajouter"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
