import { Button } from "@/components/ui/button";
import { Download, Printer } from "lucide-react";
import jsPDF from "jspdf";
import { toast } from "sonner";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useState } from "react";

// Colors
const C_BLUE: [number, number, number] = [30, 95, 184];
const C_BLUE_DARK: [number, number, number] = [20, 60, 130];
const C_FIELD_BG: [number, number, number] = [232, 241, 250];
const C_INFO_BG: [number, number, number] = [255, 247, 230];
const C_ORANGE: [number, number, number] = [243, 156, 18];
const C_BORDER: [number, number, number] = [184, 212, 232];
const C_TEXT: [number, number, number] = [40, 40, 40];
const C_MUTED: [number, number, number] = [110, 110, 110];

function setFill(doc: jsPDF, c: [number, number, number]) { doc.setFillColor(c[0], c[1], c[2]); }
function setStroke(doc: jsPDF, c: [number, number, number]) { doc.setDrawColor(c[0], c[1], c[2]); }
function setText(doc: jsPDF, c: [number, number, number]) { doc.setTextColor(c[0], c[1], c[2]); }

function sectionHeader(doc: jsPDF, x: number, y: number, w: number, title: string) {
  setFill(doc, C_BLUE);
  doc.rect(x, y, w, 7, "F");
  setText(doc, [255, 255, 255]);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text(title, x + 3, y + 5);
  return y + 7;
}

function fieldRow(doc: jsPDF, x: number, y: number, w: number, label: string, h = 7) {
  setFill(doc, C_FIELD_BG);
  doc.rect(x, y, w, h, "F");
  setText(doc, C_BLUE_DARK);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.text(label, x + 2, y + 4.5);
  // underline for filling
  setStroke(doc, C_BORDER);
  doc.setLineWidth(0.2);
  return y + h;
}

function infoBox(doc: jsPDF, x: number, y: number, w: number, title: string, body: string) {
  const lineH = 3.2;
  doc.setFontSize(7.5);
  doc.setFont("helvetica", "normal");
  const wrapped = doc.splitTextToSize(body, w - 14);
  const h = Math.max(8, wrapped.length * lineH + 5);
  setFill(doc, C_INFO_BG);
  doc.rect(x, y, w, h, "F");
  // orange "i" badge
  setFill(doc, C_ORANGE);
  doc.rect(x, y, 5, h, "F");
  setText(doc, [255, 255, 255]);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.text("i", x + 2.5, y + h / 2 + 1, { align: "center" });
  // title + body
  setText(doc, C_BLUE_DARK);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.text(title, x + 8, y + 4);
  setText(doc, C_TEXT);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.text(wrapped, x + 8, y + 7.5);
  return y + h;
}

