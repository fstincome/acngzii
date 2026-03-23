import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { UtensilsCrossed, ScanLine, AlertCircle } from "lucide-react";
import { toast } from "sonner";

export default function RestaurantEntry() {
  const [visitorId, setVisitorId] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const id = visitorId.trim().toUpperCase();
    if (!id) return;
    setLoading(true);
    const { data } = await supabase.from("visitors").select("visitor_id").eq("visitor_id", id).maybeSingle();
    setLoading(false);
    if (data) {
      navigate(`/restaurant/menu/${id}`);
    } else {
      toast.error("Visiteur introuvable. Vérifiez votre identifiant.");
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center space-y-3">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
            <UtensilsCrossed className="h-8 w-8 text-primary" />
          </div>
          <CardTitle className="text-xl">Restaurant GSS</CardTitle>
          <p className="text-sm text-muted-foreground">
            Entrez votre identifiant membre pour accéder au menu
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              placeholder="GSS-XXXXXX"
              value={visitorId}
              onChange={(e) => setVisitorId(e.target.value)}
              className="text-center text-lg font-mono tracking-widest"
              autoFocus
            />
            <Button type="submit" className="w-full" disabled={loading || !visitorId.trim()}>
              {loading ? "Vérification..." : "Accéder au menu"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
