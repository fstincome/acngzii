import { useState, useMemo } from "react";
import { useVisitors, useVisits, ROOM_LABELS, computeOccupancy } from "@/lib/supabase-store";
import type { Visit, RoomType } from "@/lib/supabase-store";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Users, TrendingUp, Calendar, Clock, Monitor, DoorOpen, TreePine, ArrowUpRight, ArrowDownRight, GraduationCap, ClipboardCheck, LogIn, LogOut, Activity } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, AreaChart, Area,
} from "recharts";
import { VisitorListDialog, VisitorListItem } from "@/components/VisitorListDialog";


type Period = "today" | "week" | "month" | "all";

function getStartDate(period: Period): Date | null {
  const now = new Date();
  if (period === "today") {
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  }
  if (period === "week") {
    const d = new Date(now);
    d.setDate(d.getDate() - 7);
    return d;
  }
  if (period === "month") {
    const d = new Date(now);
    d.setMonth(d.getMonth() - 1);
    return d;
  }
  return null;
}

function getPreviousPeriodStart(period: Period): [Date, Date] | null {
  const now = new Date();
  if (period === "today") {
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
    const end = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    return [start, end];
  }
  if (period === "week") {
    const end = new Date(now);
    end.setDate(end.getDate() - 7);
    const start = new Date(end);
    start.setDate(start.getDate() - 7);
    return [start, end];
  }
  if (period === "month") {
    const end = new Date(now);
    end.setMonth(end.getMonth() - 1);
    const start = new Date(end);
    start.setMonth(start.getMonth() - 1);
    return [start, end];
  }
  return null;
}

