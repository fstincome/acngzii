import { useState } from "react";
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
import { ScanLine, Monitor, DoorOpen, LogOut, AlertTriangle, Search } from "lucide-react";
import { toast } from "sonner";

export default function Scanner() {
  useStore();
  const [query, setQuery] = useState("");
  const [scanned, setScanned] = useState<Visitor | null>(null);

  const handleScan = () => {
    const trimmed = query.trim().toUpperCase();
    if (!trimmed) return;

    // Accept GSS-XXXXXX format or just search
    const visitor = findVisitorByQR(trimmed);
    if (!visitor) {
      toast.error("Visitor not found");
      setScanned(null);
      return;
    }
    setScanned(visitor);
  };

  const inLab = scanned ? isVisitorInRoom(scanned.visitorId, "computer_lab") : false;
  const inMulti = scanned ? isVisitorInRoom(scanned.visitorId, "multipurpose_room") : false;
  const labFull = getCurrentOccupancy("computer_lab").size >= COMPUTER_LAB_CAPACITY;

  const handleAction = (room: "computer_lab" | "multipurpose_room", action: "check_in" | "check_out") => {
    if (!scanned) return;

    if (action === "check_in" && room === "computer_lab" && labFull) {
      toast.error("Computer Lab is full. Please wait.");
      return;
    }

    if (action === "check_in" && isVisitorInRoom(scanned.visitorId, room)) {
      toast.warning("This visitor is already inside this room.");
      return;
    }

    addVisit({
      id: crypto.randomUUID(),
      visitorId: scanned.visitorId,
      room,
      action,
      timestamp: new Date().toISOString(),
    });

    const roomLabel = room === "computer_lab" ? "Computer Lab" : "Multipurpose Room";
    const actionLabel = action === "check_in" ? "checked in to" : "checked out of";
    toast.success(`${scanned.fullName} ${actionLabel} ${roomLabel}`);

    // Force re-render
    setScanned({ ...scanned });
  };

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">QR Scanner</h1>
        <p className="text-sm text-muted-foreground">Scan or enter visitor ID to check in/out</p>
      </div>

      {/* Scanner Input */}
      <div className="rounded-xl border border-border bg-card p-6">
        <div className="mb-4 flex items-center justify-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-primary/10">
            <ScanLine className="h-10 w-10 text-primary" />
          </div>
        </div>
        <p className="mb-4 text-center text-xs text-muted-foreground">
          Enter the visitor ID (e.g. GSS-000001) or scan the QR code
        </p>
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
            Search
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
                <Monitor className="h-3 w-3" /> In Computer Lab
              </span>
            )}
            {inMulti && (
              <span className="occupancy-badge bg-accent/10 text-accent">
                <DoorOpen className="h-3 w-3" /> In Multipurpose Room
              </span>
            )}
            {!inLab && !inMulti && (
              <span className="occupancy-badge bg-muted text-muted-foreground">Not currently in any room</span>
            )}
          </div>

          {/* Warnings */}
          {inLab && inMulti && (
            <div className="flex items-center gap-2 rounded-lg bg-warning/10 p-3 text-xs text-warning">
              <AlertTriangle className="h-4 w-4" />
              Visitor is recorded in both rooms. Please verify.
            </div>
          )}

          {/* Actions */}
          <div className="space-y-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Actions</p>

            <div className="grid gap-2 sm:grid-cols-2">
              {!inLab && (
                <Button
                  onClick={() => handleAction("computer_lab", "check_in")}
                  className="gap-2"
                  disabled={labFull}
                >
                  <Monitor className="h-4 w-4" />
                  Check In Computer Lab
                </Button>
              )}
              {inLab && (
                <Button
                  onClick={() => handleAction("computer_lab", "check_out")}
                  variant="outline"
                  className="gap-2"
                >
                  <LogOut className="h-4 w-4" />
                  Check Out Computer Lab
                </Button>
              )}
              {!inMulti && (
                <Button
                  onClick={() => handleAction("multipurpose_room", "check_in")}
                  variant="secondary"
                  className="gap-2"
                >
                  <DoorOpen className="h-4 w-4" />
                  Enter Multipurpose Room
                </Button>
              )}
            </div>
          </div>

          {/* Recent visits */}
          <div>
            <p className="mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Recent Activity</p>
            <div className="space-y-1">
              {getVisitorVisits(scanned.visitorId)
                .sort((a, b) => b.timestamp.localeCompare(a.timestamp))
                .slice(0, 5)
                .map((v) => (
                  <div key={v.id} className="flex items-center justify-between rounded-md bg-muted/50 px-3 py-2 text-xs">
                    <span className="text-foreground">
                      {v.action === "check_in" ? "→ In" : "← Out"}{" "}
                      {v.room === "computer_lab" ? "Computer Lab" : "Multipurpose Room"}
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
