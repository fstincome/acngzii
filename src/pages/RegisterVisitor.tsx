import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAddVisitor, generateVisitorId } from "@/lib/supabase-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { UserPlus, Check } from "lucide-react";
import MembershipCard from "@/components/MembershipCard";

export default function RegisterVisitor() {
  const navigate = useNavigate();
  const [step, setStep] = useState<"form" | "card">("form");
  const [newVisitorId, setNewVisitorId] = useState("");
  const [fullName, setFullName] = useState("");
  const addVisitor = useAddVisitor();

  const [form, setForm] = useState({
    fullName: "",
    gender: "",
    dateOfBirth: "",
    phone: "",
    email: "",
    neighborhood: "",
    occupation: "",
    photo: "",
  });

  const update = (key: string, value: string) => setForm((f) => ({ ...f, [key]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.fullName) {
      toast.error("Veuillez remplir le nom complet");
      return;
    }

    try {
      const visitorId = await generateVisitorId();
      await addVisitor.mutateAsync({
        visitor_id: visitorId,
        full_name: form.fullName,
        gender: form.gender || "other",
        date_of_birth: form.dateOfBirth || undefined,
        phone: form.phone || "—",
        email: form.email || undefined,
        neighborhood: form.neighborhood || "—",
        occupation: form.occupation || "—",
        photo: form.photo || undefined,
      });

      setNewVisitorId(visitorId);
      setFullName(form.fullName);
      setStep("card");
      toast.success("Visiteur inscrit avec succès !");
    } catch (err) {
      console.error(err);
      toast.error("Erreur lors de l'inscription");
    }
  };

  if (step === "card") {
    return (
      <div className="mx-auto max-w-md space-y-8 animate-fade-in">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-success/10">
            <Check className="h-8 w-8 text-success" />
          </div>
          <h2 className="text-xl font-bold text-foreground">Inscription terminée</h2>
          <p className="mt-1 text-sm text-muted-foreground">La carte de membre est prête</p>
        </div>

        <MembershipCard fullName={fullName} visitorId={newVisitorId} />

        <div className="flex gap-3">
          <Button className="flex-1 gap-2 rounded-xl h-11" variant="outline" onClick={() => {
            setStep("form");
            setForm({ fullName: "", gender: "", dateOfBirth: "", phone: "", email: "", neighborhood: "", occupation: "", photo: "" });
          }}>
            <UserPlus className="h-4 w-4" />
            Inscrire un autre
          </Button>
          <Button className="flex-1 gap-2 rounded-xl h-11" variant="outline" onClick={() => navigate("/visitors")}>
            Voir les visiteurs
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-8 animate-fade-in">
      <div className="page-header">
        <h1 className="page-title">Inscrire un visiteur</h1>
        <p className="page-subtitle">Ajouter un nouveau membre au Gitega Study Space</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6 rounded-2xl border border-border/50 bg-card p-7 shadow-sm">
        <div className="grid gap-5 sm:grid-cols-2">
          <div className="sm:col-span-2 space-y-2">
            <Label htmlFor="fullName" className="text-foreground">Nom complet <span className="text-destructive">*</span></Label>
            <Input id="fullName" value={form.fullName} onChange={(e) => update("fullName", e.target.value)} placeholder="Entrez le nom complet" className="rounded-xl h-11" />
          </div>

          <div className="space-y-2">
            <Label className="text-foreground">Genre</Label>
            <Select value={form.gender} onValueChange={(v) => update("gender", v)}>
              <SelectTrigger className="rounded-xl h-11"><SelectValue placeholder="Sélectionner" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="male">Homme</SelectItem>
                <SelectItem value="female">Femme</SelectItem>
                <SelectItem value="other">Autre</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="dob" className="text-foreground">Date de naissance</Label>
            <Input id="dob" type="date" value={form.dateOfBirth} onChange={(e) => update("dateOfBirth", e.target.value)} className="rounded-xl h-11" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone" className="text-foreground">Téléphone</Label>
            <Input id="phone" value={form.phone} onChange={(e) => update("phone", e.target.value)} placeholder="+257 xx xxx xxx" className="rounded-xl h-11" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email" className="text-foreground">Email (optionnel)</Label>
            <Input id="email" type="email" value={form.email} onChange={(e) => update("email", e.target.value)} placeholder="email@exemple.com" className="rounded-xl h-11" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="neighborhood" className="text-foreground">Quartier / Commune *</Label>
            <Input id="neighborhood" value={form.neighborhood} onChange={(e) => update("neighborhood", e.target.value)} placeholder="ex: Mushasha" className="rounded-xl h-11" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="occupation" className="text-foreground">Profession</Label>
            <Input id="occupation" value={form.occupation} onChange={(e) => update("occupation", e.target.value)} placeholder="ex: Étudiant, Entrepreneur" className="rounded-xl h-11" />
          </div>

          <div className="sm:col-span-2 space-y-2">
            <Label htmlFor="photo" className="text-foreground">Lien photo passport</Label>
            <Input id="photo" value={form.photo} onChange={(e) => update("photo", e.target.value)} placeholder="https://lh3.googleusercontent.com/d/..." className="rounded-xl h-11" />
            <p className="text-[10px] text-muted-foreground">Format Google Drive : https://lh3.googleusercontent.com/d/ID</p>
          </div>
        </div>

        <Button type="submit" className="w-full gap-2 rounded-xl h-12 text-sm font-semibold" size="lg" disabled={addVisitor.isPending}>
          <UserPlus className="h-4 w-4" />
          {addVisitor.isPending ? "Inscription en cours..." : "Inscrire le visiteur"}
        </Button>
      </form>
    </div>
  );
}
