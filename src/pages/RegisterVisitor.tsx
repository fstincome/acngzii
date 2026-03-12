import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { addVisitor, generateVisitorId } from "@/lib/store";
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

  const [form, setForm] = useState({
    fullName: "",
    gender: "",
    dateOfBirth: "",
    phone: "",
    email: "",
    neighborhood: "",
    occupation: "",
  });

  const update = (key: string, value: string) => setForm((f) => ({ ...f, [key]: value }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.fullName || !form.gender || !form.phone || !form.neighborhood || !form.occupation) {
      toast.error("Veuillez remplir tous les champs obligatoires");
      return;
    }

    const visitorId = generateVisitorId();
    addVisitor({
      id: crypto.randomUUID(),
      visitorId,
      fullName: form.fullName,
      gender: form.gender as "male" | "female" | "other",
      dateOfBirth: form.dateOfBirth,
      phone: form.phone,
      email: form.email || undefined,
      neighborhood: form.neighborhood,
      occupation: form.occupation,
      registrationDate: new Date().toISOString().split("T")[0],
    });

    setNewVisitorId(visitorId);
    setFullName(form.fullName);
    setStep("card");
    toast.success("Visiteur inscrit avec succès !");
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
            setForm({ fullName: "", gender: "", dateOfBirth: "", phone: "", email: "", neighborhood: "", occupation: "" });
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
            <Label htmlFor="fullName" className="text-foreground">Nom complet *</Label>
            <Input id="fullName" value={form.fullName} onChange={(e) => update("fullName", e.target.value)} placeholder="Entrez le nom complet" className="rounded-xl h-11" />
          </div>

          <div className="space-y-2">
            <Label className="text-foreground">Genre *</Label>
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
            <Label htmlFor="phone" className="text-foreground">Téléphone *</Label>
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
            <Label htmlFor="occupation" className="text-foreground">Profession *</Label>
            <Input id="occupation" value={form.occupation} onChange={(e) => update("occupation", e.target.value)} placeholder="ex: Étudiant, Entrepreneur" className="rounded-xl h-11" />
          </div>
        </div>

        <Button type="submit" className="w-full gap-2 rounded-xl h-12 text-sm font-semibold" size="lg">
          <UserPlus className="h-4 w-4" />
          Inscrire le visiteur
        </Button>
      </form>
    </div>
  );
}
