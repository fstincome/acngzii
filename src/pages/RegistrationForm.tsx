import { Button } from "@/components/ui/button";
import { Download, Printer } from "lucide-react";
import jsPDF from "jspdf";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

function buildFormPDF(t: (k: string) => string): jsPDF {
  const doc = new jsPDF("p", "mm", "a4");
  const w = 210;
  const margin = 15;
  const contentW = w - margin * 2;
  let y = 18;

  // Header
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text(t("registrationForm.pdf.orgName"), w / 2, y, { align: "center" });
  y += 6;
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(t("registrationForm.pdf.subtitle"), w / 2, y, { align: "center" });
  y += 4;
  doc.setDrawColor(80, 80, 80);
  doc.setLineWidth(0.4);
  doc.line(margin, y, w - margin, y);
  y += 8;

  const pdfFields = [
    t("registrationForm.fields.fullName"),
    t("registrationForm.fields.gender"),
    t("registrationForm.fields.dob"),
    t("registrationForm.fields.phone"),
    t("registrationForm.fields.email"),
    t("registrationForm.fields.neighborhood"),
    t("registrationForm.fields.occupation"),
    t("registrationForm.fields.institution"),
  ];

  const fieldH = 8;

  for (const label of pdfFields) {
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.text(label, margin, y);
    y += 4;
    doc.setDrawColor(180, 180, 180);
    doc.setLineWidth(0.25);
    doc.rect(margin, y, contentW, fieldH);
    y += fieldH + 4;
  }

  // Photo
  y += 2;
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text(t("registrationForm.photoLabel"), margin, y);
  y += 4;
  doc.setDrawColor(180, 180, 180);
  doc.setLineWidth(0.25);
  doc.rect(margin, y, 30, 40);
  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  doc.text("3.5 x 4.5 cm", margin + 15, y + 22, { align: "center" });

  // Signature & Date
  const sigY = y + 48;
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text(t("registrationForm.pdf.signatureLabel"), margin, sigY);
  doc.setLineWidth(0.3);
  doc.setDrawColor(120, 120, 120);
  doc.line(margin + 50, sigY, w - margin, sigY);

  const dateY = sigY + 10;
  doc.text(t("registrationForm.pdf.dateLabel"), margin, dateY);
  doc.line(margin + 20, dateY, margin + 70, dateY);

  return doc;
}

export default function RegistrationForm() {
  const { t } = useTranslation();

  const fields = [
    t("registrationForm.fields.fullName"),
    t("registrationForm.fields.gender"),
    t("registrationForm.fields.dob"),
    t("registrationForm.fields.phone"),
    t("registrationForm.fields.email"),
    t("registrationForm.fields.neighborhood"),
    t("registrationForm.fields.occupation"),
    t("registrationForm.fields.institution"),
  ];

  const handleDownload = () => {
    const doc = buildFormPDF(t);
    doc.save("registration-form.pdf");
    toast.success(t("registrationForm.downloaded"));
  };

  const handlePrint = () => {
    try {
      const doc = buildFormPDF(t);
      const pdfDataUri = doc.output("datauristring");
      const printWindow = window.open("", "_blank");
      if (printWindow) {
        printWindow.document.write(`
          <!DOCTYPE html><html><head><title>${t("registrationForm.subtitle")}</title></head>
          <body style="margin:0;display:flex;justify-content:center;align-items:center;min-height:100vh;background:#f0f0f0;">
            <embed src="${pdfDataUri}" type="application/pdf" width="600" height="850" />
            <script>setTimeout(function(){window.print();},500);</script>
          </body></html>
        `);
        printWindow.document.close();
      }
    } catch {
      toast.error(t("registrationForm.printError"));
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
          <h1 className="text-xl font-bold text-foreground">{t("registrationForm.appName")}</h1>
          <p className="text-sm text-muted-foreground">{t("registrationForm.subtitle")}</p>
        </div>

        {/* Visual Preview */}
        <div className="rounded-2xl border border-border/50 bg-card shadow-xl overflow-hidden">
          <div className="bg-gradient-to-r from-primary/10 to-accent/10 px-6 py-5 text-center border-b border-border/30">
            <h3 className="text-sm font-bold tracking-widest text-foreground uppercase">{t("registrationForm.headerTitle")}</h3>
            <p className="text-xs text-muted-foreground mt-1">{t("registrationForm.instructions")}</p>
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
              <p className="text-[11px] font-semibold text-foreground/80">{t("registrationForm.photoLabel")}</p>
              <div className="h-24 w-20 rounded-lg border border-dashed border-border/60 bg-muted/30 flex items-center justify-center">
                <span className="text-[9px] text-muted-foreground">{t("registrationForm.photoSize")}</span>
              </div>
            </div>

            <div className="pt-3 flex items-end gap-2">
              <p className="text-[11px] font-semibold text-foreground/80 shrink-0">{t("registrationForm.signature")}</p>
              <div className="flex-1 border-b border-dashed border-border/60 mb-0.5" />
            </div>
            <div className="flex items-end gap-2">
              <p className="text-[11px] font-semibold text-foreground/80 shrink-0">{t("registrationForm.date")}</p>
              <div className="w-32 border-b border-dashed border-border/60 mb-0.5" />
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="grid grid-cols-2 gap-2.5">
          <Button onClick={handleDownload} className="gap-2 rounded-xl h-11" variant="default">
            <Download className="h-4 w-4" />
            {t("registrationForm.downloadPdf")}
          </Button>
          <Button onClick={handlePrint} className="gap-2 rounded-xl h-11" variant="secondary">
            <Printer className="h-4 w-4" />
            {t("registrationForm.print")}
          </Button>
        </div>
      </div>
    </div>
  );
}
