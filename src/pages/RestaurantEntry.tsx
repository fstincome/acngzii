import { useState, useRef, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { UtensilsCrossed, Camera, X, Search } from "lucide-react";
import { toast } from "sonner";

export default function RestaurantEntry() {
  const [visitorId, setVisitorId] = useState("");
  const [loading, setLoading] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const scanIntervalRef = useRef<number | null>(null);
  const navigate = useNavigate();

  const lookupAndNavigate = async (id: string) => {
    const trimmed = id.trim().toUpperCase();
    if (!trimmed) return;
    setLoading(true);
    // Check visitor exists
    const { data: visitor } = await supabase.from("visitors").select("visitor_id").eq("visitor_id", trimmed).maybeSingle();
    if (!visitor) {
      setLoading(false);
      toast.error("Visiteur introuvable. Vérifiez votre identifiant.");
      return;
    }
    // Check visitor is currently checked in (has a check-in without a matching check-out today)
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const { data: visits } = await supabase
      .from("visits")
      .select("action")
      .eq("visitor_id", trimmed)
      .gte("timestamp", todayStart.toISOString())
      .order("timestamp", { ascending: false })
      .limit(1);
    setLoading(false);
    const lastAction = visits?.[0]?.action;
    if (lastAction !== "check-in") {
      toast.error("Vous devez d'abord pointer votre arrivée au centre avant de commander.", { duration: 5000 });
      return;
    }
    navigate(`/restaurant/menu/${trimmed}`);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    lookupAndNavigate(visitorId);
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
      streamRef.current = stream;
      setCameraActive(true);
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play();
          startQRScanning();
        }
      }, 100);
    } catch {
      toast.error("Impossible d'accéder à la caméra.");
      setCameraActive(false);
    }
  };

  const startQRScanning = () => {
    import("jsqr").then((jsQRModule) => {
      const jsQR = jsQRModule.default;
      const interval = window.setInterval(() => {
        if (!videoRef.current || !canvasRef.current) return;
        const video = videoRef.current;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext("2d");
        if (!ctx || video.readyState !== video.HAVE_ENOUGH_DATA) return;
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        ctx.drawImage(video, 0, 0);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const qrCode = jsQR(imageData.data, canvas.width, canvas.height);
        if (qrCode) {
          stopCamera();
          lookupAndNavigate(qrCode.data);
        }
      }, 300);
      scanIntervalRef.current = interval;
    });
  };

  const stopCamera = useCallback(() => {
    if (scanIntervalRef.current) { clearInterval(scanIntervalRef.current); scanIntervalRef.current = null; }
    if (streamRef.current) { streamRef.current.getTracks().forEach(t => t.stop()); streamRef.current = null; }
    setCameraActive(false);
  }, []);

  useEffect(() => () => { stopCamera(); }, [stopCamera]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center space-y-3">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
            <UtensilsCrossed className="h-8 w-8 text-primary" />
          </div>
          <CardTitle className="text-xl">Restaurant GSS</CardTitle>
          <p className="text-sm text-muted-foreground">
            Scannez votre carte ou entrez votre identifiant
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {cameraActive && (
            <div className="relative rounded-xl overflow-hidden border border-border">
              <video ref={videoRef} className="w-full" playsInline muted />
              <canvas ref={canvasRef} className="hidden" />
              <div className="absolute inset-0 border-2 border-primary/30 rounded-xl pointer-events-none" />
              <div className="absolute top-1/2 left-1/4 right-1/4 h-0.5 bg-primary/50 animate-pulse" />
              <Button size="icon" variant="destructive" className="absolute top-3 right-3 rounded-full shadow-lg" onClick={stopCamera}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          )}

          <Button
            variant={cameraActive ? "destructive" : "outline"}
            className="w-full gap-2"
            onClick={cameraActive ? stopCamera : startCamera}
          >
            <Camera className="h-4 w-4" />
            {cameraActive ? "Fermer la caméra" : "Scanner ma carte QR"}
          </Button>

          <div className="relative flex items-center gap-2">
            <div className="flex-1 h-px bg-border" />
            <span className="text-xs text-muted-foreground">ou</span>
            <div className="flex-1 h-px bg-border" />
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            <Input
              placeholder="GSS-XXXXXX"
              value={visitorId}
              onChange={(e) => setVisitorId(e.target.value)}
              className="text-center text-lg font-mono tracking-widest"
            />
            <Button type="submit" className="w-full" disabled={loading || !visitorId.trim()}>
              {loading ? "Vérification..." : "Accéder au menu"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
