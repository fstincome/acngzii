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

const PAYMENT_LABELS: Record<string, string> = {
  unpaid: "Non payé",
  cash: "Cash",
  mobile_money: "Mobile Money",
  bitcoin: "Bitcoin",
};

// ── PDF Generation ──────────────────────────────────────────────

export function generateInvoicePDF(data: InvoiceData): jsPDF {
  const doc = new jsPDF({ unit: "mm", format: [80, 200] });
  const w = 80;
  const mx = 5;
  let y = 6;

  // ── Header band ──
  doc.setFillColor(30, 64, 175);
  doc.rect(0, 0, w, 26, "F");

  // Try to add logo (will be added async in PNG version)
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("GITEGA STUDY SPACE", w / 2, y + 6, { align: "center" });
  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  doc.text("Restaurant — Facture", w / 2, y + 11, { align: "center" });
  doc.setFontSize(6);
  doc.text("Tél: +257 61 154 065", w / 2, y + 15, { align: "center" });

  y = 30;

  // ── Order code badge ──
  doc.setFillColor(240, 245, 255);
  doc.roundedRect(mx, y - 4, w - mx * 2, 10, 2, 2, "F");
  doc.setTextColor(30, 64, 175);
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text(data.orderCode, w / 2, y + 1, { align: "center" });
  y += 10;

  // ── Info section ──
  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 116, 139);

  const infoPairs = [
    ["Date", new Date(data.createdAt).toLocaleString("fr")],
    ["Visiteur", data.visitorName || data.visitorId],
    ["Table", String(data.tableNumber)],
  ];
  infoPairs.forEach(([label, value]) => {
    doc.setFont("helvetica", "bold");
    doc.setTextColor(60, 60, 60);
    doc.text(`${label}:`, mx + 1, y);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 116, 139);
    doc.text(value, mx + 18, y);
    y += 4;
  });

  y += 2;

  // ── Dashed separator ──
  doc.setDrawColor(200, 210, 225);
  doc.setLineDashPattern([1.5, 1], 0);
  doc.line(mx, y, w - mx, y);
  doc.setLineDashPattern([], 0);
  y += 4;

  // ── Items table header ──
  doc.setFillColor(245, 247, 250);
  doc.rect(mx, y - 3, w - mx * 2, 6, "F");
  doc.setTextColor(60, 60, 60);
  doc.setFontSize(6.5);
  doc.setFont("helvetica", "bold");
  doc.text("ARTICLE", mx + 2, y);
  doc.text("QTÉ", 48, y, { align: "center" });
  doc.text("TOTAL", w - mx - 1, y, { align: "right" });
  y += 5;

  // ── Items rows ──
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  data.items.forEach((item, idx) => {
    if (idx % 2 === 0) {
      doc.setFillColor(252, 252, 255);
      doc.rect(mx, y - 3, w - mx * 2, 5, "F");
    }
    doc.setTextColor(30, 30, 30);
    const name = item.name.length > 16 ? item.name.substring(0, 15) + "…" : item.name;
    doc.text(name, mx + 2, y);
    doc.setTextColor(100, 100, 100);
    doc.text(String(item.quantity), 48, y, { align: "center" });
    doc.setTextColor(30, 30, 30);
    doc.text(`${(item.unitPrice * item.quantity).toLocaleString()}`, w - mx - 1, y, { align: "right" });
    y += 5;
  });

  y += 2;

  // ── Total section ──
  doc.setDrawColor(200, 210, 225);
  doc.setLineDashPattern([1.5, 1], 0);
  doc.line(mx, y, w - mx, y);
  doc.setLineDashPattern([], 0);
  y += 5;

  doc.setFillColor(30, 64, 175);
  doc.roundedRect(mx, y - 4, w - mx * 2, 10, 2, 2, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text("TOTAL", mx + 3, y + 1);
  doc.text(`${data.totalAmount.toLocaleString()} BIF`, w - mx - 3, y + 1, { align: "right" });
  y += 12;

  // ── Payment badge ──
  const payLabel = PAYMENT_LABELS[data.paymentStatus] || data.paymentStatus;
  const isPaid = data.paymentStatus !== "unpaid";
  if (isPaid) {
    doc.setFillColor(220, 252, 231);
    doc.setTextColor(22, 101, 52);
  } else {
    doc.setFillColor(254, 242, 242);
    doc.setTextColor(153, 27, 27);
  }
  doc.roundedRect(mx, y - 3, w - mx * 2, 7, 1.5, 1.5, "F");
  doc.setFontSize(7);
  doc.setFont("helvetica", "bold");
  doc.text(`Paiement: ${payLabel}`, w / 2, y + 1, { align: "center" });
  y += 10;

  // ── Footer ──
  doc.setDrawColor(220, 225, 235);
  doc.setLineDashPattern([1, 1], 0);
  doc.line(mx, y, w - mx, y);
  doc.setLineDashPattern([], 0);
  y += 5;
  doc.setFontSize(6);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(140, 140, 140);
  doc.text("Merci pour votre visite !", w / 2, y, { align: "center" });
  y += 3;
  doc.text("Gitega Study Space — Multipurpose Room", w / 2, y, { align: "center" });

  return doc;
}

