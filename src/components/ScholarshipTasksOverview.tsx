import { useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Target, AlertCircle, CalendarIcon, ExternalLink, User } from "lucide-react";
import { format, isPast, isToday, differenceInDays, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { useProgramTasks, TASK_STATUS_LABELS, type ProgramTask, type TaskStatus } from "@/lib/program-tasks-store";
import type { ProgramParticipant } from "@/lib/program-store";

interface Props {
  programId: string;
  participants: ProgramParticipant[];
  onOpenParticipantTasks: (p: ProgramParticipant) => void;
}

type DeadlineInfo = {
  label: string;
  className: string;
  alert: boolean;
  overdue: boolean;
} | null;

function computeDeadlineInfo(t: ProgramTask): DeadlineInfo {
  if (!t.deadline) return null;
  const d = parseISO(t.deadline);
  const isValidated = t.status === "valide";
  if (isValidated) {
    const validatedDate = t.validated_at ? new Date(t.validated_at) : null;
    const onTime = validatedDate ? validatedDate <= new Date(d.getTime() + 86400000) : true;
    return onTime
      ? { label: "✓ Atteinte dans les délais", className: "bg-emerald-600 hover:bg-emerald-600 text-white border-transparent", alert: false, overdue: false }
      : { label: "⚠ Atteinte en retard", className: "bg-amber-600 hover:bg-amber-600 text-white border-transparent", alert: false, overdue: true };
  }
  if (isPast(d) && !isToday(d)) {
    return { label: `En retard (${Math.abs(differenceInDays(d, new Date()))}j)`, className: "bg-destructive hover:bg-destructive text-destructive-foreground border-transparent", alert: true, overdue: true };
  }
  if (isToday(d)) {
    return { label: "Échéance aujourd'hui", className: "bg-amber-500 hover:bg-amber-500 text-white border-transparent", alert: true, overdue: false };
  }
  const days = differenceInDays(d, new Date());
  return { label: `Dans ${days + 1}j`, className: "border-primary/40 text-primary", alert: false, overdue: false };
}

export default function ScholarshipTasksOverview({ programId, participants, onOpenParticipantTasks }: Props) {
  const { data: tasks = [], isLoading } = useProgramTasks(programId);

  const participantsById = useMemo(() => {
    const m = new Map<string, ProgramParticipant>();
    participants.forEach(p => m.set(p.id, p));
    return m;
  }, [participants]);

  const grouped = useMemo(() => {
    const g: Record<TaskStatus, ProgramTask[]> = { en_cours: [], soumis: [], valide: [] };
    tasks.forEach(t => { g[t.status]?.push(t); });
    return g;
  }, [tasks]);

  const overdueCount = useMemo(
    () => grouped.en_cours.filter(t => {
      if (!t.deadline) return false;
      const d = parseISO(t.deadline);
      return isPast(d) && !isToday(d);
    }).length,
    [grouped.en_cours]
  );

  if (isLoading) {
    return <Card className="p-6 text-center text-sm text-muted-foreground">Chargement…</Card>;
  }

  if (tasks.length === 0) {
    return (
      <Card className="p-10 text-center border-dashed border-2">
        <div className="icon-box h-12 w-12 mx-auto mb-3">
          <Target className="h-5 w-5 text-primary-foreground" />
        </div>
        <h3 className="font-semibold text-foreground mb-1">Aucune tâche</h3>
        <p className="text-sm text-muted-foreground">
          Ajoutez des tâches via le bouton "Tâches" sur chaque participant.
        </p>
      </Card>
    );
  }

  const renderTask = (t: ProgramTask) => {
    const participant = participantsById.get(t.participant_id);
    const di = computeDeadlineInfo(t);
    return (
      <Card key={t.id} className="p-3 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <h4 className="font-semibold text-sm truncate">{t.title}</h4>
            <button
              onClick={() => participant && onOpenParticipantTasks(participant)}
              className="mt-1 inline-flex items-center gap-1.5 text-xs text-primary hover:underline"
            >
              <User className="h-3 w-3" />
              {participant?.full_name ?? "Participant supprimé"}
              {participant && (
                <span className="text-muted-foreground font-mono">({participant.participant_code})</span>
              )}
            </button>
          </div>
          {di && (
            <Badge variant="outline" className={cn("gap-1 shrink-0", di.className)}>
              {di.alert ? <AlertCircle className="h-3 w-3" /> : <CalendarIcon className="h-3 w-3" />}
              {di.label}
            </Badge>
          )}
        </div>
        <p className="text-xs text-muted-foreground line-clamp-2">{t.expected_result}</p>
        <div className="flex items-center justify-between gap-2 text-xs">
          {t.deadline ? (
            <span className="text-muted-foreground">
              📅 {format(parseISO(t.deadline), "PPP", { locale: fr })}
            </span>
          ) : <span className="text-muted-foreground italic">Sans deadline</span>}
          {t.submission_link && (
            <a
              href={t.submission_link}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline inline-flex items-center gap-1 truncate max-w-[200px]"
            >
              Lien <ExternalLink className="h-3 w-3 shrink-0" />
            </a>
          )}
        </div>
      </Card>
    );
  };

  return (
    <div className="space-y-3">
      {overdueCount > 0 && (
        <Card className="p-3 border-destructive/40 bg-destructive/5 flex items-center gap-2 text-sm">
          <AlertCircle className="h-4 w-4 text-destructive shrink-0" />
          <span><strong>{overdueCount}</strong> tâche{overdueCount > 1 ? "s" : ""} en retard à traiter</span>
        </Card>
      )}

      <Tabs defaultValue="en_cours" className="space-y-3">
        <TabsList className="bg-muted/60 p-1 rounded-xl">
          <TabsTrigger value="en_cours" className="rounded-lg">
            ⏳ En cours ({grouped.en_cours.length})
          </TabsTrigger>
          <TabsTrigger value="soumis" className="rounded-lg">
            📤 Soumis ({grouped.soumis.length})
          </TabsTrigger>
          <TabsTrigger value="valide" className="rounded-lg">
            ✅ Validé ({grouped.valide.length})
          </TabsTrigger>
        </TabsList>

        {(["en_cours", "soumis", "valide"] as TaskStatus[]).map(s => (
          <TabsContent key={s} value={s} className="space-y-2">
            {grouped[s].length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">
                Aucune tâche {TASK_STATUS_LABELS[s].toLowerCase()}
              </p>
            ) : (
              grouped[s].map(renderTask)
            )}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
