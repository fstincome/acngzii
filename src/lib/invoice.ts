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
  const scale = 4;
  const cw = 80 * scale; // canvas width
  const ch = 260 * scale; // canvas height (generous)
  const canvas = document.createElement("canvas");
  canvas.width = cw;
  canvas.height = ch;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const s = scale;
  const mx = 6 * s;
  let y = 0;

  // ── Background ──
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, cw, ch);

  // ── Header band ──
  const headerH = 30 * s;
  ctx.fillStyle = "#1e40af";
  ctx.fillRect(0, 0, cw, headerH);

  // Load and draw logo
  try {
    const logo = await loadImage("/gss-logo.png");
    const logoSize = 10 * s;
    ctx.drawImage(logo, cw / 2 - logoSize / 2, 2 * s, logoSize, logoSize);
    y = 14 * s;
  } catch {
    y = 8 * s;
  }

  ctx.fillStyle = "#ffffff";
  ctx.textAlign = "center";
  ctx.font = `bold ${9 * s}px Helvetica, Arial, sans-serif`;
  ctx.fillText("GITEGA STUDY SPACE", cw / 2, y);
  y += 4 * s;
  ctx.font = `${6 * s}px Helvetica, Arial, sans-serif`;
  ctx.fillText("Restaurant — Facture", cw / 2, y);
  y += 3.5 * s;
  ctx.font = `${5 * s}px Helvetica, Arial, sans-serif`;
  ctx.fillText("Tél: +257 61 154 065", cw / 2, y);

  y = headerH + 5 * s;

  // ── Order code badge ──
  const badgeH = 9 * s;
  roundedRect(ctx, mx, y - 2 * s, cw - mx * 2, badgeH, 3 * s, "#eef2ff");
  ctx.fillStyle = "#1e40af";
  ctx.font = `bold ${9 * s}px Helvetica, Arial, sans-serif`;
  ctx.textAlign = "center";
  ctx.fillText(data.orderCode, cw / 2, y + 4 * s);
  y += badgeH + 4 * s;

  // ── Info pairs ──
  const infoPairs = [
    ["Date", new Date(data.createdAt).toLocaleString("fr")],
    ["Visiteur", data.visitorName || data.visitorId],
    ["Table", String(data.tableNumber)],
  ];
  ctx.textAlign = "left";
  infoPairs.forEach(([label, value]) => {
    ctx.font = `bold ${6 * s}px Helvetica, Arial, sans-serif`;
    ctx.fillStyle = "#374151";
    ctx.fillText(`${label}:`, mx + 1 * s, y);
    ctx.font = `${6 * s}px Helvetica, Arial, sans-serif`;
    ctx.fillStyle = "#6b7280";
    ctx.fillText(value, mx + 18 * s, y);
    y += 4 * s;
  });
  y += 2 * s;

  // ── Dashed line ──
  dashedLine(ctx, mx, y, cw - mx, y, s);
  y += 4 * s;

  // ── Table header ──
  roundedRect(ctx, mx, y - 3 * s, cw - mx * 2, 6 * s, 1.5 * s, "#f3f4f6");
  ctx.fillStyle = "#4b5563";
  ctx.font = `bold ${5.5 * s}px Helvetica, Arial, sans-serif`;
  ctx.textAlign = "left";
  ctx.fillText("ARTICLE", mx + 2 * s, y + 1 * s);
  ctx.textAlign = "center";
  ctx.fillText("QTÉ", 48 * s, y + 1 * s);
  ctx.textAlign = "right";
  ctx.fillText("TOTAL", cw - mx - 1 * s, y + 1 * s);
  y += 5 * s;

  // ── Items ──
  ctx.font = `${6 * s}px Helvetica, Arial, sans-serif`;
  data.items.forEach((item, idx) => {
    if (idx % 2 === 0) {
      ctx.fillStyle = "#fafbff";
      ctx.fillRect(mx, y - 3 * s, cw - mx * 2, 5 * s);
    }
    ctx.fillStyle = "#1f2937";
    ctx.textAlign = "left";
    const name = item.name.length > 16 ? item.name.substring(0, 15) + "…" : item.name;
    ctx.fillText(name, mx + 2 * s, y);
    ctx.fillStyle = "#6b7280";
    ctx.textAlign = "center";
    ctx.fillText(String(item.quantity), 48 * s, y);
    ctx.fillStyle = "#1f2937";
    ctx.textAlign = "right";
    ctx.fillText(`${(item.unitPrice * item.quantity).toLocaleString()}`, cw - mx - 1 * s, y);
    y += 5 * s;
  });
  y += 2 * s;

  // ── Dashed line ──
  dashedLine(ctx, mx, y, cw - mx, y, s);
  y += 5 * s;

  // ── Total badge ──
  const totalBadgeH = 10 * s;
  roundedRect(ctx, mx, y - 4 * s, cw - mx * 2, totalBadgeH, 3 * s, "#1e40af");
  ctx.fillStyle = "#ffffff";
  ctx.font = `bold ${8 * s}px Helvetica, Arial, sans-serif`;
  ctx.textAlign = "left";
  ctx.fillText("TOTAL", mx + 3 * s, y + 2 * s);
  ctx.textAlign = "right";
  ctx.fillText(`${data.totalAmount.toLocaleString()} BIF`, cw - mx - 3 * s, y + 2 * s);
  y += totalBadgeH + 4 * s;

  // ── Payment status badge ──
  const payLabel = PAYMENT_LABELS[data.paymentStatus] || data.paymentStatus;
  const isPaid = data.paymentStatus !== "unpaid";
  const payBg = isPaid ? "#dcfce7" : "#fef2f2";
  const payFg = isPaid ? "#166534" : "#991b1b";
  roundedRect(ctx, mx, y - 3 * s, cw - mx * 2, 7 * s, 2 * s, payBg);
  ctx.fillStyle = payFg;
  ctx.font = `bold ${6 * s}px Helvetica, Arial, sans-serif`;
  ctx.textAlign = "center";
  ctx.fillText(`Paiement: ${payLabel}`, cw / 2, y + 1.5 * s);
  y += 10 * s;

  // ── Footer ──
  dashedLine(ctx, mx, y, cw - mx, y, s);
  y += 5 * s;
  ctx.fillStyle = "#9ca3af";
  ctx.font = `${5 * s}px Helvetica, Arial, sans-serif`;
  ctx.textAlign = "center";
  ctx.fillText("Merci pour votre visite !", cw / 2, y);
  y += 3 * s;
  ctx.fillText("Gitega Study Space — Multipurpose Room", cw / 2, y);
  y += 5 * s;

  // ── Crop to actual content height and download ──
  const finalH = y;
  const croppedCanvas = document.createElement("canvas");
  croppedCanvas.width = cw;
  croppedCanvas.height = finalH;
  const croppedCtx = croppedCanvas.getContext("2d");
  if (!croppedCtx) return;
  croppedCtx.drawImage(canvas, 0, 0, cw, finalH, 0, 0, cw, finalH);

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

function dashedLine(
  ctx: CanvasRenderingContext2D,
  x1: number, y1: number, x2: number, y2: number,
  s: number
) {
  ctx.strokeStyle = "#d1d5db";
  ctx.lineWidth = 0.5 * s;
  ctx.setLineDash([2 * s, 1.5 * s]);
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
  ctx.setLineDash([]);
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
