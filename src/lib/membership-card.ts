import jsPDF from "jspdf";

const CARD_WIDTH = 85.6; // mm (credit card size)
const CARD_HEIGHT = 53.98; // mm

// Colors matching our design system
const PRIMARY_COLOR = [67, 56, 202] as const; // indigo
const ACCENT_COLOR = [20, 184, 166] as const; // teal
const DARK_COLOR = [30, 27, 56] as const;
const LIGHT_TEXT = [255, 255, 255] as const;
const MUTED_TEXT = [120, 120, 140] as const;

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

export async function generateMembershipCardPDF(
  fullName: string,
  visitorId: string,
  qrDataUrl: string,
  logoUrl: string = "/gss-logo.png"
): Promise<jsPDF> {
  const doc = new jsPDF({
    orientation: "landscape",
    unit: "mm",
    format: [CARD_WIDTH, CARD_HEIGHT],
  });

  // Background gradient simulation
  const steps = 60;
  for (let i = 0; i < steps; i++) {
    const ratio = i / steps;
    const r = Math.round(DARK_COLOR[0] + (PRIMARY_COLOR[0] - DARK_COLOR[0]) * ratio * 0.3);
    const g = Math.round(DARK_COLOR[1] + (PRIMARY_COLOR[1] - DARK_COLOR[1]) * ratio * 0.3);
    const b = Math.round(DARK_COLOR[2] + (PRIMARY_COLOR[2] - DARK_COLOR[2]) * ratio * 0.3);
    doc.setFillColor(r, g, b);
    doc.rect(0, (CARD_HEIGHT / steps) * i, CARD_WIDTH, CARD_HEIGHT / steps + 0.5, "F");
  }

  // Accent bar at top
  doc.setFillColor(...ACCENT_COLOR);
  doc.rect(0, 0, CARD_WIDTH, 1.5, "F");

  // Logo area
  try {
    const logoImg = await loadImage(logoUrl);
    const logoCanvas = document.createElement("canvas");
    logoCanvas.width = logoImg.width;
    logoCanvas.height = logoImg.height;
    const logoCtx = logoCanvas.getContext("2d")!;
    logoCtx.drawImage(logoImg, 0, 0);
    const logoDataUrl = logoCanvas.toDataURL("image/png");
    doc.addImage(logoDataUrl, "PNG", 5, 5, 10, 10);
  } catch {
    doc.setFillColor(...PRIMARY_COLOR);
    doc.circle(10, 10, 5, "F");
  }

  // Title
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.setTextColor(...LIGHT_TEXT);
  doc.text("AMERICAN CORNER NGOZI", 18, 9);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(4.5);
  doc.setTextColor(...MUTED_TEXT);
  doc.text("Membership Card", 18, 12.5);

  // Divider line
  doc.setDrawColor(80, 80, 120);
  doc.setLineWidth(0.2);
  doc.line(5, 18, CARD_WIDTH - 5, 18);

  // Member name
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(...LIGHT_TEXT);
  doc.text(fullName.toUpperCase(), 5, 26);

  // Visitor ID
  doc.setFont("courier", "bold");
  doc.setFontSize(7);
  doc.setTextColor(...ACCENT_COLOR);
  doc.text(visitorId, 5, 32);

  // Label
  doc.setFont("helvetica", "normal");
  doc.setFontSize(4);
  doc.setTextColor(...MUTED_TEXT);
  doc.text("MEMBER ID", 5, 36);

  // QR Code
  try {
    const qrImg = await loadImage(qrDataUrl);
    const qrCanvas = document.createElement("canvas");
    qrCanvas.width = 200;
    qrCanvas.height = 200;
    const qrCtx = qrCanvas.getContext("2d")!;
    qrCtx.fillStyle = "#ffffff";
    qrCtx.roundRect(0, 0, 200, 200, 16);
    qrCtx.fill();
    qrCtx.drawImage(qrImg, 10, 10, 180, 180);
    const qrDataURL = qrCanvas.toDataURL("image/png");
    
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(CARD_WIDTH - 25, 22, 20, 20, 2, 2, "F");
    doc.addImage(qrDataURL, "PNG", CARD_WIDTH - 24, 23, 18, 18);
  } catch {
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(CARD_WIDTH - 25, 22, 20, 20, 2, 2, "F");
    doc.setFontSize(4);
    doc.setTextColor(100, 100, 100);
    doc.text("QR Code", CARD_WIDTH - 18, 34);
  }

  // Footer
  doc.setFont("helvetica", "normal");
  doc.setFontSize(3.5);
  doc.setTextColor(...MUTED_TEXT);
  doc.text("Show this card on every visit", 5, CARD_HEIGHT - 4);
  doc.text("+257 61 07 35 94", CARD_WIDTH - 5, CARD_HEIGHT - 4, { align: "right" });

  return doc;
}

export function downloadCardPDF(doc: jsPDF, visitorId: string) {
  doc.save(`membership-card-${visitorId}.pdf`);
}

export function printCardPDF(doc: jsPDF) {
  const pdfDataUri = doc.output("datauristring");
  const printWindow = window.open("", "_blank");
  if (printWindow) {
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head><title>Membership Card</title></head>
        <body style="margin:0;display:flex;justify-content:center;align-items:center;min-height:100vh;background:#f0f0f0;">
          <embed src="${pdfDataUri}" type="application/pdf" width="400" height="260" />
          <script>
            setTimeout(function() { window.print(); }, 500);
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  }
}

export function getCardPDFBlob(doc: jsPDF): Blob {
  return doc.output("blob");
}

export function shareViaWhatsApp(visitorId: string, fullName: string) {
  const cardUrl = `${window.location.origin}/card/${visitorId}`;
  const message = 
    `🎓 *Membership Card - American Corner*\n\n` +
    `👤 Name: ${fullName}\n` +
    `🆔 ID: ${visitorId}\n\n` +
    `📱 View my card: ${cardUrl}\n\n` +
    `Show your QR code on every visit.`;
  
  // Use api.whatsapp.com which works on both mobile and desktop
  const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`;
  window.open(url, "_blank", "noopener,noreferrer");
}

export function shareViaEmail(visitorId: string, fullName: string, recipientEmail?: string) {
  const cardUrl = `${window.location.origin}/card/${visitorId}`;
  const subject = "Your membership card - American Corner";
  const body = 
    `Hello ${fullName},\n\n` +
    `Welcome to American Corner!\n\n` +
    `Here is your member information:\n` +
    `- ID : ${visitorId}\n` +
    `- Digital card : ${cardUrl}\n\n` +
    `Show your QR code on every visit.\n\n` +
    `Best regards,\nAmerican Corner`;

  const mailto = `mailto:${recipientEmail || ""}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  window.location.href = mailto;
}