export default function Statistics() {
  const { data: visitors = [] } = useVisitors();
  const { data: visits = [] } = useVisits();

  const [period, setPeriod] = useState<Period>("week");
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });

  // Program attendance data
  const { data: allSessions = [] } = useQuery({
    queryKey: ["stats_program_sessions"],
    queryFn: async () => {
      const { data, error } = await supabase.from("program_sessions").select("id, session_date, program_id");
      if (error) throw error;
      return (data ?? []) as { id: string; session_date: string; program_id: string }[];
    },
  });

  const { data: allProgAttendance = [] } = useQuery({
    queryKey: ["stats_program_attendance"],
    queryFn: async () => {
      const { data, error } = await supabase.from("program_attendance").select("id, session_id, status, room");
      if (error) throw error;
      return (data ?? []) as { id: string; session_id: string; status: string; room: string | null }[];
    },
  });

  const { data: allPrograms = [] } = useQuery({
    queryKey: ["stats_programs"],
    queryFn: async () => {
      const { data, error } = await supabase.from("programs").select("id, name");
      if (error) throw error;
      return (data ?? []) as { id: string; name: string }[];
    },
  });

  const filteredVisits = useMemo(() => {
    if (period === "month" && selectedMonth) {
      return visits.filter((v) => v.timestamp.startsWith(selectedMonth));
    }
    const start = getStartDate(period);
    if (!start) return visits;
    return visits.filter((v) => new Date(v.timestamp) >= start);
  }, [visits, period, selectedMonth]);

  const prevPeriodVisits = useMemo(() => {
    const range = getPreviousPeriodStart(period);
    if (!range) return [];
    const [start, end] = range;
    return visits.filter((v) => {
      const d = new Date(v.timestamp);
      return d >= start && d < end;
    });
  }, [visits, period]);

  const checkIns = filteredVisits.filter((v) => v.action === "check_in");
  const prevCheckIns = prevPeriodVisits.filter((v) => v.action === "check_in");
  const uniqueVisitors = new Set(checkIns.map((v) => v.visitor_id)).size;
  const prevUniqueVisitors = new Set(prevCheckIns.map((v) => v.visitor_id)).size;

  const rawLabCheckIns = checkIns.filter((v) => v.room === "computer_lab").length;
  const rawMultiCheckIns = checkIns.filter((v) => v.room === "multipurpose_room").length;
  const rawGardenCheckIns = checkIns.filter((v) => v.room === "garden").length;




  // Program attendance filtered by period
  const filteredSessionIds = useMemo(() => {
    const start = period === "month" && selectedMonth ? null : getStartDate(period);
    return allSessions
      .filter(s => {
        if (period === "month" && selectedMonth) return s.session_date.startsWith(selectedMonth);
        if (!start) return true;
        return new Date(s.session_date) >= start;
      })
      .map(s => s.id);
  }, [allSessions, period, selectedMonth]);

  const filteredProgAttendance = useMemo(() => {
    const ids = new Set(filteredSessionIds);
    return allProgAttendance.filter(a => ids.has(a.session_id));
  }, [allProgAttendance, filteredSessionIds]);

  const progPresent = filteredProgAttendance.filter(a => a.status === "present").length;
  const progAbsent = filteredProgAttendance.filter(a => a.status === "absent").length;
  const progTotal = filteredProgAttendance.length;
  const progRate = progTotal > 0 ? Math.round((progPresent / progTotal) * 100) : 0;
  const progLabCount = filteredProgAttendance.filter(a => a.status === "present" && a.room === "computer_lab").length;
  const progMultiCount = filteredProgAttendance.filter(a => a.status === "present" && a.room === "multipurpose_room").length;
  const progGardenCount = filteredProgAttendance.filter(a => a.status === "present" && a.room === "garden").length;

  // Merged room counts (visits + program)
  const labCheckIns = rawLabCheckIns + progLabCount;
  const multiCheckIns = rawMultiCheckIns + progMultiCount;
  const gardenCheckIns = rawGardenCheckIns + progGardenCount;

  const comparePercent = (current: number, prev: number) => {
    if (prev === 0) return current > 0 ? 100 : 0;
    return Math.round(((current - prev) / prev) * 100);
  };

  const totalChange = comparePercent(checkIns.length, prevCheckIns.length);
  const visitorChange = comparePercent(uniqueVisitors, prevUniqueVisitors);

  // Top visitors
  const visitorCount: Record<string, number> = {};
  checkIns.forEach((v) => { visitorCount[v.visitor_id] = (visitorCount[v.visitor_id] || 0) + 1; });
  const topVisitors = Object.entries(visitorCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([id, count]) => {
      const v = visitors.find((vis) => vis.visitor_id === id);
      return { name: v?.full_name || id, count };
    });

  // Occupation distribution
  const occCount: Record<string, number> = {};
  const relevantVisitorIds = new Set(checkIns.map((v) => v.visitor_id));
  visitors.filter((v) => relevantVisitorIds.has(v.visitor_id)).forEach((v) => {
    occCount[v.occupation] = (occCount[v.occupation] || 0) + 1;
  });
  const occupationData = Object.entries(occCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([name, value]) => ({ name, value }));

  const COLORS = ["hsl(234,85%,60%)", "hsl(174,62%,47%)", "hsl(142,64%,43%)", "hsl(38,92%,50%)", "hsl(0,72%,55%)", "hsl(280,65%,55%)"];

  // Daily trend data
  const dailyTrend = useMemo(() => {
    const dayMap: Record<string, { lab: number; multi: number; garden: number; total: number }> = {};
    checkIns.forEach((v) => {
      const day = v.timestamp.split("T")[0];
      if (!dayMap[day]) dayMap[day] = { lab: 0, multi: 0, garden: 0, total: 0 };
      dayMap[day].total++;
      if (v.room === "computer_lab") dayMap[day].lab++;
      else if (v.room === "multipurpose_room") dayMap[day].multi++;
      else if (v.room === "garden") dayMap[day].garden++;
    });
    return Object.entries(dayMap)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([date, data]) => ({
        date: new Date(date).toLocaleDateString("en-US", { day: "2-digit", month: "short" }),
        ...data,
      }));
  }, [checkIns]);

  // Hourly distribution
  const hourlyDist = Array.from({ length: 12 }, (_, i) => {
    const hour = i + 7;
    return {
      hour: `${hour}h`,
      labo: checkIns.filter((v) => v.room === "computer_lab" && new Date(v.timestamp).getHours() === hour).length,
      poly: checkIns.filter((v) => v.room === "multipurpose_room" && new Date(v.timestamp).getHours() === hour).length,
      jardin: checkIns.filter((v) => v.room === "garden" && new Date(v.timestamp).getHours() === hour).length,
    };
  });

  // Room distribution for pie chart
  const roomDistribution = [
    { name: "Computer Lab", value: labCheckIns },
    { name: "Discussion Room", value: multiCheckIns },
    { name: "Reading Lounge", value: gardenCheckIns },
  ].filter((d) => d.value > 0);

  // Peak hour
  const peakHour = hourlyDist.reduce((max, h) => {
    const total = h.labo + h.poly + h.jardin;
    return total > (max.total || 0) ? { hour: h.hour, total } : max;
  }, { hour: "-", total: 0 });

  // Average daily visitors
  const daysCount = Math.max(dailyTrend.length, 1);
  const avgDaily = Math.round(checkIns.length / daysCount);

  // Gender distribution for period
  const genderCount: Record<string, number> = {};
  visitors.filter((v) => relevantVisitorIds.has(v.visitor_id)).forEach((v) => {
    const g = v.gender === "male" ? "Male" : v.gender === "female" ? "Female" : "Other";
    genderCount[g] = (genderCount[g] || 0) + 1;
  });
  const genderData = Object.entries(genderCount).map(([name, value]) => ({ name, value }));

  // Neighborhood distribution
  const neighborhoodCount: Record<string, number> = {};
  visitors.filter((v) => relevantVisitorIds.has(v.visitor_id)).forEach((v) => {
    neighborhoodCount[v.neighborhood] = (neighborhoodCount[v.neighborhood] || 0) + 1;
  });
  const neighborhoodData = Object.entries(neighborhoodCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([name, value]) => ({ name, value }));

  // Age distribution
  const ageGroups: Record<string, number> = {};
  const now = new Date();
  visitors.filter((v) => relevantVisitorIds.has(v.visitor_id) && v.date_of_birth).forEach((v) => {
    const birth = new Date(v.date_of_birth!);
    const age = Math.floor((now.getTime() - birth.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
    let group: string;
    if (age < 15) group = "< 15";
    else if (age < 20) group = "15-19";
    else if (age < 25) group = "20-24";
    else if (age < 30) group = "25-29";
    else if (age < 40) group = "30-39";
    else group = "40+";
    ageGroups[group] = (ageGroups[group] || 0) + 1;
  });
  const ageOrder = ["< 15", "15-19", "20-24", "25-29", "30-39", "40+"];
  const ageData = ageOrder
    .filter((g) => ageGroups[g])
    .map((name) => ({ name, value: ageGroups[name] || 0 }));

  // Month options
  const monthOptions = useMemo(() => {
    const months = new Set<string>();
    visits.forEach((v) => {
      months.add(v.timestamp.substring(0, 7));
    });
    return Array.from(months).sort().reverse();
  }, [visits]);

  const tooltipStyle = { borderRadius: "12px", border: "none", boxShadow: "0 10px 25px -5px rgb(0 0 0 / 0.1)" };
  const periodLabel = period === "today" ? "today" : period === "week" ? "this week" : period === "month" ? "this month" : "all time";

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="page-header">
          <h1 className="page-title">Statistics</h1>
          <p className="page-subtitle">Analytics and attendance trends</p>
        </div>
        <div className="flex items-center gap-3">
          <Tabs value={period} onValueChange={(v) => setPeriod(v as Period)}>
            <TabsList className="rounded-xl">
              <TabsTrigger value="today" className="rounded-lg text-xs">Today</TabsTrigger>
              <TabsTrigger value="week" className="rounded-lg text-xs">Week</TabsTrigger>
              <TabsTrigger value="month" className="rounded-lg text-xs">Month</TabsTrigger>
              <TabsTrigger value="all" className="rounded-lg text-xs">All</TabsTrigger>
            </TabsList>
          </Tabs>
          {period === "month" && (
            <Select value={selectedMonth} onValueChange={setSelectedMonth}>
              <SelectTrigger className="w-[140px] rounded-xl h-9 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {monthOptions.map((m) => (
                  <SelectItem key={m} value={m}>
                    {new Date(m + "-01").toLocaleDateString("en-US", { month: "long", year: "numeric" })}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      </div>

      {/* KPI cards with comparison */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard icon={Users} label="Unique visitors" value={uniqueVisitors} change={visitorChange} period={period} />
        <KpiCard icon={TrendingUp} label="Total check-ins" value={checkIns.length} change={totalChange} period={period} />
        <KpiCard icon={Clock} label="Avg / day" value={avgDaily} />
        <KpiCard icon={Calendar} label="Peak hour" value={peakHour.hour} subtitle={`${peakHour.total} check-ins`} />
      </div>

      {/* Room breakdown */}
      <div className="grid grid-cols-3 gap-4">
        <RoomStat icon={Monitor} label="Computer Lab" value={labCheckIns} color="primary" />
        <RoomStat icon={DoorOpen} label="Discussion Room" value={multiCheckIns} color="accent" />
        <RoomStat icon={TreePine} label="Reading Lounge" value={gardenCheckIns} color="garden" />
      </div>




      {/* Program Attendance */}
      {progTotal > 0 && (
        <>
          <div className="page-header">
            <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
              <GraduationCap className="h-5 w-5 text-primary" />
              Program Attendance
            </h2>
          </div>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <KpiCard icon={ClipboardCheck} label="Attendance rate" value={`${progRate}%`} />
            <KpiCard icon={GraduationCap} label="Present" value={progPresent} />
            <KpiCard icon={Users} label="Absent" value={progAbsent} />
            <KpiCard icon={Calendar} label="Total check-ins" value={progTotal} />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <RoomStat icon={Monitor} label="Computer Lab (Prog)" value={progLabCount} color="primary" />
            <RoomStat icon={DoorOpen} label="Discussion Room (Prog)" value={progMultiCount} color="accent" />
            <RoomStat icon={TreePine} label="Reading Lounge (Prog)" value={progGardenCount} color="garden" />
          </div>
        </>
      )}
      <div className="grid gap-5 lg:grid-cols-2">
        <div className="stat-card">
          <h3 className="mb-5 text-sm font-semibold text-foreground">Attendance trend</h3>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={dailyTrend}>
              <defs>
                <linearGradient id="gradTotal" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(234,85%,60%)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(234,85%,60%)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="date" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10 }} allowDecimals={false} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={tooltipStyle} />
              <Area type="monotone" dataKey="total" stroke="hsl(234,85%,60%)" strokeWidth={2} fill="url(#gradTotal)" name="Total" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="stat-card">
          <h3 className="mb-5 text-sm font-semibold text-foreground">Attendance by room</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={dailyTrend}>
              <XAxis dataKey="date" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10 }} allowDecimals={false} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={tooltipStyle} />
              <Bar dataKey="lab" fill="hsl(234,85%,60%)" radius={[3, 3, 0, 0]} name="Computer Lab" stackId="a" />
              <Bar dataKey="multi" fill="hsl(174,62%,47%)" radius={[0, 0, 0, 0]} name="Discussion Room" stackId="a" />
              <Bar dataKey="garden" fill="hsl(142,64%,43%)" radius={[3, 3, 0, 0]} name="Reading Lounge" stackId="a" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Charts row 2 */}
      <div className="grid gap-5 lg:grid-cols-3">
        <div className="stat-card">
          <h3 className="mb-5 text-sm font-semibold text-foreground">Hourly usage</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={hourlyDist}>
              <XAxis dataKey="hour" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10 }} allowDecimals={false} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={tooltipStyle} />
              <Bar dataKey="labo" fill="hsl(234,85%,60%)" radius={[3, 3, 0, 0]} name="Computer Lab" />
              <Bar dataKey="poly" fill="hsl(174,62%,47%)" radius={[3, 3, 0, 0]} name="Discussion Room" />
              <Bar dataKey="jardin" fill="hsl(142,64%,43%)" radius={[3, 3, 0, 0]} name="Reading Lounge" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="stat-card">
          <h3 className="mb-5 text-sm font-semibold text-foreground">Distribution by space</h3>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={roomDistribution} cx="50%" cy="50%" innerRadius={45} outerRadius={75} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} strokeWidth={0}>
                <Cell fill="hsl(234,85%,60%)" />
                <Cell fill="hsl(174,62%,47%)" />
                <Cell fill="hsl(142,64%,43%)" />
              </Pie>
              <Tooltip contentStyle={tooltipStyle} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="stat-card">
          <h3 className="mb-5 text-sm font-semibold text-foreground">Distribution by gender</h3>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={genderData} cx="50%" cy="50%" innerRadius={45} outerRadius={75} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} strokeWidth={0}>
                {genderData.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip contentStyle={tooltipStyle} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Charts row 3 */}
      <div className="grid gap-5 lg:grid-cols-2">
        <div className="stat-card">
          <h3 className="mb-5 text-sm font-semibold text-foreground">Most frequent visitors</h3>
          <div className="space-y-2.5 max-h-72 overflow-y-auto">
            {topVisitors.map((v, i) => (
              <div key={v.name} className="flex items-center gap-3">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg text-xs font-bold text-primary-foreground" style={{ background: "var(--gradient-primary)" }}>
                  {i + 1}
                </span>
                <span className="flex-1 text-sm text-foreground font-medium truncate">{v.name}</span>
                <div className="flex items-center gap-2">
                  <div className="h-1.5 rounded-full bg-primary/20" style={{ width: `${Math.max(20, (v.count / (topVisitors[0]?.count || 1)) * 80)}px` }}>
                    <div className="h-full rounded-full bg-primary" style={{ width: "100%" }} />
                  </div>
                  <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-bold text-primary">{v.count}</span>
                </div>
              </div>
            ))}
            {topVisitors.length === 0 && <p className="text-sm text-muted-foreground">No data available.</p>}
          </div>
        </div>

        <div className="stat-card">
          <h3 className="mb-5 text-sm font-semibold text-foreground">By occupation</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={occupationData} layout="vertical">
              <XAxis type="number" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={90} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={tooltipStyle} />
              <Bar dataKey="value" fill="hsl(234,85%,60%)" radius={[0, 6, 6, 0]} name="Members" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Neighborhood + Age */}
      <div className="grid gap-5 lg:grid-cols-2">
        <div className="stat-card">
          <h3 className="mb-5 text-sm font-semibold text-foreground">Visitor origin (neighborhoods)</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={neighborhoodData}>
              <XAxis dataKey="name" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10 }} allowDecimals={false} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={tooltipStyle} />
              <Bar dataKey="value" fill="hsl(174,62%,47%)" radius={[6, 6, 0, 0]} name="Visitors" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="stat-card">
          <h3 className="mb-5 text-sm font-semibold text-foreground">Attendance by age</h3>
          {ageData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={ageData}>
                <XAxis dataKey="name" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10 }} allowDecimals={false} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="value" fill="hsl(280,65%,55%)" radius={[6, 6, 0, 0]} name="Visitors" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-muted-foreground italic py-8 text-center">No date of birth recorded for this period.</p>
          )}
        </div>
      </div>
    </div>
  );
}

