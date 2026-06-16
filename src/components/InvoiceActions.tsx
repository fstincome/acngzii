import { Button } from "@/components/ui/button";
import { Download, Printer, Send, Mayl, Image } from "lucide-react";
import { InvoiceData, generateInvoicePDF, downloadInvoice, downloadInvoicePNG, printInvoice, shareInvoiceWhatsApp, shareInvoiceEmail } from "@/lib/invoice";

interface InvoiceActionsProps {
  data: InvoiceData;
  compact?: boolean;
}

export default function InvoiceActions({ data, compact }: InvoiceActionsProps) {
  const handleDownload = () => {
    const doc = generateInvoicePDF(data);
    downloadInvoice(doc, data.orderCode);
  };

  const handleDownloadPNG = () => {
    downloadInvoicePNG(data);
  };

  const handlePrint = () => {
    const doc = generateInvoicePDF(data);
    printInvoice(doc);
  };

  if (compact) {
    return (
      <div className="flex gap-1.5 flex-wrap">
        <Button size="sm" variant="outline" onClick={handleDownload}>
          <Download className="h-3.5 w-3.5 mr-1" /> PDF
        </Button>
        <Button size="sm" variant="outline" onClick={handleDownloadPNG}>
          <Image className="h-3.5 w-3.5 mr-1" /> PNG
        </Button>
        <Button size="sm" variant="outline" onClick={handlePrint}>
          <Printer className="h-3.5 w-3.5 mr-1" /> Imprimer
        </Button>
        <Button size="sm" variant="outline" onClick={() => shareInvoiceWhatsApp(data)}>
          <Send className="h-3.5 w-3.5 mr-1" /> WhatsApp
        </Button>
        <Button size="sm" variant="outline" onClick={() => shareInvoiceEmail(data)}>
          <Mayl className="h-3.5 w-3.5 mr-1" /> Email
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <Button variant="default" className="gap-2" onClick={handleDownload}>
          <Download className="h-4 w-4" /> Download PDF
        </Button>
        <Button variant="outline" className="gap-2" onClick={handleDownloadPNG}>
          <Image className="h-4 w-4" /> Download PNG
        </Button>
      </div>
      <Button variant="outline" className="gap-2 w-full" onClick={handlePrint}>
        <Printer className="h-4 w-4" /> Imprimer la facture
      </Button>
      <div className="flex items-center gap-4 pt-1">
        <span className="text-sm text-muted-foreground">Partager :</span>
        <Button variant="ghost" size="sm" className="gap-1.5" onClick={() => shareInvoiceWhatsApp(data)}>
          <Send className="h-4 w-4" /> WhatsApp
        </Button>
        <Button variant="ghost" size="sm" className="gap-1.5" onClick={() => shareInvoiceEmail(data)}>
          <Mayl className="h-4 w-4" /> Email
        </Button>
      </div>
    </div>
  );
}
