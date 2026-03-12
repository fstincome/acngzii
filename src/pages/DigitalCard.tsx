import { useParams } from "react-router-dom";
import { findVisitorByQR } from "@/lib/store";
import MembershipCard from "@/components/MembershipCard";
import { Sparkles } from "lucide-react";

export default function DigitalCard() {
  const { visitorId } = useParams<{ visitorId: string }>();
  const visitor = visitorId ? findVisitorByQR(visitorId) : undefined;

  if (!visitor) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <div className="text-center space-y-3">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-destructive/10">
            <Sparkles className="h-8 w-8 text-destructive" />
          </div>
          <h1 className="text-lg font-bold text-foreground">Carte introuvable</h1>
          <p className="text-sm text-muted-foreground">L'identifiant membre n'est pas valide.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <h1 className="text-lg font-bold text-foreground">Ma Carte de Membre</h1>
          <p className="text-sm text-muted-foreground">Gitega Study Space</p>
        </div>
        <MembershipCard fullName={visitor.fullName} visitorId={visitor.visitorId} />
      </div>
    </div>
  );
}
