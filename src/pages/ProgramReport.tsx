import { useState } from "react";
import { usePrograms, useProgramParticipants, useProgramSessions, useAllAttendanceForProgram, PARTICIPANT_ROLES, sortParticipants } from "@/lib/program-store";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CheckCircle2, XCircle, Clock } from "lucide-react";
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

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Rapport Programme</h1>
        <p className="page-subtitle">Visualisez la présence par programme et par session</p>
      </div>

      <div className="mb-6 max-w-sm">
        <Select value={selectedProgramId} onValueChange={setSelectedProgramId}>
          <SelectTrigger><SelectValue placeholder="Sélectionner un programme" /></SelectTrigger>
          <SelectContent>
            {programs.map(p => (
              <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {!selectedProgramId ? (
        <Card className="p-8 text-center text-muted-foreground">
          Sélectionnez un programme pour voir le rapport.
        </Card>
      ) : sessions.length === 0 ? (
        <Card className="p-8 text-center text-muted-foreground">
          Aucune session pour ce programme.
        </Card>
      ) : sortedParticipants.length === 0 ? (
        <Card className="p-8 text-center text-muted-foreground">
          Aucun participant dans ce programme.
        </Card>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="sticky left-0 bg-card z-10 min-w-[200px]">Participant</TableHead>
                {sessions.map(s => (
                  <TableHead key={s.id} className="text-center min-w-[90px] text-xs">
                    {format(new Date(s.session_date), "dd/MM", { locale: fr })}
                    <br />
                    <span className="text-muted-foreground font-normal">{format(new Date(s.session_date), "EEE", { locale: fr })}</span>
                  </TableHead>
                ))}
                <TableHead className="text-center min-w-[80px]">Présences</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedParticipants.map(p => {
                const stats = getParticipantStats(p.id);
                return (
                  <TableRow key={p.id}>
                    <TableCell className="sticky left-0 bg-card z-10">
                      <div className="flex items-center gap-2">
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">{p.full_name}</p>
                          <div className="flex items-center gap-1.5">
                            <Badge variant={p.role === "mentor" ? "default" : "secondary"} className="text-[10px] px-1.5 py-0">
                              {PARTICIPANT_ROLES[p.role as keyof typeof PARTICIPANT_ROLES]}
                            </Badge>
                            {p.institution && <span className="text-[10px] text-muted-foreground truncate">{p.institution}</span>}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    {sessions.map(s => {
                      const status = getStatus(p.id, s.id);
                      return (
                        <TableCell key={s.id} className="text-center">
                          {status === "present" && <CheckCircle2 className="h-4 w-4 text-success mx-auto" />}
                          {status === "absent" && <XCircle className="h-4 w-4 text-destructive mx-auto" />}
                          {status === "en_attente" && <Clock className="h-4 w-4 text-warning mx-auto" />}
                          {!status && <span className="text-muted-foreground">—</span>}
                        </TableCell>
                      );
                    })}
                    <TableCell className="text-center">
                      <span className="text-sm font-semibold text-foreground">
                        {stats.present}/{stats.total}
                      </span>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
