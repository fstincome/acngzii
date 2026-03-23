import { Button } from "@/components/ui/button";
import { Download, Printer, Send, Mail } from "lucide-react";
import { InvoiceData, generateInvoicePDF, downloadInvoice, printInvoice, shareInvoiceWhatsApp, shareInvoiceEmail } from "@/lib/invoice";

interface InvoiceActionsProps {
  data: InvoiceData;
  compact?: boolean;
}

export default function InvoiceActions({ data, compact }: InvoiceActionsProps) {
  const handleDownload = () => {
    const doc = generateInvoicePDF(data);
    downloadInvoice(doc, data.orderCode);
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
        <Button size="sm" variant="outline" onClick={handlePrint}>
          <Printer className="h-3.5 w-3.5 mr-1" /> Imprimer
        </Button>
        <Button size="sm" variant="outline" onClick={() => shareInvoiceWhatsApp(data)}>
          <Send className="h-3.5 w-3.5 mr-1" /> WhatsApp
        </Button>
        <Button size="sm" variant="outline" onClick={() => shareInvoiceEmail(data)}>
          <Mail className="h-3.5 w-3.5 mr-1" /> Email
        </Button>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-2">
      <Button variant="outline" className="gap-2" onClick={handleDownload}>
        <Download className="h-4 w-4" /> Télécharger
      </Button>
      <Button variant="outline" className="gap-2" onClick={handlePrint}>
        <Printer className="h-4 w-4" /> Imprimer
      </Button>
      <Button variant="outline" className="gap-2" onClick={() => shareInvoiceWhatsApp(data)}>
        <Send className="h-4 w-4" /> WhatsApp
      </Button>
      <Button variant="outline" className="gap-2" onClick={() => shareInvoiceEmail(data)}>
        <Mail className="h-4 w-4" /> Email
      </Button>
    </div>
  );
}
