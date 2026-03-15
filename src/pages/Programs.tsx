import { useState } from "react";
import {
  usePrograms, useAddProgram, useUpdateProgram, useDeleteProgram,
  useProgramParticipants, useAddParticipant, useUpdateParticipant, useDeleteParticipant,
  useProgramSessions, useAddSession, useUpdateSession, useDeleteSession,
  useCreateAttendanceRecords, generateParticipantCode,
  type Program, type ProgramParticipant, type ProgramSession,
  PARTICIPANT_ROLES,
} from "@/lib/program-store";
import { useAddVisitor, generateVisitorId } from "@/lib/supabase-store";
import { findDuplicates, type DuplicateCandidate } from "@/lib/duplicate-check";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Plus, ArrowLeft, Users, Calendar, CreditCard, Pencil, BookOpen, GraduationCap, Building, Trash2, AlertTriangle, Check, Link as LinkIcon } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import MembershipCard from "@/components/MembershipCard";

export default function Programs() {
  const { role } = useAuth();
  const canEdit = role === "admin" || role === "director";
  const canDelete = role === "admin";

  const { data: programs = [], isLoading } = usePrograms();
  const addProgram = useAddProgram();
  const updateProgram = useUpdateProgram();
  const deleteProgram = useDeleteProgram();
  const [selectedProgram, setSelectedProgram] = useState<Program | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [editProgram, setEditProgram] = useState<Program | null>(null);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newStart, setNewStart] = useState("");
  const [newEnd, setNewEnd] = useState("");
  const [newLogo, setNewLogo] = useState("");

  const openEditProgram = (p: Program) => {
    setEditProgram(p);
    setNewName(p.name);
    setNewDesc(p.description || "");
    setNewStart(p.start_date || "");
    setNewEnd(p.end_date || "");
    setNewLogo(p.logo_url || "");
  };

  const handleCreateProgram = async () => {
    if (!newName.trim()) return;
    try {
      await addProgram.mutateAsync({
        name: newName.trim(),
        description: newDesc.trim() || undefined,
        start_date: newStart || undefined,
        end_date: newEnd || undefined,
        logo_url: newLogo.trim() || undefined,
      });
      toast.success("Programme créé !");
      setShowCreate(false);
      setNewName(""); setNewDesc(""); setNewStart(""); setNewEnd(""); setNewLogo("");
    } catch { toast.error("Erreur lors de la création"); }
  };

  const handleUpdateProgram = async () => {
    if (!editProgram || !newName.trim()) return;
    try {
      await updateProgram.mutateAsync({
        id: editProgram.id,
        name: newName.trim(),
        description: newDesc.trim() || null,
        start_date: newStart || null,
        end_date: newEnd || null,
        logo_url: newLogo.trim() || null,
      });
      toast.success("Programme modifié !");
      setSelectedProgram(prev => prev?.id === editProgram.id ? { ...prev, name: newName.trim(), description: newDesc.trim() || null, start_date: newStart || null, end_date: newEnd || null, logo_url: newLogo.trim() || null } : prev);
      setEditProgram(null);
      setNewName(""); setNewDesc(""); setNewStart(""); setNewEnd(""); setNewLogo("");
      setNewName(""); setNewDesc(""); setNewStart(""); setNewEnd("");
    } catch { toast.error("Erreur"); }
  };

  const handleDeleteProgram = async (p: Program) => {
    if (!confirm(`Supprimer le programme "${p.name}" et toutes ses données ?`)) return;
    try {
      await deleteProgram.mutateAsync(p.id);
      toast.success("Programme supprimé !");
    } catch { toast.error("Erreur lors de la suppression"); }
  };

  if (selectedProgram) {
    return <ProgramDetail program={selectedProgram} onBack={() => setSelectedProgram(null)} onEditProgram={openEditProgram} canEdit={canEdit} canDelete={canDelete} />;
  }

  const programFormFields = () => (
    <div className="space-y-4 pt-2">
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-muted-foreground">Nom du programme</label>
        <Input placeholder="Ex: Formation Leadership 2026" value={newName} onChange={e => setNewName(e.target.value)} />
      </div>
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-muted-foreground">Description (optionnel)</label>
        <Input placeholder="Brève description du programme" value={newDesc} onChange={e => setNewDesc(e.target.value)} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">Date début</label>
          <Input type="date" value={newStart} onChange={e => setNewStart(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">Date fin</label>
          <Input type="date" value={newEnd} onChange={e => setNewEnd(e.target.value)} />
        </div>
      </div>
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
          <LinkIcon className="h-3 w-3" /> Lien du logo du programme (optionnel)
        </label>
        <Input placeholder="https://example.com/logo.png" value={newLogo} onChange={e => setNewLogo(e.target.value)} />
        {newLogo && (
          <div className="flex items-center gap-2 mt-1">
            <img src={newLogo} alt="Logo" className="h-8 w-8 rounded object-contain border border-border" onError={e => (e.currentTarget.style.display = "none")} />
            <span className="text-[10px] text-muted-foreground">Aperçu du logo</span>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div>
      <div className="page-header flex items-center justify-between">
        <div>
          <h1 className="page-title flex items-center gap-2.5">
            <div className="icon-box h-9 w-9">
              <BookOpen className="h-4.5 w-4.5 text-primary-foreground" />
            </div>
            Programmes
          </h1>
          <p className="page-subtitle">Gérez les programmes et leurs participants</p>
        </div>
        {canEdit && (
          <Dialog open={showCreate} onOpenChange={setShowCreate}>
            <DialogTrigger asChild>
              <Button className="gap-2 rounded-xl shadow-md" style={{ background: "var(--gradient-primary)" }}>
                <Plus className="h-4 w-4" /> Nouveau programme
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Créer un programme</DialogTitle></DialogHeader>
              {programFormFields()}
              <Button onClick={handleCreateProgram} disabled={addProgram.isPending} className="w-full mt-2" style={{ background: "var(--gradient-primary)" }}>
                {addProgram.isPending ? "Création..." : "Créer le programme"}
              </Button>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1,2,3].map(i => (
            <Card key={i} className="p-6 animate-pulse">
              <div className="h-4 bg-muted rounded w-2/3 mb-3" />
              <div className="h-3 bg-muted rounded w-1/2" />
            </Card>
          ))}
        </div>
      ) : programs.length === 0 ? (
        <Card className="p-12 text-center border-dashed border-2">
          <div className="icon-box h-14 w-14 mx-auto mb-4">
            <BookOpen className="h-6 w-6 text-primary-foreground" />
          </div>
          <h3 className="font-semibold text-foreground mb-1">Aucun programme</h3>
          <p className="text-sm text-muted-foreground">Cliquez sur "Nouveau programme" pour commencer.</p>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {programs.map(p => (
            <Card key={p.id} className="stat-card cursor-pointer group" onClick={() => setSelectedProgram(p)}>
              <div className="flex items-start justify-between">
                {p.logo_url ? (
                  <img src={p.logo_url} alt={p.name} className="h-10 w-10 rounded-xl object-contain mb-3" />
                ) : (
                  <div className="icon-box h-10 w-10 mb-3">
                    <BookOpen className="h-5 w-5 text-primary-foreground" />
                  </div>
                )}
                <div className="flex gap-1">
                  {canEdit && (
                    <Button size="icon" variant="ghost" className="opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8" onClick={e => { e.stopPropagation(); openEditProgram(p); }}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                  )}
                  {canDelete && (
                    <Button size="icon" variant="ghost" className="opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8 text-destructive hover:text-destructive" onClick={e => { e.stopPropagation(); handleDeleteProgram(p); }}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              </div>
              <h3 className="font-semibold text-foreground text-lg">{p.name}</h3>
              {p.description && <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{p.description}</p>}
              {(p.start_date || p.end_date) && (
                <div className="mt-3 flex items-center gap-2 text-xs">
                  <Badge variant="secondary" className="font-normal">
                    <Calendar className="h-3 w-3 mr-1" />
                    {p.start_date && format(new Date(p.start_date), "dd MMM yyyy", { locale: fr })}
                    {p.start_date && p.end_date && " → "}
                    {p.end_date && format(new Date(p.end_date), "dd MMM yyyy", { locale: fr })}
                  </Badge>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      {/* Edit program dialog */}
      <Dialog open={!!editProgram} onOpenChange={v => { if (!v) { setEditProgram(null); setNewName(""); setNewDesc(""); setNewStart(""); setNewEnd(""); setNewLogo(""); } }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Modifier le programme</DialogTitle></DialogHeader>
          {programFormFields()}
          <Button onClick={handleUpdateProgram} disabled={updateProgram.isPending} className="w-full mt-2">
            {updateProgram.isPending ? "..." : "Enregistrer"}
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ---- Program Detail ----

function ProgramDetail({ program, onBack, onEditProgram, canEdit, canDelete }: { program: Program; onBack: () => void; onEditProgram: (p: Program) => void; canEdit: boolean; canDelete: boolean }) {
  const { data: participants = [] } = useProgramParticipants(program.id);
  const { data: sessions = [] } = useProgramSessions(program.id);
  const addParticipant = useAddParticipant();
  const updateParticipant = useUpdateParticipant();
  const deleteParticipant = useDeleteParticipant();
  const addSession = useAddSession();
  const updateSession = useUpdateSession();
  const deleteSession = useDeleteSession();
  const createAttendance = useCreateAttendanceRecords();
  const addVisitor = useAddVisitor();

  const [showAddParticipant, setShowAddParticipant] = useState(false);
  const [editPart, setEditPart] = useState<ProgramParticipant | null>(null);
  const [pName, setPName] = useState("");
  const [pGender, setPGender] = useState("");
  const [pDateOfBirth, setPDateOfBirth] = useState("");
  const [pPhone, setPPhone] = useState("");
  const [pEmail, setPEmail] = useState("");
  const [pRole, setPRole] = useState("eleve");
  const [pInstitution, setPInstitution] = useState("");
  const [pNeighborhood, setPNeighborhood] = useState("");
  const [pOccupation, setPOccupation] = useState("");
  const [pPhoto, setPPhoto] = useState("");

  const [showAddSession, setShowAddSession] = useState(false);
  const [editSess, setEditSess] = useState<ProgramSession | null>(null);
  const [sessionDate, setSessionDate] = useState("");

  const [cardParticipant, setCardParticipant] = useState<typeof participants[0] | null>(null);

  // Duplicate detection
  const [duplicates, setDuplicates] = useState<DuplicateCandidate[]>([]);
  const [checkingDuplicates, setCheckingDuplicates] = useState(false);
  const [duplicateChecked, setDuplicateChecked] = useState(false);
  const [selectedDuplicate, setSelectedDuplicate] = useState<DuplicateCandidate | null>(null);
  const [fieldsModifiedAfterDuplicate, setFieldsModifiedAfterDuplicate] = useState(false);
  // Store snapshot of duplicate values to detect modifications
  const [duplicateSnapshot, setDuplicateSnapshot] = useState<Record<string, string>>({});

  // Check if current form values differ from the selected duplicate snapshot
  const checkIfModified = (field: string, value: string, snapshot: Record<string, string>) => {
    const updated = { ...snapshot, [field]: value };
    // We don't store updated snapshot, just check if ANY field differs
    const currentValues: Record<string, string> = {
      gender: pGender, date_of_birth: pDateOfBirth, phone: pPhone,
      email: pEmail, neighborhood: pNeighborhood, occupation: pOccupation,
      photo: pPhoto, institution: pInstitution,
      [field]: value, // override with new value
    };
    const isDifferent = Object.keys(snapshot).some(k => (currentValues[k] || "") !== (snapshot[k] || ""));
    setFieldsModifiedAfterDuplicate(isDifferent);
  };

  // Wrap each setter to track modifications
  const handleFieldChange = (field: string, value: string, setter: (v: string) => void) => {
    setter(value);
    if (selectedDuplicate) {
      checkIfModified(field, value, duplicateSnapshot);
    }
  };

  const programPrefix = program.name.substring(0, 3).toUpperCase().replace(/\s/g, "");

  const resetParticipantForm = () => {
    setPName(""); setPGender(""); setPDateOfBirth(""); setPPhone(""); setPEmail(""); setPRole("eleve"); setPInstitution(""); setPNeighborhood(""); setPOccupation(""); setPPhoto("");
    setDuplicates([]); setDuplicateChecked(false); setSelectedDuplicate(null); setFieldsModifiedAfterDuplicate(false); setDuplicateSnapshot({});
  };

  const handleCheckDuplicates = async (name: string) => {
    if (name.trim().length < 3) { setDuplicates([]); setDuplicateChecked(false); return; }
    setCheckingDuplicates(true);
    try {
      const results = await findDuplicates(name.trim());
      setDuplicates(results);
      setDuplicateChecked(true);
    } catch { /* ignore */ }
    setCheckingDuplicates(false);
  };

  const fillFromDuplicate = (d: DuplicateCandidate) => {
    setSelectedDuplicate(d);
    setFieldsModifiedAfterDuplicate(false);
    const snapshot: Record<string, string> = {
      gender: d.gender || "", date_of_birth: d.date_of_birth || "",
      phone: d.phone || "", email: d.email || "",
      neighborhood: d.neighborhood || "", occupation: d.occupation || "",
      photo: d.photo || "", institution: d.institution || "",
    };
    setDuplicateSnapshot(snapshot);
    setPGender(d.gender || "");
    setPDateOfBirth(d.date_of_birth || "");
    setPPhone(d.phone || "");
    setPEmail(d.email || "");
    setPNeighborhood(d.neighborhood || "");
    setPOccupation(d.occupation || "");
    setPPhoto(d.photo || "");
    if (d.institution) setPInstitution(d.institution);
    toast.success("Données pré-remplies. Vérifiez et modifiez si nécessaire.");
  };

    setEditPart(p);
    setPName(p.full_name);
    setPGender((p as any).gender || "");
    setPDateOfBirth((p as any).date_of_birth || "");
    setPPhone(p.phone || "");
    setPEmail(p.email || "");
    setPRole(p.role);
    setPInstitution(p.institution || "");
    setPNeighborhood((p as any).neighborhood || "");
    setPOccupation((p as any).occupation || "");
    setPPhoto(p.photo || "");
  };

  // Determine if we should just link existing person or create new
  const isLinkingExisting = selectedDuplicate && !fieldsModifiedAfterDuplicate;

  const handleAddParticipant = async () => {
    if (!pName.trim()) return;
    try {
      const code = await generateParticipantCode(programPrefix);
      await addParticipant.mutateAsync({
        program_id: program.id,
        participant_code: code,
        full_name: pName.trim(),
        gender: pGender || "other",
        date_of_birth: pDateOfBirth || undefined,
        phone: pPhone || undefined,
        email: pEmail || undefined,
        neighborhood: pNeighborhood || "—",
        occupation: pOccupation || "—",
        institution: pInstitution.trim() || undefined,
        role: pRole,
        photo: pPhoto || undefined,
      });

      // If linking existing duplicate (no modifications), don't create a new visitor
      if (isLinkingExisting) {
        toast.success("Participant existant ajouté au programme !");
      } else {
        // New person or modified data → also add as visitor
        if (!selectedDuplicate || selectedDuplicate.source !== "visitor") {
          try {
            const visitorId = await generateVisitorId();
            await addVisitor.mutateAsync({
              visitor_id: visitorId,
              full_name: pName.trim(),
              gender: pGender || "other",
              phone: pPhone || "—",
              email: pEmail || undefined,
              neighborhood: pNeighborhood || "—",
              occupation: pOccupation || "—",
              date_of_birth: pDateOfBirth || undefined,
              photo: pPhoto || undefined,
            });
          } catch { /* visitor might already exist, ignore */ }
        }
        toast.success("Nouveau participant créé et enregistré comme visiteur !");
      }

      setShowAddParticipant(false);
      resetParticipantForm();
    } catch { toast.error("Erreur"); }
  };

  const handleUpdateParticipant = async () => {
    if (!editPart || !pName.trim()) return;
    try {
      await updateParticipant.mutateAsync({
        id: editPart.id,
        program_id: program.id,
        full_name: pName.trim(),
        gender: pGender || null,
        date_of_birth: pDateOfBirth || null,
        phone: pPhone || null,
        email: pEmail || null,
        neighborhood: pNeighborhood || null,
        occupation: pOccupation || null,
        institution: pInstitution.trim() || null,
        role: pRole,
        photo: pPhoto || null,
      });
      toast.success("Participant modifié !");
      setEditPart(null);
      resetParticipantForm();
    } catch { toast.error("Erreur"); }
  };

  const handleDeleteParticipant = async (p: ProgramParticipant) => {
    if (!confirm(`Supprimer le participant "${p.full_name}" ?`)) return;
    try {
      await deleteParticipant.mutateAsync({ id: p.id, programId: program.id });
      toast.success("Participant supprimé !");
    } catch { toast.error("Erreur"); }
  };

  const handleAddSession = async () => {
    if (!sessionDate) return;
    try {
      const session = await addSession.mutateAsync({ program_id: program.id, session_date: sessionDate });
      if (participants.length > 0) {
        await createAttendance.mutateAsync(
          participants.map(p => ({ participant_id: p.id, session_id: session.id }))
        );
      }
      toast.success("Session ajoutée avec présences initialisées !");
      setShowAddSession(false);
      setSessionDate("");
    } catch { toast.error("Erreur"); }
  };

  const handleUpdateSession = async () => {
    if (!editSess || !sessionDate) return;
    try {
      await updateSession.mutateAsync({ id: editSess.id, session_date: sessionDate, program_id: program.id });
      toast.success("Session modifiée !");
      setEditSess(null);
      setSessionDate("");
    } catch { toast.error("Erreur"); }
  };

  const handleDeleteSession = async (s: ProgramSession) => {
    if (!confirm(`Supprimer cette session et ses données de présence ?`)) return;
    try {
      await deleteSession.mutateAsync({ id: s.id, programId: program.id });
      toast.success("Session supprimée !");
    } catch { toast.error("Erreur"); }
  };

  const participantFormContent = (onSubmit: () => void, isPending: boolean, submitLabel: string, isNew = false) => (
    <div className="space-y-5 pt-2">
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-muted-foreground">Nom complet <span className="text-destructive">*</span></label>
        <div className="flex gap-2">
          <Input placeholder="Entrez le nom complet" value={pName} onChange={e => setPName(e.target.value)} className="rounded-xl h-11 flex-1" onBlur={() => isNew && handleCheckDuplicates(pName)} />
          {isNew && (
            <Button type="button" variant="outline" size="sm" className="rounded-xl h-11 px-3 shrink-0" onClick={() => handleCheckDuplicates(pName)} disabled={checkingDuplicates}>
              {checkingDuplicates ? "..." : "Vérifier"}
            </Button>
          )}
        </div>
      </div>

      {/* Duplicate alert */}
      {isNew && duplicateChecked && duplicates.length > 0 && (
        <Alert className="border-warning/50 bg-warning/5">
          <AlertTriangle className="h-4 w-4 text-warning" />
          <AlertDescription className="space-y-2">
            <p className="text-sm font-medium">⚠️ Personne(s) similaire(s) trouvée(s) :</p>
            {duplicates.map(d => (
              <div key={d.id} className="flex items-center justify-between gap-2 p-2 rounded-lg bg-background border border-border/50">
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{d.full_name}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {d.source === "visitor" ? "Visiteur" : "Participant"} • {d.phone || "—"} • {d.code}
                  </p>
                </div>
                <Button type="button" size="sm" variant="secondary" className="shrink-0 gap-1 text-xs" onClick={() => fillFromDuplicate(d)}>
                  <Check className="h-3 w-3" /> Utiliser
                </Button>
              </div>
            ))}
            <p className="text-[10px] text-muted-foreground">Si c'est la même personne, cliquez "Utiliser" pour pré-remplir. Sinon, continuez normalement.</p>
          </AlertDescription>
        </Alert>
      )}
      {isNew && duplicateChecked && duplicates.length === 0 && (
        <p className="text-xs text-success flex items-center gap-1"><Check className="h-3 w-3" /> Aucun doublon détecté</p>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">Genre</label>
          <Select value={pGender} onValueChange={v => handleFieldChange("gender", v, setPGender)}>
            <SelectTrigger className="rounded-xl h-11"><SelectValue placeholder="Sélectionner" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="male">Homme</SelectItem>
              <SelectItem value="female">Femme</SelectItem>
              <SelectItem value="other">Autre</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">Date de naissance</label>
          <Input type="date" value={pDateOfBirth} onChange={e => handleFieldChange("date_of_birth", e.target.value, setPDateOfBirth)} className="rounded-xl h-11" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">Téléphone</label>
          <Input placeholder="+257 xx xxx xxx" value={pPhone} onChange={e => setPPhone(e.target.value)} className="rounded-xl h-11" />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">Email (optionnel)</label>
          <Input type="email" placeholder="email@exemple.com" value={pEmail} onChange={e => setPEmail(e.target.value)} className="rounded-xl h-11" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">Quartier / Commune</label>
          <Input placeholder="ex: Mushasha" value={pNeighborhood} onChange={e => setPNeighborhood(e.target.value)} className="rounded-xl h-11" />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">Profession</label>
          <Input placeholder="ex: Étudiant, Entrepreneur" value={pOccupation} onChange={e => setPOccupation(e.target.value)} className="rounded-xl h-11" />
        </div>
      </div>

      <div className="space-y-1.5">
        <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
          <Building className="h-3 w-3" /> Institution (école, université...)
        </label>
        <Input placeholder="Ex: Université du Burundi" value={pInstitution} onChange={e => setPInstitution(e.target.value)} className="rounded-xl h-11" />
      </div>

      <div className="space-y-1.5">
        <label className="text-xs font-medium text-muted-foreground">Rôle dans le programme <span className="text-destructive">*</span></label>
        <Select value={pRole} onValueChange={setPRole}>
          <SelectTrigger className="rounded-xl h-11"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="eleve">🎓 Élève</SelectItem>
            <SelectItem value="mentor">⭐ Mentor</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <label className="text-xs font-medium text-muted-foreground">Lien photo passeport (optionnel)</label>
        <Input placeholder="https://lh3.googleusercontent.com/d/..." value={pPhoto} onChange={e => setPPhoto(e.target.value)} className="rounded-xl h-11" />
        <p className="text-[10px] text-muted-foreground">Format Google Drive : https://lh3.googleusercontent.com/d/ID</p>
      </div>

      <Button onClick={onSubmit} disabled={isPending} className="w-full rounded-xl h-12 text-sm font-semibold" style={{ background: "var(--gradient-primary)" }}>
        {isPending ? "..." : submitLabel}
      </Button>
    </div>
  );

  const mentorCount = participants.filter(p => p.role === "mentor").length;
  const eleveCount = participants.filter(p => p.role === "eleve").length;

  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <Button variant="ghost" onClick={onBack} className="gap-2 mb-3 -ml-2 text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Retour aux programmes
        </Button>
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            {program.logo_url ? (
              <img src={program.logo_url} alt={program.name} className="h-12 w-12 rounded-xl object-contain shrink-0" />
            ) : (
              <div className="icon-box h-12 w-12 shrink-0">
                <BookOpen className="h-6 w-6 text-primary-foreground" />
              </div>
            )}
            <div>
              <h1 className="page-title">{program.name}</h1>
              {program.description && <p className="page-subtitle">{program.description}</p>}
              {(program.start_date || program.end_date) && (
                <Badge variant="secondary" className="mt-2 font-normal">
                  <Calendar className="h-3 w-3 mr-1" />
                  {program.start_date && format(new Date(program.start_date), "dd MMM yyyy", { locale: fr })}
                  {program.start_date && program.end_date && " → "}
                  {program.end_date && format(new Date(program.end_date), "dd MMM yyyy", { locale: fr })}
                </Badge>
              )}
            </div>
          </div>
          {canEdit && (
            <Button variant="outline" size="sm" className="gap-1.5 rounded-xl" onClick={() => onEditProgram(program)}>
              <Pencil className="h-3.5 w-3.5" /> Modifier
            </Button>
          )}
        </div>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <Card className="p-4 text-center border-l-4 border-l-primary">
          <p className="text-2xl font-bold text-foreground">{participants.length}</p>
          <p className="text-xs text-muted-foreground">Participants</p>
        </Card>
        <Card className="p-4 text-center border-l-4 border-l-accent">
          <p className="text-2xl font-bold text-foreground">{mentorCount}</p>
          <p className="text-xs text-muted-foreground">Mentors</p>
        </Card>
        <Card className="p-4 text-center border-l-4 border-l-warning">
          <p className="text-2xl font-bold text-foreground">{sessions.length}</p>
          <p className="text-xs text-muted-foreground">Sessions</p>
        </Card>
      </div>

      <Tabs defaultValue="participants" className="space-y-4">
        <TabsList className="bg-muted/60 p-1 rounded-xl">
          <TabsTrigger value="participants" className="gap-1.5 rounded-lg data-[state=active]:shadow-sm">
            <Users className="h-3.5 w-3.5" /> Participants ({participants.length})
          </TabsTrigger>
          <TabsTrigger value="sessions" className="gap-1.5 rounded-lg data-[state=active]:shadow-sm">
            <Calendar className="h-3.5 w-3.5" /> Sessions ({sessions.length})
          </TabsTrigger>
        </TabsList>

        {/* Participants tab */}
        <TabsContent value="participants" className="space-y-4">
          {canEdit && (
            <div className="flex justify-end">
              <Dialog open={showAddParticipant} onOpenChange={v => { setShowAddParticipant(v); if (!v) resetParticipantForm(); }}>
                <DialogTrigger asChild>
                  <Button size="sm" className="gap-2 rounded-xl shadow-sm" style={{ background: "var(--gradient-primary)" }}>
                    <Plus className="h-4 w-4" /> Ajouter un participant
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>Ajouter un participant</DialogTitle></DialogHeader>
                  {participantFormContent(handleAddParticipant, addParticipant.isPending, "Ajouter", true)}
                </DialogContent>
              </Dialog>
            </div>
          )}

          {participants.length === 0 ? (
            <Card className="p-10 text-center border-dashed border-2">
              <div className="icon-box h-12 w-12 mx-auto mb-3">
                <Users className="h-5 w-5 text-primary-foreground" />
              </div>
              <h3 className="font-semibold text-foreground mb-1">Aucun participant</h3>
              <p className="text-sm text-muted-foreground">Ajoutez des élèves et mentors au programme</p>
            </Card>
          ) : (
            <div className="space-y-2">
              {participants.map(p => (
                <Card key={p.id} className="flex items-center gap-4 p-4 transition-all hover:shadow-md group">
                  {p.photo ? (
                    <img src={p.photo} alt={p.full_name} className="h-11 w-11 rounded-full object-cover ring-2 ring-border" />
                  ) : (
                    <div className={`h-11 w-11 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${
                      p.role === "mentor" 
                        ? "bg-primary/10 text-primary ring-2 ring-primary/20" 
                        : "bg-muted text-muted-foreground ring-2 ring-border"
                    }`}>
                      {p.full_name.charAt(0)}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm text-foreground truncate">{p.full_name}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-muted-foreground font-mono">{p.participant_code}</span>
                      {p.institution && (
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Building className="h-3 w-3" /> {p.institution}
                        </span>
                      )}
                    </div>
                  </div>
                  <Badge variant={p.role === "mentor" ? "default" : "secondary"} className={p.role === "mentor" ? "shadow-sm" : ""}>
                    {p.role === "mentor" ? "⭐ " : "🎓 "}
                    {PARTICIPANT_ROLES[p.role as keyof typeof PARTICIPANT_ROLES] || p.role}
                  </Badge>
                  <div className="flex items-center gap-1">
                    {canEdit && (
                      <Button size="icon" variant="ghost" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => openEditParticipant(p)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                    )}
                    {canDelete && (
                      <Button size="icon" variant="ghost" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive" onClick={() => handleDeleteParticipant(p)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                    <Button size="sm" variant="outline" className="gap-1.5 rounded-lg" onClick={() => setCardParticipant(p)}>
                      <CreditCard className="h-3.5 w-3.5" /> Carte
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Sessions tab */}
        <TabsContent value="sessions" className="space-y-4">
          {canEdit && (
            <div className="flex justify-end">
              <Dialog open={showAddSession} onOpenChange={v => { setShowAddSession(v); if (!v) setSessionDate(""); }}>
                <DialogTrigger asChild>
                  <Button size="sm" className="gap-2 rounded-xl shadow-sm" style={{ background: "var(--gradient-primary)" }}>
                    <Plus className="h-4 w-4" /> Ajouter une session
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>Ajouter une date de session</DialogTitle></DialogHeader>
                  <div className="space-y-4 pt-2">
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-muted-foreground">Date de la session</label>
                      <Input type="date" value={sessionDate} onChange={e => setSessionDate(e.target.value)} />
                    </div>
                    <Button onClick={handleAddSession} disabled={addSession.isPending} className="w-full" style={{ background: "var(--gradient-primary)" }}>
                      {addSession.isPending ? "Ajout..." : "Ajouter la session"}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          )}

          {sessions.length === 0 ? (
            <Card className="p-10 text-center border-dashed border-2">
              <div className="icon-box-accent h-12 w-12 mx-auto mb-3">
                <Calendar className="h-5 w-5 text-accent-foreground" />
              </div>
              <h3 className="font-semibold text-foreground mb-1">Aucune session</h3>
              <p className="text-sm text-muted-foreground">Planifiez les dates de présence</p>
            </Card>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {sessions.map(s => (
                <Card key={s.id} className="p-4 flex items-center gap-3 group transition-all hover:shadow-md">
                  <div className="icon-box-accent h-10 w-10 shrink-0">
                    <Calendar className="h-5 w-5 text-accent-foreground" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-foreground text-sm capitalize">
                      {format(new Date(s.session_date), "EEEE", { locale: fr })}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(s.session_date), "dd MMMM yyyy", { locale: fr })}
                    </p>
                  </div>
                  <div className="flex gap-1">
                    {canEdit && (
                      <Button size="icon" variant="ghost" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => { setEditSess(s); setSessionDate(s.session_date); }}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                    )}
                    {canDelete && (
                      <Button size="icon" variant="ghost" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive" onClick={() => handleDeleteSession(s)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Edit participant dialog */}
      <Dialog open={!!editPart} onOpenChange={v => { if (!v) { setEditPart(null); resetParticipantForm(); } }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Modifier le participant</DialogTitle></DialogHeader>
          {participantFormContent(handleUpdateParticipant, updateParticipant.isPending, "Enregistrer")}
        </DialogContent>
      </Dialog>

      {/* Edit session dialog */}
      <Dialog open={!!editSess} onOpenChange={v => { if (!v) { setEditSess(null); setSessionDate(""); } }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Modifier la session</DialogTitle></DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Date de la session</label>
              <Input type="date" value={sessionDate} onChange={e => setSessionDate(e.target.value)} />
            </div>
            <Button onClick={handleUpdateSession} disabled={updateSession.isPending} className="w-full">
              {updateSession.isPending ? "..." : "Enregistrer"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Card dialog */}
      <Dialog open={!!cardParticipant} onOpenChange={() => setCardParticipant(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Carte de membre</DialogTitle></DialogHeader>
          {cardParticipant && (
            <div className="space-y-3">
              <div className="text-center">
                <Badge className="shadow-sm" style={{ background: "var(--gradient-primary)" }}>{program.name}</Badge>
              </div>
              <MembershipCard
                fullName={cardParticipant.full_name}
                visitorId={cardParticipant.participant_code}
                photo={cardParticipant.photo}
                programName={program.name}
                institution={cardParticipant.institution}
                programLogo={program.logo_url}
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
