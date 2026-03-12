import { useState, useRef } from "react";
import { QRCodeSVG, QRCodeCanvas } from "qrcode.react";
import { Button } from "@/components/ui/button";
import { Download, Printer, Share2, Mail, MessageCircle, Sparkles, RefreshCw } from "lucide-react";
import {
  generateMembershipCardPDF,
  downloadCardPDF,
  printCardPDF,
  shareViaWhatsApp,
} from "@/lib/membership-card";
import { toast } from "sonner";

interface MembershipCardProps {
  fullName: string;
  visitorId: string;
  showActions?: boolean;
  compact?: boolean;
}

export default function MembershipCard({ fullName, visitorId, showActions = true, compact = false }: MembershipCardProps) {
  const [generating, setGenerating] = useState(false);
  const qrCanvasRef = useRef<HTMLDivElement>(null);

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

  const handleDownload = async () => {
    setGenerating(true);
    try {
      const qrDataUrl = await getQRDataUrl();
      const doc = await generateMembershipCardPDF(fullName, visitorId, qrDataUrl);
      downloadCardPDF(doc, visitorId);
      toast.success("Carte téléchargée !");
    } catch (err) {
      toast.error("Erreur lors de la génération");
      console.error(err);
    } finally {
      setGenerating(false);
    }
  };

  const handlePrint = async () => {
    setGenerating(true);
    try {
      const qrDataUrl = await getQRDataUrl();
      const doc = await generateMembershipCardPDF(fullName, visitorId, qrDataUrl);
      printCardPDF(doc);
      toast.success("Impression lancée !");
    } catch (err) {
      toast.error("Erreur lors de l'impression");
      console.error(err);
    } finally {
      setGenerating(false);
    }
  };

  const handleWhatsApp = () => {
    shareViaWhatsApp(visitorId, fullName);
  };

  const handleEmail = () => {
    const subject = encodeURIComponent("Votre carte de membre - Gitega Study Space");
    const body = encodeURIComponent(
      `Bonjour ${fullName},\n\n` +
      `Voici votre identifiant de membre: ${visitorId}\n\n` +
      `Présentez votre QR code à chaque visite au Gitega Study Space.\n\n` +
      `Accédez à votre carte: ${window.location.origin}/card/${visitorId}\n\n` +
      `Cordialement,\nGitega Study Space`
    );
    window.open(`mailto:?subject=${subject}&body=${body}`, "_blank");
  };

  return (
    <div className="space-y-5">
      {/* Visual Card Preview */}
      <div className={`mx-auto w-full ${compact ? "max-w-xs" : "max-w-sm"} overflow-hidden rounded-2xl shadow-xl`}>
        {/* Card face */}
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
            <div className="flex h-10 w-10 items-center justify-center rounded-xl shrink-0" style={{ background: "var(--gradient-primary, linear-gradient(135deg, hsl(234 85% 60%), hsl(174 62% 47%)))" }}>
              <Sparkles className="h-5 w-5 text-white" />
            </div>
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
            <div className="shrink-0 rounded-xl bg-white p-2 shadow-lg">
              <QRCodeSVG value={visitorId} size={compact ? 56 : 72} level="M" />
            </div>
          </div>

          {/* Footer */}
          <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between">
            <p className="text-[9px] text-white/30">Présentez cette carte à chaque visite</p>
            <p className="text-[9px] text-white/30">gssaccess.lovable.app</p>
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
          <div className="grid grid-cols-2 gap-2.5">
            <Button
              onClick={handleDownload}
              disabled={generating}
              className="gap-2 rounded-xl h-11"
              variant="default"
            >
              <Download className="h-4 w-4" />
              Télécharger PDF
            </Button>
            <Button
              onClick={handlePrint}
              disabled={generating}
              className="gap-2 rounded-xl h-11"
              variant="outline"
            >
              <Printer className="h-4 w-4" />
              Imprimer
            </Button>
          </div>

          <div className="flex items-center gap-2 px-1">
            <span className="text-xs text-muted-foreground">Partager :</span>
            <div className="flex gap-2">
              <Button
                onClick={handleWhatsApp}
                size="sm"
                variant="ghost"
                className="gap-1.5 rounded-lg text-xs h-8 px-3 hover:bg-success/10 hover:text-success"
              >
                <MessageCircle className="h-3.5 w-3.5" />
                WhatsApp
              </Button>
              <Button
                onClick={handleEmail}
                size="sm"
                variant="ghost"
                className="gap-1.5 rounded-lg text-xs h-8 px-3"
              >
                <Mail className="h-3.5 w-3.5" />
                Email
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
