import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAddVisitor, generateVisitorId } from "@/lib/supabase-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { UserPlus, Check, Printer } from "lucide-react";
import MembershipCard from "@/components/MembershipCard";
import jsPDF from "jspdf";

function generatePrintableForm() {
  const doc = new jsPDF("p", "mm", "a4");
  const w = 210;
  const margin = 20;
  const contentW = w - margin * 2;
  let y = 20;

  // Header
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text("GITEGA STUDY SPACE", w / 2, y, { align: "center" });
  y += 8;
  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.text("Formulaire d'inscription — Visiteur", w / 2, y, { align: "center" });
  y += 4;
  doc.setDrawColor(60, 60, 60);
  doc.setLineWidth(0.5);
  doc.line(margin, y, w - margin, y);
  y += 10;

  const fields = [
    { label: "Nom complet *", height: 10 },
    { label: "Genre (Homme / Femme / Autre)", height: 10 },
    { label: "Date de naissance (JJ/MM/AAAA)", height: 10 },
    { label: "Téléphone", height: 10 },
    { label: "Email", height: 10 },
    { label: "Quartier / Commune", height: 10 },
    { label: "Profession", height: 10 },
  ];

  for (const field of fields) {
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text(field.label, margin, y);
    y += 5;
    doc.setDrawColor(180, 180, 180);
    doc.setLineWidth(0.3);
    doc.rect(margin, y, contentW, field.height);
    y += field.height + 8;
  }

  // Photo placeholder
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("Photo passeport (coller ici)", margin, y);
  y += 5;
  doc.setDrawColor(180, 180, 180);
  doc.setLineWidth(0.3);
  doc.rect(margin, y, 35, 45);
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.text("3.5 x 4.5 cm", margin + 17.5, y + 25, { align: "center" });

  // Signature
  const sigY = y + 55;
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("Signature du visiteur :", margin, sigY);
  doc.line(margin + 45, sigY, margin + contentW, sigY);

  // Date
  const dateY = sigY + 12;
  doc.text("Date :", margin, dateY);
  doc.line(margin + 20, dateY, margin + 80, dateY);

  // Footer
  doc.setFontSize(7);
  doc.setFont("helvetica", "italic");
  doc.text("Ce formulaire est à remplir par le visiteur. Le Directeur se chargera de saisir les données dans le système.", margin, 285);

  doc.save("formulaire-inscription-visiteur.pdf");
  toast.success("Formulaire PDF généré !");
}

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
            <Label htmlFor="neighborhood" className="text-foreground">Quartier / Commune</Label>
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