function buildFormPDF(): jsPDF {
  const doc = new jsPDF("p", "mm", "a4");
  const W = 210;
  const M = 12;
  const CW = W - M * 2;
  let y = M;

  // ===== Top banner =====
  setFill(doc, C_BLUE);
  doc.rect(M, y, CW, 18, "F");
  setText(doc, [255, 255, 255]);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text("GITEGA STUDY SPACE", W / 2, y + 7.5, { align: "center" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text("Formulaire d'Accès aux Machines  |  Free Tech Institute", W / 2, y + 12.5, { align: "center" });
  doc.setFontSize(8);
  doc.text("Valable 1 mois  |  Renouvelable  |  Lun-Sam 8h-17h  |  15 machines", W / 2, y + 16.5, { align: "center" });
  y += 22;

  // ===== N° formulaire + Date début + Photo =====
  const photoW = 30;
  const topRowW = CW - photoW - 3;
  // N° formulaire
  setFill(doc, C_FIELD_BG);
  doc.rect(M, y, topRowW / 2 - 1, 12, "F");
  setText(doc, C_BLUE_DARK);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.text("N° Formulaire :", M + 2, y + 4);
  setStroke(doc, C_BLUE_DARK);
  doc.setLineWidth(0.3);
  doc.line(M + 25, y + 9, M + topRowW / 2 - 3, y + 9);

  // Date début
  const dx = M + topRowW / 2 + 1;
  setFill(doc, C_FIELD_BG);
  doc.rect(dx, y, topRowW / 2 - 1, 12, "F");
  doc.text("Date début :", dx + 2, y + 4);
  doc.line(dx + 22, y + 9, dx + topRowW / 2 - 3, y + 9);

  // Photo box
  const px = M + CW - photoW;
  setFill(doc, C_FIELD_BG);
  doc.rect(px, y, photoW, 28, "F");
  setText(doc, C_MUTED);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text("Photo", px + photoW / 2, y + 14, { align: "center" });
  y += 14;

  // ===== 1. INFORMATIONS PERSONNELLES =====
  const sectionW = CW - photoW - 3;
  y = sectionHeader(doc, M, y, sectionW, "1. INFORMATIONS PERSONNELLES");
  y += 1;

  // Nom et Prénom (full width)
  const labelW = 38;
  const drawField = (x: number, yy: number, w: number, label: string) => {
    setFill(doc, C_FIELD_BG);
    doc.rect(x, yy, w, 8, "F");
    setText(doc, C_BLUE_DARK);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.text(label, x + 2, yy + 5);
    setStroke(doc, C_BLUE_DARK);
    doc.setLineWidth(0.3);
    doc.line(x + labelW, yy + 6.5, x + w - 2, yy + 6.5);
  };
  drawField(M, y, sectionW, "Nom et Prénom :");
  y += 9;
  const halfW = sectionW / 2 - 1;
  drawField(M, y, halfW, "Age (max 23 ans) :");
  drawField(M + halfW + 2, y, halfW, "Tél / WhatsApp :");
  y += 9;
  drawField(M, y, halfW, "Province / Quartier :");
  drawField(M + halfW + 2, y, halfW, "École / Institution :");
  y += 11;

  // ===== 2. PROJET / RECHERCHE =====
  y = sectionHeader(doc, M, y, CW, "2. PROJET / RECHERCHE");
  y += 1;
  drawField(M, y, CW, "Titre du Projet :"); y += 9;
  drawField(M, y, CW, "Domaine (Dev web, Design, IA, Vidéo...) :"); y += 9;
  drawField(M, y, CW, "Logiciels / Sites / Outils nécessaires :"); y += 11;

  // Info: Objectifs spécifiques
  y = infoBox(doc, M, y, CW, "Objectifs Spécifiques :",
    "Actions précises et réalisables. Ex: \"Apprendre HTML\", \"Créer une page web\", \"Finir un module Coursera\". Soyez concret et réaliste.");
  y += 1;
  for (let i = 1; i <= 3; i++) {
    setFill(doc, C_FIELD_BG);
    doc.rect(M, y, CW, 7, "F");
    setText(doc, C_BLUE_DARK);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.text(`${i}.`, M + 2, y + 4.5);
    setStroke(doc, C_BLUE_DARK);
    doc.setLineWidth(0.3);
    doc.line(M + 7, y + 5.5, M + CW - 2, y + 5.5);
    y += 8;
  }
  y += 3;

  // ===== 3. DISPONIBILITE =====
  y = sectionHeader(doc, M, y, CW, "3. DISPONIBILITÉ");
  y += 1;
  // Jours de présence (checkboxes)
  setFill(doc, C_FIELD_BG);
  doc.rect(M, y, CW, 8, "F");
  setText(doc, C_BLUE_DARK);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.text("Jours de présence :", M + 2, y + 5);
  const days = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];
  let cx = M + labelW + 2;
  setStroke(doc, C_BLUE_DARK);
  doc.setLineWidth(0.3);
  setText(doc, C_TEXT);
  doc.setFont("helvetica", "normal");
  days.forEach((d) => {
    doc.rect(cx, y + 2.5, 3, 3);
    doc.text(d, cx + 4, y + 5);
    cx += 22;
  });
  y += 9;
  drawField(M, y, halfW, "Nb jours / semaine :");
  y += 11;

  // ===== 4. PERFORMANCE & SUIVI =====
  y = sectionHeader(doc, M, y, CW, "4. PERFORMANCE & SUIVI");
  y += 1;

  y = infoBox(doc, M, y, CW, "Résultats Attendus :",
    "Ce que tu auras PRODUIT à la fin du mois, quelque chose de visible : site publié, certificat, vidéo postée, appli fonctionnelle... Ce que tu pourras MONTRER au responsable.");
  y += 1;
  for (let i = 1; i <= 2; i++) {
    setFill(doc, C_FIELD_BG);
    doc.rect(M, y, CW, 7, "F");
    setText(doc, C_BLUE_DARK);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.text(`${i}.`, M + 2, y + 4.5);
    setStroke(doc, C_BLUE_DARK);
    doc.line(M + 7, y + 5.5, M + CW - 2, y + 5.5);
    y += 8;
  }
  y += 2;

  y = infoBox(doc, M, y, CW, "Indicateurs de Performance :",
    "Preuves CHIFFRABLES de ta progression. Ex: \"3 modules terminés\", \"site en ligne avec 3 pages\", \"10 abonnés YouTube\". Ces chiffres déterminent le renouvellement de ton accès.");
  y += 1;
  for (let i = 1; i <= 2; i++) {
    setFill(doc, C_FIELD_BG);
    doc.rect(M, y, CW, 7, "F");
    setText(doc, C_BLUE_DARK);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.text(`${i}.`, M + 2, y + 4.5);
    setStroke(doc, C_BLUE_DARK);
    doc.line(M + 7, y + 5.5, M + CW - 2, y + 5.5);
    y += 8;
  }
  y += 2;

  drawField(M, y, CW, "Lien de partage (Drive / GitHub / YouTube...) :");
  y += 11;

  // Engagement
  y = infoBox(doc, M, y, CW, "Engagement :",
    "Je m'engage à utiliser les ressources responsablement, respecter mes jours de présence, partager mes avancées en ligne et prendre soin du matériel. Ce formulaire est valable 1 mois, renouvelable selon mes résultats.");
  y += 3;

  // ===== Signatures + Évaluation =====
  const sigW = (CW - 4) / 3;
  const sigH = 22;
  // Signature candidat
  setText(doc, C_BLUE_DARK);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.text("Signature du candidat(e)", M + sigW / 2, y + 3, { align: "center" });
  setStroke(doc, C_BORDER);
  doc.setLineWidth(0.4);
  doc.rect(M, y + 5, sigW, sigH);
  setText(doc, C_MUTED);
  doc.setFont("helvetica", "italic");
  doc.setFontSize(7);
  doc.text("Lu et approuvé + signature", M + sigW / 2, y + 5 + sigH - 2, { align: "center" });

  // Validé par le responsable
  const vx = M + sigW + 2;
  setText(doc, C_BLUE_DARK);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.text("Validé par le Responsable", vx + sigW / 2, y + 3, { align: "center" });
  setStroke(doc, C_BORDER);
  doc.rect(vx, y + 5, sigW, sigH);
  setText(doc, C_MUTED);
  doc.setFont("helvetica", "italic");
  doc.setFontSize(7);
  doc.text("Signature", vx + sigW / 2, y + 5 + sigH - 2, { align: "center" });

  // Évaluation fin de mois
  const ex = M + (sigW + 2) * 2;
  setText(doc, C_BLUE_DARK);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.text("Évaluation fin de mois", ex + sigW / 2, y + 3, { align: "center" });
  setFill(doc, C_FIELD_BG);
  doc.rect(ex, y + 5, sigW, sigH, "F");
  setStroke(doc, C_BORDER);
  doc.rect(ex, y + 5, sigW, sigH);
  setStroke(doc, C_BLUE_DARK);
  doc.setLineWidth(0.3);
  doc.rect(ex + 3, y + 9, 3, 3);
  doc.rect(ex + 3, y + 14, 3, 3);
  setText(doc, C_TEXT);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.text("Renouvelé(e)", ex + 8, y + 11.5);
  doc.text("Non renouvelé(e)", ex + 8, y + 16.5);
  doc.setFont("helvetica", "bold");
  doc.text("Note :", ex + 3, y + 22);
  doc.line(ex + 12, y + 22, ex + sigW - 2, y + 22);

  y += 5 + sigH + 4;

  // Footer
  setStroke(doc, C_BORDER);
  doc.setLineWidth(0.3);
  doc.line(M, y, M + CW, y);
  y += 4;
  setText(doc, C_MUTED);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.text(
    "Free Tech Institute  |  Gitega Study Space, Q. Stade, Gitega  |  info@freeti.org  |  +257 69 03 49 65  |  www.freeti.org",
    W / 2, y, { align: "center" }
  );

  return doc;
}

// ===== Simple Visitor Form PDF (original) =====
function buildVisitorFormPDF(): jsPDF {
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

export default function RegistrationForm() {
  const [tab, setTab] = useState<"visitor" | "scholarship">("visitor");

  const handleDownload = () => {
    const doc = tab === "scholarship" ? buildFormPDF() : buildVisitorFormPDF();
    doc.save(tab === "scholarship" ? "formulaire-scholarship-application.pdf" : "formulaire-inscription-visiteur.pdf");
    toast.success("Formulaire téléchargé !");
  };

  const handlePrint = () => {
    try {
      const doc = tab === "scholarship" ? buildFormPDF() : buildVisitorFormPDF();
      const pdfDataUri = doc.output("datauristring");
      const printWindow = window.open("", "_blank");
      if (printWindow) {
        printWindow.document.write(`
          <!DOCTYPE html><html><head><title>Formulaire d'inscription</title></head>
          <body style="margin:0;display:flex;justify-content:center;align-items:center;min-height:100vh;background:#f0f0f0;">
            <embed src="${pdfDataUri}" type="application/pdf" width="700" height="950" />
            <script>setTimeout(function(){window.print();},500);</script>
          </body></html>
        `);
        printWindow.document.close();
      }
    } catch {
      toast.error("Erreur lors de l'impression");
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center py-8 px-4">
      <div className="w-full max-w-2xl space-y-6">
        {/* Header */}
        <div className="text-center space-y-1">
          <div className="flex items-center justify-center gap-3 mb-2">
            <img src="/gss-logo.png" alt="GSS" className="h-10 w-10 rounded-xl object-contain" />
          </div>
          <h1 className="text-xl font-bold text-foreground">Formulaires d'inscription</h1>
          <p className="text-sm text-muted-foreground">Gitega Study Space</p>
        </div>

        <Tabs value={tab} onValueChange={(v) => setTab(v as "visitor" | "scholarship")} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="visitor">Visiteur</TabsTrigger>
            <TabsTrigger value="scholarship">Scholarship</TabsTrigger>
          </TabsList>

          <TabsContent value="visitor" className="mt-4">
            <div className="rounded-2xl border border-border/50 bg-card shadow-xl overflow-hidden">
              <div className="bg-gradient-to-r from-primary/10 to-accent/10 px-6 py-5 text-center border-b border-border/30">
                <h3 className="text-sm font-bold tracking-widest text-foreground uppercase">Gitega Study Space</h3>
                <p className="text-xs text-muted-foreground mt-1">Formulaire d'inscription — Visiteur</p>
              </div>
              <div className="px-6 py-4 space-y-3">
                {[
                  "Nom complet *",
                  "Genre (Homme / Femme / Autre)",
                  "Date de naissance (JJ/MM/AAAA)",
                  "Téléphone",
                  "Email",
                  "Quartier / Commune",
                  "Profession",
                  "Institution (école, université...)",
                ].map((label, i) => (
                  <div key={i} className="space-y-1">
                    <p className="text-[11px] font-semibold text-foreground/80">{label}</p>
                    <div className="h-8 rounded-lg border border-dashed border-border/60 bg-muted/30" />
                  </div>
                ))}
                <div className="pt-2 space-y-1">
                  <p className="text-[11px] font-semibold text-foreground/80">Photo passeport (coller ici)</p>
                  <div className="h-24 w-20 rounded-lg border border-dashed border-border/60 bg-muted/30 flex items-center justify-center">
                    <span className="text-[9px] text-muted-foreground">3.5 × 4.5 cm</span>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="scholarship" className="mt-4">
            <div className="rounded-2xl border border-border/50 bg-white shadow-xl overflow-hidden text-[#1e3a72]">
          <div className="bg-[#1E5FB8] text-white px-6 py-4 text-center">
            <h3 className="text-base font-extrabold tracking-wide">GITEGA STUDY SPACE</h3>
            <p className="text-[11px] opacity-95 mt-0.5">Formulaire d'Accès aux Machines | Free Tech Institute</p>
            <p className="text-[10px] opacity-90">Valable 1 mois | Renouvelable | Lun-Sam 8h-17h | 15 machines</p>
          </div>

          <div className="p-5 space-y-3 text-xs">
            <div className="grid grid-cols-3 gap-2">
              <div className="col-span-2 bg-[#E8F1FA] px-2 py-2 rounded">
                <p className="font-bold text-[10px]">N° Formulaire :</p>
              </div>
              <div className="bg-[#E8F1FA] px-2 py-2 rounded text-center text-[10px]">Photo</div>
            </div>

            {[
              { title: "1. INFORMATIONS PERSONNELLES", fields: ["Nom et Prénom", "Âge (max 23 ans)", "Tél / WhatsApp", "Province / Quartier", "École / Institution"] },
              { title: "2. PROJET / RECHERCHE", fields: ["Titre du Projet", "Domaine", "Logiciels / Sites / Outils", "Objectifs Spécifiques (×3)"] },
              { title: "3. DISPONIBILITÉ", fields: ["Jours de présence (Lun→Sam)", "Nb jours / semaine"] },
              { title: "4. PERFORMANCE & SUIVI", fields: ["Résultats Attendus (×2)", "Indicateurs de Performance (×2)", "Lien de partage", "Engagement & Signatures"] },
            ].map((s) => (
              <div key={s.title} className="space-y-1.5">
                <div className="bg-[#1E5FB8] text-white px-2 py-1 rounded text-[10px] font-bold">{s.title}</div>
                {s.fields.map((f) => (
                  <div key={f} className="bg-[#E8F1FA] px-2 py-1.5 rounded text-[10px] flex items-center">
                    <span className="font-bold w-48">{f}</span>
                    <span className="flex-1 border-b border-[#B8D4E8] ml-2 h-0" />
                  </div>
                ))}
              </div>
            ))}

            <p className="text-[9px] text-muted-foreground text-center pt-2">
              Aperçu — téléchargez le PDF pour la version imprimable complète.
            </p>
          </div>
            </div>
          </TabsContent>
        </Tabs>

        {/* Actions */}
        <div className="grid grid-cols-2 gap-2.5">
          <Button onClick={handleDownload} className="gap-2 rounded-xl h-11" variant="default">
            <Download className="h-4 w-4" />
            Télécharger PDF
          </Button>
          <Button onClick={handlePrint} className="gap-2 rounded-xl h-11" variant="secondary">
            <Printer className="h-4 w-4" />
            Imprimer
          </Button>
        </div>
      </div>
    </div>
  );
}
