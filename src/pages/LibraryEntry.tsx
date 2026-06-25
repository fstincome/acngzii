import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BookOpen, LogIn, LogOut, Loader2, Clock, BookMarked } from "lucide-react";
import { toast } from "sonner";
import QRScanner from "@/components/QRScanner";
import { useVisitors } from "@/lib/supabase-store";
import {
  useBooks,
  useLibraryVisits,
  useCheckInReader,
  useCheckOutReader,
  useAttachBookToVisit,
} from "@/lib/library-store";

export default function LibraryEntry() {
  const { data: visitors = [] } = useVisitors();
  const { data: visits = [] } = useLibraryVisits();
  const { data: books = [] } = useBooks();
  const checkIn = useCheckInReader();
  const checkOut = useCheckOutReader();
  const attach = useAttachBookToVisit();

  const [activeId, setActiveId] = useState<string | null>(null);

  const activeReaders = useMemo(
    () => visits.filter((v) => !v.checked_out_at),
    [visits],
  );

  const findVisitor = (vid: string) => visitors.find((v) => v.visitor_id === vid);
  const activeVisitFor = (vid: string) => activeReaders.find((v) => v.visitor_id === vid);
  const findBook = (code: string) => books.find((b) => b.internal_code === code || b.isbn === code);

  const handleVisitorScan = async (raw: string) => {
    const id = raw.trim().toUpperCase();
    const visitor = findVisitor(id);
    if (!visitor) {
      toast.error("Member not found");
      return;
    }
    const existing = activeVisitFor(id);
    try {
      if (existing) {
        await checkOut.mutateAsync(existing.id);
        toast.success(`${visitor.full_name} checked out of library`);
        setActiveId(null);
      } else {
        await checkIn.mutateAsync(id);
        toast.success(`${visitor.full_name} checked in`);
        setActiveId(id);
      }
    } catch (e: any) {
      toast.error(e.message || "Action failed");
    }
  };

  const handleBookScan = async (raw: string) => {
    if (!activeId) {
      toast.error("Scan a member first");
      return;
    }
    const visit = activeVisitFor(activeId);
    if (!visit) return;
    const code = raw.trim();
    const book = findBook(code);
    if (!book) {
      toast.error("Unknown book code");
      return;
    }
    try {
      await attach.mutateAsync({ visitId: visit.id, bookCode: book.internal_code, current: visit.books_consulted });
      toast.success(`Added "${book.title}" to session`);
    } catch (e: any) {
      toast.error(e.message || "Failed to attach");
    }
  };

  const currentVisit = activeId ? activeVisitFor(activeId) : null;
  const currentVisitor = activeId ? findVisitor(activeId) : null;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="page-header">
        <h1 className="page-title flex items-center gap-2.5">
          <div className="icon-box h-9 w-9"><BookOpen className="h-4.5 w-4.5 text-primary-foreground" /></div>
          Library Entry
        </h1>
        <p className="page-subtitle">Scan member ID to check-in / check-out for on-site reading</p>
      </div>

      <Card className="p-5 space-y-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2">
            Member scan
          </p>
          <QRScanner onScan={handleVisitorScan} placeholder="ACG-000001" buttonLabel="Check-in / out" id="lib-member-scan" />
        </div>

        {currentVisitor && currentVisit && (
          <div className="rounded-xl border bg-primary/5 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold">{currentVisitor.full_name}</p>
                <p className="font-mono text-xs text-muted-foreground">{currentVisitor.visitor_id}</p>
              </div>
              <Badge className="gap-1"><LogIn className="h-3 w-3" /> In library</Badge>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2">
                Scan a book to attach to this session
              </p>
              <QRScanner onScan={handleBookScan} placeholder="Book code" buttonLabel="Attach" id="lib-book-scan" />
            </div>
            {currentVisit.books_consulted.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-2">
                {currentVisit.books_consulted.map((code) => {
                  const b = findBook(code);
                  return (
                    <Badge key={code} variant="secondary" className="gap-1">
                      <BookMarked className="h-3 w-3" /> {b?.title || code}
                    </Badge>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </Card>

      <Card className="p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-serif text-xl">Currently in library ({activeReaders.length})</h2>
          {(checkIn.isPending || checkOut.isPending) && <Loader2 className="h-4 w-4 animate-spin text-primary" />}
        </div>
        {activeReaders.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">No active readers</p>
        ) : (
          <div className="space-y-2">
            {activeReaders.map((visit) => {
              const v = findVisitor(visit.visitor_id);
              const minutes = Math.floor((Date.now() - new Date(visit.checked_in_at).getTime()) / 60000);
              return (
                <div key={visit.id} className="flex items-center justify-between rounded-xl border bg-card p-3">
                  <div>
                    <p className="font-medium">{v?.full_name || visit.visitor_id}</p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                      <Clock className="h-3 w-3" />
                      {minutes} min · {visit.books_consulted.length} book(s) consulted
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={async () => {
                      try {
                        await checkOut.mutateAsync(visit.id);
                        toast.success("Checked out");
                        if (activeId === visit.visitor_id) setActiveId(null);
                      } catch (e: any) {
                        toast.error(e.message || "Failed");
                      }
                    }}
                    className="gap-1"
                  >
                    <LogOut className="h-3 w-3" /> Check out
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}
