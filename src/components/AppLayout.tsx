import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import {
  LayoutDashboard,
  UserPlus,
  ScanLine,
  Users,
  BarChart3,
  Menu,
  X,
  LogOut,
  Sparkles,
  GraduationCap,
  ClipboardCheck,
  ChevronDown,
  Shield,
  UtensilsCrossed,
} from "lucide-react";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [normalOpen, setNormalOpen] = useState(true);
  const [programOpen, setProgramOpen] = useState(true);
  const [restaurantOpen, setRestaurantOpen] = useState(true);
  const location = useLocation();
  const { role, user, signOut } = useAuth();

  // Role-based nav filtering
  const isAdmin = role === "admin";
  const isDirector = role === "director";
  const isReception = role === "reception";

  const normalNavItems = [
    { to: "/", icon: LayoutDashboard, label: "Tableau de bord", roles: ["admin", "director", "reception"] },
    { to: "/register", icon: UserPlus, label: "Inscription", roles: ["admin", "director"] },
    { to: "/scanner", icon: ScanLine, label: "Scanner", roles: ["admin", "director", "reception"] },
    { to: "/visitors", icon: Users, label: "Visiteurs", roles: ["admin", "director", "reception"] },
    { to: "/statistics", icon: BarChart3, label: "Statistiques", roles: ["admin", "director"] },
  ].filter(item => role && item.roles.includes(role));

  const programNavItems = [
    { to: "/programs", icon: GraduationCap, label: "Programmes" },
    { to: "/program-attendance", icon: ClipboardCheck, label: "Présence" },
    { to: "/program-report", icon: BarChart3, label: "Rapport" },
  ];

  const showPrograms = isAdmin || isDirector || isReception;

  const adminNavItems = [
    { to: "/users", icon: Shield, label: "Utilisateurs" },
  ];

  const renderNavItem = (item: { to: string; icon: any; label: string }) => {
    const active = location.pathname === item.to;
    return (
      <Link
        key={item.to}
        to={item.to}
        onClick={() => setSidebarOpen(false)}
        className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-medium transition-all duration-200 ${
          active
            ? "bg-sidebar-primary/15 text-sidebar-primary shadow-sm"
            : "text-sidebar-foreground/60 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground"
        }`}
      >
        <div
          className={`flex h-8 w-8 items-center justify-center rounded-lg transition-all duration-200 ${
            active
              ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-md"
              : "bg-sidebar-accent/50 text-sidebar-foreground/50 group-hover:bg-sidebar-accent group-hover:text-sidebar-foreground/80"
          }`}
        >
          <item.icon className="h-4 w-4" />
        </div>
        {item.label}
        {active && (
          <div className="ml-auto h-1.5 w-1.5 rounded-full bg-sidebar-primary animate-pulse-slow" />
        )}
      </Link>
    );
  };

  const ROLE_LABELS: Record<string, string> = {
    admin: "Administrateur",
    director: "Directeur",
    reception: "Réception",
  };

  const displayName = role ? ROLE_LABELS[role] || role : "Utilisateur";
  const initial = displayName.charAt(0).toUpperCase();

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-foreground/30 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-[270px] flex-col transition-transform duration-300 ease-out lg:static lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
        style={{ background: "var(--gradient-sidebar)" }}
      >
        {/* Logo */}
        <div className="flex h-[72px] items-center gap-3 px-6">
          <div className="icon-box h-10 w-10 shrink-0">
            <Sparkles className="h-5 w-5 text-primary-foreground" />
          </div>
          <div className="min-w-0">
            <h1 className="text-[15px] font-bold tracking-tight text-sidebar-foreground">GSS Access</h1>
            <p className="text-[11px] text-sidebar-foreground/50 truncate">Gitega Study Space</p>
          </div>
          <button
            className="ml-auto rounded-lg p-1.5 text-sidebar-foreground/60 hover:bg-sidebar-accent lg:hidden"
            onClick={() => setSidebarOpen(false)}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 px-3 pt-4 overflow-y-auto">
          {/* Normal Attendance group */}
          <button
            onClick={() => setNormalOpen(!normalOpen)}
            className="flex w-full items-center justify-between px-3 mb-2"
          >
            <p className="text-[10px] font-semibold uppercase tracking-widest text-sidebar-foreground/30">
              Présence Normale
            </p>
            <ChevronDown className={`h-3 w-3 text-sidebar-foreground/30 transition-transform ${normalOpen ? "" : "-rotate-90"}`} />
          </button>
          {normalOpen && (
            <div className="space-y-1 mb-4">
              {normalNavItems.map(renderNavItem)}
            </div>
          )}

          {/* Program Attendance group - admin & director only */}
          {showPrograms && (
            <>
              <button
                onClick={() => setProgramOpen(!programOpen)}
                className="flex w-full items-center justify-between px-3 mb-2"
              >
                <p className="text-[10px] font-semibold uppercase tracking-widest text-sidebar-foreground/30">
                  Présence Programme
                </p>
                <ChevronDown className={`h-3 w-3 text-sidebar-foreground/30 transition-transform ${programOpen ? "" : "-rotate-90"}`} />
              </button>
              {programOpen && (
                <div className="space-y-1 mb-4">
                  {programNavItems.map(renderNavItem)}
                </div>
              )}
            </>
          )}

          {/* Admin section */}
          {isAdmin && (
            <>
              <p className="px-3 mb-2 text-[10px] font-semibold uppercase tracking-widest text-sidebar-foreground/30">
                Administration
              </p>
              <div className="space-y-1">
                {adminNavItems.map(renderNavItem)}
              </div>
            </>
          )}
        </nav>

        {/* User profile */}
        <div className="border-t border-sidebar-border/50 p-4">
          <div className="flex items-center gap-3 rounded-xl bg-sidebar-accent/40 px-3 py-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full font-semibold text-xs text-primary-foreground" style={{ background: "var(--gradient-primary)" }}>
              {initial}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-semibold text-sidebar-foreground truncate">{displayName}</p>
              <p className="text-[10px] text-sidebar-foreground/40 truncate">{user?.email}</p>
            </div>
            <button
              onClick={signOut}
              className="rounded-lg p-1.5 text-sidebar-foreground/30 transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground/60"
              title="Se déconnecter"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex h-16 items-center gap-4 border-b border-border/60 bg-card/80 backdrop-blur-md px-4 lg:px-8">
          <button
            className="rounded-xl p-2 hover:bg-muted transition-colors lg:hidden"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="h-5 w-5 text-foreground" />
          </button>
          <div className="flex-1" />
        </header>

        <main className="flex-1 overflow-y-auto p-5 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
