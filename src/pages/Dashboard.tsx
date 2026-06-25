import { useState, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Users, UserPlus, Monitor, DoorOpen, TrendingUp, Clock, Phone, Mail, MapPin, Briefcase, TreePine, Download, Loader2, GraduationCap, ClipboardCheck, LogIn, LogOut, Activity } from "lucide-react";
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
import { VisitorListDialog, VisitorListItem } from "@/components/VisitorListDialog";


export default function Dashboard() {
  const { role } = useAuth();
  const { toast } = useToast();
  const { t, i18n } = useTranslation();
  const [backingUp, setBackingUp] = useState(false);
  useVisitsRealtime();
  const { data: visitors = [] } = useVisitors();
  const { data: visits = [] } = useVisits();
  const [selectedVisitor, setSelectedVisitor] = useState<Visitor | null>(null);
  const [listDialog, setListDialog] = useState<{ title: string; description?: string; items: VisitorListItem[] } | null>(null);

  const openList = (title: string, items: VisitorListItem[], description?: string) =>
    setListDialog({ title, items, description });

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
      time: lastCheckIn ? new Date(lastCheckIn.timestamp).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }) : "",
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
      toast({ title: t("dashboard.backupSuccess"), description: t("dashboard.backupSuccessDesc") });
    } catch (err: any) {
      toast({ title: t("dashboard.error"), description: err.message, variant: "destructive" });
    }
    setBackingUp(false);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="page-header flex items-center justify-between">
        <div>
          <h1 className="page-title">{t("dashboard.title")}</h1>
          <p className="page-subtitle">{t("dashboard.subtitle", { date: new Date().toLocaleDateString("en-US", { weekday: "long", day: "numeric", month: "long", year: "numeric" }) })}</p>
        </div>
        {role === "admin" && (
          <Button variant="outline" onClick={handleBackup} disabled={backingUp}>
            {backingUp ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Download className="h-4 w-4 mr-2" />}
            {t("dashboard.backup")}
          </Button>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <StatCard icon={Monitor} label={t("dashboard.computerLab")} value={`${labCount} / ${COMPUTER_LAB_CAPACITY}`} alert={labFull} color="primary" />
        <StatCard icon={DoorOpen} label={t("dashboard.multipurposeRoom")} value={multiCount} color="accent" />
        <StatCard icon={TreePine} label={t("dashboard.garden")} value={gardenCount} color="garden" />
        <StatCard icon={UserPlus} label={t("dashboard.todayVisitors")} value={uniqueToday} color="primary" />
        <StatCard icon={Users} label={t("dashboard.registeredMembers")} value={visitors.length} color="accent" />
      </div>

      {/* Program attendance today */}
      {programTotalToday > 0 && (
        <div className="stat-card">
          <div className="mb-3 flex items-center gap-2">
            <GraduationCap className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-semibold text-foreground">{t("dashboard.programAttendanceToday")}</h3>
            <span className="ml-auto rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
              {t("dashboard.presentCount", { present: programPresentToday, total: programTotalToday })}
            </span>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="flex items-center gap-2 rounded-xl bg-primary/5 px-3 py-2">
              <Monitor className="h-4 w-4 text-primary" />
              <span className="text-xs text-muted-foreground">{t("dashboard.labShort")}</span>
              <span className="ml-auto text-sm font-bold text-foreground">{programPresentByRoom.computer_lab.length}</span>
            </div>
            <div className="flex items-center gap-2 rounded-xl bg-accent/5 px-3 py-2">
              <DoorOpen className="h-4 w-4 text-accent" />
              <span className="text-xs text-muted-foreground">{t("dashboard.multiShort")}</span>
              <span className="ml-auto text-sm font-bold text-foreground">{programPresentByRoom.multipurpose_room.length}</span>
            </div>
            <div className="flex items-center gap-2 rounded-xl bg-green-500/5 px-3 py-2">
              <TreePine className="h-4 w-4 text-green-600" />
              <span className="text-xs text-muted-foreground">{t("dashboard.garden")}</span>
              <span className="ml-auto text-sm font-bold text-foreground">{programPresentByRoom.garden.length}</span>
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
            <p className="text-sm font-semibold text-destructive">{t("dashboard.labFull")}</p>
            <p className="text-xs text-destructive/70">{t("dashboard.labFullDesc", { capacity: COMPUTER_LAB_CAPACITY })}</p>
          </div>
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-3">
        <OccupancyPanel
          icon={Monitor}
          title={t("dashboard.computerLab")}
          room="computer_lab"
          occupancy={labOccupancy}
          visits={visits}
          getVisitor={getVisitor}
          onSelect={setSelectedVisitor}
          color="primary"
          capacity={COMPUTER_LAB_CAPACITY}
          labPercent={labPercent}
          labCount={labCount}
          programAttendees={programPresentByRoom.computer_lab.map(a => ({ id: a.participant_id, name: participantNameMap[a.participant_id] || "Participant" }))}
        />
        <OccupancyPanel
          icon={DoorOpen}
          title={t("dashboard.multipurposeRoom")}
          room="multipurpose_room"
          occupancy={multiOccupancy}
          visits={visits}
          getVisitor={getVisitor}
          onSelect={setSelectedVisitor}
          color="accent"
          programAttendees={programPresentByRoom.multipurpose_room.map(a => ({ id: a.participant_id, name: participantNameMap[a.participant_id] || "Participant" }))}
        />
        <OccupancyPanel
          icon={TreePine}
          title={t("dashboard.garden")}
          room="garden"
          occupancy={gardenOccupancy}
          visits={visits}
          getVisitor={getVisitor}
          onSelect={setSelectedVisitor}
          color="garden"
          programAttendees={programPresentByRoom.garden.map(a => ({ id: a.participant_id, name: participantNameMap[a.participant_id] || "Participant" }))}
        />
      </div>

      {/* Today's visitors */}
      <div className="stat-card">
        <div className="mb-4 flex items-center gap-2">
          <Clock className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold text-foreground">{t("dashboard.todayVisitorsTitle")}</h3>
          <span className="ml-auto rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">{uniqueToday}</span>
        </div>
        {(todayVisitorsList.length > 0 || programPresentToday > 0) ? (
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
                    <span className="rounded-full bg-green-500/10 px-2 py-0.5 text-[10px] font-medium text-green-600 shrink-0">{t("dashboard.present")}</span>
                  )}
                </button>
              );
            })}
            {todayProgramAttendance.filter(a => a.status === "present" && a.room).map((a) => {
              const roomLabel = ROOM_LABELS[a.room as RoomType] || a.room;
              return (
                <div
                  key={`prog-today-${a.id}`}
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm bg-primary/5"
                >
                  <div className="h-2 w-2 rounded-full shrink-0 bg-green-500 animate-pulse" />
                  <span className="font-medium text-foreground truncate flex-1">{participantNameMap[a.participant_id] || "Participant"}</span>
                  <span className="text-xs text-muted-foreground shrink-0">{roomLabel}</span>
                  <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary shrink-0">
                    <GraduationCap className="h-3 w-3 inline mr-0.5" />{t("dashboard.program")}
                  </span>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground italic">{t("dashboard.noVisitorsToday")}</p>
        )}
      </div>

      {/* Hourly chart */}
      <div className="stat-card">
        <div className="mb-5 flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold text-foreground">{t("dashboard.hourlyTitle")}</h3>
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
                <DetailRow icon={Phone} label={t("dashboard.phone")} value={selectedVisitor.phone} />
                {selectedVisitor.email && <DetailRow icon={Mail} label={t("dashboard.email")} value={selectedVisitor.email} />}
                <DetailRow icon={MapPin} label={t("dashboard.neighborhood")} value={selectedVisitor.neighborhood} />
                <DetailRow icon={Briefcase} label={t("dashboard.occupation")} value={selectedVisitor.occupation} />
                <DetailRow icon={Users} label={t("dashboard.gender")} value={selectedVisitor.gender === "male" ? t("dashboard.male") : selectedVisitor.gender === "female" ? t("dashboard.female") : t("dashboard.other")} />
                {selectedVisitor.date_of_birth && (
                  <DetailRow icon={Clock} label={t("dashboard.dob")} value={selectedVisitor.date_of_birth} />
                )}
              </div>
              <p className="text-xs text-muted-foreground">{t("dashboard.registeredOn", { date: selectedVisitor.registration_date })}</p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function formatTimeRemaining(ms: number): string {
  if (ms <= 0) return "Expired";
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
  icon: Icon, title, room, occupancy, visits, getVisitor, onSelect, color, capacity, labPercent, labCount, programAttendees = []
}: {
  icon: React.ElementType; title: string; room: string; occupancy: Set<string>;
  visits: Visit[];
  getVisitor: (vid: string) => Visitor | undefined;
  onSelect: (v: Visitor) => void; color: string;
  capacity?: number; labPercent?: number; labCount?: number;
  programAttendees?: { id: string; name: string }[];
}) {
  const { t } = useTranslation();
  const [now, setNow] = useState(Date.now());
  const totalCount = occupancy.size + programAttendees.length;

  useEffect(() => {
    if (totalCount === 0) return;
    const interval = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(interval);
  }, [totalCount]);

  const colorClass = color === "accent" ? "text-accent" : color === "garden" ? "text-green-600" : "text-primary";
  const bgClass = color === "accent" ? "bg-accent/5" : color === "garden" ? "bg-green-500/5" : "bg-primary/5";
  const dotClass = color === "accent" ? "bg-accent" : color === "garden" ? "bg-green-500" : "bg-primary";

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
          <p className="text-xs text-muted-foreground mb-3">{t("dashboard.occupiedSeats", { count: labCount, capacity })}</p>
        </>
      )}
      {!capacity && (
        <div className="flex items-baseline gap-2 mb-3">
          <span className="text-4xl font-bold gradient-text">{totalCount}</span>
          <span className="text-sm text-muted-foreground">{t("dashboard.visitors")}</span>
        </div>
      )}
      {totalCount > 0 ? (
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
          {programAttendees.map((pa) => (
            <div
              key={`prog-${pa.id}`}
              className={`flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm ${bgClass}`}
            >
              <div className={`h-2 w-2 rounded-full ${dotClass} animate-pulse shrink-0`} />
              <span className="font-medium text-foreground truncate flex-1">{pa.name}</span>
              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary shrink-0">
                <GraduationCap className="h-3 w-3 inline mr-0.5" />{t("dashboard.program")}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground italic">{t("dashboard.noVisitors")}</p>
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
