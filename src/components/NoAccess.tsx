import { Link } from "react-router-dom";
import { ShieldAlert, ArrowLeft } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useTranslation } from "react-i18next";

interface Props {
  allowedRoles?: string[];
}

export default function NoAccess({ allowedRoles }: Props) {
  const { role } = useAuth();
  const { t } = useTranslation();

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6">
      <div className="max-w-md w-full bg-card border border-border rounded-xl shadow-sm overflow-hidden">
        <div className="h-1" style={{ background: "var(--gradient-flag)" }} />
        <div className="p-8 text-center">
          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-accent/10 text-accent">
            <ShieldAlert className="h-7 w-7" />
          </div>
          <h1 className="font-serif text-3xl mb-2">Access Restricted</h1>
          <p className="text-sm text-muted-foreground mb-1">
            Your role does not have permission to view this page.
          </p>
          {role && (
            <p className="text-xs text-muted-foreground mb-6">
              Signed in as <span className="font-semibold text-foreground">{t(`roles.${role}`, { defaultValue: role })}</span>
              {allowedRoles && allowedRoles.length > 0 && (
                <> · Required: {allowedRoles.map(r => t(`roles.${r}`, { defaultValue: r })).join(", ")}</>
              )}
            </p>
          )}
          <Link
            to="/"
            className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
