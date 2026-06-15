import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAddVisitor, generateVisitorId } from "@/lib/supabase-store";
import { findDuplicates, type DuplicateCandidate } from "@/lib/duplicate-check";
import { usePrograms, useAddParticipant, generateParticipantCode } from "@/lib/program-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";
import { UserPlus, Check, FileText, Printer, Download, MessageCircle, Mail, ArrowLeft, AlertTriangle, Building, GraduationCap } from "lucide-react";
import MembershipCard from "@/components/MembershipCard";
import jsPDF from "jspdf";

function buildFormPDF(): jsPDF {
  const doc = new jsPDF("p", "mm", "a4");
  const w = 210;
  const margin = 15;
  const contentW = w - margin * 2;
  let y = 18;

  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("GITEGA STUDY SPACE", w / 2, y, { align: "center" });
  y += 6;
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text("Formulaire d'inscription — Visiteur", w / 2, y, { align: "center" });
  y += 4;
  doc.setDrawColor(80, 80, 80);
  doc.setLineWidth(0.4);
  doc.line(margin, y, w - margin, y);
  y += 8;

  const fields = [
    "Nom complet *",
    "Genre (Homme / Femme / Autre)",
    "Date de naissance (JJ/MM/AAAA)",
    "Téléphone",
    "Email",
    "Quartier / Commune",
    "Profession",
    "Institution (école, université...)",
  ];

  const fieldH = 8;

  for (const label of fields) {
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.text(label, margin, y);
    y += 4;
    doc.setDrawColor(180, 180, 180);
    doc.setLineWidth(0.25);
    doc.rect(margin, y, contentW, fieldH);
    y += fieldH + 4;
  }

  y += 2;
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text("Photo passeport (coller ici)", margin, y);
  y += 4;
  doc.setDrawColor(180, 180, 180);
  doc.setLineWidth(0.25);
  doc.rect(margin, y, 30, 40);
  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  doc.text("3.5 x 4.5 cm", margin + 15, y + 22, { align: "center" });

  const sigY = y + 48;
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text("Signature du visiteur :", margin, sigY);
  doc.setLineWidth(0.3);
  doc.setDrawColor(120, 120, 120);
  doc.line(margin + 40, sigY, w - margin, sigY);

  const dateY = sigY + 10;
  doc.text("Date :", margin, dateY);
  doc.line(margin + 16, dateY, margin + 70, dateY);

  return doc;
}

