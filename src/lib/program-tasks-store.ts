import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type TaskStatus = "en_cours" | "soumis" | "valide";

export interface ProgramTask {
  id: string;
  participant_id: string;
  program_id: string;
  title: string;
  expected_result: string;
  reporting_instructions: string | null;
  submission_link: string | null;
  status: TaskStatus;
  submitted_at: string | null;
  validated_at: string | null;
  created_at: string;
  updated_at: string;
}

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  en_cours: "En cours",
  soumis: "Soumis",
  valide: "Validé",
};

export function useParticipantTasks(participantId: string | undefined) {
  return useQuery({
    queryKey: ["program_tasks", participantId],
    queryFn: async () => {
      if (!participantId) return [];
      const { data, error } = await supabase
        .from("program_tasks" as any)
        .select("*")
        .eq("participant_id", participantId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as ProgramTask[];
    },
    enabled: !!participantId,
  });
}

export function useAddProgramTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (p: {
      participant_id: string;
      program_id: string;
      title: string;
      expected_result: string;
      reporting_instructions?: string;
    }) => {
      const { data, error } = await supabase
        .from("program_tasks" as any)
        .insert(p)
        .select()
        .single();
      if (error) throw error;
      return data as unknown as ProgramTask;
    },
    onSuccess: (_, vars) =>
      qc.invalidateQueries({ queryKey: ["program_tasks", vars.participant_id] }),
  });
}

export function useUpdateProgramTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (p: {
      id: string;
      participant_id: string;
      title?: string;
      expected_result?: string;
      reporting_instructions?: string | null;
    }) => {
      const { id, participant_id, ...rest } = p;
      const { error } = await supabase
        .from("program_tasks" as any)
        .update(rest)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_, vars) =>
      qc.invalidateQueries({ queryKey: ["program_tasks", vars.participant_id] }),
  });
}

export function useSubmitTaskLink() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (p: { id: string; participant_id: string; submission_link: string }) => {
      const { error } = await supabase
        .from("program_tasks" as any)
        .update({
          submission_link: p.submission_link,
          status: "soumis",
          submitted_at: new Date().toISOString(),
        })
        .eq("id", p.id);
      if (error) throw error;
    },
    onSuccess: (_, vars) =>
      qc.invalidateQueries({ queryKey: ["program_tasks", vars.participant_id] }),
  });
}

export function useValidateTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (p: { id: string; participant_id: string }) => {
      const { error } = await supabase
        .from("program_tasks" as any)
        .update({
          status: "valide",
          validated_at: new Date().toISOString(),
        })
        .eq("id", p.id);
      if (error) throw error;
    },
    onSuccess: (_, vars) =>
      qc.invalidateQueries({ queryKey: ["program_tasks", vars.participant_id] }),
  });
}

export function useReopenTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (p: { id: string; participant_id: string }) => {
      const { error } = await supabase
        .from("program_tasks" as any)
        .update({
          status: "en_cours",
          submitted_at: null,
          validated_at: null,
        })
        .eq("id", p.id);
      if (error) throw error;
    },
    onSuccess: (_, vars) =>
      qc.invalidateQueries({ queryKey: ["program_tasks", vars.participant_id] }),
  });
}

export function useDeleteProgramTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (p: { id: string; participant_id: string }) => {
      const { error } = await supabase
        .from("program_tasks" as any)
        .delete()
        .eq("id", p.id);
      if (error) throw error;
    },
    onSuccess: (_, vars) =>
      qc.invalidateQueries({ queryKey: ["program_tasks", vars.participant_id] }),
  });
}
