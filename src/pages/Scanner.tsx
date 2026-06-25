import { useState, useRef, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { QRCodeSVG } from "qrcode.react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import {
  useVisitors,
  useVisits,
  useAddVisit,
  computeOccupancy,
  COMPUTER_LAB_CAPACITY,
  DEFAULT_DURATION_HOURS,
  useVisitsRealtime,
  ROOM_LABELS,
} from "@/lib/supabase-store";
import type { Visitor, RoomType } from "@/lib/supabase-store";
import { ScanLine, Monitor, DoorOpen, LogOut, AlertTriangle, Search, Camera, X, TreePine, Clock, Building2 } from "lucide-react";
import { toast } from "sonner";
import { Html5Qrcode } from "html5-qrcode";

const DURATION_OPTIONS = [
  { value: "1", label: "1 hour" },
  { value: "2", label: "2 hours" },
  { value: "3", label: "3 hours" },
  { value: "4", label: "4 hours" },
  { value: "6", label: "6 hours" },
  { value: "8", label: "8 hours" },
  { value: "9", label: "9 hours (default)" },
];

export default function Scanner() {
  useVisitsRealtime();
  const { data: visitors = [] } = useVisitors();
  const { data: allVisits = [] } = useVisits();
  const addVisit = useAddVisit();

  const [query, setQuery] = useState("");
  const [scanned, setScanned] = useState<Visitor | null>(null);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [duration, setDuration] = useState(String(DEFAULT_DURATION_HOURS));
  const scannerRef = useRef<Html5Qrcode | null>(null);

  const scannedVisits = allVisits.filter((v) => scanned && v.visitor_id === scanned.visitor_id);

  const handleLookup = (id: string) => {
    const trimmed = id.trim().toUpperCase();
    if (!trimmed) return;
    const visitor = visitors.find((v) => v.visitor_id === trimmed);
    if (!visitor) {
      toast.error("Member not found");
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
      console.error("Camera error:", err);
      toast.error("Cannot access camera. Check permissions.");
      setCameraOpen(false);
    }
  }, [stopCamera, visitors]);

  const isInRoom = (visitorId: string, room: RoomType) =>
    computeOccupancy(allVisits, room).has(visitorId);

  const inCenter = scanned ? isInRoom(scanned.visitor_id, "center") : false;
  const inLab = scanned ? isInRoom(scanned.visitor_id, "computer_lab") : false;
  const inMulti = scanned ? isInRoom(scanned.visitor_id, "multipurpose_room") : false;
  const inGarden = scanned ? isInRoom(scanned.visitor_id, "garden") : false;
  const labFull = computeOccupancy(allVisits, "computer_lab").size >= COMPUTER_LAB_CAPACITY;

  const handleAction = async (room: RoomType, action: "check_in" | "check_out") => {
    if (!scanned) return;
    if (action === "check_in" && room === "computer_lab" && labFull) {
      toast.error("The Computer Lab is full. Please wait.");
      return;
    }
    if (action === "check_in" && isInRoom(scanned.visitor_id, room)) {
      toast.warning("This member is already in this room.");
      return;
    }
    try {
      const now = new Date();
      const visitData: {
        visitor_id: string;
        room: string;
        action: string;
        timestamp: string;
        expected_checkout?: string;
      } = {
        visitor_id: scanned.visitor_id,
        room,
        action,
        timestamp: now.toISOString(),
      };

      // Set expected_checkout on check_in
      if (action === "check_in") {
        // Computer lab: always 9h fixed. Discussion Room & Reading Lounge: user-selected duration
        const hours = room === "computer_lab" ? DEFAULT_DURATION_HOURS : (parseInt(duration) || DEFAULT_DURATION_HOURS);
        const checkout = new Date(now.getTime() + hours * 60 * 60 * 1000);
        visitData.expected_checkout = checkout.toISOString();
      }

      await addVisit.mutateAsync(visitData);
      const roomLabel = ROOM_LABELS[room];
      const actionLabel = action === "check_in" ? "entered" : "left";
      toast.success(`${scanned.full_name} ${actionLabel} ${roomLabel}`);
    } catch {
      toast.error("Save error");
    }
  };

  const roomIcon = (room: string) => {
    if (room === "center") return <Building2 className="h-3 w-3" />;
    if (room === "computer_lab") return <Monitor className="h-3 w-3" />;
    if (room === "garden") return <TreePine className="h-3 w-3" />;
    return <DoorOpen className="h-3 w-3" />;
  };

  return (
    <div className="mx-auto max-w-lg space-y-6 animate-fade-in">
      <div className="page-header">
        <h1 className="page-title">Scanner QR</h1>
        <p className="page-subtitle">Scan or enter the visitor ID</p>
      </div>

      {cameraOpen && (
        <div className="rounded-2xl border border-border/50 bg-card p-4 shadow-sm animate-fade-in">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm font-semibold text-foreground">Camera active</p>
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
          Scan the QR code with the camera or enter the ID (e.g. ACG-000001)
        </p>

        {!cameraOpen && (
          <Button onClick={startCamera} variant="outline" className="mb-4 w-full gap-2 rounded-xl h-11">
            <Camera className="h-4 w-4" />
            Open camera
          </Button>
        )}

        <div className="flex gap-2">
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="ACG-000001"
            className="font-mono rounded-xl h-11"
            onKeyDown={(e) => e.key === "Enter" && handleScan()}
          />
          <Button onClick={handleScan} className="gap-2 rounded-xl h-11 px-5">
            <Search className="h-4 w-4" />
            Search
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
                <Monitor className="h-3 w-3" /> In Computer Lab
              </span>
            )}
            {inMulti && (
              <span className="occupancy-badge bg-accent/10 text-accent border border-accent/15">
                <DoorOpen className="h-3 w-3" /> In Discussion Room
              </span>
            )}
            {inGarden && (
              <span className="occupancy-badge bg-green-500/10 text-green-600 border border-green-500/15">
                <TreePine className="h-3 w-3" /> In Reading Lounge
              </span>
            )}
            {!inLab && !inMulti && !inGarden && (
              <span className="occupancy-badge bg-muted text-muted-foreground">Not in any space</span>
            )}
          </div>

          {/* Duration selector for Polyvalente & Jardin only */}
          {(!inMulti || !inGarden) && (
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
                <Clock className="h-3 w-3" />
                Stay duration (Discussion Room / Reading Lounge)
              </Label>
              <Select value={duration} onValueChange={setDuration}>
                <SelectTrigger className="rounded-xl h-10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DURATION_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-3">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">Actions</p>
            <div className="grid gap-2 sm:grid-cols-2">
              {!inLab && (
                <Button onClick={() => handleAction("computer_lab", "check_in")} className="gap-2 rounded-xl h-11" disabled={labFull || addVisit.isPending}>
                  <Monitor className="h-4 w-4" />
                  Check-in Computer Lab
                </Button>
              )}
              {inLab && (
                <Button onClick={() => handleAction("computer_lab", "check_out")} variant="outline" className="gap-2 rounded-xl h-11" disabled={addVisit.isPending}>
                  <LogOut className="h-4 w-4" />
                  Check-out Computer Lab
                </Button>
              )}
              {!inMulti && (
                <Button onClick={() => handleAction("multipurpose_room", "check_in")} variant="secondary" className="gap-2 rounded-xl h-11" disabled={addVisit.isPending}>
                  <DoorOpen className="h-4 w-4" />
                  Check-in Discussion Room
                </Button>
              )}
              {inMulti && (
                <Button onClick={() => handleAction("multipurpose_room", "check_out")} variant="outline" className="gap-2 rounded-xl h-11" disabled={addVisit.isPending}>
                  <LogOut className="h-4 w-4" />
                  Check-out Discussion Room
                </Button>
              )}
              {!inGarden && (
                <Button onClick={() => handleAction("garden", "check_in")} variant="outline" className="gap-2 rounded-xl h-11 border-green-500/30 text-green-600 hover:bg-green-500/5" disabled={addVisit.isPending}>
                  <TreePine className="h-4 w-4" />
                  Check-in Reading Lounge
                </Button>
              )}
              {inGarden && (
                <Button onClick={() => handleAction("garden", "check_out")} variant="outline" className="gap-2 rounded-xl h-11 border-green-500/30 text-green-600 hover:bg-green-500/5" disabled={addVisit.isPending}>
                  <LogOut className="h-4 w-4" />
                  Check-out Reading Lounge
                </Button>
              )}
            </div>
          </div>

          <div>
            <p className="mb-3 text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">Recent activity</p>
            <div className="space-y-1.5">
              {scannedVisits
                .sort((a, b) => b.timestamp.localeCompare(a.timestamp))
                .slice(0, 5)
                .map((v) => (
                  <div key={v.id} className="flex items-center justify-between rounded-xl bg-muted/50 px-3.5 py-2.5 text-xs">
                    <span className="text-foreground font-medium flex items-center gap-1.5">
                      {roomIcon(v.room)}
                      {v.action === "check_in" ? "→ Check-in" : "← Check-out"}{" "}
                      {ROOM_LABELS[v.room as keyof typeof ROOM_LABELS] || v.room}
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
