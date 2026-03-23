import jsPDF from "jspdf";

export interface InvoiceData {
  orderCode: string;
  visitorId: string;
  visitorName?: string;
  tableNumber: number;
  items: { name: string; quantity: number; unitPrice: number }[];
  totalAmount: number;
  paymentStatus: string;
  paymentMethod?: string | null;
  createdAt: string;
}

const COLORS = {
  primary: [30, 64, 175] as [number, number, number],
  dark: [15, 23, 42] as [number, number, number],
  muted: [100, 116, 139] as [number, number, number],
  border: [226, 232, 240] as [number, number, number],
  bg: [248, 250, 252] as [number, number, number],
  white: [255, 255, 255] as [number, number, number],
};

const PAYMENT_LABELS: Record<string, string> = {
  unpaid: "Non payé",
  cash: "Cash",
  mobile_money: "Mobile Money",
  bitcoin: "Bitcoin",
};

export function generateInvoicePDF(data: InvoiceData): jsPDF {
  const doc = new jsPDF({ unit: "mm", format: [80, 200] }); // Receipt-style narrow format
  const w = 80;
  let y = 8;

  // Header
  doc.setFillColor(...COLORS.primary);
  doc.rect(0, 0, w, 28, "F");

  doc.setTextColor(...COLORS.white);
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("GITEGA STUDY SPACE", w / 2, y + 4, { align: "center" });
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.text("Restaurant — Facture", w / 2, y + 10, { align: "center" });
  doc.setFontSize(7);
  doc.text("Tél: +257 61 154 065", w / 2, y + 15, { align: "center" });

  y = 32;

  // Order info
  doc.setTextColor(...COLORS.dark);
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text(data.orderCode, w / 2, y, { align: "center" });
  y += 6;

  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...COLORS.muted);

  const infoLines = [
    `Date: ${new Date(data.createdAt).toLocaleString("fr")}`,
    `Visiteur: ${data.visitorName || data.visitorId}`,
    `Table: ${data.tableNumber}`,
  ];
  infoLines.forEach(line => {
    doc.text(line, 6, y);
    y += 4;
  });

  y += 2;

  // Separator
  doc.setDrawColor(...COLORS.border);
  doc.setLineDashPattern([1, 1], 0);
  doc.line(6, y, w - 6, y);
  y += 4;

  // Items header
  doc.setLineDashPattern([], 0);
  doc.setTextColor(...COLORS.dark);
  doc.setFontSize(7);
  doc.setFont("helvetica", "bold");
  doc.text("Article", 6, y);
  doc.text("Qté", 46, y, { align: "center" });
  doc.text("Total", w - 6, y, { align: "right" });
  y += 1;
  doc.setDrawColor(...COLORS.border);
  doc.line(6, y, w - 6, y);
  y += 4;

  // Items
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  data.items.forEach(item => {
    doc.setTextColor(...COLORS.dark);
    const name = item.name.length > 18 ? item.name.substring(0, 17) + "…" : item.name;
    doc.text(name, 6, y);
    doc.text(String(item.quantity), 46, y, { align: "center" });
    doc.text(`${(item.unitPrice * item.quantity).toLocaleString()}`, w - 6, y, { align: "right" });
    y += 4;
  });

  // Total separator
  y += 1;
  doc.setDrawColor(...COLORS.border);
  doc.setLineDashPattern([1, 1], 0);
  doc.line(6, y, w - 6, y);
  y += 5;

  // Total
  doc.setLineDashPattern([], 0);
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...COLORS.primary);
  doc.text("TOTAL", 6, y);
  doc.text(`${data.totalAmount.toLocaleString()} BIF`, w - 6, y, { align: "right" });
  y += 6;

  // Payment status
  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...COLORS.muted);
  const payLabel = PAYMENT_LABELS[data.paymentStatus] || data.paymentStatus;
  doc.text(`Paiement: ${payLabel}`, 6, y);
  y += 8;

  // Footer
  doc.setDrawColor(...COLORS.border);
  doc.setLineDashPattern([1, 1], 0);
  doc.line(6, y, w - 6, y);
  y += 5;
  doc.setLineDashPattern([], 0);
  doc.setFontSize(6);
  doc.setTextColor(...COLORS.muted);
  doc.text("Merci pour votre visite !", w / 2, y, { align: "center" });
  y += 3;
  doc.text("Gitega Study Space — Multipurpose Room", w / 2, y, { align: "center" });

  // Trim page height
  const pageHeight = y + 8;
  // We can't resize after creation, but the 200mm height is fine for receipts

  return doc;
}

export function downloadInvoice(doc: jsPDF, orderCode: string) {
  doc.save(`facture-${orderCode}.pdf`);
}

export function printInvoice(doc: jsPDF) {
  const blob = doc.output("blob");
  const url = URL.createObjectURL(blob);
  const win = window.open(url, "_blank");
  if (win) {
    win.addEventListener("load", () => {
      win.print();
    });
  }
}

export function shareInvoiceWhatsApp(data: InvoiceData) {
  const items = data.items.map(i => `• ${i.name} x${i.quantity} = ${(i.unitPrice * i.quantity).toLocaleString()} BIF`).join("\n");
  const msg = encodeURIComponent(
    `🧾 *Facture — Gitega Study Space*\n\n` +
    `Commande: *${data.orderCode}*\n` +
    `Table: ${data.tableNumber}\n` +
    `Date: ${new Date(data.createdAt).toLocaleString("fr")}\n\n` +
    `${items}\n\n` +
    `*Total: ${data.totalAmount.toLocaleString()} BIF*\n\n` +
    `Merci pour votre visite !`
  );
  window.open(`https://wa.me/?text=${msg}`, "_blank");
}

export function shareInvoiceEmail(data: InvoiceData, recipientEmail?: string) {
  const items = data.items.map(i => `- ${i.name} x${i.quantity} = ${(i.unitPrice * i.quantity).toLocaleString()} BIF`).join("\n");
  const subject = encodeURIComponent(`Facture ${data.orderCode} — Gitega Study Space`);
  const body = encodeURIComponent(
    `Facture — Gitega Study Space\n\n` +
    `Commande: ${data.orderCode}\n` +
    `Table: ${data.tableNumber}\n` +
    `Date: ${new Date(data.createdAt).toLocaleString("fr")}\n\n` +
    `${items}\n\n` +
    `Total: ${data.totalAmount.toLocaleString()} BIF\n\n` +
    `Merci pour votre visite !`
  );
  const to = recipientEmail ? encodeURIComponent(recipientEmail) : "";
  window.open(`mailto:${to}?subject=${subject}&body=${body}`, "_self");
}
