import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAddVisitor, generateVisitorId } from "@/lib/supabase-store";
import { findDuplicates, type DuplicateCandidate } from "@/lib/duplicate-check";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
  doc.text("AMERICAN CORNER NGOZI", w / 2, y, { align: "center" });
  y += 6;
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text("Registration Form — Visitor", w / 2, y, { align: "center" });
  y += 4;
  doc.setDrawColor(80, 80, 80);
  doc.setLineWidth(0.4);
  doc.line(margin, y, w - margin, y);
  y += 8;

  const fields = [
    "Full name *",
    "Gender (Male / Female / Other)",
    "Date of birth (DD/MM/YYYY)",
    "Phone",
    "Email",
    "Neighborhood / Commune",
    "Occupation",
    "Institution (school, university...)",
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
  doc.text("Passport photo (paste here)", margin, y);
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
  doc.text("Visitor signature:", margin, sigY);
  doc.setLineWidth(0.3);
  doc.setDrawColor(120, 120, 120);
  doc.line(margin + 40, sigY, w - margin, sigY);

  const dateY = sigY + 10;
  doc.text("Date:", margin, dateY);
  doc.line(margin + 16, dateY, margin + 70, dateY);

  return doc;
}

// ---- Form Preview Component ----
function FormPreview({ onBack }: { onBack: () => void }) {
  const [generating, setGenerating] = useState(false);

  const handleDownload = () => {
    const doc = buildFormPDF();
    doc.save("visitor-registration-form.pdf");
    toast.success("PDF form downloaded!");
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
      `📋 *Registration Form - American Corner*\n\n` +
      `Hello! Please fill in the registration form by following this link:\n\n` +
      `👉 ${formUrl}\n\n` +
      `You can also download the PDF from this page to fill it in by hand.\n\n` +
      `Thank you!\n— American Corner`;
    return `https://wa.me/?text=${encodeURIComponent(message)}`;
  };

  const getEmailUrl = () => {
    const formUrl = `${window.location.origin}/formulaire`;
    const subject = "Registration Form - American Corner";
    const body =
      `Hello,\n\n` +
      `Please fill in your registration form for American Corner by following this link:\n\n` +
      `${formUrl}\n\n` +
      `You can also download the PDF from this page to fill it in by hand.\n\n` +
      `Thank you!\n\nBest regards,\nAmerican Corner`;
    return `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };

  const fields = [
    "Full name *",
    "Gender (Male / Female / Other)",
    "Date of birth (DD/MM/YYYY)",
    "Phone",
    "Email",
    "Neighborhood / Commune",
    "Occupation",
    "Institution (school, university...)",
  ];

  return (
    <div className="mx-auto max-w-lg space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" className="rounded-xl" onClick={onBack}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h2 className="text-lg font-bold text-foreground">Registration Form</h2>
          <p className="text-sm text-muted-foreground">Paper form preview</p>
        </div>
      </div>

      {/* Visual Preview */}
      <div className="rounded-2xl border border-border/50 bg-card shadow-xl overflow-hidden">
        {/* Form header */}
        <div className="bg-gradient-to-r from-primary/10 to-accent/10 px-6 py-5 text-center border-b border-border/30">
          <div className="flex items-center justify-center gap-3 mb-2">
            <img src="/gss-logo.png" alt="American Spaces" className="h-8 w-8 rounded-lg object-contain" />
            <h3 className="text-sm font-bold tracking-widest text-foreground uppercase">American Corner</h3>
          </div>
          <p className="text-xs text-muted-foreground">Registration Form — Visitor</p>
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
            <p className="text-[11px] font-semibold text-foreground/80">Passport photo (paste here)</p>
            <div className="h-24 w-20 rounded-lg border border-dashed border-border/60 bg-muted/30 flex items-center justify-center">
              <span className="text-[9px] text-muted-foreground">3.5 × 4.5 cm</span>
            </div>
          </div>

          {/* Signature */}
          <div className="pt-3 flex items-end gap-2">
            <p className="text-[11px] font-semibold text-foreground/80 shrink-0">Signature:</p>
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
            This form must be filled in by the visitor. The Director will then enter the data into the system.
          </p>
        </div>
      </div>

      {/* Actions — same pattern as MembershipCard */}
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-2.5">
          <Button onClick={handleDownload} className="gap-2 rounded-xl h-11" variant="default">
            <Download className="h-4 w-4" />
            Download PDF
          </Button>
          <Button onClick={handlePrint} disabled={generating} className="gap-2 rounded-xl h-11" variant="secondary">
            <Printer className="h-4 w-4" />
            Print
          </Button>
        </div>

        <div className="flex items-center gap-2 px-1">
          <span className="text-xs text-muted-foreground">Share:</span>
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

// ---- Mayn Page ----
export default function RegisterVisitor() {
  const navigate = useNavigate();
  const [step, setStep] = useState<"form" | "card" | "preview-form">("form");
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
    institution: "",
    photo: "",
    memberType: "visitor",
    membershipStatus: "active",
  });


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
    toast.success("Data pre-filled. Review and edit if needed.");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.fullName) {
      toast.error("Please enter the full name");
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
        member_type: (form.memberType || "visitor") as "student" | "professional" | "entrepreneur" | "visitor" | "volunteer" | "member",
        membership_status: (form.membershipStatus || "active") as "active" | "inactive" | "pending",
      });

      setNewVisitorId(visitorId);
      setFullName(form.fullName);
      setStep("card");
      toast.success("Member registered successfully!");
    } catch (err) {
      console.error(err);
      toast.error("Error during registration");
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
          <h2 className="text-xl font-bold text-foreground">Registration complete</h2>
          <p className="mt-1 text-sm text-muted-foreground">Membership card is ready</p>
        </div>

        <MembershipCard fullName={fullName} visitorId={newVisitorId} />

        <div className="flex gap-3">
          <Button className="flex-1 gap-2 rounded-xl h-11" variant="outline" onClick={() => {
            setStep("form");
            setForm({ fullName: "", gender: "", dateOfBirth: "", phone: "", email: "", neighborhood: "", occupation: "", institution: "", photo: "", memberType: "visitor", membershipStatus: "active" });
          }}>
            <UserPlus className="h-4 w-4" />
            Register another
          </Button>
          <Button className="flex-1 gap-2 rounded-xl h-11" variant="outline" onClick={() => navigate("/visitors")}>
            View visitors
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-8 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="page-header">
          <h1 className="page-title">Member Registration</h1>
          <p className="page-subtitle">Add a member, student, professional or volunteer</p>
        </div>
        <Button variant="outline" className="gap-2 rounded-xl h-11" onClick={() => setStep("preview-form")}>
          <FileText className="h-4 w-4" />
          <span className="hidden sm:inline">Paper form</span>
          <span className="sm:hidden">PDF</span>
        </Button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6 rounded-2xl border border-border/50 bg-card p-7 shadow-sm">
        <div className="grid gap-5 sm:grid-cols-2">
          <div className="sm:col-span-2 space-y-2">
            <Label htmlFor="fullName" className="text-foreground">Full name <span className="text-destructive">*</span></Label>
            <div className="flex gap-2">
              <Input id="fullName" value={form.fullName} onChange={(e) => update("fullName", e.target.value)} placeholder="Enter full name" className="rounded-xl h-11 flex-1" onBlur={() => handleCheckDuplicates(form.fullName)} />
              <Button type="button" variant="outline" size="sm" className="rounded-xl h-11 px-3 shrink-0" onClick={() => handleCheckDuplicates(form.fullName)} disabled={checkingDuplicates}>
                {checkingDuplicates ? "..." : "Check"}
              </Button>
            </div>
          </div>


          {/* Duplicate alert */}
          {duplicateChecked && duplicates.length > 0 && (
            <div className="sm:col-span-2">
              <Alert className="border-warning/50 bg-warning/5">
                <AlertTriangle className="h-4 w-4 text-warning" />
                <AlertDescription className="space-y-2">
                  <p className="text-sm font-medium">⚠️ Similar person(s) found:</p>
                  {duplicates.map(d => (
                    <div key={d.id} className="flex items-center justify-between gap-2 p-2 rounded-lg bg-background border border-border/50">
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{d.full_name}</p>
                        <p className="text-[10px] text-muted-foreground">
                          {d.source === "visitor" ? "Visitor" : "Participant"} • {d.phone || "—"} • {d.code}
                        </p>
                      </div>
                      <Button type="button" size="sm" variant="secondary" className="shrink-0 gap-1 text-xs" onClick={() => fillFromDuplicate(d)}>
                        <Check className="h-3 w-3" /> Utiliser
                      </Button>
                    </div>
                  ))}
                  <p className="text-[10px] text-muted-foreground">If it's the same person, they are already registered. Otherwise, continue the registration.</p>
                </AlertDescription>
              </Alert>
            </div>
          )}
          {duplicateChecked && duplicates.length === 0 && (
            <div className="sm:col-span-2">
              <p className="text-xs text-success flex items-center gap-1"><Check className="h-3 w-3" /> No duplicates found</p>
            </div>
          )}

          <div className="space-y-2">
            <Label className="text-foreground">Gender</Label>
            <Select value={form.gender} onValueChange={(v) => update("gender", v)}>
              <SelectTrigger className="rounded-xl h-11"><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="male">Male</SelectItem>
                <SelectItem value="female">Female</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="dob" className="text-foreground">Date of birth</Label>
            <Input id="dob" type="date" value={form.dateOfBirth} onChange={(e) => update("dateOfBirth", e.target.value)} className="rounded-xl h-11" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone" className="text-foreground">Phone</Label>
            <Input id="phone" value={form.phone} onChange={(e) => update("phone", e.target.value)} placeholder="+257 xx xxx xxx" className="rounded-xl h-11" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email" className="text-foreground">Email (optional)</Label>
            <Input id="email" type="email" value={form.email} onChange={(e) => update("email", e.target.value)} placeholder="email@exemple.com" className="rounded-xl h-11" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="neighborhood" className="text-foreground">Neighborhood / Commune</Label>
            <Input id="neighborhood" value={form.neighborhood} onChange={(e) => update("neighborhood", e.target.value)} placeholder="ex: Mushasha" className="rounded-xl h-11" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="occupation" className="text-foreground">Occupation</Label>
            <Input id="occupation" value={form.occupation} onChange={(e) => update("occupation", e.target.value)} placeholder="e.g. Student, Entrepreneur" className="rounded-xl h-11" />
          </div>

          <div className="sm:col-span-2 space-y-2">
            <Label htmlFor="institution" className="text-foreground flex items-center gap-1.5">
              <Building className="h-3.5 w-3.5" /> Institution (school, university...)
            </Label>
            <Input id="institution" value={form.institution} onChange={(e) => update("institution", e.target.value)} placeholder="e.g. Burundi University" className="rounded-xl h-11" />
          </div>

          <div className="space-y-2">
            <Label className="text-foreground flex items-center gap-1.5">
              <GraduationCap className="h-3.5 w-3.5" /> Member type
            </Label>
            <Select value={form.memberType} onValueChange={(v) => update("memberType", v)}>
              <SelectTrigger className="rounded-xl h-11"><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="visitor">Visitor</SelectItem>
                <SelectItem value="member">Member</SelectItem>
                <SelectItem value="student">Student</SelectItem>
                <SelectItem value="professional">Professional</SelectItem>
                <SelectItem value="entrepreneur">Entrepreneur</SelectItem>
                <SelectItem value="volunteer">Volunteer</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-foreground">Membership status</Label>
            <Select value={form.membershipStatus} onValueChange={(v) => update("membershipStatus", v)}>
              <SelectTrigger className="rounded-xl h-11"><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="sm:col-span-2 space-y-2">
            <Input id="photo" value={form.photo} onChange={(e) => update("photo", e.target.value)} placeholder="https://lh3.googleusercontent.com/d/..." className="rounded-xl h-11" />
            <p className="text-[10px] text-muted-foreground">Format Google Drive : https://lh3.googleusercontent.com/d/ID</p>
          </div>
        </div>

        <Button type="submit" className="w-full gap-2 rounded-xl h-12 text-sm font-semibold" size="lg" disabled={addVisitor.isPending}>
          <UserPlus className="h-4 w-4" />
          {addVisitor.isPending ? "Registering..." : "Register member"}
        </Button>
      </form>
    </div>
  );
}

