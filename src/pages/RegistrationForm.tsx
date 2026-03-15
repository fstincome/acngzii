import { Button } from "@/components/ui/button";
import { Download, Printer } from "lucide-react";
import jsPDF from "jspdf";
import { toast } from "sonner";

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

function buildFormPDF(): jsPDF {
  const doc = new jsPDF("p", "mm", "a4");
  const w = 210;
  const margin = 20;
  const contentW = w - margin * 2;
  let y = 20;

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

  const pdfFields = [
    { label: "Nom complet *", height: 10 },
    { label: "Genre (Homme / Femme / Autre)", height: 10 },
    { label: "Date de naissance (JJ/MM/AAAA)", height: 10 },
    { label: "Téléphone", height: 10 },
    { label: "Email", height: 10 },
    { label: "Quartier / Commune", height: 10 },
    { label: "Profession", height: 10 },
    { label: "Institution (école, université...)", height: 10 },
  ];

  for (const field of pdfFields) {
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text(field.label, margin, y);
    y += 5;
    doc.setDrawColor(180, 180, 180);
    doc.setLineWidth(0.3);
    doc.rect(margin, y, contentW, field.height);
    y += field.height + 8;
  }

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

  const sigY = y + 55;
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("Signature du visiteur :", margin, sigY);
  doc.line(margin + 45, sigY, margin + contentW, sigY);

  const dateY = sigY + 12;
  doc.text("Date :", margin, dateY);
  doc.line(margin + 20, dateY, margin + 80, dateY);

  doc.setFontSize(7);
  doc.setFont("helvetica", "italic");
  doc.text("Ce formulaire est à remplir par le visiteur. Le Directeur se chargera de saisir les données dans le système.", margin, 285);

  return doc;
}

export default function RegistrationForm() {
  const handleDownload = () => {
    const doc = buildFormPDF();
    doc.save("formulaire-inscription-visiteur.pdf");
    toast.success("Formulaire PDF téléchargé !");
  };

  const handlePrint = () => {
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
    } catch {
      toast.error("Erreur lors de l'impression");
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center py-8 px-4">
      <div className="w-full max-w-lg space-y-6">
        {/* Header */}
        <div className="text-center space-y-1">
          <div className="flex items-center justify-center gap-3 mb-2">
            <img src="/gss-logo.png" alt="GSS" className="h-10 w-10 rounded-xl object-contain" />
          </div>
          <h1 className="text-xl font-bold text-foreground">Gitega Study Space</h1>
          <p className="text-sm text-muted-foreground">Formulaire d'inscription — Visiteur</p>
        </div>

        {/* Visual Preview */}
        <div className="rounded-2xl border border-border/50 bg-card shadow-xl overflow-hidden">
          <div className="bg-gradient-to-r from-primary/10 to-accent/10 px-6 py-5 text-center border-b border-border/30">
            <h3 className="text-sm font-bold tracking-widest text-foreground uppercase">Formulaire d'inscription</h3>
            <p className="text-xs text-muted-foreground mt-1">Veuillez remplir tous les champs ci-dessous</p>
            <div className="mt-3 h-px bg-border/50" />
          </div>

          <div className="px-6 py-4 space-y-3">
            {fields.map((label, i) => (
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

            <div className="pt-3 flex items-end gap-2">
              <p className="text-[11px] font-semibold text-foreground/80 shrink-0">Signature :</p>
              <div className="flex-1 border-b border-dashed border-border/60 mb-0.5" />
            </div>
            <div className="flex items-end gap-2">
              <p className="text-[11px] font-semibold text-foreground/80 shrink-0">Date :</p>
              <div className="w-32 border-b border-dashed border-border/60 mb-0.5" />
            </div>
          </div>

          <div className="px-6 py-3 bg-muted/20 border-t border-border/30">
            <p className="text-[9px] text-muted-foreground italic text-center">
              Ce formulaire est à remplir par le visiteur. Le Directeur se chargera de saisir les données dans le système.
            </p>
          </div>
        </div>

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
