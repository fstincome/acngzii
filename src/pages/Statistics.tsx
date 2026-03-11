import { getVisitors, getVisits, useStore } from "@/lib/store";
import { Users, TrendingUp, Calendar, Clock } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
} from "recharts";

export default function Statistics() {
  useStore();
  const visitors = getVisitors();
  const visits = getVisits();

  const checkIns = visits.filter((v) => v.action === "check_in");

  // Top visitors
  const visitorCount: Record<string, number> = {};
  checkIns.forEach((v) => {
    visitorCount[v.visitorId] = (visitorCount[v.visitorId] || 0) + 1;
  });
  const topVisitors = Object.entries(visitorCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([id, count]) => {
      const v = visitors.find((vis) => vis.visitorId === id);
      return { name: v?.fullName || id, count };
    });

  // Occupation breakdown
  const occCount: Record<string, number> = {};
  visitors.forEach((v) => {
    occCount[v.occupation] = (occCount[v.occupation] || 0) + 1;
  });
  const occupationData = Object.entries(occCount).map(([name, value]) => ({ name, value }));

  const COLORS = ["hsl(214,80%,52%)", "hsl(199,70%,48%)", "hsl(152,60%,42%)", "hsl(38,92%,50%)", "hsl(0,72%,55%)"];

  // Weekly data (mock based on seed)
  const weekDays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const weeklyData = weekDays.map((day, i) => ({
    day,
    visitors: Math.max(1, checkIns.length - i + Math.floor(Math.random() * 3)),
  }));

  // Hourly distribution
  const hourlyDist = Array.from({ length: 12 }, (_, i) => {
    const hour = i + 7;
    return {
      hour: `${hour}h`,
      lab: checkIns.filter((v) => v.room === "computer_lab" && new Date(v.timestamp).getHours() === hour).length,
      multi: checkIns.filter((v) => v.room === "multipurpose_room" && new Date(v.timestamp).getHours() === hour).length,
    };
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Statistics</h1>
        <p className="text-sm text-muted-foreground">Analytics and insights</p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <MiniStat icon={Users} label="Total Members" value={visitors.length} />
        <MiniStat icon={TrendingUp} label="Total Check-ins" value={checkIns.length} />
        <MiniStat icon={Calendar} label="Lab Visits" value={checkIns.filter((v) => v.room === "computer_lab").length} />
        <MiniStat icon={Clock} label="Multi Room" value={checkIns.filter((v) => v.room === "multipurpose_room").length} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Weekly Trend */}
        <div className="stat-card">
          <h3 className="mb-4 text-sm font-semibold text-foreground">Weekly Attendance</h3>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={weeklyData}>
              <XAxis dataKey="day" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
              <Tooltip />
              <Line type="monotone" dataKey="visitors" stroke="hsl(214,80%,52%)" strokeWidth={2} dot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Hourly by room */}
        <div className="stat-card">
          <h3 className="mb-4 text-sm font-semibold text-foreground">Hourly Usage by Room</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={hourlyDist}>
              <XAxis dataKey="hour" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="lab" fill="hsl(214,80%,52%)" radius={[2, 2, 0, 0]} name="Computer Lab" />
              <Bar dataKey="multi" fill="hsl(199,70%,48%)" radius={[2, 2, 0, 0]} name="Multipurpose" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Top Visitors */}
        <div className="stat-card">
          <h3 className="mb-4 text-sm font-semibold text-foreground">Top Visitors</h3>
          <div className="space-y-2">
            {topVisitors.map((v, i) => (
              <div key={v.name} className="flex items-center gap-3">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                  {i + 1}
                </span>
                <span className="flex-1 text-sm text-foreground truncate">{v.name}</span>
                <span className="text-sm font-semibold text-primary">{v.count}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Occupation Breakdown */}
        <div className="stat-card">
          <h3 className="mb-4 text-sm font-semibold text-foreground">Members by Occupation</h3>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={occupationData} cx="50%" cy="50%" innerRadius={40} outerRadius={70} dataKey="value" label={({ name }) => name}>
                {occupationData.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

function MiniStat({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: number }) {
  return (
    <div className="stat-card">
      <div className="mb-1 flex items-center gap-2">
        <Icon className="h-4 w-4 text-primary" />
        <span className="text-xs text-muted-foreground">{label}</span>
      </div>
      <p className="text-2xl font-bold text-foreground">{value}</p>
    </div>
  );
}
