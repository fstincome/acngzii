import { Users, UserPlus, Monitor, DoorOpen } from "lucide-react";
import {
  getVisitors,
  getVisits,
  getCurrentOccupancy,
  COMPUTER_LAB_CAPACITY,
  useStore,
} from "@/lib/store";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from "recharts";

export default function Dashboard() {
  useStore();
  const visitors = getVisitors();
  const visits = getVisits();
  const labOccupancy = getCurrentOccupancy("computer_lab");
  const multiOccupancy = getCurrentOccupancy("multipurpose_room");

  const today = new Date().toISOString().split("T")[0];
  const todayVisits = visits.filter((v) => v.timestamp.startsWith(today) && v.action === "check_in");
  const uniqueToday = new Set(todayVisits.map((v) => v.visitorId)).size;

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

  const COLORS = ["hsl(214, 80%, 52%)", "hsl(199, 70%, 48%)"];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Tableau de bord</h1>
        <p className="text-sm text-muted-foreground">Vue d'ensemble — Gitega Study Space</p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard icon={Users} label="Membres inscrits" value={visitors.length} />
        <StatCard icon={UserPlus} label="Visiteurs aujourd'hui" value={uniqueToday} />
        <StatCard icon={Monitor} label="Salle Informatique" value={`${labCount} / ${COMPUTER_LAB_CAPACITY}`} alert={labFull} />
        <StatCard icon={DoorOpen} label="Salle Polyvalente" value={multiCount} />
      </div>

      {labFull && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-4">
          <p className="text-sm font-semibold text-destructive">⚠ Salle Informatique pleine</p>
          <p className="text-xs text-destructive/80">Capacité de {COMPUTER_LAB_CAPACITY} atteinte. Veuillez patienter.</p>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="stat-card">
          <h3 className="mb-3 text-sm font-semibold text-foreground">Occupation Salle Informatique</h3>
          <div className="mb-2 h-3 w-full overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${Math.min((labCount / COMPUTER_LAB_CAPACITY) * 100, 100)}%` }} />
          </div>
          <p className="text-xs text-muted-foreground">{labCount} sur {COMPUTER_LAB_CAPACITY} places occupées</p>
          {labOccupancy.size > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {Array.from(labOccupancy).map((id) => (
                <span key={id} className="occupancy-badge bg-primary/10 text-primary">{id}</span>
              ))}
            </div>
          )}
        </div>

        <div className="stat-card">
          <h3 className="mb-3 text-sm font-semibold text-foreground">Salle Polyvalente</h3>
          <div className="mb-2 flex items-center gap-2">
            <span className="text-3xl font-bold text-accent">{multiCount}</span>
            <span className="text-sm text-muted-foreground">visiteurs à l'intérieur</span>
          </div>
          {multiOccupancy.size > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {Array.from(multiOccupancy).map((id) => (
                <span key={id} className="occupancy-badge bg-accent/10 text-accent">{id}</span>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="stat-card">
          <h3 className="mb-4 text-sm font-semibold text-foreground">Fréquentation horaire</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={hourlyData}>
              <XAxis dataKey="hour" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="visites" fill="hsl(214, 80%, 52%)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="stat-card">
          <h3 className="mb-4 text-sm font-semibold text-foreground">Répartition par salle</h3>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={roomData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" label>
                {roomData.map((_, i) => (
                  <Cell key={i} fill={COLORS[i]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
          <div className="mt-2 flex justify-center gap-4">
            {roomData.map((d, i) => (
              <div key={d.name} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: COLORS[i] }} />
                {d.name}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, alert }: { icon: React.ElementType; label: string; value: string | number; alert?: boolean }) {
  return (
    <div className={`stat-card ${alert ? "border-destructive/40 bg-destructive/5" : ""}`}>
      <div className="mb-2 flex items-center gap-2">
        <Icon className={`h-4 w-4 ${alert ? "text-destructive" : "text-primary"}`} />
        <span className="text-xs text-muted-foreground">{label}</span>
      </div>
      <p className={`text-2xl font-bold ${alert ? "text-destructive" : "text-foreground"}`}>{value}</p>
    </div>
  );
}