function KpiCard({ icon: Icon, label, value, change, period, subtitle }: {
  icon: React.ElementType; label: string; value: string | number;
  change?: number; period?: Period; subtitle?: string;
}) {
  const showChange = change !== undefined && period !== "all";
  const isUp = (change ?? 0) >= 0;
  return (
    <div className="stat-card">
      <div className="mb-3 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
          <Icon className="h-5 w-5 text-primary" />
        </div>
        {showChange && (
          <span className={`ml-auto flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
            isUp ? "bg-green-500/10 text-green-600" : "bg-red-500/10 text-red-500"
          }`}>
            {isUp ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
            {Math.abs(change!)}%
          </span>
        )}
      </div>
      <p className="text-2xl font-bold text-foreground">{value}</p>
      <p className="mt-1 text-xs text-muted-foreground">{label}</p>
      {subtitle && <p className="text-[10px] text-muted-foreground">{subtitle}</p>}
    </div>
  );
}

function RoomStat({ icon: Icon, label, value, color }: { icon: React.ElementType; label: string; value: number; color: string }) {
  const colorClass = color === "accent" ? "text-accent" : color === "garden" ? "text-green-600" : "text-primary";
  const bgClass = color === "accent" ? "bg-accent/10" : color === "garden" ? "bg-green-500/10" : "bg-primary/10";
  return (
    <div className="stat-card text-center">
      <div className={`mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-xl ${bgClass}`}>
        <Icon className={`h-5 w-5 ${colorClass}`} />
      </div>
      <p className="text-2xl font-bold text-foreground">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}
