import { useCallback, useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Camera, Search, X } from "lucide-react";
import { toast } from "sonner";

interface QRScannerProps {
  onScan: (text: string) => void;
  placeholder?: string;
  buttonLabel?: string;
  id?: string;
}

export default function QRScanner({
  onScan,
  placeholder = "Scan or enter a code",
  buttonLabel = "Search",
  id = "qr-reader",
}: QRScannerProps) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);

  const stop = useCallback(async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop();
        scannerRef.current.clear();
      } catch (_) {}
      scannerRef.current = null;
    }
    setOpen(false);
  }, []);

  const start = useCallback(async () => {
    setOpen(true);
    await new Promise((r) => setTimeout(r, 100));
    try {
      const scanner = new Html5Qrcode(id);
      scannerRef.current = scanner;
      await scanner.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        (decoded) => {
          onScan(decoded);
          setQuery(decoded);
          stop();
        },
        () => {},
      );
    } catch (err) {
      console.error("Camera error:", err);
      toast.error("Cannot access camera. Check permissions.");
      setOpen(false);
    }
  }, [id, onScan, stop]);

  useEffect(() => () => { stop(); }, [stop]);

  const submit = () => {
    const v = query.trim();
    if (v) onScan(v);
  };

  return (
    <div className="space-y-3">
      {open && (
        <div className="rounded-2xl border border-border/50 bg-card p-4 shadow-sm animate-fade-in">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm font-semibold">Camera active</p>
            <Button variant="ghost" size="sm" onClick={stop} className="rounded-xl">
              <X className="h-4 w-4" />
            </Button>
          </div>
          <div id={id} className="overflow-hidden rounded-xl" />
        </div>
      )}
      {!open && (
        <Button onClick={start} variant="outline" className="w-full gap-2 rounded-xl h-11">
          <Camera className="h-4 w-4" /> Open camera
        </Button>
      )}
      <div className="flex gap-2">
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={placeholder}
          className="font-mono rounded-xl h-11"
          onKeyDown={(e) => e.key === "Enter" && submit()}
        />
        <Button onClick={submit} className="gap-2 rounded-xl h-11 px-5">
          <Search className="h-4 w-4" /> {buttonLabel}
        </Button>
      </div>
    </div>
  );
}
