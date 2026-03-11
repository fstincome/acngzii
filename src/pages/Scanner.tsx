import { useState, useRef, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { QRCodeSVG } from "qrcode.react";
import {
  findVisitorByQR,
  getVisitorVisits,
  isVisitorInRoom,
  addVisit,
  getCurrentOccupancy,
  COMPUTER_LAB_CAPACITY,
  useStore,
} from "@/lib/store";
import type { Visitor } from "@/lib/store";
import { ScanLine, Monitor, DoorOpen, LogOut, AlertTriangle, Search, Camera, X } from "lucide-react";
import { toast } from "sonner";
import { Html5Qrcode } from "html5-qrcode";

export default function Scanner() {
  useStore();
  const [query, setQuery] = useState("");
  const [scanned, setScanned] = useState<Visitor | null>(null);
  const [cameraOpen, setCameraOpen] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);

  const handleLookup = (id: string) => {
    const trimmed = id.trim().toUpperCase();
    if (!trimmed) return;
    const visitor = findVisitorByQR(trimmed);
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
    // Wait for DOM element to render
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
  }, [stopCamera]);

  const inLab = scanned ? isVisitorInRoom(scanned.visitorId, "computer_lab") : false;
  const inMulti = scanned ? isVisitorInRoom(scanned.visitorId, "multipurpose_room") : false;
  const labFull = getCurrentOccupancy("computer_lab").size >= COMPUTER_LAB_CAPACITY;

  const handleAction = (room: "computer_lab" | "multipurpose_room", action: "check_in" | "check_out") => {
    if (!scanned) return;
    if (action === "check_in" && room === "computer_lab" && labFull) {
      toast.error("La Salle Informatique est pleine. Veuillez patienter.");
      return;
    }
    if (action === "check_in" && isVisitorInRoom(scanned.visitorId, room)) {
      toast.warning("Ce visiteur est déjà dans cette salle.");
      return;
    }
    addVisit({
      id: crypto.randomUUID(),
      visitorId: scanned.visitorId,
      room,
      action,
      timestamp: new Date().toISOString(),
    });
    const roomLabel = room === "computer_lab" ? "Salle Informatique" : "Salle Polyvalente";
    const actionLabel = action === "check_in" ? "entré(e) dans" : "sorti(e) de";
    toast.success(`${scanned.fullName} ${actionLabel} ${roomLabel}`);
    setScanned({ ...scanned });
  };

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Scanner QR</h1>
        <p className="text-sm text-muted-foreground">Scannez ou entrez l'ID du visiteur</p>
      </div>

      {/* Camera Scanner */}
      {cameraOpen && (
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm font-semibold text-foreground">Caméra active</p>
            <Button variant="ghost" size="sm" onClick={stopCamera}>
              <X className="h-4 w-4" />
            </Button>
          </div>
          <div id="qr-reader" className="overflow-hidden rounded-lg" />
        </div>
      )}

      {/* Scanner Input */}
      <div className="rounded-xl border border-border bg-card p-6">
        <div className="mb-4 flex items-center justify-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-primary/10">
            <ScanLine className="h-10 w-10 text-primary" />
          </div>
        </div>
        <p className="mb-4 text-center text-xs text-muted-foreground">
          Scannez le QR code avec la caméra ou entrez l'ID (ex: GSS-000001)
        </p>

        {!cameraOpen && (
          <Button onClick={startCamera} variant="outline" className="mb-4 w-full gap-2">
            <Camera className="h-4 w-4" />
            Ouvrir la caméra
          </Button>
        )}

        <div className="flex gap-2">
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="GSS-000001"
            className="font-mono"
            onKeyDown={(e) => e.key === "Enter" && handleScan()}
          />
          <Button onClick={handleScan} className="gap-2">
            <Search className="h-4 w-4" />
            Chercher
          </Button>
        </div>
      </div>

      {/* Result */}
      {scanned && (
        <div className="space-y-4 rounded-xl border border-border bg-card p-6">
          <div className="flex items-start gap-4">
            <QRCodeSVG value={scanned.visitorId} size={64} />
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-foreground">{scanned.fullName}</h3>
              <p className="font-mono text-sm text-primary">{scanned.visitorId}</p>
              <p className="text-xs text-muted-foreground">{scanned.occupation} · {scanned.neighborhood}</p>
            </div>
          </div>

          {/* Status */}
          <div className="flex flex-wrap gap-2">
            {inLab && (
              <span className="occupancy-badge bg-primary/10 text-primary">
                <Monitor className="h-3 w-3" /> En Salle Informatique
              </span>
            )}
            {inMulti && (
              <span className="occupancy-badge bg-accent/10 text-accent">
                <DoorOpen className="h-3 w-3" /> En Salle Polyvalente
              </span>
            )}
            {!inLab && !inMulti && (
              <span className="occupancy-badge bg-muted text-muted-foreground">Pas dans une salle actuellement</span>
            )}
          </div>

          {/* Warnings */}
          {inLab && inMulti && (
            <div className="flex items-center gap-2 rounded-lg bg-warning/10 p-3 text-xs text-warning">
              <AlertTriangle className="h-4 w-4" />
              Ce visiteur est enregistré dans les deux salles. Veuillez vérifier.
            </div>
          )}

          {/* Actions */}
          <div className="space-y-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Actions</p>
            <div className="grid gap-2 sm:grid-cols-2">
              {!inLab && (
                <Button onClick={() => handleAction("computer_lab", "check_in")} className="gap-2" disabled={labFull}>
                  <Monitor className="h-4 w-4" />
                  Entrée Salle Informatique
                </Button>
              )}
              {inLab && (
                <Button onClick={() => handleAction("computer_lab", "check_out")} variant="outline" className="gap-2">
                  <LogOut className="h-4 w-4" />
                  Sortie Salle Informatique
                </Button>
              )}
              {!inMulti && (
                <Button onClick={() => handleAction("multipurpose_room", "check_in")} variant="secondary" className="gap-2">
                  <DoorOpen className="h-4 w-4" />
                  Entrée Salle Polyvalente
                </Button>
              )}
            </div>
          </div>

          {/* Recent visits */}
          <div>
            <p className="mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Activité récente</p>
            <div className="space-y-1">
              {getVisitorVisits(scanned.visitorId)
                .sort((a, b) => b.timestamp.localeCompare(a.timestamp))
                .slice(0, 5)
                .map((v) => (
                  <div key={v.id} className="flex items-center justify-between rounded-md bg-muted/50 px-3 py-2 text-xs">
                    <span className="text-foreground">
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
