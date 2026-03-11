import { useState } from "react";
import { getVisitors, getVisitorVisits, useStore } from "@/lib/store";
import { Input } from "@/components/ui/input";
import { QRCodeSVG } from "qrcode.react";
import { Search, User, ChevronRight, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Visitor } from "@/lib/store";

export default function Visitors() {
  useStore();
  const visitors = getVisitors();
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Visitor | null>(null);

  const filtered = visitors.filter(
    (v) =>
      v.fullName.toLowerCase().includes(search.toLowerCase()) ||
      v.visitorId.toLowerCase().includes(search.toLowerCase()) ||
      v.phone.includes(search)
  );

  if (selected) {
    const visits = getVisitorVisits(selected.visitorId).sort(
      (a, b) => b.timestamp.localeCompare(a.timestamp)
    );

    return (
      <div className="mx-auto max-w-2xl space-y-6">
        <Button variant="ghost" className="gap-2" onClick={() => setSelected(null)}>
          <ArrowLeft className="h-4 w-4" /> Back to list
        </Button>

        <div className="rounded-xl border border-border bg-card p-6">
          <div className="flex items-start gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-primary/10">
              <User className="h-8 w-8 text-primary" />
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-bold text-foreground">{selected.fullName}</h2>
              <p className="font-mono text-sm text-primary">{selected.visitorId}</p>
            </div>
            <QRCodeSVG value={selected.visitorId} size={72} />
          </div>

          <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
            <Detail label="Phone" value={selected.phone} />
            <Detail label="Email" value={selected.email || "—"} />
            <Detail label="Gender" value={selected.gender} />
            <Detail label="Date of Birth" value={selected.dateOfBirth || "—"} />
            <Detail label="Neighborhood" value={selected.neighborhood} />
            <Detail label="Occupation" value={selected.occupation} />
            <Detail label="Registered" value={selected.registrationDate} />
          </div>
        </div>

        {/* Visit History */}
        <div className="rounded-xl border border-border bg-card p-6">
          <h3 className="mb-4 text-sm font-semibold text-foreground">Visit History ({visits.length})</h3>
          {visits.length === 0 ? (
            <p className="text-sm text-muted-foreground">No visits recorded yet.</p>
          ) : (
            <div className="space-y-1.5">
              {visits.map((v) => (
                <div key={v.id} className="flex items-center justify-between rounded-md bg-muted/50 px-3 py-2 text-sm">
                  <div className="flex items-center gap-2">
                    <span className={`h-1.5 w-1.5 rounded-full ${v.action === "check_in" ? "bg-success" : "bg-muted-foreground"}`} />
                    <span className="text-foreground">
                      {v.action === "check_in" ? "Entered" : "Left"}{" "}
                      {v.room === "computer_lab" ? "Computer Lab" : "Multipurpose Room"}
                    </span>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {new Date(v.timestamp).toLocaleDateString()} {new Date(v.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Visitors</h1>
          <p className="text-sm text-muted-foreground">{visitors.length} registered members</p>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          className="pl-10"
          placeholder="Search by name, ID, or phone..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="space-y-2">
        {filtered.map((v) => (
          <button
            key={v.id}
            onClick={() => setSelected(v)}
            className="flex w-full items-center gap-4 rounded-xl border border-border bg-card p-4 text-left transition-shadow hover:shadow-md"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <User className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground truncate">{v.fullName}</p>
              <p className="text-xs text-muted-foreground">
                <span className="font-mono text-primary">{v.visitorId}</span> · {v.occupation} · {v.neighborhood}
              </p>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </button>
        ))}
        {filtered.length === 0 && (
          <p className="py-8 text-center text-sm text-muted-foreground">No visitors found.</p>
        )}
      </div>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-medium text-foreground capitalize">{value}</p>
    </div>
  );
}