// ---- Form Preview Component ----
function FormPreview({ onBack }: { onBack: () => void }) {
  const [generating, setGenerating] = useState(false);

  const handleDownload = () => {
    const doc = buildFormPDF();
    doc.save("formulaire-inscription-visiteur.pdf");
    toast.success("Formulaire PDF téléchargé !");
  };

  const handlePrint = () => {
    setGenerating(true);
    try {
      const doc = buildFormPDF();
      const pdfDataUri = doc.output("datauristring");
      const printWindow = window.open("", "_blank");
      if (printWindow) {
        printWindow.document.write(`
          <!DOCTYPE html><html><head><title>Formulaire d'inscription</title></head>
          <body style="margin:0;display:flex;justify-content:center;align-items:center;min-height:100vh;background:#f0f0f0;">
            <embed src="${pdfDataUri}" type="application/pdf" width="600" height="850" />
            <script>setTimeout(function(){window.print();},500);</script>
          </body></html>
        `);
        printWindow.document.close();
      }
    } finally {
      setGenerating(false);
    }
  };

  const getWhatsAppUrl = () => {
    const formUrl = `${window.location.origin}/formulaire`;
    const message =
      `📋 *Formulaire d'inscription - Gitega Study Space*\n\n` +
      `Bonjour ! Veuillez remplir le formulaire d'inscription en suivant ce lien :\n\n` +
      `👉 ${formUrl}\n\n` +
      `Vous pouvez aussi télécharger le PDF depuis cette page pour le remplir à la main.\n\n` +
      `Merci !\n— Gitega Study Space`;
    return `https://wa.me/?text=${encodeURIComponent(message)}`;
  };

  const getEmailUrl = () => {
    const formUrl = `${window.location.origin}/formulaire`;
    const subject = "Formulaire d'inscription - Gitega Study Space";
    const body =
      `Bonjour,\n\n` +
      `Veuillez remplir votre formulaire d'inscription au Gitega Study Space en suivant ce lien :\n\n` +
      `${formUrl}\n\n` +
      `Vous pouvez aussi télécharger le PDF depuis cette page pour le remplir à la main.\n\n` +
      `Merci !\n\nCordialement,\nGitega Study Space`;
    return `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };

  const fields = [
    "Nom complet *",
    "Genre (Homme / Femme / Autre)",
    "Date de naissance (JJ/MM/AAAA)",
    "Téléphone",
    "Email",
    "Quartier / Commune",
    "Profession",
    "Institution (école, université...)",
  ];

  return (
    <div className="mx-auto max-w-lg space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" className="rounded-xl" onClick={onBack}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h2 className="text-lg font-bold text-foreground">Formulaire d'inscription</h2>
          <p className="text-sm text-muted-foreground">Aperçu du formulaire papier</p>
        </div>
      </div>

      {/* Visual Preview */}
      <div className="rounded-2xl border border-border/50 bg-card shadow-xl overflow-hidden">
        {/* Form header */}
        <div className="bg-gradient-to-r from-primary/10 to-accent/10 px-6 py-5 text-center border-b border-border/30">
          <div className="flex items-center justify-center gap-3 mb-2">
            <img src="/gss-logo.png" alt="GSS" className="h-8 w-8 rounded-lg object-contain" />
            <h3 className="text-sm font-bold tracking-widest text-foreground uppercase">Gitega Study Space</h3>
          </div>
          <p className="text-xs text-muted-foreground">Formulaire d'inscription — Visiteur</p>
          <div className="mt-3 h-px bg-border/50" />
        </div>

        {/* Fields preview */}
        <div className="px-6 py-4 space-y-3">
          {fields.map((label, i) => (
            <div key={i} className="space-y-1">
              <p className="text-[11px] font-semibold text-foreground/80">{label}</p>
              <div className="h-8 rounded-lg border border-dashed border-border/60 bg-muted/30" />
            </div>
          ))}

          {/* Photo area */}
          <div className="pt-2 space-y-1">
            <p className="text-[11px] font-semibold text-foreground/80">Photo passeport (coller ici)</p>
            <div className="h-24 w-20 rounded-lg border border-dashed border-border/60 bg-muted/30 flex items-center justify-center">
              <span className="text-[9px] text-muted-foreground">3.5 × 4.5 cm</span>
            </div>
          </div>

          {/* Signature */}
          <div className="pt-3 flex items-end gap-2">
            <p className="text-[11px] font-semibold text-foreground/80 shrink-0">Signature :</p>
            <div className="flex-1 border-b border-dashed border-border/60 mb-0.5" />
          </div>
          <div className="flex items-end gap-2">
            <p className="text-[11px] font-semibold text-foreground/80 shrink-0">Date :</p>
            <div className="w-32 border-b border-dashed border-border/60 mb-0.5" />
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-muted/20 border-t border-border/30">
          <p className="text-[9px] text-muted-foreground italic text-center">
            Ce formulaire est à remplir par le visiteur. Le Directeur se chargera de saisir les données dans le système.
          </p>
        </div>
      </div>

      {/* Actions — same pattern as MembershipCard */}
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-2.5">
          <Button onClick={handleDownload} className="gap-2 rounded-xl h-11" variant="default">
            <Download className="h-4 w-4" />
            Télécharger PDF
          </Button>
          <Button onClick={handlePrint} disabled={generating} className="gap-2 rounded-xl h-11" variant="secondary">
            <Printer className="h-4 w-4" />
            Imprimer
          </Button>
        </div>

        <div className="flex items-center gap-2 px-1">
          <span className="text-xs text-muted-foreground">Partager :</span>
          <div className="flex gap-2">
            <a
              href={getWhatsAppUrl()}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-lg text-xs h-8 px-3 hover:bg-success/10 hover:text-success text-foreground transition-colors"
            >
              <MessageCircle className="h-3.5 w-3.5" />
              WhatsApp
            </a>
            <a
              href={getEmailUrl()}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-lg text-xs h-8 px-3 hover:bg-accent/10 hover:text-accent text-foreground transition-colors"
            >
              <Mail className="h-3.5 w-3.5" />
              Email
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

// ---- Main Page ----
export default function RegisterVisitor() {
  const navigate = useNavigate();
  const [step, setStep] = useState<"form" | "card" | "preview-form">("form");
  const [newVisitorId, setNewVisitorId] = useState("");
  const [fullName, setFullName] = useState("");
  const addVisitor = useAddVisitor();
  const { data: programs = [] } = usePrograms();
  const addParticipant = useAddParticipant();
  const scholarshipProgram = programs.find(p => p.name.trim().toLowerCase().startsWith("scholarship"));

  const [form, setForm] = useState({
    fullName: "",
    gender: "",
    dateOfBirth: "",
    phone: "",
    email: "",
    neighborhood: "",
    occupation: "",
    institution: "",
    photo: "",
  });

  const [activeTab, setActiveTab] = useState<"visitor" | "scholarship">("visitor");
  const [schForm, setSchForm] = useState({
    fullName: "", gender: "", dateOfBirth: "", phone: "", email: "",
    neighborhood: "", occupation: "", institution: "", photo: "",
    // Scholarship-specific
    formNumber: "",
    startDate: "",
    age: "",
    projectTitle: "",
    projectDomain: "",
    projectTools: "",
    obj1: "", obj2: "", obj3: "",
    nbDaysPerWeek: "",
    res1: "", res2: "",
    ind1: "", ind2: "",
    sharingLink: "",
    engagementSigned: false,
    signature: "",
  });
  const updateSch = (key: string, value: string | boolean) => setSchForm(f => ({ ...f, [key]: value }));
  const [presenceDays, setPresenceDays] = useState<string[]>([]);
  const togglePresenceDay = (d: string) =>
    setPresenceDays(prev => prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d]);
  const DAYS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];

  // ---- Scholarship: duplicate check & prefill ----
  type SchMatch = {
    source: "participant" | "visitor";
    participant_id?: string;
    visitor_id?: string;
    code: string;
    full_name: string;
    gender?: string | null;
    date_of_birth?: string | null;
    phone?: string | null;
    email?: string | null;
    neighborhood?: string | null;
    occupation?: string | null;
    institution?: string | null;
    photo?: string | null;
  };
  const [schMatches, setSchMatches] = useState<SchMatch[]>([]);
  const [schChecked, setSchChecked] = useState(false);
  const [schChecking, setSchChecking] = useState(false);
  const [linkedParticipantId, setLinkedParticipantId] = useState<string | null>(null);

  function nameSim(a: string, b: string): number {
    const na = a.toLowerCase().trim().replace(/\s+/g, " ");
    const nb = b.toLowerCase().trim().replace(/\s+/g, " ");
    if (!na || !nb) return 0;
    if (na === nb) return 1;
    if (na.includes(nb) || nb.includes(na)) return 0.8;
    const wa = na.split(" ").filter(Boolean);
    const wb = nb.split(" ").filter(Boolean);
    // Word-level fuzzy: any word in query matches (substring) any word in candidate
    let hits = 0;
    for (const w of wa) {
      if (w.length < 2) continue;
      if (wb.some(x => x.includes(w) || w.includes(x))) hits++;
    }
    if (hits === 0) return 0;
    return Math.min(1, 0.5 + (hits / wa.length) * 0.5);
  }

  const handleCheckSchDuplicates = async (name: string) => {
    if (name.trim().length < 2) { setSchMatches([]); setSchChecked(false); return; }
    setSchChecking(true);
    try {
      const matches: SchMatch[] = [];
      // Search existing scholarship participants first
      if (scholarshipProgram) {
        const { data: parts } = await supabase
          .from("program_participants")
          .select("*")
          .eq("program_id", scholarshipProgram.id);
        for (const p of parts || []) {
          if (nameSim(name, p.full_name) >= 0.5) {
            matches.push({
              source: "participant",
              participant_id: p.id,
              code: p.participant_code,
              full_name: p.full_name,
              gender: p.gender, date_of_birth: p.date_of_birth, phone: p.phone, email: p.email,
              neighborhood: p.neighborhood, occupation: p.occupation, institution: p.institution, photo: p.photo,
            });
          }
        }
      }
      // Then visitors (old form)
      const { data: visitors } = await supabase.from("visitors").select("*");
      for (const v of visitors || []) {
        if (nameSim(name, v.full_name) >= 0.5) {
          matches.push({
            source: "visitor",
            visitor_id: v.id,
            code: v.visitor_id,
            full_name: v.full_name,
            gender: v.gender, date_of_birth: v.date_of_birth, phone: v.phone, email: v.email,
            neighborhood: v.neighborhood, occupation: v.occupation, institution: v.institution, photo: v.photo,
          });
        }
      }
      // Dedupe by full_name+code
      const seen = new Set<string>();
      const unique = matches.filter(m => {
        const k = `${m.source}:${m.code}`;
        if (seen.has(k)) return false;
        seen.add(k); return true;
      });
      setSchMatches(unique);
      setSchChecked(true);
    } catch (err) { console.error(err); }
    setSchChecking(false);
  };

  const fillSchFromMatch = async (m: SchMatch) => {
    // Fill empty fields only — keep what user already typed
    setSchForm(f => ({
      ...f,
      fullName: f.fullName || m.full_name,
      gender: f.gender || m.gender || "",
      dateOfBirth: f.dateOfBirth || m.date_of_birth || "",
      phone: f.phone || m.phone || "",
      email: f.email || m.email || "",
      neighborhood: f.neighborhood || m.neighborhood || "",
      occupation: f.occupation || m.occupation || "",
      institution: f.institution || m.institution || "",
      photo: f.photo || m.photo || "",
    }));
    if (m.source === "participant" && m.participant_id) {
      setLinkedParticipantId(m.participant_id);
      // Load existing scholarship application to prefill
      const { data: app } = await supabase
        .from("scholarship_applications")
        .select("*")
        .eq("participant_id", m.participant_id)
        .maybeSingle();
      if (app) {
        setSchForm(f => ({
          ...f,
          formNumber: f.formNumber || app.form_number || "",
          startDate: f.startDate || app.start_date || "",
          age: f.age || (app.age != null ? String(app.age) : ""),
          projectTitle: f.projectTitle || app.project_title || "",
          projectDomain: f.projectDomain || app.project_domain || "",
          projectTools: f.projectTools || app.project_tools || "",
          obj1: f.obj1 || app.specific_objectives?.[0] || "",
          obj2: f.obj2 || app.specific_objectives?.[1] || "",
          obj3: f.obj3 || app.specific_objectives?.[2] || "",
          nbDaysPerWeek: f.nbDaysPerWeek || (app.nb_days_per_week != null ? String(app.nb_days_per_week) : ""),
          res1: f.res1 || app.expected_results?.[0] || "",
          res2: f.res2 || app.expected_results?.[1] || "",
          ind1: f.ind1 || app.performance_indicators?.[0] || "",
          ind2: f.ind2 || app.performance_indicators?.[1] || "",
          sharingLink: f.sharingLink || app.sharing_link || "",
          signature: f.signature || app.signature || "",
          engagementSigned: f.engagementSigned || !!app.engagement_signed,
        }));
        if (app.presence_days && app.presence_days.length) {
          setPresenceDays(prev => prev.length ? prev : app.presence_days as string[]);
        }
      }
      toast.success("Participant existant — données chargées. Complétez ce qui manque.");
    } else {
      setLinkedParticipantId(null);
      toast.success("Données du visiteur pré-remplies. Complétez le formulaire Scholarship.");
    }
  };

  const handleSubmitScholarship = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!schForm.fullName) { toast.error("Veuillez remplir le nom complet"); return; }
    if (!scholarshipProgram) {
      toast.error("Aucun programme « Scholarship » trouvé. Créez-le d'abord dans Programmes.");
      return;
    }
    if (!schForm.engagementSigned) {
      toast.error("Veuillez cocher l'engagement avant de valider.");
      return;
    }
    try {
      let participantId: string;
      let code: string;
      if (linkedParticipantId) {
        // Update existing participant — fill missing fields only
        const { data: existing } = await supabase
          .from("program_participants").select("*").eq("id", linkedParticipantId).maybeSingle();
        const patch: Record<string, unknown> = {
          full_name: existing?.full_name || schForm.fullName,
          gender: existing?.gender || schForm.gender || "other",
          date_of_birth: existing?.date_of_birth || schForm.dateOfBirth || null,
          phone: existing?.phone || schForm.phone || null,
          email: existing?.email || schForm.email || null,
          neighborhood: existing?.neighborhood || schForm.neighborhood || "—",
          occupation: existing?.occupation || schForm.occupation || "—",
          institution: existing?.institution || schForm.institution || null,
          photo: existing?.photo || schForm.photo || null,
        };
        const { error: updErr } = await supabase
          .from("program_participants").update(patch).eq("id", linkedParticipantId);
        if (updErr) throw updErr;
        participantId = linkedParticipantId;
        code = existing?.participant_code || "";
      } else {
        const prefix = scholarshipProgram.name.substring(0, 3).toUpperCase().replace(/\s/g, "");
        code = await generateParticipantCode(prefix);
        const participant = await addParticipant.mutateAsync({
          program_id: scholarshipProgram.id,
          participant_code: code,
          full_name: schForm.fullName,
          gender: schForm.gender || "other",
          date_of_birth: schForm.dateOfBirth || undefined,
          phone: schForm.phone || undefined,
          email: schForm.email || undefined,
          neighborhood: schForm.neighborhood || "—",
          occupation: schForm.occupation || "—",
          institution: schForm.institution || undefined,
          role: "eleve",
          photo: schForm.photo || undefined,
        });
        participantId = participant.id;
      }
      // Upsert scholarship-specific application — only fill missing fields if it exists
      const { data: existingApp } = await supabase
        .from("scholarship_applications").select("*").eq("participant_id", participantId).maybeSingle();
      const appPayload = {
        participant_id: participantId,
        form_number: schForm.formNumber || null,
        start_date: schForm.startDate || null,
        age: schForm.age ? parseInt(schForm.age) : null,
        project_title: schForm.projectTitle || null,
        project_domain: schForm.projectDomain || null,
        project_tools: schForm.projectTools || null,
        specific_objectives: [schForm.obj1, schForm.obj2, schForm.obj3].filter(Boolean),
        presence_days: presenceDays,
        nb_days_per_week: schForm.nbDaysPerWeek ? parseInt(schForm.nbDaysPerWeek) : null,
        expected_results: [schForm.res1, schForm.res2].filter(Boolean),
        performance_indicators: [schForm.ind1, schForm.ind2].filter(Boolean),
        sharing_link: schForm.sharingLink || null,
        engagement_signed: schForm.engagementSigned,
        signature: schForm.signature || null,
      };
      if (existingApp) {
        // Fill only missing fields (don't overwrite existing data)
        const merged: Record<string, unknown> = { ...appPayload };
        for (const k of Object.keys(appPayload) as (keyof typeof appPayload)[]) {
          const ev = (existingApp as Record<string, unknown>)[k];
          if (ev !== null && ev !== undefined && !(Array.isArray(ev) && ev.length === 0) && ev !== "") {
            merged[k] = ev;
          }
        }
        const { error: appErr } = await supabase
          .from("scholarship_applications").update(merged).eq("participant_id", participantId);
        if (appErr) throw appErr;
      } else {
        const { error: appErr } = await supabase.from("scholarship_applications").insert(appPayload);
        if (appErr) throw appErr;
      }
      toast.success(linkedParticipantId
        ? `Informations Scholarship mises à jour — ${code}`
        : `Inscrit au programme Scholarship — code ${code}`);
      setSchForm({
        fullName: "", gender: "", dateOfBirth: "", phone: "", email: "",
        neighborhood: "", occupation: "", institution: "", photo: "",
        formNumber: "", startDate: "", age: "", projectTitle: "", projectDomain: "",
        projectTools: "", obj1: "", obj2: "", obj3: "", nbDaysPerWeek: "",
        res1: "", res2: "", ind1: "", ind2: "", sharingLink: "",
        engagementSigned: false, signature: "",
      });
      setPresenceDays([]);
      setLinkedParticipantId(null);
      setSchMatches([]);
      setSchChecked(false);
    } catch (err) {
      console.error(err);
      toast.error("Erreur lors de l'inscription Scholarship");
    }
  };

  // Duplicate detection
  const [duplicates, setDuplicates] = useState<DuplicateCandidate[]>([]);
  const [duplicateChecked, setDuplicateChecked] = useState(false);
  const [checkingDuplicates, setCheckingDuplicates] = useState(false);
  const [selectedDuplicate, setSelectedDuplicate] = useState<DuplicateCandidate | null>(null);

  const update = (key: string, value: string) => setForm((f) => ({ ...f, [key]: value }));

  const handleCheckDuplicates = async (name: string) => {
    if (name.trim().length < 3) { setDuplicates([]); setDuplicateChecked(false); return; }
    setCheckingDuplicates(true);
    try {
      const results = await findDuplicates(name.trim());
      setDuplicates(results);
      setDuplicateChecked(true);
    } catch { /* ignore */ }
    setCheckingDuplicates(false);
  };

  const fillFromDuplicate = (d: DuplicateCandidate) => {
    setSelectedDuplicate(d);
    setForm(f => ({
      ...f,
      gender: d.gender || f.gender,
      dateOfBirth: d.date_of_birth || f.dateOfBirth,
      phone: d.phone || f.phone,
      email: d.email || f.email,
      neighborhood: d.neighborhood || f.neighborhood,
      occupation: d.occupation || f.occupation,
      institution: d.institution || f.institution,
      photo: d.photo || f.photo,
    }));
    toast.success("Données pré-remplies. Vérifiez et modifiez si nécessaire.");
  };

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
        institution: form.institution || undefined,
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

  if (step === "preview-form") {
    return <FormPreview onBack={() => setStep("form")} />;
  }

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
            setForm({ fullName: "", gender: "", dateOfBirth: "", phone: "", email: "", neighborhood: "", occupation: "", institution: "", photo: "" });
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
      <div className="flex items-center justify-between">
        <div className="page-header">
          <h1 className="page-title">Inscription</h1>
          <p className="page-subtitle">Ajouter un visiteur ou un participant Scholarship</p>
        </div>
        <Button variant="outline" className="gap-2 rounded-xl h-11" onClick={() => setStep("preview-form")}>
          <FileText className="h-4 w-4" />
          <span className="hidden sm:inline">Formulaire papier</span>
          <span className="sm:hidden">PDF</span>
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "visitor" | "scholarship")} className="w-full">
        <TabsList className="grid w-full grid-cols-2 h-11 rounded-xl">
          <TabsTrigger value="visitor" className="rounded-lg gap-2">
            <UserPlus className="h-4 w-4" /> Visiteur
          </TabsTrigger>
          <TabsTrigger value="scholarship" className="rounded-lg gap-2">
            <GraduationCap className="h-4 w-4" /> Scholarship
          </TabsTrigger>
        </TabsList>

        <TabsContent value="visitor" className="mt-4">
          <form onSubmit={handleSubmit} className="space-y-6 rounded-2xl border border-border/50 bg-card p-7 shadow-sm">
          <div className="grid gap-5 sm:grid-cols-2">
          <div className="sm:col-span-2 space-y-2">
            <Label htmlFor="fullName" className="text-foreground">Nom complet <span className="text-destructive">*</span></Label>
            <div className="flex gap-2">
              <Input id="fullName" value={form.fullName} onChange={(e) => update("fullName", e.target.value)} placeholder="Entrez le nom complet" className="rounded-xl h-11 flex-1" onBlur={() => handleCheckDuplicates(form.fullName)} />
              <Button type="button" variant="outline" size="sm" className="rounded-xl h-11 px-3 shrink-0" onClick={() => handleCheckDuplicates(form.fullName)} disabled={checkingDuplicates}>
                {checkingDuplicates ? "..." : "Vérifier"}
              </Button>
            </div>
          </div>

          {/* Duplicate alert */}
          {duplicateChecked && duplicates.length > 0 && (
            <div className="sm:col-span-2">
              <Alert className="border-warning/50 bg-warning/5">
                <AlertTriangle className="h-4 w-4 text-warning" />
                <AlertDescription className="space-y-2">
                  <p className="text-sm font-medium">⚠️ Personne(s) similaire(s) trouvée(s) :</p>
                  {duplicates.map(d => (
                    <div key={d.id} className="flex items-center justify-between gap-2 p-2 rounded-lg bg-background border border-border/50">
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{d.full_name}</p>
                        <p className="text-[10px] text-muted-foreground">
                          {d.source === "visitor" ? "Visiteur" : "Participant"} • {d.phone || "—"} • {d.code}
                        </p>
                      </div>
                      <Button type="button" size="sm" variant="secondary" className="shrink-0 gap-1 text-xs" onClick={() => fillFromDuplicate(d)}>
                        <Check className="h-3 w-3" /> Utiliser
                      </Button>
                    </div>
                  ))}
                  <p className="text-[10px] text-muted-foreground">Si c'est la même personne, elle est déjà enregistrée. Sinon, continuez l'inscription.</p>
                </AlertDescription>
              </Alert>
            </div>
          )}
          {duplicateChecked && duplicates.length === 0 && (
            <div className="sm:col-span-2">
              <p className="text-xs text-success flex items-center gap-1"><Check className="h-3 w-3" /> Aucun doublon détecté</p>
            </div>
          )}

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
            <Label htmlFor="institution" className="text-foreground flex items-center gap-1.5">
              <Building className="h-3.5 w-3.5" /> Institution (école, université...)
            </Label>
            <Input id="institution" value={form.institution} onChange={(e) => update("institution", e.target.value)} placeholder="Ex: Université du Burundi" className="rounded-xl h-11" />
          </div>

          <div className="sm:col-span-2 space-y-2">
            <Input id="photo" value={form.photo} onChange={(e) => update("photo", e.target.value)} placeholder="https://lh3.googleusercontent.com/d/..." className="rounded-xl h-11" />
            <p className="text-[10px] text-muted-foreground">Format Google Drive : https://lh3.googleusercontent.com/d/ID</p>
          </div>
        </div>

        <Button type="submit" className="w-full gap-2 rounded-xl h-12 text-sm font-semibold" size="lg" disabled={addVisitor.isPending}>
          <UserPlus className="h-4 w-4" />
          {addVisitor.isPending ? "Inscription en cours..." : "Inscrire le visiteur"}
        </Button>
          </form>
        </TabsContent>

        <TabsContent value="scholarship" className="mt-4">
          <form onSubmit={handleSubmitScholarship} className="space-y-6 rounded-2xl border border-primary/30 bg-card p-7 shadow-sm">
            <div className="flex items-start gap-3 rounded-xl bg-primary/5 border border-primary/20 p-3">
              <GraduationCap className="h-5 w-5 text-primary mt-0.5 shrink-0" />
              <div className="text-xs text-foreground/80">
                Cette inscription va directement dans le programme <b>Scholarship</b>{scholarshipProgram ? "" : " (introuvable — créez-le dans Programmes)"}.
              </div>
            </div>

            {/* Header: form number + start date */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label className="text-foreground">N° Formulaire</Label>
                <Input value={schForm.formNumber} onChange={(e) => updateSch("formNumber", e.target.value)} placeholder="ex: 001" className="rounded-xl h-11" />
              </div>
              <div className="space-y-2">
                <Label className="text-foreground">Date de début</Label>
                <Input type="date" value={schForm.startDate} onChange={(e) => updateSch("startDate", e.target.value)} className="rounded-xl h-11" />
              </div>
            </div>

            <h3 className="text-sm font-bold text-foreground">👤 1. Informations personnelles</h3>
            <div className="grid gap-5 sm:grid-cols-2">
              <div className="sm:col-span-2 space-y-2">
                <Label className="text-foreground">Nom complet <span className="text-destructive">*</span></Label>
                <div className="flex gap-2">
                  <Input
                    value={schForm.fullName}
                    onChange={(e) => { updateSch("fullName", e.target.value); if (linkedParticipantId) setLinkedParticipantId(null); }}
                    onBlur={() => handleCheckSchDuplicates(schForm.fullName)}
                    placeholder="Entrez le nom complet"
                    className="rounded-xl h-11 flex-1"
                  />
                  <Button type="button" variant="outline" size="sm" className="rounded-xl h-11 px-3 shrink-0" onClick={() => handleCheckSchDuplicates(schForm.fullName)} disabled={schChecking}>
                    {schChecking ? "..." : "Vérifier"}
                  </Button>
                </div>
                {linkedParticipantId && (
                  <p className="text-[11px] text-primary flex items-center gap-1">
                    <Check className="h-3 w-3" /> Participant Scholarship existant lié — seuls les champs vides seront complétés.
                  </p>
                )}
                {schChecked && schMatches.length > 0 && (
                  <Alert className="border-warning/50 bg-warning/5">
                    <AlertTriangle className="h-4 w-4 text-warning" />
                    <AlertDescription className="space-y-2">
                      <p className="text-sm font-medium">Personne(s) similaire(s) trouvée(s) :</p>
                      {schMatches.map((m, idx) => (
                        <div key={idx} className="flex items-center justify-between gap-2 p-2 rounded-lg bg-background border border-border/50">
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate">{m.full_name}</p>
                            <p className="text-[10px] text-muted-foreground">
                              {m.source === "participant" ? "Participant Scholarship" : "Visiteur"} • {m.phone || "—"} • {m.code}
                            </p>
                          </div>
                          <Button type="button" size="sm" variant="secondary" className="shrink-0 gap-1 text-xs" onClick={() => fillSchFromMatch(m)}>
                            <Check className="h-3 w-3" /> Utiliser
                          </Button>
                        </div>
                      ))}
                      <p className="text-[10px] text-muted-foreground">Cliquez « Utiliser » pour pré-remplir. Les champs vides seront complétés, les autres restent inchangés.</p>
                    </AlertDescription>
                  </Alert>
                )}
                {schChecked && schMatches.length === 0 && (
                  <p className="text-xs text-success flex items-center gap-1"><Check className="h-3 w-3" /> Aucune correspondance — nouvelle inscription</p>
                )}
              </div>
              <div className="space-y-2">
                <Label className="text-foreground">Genre</Label>
                <Select value={schForm.gender} onValueChange={(v) => updateSch("gender", v)}>
                  <SelectTrigger className="rounded-xl h-11"><SelectValue placeholder="Sélectionner" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">Homme</SelectItem>
                    <SelectItem value="female">Femme</SelectItem>
                    <SelectItem value="other">Autre</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-foreground">Âge (max 23 ans)</Label>
                <Input type="number" min={1} max={23} value={schForm.age} onChange={(e) => updateSch("age", e.target.value)} placeholder="ex: 21" className="rounded-xl h-11" />
              </div>
              <div className="space-y-2">
                <Label className="text-foreground">Date de naissance</Label>
                <Input type="date" value={schForm.dateOfBirth} onChange={(e) => updateSch("dateOfBirth", e.target.value)} className="rounded-xl h-11" />
              </div>
              <div className="space-y-2">
                <Label className="text-foreground">Téléphone</Label>
                <Input value={schForm.phone} onChange={(e) => updateSch("phone", e.target.value)} placeholder="+257 xx xxx xxx" className="rounded-xl h-11" />
              </div>
              <div className="space-y-2">
                <Label className="text-foreground">Email</Label>
                <Input type="email" value={schForm.email} onChange={(e) => updateSch("email", e.target.value)} placeholder="email@exemple.com" className="rounded-xl h-11" />
              </div>
              <div className="space-y-2">
                <Label className="text-foreground">Quartier / Commune</Label>
                <Input value={schForm.neighborhood} onChange={(e) => updateSch("neighborhood", e.target.value)} placeholder="ex: Mushasha" className="rounded-xl h-11" />
              </div>
              <div className="space-y-2">
                <Label className="text-foreground">Profession</Label>
                <Input value={schForm.occupation} onChange={(e) => updateSch("occupation", e.target.value)} placeholder="ex: Étudiant" className="rounded-xl h-11" />
              </div>
              <div className="sm:col-span-2 space-y-2">
                <Label className="text-foreground flex items-center gap-1.5">
                  <Building className="h-3.5 w-3.5" /> École / Institution
                </Label>
                <Input value={schForm.institution} onChange={(e) => updateSch("institution", e.target.value)} placeholder="Ex: Université du Burundi" className="rounded-xl h-11" />
              </div>
              <div className="sm:col-span-2 space-y-2">
                <Label className="text-foreground">Photo (URL)</Label>
                <Input value={schForm.photo} onChange={(e) => updateSch("photo", e.target.value)} placeholder="Photo (URL Google Drive)" className="rounded-xl h-11" />
              </div>
            </div>

            {/* Section 2: Project / Research */}
            <div className="border-t border-border/40 pt-5 space-y-3">
              <h3 className="text-sm font-bold text-foreground">💻 2. Projet / Recherche</h3>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2 space-y-2">
                  <Label className="text-foreground">Titre du projet</Label>
                  <Input value={schForm.projectTitle} onChange={(e) => updateSch("projectTitle", e.target.value)} placeholder="Ex: Mon site portfolio" className="rounded-xl h-11" />
                </div>
                <div className="space-y-2">
                  <Label className="text-foreground">Domaine</Label>
                  <Input value={schForm.projectDomain} onChange={(e) => updateSch("projectDomain", e.target.value)} placeholder="Dev web, Design, IA, Vidéo..." className="rounded-xl h-11" />
                </div>
                <div className="space-y-2">
                  <Label className="text-foreground">Logiciels / Outils</Label>
                  <Input value={schForm.projectTools} onChange={(e) => updateSch("projectTools", e.target.value)} placeholder="VS Code, Figma, Coursera..." className="rounded-xl h-11" />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-foreground">Objectifs spécifiques</Label>
                <p className="text-[11px] text-muted-foreground">Actions précises et réalisables. Soyez concret.</p>
                <Input value={schForm.obj1} onChange={(e) => updateSch("obj1", e.target.value)} placeholder="1." className="rounded-xl h-11" />
                <Input value={schForm.obj2} onChange={(e) => updateSch("obj2", e.target.value)} placeholder="2." className="rounded-xl h-11" />
                <Input value={schForm.obj3} onChange={(e) => updateSch("obj3", e.target.value)} placeholder="3." className="rounded-xl h-11" />
              </div>
            </div>

            {/* Section 3: Availability */}
            <div className="border-t border-border/40 pt-5 space-y-3">
              <h3 className="text-sm font-bold text-foreground">📅 3. Disponibilité</h3>
              <div className="space-y-2">
                <Label className="text-foreground">Jours de présence</Label>
                <div className="flex flex-wrap gap-2">
                  {DAYS.map(d => (
                    <label key={d} className="flex items-center gap-2 rounded-lg border border-border/50 bg-muted/30 px-3 py-2 cursor-pointer">
                      <Checkbox checked={presenceDays.includes(d)} onCheckedChange={() => togglePresenceDay(d)} />
                      <span className="text-sm">{d}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div className="space-y-2 max-w-[200px]">
                <Label className="text-foreground">Nb jours / semaine</Label>
                <Input type="number" min={1} max={6} value={schForm.nbDaysPerWeek} onChange={(e) => updateSch("nbDaysPerWeek", e.target.value)} placeholder="ex: 3" className="rounded-xl h-11" />
              </div>
            </div>

            {/* Section 4: Performance & Suivi */}
            <div className="border-t border-border/40 pt-5 space-y-4">
              <h3 className="text-sm font-bold text-foreground">📊 4. Performance & Suivi</h3>
              <div className="space-y-2">
                <Label className="text-foreground">Résultats attendus</Label>
                <p className="text-[11px] text-muted-foreground">Ce que tu auras PRODUIT à la fin du mois (visible, montrable).</p>
                <Input value={schForm.res1} onChange={(e) => updateSch("res1", e.target.value)} placeholder="1." className="rounded-xl h-11" />
                <Input value={schForm.res2} onChange={(e) => updateSch("res2", e.target.value)} placeholder="2." className="rounded-xl h-11" />
              </div>
              <div className="space-y-2">
                <Label className="text-foreground">Indicateurs de performance</Label>
                <p className="text-[11px] text-muted-foreground">Preuves CHIFFRABLES de ta progression.</p>
                <Input value={schForm.ind1} onChange={(e) => updateSch("ind1", e.target.value)} placeholder="1." className="rounded-xl h-11" />
                <Input value={schForm.ind2} onChange={(e) => updateSch("ind2", e.target.value)} placeholder="2." className="rounded-xl h-11" />
              </div>
              <div className="space-y-2">
                <Label className="text-foreground">Lien de partage</Label>
                <Input value={schForm.sharingLink} onChange={(e) => updateSch("sharingLink", e.target.value)} placeholder="Drive / GitHub / YouTube / Réseau social..." className="rounded-xl h-11" />
              </div>
            </div>

            {/* Engagement */}
            <div className="border-t border-border/40 pt-5 space-y-3">
              <div className="rounded-xl bg-muted/30 border border-border/40 p-4 text-xs text-foreground/80 leading-relaxed">
                <b>Engagement :</b> Je m'engage à utiliser les ressources responsablement, respecter mes jours de présence, partager mes avancées en ligne et prendre soin du matériel. Ce formulaire est valable 1 mois, renouvelable selon mes résultats.
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <Checkbox checked={schForm.engagementSigned} onCheckedChange={(v) => updateSch("engagementSigned", v === true)} />
                <span className="text-sm">Lu et approuvé <span className="text-destructive">*</span></span>
              </label>
              <div className="space-y-2">
                <Label className="text-foreground">Signature (nom dactylographié)</Label>
                <Input value={schForm.signature} onChange={(e) => updateSch("signature", e.target.value)} placeholder="Tapez votre nom complet" className="rounded-xl h-11" />
              </div>
            </div>

            <Button type="submit" className="w-full gap-2 rounded-xl h-12 text-sm font-semibold" size="lg" disabled={addParticipant.isPending || !scholarshipProgram}>
              <GraduationCap className="h-4 w-4" />
              {addParticipant.isPending ? "Inscription en cours..." : "Inscrire au programme Scholarship"}
            </Button>
          </form>
        </TabsContent>
      </Tabs>
    </div>
  );
}
