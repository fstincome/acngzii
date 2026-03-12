import { useState, useRef, useCallback } from "react";
import { QRCodeSVG, QRCodeCanvas } from "qrcode.react";
import { Button } from "@/components/ui/button";
import { Download, Printer, Mail, MessageCircle, Image as ImageIcon, FileText } from "lucide-react";
import {
  generateMembershipCardPDF,
  downloadCardPDF,
  printCardPDF,
  shareViaWhatsApp,
  shareViaEmail,
} from "@/lib/membership-card";
import { toast } from "sonner";

interface MembershipCardProps {
  fullName: string;
  visitorId: string;
  photo?: string | null;
  showActions?: boolean;
  compact?: boolean;
}

export default function MembershipCard({ fullName, visitorId, photo, showActions = true, compact = false }: MembershipCardProps) {
  const [generating, setGenerating] = useState(false);
  const qrCanvasRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  const getQRDataUrl = (): Promise<string> => {
    return new Promise((resolve) => {
      const canvas = qrCanvasRef.current?.querySelector("canvas");
      if (canvas) {
        resolve(canvas.toDataURL("image/png"));
      } else {
        resolve("");
      }
    });
  };

  const handleDownloadPDF = async () => {
    setGenerating(true);
    try {
      const qrDataUrl = await getQRDataUrl();
      const doc = await generateMembershipCardPDF(fullName, visitorId, qrDataUrl);
      downloadCardPDF(doc, visitorId);
      toast.success("Carte PDF téléchargée !");
    } catch (err) {
      toast.error("Erreur lors de la génération");
      console.error(err);
    } finally {
      setGenerating(false);
    }
  };

  const handleDownloadPNG = useCallback(async () => {
    setGenerating(true);
    try {
      const cardEl = cardRef.current;
      if (!cardEl) throw new Error("Card element not found");

      // Use html2canvas-like approach with canvas API
      const canvas = document.createElement("canvas");
      const scale = 3; // High resolution
      const rect = cardEl.getBoundingClientRect();
      canvas.width = rect.width * scale;
      canvas.height = rect.height * scale;
      const ctx = canvas.getContext("2d")!;
      ctx.scale(scale, scale);

      // Draw background gradient
      const grad = ctx.createLinearGradient(0, 0, rect.width, rect.height);
      grad.addColorStop(0, "hsl(232, 32%, 14%)");
      grad.addColorStop(0.5, "hsl(234, 40%, 22%)");
      grad.addColorStop(1, "hsl(232, 32%, 18%)");
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.roundRect(0, 0, rect.width, rect.height, 16);
      ctx.fill();

      // Accent bar
      const accentGrad = ctx.createLinearGradient(0, 0, rect.width, 0);
      accentGrad.addColorStop(0, "hsl(234, 85%, 60%)");
      accentGrad.addColorStop(1, "hsl(174, 62%, 47%)");
      ctx.fillStyle = accentGrad;
      ctx.fillRect(0, 0, rect.width, 4);

      // Logo
      try {
        const logoImg = new window.Image();
        logoImg.crossOrigin = "anonymous";
        await new Promise<void>((res, rej) => {
          logoImg.onload = () => res();
          logoImg.onerror = rej;
          logoImg.src = "/gss-logo.png";
        });
        ctx.drawImage(logoImg, 20, 16, 40, 40);
      } catch {
        // skip logo
      }

      // Header text
      ctx.font = "bold 11px Inter, sans-serif";
      ctx.fillStyle = "#ffffff";
      ctx.letterSpacing = "2px";
      ctx.fillText("GITEGA STUDY SPACE", 68, 32);
      ctx.font = "10px Inter, sans-serif";
      ctx.fillStyle = "rgba(255,255,255,0.5)";
      ctx.fillText("Carte de Membre", 68, 46);

      // Divider
      ctx.strokeStyle = "rgba(255,255,255,0.1)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(20, 64);
      ctx.lineTo(rect.width - 20, 64);
      ctx.stroke();

      // Member name label
      ctx.font = "500 8px Inter, sans-serif";
      ctx.fillStyle = "rgba(255,255,255,0.4)";
      ctx.fillText("NOM DU MEMBRE", 20, 84);

      // Member name
      ctx.font = "bold 16px Inter, sans-serif";
      ctx.fillStyle = "#ffffff";
      ctx.fillText(fullName, 20, 102);

      // ID label
      ctx.font = "500 8px Inter, sans-serif";
      ctx.fillStyle = "rgba(255,255,255,0.4)";
      ctx.fillText("IDENTIFIANT", 20, 122);

      // ID
      ctx.font = "bold 14px 'JetBrains Mono', monospace";
      ctx.fillStyle = "hsl(174, 62%, 47%)";
      ctx.fillText(visitorId, 20, 138);

      // Photo + QR Code
      const qrSize = 72;
      const qrX = rect.width - qrSize - 28;
      let qrY = 76;

      // Draw photo if available
      if (photo) {
        try {
          const photoImg = new window.Image();
          photoImg.crossOrigin = "anonymous";
          await new Promise<void>((res, rej) => {
            photoImg.onload = () => res();
            photoImg.onerror = rej;
            photoImg.src = photo;
          });
          const photoW = 56;
          const photoH = 64;
          const photoX = qrX + (qrSize + 16 - photoW) / 2;
          ctx.save();
          ctx.beginPath();
          ctx.roundRect(photoX, 76, photoW, photoH, 8);
          ctx.clip();
          ctx.drawImage(photoImg, photoX, 76, photoW, photoH);
          ctx.restore();
          ctx.strokeStyle = "rgba(255,255,255,0.2)";
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.roundRect(photoX, 76, photoW, photoH, 8);
          ctx.stroke();
          qrY = 76 + photoH + 8;
        } catch {
          // skip photo
        }
      }

      // QR Code
      const qrDataUrl = await getQRDataUrl();
      if (qrDataUrl) {
        const qrImg = new window.Image();
        await new Promise<void>((res, rej) => {
          qrImg.onload = () => res();
          qrImg.onerror = rej;
          qrImg.src = qrDataUrl;
        });
        // White bg
        ctx.fillStyle = "#ffffff";
        ctx.beginPath();
        ctx.roundRect(qrX - 8, qrY - 8, qrSize + 16, qrSize + 16, 12);
        ctx.fill();
        ctx.drawImage(qrImg, qrX, qrY, qrSize, qrSize);
      }

      // Footer divider
      ctx.strokeStyle = "rgba(255,255,255,0.1)";
      ctx.beginPath();
      ctx.moveTo(20, rect.height - 32);
      ctx.lineTo(rect.width - 20, rect.height - 32);
      ctx.stroke();

      // Footer text
      ctx.font = "9px Inter, sans-serif";
      ctx.fillStyle = "rgba(255,255,255,0.3)";
      ctx.fillText("Présentez cette carte à chaque visite", 20, rect.height - 14);
      ctx.textAlign = "right";
      ctx.fillText("+257 61 154 065", rect.width - 20, rect.height - 14);
      ctx.textAlign = "left";

      // Download
      const link = document.createElement("a");
      link.download = `carte-membre-${visitorId}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
      toast.success("Carte PNG téléchargée !");
    } catch (err) {
      toast.error("Erreur lors de la génération PNG");
      console.error(err);
    } finally {
      setGenerating(false);
    }
  }, [fullName, visitorId]);

  const handlePrint = async () => {
    setGenerating(true);
    try {
      const qrDataUrl = await getQRDataUrl();
      const doc = await generateMembershipCardPDF(fullName, visitorId, qrDataUrl);
      // Download and let user print manually
      downloadCardPDF(doc, visitorId);
      toast.success("PDF téléchargé — ouvrez-le pour imprimer");
    } catch (err) {
      toast.error("Erreur lors de l'impression");
      console.error(err);
    } finally {
      setGenerating(false);
    }
  };

  const getWhatsAppUrl = () => {
    const cardUrl = `${window.location.origin}/card/${visitorId}`;
    const message =
      `🎓 *Carte de membre - Gitega Study Space*\n\n` +
      `👤 Nom: ${fullName}\n` +
      `🆔 ID: ${visitorId}\n\n` +
      `📱 Voir ma carte: ${cardUrl}\n\n` +
      `Présentez votre QR code à chaque visite.`;
    return `https://wa.me/?text=${encodeURIComponent(message)}`;
  };

  const getEmailUrl = () => {
    const cardUrl = `${window.location.origin}/card/${visitorId}`;
    const subject = "Votre carte de membre - Gitega Study Space";
    const body =
      `Bonjour ${fullName},\n\n` +
      `Bienvenue au Gitega Study Space !\n\n` +
      `Voici vos informations de membre :\n` +
      `- Identifiant : ${visitorId}\n` +
      `- Carte digitale : ${cardUrl}\n\n` +
      `Présentez votre QR code à chaque visite.\n\n` +
      `Cordialement,\nGitega Study Space`;
    return `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };

  return (
    <div className="space-y-5">
      {/* Visual Card Preview */}
      <div ref={cardRef} className={`mx-auto w-full ${compact ? "max-w-xs" : "max-w-sm"} overflow-hidden rounded-2xl shadow-xl`}>
        <div
          className="relative p-6"
          style={{
            background: "linear-gradient(135deg, hsl(232 32% 14%) 0%, hsl(234 40% 22%) 50%, hsl(232 32% 18%) 100%)",
          }}
        >
          {/* Accent bar */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary to-accent" />

          {/* Header */}
          <div className="flex items-center gap-3 pb-4 border-b border-white/10">
            <img src="/gss-logo.png" alt="Gitega Study Space" className="h-10 w-10 rounded-lg object-contain shrink-0" />
            <div>
              <p className="text-xs font-bold text-white tracking-widest">GITEGA STUDY SPACE</p>
              <p className="text-[10px] text-white/50">Carte de Membre</p>
            </div>
          </div>

          {/* Content */}
          <div className="flex items-start justify-between gap-4 pt-5">
            <div className="flex-1 min-w-0 space-y-3">
              <div>
                <p className="text-[10px] uppercase tracking-widest text-white/40 font-medium">Nom du membre</p>
                <p className="text-base font-bold text-white truncate">{fullName}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-widest text-white/40 font-medium">Identifiant</p>
                <p className="font-mono text-sm font-bold text-accent">{visitorId}</p>
              </div>
            </div>
            <div className="shrink-0 flex flex-col items-center gap-2">
              {photo && (
                <img src={photo} alt={fullName} className="h-16 w-14 rounded-lg object-cover border border-white/20" />
              )}
              <div className="rounded-xl bg-white p-2 shadow-lg">
                <QRCodeSVG value={visitorId} size={compact ? 56 : 72} level="M" />
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between">
            <p className="text-[9px] text-white/30">Présentez cette carte à chaque visite</p>
            <p className="text-[9px] text-white/30">+257 61 154 065</p>
          </div>
        </div>
      </div>

      {/* Hidden canvas for PDF generation */}
      <div ref={qrCanvasRef} className="hidden">
        <QRCodeCanvas value={visitorId} size={200} level="M" />
      </div>

      {/* Action buttons */}
      {showActions && (
        <div className="space-y-3">
          {/* Download options */}
          <div className="grid grid-cols-2 gap-2.5">
            <Button
              onClick={handleDownloadPDF}
              disabled={generating}
              className="gap-2 rounded-xl h-11"
              variant="default"
            >
              <FileText className="h-4 w-4" />
              Télécharger PDF
            </Button>
            <Button
              onClick={handleDownloadPNG}
              disabled={generating}
              className="gap-2 rounded-xl h-11"
              variant="secondary"
            >
              <ImageIcon className="h-4 w-4" />
              Télécharger PNG
            </Button>
          </div>

          {/* Print */}
          <Button
            onClick={handlePrint}
            disabled={generating}
            className="w-full gap-2 rounded-xl h-11"
            variant="outline"
          >
            <Printer className="h-4 w-4" />
            Imprimer la carte
          </Button>

          {/* Share */}
          <div className="flex items-center gap-2 px-1">
            <span className="text-xs text-muted-foreground">Partager :</span>
            <div className="flex gap-2">
              <a
                href={getWhatsAppUrl()}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-lg text-xs h-8 px-3 hover:bg-success/10 hover:text-success text-foreground transition-colors"
              >
                <MessageCircle className="h-3.5 w-3.5" />
                WhatsApp
              </a>
              <a
                href={getEmailUrl()}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-lg text-xs h-8 px-3 hover:bg-accent/10 hover:text-accent text-foreground transition-colors"
              >
                <Mail className="h-3.5 w-3.5" />
                Email
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
