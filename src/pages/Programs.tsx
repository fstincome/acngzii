import { useState } from "react";
import {
  usePrograms, useAddProgram, useUpdateProgram, useDeleteProgram,
  useProgramParticipants, useAddParticipant, useUpdateParticipant, useDeleteParticipant,
  useProgramSessions, useAddSession, useUpdateSession, useDeleteSession,
  useCreateAttendanceRecords, generateParticipantCode,
  type Program, type ProgramParticipant, type ProgramSession,
  PARTICIPANT_ROLES,
} from "@/lib/program-store";
import { searchVisitorsByName, type DuplicateCandidate } from "@/lib/duplicate-check";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Plus, ArrowLeft, Users, Calendar, CreditCard, Pencil, BookOpen, GraduationCap, Building, Trash2, AlertTriangle, Check, Link as LinkIcon, Search, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import MembershipCard from "@/components/MembershipCard";
import ScholarshipTasksDialog from "@/components/ScholarshipTasksDialog";
import { useNavigate } from "react-router-dom";
import { Target } from "lucide-react";

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
  const navigate = useNavigate();
  const { data: participants = [] } = useProgramParticipants(program.id);
  const { data: sessions = [] } = useProgramSessions(program.id);
  const addParticipant = useAddParticipant();
  const updateParticipant = useUpdateParticipant();
  const deleteParticipant = useDeleteParticipant();
  const addSession = useAddSession();
  const updateSession = useUpdateSession();
  const deleteSession = useDeleteSession();
  const createAttendance = useCreateAttendanceRecords();

  const [showAddParticipant, setShowAddParticipant] = useState(false);
  const [editPart, setEditPart] = useState<ProgramParticipant | null>(null);

  // Search-based add flow
  const [searchName, setSearchName] = useState("");
  const [searchResults, setSearchResults] = useState<DuplicateCandidate[]>([]);
  const [searching, setSearching] = useState(false);
  const [searched, setSearched] = useState(false);
  const [selectedVisitor, setSelectedVisitor] = useState<DuplicateCandidate | null>(null);
  const [pRole, setPRole] = useState("eleve");

  // Edit form fields
  const [pName, setPName] = useState("");
  const [pGender, setPGender] = useState("");
  const [pDateOfBirth, setPDateOfBirth] = useState("");
  const [pPhone, setPPhone] = useState("");
  const [pEmail, setPEmail] = useState("");
  const [pInstitution, setPInstitution] = useState("");
  const [pNeighborhood, setPNeighborhood] = useState("");
  const [pOccupation, setPOccupation] = useState("");
  const [pPhoto, setPPhoto] = useState("");

  const [showAddSession, setShowAddSession] = useState(false);
  const [editSess, setEditSess] = useState<ProgramSession | null>(null);
  const [sessionDate, setSessionDate] = useState("");

  const [cardParticipant, setCardParticipant] = useState<typeof participants[0] | null>(null);
  const [tasksParticipant, setTasksParticipant] = useState<typeof participants[0] | null>(null);

  const isScholarship = program.name.trim().toLowerCase() === "scholarship";
  const programPrefix = program.name.substring(0, 3).toUpperCase().replace(/\s/g, "");

  const resetAddForm = () => {
    setSearchName("");
    setSearchResults([]);
    setSearched(false);
    setSelectedVisitor(null);
    setPRole("eleve");
  };

  const resetEditForm = () => {
    setPName(""); setPGender(""); setPDateOfBirth(""); setPPhone(""); setPEmail("");
    setPInstitution(""); setPNeighborhood(""); setPOccupation(""); setPPhoto("");
  };

  const handleSearch = async () => {
    if (searchName.trim().length < 2) {
      toast.error("Entrez au moins 2 caractères");
      return;
    }
    setSearching(true);
    try {
      const results = await searchVisitorsByName(searchName.trim());
      setSearchResults(results);
      setSearched(true);
    } catch { /* ignore */ }
    setSearching(false);
  };

  const handleSelectVisitor = (v: DuplicateCandidate) => {
    setSelectedVisitor(v);
  };

  const handleAddFromVisitor = async () => {
    if (!selectedVisitor) return;
    try {
      // Check if already a participant in this program
      const alreadyExists = participants.some(
        p => p.full_name.toLowerCase().trim() === selectedVisitor.full_name.toLowerCase().trim()
      );
      if (alreadyExists) {
        toast.error("Cette personne est déjà inscrite dans ce programme");
        return;
      }

      const code = await generateParticipantCode(programPrefix);
      await addParticipant.mutateAsync({
        program_id: program.id,
        participant_code: code,
        full_name: selectedVisitor.full_name,
        gender: selectedVisitor.gender || "other",
        date_of_birth: selectedVisitor.date_of_birth || undefined,
        phone: selectedVisitor.phone || undefined,
        email: selectedVisitor.email || undefined,
        neighborhood: selectedVisitor.neighborhood || "—",
        occupation: selectedVisitor.occupation || "—",
        institution: selectedVisitor.institution || undefined,
        role: pRole,
        photo: selectedVisitor.photo || undefined,
      });

      toast.success("Participant ajouté au programme !");
      setShowAddParticipant(false);
      resetAddForm();
    } catch { toast.error("Erreur"); }
  };

  const openEditParticipant = (p: ProgramParticipant) => {
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
      resetEditForm();
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

  // Edit participant form (for editing only, no search)
  const editParticipantForm = () => (
    <div className="space-y-5 pt-2">
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-muted-foreground">Nom complet <span className="text-destructive">*</span></label>
        <Input placeholder="Nom complet" value={pName} onChange={e => setPName(e.target.value)} className="rounded-xl h-11" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">Genre</label>
          <Select value={pGender} onValueChange={setPGender}>
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
          <Input type="date" value={pDateOfBirth} onChange={e => setPDateOfBirth(e.target.value)} className="rounded-xl h-11" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">Téléphone</label>
          <Input placeholder="+257 xx xxx xxx" value={pPhone} onChange={e => setPPhone(e.target.value)} className="rounded-xl h-11" />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">Email</label>
          <Input type="email" value={pEmail} onChange={e => setPEmail(e.target.value)} className="rounded-xl h-11" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">Quartier</label>
          <Input value={pNeighborhood} onChange={e => setPNeighborhood(e.target.value)} className="rounded-xl h-11" />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">Profession</label>
          <Input value={pOccupation} onChange={e => setPOccupation(e.target.value)} className="rounded-xl h-11" />
        </div>
      </div>
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
          <Building className="h-3 w-3" /> Institution
        </label>
        <Input value={pInstitution} onChange={e => setPInstitution(e.target.value)} className="rounded-xl h-11" />
      </div>
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-muted-foreground">Rôle <span className="text-destructive">*</span></label>
        <Select value={pRole} onValueChange={setPRole}>
          <SelectTrigger className="rounded-xl h-11"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="eleve">🎓 Élève</SelectItem>
            <SelectItem value="mentor">⭐ Mentor</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-muted-foreground">Lien photo (optionnel)</label>
        <Input value={pPhoto} onChange={e => setPPhoto(e.target.value)} className="rounded-xl h-11" />
      </div>
      <Button onClick={handleUpdateParticipant} disabled={updateParticipant.isPending} className="w-full rounded-xl h-12 text-sm font-semibold" style={{ background: "var(--gradient-primary)" }}>
        {updateParticipant.isPending ? "..." : "Enregistrer"}
      </Button>
    </div>
  );

  // Add participant dialog content: search → select → choose role → add
  const addParticipantContent = () => (
    <div className="space-y-5 pt-2">
      {/* Step 1: Search */}
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-muted-foreground">Rechercher un visiteur inscrit</label>
        <div className="flex gap-2">
          <Input
            placeholder="Tapez le nom du visiteur..."
            value={searchName}
            onChange={e => { setSearchName(e.target.value); setSearched(false); setSelectedVisitor(null); }}
            className="rounded-xl h-11 flex-1"
            onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); handleSearch(); } }}
          />
          <Button type="button" variant="outline" className="rounded-xl h-11 px-4 shrink-0 gap-1.5" onClick={handleSearch} disabled={searching}>
            <Search className="h-4 w-4" />
            {searching ? "..." : "Chercher"}
          </Button>
        </div>
      </div>

      {/* Search results */}
      {searched && searchResults.length > 0 && !selectedVisitor && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">{searchResults.length} résultat(s) trouvé(s) :</p>
          {searchResults.map(v => (
            <div
              key={v.id}
              className="flex items-center justify-between gap-3 p-3 rounded-xl bg-muted/40 border border-border/50 hover:border-primary/30 transition-colors cursor-pointer"
              onClick={() => handleSelectVisitor(v)}
            >
              <div className="flex items-center gap-3 min-w-0">
                {v.photo ? (
                  <img src={v.photo} alt={v.full_name} className="h-10 w-10 rounded-full object-cover ring-2 ring-border" />
                ) : (
                  <div className="h-10 w-10 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-bold shrink-0">
                    {v.full_name.charAt(0)}
                  </div>
                )}
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{v.full_name}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {v.code} • {v.phone || "—"} {v.institution ? `• ${v.institution}` : ""}
                  </p>
                </div>
              </div>
              <Button type="button" size="sm" variant="secondary" className="shrink-0 gap-1 text-xs">
                <Check className="h-3 w-3" /> Sélectionner
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* Not found message */}
      {searched && searchResults.length === 0 && (
        <Alert className="border-destructive/50 bg-destructive/5">
          <AlertTriangle className="h-4 w-4 text-destructive" />
          <AlertDescription className="space-y-3">
            <p className="text-sm font-medium">Aucun visiteur trouvé pour "{searchName}"</p>
            <p className="text-xs text-muted-foreground">
              Cette personne doit d'abord être inscrite comme visiteur avant d'être ajoutée à un programme.
            </p>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="gap-1.5 rounded-xl"
              onClick={() => {
                setShowAddParticipant(false);
                resetAddForm();
                navigate("/register");
              }}
            >
              <UserPlus className="h-3.5 w-3.5" /> Inscrire un visiteur
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Selected visitor → choose role and confirm */}
      {selectedVisitor && (
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-success/5 border border-success/30">
            <div className="flex items-center gap-3">
              {selectedVisitor.photo ? (
                <img src={selectedVisitor.photo} alt={selectedVisitor.full_name} className="h-12 w-12 rounded-full object-cover ring-2 ring-success/30" />
              ) : (
                <div className="h-12 w-12 rounded-full bg-success/10 text-success flex items-center justify-center text-lg font-bold shrink-0">
                  {selectedVisitor.full_name.charAt(0)}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-foreground">{selectedVisitor.full_name}</p>
                <p className="text-xs text-muted-foreground">
                  {selectedVisitor.code} • {selectedVisitor.phone || "—"}
                </p>
                {selectedVisitor.institution && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                    <Building className="h-3 w-3" /> {selectedVisitor.institution}
                  </p>
                )}
              </div>
              <Button type="button" size="sm" variant="ghost" className="text-xs text-muted-foreground" onClick={() => setSelectedVisitor(null)}>
                Changer
              </Button>
            </div>
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

          <Button
            onClick={handleAddFromVisitor}
            disabled={addParticipant.isPending}
            className="w-full rounded-xl h-12 text-sm font-semibold"
            style={{ background: "var(--gradient-primary)" }}
          >
            {addParticipant.isPending ? "Ajout..." : `➕ Ajouter ${selectedVisitor.full_name} au programme`}
          </Button>
        </div>
      )}
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
              <Dialog open={showAddParticipant} onOpenChange={v => { setShowAddParticipant(v); if (!v) resetAddForm(); }}>
                <DialogTrigger asChild>
                  <Button size="sm" className="gap-2 rounded-xl shadow-sm" style={{ background: "var(--gradient-primary)" }}>
                    <Plus className="h-4 w-4" /> Ajouter un participant
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>Ajouter un participant</DialogTitle></DialogHeader>
                  {addParticipantContent()}
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
                    {isScholarship && (
                      <Button size="sm" variant="outline" className="gap-1.5 rounded-lg" onClick={() => setTasksParticipant(p)}>
                        <Target className="h-3.5 w-3.5" /> Tâches
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
      <Dialog open={!!editPart} onOpenChange={v => { if (!v) { setEditPart(null); resetEditForm(); } }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Modifier le participant</DialogTitle></DialogHeader>
          {editParticipantForm()}
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

      {/* Scholarship tasks dialog */}
      {tasksParticipant && (
        <ScholarshipTasksDialog
          open={!!tasksParticipant}
          onClose={() => setTasksParticipant(null)}
          participantId={tasksParticipant.id}
          participantName={tasksParticipant.full_name}
          programId={program.id}
          canDelete={canDelete}
        />
      )}
    </div>
  );
}
