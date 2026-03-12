import { useState, useRef, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { QRCodeSVG } from "qrcode.react";
import {
  useVisitors,
  useVisits,
  useVisitorVisits,
  useAddVisit,
  computeOccupancy,
  COMPUTER_LAB_CAPACITY,
  useVisitsRealtime,
} from "@/lib/supabase-store";
import type { Visitor } from "@/lib/supabase-store";
import { ScanLine, Monitor, DoorOpen, LogOut, AlertTriangle, Search, Camera, X } from "lucide-react";
import { toast } from "sonner";
import { Html5Qrcode } from "html5-qrcode";

export default function Scanner() {
  useVisitsRealtime();
  const { data: visitors = [] } = useVisitors();
  const { data: allVisits = [] } = useVisits();
  const addVisit = useAddVisit();

  const [query, setQuery] = useState("");
  const [scanned, setScanned] = useState<Visitor | null>(null);
  const [cameraOpen, setCameraOpen] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);

  const scannedVisits = allVisits.filter((v) => scanned && v.visitor_id === scanned.visitor_id);

  const handleLookup = (id: string) => {
    const trimmed = id.trim().toUpperCase();
    if (!trimmed) return;
    const visitor = visitors.find((v) => v.visitor_id === trimmed);
    if (!visitor) {
      toast.error("Visiteur introuvable");
      setScanned(null);
      return;
    }
    setScanned(visitor);
  };

  const handleScan = () => handleLookup(query);

  const stopCamera = useCallback(async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop();
        scannerRef.current.clear();
      } catch (_) {}
      scannerRef.current = null;
    }
    setCameraOpen(false);
  }, []);

  const startCamera = useCallback(async () => {
    setCameraOpen(true);
    await new Promise((r) => setTimeout(r, 100));
    try {
      const scanner = new Html5Qrcode("qr-reader");
      scannerRef.current = scanner;
      await scanner.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        (decodedText) => {
          handleLookup(decodedText);
          setQuery(decodedText);
          stopCamera();
        },
        () => {}
      );
    } catch (err) {
      console.error("Erreur caméra:", err);
      toast.error("Impossible d'accéder à la caméra. Vérifiez les permissions.");
      setCameraOpen(false);
    }
  }, [stopCamera, visitors]);

  const isInRoom = (visitorId: string, room: "computer_lab" | "multipurpose_room") =>
    computeOccupancy(allVisits, room).has(visitorId);

  const inLab = scanned ? isInRoom(scanned.visitor_id, "computer_lab") : false;
  const inMulti = scanned ? isInRoom(scanned.visitor_id, "multipurpose_room") : false;
  const labFull = computeOccupancy(allVisits, "computer_lab").size >= COMPUTER_LAB_CAPACITY;

  const handleAction = async (room: "computer_lab" | "multipurpose_room", action: "check_in" | "check_out") => {
    if (!scanned) return;
    if (action === "check_in" && room === "computer_lab" && labFull) {
      toast.error("La Salle Informatique est pleine. Veuillez patienter.");
      return;
    }
    if (action === "check_in" && isInRoom(scanned.visitor_id, room)) {
      toast.warning("Ce visiteur est déjà dans cette salle.");
      return;
    }
    try {
      await addVisit.mutateAsync({
        visitor_id: scanned.visitor_id,
        room,
        action,
        timestamp: new Date().toISOString(),
      });
      const roomLabel = room === "computer_lab" ? "Salle Informatique" : "Salle Polyvalente";
      const actionLabel = action === "check_in" ? "entré(e) dans" : "sorti(e) de";
      toast.success(`${scanned.full_name} ${actionLabel} ${roomLabel}`);
    } catch {
      toast.error("Erreur lors de l'enregistrement");
    }
  };

  return (
    <div className="mx-auto max-w-lg space-y-6 animate-fade-in">
      <div className="page-header">
        <h1 className="page-title">Scanner QR</h1>
        <p className="page-subtitle">Scannez ou entrez l'ID du visiteur</p>
      </div>

      {cameraOpen && (
        <div className="rounded-2xl border border-border/50 bg-card p-4 shadow-sm animate-fade-in">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm font-semibold text-foreground">Caméra active</p>
            <Button variant="ghost" size="sm" onClick={stopCamera} className="rounded-xl">
              <X className="h-4 w-4" />
            </Button>
          </div>
          <div id="qr-reader" className="overflow-hidden rounded-xl" />
        </div>
      )}

      <div className="rounded-2xl border border-border/50 bg-card p-7 shadow-sm">
        <div className="mb-5 flex items-center justify-center">
          <div className="icon-box h-16 w-16">
            <ScanLine className="h-8 w-8 text-primary-foreground" />
          </div>
        </div>
        <p className="mb-5 text-center text-xs text-muted-foreground">
          Scannez le QR code avec la caméra ou entrez l'ID (ex: GSS-000001)
        </p>

        {!cameraOpen && (
          <Button onClick={startCamera} variant="outline" className="mb-4 w-full gap-2 rounded-xl h-11">
            <Camera className="h-4 w-4" />
            Ouvrir la caméra
          </Button>
        )}

        <div className="flex gap-2">
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="GSS-000001"
            className="font-mono rounded-xl h-11"
            onKeyDown={(e) => e.key === "Enter" && handleScan()}
          />
          <Button onClick={handleScan} className="gap-2 rounded-xl h-11 px-5">
            <Search className="h-4 w-4" />
            Chercher
          </Button>
        </div>
      </div>

      {scanned && (
        <div className="space-y-5 rounded-2xl border border-border/50 bg-card p-7 shadow-sm animate-fade-in">
          <div className="flex items-start gap-4">
            <div className="rounded-xl border border-border/30 bg-background p-2">
              <QRCodeSVG value={scanned.visitor_id} size={60} />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-bold text-foreground">{scanned.full_name}</h3>
              <p className="font-mono text-sm font-semibold text-primary">{scanned.visitor_id}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{scanned.occupation} · {scanned.neighborhood}</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {inLab && (
              <span className="occupancy-badge bg-primary/10 text-primary border border-primary/15">
                <Monitor className="h-3 w-3" /> En Salle Informatique
              </span>
            )}
            {inMulti && (
              <span className="occupancy-badge bg-accent/10 text-accent border border-accent/15">
                <DoorOpen className="h-3 w-3" /> En Salle Polyvalente
              </span>
            )}
            {!inLab && !inMulti && (
              <span className="occupancy-badge bg-muted text-muted-foreground">Pas dans une salle</span>
            )}
          </div>

          {inLab && inMulti && (
            <div className="flex items-center gap-2 rounded-xl bg-warning/10 p-3 text-xs text-warning border border-warning/15">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              Ce visiteur est enregistré dans les deux salles. Veuillez vérifier.
            </div>
          )}

          <div className="space-y-3">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">Actions</p>
            <div className="grid gap-2 sm:grid-cols-2">
              {!inLab && (
                <Button onClick={() => handleAction("computer_lab", "check_in")} className="gap-2 rounded-xl h-11" disabled={labFull || addVisit.isPending}>
                  <Monitor className="h-4 w-4" />
                  Entrée Salle Info
                </Button>
              )}
              {inLab && (
                <Button onClick={() => handleAction("computer_lab", "check_out")} variant="outline" className="gap-2 rounded-xl h-11" disabled={addVisit.isPending}>
                  <LogOut className="h-4 w-4" />
                  Sortie Salle Info
                </Button>
              )}
              {!inMulti && (
                <Button onClick={() => handleAction("multipurpose_room", "check_in")} variant="secondary" className="gap-2 rounded-xl h-11" disabled={addVisit.isPending}>
                  <DoorOpen className="h-4 w-4" />
                  Entrée Salle Poly
                </Button>
              )}
            </div>
          </div>

          <div>
            <p className="mb-3 text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">Activité récente</p>
            <div className="space-y-1.5">
              {scannedVisits
                .sort((a, b) => b.timestamp.localeCompare(a.timestamp))
                .slice(0, 5)
                .map((v) => (
                  <div key={v.id} className="flex items-center justify-between rounded-xl bg-muted/50 px-3.5 py-2.5 text-xs">
                    <span className="text-foreground font-medium">
                      {v.action === "check_in" ? "→ Entrée" : "← Sortie"}{" "}
                      {v.room === "computer_lab" ? "Salle Informatique" : "Salle Polyvalente"}
                    </span>
                    <span className="text-muted-foreground">
                      {new Date(v.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
