import { useParams } from "react-router-dom";
import { useVisitorByQR } from "@/lib/supabase-store";
import MembershipCard from "@/components/MembershipCard";
import { Sparkles } from "lucide-react";

export default function DigitalCard() {
  const { visitorId } = useParams<{ visitorId: string }>();
  const { data: visitor, isLoading } = useVisitorByQR(visitorId);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <p className="text-sm text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (!visitor) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <div className="text-center space-y-3">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-destructive/10">
            <Sparkles className="h-8 w-8 text-destructive" />
          </div>
          <h1 className="text-lg font-bold text-foreground">Card not found</h1>
          <p className="text-sm text-muted-foreground">The member ID is not valid.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <h1 className="text-lg font-bold text-foreground">My Membership Card</h1>
          <p className="text-sm text-muted-foreground">American Corner</p>
        </div>
        <MembershipCard fullName={visitor.full_name} visitorId={visitor.visitor_id} photo={visitor.photo} />
      </div>
    </div>
  );
}
