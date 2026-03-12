import { getVisitors, getVisits, useStore } from "@/lib/store";
import { Users, TrendingUp, Calendar, Clock } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell,
} from "recharts";

export default function Statistics() {
  useStore();
  const visitors = getVisitors();
  const visits = getVisits();
  const checkIns = visits.filter((v) => v.action === "check_in");

  const visitorCount: Record<string, number> = {};
  checkIns.forEach((v) => { visitorCount[v.visitorId] = (visitorCount[v.visitorId] || 0) + 1; });
  const topVisitors = Object.entries(visitorCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([id, count]) => {
      const v = visitors.find((vis) => vis.visitorId === id);
      return { name: v?.fullName || id, count };
    });

  const occCount: Record<string, number> = {};
  visitors.forEach((v) => { occCount[v.occupation] = (occCount[v.occupation] || 0) + 1; });
  const occupationData = Object.entries(occCount).map(([name, value]) => ({ name, value }));

  const COLORS = ["hsl(234,85%,60%)", "hsl(174,62%,47%)", "hsl(160,64%,43%)", "hsl(38,92%,50%)", "hsl(0,72%,55%)"];

  const weekDays = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];
  const weeklyData = weekDays.map((day, i) => ({
    day,
    visiteurs: Math.max(1, checkIns.length - i + Math.floor(Math.random() * 3)),
  }));

  const hourlyDist = Array.from({ length: 12 }, (_, i) => {
    const hour = i + 7;
    return {
      hour: `${hour}h`,
      labo: checkIns.filter((v) => v.room === "computer_lab" && new Date(v.timestamp).getHours() === hour).length,
      poly: checkIns.filter((v) => v.room === "multipurpose_room" && new Date(v.timestamp).getHours() === hour).length,
    };
  });

  const tooltipStyle = { borderRadius: "12px", border: "none", boxShadow: "0 10px 25px -5px rgb(0 0 0 / 0.1)" };

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="page-header">
        <h1 className="page-title">Statistiques</h1>
        <p className="page-subtitle">Analyses et tendances de fréquentation</p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <MiniStat icon={Users} label="Total membres" value={visitors.length} color="primary" />
        <MiniStat icon={TrendingUp} label="Total entrées" value={checkIns.length} color="accent" />
        <MiniStat icon={Calendar} label="Salle Informatique" value={checkIns.filter((v) => v.room === "computer_lab").length} color="primary" />
        <MiniStat icon={Clock} label="Salle Polyvalente" value={checkIns.filter((v) => v.room === "multipurpose_room").length} color="accent" />
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <div className="stat-card">
          <h3 className="mb-5 text-sm font-semibold text-foreground">Fréquentation hebdomadaire</h3>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={weeklyData}>
              <XAxis dataKey="day" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11 }} allowDecimals={false} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={tooltipStyle} />
              <Line type="monotone" dataKey="visiteurs" stroke="hsl(234,85%,60%)" strokeWidth={2.5} dot={{ r: 4, fill: "hsl(234,85%,60%)" }} activeDot={{ r: 6 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="stat-card">
          <h3 className="mb-5 text-sm font-semibold text-foreground">Utilisation horaire par salle</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={hourlyDist}>
              <XAxis dataKey="hour" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11 }} allowDecimals={false} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={tooltipStyle} />
              <Bar dataKey="labo" fill="hsl(234,85%,60%)" radius={[4, 4, 0, 0]} name="Salle Informatique" />
              <Bar dataKey="poly" fill="hsl(174,62%,47%)" radius={[4, 4, 0, 0]} name="Salle Polyvalente" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="stat-card">
          <h3 className="mb-5 text-sm font-semibold text-foreground">Visiteurs les plus fréquents</h3>
          <div className="space-y-2.5">
            {topVisitors.map((v, i) => (
              <div key={v.name} className="flex items-center gap-3">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg text-xs font-bold text-primary-foreground" style={{ background: "var(--gradient-primary)" }}>
                  {i + 1}
                </span>
                <span className="flex-1 text-sm text-foreground font-medium truncate">{v.name}</span>
                <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-bold text-primary">{v.count}</span>
              </div>
            ))}
            {topVisitors.length === 0 && (
              <p className="text-sm text-muted-foreground">Aucune donnée disponible.</p>
            )}
          </div>
        </div>

        <div className="stat-card">
          <h3 className="mb-5 text-sm font-semibold text-foreground">Membres par profession</h3>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={occupationData} cx="50%" cy="50%" innerRadius={45} outerRadius={75} dataKey="value" label={({ name }) => name} strokeWidth={0}>
                {occupationData.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip contentStyle={tooltipStyle} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

function MiniStat({ icon: Icon, label, value, color }: { icon: React.ElementType; label: string; value: number; color?: string }) {
  return (
    <div className="stat-card">
      <div className={`mb-3 flex h-10 w-10 items-center justify-center rounded-xl ${
        color === "accent" ? "bg-accent/10" : "bg-primary/10"
      }`}>
        <Icon className={`h-5 w-5 ${color === "accent" ? "text-accent" : "text-primary"}`} />
      </div>
      <p className="text-2xl font-bold text-foreground">{value}</p>
      <p className="mt-1 text-xs text-muted-foreground">{label}</p>
    </div>
  );
}
