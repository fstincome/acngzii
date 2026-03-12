import { useState, useEffect, useRef, useCallback } from "react";
import { usePrograms, useProgramSessions, useProgramParticipants, useSessionAttendance, useMarkPresent, useProgramAttendanceRealtime, PARTICIPANT_ROLES } from "@/lib/program-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScanLine, Search, CheckCircle2, Clock, XCircle, Camera, X } from "lucide-react";
import { toast } from "sonner";
import { format, isToday } from "date-fns";
import { fr } from "date-fns/locale";

export default function ProgramAttendance() {
  useProgramAttendanceRealtime();

  const { data: programs = [] } = usePrograms();
  const [selectedProgramId, setSelectedProgramId] = useState<string>("");
  const [selectedSessionId, setSelectedSessionId] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [scanCode, setScanCode] = useState("");
  const [cameraActive, setCameraActive] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const scanIntervalRef = useRef<number | null>(null);

  const { data: sessions = [] } = useProgramSessions(selectedProgramId || undefined);
  const { data: participants = [] } = useProgramParticipants(selectedProgramId || undefined);
  const { data: attendance = [] } = useSessionAttendance(selectedSessionId || undefined);
  const markPresent = useMarkPresent();

  // Auto-select today's session
  useEffect(() => {
    if (sessions.length > 0 && !selectedSessionId) {
      const todaySession = sessions.find(s => isToday(new Date(s.session_date)));
      if (todaySession) setSelectedSessionId(todaySession.id);
      else setSelectedSessionId(sessions[0].id);
    }
  }, [sessions, selectedSessionId]);

  const getAttendanceForParticipant = (participantId: string) => {
    return attendance.find(a => a.participant_id === participantId);
  };

  const presentList = participants.filter(p => getAttendanceForParticipant(p.id)?.status === "present");
  const waitingList = participants.filter(p => getAttendanceForParticipant(p.id)?.status === "en_attente");
  const absentList = participants.filter(p => getAttendanceForParticipant(p.id)?.status === "absent");

  const filteredParticipants = (list: typeof participants) => {
    if (!searchQuery.trim()) return list;
    const q = searchQuery.toLowerCase();
    return list.filter(p => p.full_name.toLowerCase().includes(q) || p.participant_code.toLowerCase().includes(q));
  };

  const handleScan = useCallback(async (code: string) => {
    const participant = participants.find(p => p.participant_code === code);
    if (!participant) {
      toast.error("Participant non trouvé dans ce programme");
      return;
    }
    const att = getAttendanceForParticipant(participant.id);
    if (!att) {
      toast.error("Pas de présence initialisée pour cette session");
      return;
    }
    if (att.status === "present") {
      toast.info(`${participant.full_name} est déjà pointé(e) !`);
      return;
    }
    if (att.status === "absent") {
      toast.warning(`${participant.full_name} est marqué(e) absent(e)`);
      return;
    }
    try {
      await markPresent.mutateAsync({ attendanceId: att.id });
      toast.success(`${participant.full_name} — Présent(e) ✓`);
    } catch {
      toast.error("Erreur lors du pointage");
    }
  }, [participants, attendance, markPresent]);

  const handleManualScan = () => {
    if (scanCode.trim()) {
      handleScan(scanCode.trim().toUpperCase());
      setScanCode("");
    }
  };

  // Camera - getUserMedia called directly in click handler
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" }
      });
      streamRef.current = stream;
      setCameraActive(true);

      // Wait for next render to attach stream to video
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play();
          startQRScanning();
        }
      }, 100);
    } catch {
      toast.error("Impossible d'accéder à la caméra. Vérifiez les permissions.");
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
          handleScan(qrCode.data);
          stopCamera();
        }
      }, 300);
      scanIntervalRef.current = interval;
    });
  };

  const stopCamera = useCallback(() => {
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Présence Programme</h1>
        <p className="page-subtitle">Pointez les participants pour chaque session</p>
      </div>

      {/* Program & Session selection */}
      <div className="grid gap-3 sm:grid-cols-2 mb-6">
        <Select value={selectedProgramId} onValueChange={v => { setSelectedProgramId(v); setSelectedSessionId(""); }}>
          <SelectTrigger><SelectValue placeholder="Sélectionner un programme" /></SelectTrigger>
          <SelectContent>
            {programs.map(p => (
              <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={selectedSessionId} onValueChange={setSelectedSessionId} disabled={!selectedProgramId}>
          <SelectTrigger><SelectValue placeholder="Sélectionner une session" /></SelectTrigger>
          <SelectContent>
            {sessions.map(s => (
              <SelectItem key={s.id} value={s.id}>
                {format(new Date(s.session_date), "EEEE dd MMMM yyyy", { locale: fr })}
                {isToday(new Date(s.session_date)) && " (Aujourd'hui)"}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {!selectedSessionId ? (
        <Card className="p-8 text-center text-muted-foreground">
          Sélectionnez un programme et une session pour commencer le pointage.
        </Card>
      ) : (
        <div className="space-y-6">
          {/* Scanner */}
          <Card className="p-4 space-y-3">
            <div className="flex items-center gap-2">
              <ScanLine className="h-5 w-5 text-primary" />
              <h3 className="font-semibold text-foreground">Scanner le QR code</h3>
            </div>

            {cameraActive && (
              <div className="relative">
                <video
                  ref={videoRef}
                  className="w-full rounded-xl"
                  playsInline
                  muted
                />
                <canvas ref={canvasRef} className="hidden" />
                <Button size="icon" variant="destructive" className="absolute top-2 right-2 rounded-full" onClick={stopCamera}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            )}

            <div className="flex gap-2">
              <Button variant="outline" className="gap-2" onClick={cameraActive ? stopCamera : startCamera}>
                <Camera className="h-4 w-4" />
                {cameraActive ? "Fermer caméra" : "Ouvrir caméra"}
              </Button>
              <Input
                placeholder="Entrer le code participant..."
                value={scanCode}
                onChange={e => setScanCode(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleManualScan()}
                className="flex-1"
              />
              <Button onClick={handleManualScan}><Search className="h-4 w-4" /></Button>
            </div>
          </Card>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3">
            <Card className="p-4 text-center">
              <div className="flex items-center justify-center gap-1.5 text-success mb-1">
                <CheckCircle2 className="h-4 w-4" />
                <span className="text-lg font-bold">{presentList.length}</span>
              </div>
              <p className="text-xs text-muted-foreground">Présents</p>
            </Card>
            <Card className="p-4 text-center">
              <div className="flex items-center justify-center gap-1.5 text-warning mb-1">
                <Clock className="h-4 w-4" />
                <span className="text-lg font-bold">{waitingList.length}</span>
              </div>
              <p className="text-xs text-muted-foreground">En attente</p>
            </Card>
            <Card className="p-4 text-center">
              <div className="flex items-center justify-center gap-1.5 text-destructive mb-1">
                <XCircle className="h-4 w-4" />
                <span className="text-lg font-bold">{absentList.length}</span>
              </div>
              <p className="text-xs text-muted-foreground">Absents</p>
            </Card>
          </div>

          {/* Search */}
          <Input
            placeholder="Rechercher un participant..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="max-w-sm"
          />

          {/* Tabs */}
          <Tabs defaultValue="waiting">
            <TabsList>
              <TabsTrigger value="waiting" className="gap-1.5">
                <Clock className="h-3.5 w-3.5" /> En attente ({waitingList.length})
              </TabsTrigger>
              <TabsTrigger value="present" className="gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5" /> Présents ({presentList.length})
              </TabsTrigger>
              <TabsTrigger value="absent" className="gap-1.5">
                <XCircle className="h-3.5 w-3.5" /> Absents ({absentList.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="waiting" className="space-y-2 mt-3">
              {filteredParticipants(waitingList).length === 0 ? (
                <p className="text-sm text-muted-foreground p-4">Aucun participant en attente</p>
              ) : (
                filteredParticipants(waitingList).map(p => (
                  <ParticipantRow key={p.id} participant={p} status="en_attente" onMark={() => {
                    const att = getAttendanceForParticipant(p.id);
                    if (att) markPresent.mutateAsync({ attendanceId: att.id }).then(() => toast.success(`${p.full_name} — Présent(e) ✓`));
                  }} />
                ))
              )}
            </TabsContent>

            <TabsContent value="present" className="space-y-2 mt-3">
              {filteredParticipants(presentList).length === 0 ? (
                <p className="text-sm text-muted-foreground p-4">Aucun participant présent</p>
              ) : (
                filteredParticipants(presentList).map(p => (
                  <ParticipantRow key={p.id} participant={p} status="present" />
                ))
              )}
            </TabsContent>

            <TabsContent value="absent" className="space-y-2 mt-3">
              {filteredParticipants(absentList).length === 0 ? (
                <p className="text-sm text-muted-foreground p-4">Aucun participant absent</p>
              ) : (
                filteredParticipants(absentList).map(p => (
                  <ParticipantRow key={p.id} participant={p} status="absent" />
                ))
              )}
            </TabsContent>
          </Tabs>
        </div>
      )}
    </div>
  );
}

function ParticipantRow({ participant, status, onMark }: {
  participant: { id: string; full_name: string; participant_code: string; role: string; photo: string | null; institution?: string | null };
  status: string;
  onMark?: () => void;
}) {
  return (
    <Card className="flex items-center gap-3 p-3">
      {participant.photo ? (
        <img src={participant.photo} alt="" className="h-9 w-9 rounded-full object-cover" />
      ) : (
        <div className="h-9 w-9 rounded-full bg-muted flex items-center justify-center text-xs font-semibold text-muted-foreground">
          {participant.full_name.charAt(0)}
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground truncate">{participant.full_name}</p>
        <p className="text-xs text-muted-foreground font-mono">{participant.participant_code}</p>
        {participant.institution && <p className="text-xs text-muted-foreground">{participant.institution}</p>}
      </div>
      <Badge variant="secondary" className="text-xs">
        {PARTICIPANT_ROLES[participant.role as keyof typeof PARTICIPANT_ROLES] || participant.role}
      </Badge>
      {status === "en_attente" && onMark && (
        <Button size="sm" className="gap-1.5 rounded-lg" onClick={onMark}>
          <CheckCircle2 className="h-3.5 w-3.5" /> Pointer
        </Button>
      )}
      {status === "present" && (
        <Badge className="bg-success/10 text-success border-success/20">Présent</Badge>
      )}
      {status === "absent" && (
        <Badge variant="destructive">Absent</Badge>
      )}
    </Card>
  );
}
