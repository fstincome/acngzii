import { useState, useEffect, useRef, useCallback } from "react";
import { usePrograms, useProgramSessions, useProgramParticipants, useSessionAttendance, useMarkPresent, useProgramAttendanceRealtime, PARTICIPANT_ROLES } from "@/lib/program-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScanLine, Search, CheckCircle2, Clock, XCircle, Camera, X, Building, Fingerprint, MapPin } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { RoomType, ROOM_LABELS, DEFAULT_DURATION_HOURS } from "@/lib/supabase-store";
import { format, isToday } from "date-fns";
import { fr } from "date-fns/locale";

export default function ProgramAttendance() {
  useProgramAttendanceRealtime();

  const { data: programs = [] } = usePrograms();
  const [selectedProgramId, setSelectedProgramId] = useState<string>("");
  const [selectedSessionId, setSelectedSessionId] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [scanCode, setScanCode] = useState("");
  const [selectedRoom, setSelectedRoom] = useState<RoomType>("computer_lab");
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
  const absentList = participants.filter(p => getAttendanceForParticipant(p.id)?.status === "absent");
  // Participants with "en_attente" status OR no attendance record at all appear in waiting list
  const waitingList = participants.filter(p => {
    const att = getAttendanceForParticipant(p.id);
    return !att || att.status === "en_attente";
  });

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
    const roomLabel = ROOM_LABELS[selectedRoom];
    if (!att) {
      if (!selectedSessionId) return;
      try {
        const { error } = await supabase
          .from("program_attendance")
          .insert({ participant_id: participant.id, session_id: selectedSessionId, status: "present", marked_at: new Date().toISOString(), room: selectedRoom });
        if (error) throw error;
        toast.success(`${participant.full_name} — Présent(e) ✓ (${roomLabel})`);
      } catch {
        toast.error("Erreur lors du pointage");
      }
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
      const { error } = await supabase
        .from("program_attendance")
        .update({ status: "present", marked_at: new Date().toISOString(), room: selectedRoom })
        .eq("id", att.id);
      if (error) throw error;
      toast.success(`${participant.full_name} — Présent(e) ✓ (${roomLabel})`);
    } catch {
      toast.error("Erreur lors du pointage");
    }
  }, [participants, attendance, selectedSessionId, selectedRoom]);

  const handleManualScan = () => {
    if (scanCode.trim()) {
      handleScan(scanCode.trim().toUpperCase());
      setScanCode("");
    }
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" }
      });
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

  useEffect(() => {
    return () => { stopCamera(); };
  }, [stopCamera]);

  const selectedProgram = programs.find(p => p.id === selectedProgramId);
  const selectedSession = sessions.find(s => s.id === selectedSessionId);

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title flex items-center gap-2.5">
          <div className="icon-box h-9 w-9">
            <Fingerprint className="h-4.5 w-4.5 text-primary-foreground" />
          </div>
          Présence Programme
        </h1>
        <p className="page-subtitle">Pointez les participants pour chaque session</p>
      </div>

      {/* Program & Session selection */}
      <div className="grid gap-3 sm:grid-cols-2 mb-6">
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">Programme</label>
          <Select value={selectedProgramId} onValueChange={v => { setSelectedProgramId(v); setSelectedSessionId(""); }}>
            <SelectTrigger className="h-11"><SelectValue placeholder="Sélectionner un programme" /></SelectTrigger>
            <SelectContent>
              {programs.map(p => (
                <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">Session</label>
          <Select value={selectedSessionId} onValueChange={setSelectedSessionId} disabled={!selectedProgramId}>
            <SelectTrigger className="h-11"><SelectValue placeholder="Sélectionner une session" /></SelectTrigger>
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
      </div>

      {!selectedSessionId ? (
        <Card className="p-12 text-center border-dashed border-2">
          <div className="icon-box h-14 w-14 mx-auto mb-4">
            <ScanLine className="h-6 w-6 text-primary-foreground" />
          </div>
          <h3 className="font-semibold text-foreground mb-1">Prêt pour le pointage</h3>
          <p className="text-sm text-muted-foreground">Sélectionnez un programme et une session pour commencer.</p>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* Session info banner */}
          {selectedProgram && selectedSession && (
            <div className="rounded-xl p-4 text-primary-foreground" style={{ background: "var(--gradient-primary)" }}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-lg">{selectedProgram.name}</p>
                  <p className="text-sm opacity-90 capitalize">
                    {format(new Date(selectedSession.session_date), "EEEE dd MMMM yyyy", { locale: fr })}
                    {isToday(new Date(selectedSession.session_date)) && (
                      <Badge className="ml-2 bg-white/20 text-white border-white/30 text-xs">Aujourd'hui</Badge>
                    )}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-3xl font-bold">{presentList.length}<span className="text-lg opacity-70">/{participants.length}</span></p>
                  <p className="text-xs opacity-80">présents</p>
                </div>
              </div>
            </div>
          )}

          {/* Scanner */}
          <Card className="p-5 space-y-4 border-primary/20">
            <div className="flex items-center gap-2">
              <div className="icon-box h-8 w-8">
                <ScanLine className="h-4 w-4 text-primary-foreground" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground text-sm">Scanner le QR code</h3>
                <p className="text-xs text-muted-foreground">Scannez ou entrez le code participant</p>
              </div>
            </div>

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

            <div className="flex gap-2">
              <Button
                variant={cameraActive ? "destructive" : "outline"}
                className="gap-2 rounded-xl"
                onClick={cameraActive ? stopCamera : startCamera}
              >
                <Camera className="h-4 w-4" />
                {cameraActive ? "Fermer" : "Caméra"}
              </Button>
              <div className="flex-1 relative">
                <Input
                  placeholder="Entrer le code participant..."
                  value={scanCode}
                  onChange={e => setScanCode(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && handleManualScan()}
                  className="pr-10 h-10"
                />
                <Button size="icon" variant="ghost" className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8" onClick={handleManualScan}>
                  <Search className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Room selector */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5" /> Placer en salle
              </label>
              <Select value={selectedRoom} onValueChange={v => setSelectedRoom(v as RoomType)}>
                <SelectTrigger className="h-10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="computer_lab">🖥️ Salle Informatique</SelectItem>
                  <SelectItem value="multipurpose_room">🏠 Salle Polyvalente</SelectItem>
                  <SelectItem value="garden">🌿 Jardin</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </Card>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3">
            <Card className="p-4 text-center border-l-4 border-l-success">
              <div className="flex items-center justify-center gap-1.5 mb-1">
                <CheckCircle2 className="h-5 w-5 text-success" />
                <span className="text-2xl font-bold text-foreground">{presentList.length}</span>
              </div>
              <p className="text-xs text-muted-foreground font-medium">Présents</p>
            </Card>
            <Card className="p-4 text-center border-l-4 border-l-warning">
              <div className="flex items-center justify-center gap-1.5 mb-1">
                <Clock className="h-5 w-5 text-warning" />
                <span className="text-2xl font-bold text-foreground">{waitingList.length}</span>
              </div>
              <p className="text-xs text-muted-foreground font-medium">En attente</p>
            </Card>
            <Card className="p-4 text-center border-l-4 border-l-destructive">
              <div className="flex items-center justify-center gap-1.5 mb-1">
                <XCircle className="h-5 w-5 text-destructive" />
                <span className="text-2xl font-bold text-foreground">{absentList.length}</span>
              </div>
              <p className="text-xs text-muted-foreground font-medium">Absents</p>
            </Card>
          </div>

          {/* Search */}
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher un participant..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Tabs */}
          <Tabs defaultValue="waiting">
            <TabsList className="bg-muted/60 p-1 rounded-xl">
              <TabsTrigger value="waiting" className="gap-1.5 rounded-lg data-[state=active]:shadow-sm">
                <Clock className="h-3.5 w-3.5" /> En attente ({waitingList.length})
              </TabsTrigger>
              <TabsTrigger value="present" className="gap-1.5 rounded-lg data-[state=active]:shadow-sm">
                <CheckCircle2 className="h-3.5 w-3.5" /> Présents ({presentList.length})
              </TabsTrigger>
              <TabsTrigger value="absent" className="gap-1.5 rounded-lg data-[state=active]:shadow-sm">
                <XCircle className="h-3.5 w-3.5" /> Absents ({absentList.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="waiting" className="space-y-2 mt-4">
              {filteredParticipants(waitingList).length === 0 ? (
                <p className="text-sm text-muted-foreground p-6 text-center">Aucun participant en attente</p>
              ) : (
                 filteredParticipants(waitingList).map(p => (
                  <ParticipantRow key={p.id} participant={p} status="en_attente" onMark={async () => {
                    const att = getAttendanceForParticipant(p.id);
                    const roomLabel = ROOM_LABELS[selectedRoom];
                    if (att) {
                      const { error } = await supabase
                        .from("program_attendance")
                        .update({ status: "present", marked_at: new Date().toISOString(), room: selectedRoom })
                        .eq("id", att.id);
                      if (!error) toast.success(`${p.full_name} — Présent(e) ✓ (${roomLabel})`);
                      else toast.error("Erreur lors du pointage");
                    } else if (selectedSessionId) {
                      const { error } = await supabase
                        .from("program_attendance")
                        .insert({ participant_id: p.id, session_id: selectedSessionId, status: "present", marked_at: new Date().toISOString(), room: selectedRoom });
                      if (!error) toast.success(`${p.full_name} — Présent(e) ✓ (${roomLabel})`);
                      else toast.error("Erreur lors du pointage");
                    }
                  }} />
                ))
              )}
            </TabsContent>

            <TabsContent value="present" className="space-y-2 mt-4">
              {filteredParticipants(presentList).length === 0 ? (
                <p className="text-sm text-muted-foreground p-6 text-center">Aucun participant présent</p>
              ) : (
                filteredParticipants(presentList).map(p => (
                  <ParticipantRow key={p.id} participant={p} status="present" />
                ))
              )}
            </TabsContent>

            <TabsContent value="absent" className="space-y-2 mt-4">
              {filteredParticipants(absentList).length === 0 ? (
                <p className="text-sm text-muted-foreground p-6 text-center">Aucun participant absent</p>
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
    <Card className="flex items-center gap-3 p-3.5 transition-all hover:shadow-md group">
      {participant.photo ? (
        <img src={participant.photo} alt="" className="h-10 w-10 rounded-full object-cover ring-2 ring-border" />
      ) : (
        <div className={`h-10 w-10 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${
          participant.role === "mentor"
            ? "bg-primary/10 text-primary ring-2 ring-primary/20"
            : "bg-muted text-muted-foreground ring-2 ring-border"
        }`}>
          {participant.full_name.charAt(0)}
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground truncate">{participant.full_name}</p>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-xs text-muted-foreground font-mono">{participant.participant_code}</span>
          {participant.institution && (
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Building className="h-3 w-3" /> {participant.institution}
            </span>
          )}
        </div>
      </div>
      <Badge variant="secondary" className="text-xs shrink-0">
        {participant.role === "mentor" ? "⭐ " : "🎓 "}
        {PARTICIPANT_ROLES[participant.role as keyof typeof PARTICIPANT_ROLES] || participant.role}
      </Badge>
      {status === "en_attente" && onMark && (
        <Button size="sm" className="gap-1.5 rounded-xl shadow-sm shrink-0" onClick={onMark} style={{ background: "var(--gradient-primary)" }}>
          <CheckCircle2 className="h-3.5 w-3.5" /> Pointer
        </Button>
      )}
      {status === "present" && (
        <Badge className="bg-success/10 text-success border-success/20 shrink-0">✓ Présent</Badge>
      )}
      {status === "absent" && (
        <Badge variant="destructive" className="shrink-0">✗ Absent</Badge>
      )}
    </Card>
  );
}
