import { useState } from "react";
import { usePrograms, useProgramParticipants, useProgramSessions, useAllAttendanceForProgram, PARTICIPANT_ROLES, sortParticipants } from "@/lib/program-store";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CheckCircle2, XCircle, Clock, FileBarChart, Building, TrendingUp } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

export default function ProgramReport() {
  const { data: programs = [] } = usePrograms();
  const [selectedProgramId, setSelectedProgramId] = useState<string>("");

  const { data: participants = [] } = useProgramParticipants(selectedProgramId || undefined);
  const { data: sessions = [] } = useProgramSessions(selectedProgramId || undefined);
  const sessionIds = sessions.map(s => s.id);
  const { data: allAttendance = [] } = useAllAttendanceForProgram(sessionIds);

  const getStatus = (participantId: string, sessionId: string) => {
    const record = allAttendance.find(a => a.participant_id === participantId && a.session_id === sessionId);
    return record?.status || null;
  };

  const sortedParticipants = sortParticipants(participants);

  const getParticipantStats = (participantId: string) => {
    let present = 0, absent = 0, waiting = 0;
    sessions.forEach(s => {
      const st = getStatus(participantId, s.id);
      if (st === "present") present++;
      else if (st === "absent") absent++;
      else if (st === "en_attente") waiting++;
    });
    return { present, absent, waiting, total: sessions.length };
  };

  // Global stats
  const totalPresent = sortedParticipants.reduce((acc, p) => acc + getParticipantStats(p.id).present, 0);
  const totalPossible = sortedParticipants.length * sessions.length;
  const globalRate = totalPossible > 0 ? Math.round((totalPresent / totalPossible) * 100) : 0;

  const selectedProgram = programs.find(p => p.id === selectedProgramId);

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title flex items-center gap-2.5">
          <div className="icon-box h-9 w-9">
            <FileBarChart className="h-4.5 w-4.5 text-primary-foreground" />
          </div>
          Rapport Programme
        </h1>
        <p className="page-subtitle">Visualisez la présence par programme et par session</p>
      </div>

      <div className="mb-6 max-w-sm space-y-1.5">
        <label className="text-xs font-medium text-muted-foreground">Programme</label>
        <Select value={selectedProgramId} onValueChange={setSelectedProgramId}>
          <SelectTrigger className="h-11"><SelectValue placeholder="Sélectionner un programme" /></SelectTrigger>
          <SelectContent>
            {programs.map(p => (
              <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {!selectedProgramId ? (
        <Card className="p-12 text-center border-dashed border-2">
          <div className="icon-box h-14 w-14 mx-auto mb-4">
            <FileBarChart className="h-6 w-6 text-primary-foreground" />
          </div>
          <h3 className="font-semibold text-foreground mb-1">Rapport d'assiduité</h3>
          <p className="text-sm text-muted-foreground">Sélectionnez un programme pour voir le rapport.</p>
        </Card>
      ) : sessions.length === 0 ? (
        <Card className="p-10 text-center border-dashed border-2">
          <p className="text-muted-foreground">Aucune session pour ce programme.</p>
        </Card>
      ) : sortedParticipants.length === 0 ? (
        <Card className="p-10 text-center border-dashed border-2">
          <p className="text-muted-foreground">Aucun participant dans ce programme.</p>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* Summary banner */}
          <div className="rounded-xl p-5 text-primary-foreground" style={{ background: "var(--gradient-primary)" }}>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold text-lg">{selectedProgram?.name}</p>
                <p className="text-sm opacity-90">
                  {sortedParticipants.length} participants · {sessions.length} sessions
                </p>
              </div>
              <div className="text-right">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 opacity-80" />
                  <span className="text-3xl font-bold">{globalRate}%</span>
                </div>
                <p className="text-xs opacity-80">Taux de présence global</p>
              </div>
            </div>
          </div>

          {/* Quick stats */}
          <div className="grid grid-cols-3 gap-3">
            <Card className="p-4 text-center border-l-4 border-l-success">
              <p className="text-2xl font-bold text-foreground">{totalPresent}</p>
              <p className="text-xs text-muted-foreground">Présences totales</p>
            </Card>
            <Card className="p-4 text-center border-l-4 border-l-destructive">
              <p className="text-2xl font-bold text-foreground">{sortedParticipants.reduce((acc, p) => acc + getParticipantStats(p.id).absent, 0)}</p>
              <p className="text-xs text-muted-foreground">Absences totales</p>
            </Card>
            <Card className="p-4 text-center border-l-4 border-l-primary">
              <p className="text-2xl font-bold text-foreground">{sortedParticipants.length}</p>
              <p className="text-xs text-muted-foreground">Participants</p>
            </Card>
          </div>

          {/* Table */}
          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40">
                    <TableHead className="sticky left-0 bg-muted/40 z-10 min-w-[220px] font-semibold">Participant</TableHead>
                    {sessions.map(s => (
                      <TableHead key={s.id} className="text-center min-w-[80px]">
                        <div className="text-xs font-semibold">{format(new Date(s.session_date), "dd/MM", { locale: fr })}</div>
                        <div className="text-[10px] text-muted-foreground font-normal capitalize">{format(new Date(s.session_date), "EEE", { locale: fr })}</div>
                      </TableHead>
                    ))}
                    <TableHead className="text-center min-w-[90px] font-semibold">Taux</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedParticipants.map(p => {
                    const stats = getParticipantStats(p.id);
                    const rate = stats.total > 0 ? Math.round((stats.present / stats.total) * 100) : 0;
                    return (
                      <TableRow key={p.id} className="hover:bg-muted/30">
                        <TableCell className="sticky left-0 bg-card z-10">
                          <div className="flex items-center gap-2.5">
                            <div className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                              p.role === "mentor"
                                ? "bg-primary/10 text-primary"
                                : "bg-muted text-muted-foreground"
                            }`}>
                              {p.full_name.charAt(0)}
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-foreground truncate">{p.full_name}</p>
                              <div className="flex items-center gap-1.5">
                                <Badge variant={p.role === "mentor" ? "default" : "secondary"} className="text-[10px] px-1.5 py-0 h-4">
                                  {p.role === "mentor" ? "⭐" : "🎓"} {PARTICIPANT_ROLES[p.role as keyof typeof PARTICIPANT_ROLES]}
                                </Badge>
                                {p.institution && (
                                  <span className="text-[10px] text-muted-foreground truncate flex items-center gap-0.5">
                                    <Building className="h-2.5 w-2.5" /> {p.institution}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        {sessions.map(s => {
                          const st = getStatus(p.id, s.id);
                          return (
                            <TableCell key={s.id} className="text-center">
                              {st === "present" && (
                                <div className="inline-flex items-center justify-center h-7 w-7 rounded-full bg-success/10">
                                  <CheckCircle2 className="h-4 w-4 text-success" />
                                </div>
                              )}
                              {st === "absent" && (
                                <div className="inline-flex items-center justify-center h-7 w-7 rounded-full bg-destructive/10">
                                  <XCircle className="h-4 w-4 text-destructive" />
                                </div>
                              )}
                              {st === "en_attente" && (
                                <div className="inline-flex items-center justify-center h-7 w-7 rounded-full bg-warning/10">
                                  <Clock className="h-4 w-4 text-warning" />
                                </div>
                              )}
                              {!st && <span className="text-muted-foreground">—</span>}
                            </TableCell>
                          );
                        })}
                        <TableCell className="text-center">
                          <div className="inline-flex flex-col items-center">
                            <span className={`text-sm font-bold ${
                              rate >= 75 ? "text-success" : rate >= 50 ? "text-warning" : "text-destructive"
                            }`}>
                              {rate}%
                            </span>
                            <span className="text-[10px] text-muted-foreground">{stats.present}/{stats.total}</span>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </Card>

          {/* Legend */}
          <div className="flex items-center gap-4 text-xs text-muted-foreground justify-center">
            <span className="flex items-center gap-1"><CheckCircle2 className="h-3.5 w-3.5 text-success" /> Présent</span>
            <span className="flex items-center gap-1"><XCircle className="h-3.5 w-3.5 text-destructive" /> Absent</span>
            <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5 text-warning" /> En attente</span>
          </div>
        </div>
      )}
    </div>
  );
}
