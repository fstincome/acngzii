import { useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Plus, Pencil, Trash2, CheckCircle2, Send, RotateCcw, ExternalLink, Target, CalendarIcon, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { format, isPast, isToday, differenceInDays, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import { useTranslation } from "react-i18next";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import {
  useParticipantTasks, useAddProgramTask, useUpdateProgramTask,
  useSubmitTaskLink, useValidateTask, useReopenTask, useDeleteProgramTask,
  TASK_STATUS_LABELS, type ProgramTask, type TaskStatus,
} from "@/lib/program-tasks-store";

interface Props {
  open: boolean;
  onClose: () => void;
  participantId: string;
  participantName: string;
  programId: string;
  canDelete?: boolean;
}

const STATUS_STYLE: Record<TaskStatus, { variant: "default" | "secondary" | "outline"; emoji: string; className: string }> = {
  en_cours: { variant: "secondary", emoji: "⏳", className: "" },
  soumis: { variant: "outline", emoji: "📤", className: "border-amber-500/50 text-amber-700 dark:text-amber-400" },
  valide: { variant: "default", emoji: "✅", className: "bg-emerald-600 hover:bg-emerald-600" },
};

export default function ScholarshipTasksDialog({
  open, onClose, participantId, participantName, programId, canDelete,
}: Props) {
  const { t, i18n } = useTranslation();
  const dateLocale = i18n.language === "fr" ? fr : undefined;
  const { data: tasks = [], isLoading } = useParticipantTasks(participantId);
  const addTask = useAddProgramTask();
  const updateTask = useUpdateProgramTask();
  const submitLink = useSubmitTaskLink();
  const validateTask = useValidateTask();
  const reopenTask = useReopenTask();
  const deleteTask = useDeleteProgramTask();

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<ProgramTask | null>(null);
  const [title, setTitle] = useState("");
  const [expected, setExpected] = useState("");
  const [reporting, setReporting] = useState("");
  const [deadline, setDeadline] = useState<Date | undefined>(undefined);

  const [linkDialog, setLinkDialog] = useState<ProgramTask | null>(null);
  const [linkValue, setLinkValue] = useState("");

  const resetForm = () => {
    setTitle(""); setExpected(""); setReporting(""); setDeadline(undefined); setEditing(null); setShowForm(false);
  };

  const openEdit = (t: ProgramTask) => {
    setEditing(t);
    setTitle(t.title);
    setExpected(t.expected_result);
    setReporting(t.reporting_instructions || "");
    setDeadline(t.deadline ? parseISO(t.deadline) : undefined);
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!title.trim() || !expected.trim()) {
      toast.error(t("programs.tasks.missingFields"));
      return;
    }
    try {
      if (editing) {
        await updateTask.mutateAsync({
          id: editing.id,
          participant_id: participantId,
          title: title.trim(),
          expected_result: expected.trim(),
          reporting_instructions: reporting.trim() || null,
          deadline: deadline ? format(deadline, "yyyy-MM-dd") : null,
        });
        toast.success(t("programs.tasks.updated"));
      } else {
        await addTask.mutateAsync({
          participant_id: participantId,
          program_id: programId,
          title: title.trim(),
          expected_result: expected.trim(),
          reporting_instructions: reporting.trim() || undefined,
          deadline: deadline ? format(deadline, "yyyy-MM-dd") : null,
        });
        toast.success(t("programs.tasks.added"));
      }
      resetForm();
    } catch {
      toast.error(t("programs.genericError"));
    }
  };

  const openLinkDialog = (t: ProgramTask) => {
    setLinkDialog(t);
    setLinkValue(t.submission_link || "");
  };

  const handleSubmitLink = async () => {
    if (!linkDialog) return;
    if (!linkValue.trim()) {
      toast.error(t("programs.tasks.linkRequired"));
      return;
    }
    try {
      await submitLink.mutateAsync({
        id: linkDialog.id,
        participant_id: participantId,
        submission_link: linkValue.trim(),
      });
      toast.success(t("programs.tasks.submitted"));
      setLinkDialog(null);
      setLinkValue("");
    } catch {
      toast.error(t("programs.genericError"));
    }
  };

  const handleValidate = async (t: ProgramTask) => {
    try {
      await validateTask.mutateAsync({ id: t.id, participant_id: participantId });
      toast.success(i18n.t("programs.tasks.validated"));
    } catch { toast.error(i18n.t("programs.genericError")); }
  };

  const handleReopen = async (t: ProgramTask) => {
    if (!confirm(i18n.t("programs.tasks.reopenConfirm"))) return;
    try {
      await reopenTask.mutateAsync({ id: t.id, participant_id: participantId });
      toast.success(i18n.t("programs.tasks.reopened"));
    } catch { toast.error(i18n.t("programs.genericError")); }
  };

  const handleDelete = async (t: ProgramTask) => {
    if (!confirm(i18n.t("programs.tasks.deleteConfirm", { title: t.title }))) return;
    try {
      await deleteTask.mutateAsync({ id: t.id, participant_id: participantId });
      toast.success(i18n.t("programs.tasks.deleted"));
    } catch { toast.error(i18n.t("programs.genericError")); }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={v => { if (!v) { resetForm(); onClose(); } }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Target className="h-5 w-5 text-primary" />
              {t("programs.tasks.title", { name: participantName })}
            </DialogTitle>
            <DialogDescription>{t("programs.tasks.description")}</DialogDescription>
          </DialogHeader>

          {!showForm && (
            <div className="flex justify-end">
              <Button onClick={() => setShowForm(true)} size="sm" className="gap-1.5">
                <Plus className="h-4 w-4" /> {t("programs.tasks.new")}
              </Button>
            </div>
          )}

          {showForm && (
            <Card className="p-4 space-y-3 border-primary/30">
              <div className="space-y-1.5">
                <Label>{t("programs.tasks.fields.title")}</Label>
                <Input
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder={t("programs.tasks.fields.titlePlaceholder")}
                  maxLength={200}
                />
              </div>
              <div className="space-y-1.5">
                <Label>{t("programs.tasks.fields.expected")}</Label>
                <Textarea
                  value={expected}
                  onChange={e => setExpected(e.target.value)}
                  placeholder={t("programs.tasks.fields.expectedPlaceholder")}
                  rows={3}
                  maxLength={1000}
                />
              </div>
              <div className="space-y-1.5">
                <Label>{t("programs.tasks.fields.reporting")}</Label>
                <Textarea
                  value={reporting}
                  onChange={e => setReporting(e.target.value)}
                  placeholder={t("programs.tasks.fields.reportingPlaceholder")}
                  rows={2}
                  maxLength={500}
                />
              </div>
              <div className="space-y-1.5">
                <Label>{t("programs.tasks.fields.deadline")}</Label>
                <div className="flex gap-2">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "flex-1 justify-start text-left font-normal",
                          !deadline && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {deadline ? format(deadline, "PPP", { locale: dateLocale }) : t("programs.tasks.fields.pickDate")}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={deadline}
                        onSelect={setDeadline}
                        initialFocus
                        className="pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                  {deadline && (
                    <Button variant="ghost" size="sm" onClick={() => setDeadline(undefined)}>
                      {t("programs.tasks.fields.clear")}
                    </Button>
                  )}
                </div>
              </div>
              <div className="flex gap-2 justify-end">
                <Button variant="ghost" onClick={resetForm}>{t("programs.tasks.cancel")}</Button>
                <Button
                  onClick={handleSave}
                  disabled={addTask.isPending || updateTask.isPending}
                >
                  {editing ? t("programs.tasks.save") : t("programs.tasks.add")}
                </Button>
              </div>
            </Card>
          )}

          <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-1">
            {isLoading ? (
              <p className="text-sm text-muted-foreground text-center py-4">{t("programs.tasks.loading")}</p>
            ) : tasks.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">{t("programs.tasks.empty")}</p>
            ) : (
              tasks.map(task => {
                const style = STATUS_STYLE[task.status];
                const deadlineDate = task.deadline ? parseISO(task.deadline) : null;
                const isValidated = task.status === "valide";
                let deadlineBadge: { label: string; className: string; icon: boolean } | null = null;
                if (deadlineDate) {
                  if (isValidated) {
                    const validatedDate = task.validated_at ? new Date(task.validated_at) : null;
                    const onTime = validatedDate ? validatedDate <= new Date(deadlineDate.getTime() + 86400000) : true;
                    deadlineBadge = onTime
                      ? { label: t("programs.tasks.deadline.onTime"), className: "bg-emerald-600 hover:bg-emerald-600 text-white border-transparent", icon: false }
                      : { label: t("programs.tasks.deadline.late"), className: "bg-amber-600 hover:bg-amber-600 text-white border-transparent", icon: false };
                  } else if (isPast(deadlineDate) && !isToday(deadlineDate)) {
                    deadlineBadge = { label: t("programs.tasks.deadline.overdue", { days: Math.abs(differenceInDays(deadlineDate, new Date())) }), className: "bg-destructive hover:bg-destructive text-destructive-foreground border-transparent", icon: true };
                  } else if (isToday(deadlineDate)) {
                    deadlineBadge = { label: t("programs.tasks.deadline.today"), className: "bg-amber-500 hover:bg-amber-500 text-white border-transparent", icon: true };
                  } else {
                    const days = differenceInDays(deadlineDate, new Date());
                    deadlineBadge = { label: t("programs.tasks.deadline.in", { days: days + 1 }), className: "border-primary/40 text-primary", icon: false };
                  }
                }
                return (
                  <Card key={task.id} className="p-4 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-sm">{task.title}</h4>
                        <div className="flex flex-wrap gap-1.5 mt-1">
                          <Badge variant={style.variant} className={style.className}>
                            {style.emoji} {t(`programs.tasks.status.${task.status}`)}
                          </Badge>
                          {deadlineBadge && (
                            <Badge variant="outline" className={cn("gap-1", deadlineBadge.className)}>
                              {deadlineBadge.icon ? <AlertCircle className="h-3 w-3" /> : <CalendarIcon className="h-3 w-3" />}
                              {deadlineBadge.label}
                            </Badge>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEdit(task)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        {canDelete && (
                          <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => handleDelete(task)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    </div>

                    <div className="text-xs space-y-1.5 pt-1">
                      <div>
                        <span className="font-medium text-muted-foreground">{t("programs.tasks.expectedLabel")} </span>
                        <span className="whitespace-pre-wrap">{task.expected_result}</span>
                      </div>
                      {task.reporting_instructions && (
                        <div>
                          <span className="font-medium text-muted-foreground">{t("programs.tasks.reportingLabel")} </span>
                          <span className="whitespace-pre-wrap">{task.reporting_instructions}</span>
                        </div>
                      )}
                      {deadlineDate && (
                        <div>
                          <span className="font-medium text-muted-foreground">{t("programs.tasks.deadlineLabel")} </span>
                          <span>{format(deadlineDate, "PPP", { locale: dateLocale })}</span>
                        </div>
                      )}
                      {task.submission_link && (
                        <div className="flex items-center gap-1.5">
                          <span className="font-medium text-muted-foreground">{t("programs.tasks.linkLabel")} </span>
                          <a
                            href={task.submission_link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary hover:underline inline-flex items-center gap-1 truncate max-w-[300px]"
                          >
                            {task.submission_link} <ExternalLink className="h-3 w-3 shrink-0" />
                          </a>
                        </div>
                      )}
                      {task.submitted_at && (
                        <p className="text-muted-foreground">
                          {t("programs.tasks.submittedOn", { date: format(new Date(task.submitted_at), "PPp", { locale: dateLocale }) })}
                        </p>
                      )}
                      {task.validated_at && (
                        <p className="text-emerald-700 dark:text-emerald-400">
                          {t("programs.tasks.validatedOn", { date: format(new Date(task.validated_at), "PPp", { locale: dateLocale }) })}
                        </p>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-2 pt-2 border-t">
                      {task.status === "en_cours" && (
                        <Button size="sm" variant="outline" className="gap-1.5" onClick={() => openLinkDialog(task)}>
                          <Send className="h-3.5 w-3.5" /> {t("programs.tasks.submitLink")}
                        </Button>
                      )}
                      {task.status === "soumis" && (
                        <>
                          <Button size="sm" variant="outline" className="gap-1.5" onClick={() => openLinkDialog(task)}>
                            <Pencil className="h-3.5 w-3.5" /> {t("programs.tasks.editLink")}
                          </Button>
                          <Button size="sm" className="gap-1.5 bg-emerald-600 hover:bg-emerald-700" onClick={() => handleValidate(task)}>
                            <CheckCircle2 className="h-3.5 w-3.5" /> {t("programs.tasks.validate")}
                          </Button>
                        </>
                      )}
                      {task.status === "valide" && (
                        <Button size="sm" variant="outline" className="gap-1.5" onClick={() => handleReopen(task)}>
                          <RotateCcw className="h-3.5 w-3.5" /> {t("programs.tasks.reopen")}
                        </Button>
                      )}
                    </div>
                  </Card>
                );
              })
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!linkDialog} onOpenChange={v => { if (!v) { setLinkDialog(null); setLinkValue(""); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t("programs.tasks.submitTitle")}</DialogTitle>
            <DialogDescription>{t("programs.tasks.submitDesc")}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>{t("programs.tasks.linkValueLabel")}</Label>
              <Input
                type="url"
                value={linkValue}
                onChange={e => setLinkValue(e.target.value)}
                placeholder="https://…"
                maxLength={500}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => { setLinkDialog(null); setLinkValue(""); }}>{t("programs.tasks.cancel")}</Button>
              <Button onClick={handleSubmitLink} disabled={submitLink.isPending}>
                {submitLink.isPending ? t("programs.tasks.submitting") : t("programs.tasks.submitBtn")}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
