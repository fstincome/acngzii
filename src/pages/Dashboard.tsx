import { useState } from "react";
import { Users, UserPlus, Monitor, DoorOpen, TrendingUp, Clock, Phone, Mail, MapPin, Briefcase, X } from "lucide-react";
import { useVisitors, useVisits, computeOccupancy, COMPUTER_LAB_CAPACITY, useVisitsRealtime, Visitor } from "@/lib/supabase-store";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
} from "recharts";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";

export default function Dashboard() {
  useVisitsRealtime();
  const { data: visitors = [] } = useVisitors();
  const { data: visits = [] } = useVisits();
  const [selectedVisitor, setSelectedVisitor] = useState<Visitor | null>(null);

  const labOccupancy = computeOccupancy(visits, "computer_lab");
  const multiOccupancy = computeOccupancy(visits, "multipurpose_room");

  const today = new Date().toISOString().split("T")[0];
  const todayVisits = visits.filter((v) => v.timestamp.startsWith(today));
  const todayCheckIns = todayVisits.filter((v) => v.action === "check_in");
  const uniqueTodayIds = [...new Set(todayCheckIns.map((v) => v.visitor_id))];
  const uniqueToday = uniqueTodayIds.length;

  const labCount = labOccupancy.size;
  const multiCount = multiOccupancy.size;
  const labFull = labCount >= COMPUTER_LAB_CAPACITY;
  const labPercent = Math.min((labCount / COMPUTER_LAB_CAPACITY) * 100, 100);

  // Helper: get visitor by visitor_id
  const getVisitor = (vid: string) => visitors.find((v) => v.visitor_id === vid);

  // Today's hourly data
  const hourlyData = Array.from({ length: 12 }, (_, i) => {
    const hour = i + 7;
    const count = todayCheckIns.filter((v) => new Date(v.timestamp).getHours() === hour).length;
    return { hour: `${hour}h`, visites: count };
  });

  // Today's visitors with their latest check-in time
  const todayVisitorsList = uniqueTodayIds.map((vid) => {
    const visitor = getVisitor(vid);
    const lastCheckIn = todayCheckIns
      .filter((v) => v.visitor_id === vid)
      .sort((a, b) => b.timestamp.localeCompare(a.timestamp))[0];
    const room = lastCheckIn?.room;
    return {
      visitor_id: vid,
      name: visitor?.full_name || vid,
      visitor,
      time: lastCheckIn ? new Date(lastCheckIn.timestamp).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }) : "",
      room,
      isInLab: labOccupancy.has(vid),
      isInMulti: multiOccupancy.has(vid),
    };
  }).sort((a, b) => {
    // Currently inside first, then by time
    const aIn = a.isInLab || a.isInMulti ? 1 : 0;
    const bIn = b.isInLab || b.isInMulti ? 1 : 0;
    if (bIn !== aIn) return bIn - aIn;
    return b.time.localeCompare(a.time);
  });

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="page-header">
        <h1 className="page-title">Tableau de bord</h1>
        <p className="page-subtitle">Données du jour — {new Date().toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</p>
      </div>

      {/* Key stats */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard icon={Monitor} label="Salle Informatique" value={`${labCount} / ${COMPUTER_LAB_CAPACITY}`} alert={labFull} color="primary" />
        <StatCard icon={DoorOpen} label="Salle Polyvalente" value={multiCount} color="accent" />
        <StatCard icon={UserPlus} label="Visiteurs aujourd'hui" value={uniqueToday} color="primary" />
        <StatCard icon={Users} label="Membres inscrits" value={visitors.length} color="accent" />
      </div>

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

      {/* Occupancy panels with names */}
      <div className="grid gap-5 lg:grid-cols-2">
        {/* Computer lab */}
        <div className="stat-card">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Monitor className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-semibold text-foreground">Salle Informatique</h3>
            </div>
            <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
              {labPercent.toFixed(0)}%
            </span>
          </div>
          <div className="mb-3 h-2.5 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{ width: `${labPercent}%`, background: "var(--gradient-primary)" }}
            />
          </div>
          <p className="text-xs text-muted-foreground mb-3">{labCount} sur {COMPUTER_LAB_CAPACITY} places occupées</p>
          {labOccupancy.size > 0 ? (
            <div className="space-y-1.5 max-h-48 overflow-y-auto">
              {Array.from(labOccupancy).map((vid) => {
                const v = getVisitor(vid);
                return (
                  <button
                    key={vid}
                    onClick={() => v && setSelectedVisitor(v)}
                    className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm transition-colors hover:bg-primary/5"
                  >
                    <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                    <span className="font-medium text-foreground truncate">{v?.full_name || vid}</span>
                  </button>
                );
              })}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground italic">Aucun visiteur actuellement</p>
          )}
        </div>

        {/* Multipurpose room */}
        <div className="stat-card">
          <div className="mb-4 flex items-center gap-2">
            <DoorOpen className="h-4 w-4 text-accent" />
            <h3 className="text-sm font-semibold text-foreground">Salle Polyvalente</h3>
          </div>
          <div className="flex items-baseline gap-2 mb-3">
            <span className="text-4xl font-bold gradient-text">{multiCount}</span>
            <span className="text-sm text-muted-foreground">visiteurs à l'intérieur</span>
          </div>
          {multiOccupancy.size > 0 ? (
            <div className="space-y-1.5 max-h-48 overflow-y-auto">
              {Array.from(multiOccupancy).map((vid) => {
                const v = getVisitor(vid);
                return (
                  <button
                    key={vid}
                    onClick={() => v && setSelectedVisitor(v)}
                    className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm transition-colors hover:bg-accent/5"
                  >
                    <div className="h-2 w-2 rounded-full bg-accent animate-pulse" />
                    <span className="font-medium text-foreground truncate">{v?.full_name || vid}</span>
                  </button>
                );
              })}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground italic">Aucun visiteur actuellement</p>
          )}
        </div>
      </div>

      {/* Today's visitors list */}
      <div className="stat-card">
        <div className="mb-4 flex items-center gap-2">
          <Clock className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold text-foreground">Visiteurs d'aujourd'hui</h3>
          <span className="ml-auto rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">{uniqueToday}</span>
        </div>
        {todayVisitorsList.length > 0 ? (
          <div className="space-y-1 max-h-64 overflow-y-auto">
            {todayVisitorsList.map((entry) => (
              <button
                key={entry.visitor_id}
                onClick={() => entry.visitor && setSelectedVisitor(entry.visitor)}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition-colors hover:bg-muted/50"
              >
                <div className={`h-2 w-2 rounded-full shrink-0 ${entry.isInLab || entry.isInMulti ? "bg-green-500 animate-pulse" : "bg-muted-foreground/30"}`} />
                <span className="font-medium text-foreground truncate flex-1">{entry.name}</span>
                <span className="text-xs text-muted-foreground shrink-0">
                  {entry.room === "computer_lab" ? "Info" : "Poly"} · {entry.time}
                </span>
                {(entry.isInLab || entry.isInMulti) && (
                  <span className="rounded-full bg-green-500/10 px-2 py-0.5 text-[10px] font-medium text-green-600 shrink-0">Présent</span>
                )}
              </button>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground italic">Aucun visiteur aujourd'hui</p>
        )}
      </div>

      {/* Today's hourly chart */}
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
          alert ? "bg-destructive/10" : color === "accent" ? "bg-accent/10" : "bg-primary/10"
        }`}>
          <Icon className={`h-5 w-5 ${alert ? "text-destructive" : color === "accent" ? "text-accent" : "text-primary"}`} />
        </div>
      </div>
      <p className={`text-2xl font-bold ${alert ? "text-destructive" : "text-foreground"}`}>{value}</p>
      <p className="mt-1 text-xs text-muted-foreground">{label}</p>
    </div>
  );
}
