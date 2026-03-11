import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { addVisitor, generateVisitorId } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { QRCodeSVG } from "qrcode.react";
import { toast } from "sonner";
import { UserPlus, Download, Check } from "lucide-react";

export default function RegisterVisitor() {
  const navigate = useNavigate();
  const [step, setStep] = useState<"form" | "card">("form");
  const [newVisitorId, setNewVisitorId] = useState("");
  const [fullName, setFullName] = useState("");

  const [form, setForm] = useState({
    fullName: "",
    gender: "",
    dateOfBirth: "",
    phone: "",
    email: "",
    neighborhood: "",
    occupation: "",
  });

  const update = (key: string, value: string) => setForm((f) => ({ ...f, [key]: value }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.fullName || !form.gender || !form.phone || !form.neighborhood || !form.occupation) {
      toast.error("Please fill all required fields");
      return;
    }

    const visitorId = generateVisitorId();
    addVisitor({
      id: crypto.randomUUID(),
      visitorId,
      fullName: form.fullName,
      gender: form.gender as "male" | "female" | "other",
      dateOfBirth: form.dateOfBirth,
      phone: form.phone,
      email: form.email || undefined,
      neighborhood: form.neighborhood,
      occupation: form.occupation,
      registrationDate: new Date().toISOString().split("T")[0],
    });

    setNewVisitorId(visitorId);
    setFullName(form.fullName);
    setStep("card");
    toast.success("Visitor registered successfully!");
  };

  if (step === "card") {
    return (
      <div className="mx-auto max-w-md space-y-6">
        <div className="text-center">
          <Check className="mx-auto mb-3 h-12 w-12 text-success" />
          <h2 className="text-xl font-bold text-foreground">Registration Complete</h2>
          <p className="text-sm text-muted-foreground">Membership card ready</p>
        </div>

        {/* Card Preview */}
        <div id="membership-card" className="mx-auto w-full max-w-sm rounded-xl border border-border bg-card p-6 shadow-lg">
          <div className="mb-4 flex items-center gap-3 border-b border-border pb-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
              <span className="text-sm font-bold text-primary-foreground">GSS</span>
            </div>
            <div>
              <p className="text-xs font-semibold text-primary">GITEGA STUDY SPACE</p>
              <p className="text-[10px] text-muted-foreground">Membership Card</p>
            </div>
          </div>
          <div className="flex items-start gap-4">
            <QRCodeSVG value={newVisitorId} size={80} />
            <div>
              <p className="text-sm font-semibold text-foreground">{fullName}</p>
              <p className="mt-1 font-mono text-xs text-primary">{newVisitorId}</p>
            </div>
          </div>
        </div>

        <div className="flex gap-3">
          <Button className="flex-1 gap-2" variant="outline" onClick={() => {
            setStep("form");
            setForm({ fullName: "", gender: "", dateOfBirth: "", phone: "", email: "", neighborhood: "", occupation: "" });
          }}>
            <UserPlus className="h-4 w-4" />
            Register Another
          </Button>
          <Button className="flex-1 gap-2" onClick={() => navigate("/visitors")}>
            <Download className="h-4 w-4" />
            View Visitors
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Register Visitor</h1>
        <p className="text-sm text-muted-foreground">Add a new member to Gitega Study Space</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5 rounded-xl border border-border bg-card p-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Label htmlFor="fullName">Full Name *</Label>
            <Input id="fullName" value={form.fullName} onChange={(e) => update("fullName", e.target.value)} placeholder="Enter full name" />
          </div>

          <div>
            <Label>Gender *</Label>
            <Select value={form.gender} onValueChange={(v) => update("gender", v)}>
              <SelectTrigger><SelectValue placeholder="Select gender" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="male">Male</SelectItem>
                <SelectItem value="female">Female</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="dob">Date of Birth</Label>
            <Input id="dob" type="date" value={form.dateOfBirth} onChange={(e) => update("dateOfBirth", e.target.value)} />
          </div>

          <div>
            <Label htmlFor="phone">Phone Number *</Label>
            <Input id="phone" value={form.phone} onChange={(e) => update("phone", e.target.value)} placeholder="+257 xx xxx xxx" />
          </div>

          <div>
            <Label htmlFor="email">Email (optional)</Label>
            <Input id="email" type="email" value={form.email} onChange={(e) => update("email", e.target.value)} placeholder="email@example.com" />
          </div>

          <div>
            <Label htmlFor="neighborhood">Neighborhood / Commune *</Label>
            <Input id="neighborhood" value={form.neighborhood} onChange={(e) => update("neighborhood", e.target.value)} placeholder="e.g. Mushasha" />
          </div>

          <div>
            <Label htmlFor="occupation">Occupation *</Label>
            <Input id="occupation" value={form.occupation} onChange={(e) => update("occupation", e.target.value)} placeholder="e.g. Student, Entrepreneur" />
          </div>
        </div>

        <Button type="submit" className="w-full gap-2" size="lg">
          <UserPlus className="h-4 w-4" />
          Register Visitor
        </Button>
      </form>
    </div>
  );
}
