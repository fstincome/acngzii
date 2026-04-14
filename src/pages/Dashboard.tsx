import { useState, useEffect, useMemo } from "react";
import { Users, UserPlus, Monitor, DoorOpen, TrendingUp, Clock, Phone, Mail, MapPin, Briefcase, TreePine, Download, Loader2, GraduationCap, ClipboardCheck } from "lucide-react";
import { useVisitors, useVisits, computeOccupancy, COMPUTER_LAB_CAPACITY, useVisitsRealtime, ROOM_LABELS } from "@/lib/supabase-store";
import type { Visitor, Visit, RoomType } from "@/lib/supabase-store";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
} from "recharts";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";

export default function Dashboard() {
  const { role } = useAuth();
  const { toast } = useToast();
  const [backingUp, setBackingUp] = useState(false);
  useVisitsRealtime();
  const { data: visitors = [] } = useVisitors();
  const { data: visits = [] } = useVisits();
  const [selectedVisitor, setSelectedVisitor] = useState<Visitor | null>(null);

  // Program attendance for today
  const today = new Date().toISOString().split("T")[0];

  const { data: todaySessions = [] } = useQuery({
    queryKey: ["dashboard_program_sessions_today", today],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("program_sessions")
        .select("id")
        .eq("session_date", today);
      if (error) throw error;
      return (data ?? []) as { id: string }[];
    },
  });

  const todaySessionIds = useMemo(() => todaySessions.map(s => s.id), [todaySessions]);

  const { data: todayProgramAttendance = [] } = useQuery({
    queryKey: ["dashboard_program_attendance_today", todaySessionIds],
    queryFn: async () => {
      if (todaySessionIds.length === 0) return [];
      const { data, error } = await supabase
        .from("program_attendance")
        .select("id, status, room, participant_id")
        .in("session_id", todaySessionIds);
      if (error) throw error;
      return (data ?? []) as { id: string; status: string; room: string | null; participant_id: string }[];
    },
    enabled: todaySessionIds.length > 0,
  });

  // Fetch participant names for present program attendees
  const presentAttendeeIds = useMemo(() => 
    todayProgramAttendance.filter(a => a.status === "present").map(a => a.participant_id),
    [todayProgramAttendance]
  );

  const { data: programParticipants = [] } = useQuery({
    queryKey: ["dashboard_program_participants", presentAttendeeIds],
    queryFn: async () => {
      if (presentAttendeeIds.length === 0) return [];
      const { data, error } = await supabase
        .from("program_participants")
        .select("id, full_name")
        .in("id", presentAttendeeIds);
      if (error) throw error;
      return (data ?? []) as { id: string; full_name: string }[];
    },
    enabled: presentAttendeeIds.length > 0,
  });

  const participantNameMap = useMemo(() => {
    const map: Record<string, string> = {};
    programParticipants.forEach(p => { map[p.id] = p.full_name; });
    return map;
  }, [programParticipants]);

  const programPresentToday = todayProgramAttendance.filter(a => a.status === "present").length;
  const programTotalToday = todayProgramAttendance.length;

  // Program room breakdown today
  const programPresentByRoom = useMemo(() => {
    const present = todayProgramAttendance.filter(a => a.status === "present");
    return {
      computer_lab: present.filter(a => a.room === "computer_lab"),
      multipurpose_room: present.filter(a => a.room === "multipurpose_room"),
      garden: present.filter(a => a.room === "garden"),
    };
  }, [todayProgramAttendance]);

  const labOccupancy = computeOccupancy(visits, "computer_lab");
  const multiOccupancy = computeOccupancy(visits, "multipurpose_room");
  const gardenOccupancy = computeOccupancy(visits, "garden");

  const todayVisits = visits.filter((v) => v.timestamp.startsWith(today));
  const todayCheckIns = todayVisits.filter((v) => v.action === "check_in");
  const uniqueTodayIds = [...new Set(todayCheckIns.map((v) => v.visitor_id))];

  // Merge program present into room counts
  const labCount = labOccupancy.size + programPresentByRoom.computer_lab.length;
  const multiCount = multiOccupancy.size + programPresentByRoom.multipurpose_room.length;
  const gardenCount = gardenOccupancy.size + programPresentByRoom.garden.length;
  const uniqueToday = uniqueTodayIds.length + programPresentToday;
  const labFull = labCount >= COMPUTER_LAB_CAPACITY;
  const labPercent = Math.min((labCount / COMPUTER_LAB_CAPACITY) * 100, 100);

  const getVisitor = (vid: string) => visitors.find((v) => v.visitor_id === vid);

  const hourlyData = Array.from({ length: 12 }, (_, i) => {
    const hour = i + 7;
    const count = todayCheckIns.filter((v) => new Date(v.timestamp).getHours() === hour).length;
    return { hour: `${hour}h`, visites: count };
  });

  const todayVisitorsList = uniqueTodayIds.map((vid) => {
    const visitor = getVisitor(vid);
    const lastCheckIn = todayCheckIns
      .filter((v) => v.visitor_id === vid)
      .sort((a, b) => b.timestamp.localeCompare(a.timestamp))[0];
    const room = lastCheckIn?.room as RoomType;
    return {
      visitor_id: vid,
      name: visitor?.full_name || vid,
      visitor,
      time: lastCheckIn ? new Date(lastCheckIn.timestamp).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }) : "",
      room,
      isInLab: labOccupancy.has(vid),
      isInMulti: multiOccupancy.has(vid),
      isInGarden: gardenOccupancy.has(vid),
    };
  }).sort((a, b) => {
    const aIn = a.isInLab || a.isInMulti || a.isInGarden ? 1 : 0;
    const bIn = b.isInLab || b.isInMulti || b.isInGarden ? 1 : 0;
    if (bIn !== aIn) return bIn - aIn;
    return b.time.localeCompare(a.time);
  });

  const handleBackup = async () => {
    setBackingUp(true);
    try {
      const res = await supabase.functions.invoke("backup-database");
      if (res.error) throw res.error;
      if (res.data?.error) throw new Error(res.data.error);
      const blob = new Blob([JSON.stringify(res.data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `backup-${new Date().toISOString().split("T")[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast({ title: "Backup téléchargé", description: "Le fichier de sauvegarde a été téléchargé avec succès." });
    } catch (err: any) {
      toast({ title: "Erreur", description: err.message, variant: "destructive" });
    }
    setBackingUp(false);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="page-header flex items-center justify-between">
        <div>
          <h1 className="page-title">Tableau de bord</h1>
          <p className="page-subtitle">Données du jour — {new Date().toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</p>
        </div>
        {role === "admin" && (
          <Button variant="outline" onClick={handleBackup} disabled={backingUp}>
            {backingUp ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Download className="h-4 w-4 mr-2" />}
            Backup
          </Button>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <StatCard icon={Monitor} label="Salle Informatique" value={`${labCount} / ${COMPUTER_LAB_CAPACITY}`} alert={labFull} color="primary" />
        <StatCard icon={DoorOpen} label="Salle Polyvalente" value={multiCount} color="accent" />
        <StatCard icon={TreePine} label="Jardin" value={gardenCount} color="garden" />
        <StatCard icon={UserPlus} label="Visiteurs aujourd'hui" value={uniqueToday} color="primary" />
        <StatCard icon={Users} label="Membres inscrits" value={visitors.length} color="accent" />
      </div>

      {/* Program attendance today */}
      {programTotalToday > 0 && (
        <div className="stat-card">
          <div className="mb-3 flex items-center gap-2">
            <GraduationCap className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-semibold text-foreground">Présence Programme — aujourd'hui</h3>
            <span className="ml-auto rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
              {programPresentToday} / {programTotalToday} présents
            </span>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="flex items-center gap-2 rounded-xl bg-primary/5 px-3 py-2">
              <Monitor className="h-4 w-4 text-primary" />
              <span className="text-xs text-muted-foreground">Salle Info</span>
              <span className="ml-auto text-sm font-bold text-foreground">{programLabToday}</span>
            </div>
            <div className="flex items-center gap-2 rounded-xl bg-accent/5 px-3 py-2">
              <DoorOpen className="h-4 w-4 text-accent" />
              <span className="text-xs text-muted-foreground">Salle Poly</span>
              <span className="ml-auto text-sm font-bold text-foreground">{programMultiToday}</span>
            </div>
            <div className="flex items-center gap-2 rounded-xl bg-green-500/5 px-3 py-2">
              <TreePine className="h-4 w-4 text-green-600" />
              <span className="text-xs text-muted-foreground">Jardin</span>
              <span className="ml-auto text-sm font-bold text-foreground">{programGardenToday}</span>
            </div>
          </div>
        </div>
      )}

      {labFull && (
        <div className="flex items-center gap-3 rounded-2xl border border-destructive/20 bg-destructive/5 p-4 animate-fade-in">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-destructive/10">
            <TrendingUp className="h-5 w-5 text-destructive" />
          </div>
          <div>
            <p className="text-sm font-semibold text-destructive">Salle Informatique pleine</p>
            <p className="text-xs text-destructive/70">Capacité de {COMPUTER_LAB_CAPACITY} atteinte.</p>
          </div>
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-3">
        <OccupancyPanel
          icon={Monitor}
          title="Salle Informatique"
          room="computer_lab"
          occupancy={labOccupancy}
          visits={visits}
          getVisitor={getVisitor}
          onSelect={setSelectedVisitor}
          color="primary"
          capacity={COMPUTER_LAB_CAPACITY}
          labPercent={labPercent}
          labCount={labCount}
        />
        <OccupancyPanel
          icon={DoorOpen}
          title="Salle Polyvalente"
          room="multipurpose_room"
          occupancy={multiOccupancy}
          visits={visits}
          getVisitor={getVisitor}
          onSelect={setSelectedVisitor}
          color="accent"
        />
        <OccupancyPanel
          icon={TreePine}
          title="Jardin"
          room="garden"
          occupancy={gardenOccupancy}
          visits={visits}
          getVisitor={getVisitor}
          onSelect={setSelectedVisitor}
          color="garden"
        />
      </div>

      {/* Today's visitors */}
      <div className="stat-card">
        <div className="mb-4 flex items-center gap-2">
          <Clock className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold text-foreground">Visiteurs d'aujourd'hui</h3>
          <span className="ml-auto rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">{uniqueToday}</span>
        </div>
        {todayVisitorsList.length > 0 ? (
          <div className="space-y-1 max-h-64 overflow-y-auto">
            {todayVisitorsList.map((entry) => {
              const isPresent = entry.isInLab || entry.isInMulti || entry.isInGarden;
              return (
                <button
                  key={entry.visitor_id}
                  onClick={() => entry.visitor && setSelectedVisitor(entry.visitor)}
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition-colors hover:bg-muted/50"
                >
                  <div className={`h-2 w-2 rounded-full shrink-0 ${isPresent ? "bg-green-500 animate-pulse" : "bg-muted-foreground/30"}`} />
                  <span className="font-medium text-foreground truncate flex-1">{entry.name}</span>
                  <span className="text-xs text-muted-foreground shrink-0">
                    {ROOM_LABELS[entry.room] || entry.room} · {entry.time}
                  </span>
                  {isPresent && (
                    <span className="rounded-full bg-green-500/10 px-2 py-0.5 text-[10px] font-medium text-green-600 shrink-0">Présent</span>
                  )}
                </button>
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground italic">Aucun visiteur aujourd'hui</p>
        )}
      </div>

      {/* Hourly chart */}
      <div className="stat-card">
        <div className="mb-5 flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold text-foreground">Fréquentation horaire — aujourd'hui</h3>
        </div>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={hourlyData}>
            <XAxis dataKey="hour" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11 }} allowDecimals={false} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={{ borderRadius: "12px", border: "none", boxShadow: "0 10px 25px -5px rgb(0 0 0 / 0.1)" }} />
            <Bar dataKey="visites" fill="hsl(234, 85%, 60%)" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Visitor detail dialog */}
      <Dialog open={!!selectedVisitor} onOpenChange={(open) => !open && setSelectedVisitor(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg">{selectedVisitor?.full_name}</DialogTitle>
          </DialogHeader>
          {selectedVisitor && (
            <div className="space-y-4 pt-2">
              <div className="flex items-center gap-2 rounded-xl bg-primary/5 px-3 py-2">
                <span className="text-xs font-semibold text-primary">ID:</span>
                <span className="text-sm font-mono text-foreground">{selectedVisitor.visitor_id}</span>
              </div>
              <div className="grid gap-3">
                <DetailRow icon={Phone} label="Téléphone" value={selectedVisitor.phone} />
                {selectedVisitor.email && <DetailRow icon={Mail} label="Email" value={selectedVisitor.email} />}
                <DetailRow icon={MapPin} label="Quartier" value={selectedVisitor.neighborhood} />
                <DetailRow icon={Briefcase} label="Occupation" value={selectedVisitor.occupation} />
                <DetailRow icon={Users} label="Genre" value={selectedVisitor.gender === "male" ? "Homme" : selectedVisitor.gender === "female" ? "Femme" : "Autre"} />
                {selectedVisitor.date_of_birth && (
                  <DetailRow icon={Clock} label="Date de naissance" value={selectedVisitor.date_of_birth} />
                )}
              </div>
              <p className="text-xs text-muted-foreground">Inscrit le {selectedVisitor.registration_date}</p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function formatTimeRemaining(ms: number): string {
  if (ms <= 0) return "Expiré";
  const totalMin = Math.floor(ms / 60000);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h > 0) return `${h}h${m.toString().padStart(2, "0")}`;
  return `${m}min`;
}

function getTimeRemainingColor(ms: number): string {
  if (ms <= 0) return "text-destructive";
  if (ms <= 30 * 60000) return "text-orange-500"; // < 30 min
  if (ms <= 60 * 60000) return "text-yellow-600"; // < 1h
  return "text-muted-foreground";
}

function OccupancyPanel({
  icon: Icon, title, room, occupancy, visits, getVisitor, onSelect, color, capacity, labPercent, labCount
}: {
  icon: React.ElementType; title: string; room: string; occupancy: Set<string>;
  visits: Visit[];
  getVisitor: (vid: string) => Visitor | undefined;
  onSelect: (v: Visitor) => void; color: string;
  capacity?: number; labPercent?: number; labCount?: number;
}) {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    if (occupancy.size === 0) return;
    const interval = setInterval(() => setNow(Date.now()), 30000); // update every 30s
    return () => clearInterval(interval);
  }, [occupancy.size]);

  const colorClass = color === "accent" ? "text-accent" : color === "garden" ? "text-green-600" : "text-primary";
  const bgClass = color === "accent" ? "bg-accent/5" : color === "garden" ? "bg-green-500/5" : "bg-primary/5";
  const dotClass = color === "accent" ? "bg-accent" : color === "garden" ? "bg-green-500" : "bg-primary";

  // Find the latest check_in for each visitor in this room to get expected_checkout
  const getExpectedCheckout = (vid: string): string | null => {
    const roomVisits = visits
      .filter((v) => v.visitor_id === vid && v.room === room && v.action === "check_in")
      .sort((a, b) => b.timestamp.localeCompare(a.timestamp));
    return roomVisits[0]?.expected_checkout ?? null;
  };

  return (
    <div className="stat-card">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon className={`h-4 w-4 ${colorClass}`} />
          <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        </div>
        {capacity && (
          <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
            {labPercent?.toFixed(0)}%
          </span>
        )}
      </div>
      {capacity && labCount !== undefined && labPercent !== undefined && (
        <>
          <div className="mb-3 h-2.5 w-full overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full transition-all duration-500" style={{ width: `${labPercent}%`, background: "var(--gradient-primary)" }} />
          </div>
          <p className="text-xs text-muted-foreground mb-3">{labCount} sur {capacity} places occupées</p>
        </>
      )}
      {!capacity && (
        <div className="flex items-baseline gap-2 mb-3">
          <span className="text-4xl font-bold gradient-text">{occupancy.size}</span>
          <span className="text-sm text-muted-foreground">visiteurs</span>
        </div>
      )}
      {occupancy.size > 0 ? (
        <div className="space-y-1.5 max-h-48 overflow-y-auto">
          {Array.from(occupancy).map((vid) => {
            const v = getVisitor(vid);
            const expectedCheckout = getExpectedCheckout(vid);
            const remainingMs = expectedCheckout ? new Date(expectedCheckout).getTime() - now : null;

            return (
              <button
                key={vid}
                onClick={() => v && onSelect(v)}
                className={`flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm transition-colors hover:${bgClass}`}
              >
                <div className={`h-2 w-2 rounded-full ${dotClass} animate-pulse shrink-0`} />
                <span className="font-medium text-foreground truncate flex-1">{v?.full_name || vid}</span>
                {remainingMs !== null && (
                  <span className={`flex items-center gap-1 text-[10px] font-semibold shrink-0 ${getTimeRemainingColor(remainingMs)}`}>
                    <Clock className="h-3 w-3" />
                    {formatTimeRemaining(remainingMs)}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground italic">Aucun visiteur actuellement</p>
      )}
    </div>
  );
}

function DetailRow({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3">
      <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
      <span className="text-xs text-muted-foreground w-24 shrink-0">{label}</span>
      <span className="text-sm text-foreground font-medium">{value}</span>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, alert, color }: { icon: React.ElementType; label: string; value: string | number; alert?: boolean; color?: string }) {
  return (
    <div className={`stat-card ${alert ? "border-destructive/30 !bg-destructive/5" : ""}`}>
      <div className="mb-3 flex items-center gap-3">
        <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${
          alert ? "bg-destructive/10" : color === "accent" ? "bg-accent/10" : color === "garden" ? "bg-green-500/10" : "bg-primary/10"
        }`}>
          <Icon className={`h-5 w-5 ${alert ? "text-destructive" : color === "accent" ? "text-accent" : color === "garden" ? "text-green-600" : "text-primary"}`} />
        </div>
      </div>
      <p className={`text-2xl font-bold ${alert ? "text-destructive" : "text-foreground"}`}>{value}</p>
      <p className="mt-1 text-xs text-muted-foreground">{label}</p>
    </div>
  );
}
