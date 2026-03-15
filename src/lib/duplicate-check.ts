import { supabase } from "@/integrations/supabase/client";

export interface DuplicateCandidate {
  source: "visitor" | "participant";
  id: string;
  code: string; // visitor_id or participant_code
  full_name: string;
  phone: string | null;
  email: string | null;
  gender: string | null;
  date_of_birth: string | null;
  neighborhood: string | null;
  occupation: string | null;
  photo: string | null;
  institution?: string | null;
}

function normalize(s: string): string {
  return s.toLowerCase().trim().replace(/\s+/g, " ");
}

function similarity(a: string, b: string): number {
  const na = normalize(a);
  const nb = normalize(b);
  if (na === nb) return 1;
  if (na.includes(nb) || nb.includes(na)) return 0.8;
  // Simple word overlap
  const wa = na.split(" ");
  const wb = nb.split(" ");
  const common = wa.filter(w => wb.includes(w)).length;
  return common / Math.max(wa.length, wb.length);
}

export async function findDuplicates(fullName: string): Promise<DuplicateCandidate[]> {
  if (!fullName.trim() || fullName.trim().length < 3) return [];

  const results: DuplicateCandidate[] = [];

  // Search visitors
  const { data: visitors } = await supabase.from("visitors").select("*");
  if (visitors) {
    for (const v of visitors) {
      if (similarity(fullName, v.full_name) >= 0.6) {
        results.push({
          source: "visitor",
          id: v.id,
          code: v.visitor_id,
          full_name: v.full_name,
          phone: v.phone,
          email: v.email,
          gender: v.gender,
          date_of_birth: v.date_of_birth,
          neighborhood: v.neighborhood,
          occupation: v.occupation,
          photo: v.photo,
        });
      }
    }
  }

  // Search participants
  const { data: participants } = await supabase.from("program_participants").select("*");
  if (participants) {
    for (const p of participants) {
      if (similarity(fullName, p.full_name) >= 0.6) {
        // Avoid duplicates if already found as visitor with same name
        if (!results.some(r => normalize(r.full_name) === normalize(p.full_name) && r.phone === p.phone)) {
          results.push({
            source: "participant",
            id: p.id,
            code: p.participant_code,
            full_name: p.full_name,
            phone: p.phone,
            email: p.email,
            gender: p.gender,
            date_of_birth: p.date_of_birth,
            neighborhood: p.neighborhood,
            occupation: p.occupation,
            photo: p.photo,
            institution: p.institution,
          });
        }
      }
    }
  }

  return results;
}