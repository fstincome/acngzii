import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BookOpen, Plus, Search, Camera, Pencil, Trash2, X, QrCode, Loader2 } from "lucide-react";
import { Html5Qrcode } from "html5-qrcode";
import { QRCodeSVG } from "qrcode.react";
import { toast } from "sonner";
import { useBooks, useSaveBook, useDeleteBook, type LibraryBook } from "@/lib/library-store";
import { usePermissions } from "@/hooks/usePermissions";

const emptyBook = (): Partial<LibraryBook> => ({
  internal_code: "",
  title: "",
  authors: "",
  isbn: "",
  category: "",
  language: "",
  publisher: "",
  publication_year: undefined,
  edition: "",
  copies_total: 1,
  copies_available: 1,
  shelf: "",
  cover_url: "",
  description: "",
  status: "available",
});

const genCode = () => `BK-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 5).toUpperCase()}`;

export default function LibraryBooks() {
  const { data: books = [], isLoading } = useBooks();
  const save = useSaveBook();
  const del = useDeleteBook();
  const { can } = usePermissions();

  const [query, setQuery] = useState("");
  const [sortBy, setSortBy] = useState("title");
  const [category, setCategory] = useState<string>("all");
  const [language, setLanguage] = useState<string>("all");
  const [availability, setAvailability] = useState<string>("all");
  const [scanOpen, setScanOpen] = useState(false);
  const [form, setForm] = useState<Partial<LibraryBook>>(emptyBook());
  const [dialogOpen, setDialogOpen] = useState(false);
  const [qrBook, setQrBook] = useState<LibraryBook | null>(null);

  const canCreate = can("library", "create");
  const canUpdate = can("library", "update");
  const canDelete = can("library", "delete");

  const categories = useMemo(
    () => Array.from(new Set(books.map((b) => b.category).filter(Boolean))) as string[],
    [books],
  );
  const languages = useMemo(
    () => Array.from(new Set(books.map((b) => b.language).filter(Boolean))) as string[],
    [books],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = books.filter((b) => {
      const matchQ =
        !q ||
        b.title.toLowerCase().includes(q) ||
        (b.authors || "").toLowerCase().includes(q) ||
        (b.isbn || "").toLowerCase().includes(q) ||
        b.internal_code.toLowerCase().includes(q);
      const matchCat = category === "all" || b.category === category;
      const matchLang = language === "all" || b.language === language;
      const matchAvail =
        availability === "all" ||
        (availability === "available" && b.copies_available > 0) ||
        (availability === "unavailable" && b.copies_available <= 0);
      return matchQ && matchCat && matchLang && matchAvail;
    });
    list = [...list].sort((a, b) => {
      switch (sortBy) {
        case "author":
          return (a.authors || "").localeCompare(b.authors || "");
        case "year":
          return (b.publication_year || 0) - (a.publication_year || 0);
        case "added":
          return b.created_at.localeCompare(a.created_at);
        default:
          return a.title.localeCompare(b.title);
      }
    });
    return list;
  }, [books, query, sortBy, category, language, availability]);

  const openCreate = () => {
    setForm({ ...emptyBook(), internal_code: genCode() });
    setDialogOpen(true);
  };

  const openEdit = (b: LibraryBook) => {
    setForm(b);
    setDialogOpen(true);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload: any = { ...form };
      if (payload.copies_total < (payload.copies_available || 0)) {
        payload.copies_available = payload.copies_total;
      }
      if (!payload.id) {
        if (!payload.internal_code) payload.internal_code = genCode();
        payload.copies_available = payload.copies_total;
      } else {
        // don't overwrite stock on edit unless total increased
        delete payload.copies_available;
      }
      ["authors","isbn","category","language","publisher","edition","shelf","cover_url","description"].forEach(k=>{
        if (payload[k] === "") payload[k] = null;
      });
      if (payload.publication_year === "" || payload.publication_year == null) payload.publication_year = null;
      await save.mutateAsync(payload);
      toast.success(payload.id ? "Book updated" : "Book added");
      setDialogOpen(false);
    } catch (err: any) {
      toast.error(err.message || "Save error");
    }
  };

  const remove = async (b: LibraryBook) => {
    if (!confirm(`Delete "${b.title}"?`)) return;
    try {
      await del.mutateAsync(b.id);
      toast.success("Book deleted");
    } catch (err: any) {
      toast.error(err.message || "Delete error");
    }
  };

  // Scanner dialog: find a book by code
  const handleScanned = (code: string) => {
    const c = code.trim();
    setQuery(c);
    setScanOpen(false);
    const hit = books.find((b) => b.internal_code === c || b.isbn === c);
    if (hit) toast.success(`Found: ${hit.title}`);
    else toast.error("No book matches this code");
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="page-header flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="page-title flex items-center gap-2.5">
            <div className="icon-box h-9 w-9"><BookOpen className="h-4.5 w-4.5 text-primary-foreground" /></div>
            Book Catalog
          </h1>
          <p className="page-subtitle">Manage all books in the library</p>
        </div>
        {canCreate && (
          <Button onClick={openCreate} className="gap-2"><Plus className="h-4 w-4" /> New book</Button>
        )}
      </div>

      <Card className="p-4 space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_auto_auto_auto] gap-3">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search title, author, ISBN, code..."
              className="pl-8"
            />
          </div>
          <Button variant="outline" onClick={() => setScanOpen(true)} className="gap-2">
            <Camera className="h-4 w-4" /> Scan
          </Button>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="w-[150px]"><SelectValue placeholder="Category" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All categories</SelectItem>
              {categories.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={language} onValueChange={setLanguage}>
            <SelectTrigger className="w-[140px]"><SelectValue placeholder="Language" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All languages</SelectItem>
              {languages.map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={availability} onValueChange={setAvailability}>
            <SelectTrigger className="w-[150px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="available">Available</SelectItem>
              <SelectItem value="unavailable">Unavailable</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>Sort by:</span>
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-[160px] h-8"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="title">Title</SelectItem>
              <SelectItem value="author">Author</SelectItem>
              <SelectItem value="year">Year (newest)</SelectItem>
              <SelectItem value="added">Date added</SelectItem>
            </SelectContent>
          </Select>
          <span className="ml-auto">{filtered.length} of {books.length}</span>
        </div>
      </Card>

      <Card className="overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center"><Loader2 className="h-6 w-6 animate-spin mx-auto text-primary" /></div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Author</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Lang</TableHead>
                <TableHead>Year</TableHead>
                <TableHead>Shelf</TableHead>
                <TableHead>Stock</TableHead>
                <TableHead className="w-[140px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((b) => (
                <TableRow key={b.id}>
                  <TableCell className="font-mono text-xs">{b.internal_code}</TableCell>
                  <TableCell className="font-medium">{b.title}</TableCell>
                  <TableCell>{b.authors || "—"}</TableCell>
                  <TableCell>{b.category || "—"}</TableCell>
                  <TableCell>{b.language || "—"}</TableCell>
                  <TableCell>{b.publication_year || "—"}</TableCell>
                  <TableCell>{b.shelf || "—"}</TableCell>
                  <TableCell>
                    <Badge variant={b.copies_available > 0 ? "default" : "destructive"}>
                      {b.copies_available} / {b.copies_total}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => setQrBook(b)} title="QR code">
                        <QrCode className="h-4 w-4" />
                      </Button>
                      {canUpdate && (
                        <Button variant="ghost" size="icon" onClick={() => openEdit(b)} title="Edit">
                          <Pencil className="h-4 w-4" />
                        </Button>
                      )}
                      {canDelete && (
                        <Button variant="ghost" size="icon" className="text-destructive" onClick={() => remove(b)} title="Delete">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={9} className="text-center text-muted-foreground py-8">No books</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        )}
      </Card>

      {/* Create/edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{form.id ? "Edit book" : "Add a new book"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={submit} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-2 sm:col-span-2">
              <Label>Title *</Label>
              <Input value={form.title || ""} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
            </div>
            <div className="space-y-2">
              <Label>Internal code *</Label>
              <Input value={form.internal_code || ""} onChange={(e) => setForm({ ...form, internal_code: e.target.value })} required className="font-mono" />
            </div>
            <div className="space-y-2">
              <Label>ISBN</Label>
              <Input value={form.isbn || ""} onChange={(e) => setForm({ ...form, isbn: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Author(s)</Label>
              <Input value={form.authors || ""} onChange={(e) => setForm({ ...form, authors: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Publisher</Label>
              <Input value={form.publisher || ""} onChange={(e) => setForm({ ...form, publisher: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Category</Label>
              <Input value={form.category || ""} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="e.g. Fiction, Science" />
            </div>
            <div className="space-y-2">
              <Label>Language</Label>
              <Input value={form.language || ""} onChange={(e) => setForm({ ...form, language: e.target.value })} placeholder="English, French..." />
            </div>
            <div className="space-y-2">
              <Label>Publication year</Label>
              <Input type="number" value={form.publication_year ?? ""} onChange={(e) => setForm({ ...form, publication_year: e.target.value ? parseInt(e.target.value) : undefined })} />
            </div>
            <div className="space-y-2">
              <Label>Edition</Label>
              <Input value={form.edition || ""} onChange={(e) => setForm({ ...form, edition: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Shelf / location</Label>
              <Input value={form.shelf || ""} onChange={(e) => setForm({ ...form, shelf: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Total copies *</Label>
              <Input type="number" min={0} value={form.copies_total ?? 1} onChange={(e) => setForm({ ...form, copies_total: parseInt(e.target.value) || 0 })} required />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>Cover image URL</Label>
              <Input value={form.cover_url || ""} onChange={(e) => setForm({ ...form, cover_url: e.target.value })} />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>Description</Label>
              <Textarea value={form.description || ""} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} />
            </div>
            <div className="sm:col-span-2">
              <Button type="submit" className="w-full" disabled={save.isPending}>
                {save.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                {form.id ? "Save changes" : "Add book"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Scan dialog */}
      <Dialog open={scanOpen} onOpenChange={setScanOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Scan a book code</DialogTitle></DialogHeader>
          <ScanFinder onFound={handleScanned} onClose={() => setScanOpen(false)} />
        </DialogContent>
      </Dialog>

      {/* QR display */}
      <Dialog open={!!qrBook} onOpenChange={(v) => !v && setQrBook(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Book QR code</DialogTitle></DialogHeader>
          {qrBook && (
            <div className="flex flex-col items-center gap-3 py-4">
              <div className="rounded-xl border bg-white p-4">
                <QRCodeSVG value={qrBook.internal_code} size={200} />
              </div>
              <p className="font-semibold text-center">{qrBook.title}</p>
              <p className="font-mono text-xs text-muted-foreground">{qrBook.internal_code}</p>
              <Button variant="outline" onClick={() => window.print()} className="w-full">Print</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ScanFinder({ onFound, onClose }: { onFound: (s: string) => void; onClose: () => void }) {
  const [running, setRunning] = useState(false);
  const start = async () => {
    setRunning(true);
    await new Promise((r) => setTimeout(r, 100));
    try {
      const scanner = new Html5Qrcode("book-scan-reader");
      (window as any).__bookScanner = scanner;
      await scanner.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 220, height: 220 } },
        (decoded) => {
          scanner.stop().then(() => scanner.clear()).catch(() => {});
          (window as any).__bookScanner = null;
          onFound(decoded);
        },
        () => {},
      );
    } catch (err) {
      console.error(err);
      toast.error("Cannot open camera");
      setRunning(false);
    }
  };
  return (
    <div className="space-y-3">
      {!running ? (
        <Button onClick={start} className="w-full gap-2"><Camera className="h-4 w-4" /> Start camera</Button>
      ) : (
        <div id="book-scan-reader" className="overflow-hidden rounded-xl" />
      )}
      <Button variant="ghost" onClick={() => {
        try { (window as any).__bookScanner?.stop().then(() => (window as any).__bookScanner?.clear()); } catch {}
        onClose();
      }} className="w-full gap-2"><X className="h-4 w-4" /> Close</Button>
    </div>
  );
}
