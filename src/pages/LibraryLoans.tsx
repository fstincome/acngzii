import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BookCheck, Loader2, Undo2 } from "lucide-react";
import { toast } from "sonner";
import QRScanner from "@/components/QRScanner";
import { useVisitors } from "@/lib/supabase-store";
import { useBooks, useLoans, useCreateLoan, useReturnLoan, isOverdue, type LibraryLoan } from "@/lib/library-store";
import { usePermissions } from "@/hooks/usePermissions";

const addDays = (days: number) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
};

export default function LibraryLoans() {
  const { data: visitors = [] } = useVisitors();
  const { data: books = [] } = useBooks();
  const { data: loans = [] } = useLoans();
  const create = useCreateLoan();
  const ret = useReturnLoan();
  const { can } = usePermissions();
  const canCreate = can("library", "create");
  const canUpdate = can("library", "update");

  const [visitorId, setVisitorId] = useState("");
  const [bookCode, setBookCode] = useState("");
  const [dueDate, setDueDate] = useState(addDays(7));
  const [notes, setNotes] = useState("");
  const [filter, setFilter] = useState<"active" | "overdue" | "returned" | "all">("active");

  const findVisitor = (id: string) => visitors.find((v) => v.visitor_id === id.trim().toUpperCase());
  const findBook = (code: string) => books.find((b) => b.internal_code === code.trim() || b.isbn === code.trim());
  const bookById = (id: string) => books.find((b) => b.id === id);

  const visitor = findVisitor(visitorId);
  const book = findBook(bookCode);

  const issue = async () => {
    if (!visitor) return toast.error("Member not found");
    if (!book) return toast.error("Book not found");
    if (book.copies_available <= 0) return toast.error("No copies available");
    if (!dueDate) return toast.error("Pick a due date");
    try {
      await create.mutateAsync({
        visitor_id: visitor.visitor_id,
        book_id: book.id,
        due_at: new Date(dueDate + "T23:59:59").toISOString(),
        notes: notes || undefined,
      });
      toast.success(`Loaned "${book.title}" to ${visitor.full_name}`);
      setVisitorId(""); setBookCode(""); setNotes(""); setDueDate(addDays(7));
    } catch (e: any) {
      toast.error(e.message || "Loan failed");
    }
  };

  const handleReturnScan = async (raw: string) => {
    const b = findBook(raw);
    if (!b) return toast.error("Unknown book");
    const active = loans.find((l) => l.book_id === b.id && l.status === "active");
    if (!active) return toast.error("No active loan for this book");
    try {
      await ret.mutateAsync(active.id);
      toast.success(`Returned "${b.title}"`);
    } catch (e: any) {
      toast.error(e.message || "Return failed");
    }
  };

  const visibleLoans = useMemo(() => {
    return loans.filter((l) => {
      if (filter === "all") return true;
      if (filter === "active") return l.status === "active" && !isOverdue(l);
      if (filter === "overdue") return isOverdue(l);
      if (filter === "returned") return l.status === "returned";
      return true;
    });
  }, [loans, filter]);

  const statusBadge = (l: LibraryLoan) => {
    if (l.status === "returned") return <Badge variant="secondary">Returned</Badge>;
    if (isOverdue(l)) return <Badge variant="destructive">Overdue</Badge>;
    return <Badge>Active</Badge>;
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="page-header">
        <h1 className="page-title flex items-center gap-2.5">
          <div className="icon-box h-9 w-9"><BookCheck className="h-4.5 w-4.5 text-primary-foreground" /></div>
          Book Loans
        </h1>
        <p className="page-subtitle">Issue and return books</p>
      </div>

      {canCreate && (
        <Card className="p-5 space-y-4">
          <h2 className="font-serif text-lg">Issue a new loan</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Member (scan or enter ID)</Label>
              <QRScanner onScan={(s) => setVisitorId(s.toUpperCase())} placeholder="ACG-000001" buttonLabel="Set" id="loan-member-scan" />
              {visitor && (
                <p className="text-sm text-primary">{visitor.full_name}</p>
              )}
              {visitorId && !visitor && (
                <p className="text-sm text-destructive">Not found: {visitorId}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label>Book (scan code or ISBN)</Label>
              <QRScanner onScan={setBookCode} placeholder="BK-..." buttonLabel="Set" id="loan-book-scan" />
              {book && (
                <p className="text-sm">
                  <span className="text-primary font-medium">{book.title}</span>{" "}
                  <span className="text-muted-foreground">· {book.copies_available} / {book.copies_total} available</span>
                </p>
              )}
              {bookCode && !book && (
                <p className="text-sm text-destructive">Not found: {bookCode}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label>Due date *</Label>
              <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
              <div className="flex gap-1 flex-wrap">
                {[3, 7, 14, 21, 30].map((d) => (
                  <Button key={d} type="button" size="sm" variant="outline" onClick={() => setDueDate(addDays(d))}>
                    +{d}d
                  </Button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label>Notes (optional)</Label>
              <Input value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>
          </div>
          <Button onClick={issue} disabled={create.isPending || !visitor || !book} className="w-full md:w-auto">
            {create.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Issue loan
          </Button>
        </Card>
      )}

      {canUpdate && (
        <Card className="p-5 space-y-3">
          <h2 className="font-serif text-lg">Quick return</h2>
          <p className="text-sm text-muted-foreground">Scan the book code to mark it returned.</p>
          <QRScanner onScan={handleReturnScan} placeholder="Book code" buttonLabel="Return" id="loan-return-scan" />
        </Card>
      )}

      <Card className="p-5">
        <Tabs value={filter} onValueChange={(v) => setFilter(v as any)}>
          <TabsList>
            <TabsTrigger value="active">Active</TabsTrigger>
            <TabsTrigger value="overdue">Overdue</TabsTrigger>
            <TabsTrigger value="returned">Returned</TabsTrigger>
            <TabsTrigger value="all">All</TabsTrigger>
          </TabsList>
          <TabsContent value={filter} className="mt-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Member</TableHead>
                  <TableHead>Book</TableHead>
                  <TableHead>Loaned</TableHead>
                  <TableHead>Due</TableHead>
                  <TableHead>Returned</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[120px]">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visibleLoans.map((l) => {
                  const v = visitors.find((x) => x.visitor_id === l.visitor_id);
                  const b = bookById(l.book_id);
                  return (
                    <TableRow key={l.id} className={isOverdue(l) ? "bg-destructive/5" : ""}>
                      <TableCell>{v?.full_name || l.visitor_id}</TableCell>
                      <TableCell>{b?.title || "—"}</TableCell>
                      <TableCell className="text-xs">{new Date(l.loaned_at).toLocaleDateString()}</TableCell>
                      <TableCell className="text-xs">{new Date(l.due_at).toLocaleDateString()}</TableCell>
                      <TableCell className="text-xs">{l.returned_at ? new Date(l.returned_at).toLocaleDateString() : "—"}</TableCell>
                      <TableCell>{statusBadge(l)}</TableCell>
                      <TableCell>
                        {l.status === "active" && canUpdate && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={async () => {
                              try {
                                await ret.mutateAsync(l.id);
                                toast.success("Returned");
                              } catch (e: any) { toast.error(e.message || "Failed"); }
                            }}
                            className="gap-1"
                          >
                            <Undo2 className="h-3 w-3" /> Return
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
                {visibleLoans.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground py-8">No loans</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TabsContent>
        </Tabs>
      </Card>
    </div>
  );
}
