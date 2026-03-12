import { Users, UserPlus, Monitor, DoorOpen, TrendingUp } from "lucide-react";
import { useVisitors, useVisits, computeOccupancy, COMPUTER_LAB_CAPACITY, useVisitsRealtime } from "@/lib/supabase-store";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from "recharts";

export default function Dashboard() {
  useVisitsRealtime();
  const { data: visitors = [] } = useVisitors();
  const { data: visits = [] } = useVisits();
  const labOccupancy = computeOccupancy(visits, "computer_lab");
  const multiOccupancy = computeOccupancy(visits, "multipurpose_room");

  const today = new Date().toISOString().split("T")[0];
  const todayVisits = visits.filter((v) => v.timestamp.startsWith(today) && v.action === "check_in");
  const uniqueToday = new Set(todayVisits.map((v) => v.visitor_id)).size;

  const labCount = labOccupancy.size;
  const multiCount = multiOccupancy.size;
  const labFull = labCount >= COMPUTER_LAB_CAPACITY;

  const hourlyData = Array.from({ length: 12 }, (_, i) => {
    const hour = i + 7;
    const count = visits.filter((v) => {
      const h = new Date(v.timestamp).getHours();
      return h === hour && v.action === "check_in";
    }).length;
    return { hour: `${hour}:00`, visites: count };
  });

  const roomData = [
    { name: "Salle Informatique", value: visits.filter((v) => v.room === "computer_lab" && v.action === "check_in").length },
    { name: "Salle Polyvalente", value: visits.filter((v) => v.room === "multipurpose_room" && v.action === "check_in").length },
  ];

  const COLORS = ["hsl(234, 85%, 60%)", "hsl(174, 62%, 47%)"];

  const labPercent = Math.min((labCount / COMPUTER_LAB_CAPACITY) * 100, 100);

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="page-header">
        <h1 className="page-title">Tableau de bord</h1>
        <p className="page-subtitle">Vue d'ensemble — Gitega Study Space</p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard icon={Users} label="Membres inscrits" value={visitors.length} color="primary" />
        <StatCard icon={UserPlus} label="Visiteurs aujourd'hui" value={uniqueToday} color="accent" />
        <StatCard icon={Monitor} label="Salle Informatique" value={`${labCount} / ${COMPUTER_LAB_CAPACITY}`} alert={labFull} color="primary" />
        <StatCard icon={DoorOpen} label="Salle Polyvalente" value={multiCount} color="accent" />
      </div>

      {labFull && (
        <div className="flex items-center gap-3 rounded-2xl border border-destructive/20 bg-destructive/5 p-4 animate-fade-in">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-destructive/10">
            <TrendingUp className="h-5 w-5 text-destructive" />
          </div>
          <div>
            <p className="text-sm font-semibold text-destructive">Salle Informatique pleine</p>
            <p className="text-xs text-destructive/70">Capacité de {COMPUTER_LAB_CAPACITY} atteinte. Veuillez patienter.</p>
          </div>
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-2">
        <div className="stat-card">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-foreground">Salle Informatique</h3>
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
          <p className="text-xs text-muted-foreground">{labCount} sur {COMPUTER_LAB_CAPACITY} places occupées</p>
          {labOccupancy.size > 0 && (
            <div className="mt-4 flex flex-wrap gap-1.5">
              {Array.from(labOccupancy).map((id) => (
                <span key={id} className="occupancy-badge bg-primary/8 text-primary border border-primary/15">{id}</span>
              ))}
            </div>
          )}
        </div>

        <div className="stat-card">
          <h3 className="mb-4 text-sm font-semibold text-foreground">Salle Polyvalente</h3>
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-bold gradient-text">{multiCount}</span>
            <span className="text-sm text-muted-foreground">visiteurs à l'intérieur</span>
          </div>
          {multiOccupancy.size > 0 && (
            <div className="mt-4 flex flex-wrap gap-1.5">
              {Array.from(multiOccupancy).map((id) => (
                <span key={id} className="occupancy-badge bg-accent/8 text-accent border border-accent/15">{id}</span>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <div className="stat-card">
          <h3 className="mb-5 text-sm font-semibold text-foreground">Fréquentation horaire</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={hourlyData}>
              <XAxis dataKey="hour" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11 }} allowDecimals={false} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ borderRadius: "12px", border: "none", boxShadow: "0 10px 25px -5px rgb(0 0 0 / 0.1)" }} />
              <Bar dataKey="visites" fill="hsl(234, 85%, 60%)" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="stat-card">
          <h3 className="mb-5 text-sm font-semibold text-foreground">Répartition par salle</h3>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={roomData} cx="50%" cy="50%" innerRadius={55} outerRadius={85} dataKey="value" label strokeWidth={0}>
                {roomData.map((_, i) => (
                  <Cell key={i} fill={COLORS[i]} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ borderRadius: "12px", border: "none", boxShadow: "0 10px 25px -5px rgb(0 0 0 / 0.1)" }} />
            </PieChart>
          </ResponsiveContainer>
          <div className="mt-3 flex justify-center gap-6">
            {roomData.map((d, i) => (
              <div key={d.name} className="flex items-center gap-2 text-xs text-muted-foreground">
                <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: COLORS[i] }} />
                <span className="font-medium">{d.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
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
