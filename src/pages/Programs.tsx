import { useState } from "react";
import { usePrograms, useAddProgram, useSubPrograms, useAddSubProgram, useProgramParticipants, useAddParticipant, useProgramSessions, useAddSession, useCreateAttendanceRecords, generateParticipantCode, type Program, PARTICIPANT_ROLES } from "@/lib/program-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, ArrowLeft, Users, Calendar, FolderTree, CreditCard } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import MembershipCard from "@/components/MembershipCard";

export default function Programs() {
  const { data: programs = [], isLoading } = usePrograms();
  const addProgram = useAddProgram();
  const [selectedProgram, setSelectedProgram] = useState<Program | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newStart, setNewStart] = useState("");
  const [newEnd, setNewEnd] = useState("");

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
      setNewName("");
      setNewDesc("");
      setNewStart("");
      setNewEnd("");
    } catch {
      toast.error("Erreur lors de la création");
    }
  };

  if (selectedProgram) {
    return <ProgramDetail program={selectedProgram} onBack={() => setSelectedProgram(null)} />;
  }

  return (
    <div>
      <div className="page-header flex items-center justify-between">
        <div>
          <h1 className="page-title">Programmes</h1>
          <p className="page-subtitle">Gérez les programmes et leurs participants</p>
        </div>
        <Dialog open={showCreate} onOpenChange={setShowCreate}>
          <DialogTrigger asChild>
            <Button className="gap-2 rounded-xl"><Plus className="h-4 w-4" /> Nouveau programme</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Créer un programme</DialogTitle></DialogHeader>
            <div className="space-y-3 pt-2">
              <Input placeholder="Nom du programme" value={newName} onChange={e => setNewName(e.target.value)} />
              <Input placeholder="Description (optionnel)" value={newDesc} onChange={e => setNewDesc(e.target.value)} />
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-muted-foreground">Date début</label>
                  <Input type="date" value={newStart} onChange={e => setNewStart(e.target.value)} />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Date fin</label>
                  <Input type="date" value={newEnd} onChange={e => setNewEnd(e.target.value)} />
                </div>
              </div>
              <Button onClick={handleCreateProgram} disabled={addProgram.isPending} className="w-full">
                {addProgram.isPending ? "Création..." : "Créer"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <p className="text-muted-foreground">Chargement...</p>
      ) : programs.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="text-muted-foreground">Aucun programme créé. Cliquez sur "Nouveau programme" pour commencer.</p>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {programs.map(p => (
            <Card
              key={p.id}
              className="cursor-pointer p-5 transition-all hover:shadow-md"
              onClick={() => setSelectedProgram(p)}
            >
              <h3 className="font-semibold text-foreground">{p.name}</h3>
              {p.description && <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{p.description}</p>}
              <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                {p.start_date && <span>{format(new Date(p.start_date), "dd MMM yyyy", { locale: fr })}</span>}
                {p.start_date && p.end_date && <span>→</span>}
                {p.end_date && <span>{format(new Date(p.end_date), "dd MMM yyyy", { locale: fr })}</span>}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

// ---- Program Detail ----

function ProgramDetail({ program, onBack }: { program: Program; onBack: () => void }) {
  const { data: subPrograms = [] } = useSubPrograms(program.id);
  const { data: participants = [] } = useProgramParticipants(program.id);
  const { data: sessions = [] } = useProgramSessions(program.id);
  const addSubProgram = useAddSubProgram();
  const addParticipant = useAddParticipant();
  const addSession = useAddSession();
  const createAttendance = useCreateAttendanceRecords();

  const [showAddSub, setShowAddSub] = useState(false);
  const [subName, setSubName] = useState("");

  const [showAddParticipant, setShowAddParticipant] = useState(false);
  const [pName, setPName] = useState("");
  const [pPhone, setPPhone] = useState("");
  const [pEmail, setPEmail] = useState("");
  const [pRole, setPRole] = useState("eleve");
  const [pSubProgram, setPSubProgram] = useState<string>("");
  const [pPhoto, setPPhoto] = useState("");

  const [showAddSession, setShowAddSession] = useState(false);
  const [sessionDate, setSessionDate] = useState("");

  const [cardParticipant, setCardParticipant] = useState<typeof participants[0] | null>(null);

  const programPrefix = program.name.substring(0, 3).toUpperCase().replace(/\s/g, "");

  const handleAddSubProgram = async () => {
    if (!subName.trim()) return;
    try {
      await addSubProgram.mutateAsync({ program_id: program.id, name: subName.trim() });
      toast.success("Sous-programme ajouté !");
      setShowAddSub(false);
      setSubName("");
    } catch { toast.error("Erreur"); }
  };

  const handleAddParticipant = async () => {
    if (!pName.trim()) return;
    try {
      const code = await generateParticipantCode(programPrefix);
      await addParticipant.mutateAsync({
        program_id: program.id,
        sub_program_id: pSubProgram || undefined,
        participant_code: code,
        full_name: pName.trim(),
        phone: pPhone || undefined,
        email: pEmail || undefined,
        role: pRole,
        photo: pPhoto || undefined,
      });
      toast.success("Participant ajouté !");
      setShowAddParticipant(false);
      setPName("");
      setPPhone("");
      setPEmail("");
      setPRole("eleve");
      setPSubProgram("");
      setPPhoto("");
    } catch { toast.error("Erreur"); }
  };

  const handleAddSession = async () => {
    if (!sessionDate) return;
    try {
      const session = await addSession.mutateAsync({ program_id: program.id, session_date: sessionDate });
      // Create attendance records for all participants
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

  return (
    <div>
      <div className="page-header">
        <Button variant="ghost" onClick={onBack} className="gap-2 mb-2">
          <ArrowLeft className="h-4 w-4" /> Retour
        </Button>
        <h1 className="page-title">{program.name}</h1>
        {program.description && <p className="page-subtitle">{program.description}</p>}
      </div>

      <Tabs defaultValue="participants" className="space-y-4">
        <TabsList>
          <TabsTrigger value="participants" className="gap-1.5"><Users className="h-3.5 w-3.5" /> Participants ({participants.length})</TabsTrigger>
          <TabsTrigger value="sessions" className="gap-1.5"><Calendar className="h-3.5 w-3.5" /> Sessions ({sessions.length})</TabsTrigger>
          <TabsTrigger value="subprograms" className="gap-1.5"><FolderTree className="h-3.5 w-3.5" /> Sous-programmes ({subPrograms.length})</TabsTrigger>
        </TabsList>

        {/* Participants tab */}
        <TabsContent value="participants" className="space-y-4">
          <div className="flex justify-end">
            <Dialog open={showAddParticipant} onOpenChange={setShowAddParticipant}>
              <DialogTrigger asChild>
                <Button size="sm" className="gap-2 rounded-xl"><Plus className="h-4 w-4" /> Ajouter un participant</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Ajouter un participant</DialogTitle></DialogHeader>
                <div className="space-y-3 pt-2">
                  <Input placeholder="Nom complet" value={pName} onChange={e => setPName(e.target.value)} />
                  <Input placeholder="Téléphone" value={pPhone} onChange={e => setPPhone(e.target.value)} />
                  <Input placeholder="Email (optionnel)" value={pEmail} onChange={e => setPEmail(e.target.value)} />
                  <Input placeholder="Lien photo (optionnel)" value={pPhoto} onChange={e => setPPhoto(e.target.value)} />
                  <Select value={pRole} onValueChange={setPRole}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="eleve">Élève</SelectItem>
                      <SelectItem value="mentor">Mentor</SelectItem>
                    </SelectContent>
                  </Select>
                  {subPrograms.length > 0 && (
                    <Select value={pSubProgram} onValueChange={setPSubProgram}>
                      <SelectTrigger><SelectValue placeholder="Sous-programme (optionnel)" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">Aucun</SelectItem>
                        {subPrograms.map(s => (
                          <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                  <Button onClick={handleAddParticipant} disabled={addParticipant.isPending} className="w-full">
                    {addParticipant.isPending ? "Ajout..." : "Ajouter"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {participants.length === 0 ? (
            <Card className="p-6 text-center text-muted-foreground">Aucun participant</Card>
          ) : (
            <div className="space-y-2">
              {participants.map(p => (
                <Card key={p.id} className="flex items-center gap-4 p-4">
                  {p.photo ? (
                    <img src={p.photo} alt={p.full_name} className="h-10 w-10 rounded-full object-cover" />
                  ) : (
                    <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center text-sm font-semibold text-muted-foreground">
                      {p.full_name.charAt(0)}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm text-foreground truncate">{p.full_name}</p>
                    <p className="text-xs text-muted-foreground font-mono">{p.participant_code}</p>
                  </div>
                  <Badge variant={p.role === "mentor" ? "default" : "secondary"}>
                    {PARTICIPANT_ROLES[p.role as keyof typeof PARTICIPANT_ROLES] || p.role}
                  </Badge>
                  <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setCardParticipant(p)}>
                    <CreditCard className="h-3.5 w-3.5" /> Carte
                  </Button>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Sessions tab */}
        <TabsContent value="sessions" className="space-y-4">
          <div className="flex justify-end">
            <Dialog open={showAddSession} onOpenChange={setShowAddSession}>
              <DialogTrigger asChild>
                <Button size="sm" className="gap-2 rounded-xl"><Plus className="h-4 w-4" /> Ajouter une session</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Ajouter une date de session</DialogTitle></DialogHeader>
                <div className="space-y-3 pt-2">
                  <Input type="date" value={sessionDate} onChange={e => setSessionDate(e.target.value)} />
                  <Button onClick={handleAddSession} disabled={addSession.isPending} className="w-full">
                    {addSession.isPending ? "Ajout..." : "Ajouter"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {sessions.length === 0 ? (
            <Card className="p-6 text-center text-muted-foreground">Aucune session planifiée</Card>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {sessions.map(s => (
                <Card key={s.id} className="p-4">
                  <p className="font-medium text-foreground">
                    {format(new Date(s.session_date), "EEEE dd MMMM yyyy", { locale: fr })}
                  </p>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Sub-programs tab */}
        <TabsContent value="subprograms" className="space-y-4">
          <div className="flex justify-end">
            <Dialog open={showAddSub} onOpenChange={setShowAddSub}>
              <DialogTrigger asChild>
                <Button size="sm" className="gap-2 rounded-xl"><Plus className="h-4 w-4" /> Ajouter un sous-programme</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Ajouter un sous-programme</DialogTitle></DialogHeader>
                <div className="space-y-3 pt-2">
                  <Input placeholder="Nom du sous-programme" value={subName} onChange={e => setSubName(e.target.value)} />
                  <Button onClick={handleAddSubProgram} disabled={addSubProgram.isPending} className="w-full">
                    {addSubProgram.isPending ? "Ajout..." : "Ajouter"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {subPrograms.length === 0 ? (
            <Card className="p-6 text-center text-muted-foreground">Aucun sous-programme</Card>
          ) : (
            <div className="space-y-2">
              {subPrograms.map(s => (
                <Card key={s.id} className="p-4">
                  <p className="font-medium text-foreground">{s.name}</p>
                  {s.description && <p className="text-sm text-muted-foreground">{s.description}</p>}
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Card dialog */}
      <Dialog open={!!cardParticipant} onOpenChange={() => setCardParticipant(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Carte de membre - {program.name}</DialogTitle></DialogHeader>
          {cardParticipant && (
            <ProgramMembershipCard
              participant={cardParticipant}
              programName={program.name}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ProgramMembershipCard({ participant, programName }: { participant: { full_name: string; participant_code: string; photo: string | null }; programName: string }) {
  return (
    <div className="space-y-2">
      <div className="text-center">
        <Badge variant="outline" className="mb-3">{programName}</Badge>
      </div>
      <MembershipCard
        fullName={participant.full_name}
        visitorId={participant.participant_code}
        photo={participant.photo}
        programName={programName}
      />
    </div>
  );
}
