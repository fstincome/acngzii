import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Eye, EyeOff, LogIn, Loader2, Star } from "lucide-react";
import { Navigate } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import logoGss from "@/assets/logo-gss.png";

export default function Login() {
  const { user, loading, signIn } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { toast } = useToast();

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (user) return <Navigate to="/" replace />;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    const { error } = await signIn(email, password);
    if (error) {
      toast({
        title: "Sign-in error",
        description:
          error.message === "Invalid login credentials"
            ? "Incorrect email or password"
            : error.message,
        variant: "destructive",
      });
    }
    setSubmitting(false);
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-background">
      {/* Editorial left panel */}
      <div className="relative hidden lg:flex flex-col justify-between p-12 text-white overflow-hidden bg-primary">
        <div className="absolute inset-0 bg-[var(--gradient-flag)] opacity-90" />
        <div className="absolute inset-x-0 top-0 h-1.5 flag-stripe" />
        <div className="absolute inset-x-0 bottom-0 h-1.5 flag-stripe" />

        <div className="relative z-10 flex items-center gap-3">
          <img
            src={logoGss}
            alt="American Corner Gitega"
            className="h-12 w-12 rounded border border-white/30 bg-white/10 object-contain p-1"
          />
          <div>
            <p className="font-serif text-xl leading-none">American Corner</p>
            <p className="text-xs uppercase tracking-[0.2em] text-white/70 mt-1">
              Gitega · Burundi
            </p>
          </div>
        </div>

        <div className="relative z-10 space-y-5">
          <div className="flex items-center gap-1.5 text-white/80">
            {[...Array(5)].map((_, i) => (
              <Star key={i} className="h-3 w-3 fill-white/90 text-white/90" />
            ))}
          </div>
          <h2 className="font-serif text-5xl leading-[1.05] tracking-tight">
            Member &amp; Activities Management
          </h2>
          <p className="text-base text-white/80 max-w-md leading-relaxed">
            A unified workspace for the American Corner Gitega team — visitors,
            programs, scholarships, library and restaurant, all in one place.
          </p>
          <div className="flex items-center gap-3 pt-4">
            <span className="h-px w-12 bg-white/40" />
            <span className="text-[11px] uppercase tracking-[0.3em] text-white/70">
              Est. 2026
            </span>
          </div>
        </div>

        <div className="relative z-10 text-[11px] uppercase tracking-[0.25em] text-white/60">
          Operated by the National Coordination Office
        </div>
      </div>

      {/* Form right panel */}
      <div className="flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-md">
          <div className="lg:hidden flex items-center gap-3 mb-8">
            <img
              src={logoGss}
              alt="American Corner"
              className="h-12 w-12 rounded object-contain"
            />
            <div>
              <p className="font-serif text-xl leading-none text-foreground">
                American Corner
              </p>
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground mt-1">
                Gitega
              </p>
            </div>
          </div>

          <div className="space-y-1 mb-8">
            <p className="text-xs uppercase tracking-[0.25em] text-primary font-semibold">
              Secure access
            </p>
            <h1 className="font-serif text-4xl text-foreground">Sign in</h1>
            <p className="text-sm text-muted-foreground">
              Enter your credentials to access the system.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-xs uppercase tracking-wider">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="you@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="h-11"
              />
            </div>
            <div className="space-y-2">
              <Label
                htmlFor="password"
                className="text-xs uppercase tracking-wider"
              >
                Password
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="pr-10 h-11"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>
            <Button
              type="submit"
              className="w-full h-11 text-sm uppercase tracking-wider font-semibold"
              disabled={submitting}
            >
              {submitting ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <LogIn className="h-4 w-4 mr-2" />
              )}
              Sign in
            </Button>
          </form>

          <p className="mt-10 text-[11px] uppercase tracking-[0.25em] text-muted-foreground text-center">
            American Corner Gitega · National Coordination
          </p>
        </div>
      </div>
    </div>
  );
}
