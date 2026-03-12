import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

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
  photo: string | null;
  registration_date: string;
}

export interface Visit {
  id: string;
  visitor_id: string;
  room: "computer_lab" | "multipurpose_room";
  action: "check_in" | "check_out";
  timestamp: string;
}

export const COMPUTER_LAB_CAPACITY = 20;

// Generate visitor ID
export async function generateVisitorId(): Promise<string> {
  const { count } = await supabase
    .from("visitors")
    .select("*", { count: "exact", head: true });
  const next = (count ?? 0) + 1;
  return `GSS-${String(next).padStart(6, "0")}`;
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
        .order("timestamp", { ascending: true });
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

export function useAddVisit() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (visit: {
      visitor_id: string;
      room: string;
      action: string;
      timestamp: string;
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
export function computeOccupancy(visits: Visit[], room: "computer_lab" | "multipurpose_room"): Set<string> {
  const roomVisits = visits.filter((v) => v.room === room);
  const checkedIn = new Set<string>();
  const sorted = [...roomVisits].sort((a, b) => a.timestamp.localeCompare(b.timestamp));
  for (const v of sorted) {
    if (v.action === "check_in") checkedIn.add(v.visitor_id);
    else checkedIn.delete(v.visitor_id);
  }
  return checkedIn;
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

  // Subscribe once
  if (channel.state !== "joined" && channel.state !== "joining") {
    channel.subscribe();
  }
}
