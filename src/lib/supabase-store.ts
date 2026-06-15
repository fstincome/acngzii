import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type MemberType = "student" | "professional" | "entrepreneur" | "visitor" | "volunteer" | "member";
export type MembershipStatus = "active" | "inactive" | "pending";

export interface Visitor {
  id: string;
  visitor_id: string;
  full_name: string;
  gender: "male" | "female" | "other";
  date_of_birth: string | null;
  phone: string;
  email: string | null;
  neighborhood: string;
  occupation: string;
  institution: string | null;
  photo: string | null;
  registration_date: string;
  member_type: MemberType;
  age_group: string | null;
  membership_status: MembershipStatus;
  membership_start_date: string | null;
  membership_end_date: string | null;
}

export interface Visit {
  id: string;
  visitor_id: string;
  room: "computer_lab" | "multipurpose_room" | "garden";
  action: "check_in" | "check_out";
  timestamp: string;
  expected_checkout: string | null;
}

export const COMPUTER_LAB_CAPACITY = 20;
export const DEFAULT_DURATION_HOURS = 9;

export type RoomType = "computer_lab" | "multipurpose_room" | "garden";

export const ROOM_LABELS: Record<RoomType, string> = {
  computer_lab: "Salle Informatique",
  multipurpose_room: "Salle Polyvalente",
  garden: "Jardin",
};

// Generate a random alphanumeric visitor ID like GSS-7K3M9X
export async function generateVisitorId(): Promise<string> {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let id: string;
  let exists = true;
  while (exists) {
    let code = "";
    for (let i = 0; i < 6; i++) {
      code += chars[Math.floor(Math.random() * chars.length)];
    }
    id = `AC-${code}`;
    const { count } = await supabase
      .from("visitors")
      .select("*", { count: "exact", head: true })
      .eq("visitor_id", id);
    exists = (count ?? 0) > 0;
  }
  return id!;
}

// ---- React Query hooks ----

export function useVisitors() {
  return useQuery({
    queryKey: ["visitors"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("visitors")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Visitor[];
    },
  });
}

export function useVisits() {
  return useQuery({
    queryKey: ["visits"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("visits")
        .select("*")
        .order("timestamp", { ascending: false })
        .limit(50000);
      if (error) throw error;
      return (data ?? []) as Visit[];
    },
  });
}

export function useVisitorByQR(visitorId: string | undefined) {
  return useQuery({
    queryKey: ["visitor", visitorId],
    queryFn: async () => {
      if (!visitorId) return null;
      const { data, error } = await supabase
        .from("visitors")
        .select("*")
        .eq("visitor_id", visitorId)
        .maybeSingle();
      if (error) throw error;
      return data as Visitor | null;
    },
    enabled: !!visitorId,
  });
}

export function useVisitorVisits(visitorId: string | undefined) {
  return useQuery({
    queryKey: ["visitor-visits", visitorId],
    queryFn: async () => {
      if (!visitorId) return [];
      const { data, error } = await supabase
        .from("visits")
        .select("*")
        .eq("visitor_id", visitorId)
        .order("timestamp", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Visit[];
    },
    enabled: !!visitorId,
  });
}

export function useAddVisitor() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (visitor: {
      visitor_id: string;
      full_name: string;
      gender: string;
      date_of_birth?: string;
      phone: string;
      email?: string;
      neighborhood: string;
      occupation: string;
      institution?: string;
      photo?: string;
      member_type?: MemberType;
      age_group?: string;
      membership_status?: MembershipStatus;
      membership_start_date?: string;
      membership_end_date?: string;
    }) => {
      const { data, error } = await supabase
        .from("visitors")
        .insert(visitor)
        .select()
        .single();
      if (error) throw error;
      return data as Visitor;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["visitors"] });
    },
  });
}

export function useUpdateVisitor() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ visitor_id, updates }: {
      visitor_id: string;
      updates: {
        full_name?: string;
        gender?: string;
        date_of_birth?: string | null;
        phone?: string;
        email?: string | null;
        neighborhood?: string;
        occupation?: string;
        institution?: string | null;
        photo?: string | null;
        member_type?: MemberType;
        age_group?: string | null;
        membership_status?: MembershipStatus;
        membership_start_date?: string | null;
        membership_end_date?: string | null;
      };
    }) => {
      const { data, error } = await supabase
        .from("visitors")
        .update(updates)
        .eq("visitor_id", visitor_id)
        .select()
        .single();
      if (error) throw error;
      return data as Visitor;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["visitors"] });
      queryClient.invalidateQueries({ queryKey: ["visitor"] });
    },
  });
}

export function useDeleteVisitor() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (visitorId: string) => {
      // Delete visits first
      const { error: vErr } = await supabase.from("visits").delete().eq("visitor_id", visitorId);
      if (vErr) throw vErr;
      const { error } = await supabase.from("visitors").delete().eq("visitor_id", visitorId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["visitors"] });
      queryClient.invalidateQueries({ queryKey: ["visits"] });
    },
  });
}

export function useAddVisit() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (visit: {
      visitor_id: string;
      room: string;
      action: string;
      timestamp: string;
      expected_checkout?: string;
    }) => {
      const { data, error } = await supabase
        .from("visits")
        .insert(visit)
        .select()
        .single();
      if (error) throw error;
      return data as Visit;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["visits"] });
      queryClient.invalidateQueries({ queryKey: ["visitor-visits"] });
    },
  });
}

// Compute current occupancy from visits array
// For multipurpose_room and garden, auto-checkout after expected_checkout time
export function computeOccupancy(visits: Visit[], room: RoomType): Set<string> {
  const roomVisits = visits.filter((v) => v.room === room);
  const checkedIn = new Map<string, Visit>();
  const sorted = [...roomVisits].sort((a, b) => a.timestamp.localeCompare(b.timestamp));
  const now = new Date();

  for (const v of sorted) {
    if (v.action === "check_in") {
      checkedIn.set(v.visitor_id, v);
    } else {
      checkedIn.delete(v.visitor_id);
    }
  }

  // Auto-checkout expired visitors for all rooms
  for (const [vid, visit] of checkedIn) {
    if (visit.expected_checkout && new Date(visit.expected_checkout) <= now) {
      checkedIn.delete(vid);
    }
  }

  return new Set(checkedIn.keys());
}

// Realtime subscription hook
export function useVisitsRealtime() {
  const queryClient = useQueryClient();

  const channel = supabase
    .channel("visits-realtime")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "visits" },
      () => {
        queryClient.invalidateQueries({ queryKey: ["visits"] });
        queryClient.invalidateQueries({ queryKey: ["visitor-visits"] });
      }
    );

  if (channel.state !== "joined" && channel.state !== "joining") {
    channel.subscribe();
  }
}
