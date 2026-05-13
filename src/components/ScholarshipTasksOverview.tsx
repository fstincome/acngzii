import { useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Target, AlertCircle, CalendarIcon, ExternalLink, User } from "lucide-react";
import { format, isPast, isToday, differenceInDays, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { useProgramTasks, type ProgramTask, type TaskStatus } from "@/lib/program-tasks-store";
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

function computeDeadlineInfo(task: ProgramTask, t: (k: string, opts?: any) => string): DeadlineInfo {
  if (!task.deadline) return null;
  const d = parseISO(task.deadline);
  const isValidated = task.status === "valide";
  if (isValidated) {
    const validatedDate = task.validated_at ? new Date(task.validated_at) : null;
    const onTime = validatedDate ? validatedDate <= new Date(d.getTime() + 86400000) : true;
    return onTime
      ? { label: t("programs.tasks.deadline.onTime"), className: "bg-emerald-600 hover:bg-emerald-600 text-white border-transparent", alert: false, overdue: false }
      : { label: t("programs.tasks.deadline.late"), className: "bg-amber-600 hover:bg-amber-600 text-white border-transparent", alert: false, overdue: true };
  }
  if (isPast(d) && !isToday(d)) {
    return { label: t("programs.tasks.deadline.overdue", { days: Math.abs(differenceInDays(d, new Date())) }), className: "bg-destructive hover:bg-destructive text-destructive-foreground border-transparent", alert: true, overdue: true };
  }
  if (isToday(d)) {
    return { label: t("programs.tasks.deadline.today"), className: "bg-amber-500 hover:bg-amber-500 text-white border-transparent", alert: true, overdue: false };
  }
  const days = differenceInDays(d, new Date());
  return { label: t("programs.tasks.deadline.in", { days: days + 1 }), className: "border-primary/40 text-primary", alert: false, overdue: false };
}

export default function ScholarshipTasksOverview({ programId, participants, onOpenParticipantTasks }: Props) {
  const { t, i18n } = useTranslation();
  const dateLocale = i18n.language === "fr" ? fr : undefined;
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
    return <Card className="p-6 text-center text-sm text-muted-foreground">{t("programs.tasks.loading")}</Card>;
  }

  if (tasks.length === 0) {
    return (
      <Card className="p-10 text-center border-dashed border-2">
        <div className="icon-box h-12 w-12 mx-auto mb-3">
          <Target className="h-5 w-5 text-primary-foreground" />
        </div>
        <h3 className="font-semibold text-foreground mb-1">{t("programs.tasks.overview.empty")}</h3>
        <p className="text-sm text-muted-foreground">{t("programs.tasks.overview.emptyHint")}</p>
      </Card>
    );
  }

  const renderTask = (task: ProgramTask) => {
    const participant = participantsById.get(task.participant_id);
    const di = computeDeadlineInfo(task, t);
    return (
      <Card key={task.id} className="p-3 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <h4 className="font-semibold text-sm truncate">{task.title}</h4>
            <button
              onClick={() => participant && onOpenParticipantTasks(participant)}
              className="mt-1 inline-flex items-center gap-1.5 text-xs text-primary hover:underline"
            >
              <User className="h-3 w-3" />
              {participant?.full_name ?? t("programs.tasks.overview.deletedParticipant")}
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
        <p className="text-xs text-muted-foreground line-clamp-2">{task.expected_result}</p>
        <div className="flex items-center justify-between gap-2 text-xs">
          {task.deadline ? (
            <span className="text-muted-foreground">
              📅 {format(parseISO(task.deadline), "PPP", { locale: dateLocale })}
            </span>
          ) : <span className="text-muted-foreground italic">{t("programs.tasks.overview.noDeadline")}</span>}
          {task.submission_link && (
            <a
              href={task.submission_link}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline inline-flex items-center gap-1 truncate max-w-[200px]"
            >
              {t("programs.tasks.overview.linkShort")} <ExternalLink className="h-3 w-3 shrink-0" />
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
          <span>
            <strong>{overdueCount}</strong>{" "}
            {t(overdueCount > 1 ? "programs.tasks.overview.overdueAlert_other" : "programs.tasks.overview.overdueAlert_one", { count: overdueCount }).replace(/<\/?1>/g, "").replace(String(overdueCount), "").trim()}
          </span>
        </Card>
      )}

      <Tabs defaultValue="en_cours" className="space-y-3">
        <TabsList className="bg-muted/60 p-1 rounded-xl">
          <TabsTrigger value="en_cours" className="rounded-lg">
            {t("programs.tasks.overview.tabInProgress")} ({grouped.en_cours.length})
          </TabsTrigger>
          <TabsTrigger value="soumis" className="rounded-lg">
            {t("programs.tasks.overview.tabSubmitted")} ({grouped.soumis.length})
          </TabsTrigger>
          <TabsTrigger value="valide" className="rounded-lg">
            {t("programs.tasks.overview.tabValidated")} ({grouped.valide.length})
          </TabsTrigger>
        </TabsList>

        {(["en_cours", "soumis", "valide"] as TaskStatus[]).map(s => (
          <TabsContent key={s} value={s} className="space-y-2">
            {grouped[s].length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">
                {t("programs.tasks.overview.noneIn", { status: t(`programs.tasks.status.${s}`).toLowerCase() })}
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
