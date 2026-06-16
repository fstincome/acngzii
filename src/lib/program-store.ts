import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface Program {
  id: string;
  name: string;
  description: string | null;
  start_date: string | null;
  end_date: string | null;
  logo_url: string | null;
  created_at: string;
}

export interface ProgramParticipant {
  id: string;
  program_id: string;
  participant_code: string;
  full_name: string;
  gender: string;
  date_of_birth: string | null;
  phone: string | null;
  email: string | null;
  neighborhood: string | null;
  occupation: string | null;
  institution: string | null;
  role: "eleve" | "mentor";
  photo: string | null;
  created_at: string;
}

export interface ProgramSession {
  id: string;
  program_id: string;
  session_date: string;
  created_at: string;
}

export interface ProgramAttendance {
  id: string;
  participant_id: string;
  session_id: string;
  status: "en_attente" | "present" | "absent";
  room: string | null;
  marked_at: string | null;
  created_at: string;
}

export const PARTICIPANT_ROLES = {
  eleve: "Student",
  mentor: "Mentor",
};

export async function generateParticipantCode(programPrefix: string): Promise<string> {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code: string;
  let exists = true;
  while (exists) {
    let rand = "";
    for (let i = 0; i < 5; i++) {
      rand += chars[Math.floor(Math.random() * chars.length)];
    }
    code = `${programPrefix}-${rand}`;
    const { count } = await supabase
      .from("program_participants")
      .select("*", { count: "exact", head: true })
      .eq("participant_code", code);
    exists = (count ?? 0) > 0;
  }
  return code!;
}

/** Sort participants: mentors first, then students */
export function sortParticipants<T extends { role: string }>(list: T[]): T[] {
  return [...list].sort((a, b) => {
    if (a.role === "mentor" && b.role !== "mentor") return -1;
    if (a.role !== "mentor" && b.role === "mentor") return 1;
    return 0;
  });
}

// ---- Hooks ----

export function usePrograms() {
  return useQuery({
    queryKey: ["programs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("programs")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Program[];
    },
  });
}

export function useProgramParticipants(programId: string | undefined) {
  return useQuery({
    queryKey: ["program_participants", programId],
    queryFn: async () => {
      if (!programId) return [];
      const { data, error } = await supabase
        .from("program_participants")
        .select("*")
        .eq("program_id", programId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return sortParticipants((data ?? []) as ProgramParticipant[]);
    },
    enabled: !!programId,
  });
}

export function useProgramSessions(programId: string | undefined) {
  return useQuery({
    queryKey: ["program_sessions", programId],
    queryFn: async () => {
      if (!programId) return [];
      const { data, error } = await supabase
        .from("program_sessions")
        .select("*")
        .eq("program_id", programId)
        .order("session_date", { ascending: true });
      if (error) throw error;
      return (data ?? []) as ProgramSession[];
    },
    enabled: !!programId,
  });
}

export function useSessionAttendance(sessionId: string | undefined) {
  return useQuery({
    queryKey: ["program_attendance", sessionId],
    queryFn: async () => {
      if (!sessionId) return [];
      const { data, error } = await supabase
        .from("program_attendance")
        .select("*")
        .eq("session_id", sessionId);
      if (error) throw error;
      return (data ?? []) as ProgramAttendance[];
    },
    enabled: !!sessionId,
  });
}

export function useAllAttendanceForProgram(sessionIds: string[]) {
  return useQuery({
    queryKey: ["program_attendance_all", sessionIds],
    queryFn: async () => {
      if (sessionIds.length === 0) return [];
      const { data, error } = await supabase
        .from("program_attendance")
        .select("*")
        .in("session_id", sessionIds);
      if (error) throw error;
      return (data ?? []) as ProgramAttendance[];
    },
    enabled: sessionIds.length > 0,
  });
}

export function useAddProgram() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (p: { name: string; description?: string; start_date?: string; end_date?: string; logo_url?: string }) => {
      const { data, error } = await supabase.from("programs").insert(p).select().single();
      if (error) throw error;
      return data as Program;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["programs"] }),
  });
}

export function useUpdateProgram() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (p: { id: string; name: string; description?: string | null; start_date?: string | null; end_date?: string | null; logo_url?: string | null }) => {
      const { id, ...rest } = p;
      const { error } = await supabase.from("programs").update(rest).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["programs"] }),
  });
}

