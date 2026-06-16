import { Button } from "@/components/ui/button";
import { Download, Printer } from "lucide-react";
import jsPDF from "jspdf";
import { toast } from "sonner";

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
  doc.text("Computer Access Form  |  American Corner", W / 2, y + 12.5, { align: "center" });
  doc.setFontSize(8);
  doc.text("Valable 1 mois  |  Renouvelable  |  Lun-Sam 8h-17h  |  15 machines", W / 2, y + 16.5, { align: "center" });
  y += 22;

  // ===== Form No. + Start date + Photo =====
  const photoW = 30;
  const topRowW = CW - photoW - 3;
  // Form No.
  setFill(doc, C_FIELD_BG);
  doc.rect(M, y, topRowW / 2 - 1, 12, "F");
  setText(doc, C_BLUE_DARK);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.text("N° Formulaire :", M + 2, y + 4);
  setStroke(doc, C_BLUE_DARK);
  doc.setLineWidth(0.3);
  doc.line(M + 25, y + 9, M + topRowW / 2 - 3, y + 9);

  // Start date
  const dx = M + topRowW / 2 + 1;
  setFill(doc, C_FIELD_BG);
  doc.rect(dx, y, topRowW / 2 - 1, 12, "F");
  doc.text("Start date :", dx + 2, y + 4);
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

  // First and last name (full width)
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
  drawField(M, y, sectionW, "First and last name :");
  y += 9;
  const halfW = sectionW / 2 - 1;
  drawField(M, y, halfW, "Age (max 23 ans) :");
  drawField(M + halfW + 2, y, halfW, "Phone / WhatsApp :");
  y += 9;
  drawField(M, y, halfW, "Province / Quartier :");
  drawField(M + halfW + 2, y, halfW, "School / Institution :");
  y += 11;

  // ===== 2. PROJET / RECHERCHE =====
  y = sectionHeader(doc, M, y, CW, "2. PROJET / RECHERCHE");
  y += 1;
  drawField(M, y, CW, "Titre du Projet :"); y += 9;
  drawField(M, y, CW, "Field (Web dev, Design, AI, Video...) :"); y += 9;
  drawField(M, y, CW, "Software / Sites / Tools needed :"); y += 11;

  // Info: Specific goals
  y = infoBox(doc, M, y, CW, "Specific Goals :",
    "Precise, achievable actions. e.g. \"Learn HTML\", \"Build a web page\", \"Finish a Coursera module\". Be concrete and realistic.");
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
  y = sectionHeader(doc, M, y, CW, "3. AVAILABILITY");
  y += 1;
  // Days of attendance (checkboxes)
  setFill(doc, C_FIELD_BG);
  doc.rect(M, y, CW, 8, "F");
  setText(doc, C_BLUE_DARK);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.text("Days of attendance :", M + 2, y + 5);
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
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
  drawField(M, y, halfW, "Days / week :");
  y += 11;

  // ===== 4. PERFORMANCE & SUIVI =====
  y = sectionHeader(doc, M, y, CW, "4. PERFORMANCE & TRACKING");
  y += 1;

  y = infoBox(doc, M, y, CW, "Expected Results :",
    "What you will have PRODUCED by month-end, something visible: published site, certificate, posted video, working app... Something you can SHOW the supervisor.");
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

  y = infoBox(doc, M, y, CW, "Performance Indicators :",
    "MEASURABLE evidence of your progress. e.g. \"3 modules completed\", \"site online with 3 pages\", \"10 YouTube subscribers\". These numbers determine whether your access is renewed.");
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
    "I commit to using the resources responsibly, respecting my attendance days, sharing my progress online, and taking care of the equipment. This form is valid for 1 month, renewable based on my results.");
  y += 3;

  // ===== Signatures + Evaluation =====
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
  doc.text("Read and approved + signature", M + sigW / 2, y + 5 + sigH - 2, { align: "center" });

  // Approved by the supervisor
  const vx = M + sigW + 2;
  setText(doc, C_BLUE_DARK);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.text("Approved by the Supervisor", vx + sigW / 2, y + 3, { align: "center" });
  setStroke(doc, C_BORDER);
  doc.rect(vx, y + 5, sigW, sigH);
  setText(doc, C_MUTED);
  doc.setFont("helvetica", "italic");
  doc.setFontSize(7);
  doc.text("Signature", vx + sigW / 2, y + 5 + sigH - 2, { align: "center" });

  // End-of-month evaluation
  const ex = M + (sigW + 2) * 2;
  setText(doc, C_BLUE_DARK);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.text("End-of-month evaluation", ex + sigW / 2, y + 3, { align: "center" });
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
  doc.text("Renewed", ex + 8, y + 11.5);
  doc.text("Not renewed", ex + 8, y + 16.5);
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
    "Free Tech Institute  |  American Corner, Q. Stade, Gitega  |  info@freeti.org  |  +257 69 03 49 65  |  www.freeti.org",
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
  doc.text("Formulaire d'inscription — Visitor", w / 2, y, { align: "center" });
  y += 4;
  doc.setDrawColor(80, 80, 80);
  doc.setLineWidth(0.4);
  doc.line(margin, y, w - margin, y);
  y += 8;

  const fields = [
    "Nom complet *",
    "Genre (Homme / Femme / Autre)",
    "Date de naissance (JJ/MM/AAAA)",
    "Phone",
    "Email",
    "Quartier / Commune",
    "Profession",
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
  const handleDownload = () => {
    const doc = buildVisitorFormPDF();
    doc.save("member-registration-form.pdf");
    toast.success("Form downloaded!");
  };

  const handlePrint = () => {
    try {
      const doc = buildVisitorFormPDF();
      const pdfDataUri = doc.output("datauristring");
      const printWindow = window.open("", "_blank");
      if (printWindow) {
        printWindow.document.write(`
          <!DOCTYPE html><html><head><title>Registration Form</title></head>
          <body style="margin:0;display:flex;justify-content:center;align-items:center;min-height:100vh;background:#f0f0f0;">
            <embed src="${pdfDataUri}" type="application/pdf" width="700" height="950" />
            <script>setTimeout(function(){window.print();},500);</script>
          </body></html>
        `);
        printWindow.document.close();
      }
    } catch {
      toast.error("Print error");
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center py-8 px-4">
      <div className="w-full max-w-2xl space-y-6">
        <div className="text-center space-y-1">
          <div className="flex items-center justify-center gap-3 mb-2">
            <img src="/gss-logo.png" alt="American Spaces" className="h-10 w-10 rounded-xl object-contain" />
          </div>
          <h1 className="text-xl font-bold text-foreground">Registration Form</h1>
          <p className="text-sm text-muted-foreground">American Corner</p>
        </div>

        <div className="rounded-2xl border border-border/50 bg-card shadow-xl overflow-hidden">
          <div className="bg-gradient-to-r from-primary/10 to-accent/10 px-6 py-5 text-center border-b border-border/30">
            <h3 className="text-sm font-bold tracking-widest text-foreground uppercase">American Corner</h3>
            <p className="text-xs text-muted-foreground mt-1">Member Registration Form</p>
          </div>
          <div className="px-6 py-4 space-y-3">
            {[
              "Full name *",
              "Gender (Male / Female / Other)",
              "Date of birth (DD/MM/YYYY)",
              "Phone",
              "Email",
              "Neighborhood / Commune",
              "Occupation",
              "Institution (school, university...)",
            ].map((label, i) => (
              <div key={i} className="space-y-1">
                <p className="text-[11px] font-semibold text-foreground/80">{label}</p>
                <div className="h-8 rounded-lg border border-dashed border-border/60 bg-muted/30" />
              </div>
            ))}
            <div className="pt-2 space-y-1">
              <p className="text-[11px] font-semibold text-foreground/80">Passport photo (paste here)</p>
              <div className="h-24 w-20 rounded-lg border border-dashed border-border/60 bg-muted/30 flex items-center justify-center">
                <span className="text-[9px] text-muted-foreground">3.5 × 4.5 cm</span>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          <Button onClick={handleDownload} className="gap-2 rounded-xl h-11" variant="default">
            <Download className="h-4 w-4" />
            Download PDF
          </Button>
          <Button onClick={handlePrint} className="gap-2 rounded-xl h-11" variant="secondary">
            <Printer className="h-4 w-4" />
            Print
          </Button>
        </div>
      </div>
    </div>
  );
}

