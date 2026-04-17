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
import { Plus, Pencil, Trash2, CheckCircle2, Send, RotateCcw, ExternalLink, Target } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
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

  const [linkDialog, setLinkDialog] = useState<ProgramTask | null>(null);
  const [linkValue, setLinkValue] = useState("");

  const resetForm = () => {
    setTitle(""); setExpected(""); setReporting(""); setEditing(null); setShowForm(false);
  };

  const openEdit = (t: ProgramTask) => {
    setEditing(t);
    setTitle(t.title);
    setExpected(t.expected_result);
    setReporting(t.reporting_instructions || "");
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!title.trim() || !expected.trim()) {
      toast.error("Titre et résultat attendu requis");
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
        });
        toast.success("Tâche modifiée");
      } else {
        await addTask.mutateAsync({
          participant_id: participantId,
          program_id: programId,
          title: title.trim(),
          expected_result: expected.trim(),
          reporting_instructions: reporting.trim() || undefined,
        });
        toast.success("Tâche ajoutée");
      }
      resetForm();
    } catch {
      toast.error("Erreur");
    }
  };

  const openLinkDialog = (t: ProgramTask) => {
    setLinkDialog(t);
    setLinkValue(t.submission_link || "");
  };

  const handleSubmitLink = async () => {
    if (!linkDialog) return;
    if (!linkValue.trim()) {
      toast.error("Lien requis");
      return;
    }
    try {
      await submitLink.mutateAsync({
        id: linkDialog.id,
        participant_id: participantId,
        submission_link: linkValue.trim(),
      });
      toast.success("Compte rendu soumis !");
      setLinkDialog(null);
      setLinkValue("");
    } catch {
      toast.error("Erreur");
    }
  };

  const handleValidate = async (t: ProgramTask) => {
    try {
      await validateTask.mutateAsync({ id: t.id, participant_id: participantId });
      toast.success("Tâche validée");
    } catch { toast.error("Erreur"); }
  };

  const handleReopen = async (t: ProgramTask) => {
    if (!confirm("Rouvrir cette tâche ? Le lien et la validation seront effacés.")) return;
    try {
      await reopenTask.mutateAsync({ id: t.id, participant_id: participantId });
      toast.success("Tâche rouverte");
    } catch { toast.error("Erreur"); }
  };

  const handleDelete = async (t: ProgramTask) => {
    if (!confirm(`Supprimer la tâche "${t.title}" ?`)) return;
    try {
      await deleteTask.mutateAsync({ id: t.id, participant_id: participantId });
      toast.success("Tâche supprimée");
    } catch { toast.error("Erreur"); }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={v => { if (!v) { resetForm(); onClose(); } }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Target className="h-5 w-5 text-primary" />
              Tâches Scholarship — {participantName}
            </DialogTitle>
            <DialogDescription>
              Définissez les objectifs de la bourse et suivez les comptes rendus.
            </DialogDescription>
          </DialogHeader>

          {!showForm && (
            <div className="flex justify-end">
              <Button onClick={() => setShowForm(true)} size="sm" className="gap-1.5">
                <Plus className="h-4 w-4" /> Nouvelle tâche
              </Button>
            </div>
          )}

          {showForm && (
            <Card className="p-4 space-y-3 border-primary/30">
              <div className="space-y-1.5">
                <Label>Tâche / Objectif *</Label>
                <Input
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="Ex: Suivre la formation Python avancé"
                  maxLength={200}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Résultat attendu *</Label>
                <Textarea
                  value={expected}
                  onChange={e => setExpected(e.target.value)}
                  placeholder="Ex: Obtenir le certificat avec une note ≥ 80%"
                  rows={3}
                  maxLength={1000}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Moyen de rendre compte (optionnel)</Label>
                <Textarea
                  value={reporting}
                  onChange={e => setReporting(e.target.value)}
                  placeholder="Ex: Lien Google Drive du certificat, lien GitHub du projet…"
                  rows={2}
                  maxLength={500}
                />
              </div>
              <div className="flex gap-2 justify-end">
                <Button variant="ghost" onClick={resetForm}>Annuler</Button>
                <Button
                  onClick={handleSave}
                  disabled={addTask.isPending || updateTask.isPending}
                >
                  {editing ? "Enregistrer" : "Ajouter"}
                </Button>
              </div>
            </Card>
          )}

          <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-1">
            {isLoading ? (
              <p className="text-sm text-muted-foreground text-center py-4">Chargement…</p>
            ) : tasks.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                Aucune tâche. Cliquez sur "Nouvelle tâche" pour commencer.
              </p>
            ) : (
              tasks.map(t => {
                const style = STATUS_STYLE[t.status];
                return (
                  <Card key={t.id} className="p-4 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-sm">{t.title}</h4>
                        <Badge variant={style.variant} className={`mt-1 ${style.className}`}>
                          {style.emoji} {TASK_STATUS_LABELS[t.status]}
                        </Badge>
                      </div>
                      <div className="flex gap-1">
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEdit(t)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        {canDelete && (
                          <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => handleDelete(t)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    </div>

                    <div className="text-xs space-y-1.5 pt-1">
                      <div>
                        <span className="font-medium text-muted-foreground">Résultat attendu : </span>
                        <span className="whitespace-pre-wrap">{t.expected_result}</span>
                      </div>
                      {t.reporting_instructions && (
                        <div>
                          <span className="font-medium text-muted-foreground">Compte rendu : </span>
                          <span className="whitespace-pre-wrap">{t.reporting_instructions}</span>
                        </div>
                      )}
                      {t.submission_link && (
                        <div className="flex items-center gap-1.5">
                          <span className="font-medium text-muted-foreground">Lien : </span>
                          <a
                            href={t.submission_link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary hover:underline inline-flex items-center gap-1 truncate max-w-[300px]"
                          >
                            {t.submission_link} <ExternalLink className="h-3 w-3 shrink-0" />
                          </a>
                        </div>
                      )}
                      {t.submitted_at && (
                        <p className="text-muted-foreground">
                          Soumis le {format(new Date(t.submitted_at), "PPp", { locale: fr })}
                        </p>
                      )}
                      {t.validated_at && (
                        <p className="text-emerald-700 dark:text-emerald-400">
                          Validé le {format(new Date(t.validated_at), "PPp", { locale: fr })}
                        </p>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-2 pt-2 border-t">
                      {t.status === "en_cours" && (
                        <Button size="sm" variant="outline" className="gap-1.5" onClick={() => openLinkDialog(t)}>
                          <Send className="h-3.5 w-3.5" /> Soumettre un lien
                        </Button>
                      )}
                      {t.status === "soumis" && (
                        <>
                          <Button size="sm" variant="outline" className="gap-1.5" onClick={() => openLinkDialog(t)}>
                            <Pencil className="h-3.5 w-3.5" /> Modifier le lien
                          </Button>
                          <Button size="sm" className="gap-1.5 bg-emerald-600 hover:bg-emerald-700" onClick={() => handleValidate(t)}>
                            <CheckCircle2 className="h-3.5 w-3.5" /> Valider
                          </Button>
                        </>
                      )}
                      {t.status === "valide" && (
                        <Button size="sm" variant="outline" className="gap-1.5" onClick={() => handleReopen(t)}>
                          <RotateCcw className="h-3.5 w-3.5" /> Rouvrir
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
            <DialogTitle>Soumettre un compte rendu</DialogTitle>
            <DialogDescription>
              Collez le lien (Drive, GitHub, document, etc.) prouvant le résultat.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Lien du résultat *</Label>
              <Input
                type="url"
                value={linkValue}
                onChange={e => setLinkValue(e.target.value)}
                placeholder="https://…"
                maxLength={500}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => { setLinkDialog(null); setLinkValue(""); }}>Annuler</Button>
              <Button onClick={handleSubmitLink} disabled={submitLink.isPending}>
                {submitLink.isPending ? "..." : "Soumettre"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
