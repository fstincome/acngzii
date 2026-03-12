import { useState } from "react";
import {
  usePrograms, useAddProgram, useUpdateProgram,
  useProgramParticipants, useAddParticipant, useUpdateParticipant,
  useProgramSessions, useAddSession, useUpdateSession,
  useCreateAttendanceRecords, generateParticipantCode,
  type Program, type ProgramParticipant, type ProgramSession,
  PARTICIPANT_ROLES,
} from "@/lib/program-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, ArrowLeft, Users, Calendar, CreditCard, Pencil, BookOpen, GraduationCap, Building } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import MembershipCard from "@/components/MembershipCard";

export default function Programs() {
  const { data: programs = [], isLoading } = usePrograms();
  const addProgram = useAddProgram();
  const updateProgram = useUpdateProgram();
  const [selectedProgram, setSelectedProgram] = useState<Program | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [editProgram, setEditProgram] = useState<Program | null>(null);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newStart, setNewStart] = useState("");
  const [newEnd, setNewEnd] = useState("");

  const openEditProgram = (p: Program) => {
    setEditProgram(p);
    setNewName(p.name);
    setNewDesc(p.description || "");
    setNewStart(p.start_date || "");
    setNewEnd(p.end_date || "");
  };

  const handleCreateProgram = async () => {
    if (!newName.trim()) return;
    try {
      await addProgram.mutateAsync({
        name: newName.trim(),
        description: newDesc.trim() || undefined,
        start_date: newStart || undefined,
        end_date: newEnd || undefined,
      });
      toast.success("Programme créé !");
      setShowCreate(false);
      setNewName(""); setNewDesc(""); setNewStart(""); setNewEnd("");
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
      });
      toast.success("Programme modifié !");
      setSelectedProgram(prev => prev?.id === editProgram.id ? { ...prev, name: newName.trim(), description: newDesc.trim() || null, start_date: newStart || null, end_date: newEnd || null } : prev);
      setEditProgram(null);
      setNewName(""); setNewDesc(""); setNewStart(""); setNewEnd("");
    } catch { toast.error("Erreur"); }
  };

  if (selectedProgram) {
    return <ProgramDetail program={selectedProgram} onBack={() => setSelectedProgram(null)} onEditProgram={openEditProgram} />;
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
                <div className="icon-box h-10 w-10 mb-3">
                  <BookOpen className="h-5 w-5 text-primary-foreground" />
                </div>
                <Button size="icon" variant="ghost" className="opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8" onClick={e => { e.stopPropagation(); openEditProgram(p); }}>
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
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
      <Dialog open={!!editProgram} onOpenChange={v => { if (!v) { setEditProgram(null); setNewName(""); setNewDesc(""); setNewStart(""); setNewEnd(""); } }}>
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

function ProgramDetail({ program, onBack, onEditProgram }: { program: Program; onBack: () => void; onEditProgram: (p: Program) => void }) {
  const { data: participants = [] } = useProgramParticipants(program.id);
  const { data: sessions = [] } = useProgramSessions(program.id);
  const addParticipant = useAddParticipant();
  const updateParticipant = useUpdateParticipant();
  const addSession = useAddSession();
  const updateSession = useUpdateSession();
  const createAttendance = useCreateAttendanceRecords();

  const [showAddParticipant, setShowAddParticipant] = useState(false);
  const [editPart, setEditPart] = useState<ProgramParticipant | null>(null);
  const [pName, setPName] = useState("");
  const [pPhone, setPPhone] = useState("");
  const [pEmail, setPEmail] = useState("");
  const [pRole, setPRole] = useState("eleve");
  const [pInstitution, setPInstitution] = useState("");
  const [pPhoto, setPPhoto] = useState("");

  const [showAddSession, setShowAddSession] = useState(false);
  const [editSess, setEditSess] = useState<ProgramSession | null>(null);
  const [sessionDate, setSessionDate] = useState("");

  const [cardParticipant, setCardParticipant] = useState<typeof participants[0] | null>(null);

  const programPrefix = program.name.substring(0, 3).toUpperCase().replace(/\s/g, "");

  const resetParticipantForm = () => {
    setPName(""); setPPhone(""); setPEmail(""); setPRole("eleve"); setPInstitution(""); setPPhoto("");
  };

  const openEditParticipant = (p: ProgramParticipant) => {
    setEditPart(p);
    setPName(p.full_name);
    setPPhone(p.phone || "");
    setPEmail(p.email || "");
    setPRole(p.role);
    setPInstitution(p.institution || "");
    setPPhoto(p.photo || "");
  };

  const handleAddParticipant = async () => {
    if (!pName.trim()) return;
    try {
      const code = await generateParticipantCode(programPrefix);
      await addParticipant.mutateAsync({
        program_id: program.id,
        participant_code: code,
        full_name: pName.trim(),
        phone: pPhone || undefined,
        email: pEmail || undefined,
        institution: pInstitution.trim() || undefined,
        role: pRole,
        photo: pPhoto || undefined,
      });
      toast.success("Participant ajouté !");
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
        phone: pPhone || null,
        email: pEmail || null,
        institution: pInstitution.trim() || null,
        role: pRole,
        photo: pPhoto || null,
      });
      toast.success("Participant modifié !");
      setEditPart(null);
      resetParticipantForm();
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

  const participantFormContent = (onSubmit: () => void, isPending: boolean, submitLabel: string) => (
    <div className="space-y-4 pt-2">
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-muted-foreground">Nom complet</label>
        <Input placeholder="Ex: Jean Ndayishimiye" value={pName} onChange={e => setPName(e.target.value)} />
      </div>
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
          <Building className="h-3 w-3" /> Institution (école, université...)
        </label>
        <Input placeholder="Ex: Université du Burundi" value={pInstitution} onChange={e => setPInstitution(e.target.value)} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">Téléphone</label>
          <Input placeholder="+257..." value={pPhone} onChange={e => setPPhone(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">Email</label>
          <Input placeholder="optionnel" value={pEmail} onChange={e => setPEmail(e.target.value)} />
        </div>
      </div>
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-muted-foreground">Lien photo (optionnel)</label>
        <Input placeholder="https://..." value={pPhoto} onChange={e => setPPhoto(e.target.value)} />
      </div>
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-muted-foreground">Rôle</label>
        <Select value={pRole} onValueChange={setPRole}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="eleve">🎓 Élève</SelectItem>
            <SelectItem value="mentor">⭐ Mentor</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <Button onClick={onSubmit} disabled={isPending} className="w-full" style={{ background: "var(--gradient-primary)" }}>
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
            <div className="icon-box h-12 w-12 shrink-0">
              <BookOpen className="h-6 w-6 text-primary-foreground" />
            </div>
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
          <Button variant="outline" size="sm" className="gap-1.5 rounded-xl" onClick={() => onEditProgram(program)}>
            <Pencil className="h-3.5 w-3.5" /> Modifier
          </Button>
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
          <div className="flex justify-end">
            <Dialog open={showAddParticipant} onOpenChange={v => { setShowAddParticipant(v); if (!v) resetParticipantForm(); }}>
              <DialogTrigger asChild>
                <Button size="sm" className="gap-2 rounded-xl shadow-sm" style={{ background: "var(--gradient-primary)" }}>
                  <Plus className="h-4 w-4" /> Ajouter un participant
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Ajouter un participant</DialogTitle></DialogHeader>
                {participantFormContent(handleAddParticipant, addParticipant.isPending, "Ajouter")}
              </DialogContent>
            </Dialog>
          </div>

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
                    <Button size="icon" variant="ghost" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => openEditParticipant(p)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
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
                  <Button size="icon" variant="ghost" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => { setEditSess(s); setSessionDate(s.session_date); }}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
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
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
