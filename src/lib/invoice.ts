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

export async function downloadInvoicePNG(data: InvoiceData): Promise<void> {
  const doc = generateInvoicePDF(data);
  const pageWidth = 80;
  const pageHeight = 200;
  const scale = 3; // High resolution

  const canvas = document.createElement("canvas");
  canvas.width = pageWidth * scale;
  canvas.height = pageHeight * scale;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  // Render PDF page to canvas via image
  const pdfBlob = doc.output("blob");
  const pdfUrl = URL.createObjectURL(pdfBlob);

  // Use jsPDF's built-in output to get data URL and draw on canvas
  const imgData = doc.output("datauristring");

  return new Promise<void>((resolve) => {
    const img = new Image();
    img.onload = () => {
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      canvas.toBlob((blob) => {
        if (blob) {
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = `facture-${data.orderCode}.png`;
          a.click();
          URL.revokeObjectURL(url);
        }
        URL.revokeObjectURL(pdfUrl);
        resolve();
      }, "image/png");
    };
    img.onerror = () => {
      // Fallback: generate PNG from scratch using canvas
      generateInvoiceCanvas(data, ctx, canvas.width, canvas.height, scale);
      canvas.toBlob((blob) => {
        if (blob) {
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = `facture-${data.orderCode}.png`;
          a.click();
          URL.revokeObjectURL(url);
        }
        resolve();
      }, "image/png");
    };
    img.src = imgData;
  });
}

function generateInvoiceCanvas(data: InvoiceData, ctx: CanvasRenderingContext2D, w: number, h: number, scale: number) {
  const s = scale;
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, w, h);

  // Header
  ctx.fillStyle = "rgb(30, 64, 175)";
  ctx.fillRect(0, 0, w, 28 * s);

  ctx.fillStyle = "#ffffff";
  ctx.font = `bold ${12 * s}px Helvetica, Arial, sans-serif`;
  ctx.textAlign = "center";
  ctx.fillText("GITEGA STUDY SPACE", w / 2, 12 * s);
  ctx.font = `${8 * s}px Helvetica, Arial, sans-serif`;
  ctx.fillText("Restaurant — Facture", w / 2, 20 * s);
  ctx.font = `${7 * s}px Helvetica, Arial, sans-serif`;
  ctx.fillText("Tél: +257 61 154 065", w / 2, 26 * s);

  let y = 34 * s;

  // Order code
  ctx.fillStyle = "rgb(15, 23, 42)";
  ctx.font = `bold ${10 * s}px Helvetica, Arial, sans-serif`;
  ctx.fillText(data.orderCode, w / 2, y);
  y += 7 * s;

  // Info
  ctx.font = `${7 * s}px Helvetica, Arial, sans-serif`;
  ctx.fillStyle = "rgb(100, 116, 139)";
  ctx.textAlign = "left";
  const infoLines = [
    `Date: ${new Date(data.createdAt).toLocaleString("fr")}`,
    `Visiteur: ${data.visitorName || data.visitorId}`,
    `Table: ${data.tableNumber}`,
  ];
  infoLines.forEach(line => {
    ctx.fillText(line, 6 * s, y);
    y += 4 * s;
  });
  y += 3 * s;

  // Separator
  ctx.strokeStyle = "rgb(226, 232, 240)";
  ctx.setLineDash([s, s]);
  ctx.beginPath();
  ctx.moveTo(6 * s, y);
  ctx.lineTo(w - 6 * s, y);
  ctx.stroke();
  y += 5 * s;

  // Items header
  ctx.setLineDash([]);
  ctx.fillStyle = "rgb(15, 23, 42)";
  ctx.font = `bold ${7 * s}px Helvetica, Arial, sans-serif`;
  ctx.textAlign = "left";
  ctx.fillText("Article", 6 * s, y);
  ctx.textAlign = "center";
  ctx.fillText("Qté", 46 * s, y);
  ctx.textAlign = "right";
  ctx.fillText("Total", w - 6 * s, y);
  y += 5 * s;

  // Items
  ctx.font = `${7 * s}px Helvetica, Arial, sans-serif`;
  data.items.forEach(item => {
    ctx.fillStyle = "rgb(15, 23, 42)";
    ctx.textAlign = "left";
    const name = item.name.length > 18 ? item.name.substring(0, 17) + "…" : item.name;
    ctx.fillText(name, 6 * s, y);
    ctx.textAlign = "center";
    ctx.fillText(String(item.quantity), 46 * s, y);
    ctx.textAlign = "right";
    ctx.fillText(`${(item.unitPrice * item.quantity).toLocaleString()}`, w - 6 * s, y);
    y += 4 * s;
  });

  y += 3 * s;
  // Total separator
  ctx.strokeStyle = "rgb(226, 232, 240)";
  ctx.setLineDash([s, s]);
  ctx.beginPath();
  ctx.moveTo(6 * s, y);
  ctx.lineTo(w - 6 * s, y);
  ctx.stroke();
  y += 6 * s;

  // Total
  ctx.setLineDash([]);
  ctx.fillStyle = "rgb(30, 64, 175)";
  ctx.font = `bold ${10 * s}px Helvetica, Arial, sans-serif`;
  ctx.textAlign = "left";
  ctx.fillText("TOTAL", 6 * s, y);
  ctx.textAlign = "right";
  ctx.fillText(`${data.totalAmount.toLocaleString()} BIF`, w - 6 * s, y);
  y += 7 * s;

  // Payment
  ctx.font = `${7 * s}px Helvetica, Arial, sans-serif`;
  ctx.fillStyle = "rgb(100, 116, 139)";
  ctx.textAlign = "left";
  const payLabels: Record<string, string> = { unpaid: "Non payé", cash: "Cash", mobile_money: "Mobile Money", bitcoin: "Bitcoin" };
  ctx.fillText(`Paiement: ${payLabels[data.paymentStatus] || data.paymentStatus}`, 6 * s, y);
  y += 10 * s;

  // Footer
  ctx.strokeStyle = "rgb(226, 232, 240)";
  ctx.setLineDash([s, s]);
  ctx.beginPath();
  ctx.moveTo(6 * s, y);
  ctx.lineTo(w - 6 * s, y);
  ctx.stroke();
  y += 6 * s;
  ctx.setLineDash([]);
  ctx.font = `${6 * s}px Helvetica, Arial, sans-serif`;
  ctx.textAlign = "center";
  ctx.fillText("Merci pour votre visite !", w / 2, y);
  y += 4 * s;
  ctx.fillText("Gitega Study Space — Multipurpose Room", w / 2, y);
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