// ── PDF Download ────────────────────────────────────────────────

export function downloadInvoice(doc: jsPDF, orderCode: string) {
  doc.save(`facture-${orderCode}.pdf`);
}

// ── PNG Generation via Canvas ───────────────────────────────────

export async function downloadInvoicePNG(data: InvoiceData): Promise<void> {
  // Use a wider base for better text rendering, then output as tall narrow image
  const W = 420; // base pixel width
  const H = 1200; // generous height, will crop
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const px = 28; // horizontal padding
  let y = 0;

  // ── White background ──
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, W, H);

  // ── Header ──
  const headerH = 120;
  const grad = ctx.createLinearGradient(0, 0, W, headerH);
  grad.addColorStop(0, "#1e3a8a");
  grad.addColorStop(1, "#1e40af");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, headerH);

  // Logo
  let logoLoaded = false;
  try {
    const logo = await loadImage("/gss-logo.png");
    ctx.drawImage(logo, W / 2 - 18, 10, 36, 36);
    logoLoaded = true;
  } catch { /* skip */ }

  y = logoLoaded ? 54 : 28;
  ctx.fillStyle = "#ffffff";
  ctx.textAlign = "center";
  ctx.font = "bold 20px Helvetica, Arial, sans-serif";
  ctx.fillText("GITEGA STUDY SPACE", W / 2, y);
  y += 18;
  ctx.font = "300 13px Helvetica, Arial, sans-serif";
  ctx.fillText("Restaurant — Facture", W / 2, y);
  y += 14;
  ctx.font = "300 11px Helvetica, Arial, sans-serif";
  ctx.fillStyle = "rgba(255,255,255,0.8)";
  ctx.fillText("Tél: +257 61 154 065", W / 2, y);

  y = headerH + 16;

  // ── Order code pill ──
  const pillH = 32;
  roundedRect(ctx, px, y, W - px * 2, pillH, 8, "#eef2ff");
  ctx.fillStyle = "#1e40af";
  ctx.font = "bold 16px Helvetica, Arial, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(data.orderCode, W / 2, y + 21);
  y += pillH + 14;

  // ── Info section ──
  const infoPairs: [string, string][] = [
    ["Date", new Date(data.createdAt).toLocaleString("fr")],
    ["Visiteur", data.visitorName || data.visitorId],
    ["Table", String(data.tableNumber)],
  ];
  ctx.textAlign = "left";
  infoPairs.forEach(([label, value]) => {
    ctx.font = "600 11px Helvetica, Arial, sans-serif";
    ctx.fillStyle = "#374151";
    ctx.fillText(label + " :", px + 4, y);
    ctx.font = "400 11px Helvetica, Arial, sans-serif";
    ctx.fillStyle = "#6b7280";
    ctx.fillText(value, px + 70, y);
    y += 16;
  });
  y += 6;

  // ── Separator ──
  drawSeparator(ctx, px, y, W - px);
  y += 12;

  // ── Table header ──
  roundedRect(ctx, px, y, W - px * 2, 22, 4, "#f1f5f9");
  ctx.fillStyle = "#475569";
  ctx.font = "600 10px Helvetica, Arial, sans-serif";
  ctx.textAlign = "left";
  ctx.fillText("ARTICLE", px + 8, y + 15);
  ctx.textAlign = "center";
  ctx.fillText("QTÉ", W / 2 + 30, y + 15);
  ctx.textAlign = "right";
  ctx.fillText("TOTAL", W - px - 8, y + 15);
  y += 28;

  // ── Items ──
  ctx.font = "400 11px Helvetica, Arial, sans-serif";
  data.items.forEach((item, idx) => {
    // Alternate row bg
    if (idx % 2 === 0) {
      ctx.fillStyle = "#fafbff";
      ctx.fillRect(px, y - 4, W - px * 2, 20);
    }
    // Name
    ctx.fillStyle = "#1e293b";
    ctx.textAlign = "left";
    const name = item.name.length > 22 ? item.name.substring(0, 21) + "…" : item.name;
    ctx.fillText(name, px + 8, y + 10);
    // Qty
    ctx.fillStyle = "#64748b";
    ctx.textAlign = "center";
    ctx.fillText(String(item.quantity), W / 2 + 30, y + 10);
    // Subtotal
    ctx.fillStyle = "#1e293b";
    ctx.textAlign = "right";
    ctx.fillText(`${(item.unitPrice * item.quantity).toLocaleString()}`, W - px - 8, y + 10);
    y += 20;
  });
  y += 8;

  // ── Separator ──
  drawSeparator(ctx, px, y, W - px);
  y += 14;

  // ── TOTAL badge ──
  const totalH = 36;
  roundedRect(ctx, px, y, W - px * 2, totalH, 8, "#1e40af");
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 14px Helvetica, Arial, sans-serif";
  ctx.textAlign = "left";
  ctx.fillText("TOTAL", px + 14, y + 23);
  ctx.font = "bold 16px Helvetica, Arial, sans-serif";
  ctx.textAlign = "right";
  ctx.fillText(`${data.totalAmount.toLocaleString()} BIF`, W - px - 14, y + 23);
  y += totalH + 12;

  // ── Payment status ──
  const payLabel = PAYMENT_LABELS[data.paymentStatus] || data.paymentStatus;
  const isPaid = data.paymentStatus !== "unpaid";
  const payBg = isPaid ? "#dcfce7" : "#fef2f2";
  const payFg = isPaid ? "#166534" : "#991b1b";
  const payH = 26;
  roundedRect(ctx, px, y, W - px * 2, payH, 6, payBg);
  ctx.fillStyle = payFg;
  ctx.font = "600 11px Helvetica, Arial, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(`Paiement: ${payLabel}`, W / 2, y + 17);
  y += payH + 16;

  // ── Footer ──
  drawSeparator(ctx, px, y, W - px);
  y += 14;
  ctx.fillStyle = "#9ca3af";
  ctx.font = "400 10px Helvetica, Arial, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("Merci pour votre visite !", W / 2, y);
  y += 14;
  ctx.font = "400 9px Helvetica, Arial, sans-serif";
  ctx.fillText("Gitega Study Space — Multipurpose Room", W / 2, y);
  y += 20;

  // ── Crop & download ──
  const croppedCanvas = document.createElement("canvas");
  croppedCanvas.width = W;
  croppedCanvas.height = y;
  const cc = croppedCanvas.getContext("2d");
  if (!cc) return;
  cc.drawImage(canvas, 0, 0, W, y, 0, 0, W, y);

  return new Promise<void>((resolve) => {
    croppedCanvas.toBlob((blob) => {
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
  });
}

function drawSeparator(ctx: CanvasRenderingContext2D, x1: number, y: number, x2: number) {
  ctx.strokeStyle = "#e2e8f0";
  ctx.lineWidth = 1;
  ctx.setLineDash([4, 3]);
  ctx.beginPath();
  ctx.moveTo(x1, y);
  ctx.lineTo(x2, y);
  ctx.stroke();
  ctx.setLineDash([]);
}

// ── Helpers ──────────────────────────────────────────────────────

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function roundedRect(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number,
  r: number, fill: string
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
}


// ── Print ───────────────────────────────────────────────────────

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

// ── Share WhatsApp ──────────────────────────────────────────────

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

// ── Share Email ─────────────────────────────────────────────────

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
