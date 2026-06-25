import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface LibraryBook {
  id: string;
  internal_code: string;
  title: string;
  authors: string | null;
  isbn: string | null;
  category: string | null;
  language: string | null;
  publisher: string | null;
  publication_year: number | null;
  edition: string | null;
  copies_total: number;
  copies_available: number;
  shelf: string | null;
  cover_url: string | null;
  description: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface LibraryVisit {
  id: string;
  visitor_id: string;
  checked_in_at: string;
  checked_out_at: string | null;
  books_consulted: string[];
  notes: string | null;
  created_at: string;
}

export interface LibraryLoan {
  id: string;
  visitor_id: string;
  book_id: string;
  loaned_at: string;
  due_at: string;
  returned_at: string | null;
  status: "active" | "returned";
  issued_by: string | null;
  returned_by: string | null;
  notes: string | null;
}

const sb = supabase as any;

export function useBooks() {
  return useQuery({
    queryKey: ["library_books"],
    queryFn: async () => {
      const { data, error } = await sb.from("library_books").select("*").order("title");
      if (error) throw error;
      return data as LibraryBook[];
    },
  });
}

export function useSaveBook() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (book: Partial<LibraryBook> & { id?: string }) => {
      if (book.id) {
        const { id, ...rest } = book;
        const { error } = await sb.from("library_books").update(rest).eq("id", id);
        if (error) throw error;
      } else {
        const { error } = await sb.from("library_books").insert(book);
        if (error) throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["library_books"] }),
  });
}

export function useDeleteBook() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await sb.from("library_books").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["library_books"] }),
  });
}

export function useLibraryVisits() {
  return useQuery({
    queryKey: ["library_visits"],
    queryFn: async () => {
      const { data, error } = await sb
        .from("library_visits")
        .select("*")
        .order("checked_in_at", { ascending: false });
      if (error) throw error;
      return data as LibraryVisit[];
    },
  });
}

export function useCheckInReader() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (visitor_id: string) => {
      const { error } = await sb.from("library_visits").insert({ visitor_id });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["library_visits"] }),
  });
}

export function useCheckOutReader() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (visitId: string) => {
      const { error } = await sb
        .from("library_visits")
        .update({ checked_out_at: new Date().toISOString() })
        .eq("id", visitId);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["library_visits"] }),
  });
}

export function useAttachBookToVisit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ visitId, bookCode, current }: { visitId: string; bookCode: string; current: string[] }) => {
      if (current.includes(bookCode)) return;
      const next = [...current, bookCode];
      const { error } = await sb.from("library_visits").update({ books_consulted: next }).eq("id", visitId);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["library_visits"] }),
  });
}

export function useLoans() {
  return useQuery({
    queryKey: ["library_loans"],
    queryFn: async () => {
      const { data, error } = await sb.from("library_loans").select("*").order("loaned_at", { ascending: false });
      if (error) throw error;
      return data as LibraryLoan[];
    },
  });
}

export function useCreateLoan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (loan: { visitor_id: string; book_id: string; due_at: string; notes?: string }) => {
      const { data: u } = await supabase.auth.getUser();
      const { error } = await sb.from("library_loans").insert({ ...loan, issued_by: u.user?.id });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["library_loans"] });
      qc.invalidateQueries({ queryKey: ["library_books"] });
    },
  });
}

export function useReturnLoan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (loanId: string) => {
      const { data: u } = await supabase.auth.getUser();
      const { error } = await sb
        .from("library_loans")
        .update({
          status: "returned",
          returned_at: new Date().toISOString(),
          returned_by: u.user?.id,
        })
        .eq("id", loanId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["library_loans"] });
      qc.invalidateQueries({ queryKey: ["library_books"] });
    },
  });
}

export const isOverdue = (loan: LibraryLoan) =>
  loan.status === "active" && new Date(loan.due_at).getTime() < Date.now();