export function useAddParticipant() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (p: {
      program_id: string;
      participant_code: string;
      full_name: string;
      gender?: string;
      date_of_birth?: string;
      phone?: string;
      email?: string;
      neighborhood?: string;
      occupation?: string;
      institution?: string;
      role: string;
      photo?: string;
    }) => {
      const { data, error } = await supabase.from("program_participants").insert(p).select().single();
      if (error) throw error;
      return data as ProgramParticipant;
    },
    onSuccess: (_, vars) => qc.invalidateQueries({ queryKey: ["program_participants", vars.program_id] }),
  });
}

export function useUpdateParticipant() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (p: {
      id: string;
      program_id: string;
      full_name: string;
      gender?: string | null;
      date_of_birth?: string | null;
      phone?: string | null;
      email?: string | null;
      neighborhood?: string | null;
      occupation?: string | null;
      institution?: string | null;
      role: string;
      photo?: string | null;
    }) => {
      const { id, program_id, ...rest } = p;
      const { error } = await supabase.from("program_participants").update(rest).eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_, vars) => qc.invalidateQueries({ queryKey: ["program_participants", vars.program_id] }),
  });
}

export function useDeleteProgram() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (programId: string) => {
      // Delete attendance records for all sessions of this program
      const { data: sessions } = await supabase.from("program_sessions").select("id").eq("program_id", programId);
      if (sessions && sessions.length > 0) {
        const sessionIds = sessions.map(s => s.id);
        await supabase.from("program_attendance").delete().in("session_id", sessionIds);
      }
      await supabase.from("program_sessions").delete().eq("program_id", programId);
      await supabase.from("program_participants").delete().eq("program_id", programId);
      await supabase.from("sub_programs").delete().eq("program_id", programId);
      const { error } = await supabase.from("programs").delete().eq("id", programId);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["programs"] }),
  });
}

export function useDeleteParticipant() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, programId }: { id: string; programId: string }) => {
      await supabase.from("program_attendance").delete().eq("participant_id", id);
      const { error } = await supabase.from("program_participants").delete().eq("id", id);
      if (error) throw error;
      return programId;
    },
    onSuccess: (programId) => qc.invalidateQueries({ queryKey: ["program_participants", programId] }),
  });
}

export function useDeleteSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, programId }: { id: string; programId: string }) => {
      await supabase.from("program_attendance").delete().eq("session_id", id);
      const { error } = await supabase.from("program_sessions").delete().eq("id", id);
      if (error) throw error;
      return programId;
    },
    onSuccess: (programId) => qc.invalidateQueries({ queryKey: ["program_sessions", programId] }),
  });
}

export function useAddSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (p: { program_id: string; session_date: string }) => {
      const { data, error } = await supabase.from("program_sessions").insert(p).select().single();
      if (error) throw error;
      return data as ProgramSession;
    },
    onSuccess: (_, vars) => qc.invalidateQueries({ queryKey: ["program_sessions", vars.program_id] }),
  });
}

export function useUpdateSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (p: { id: string; session_date: string; program_id: string }) => {
      const { id, program_id, ...rest } = p;
      const { error } = await supabase.from("program_sessions").update(rest).eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_, vars) => qc.invalidateQueries({ queryKey: ["program_sessions", vars.program_id] }),
  });
}

export function useCreateAttendanceRecords() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (records: { participant_id: string; session_id: string }[]) => {
      const withStatus = records.map(r => ({ ...r, status: "en_attente" }));
      const { error } = await supabase.from("program_attendance").insert(withStatus);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["program_attendance"] }),
  });
}

export function useMarkPresent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ attendanceId }: { attendanceId: string }) => {
      const { error } = await supabase
        .from("program_attendance")
        .update({ status: "present", marked_at: new Date().toISOString() })
        .eq("id", attendanceId);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["program_attendance"] }),
  });
}

export function useParticipantByCode(code: string | undefined) {
  return useQuery({
    queryKey: ["participant_by_code", code],
    queryFn: async () => {
      if (!code) return null;
      const { data, error } = await supabase
        .from("program_participants")
        .select("*")
        .eq("participant_code", code)
        .maybeSingle();
      if (error) throw error;
      return data as ProgramParticipant | null;
    },
    enabled: !!code,
  });
}

// Realtime for attendance
export function useProgramAttendanceRealtime() {
  const qc = useQueryClient();
  const channel = supabase
    .channel("program-attendance-realtime")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "program_attendance" },
      () => {
        qc.invalidateQueries({ queryKey: ["program_attendance"] });
      }
    );
  if (channel.state !== "joined" && channel.state !== "joining") {
    channel.subscribe();
  }
}
