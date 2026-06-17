import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth, isAdminLike } from "@/hooks/useAuth";
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
  Lock,
} from "lucide-react";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [normalOpen, setNormalOpen] = useState(true);
  const [programOpen, setProgramOpen] = useState(true);
  const [restaurantOpen, setRestaurantOpen] = useState(true);
  const location = useLocation();
  const { role, user, signOut } = useAuth();
  const { t } = useTranslation();

  // Role-based nav filtering — National Coordinator inherits Admin permissions
  const isAdmin = isAdminLike(role);
  const isDirector = role === "director";
  const isReception = role === "reception";

  const adminLikeRoles = ["admin", "national_coordinator"];

  const normalNavItems = [
    { to: "/", icon: LayoutDashboard, label: t("nav.dashboard"), roles: [...adminLikeRoles, "director", "reception"] },
    { to: "/register", icon: UserPlus, label: t("nav.register"), roles: [...adminLikeRoles, "director"] },
    { to: "/scanner", icon: ScanLine, label: t("nav.scanner"), roles: [...adminLikeRoles, "director", "reception"] },
    { to: "/visitors", icon: Users, label: t("nav.visitors"), roles: [...adminLikeRoles, "director", "reception"] },
    { to: "/statistics", icon: BarChart3, label: t("nav.statistics"), roles: [...adminLikeRoles, "director"] },
  ].filter(item => role && item.roles.includes(role));

  const programNavItems = [
    { to: "/programs", icon: GraduationCap, label: t("nav.programs") },
    { to: "/program-attendance", icon: ClipboardCheck, label: t("nav.attendance") },
    { to: "/program-report", icon: BarChart3, label: t("nav.report") },
  ];

  const showPrograms = isAdmin || isDirector || isReception;

  const restaurantNavItems = [
    { to: "/restaurant/orders", icon: UtensilsCrossed, label: t("nav.orders") },
    { to: "/restaurant/manual-order", icon: UserPlus, label: t("nav.manualOrder") },
    { to: "/restaurant/products", icon: UtensilsCrossed, label: t("nav.products") },
    { to: "/restaurant/analytics", icon: BarChart3, label: t("nav.analytics") },
  ];

  // Restaurant module is hidden in American Corner mode (kept in code for safety)
  const showRestaurant = false;

  const adminNavItems = [
    { to: "/users", icon: Shield, label: t("nav.users") },
    { to: "/access-control", icon: Lock, label: t("nav.accessControl") },
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

  const displayName = role ? t(`roles.${role}`, { defaultValue: role }) : t("roles.user");
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
        className={`fixed inset-y-0 left-0 z-50 flex w-[270px] flex-col overflow-hidden transition-transform duration-300 ease-out lg:static lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
        style={{
          background: "var(--gradient-sidebar)",
          boxShadow: "24px 0 80px -20px hsl(215 60% 4% / 0.45)",
        }}
      >
        {/* Subtle linen paper texture overlay */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.04] mix-blend-overlay"
          style={{ backgroundImage: "url('https://www.transparenttextures.com/patterns/linen-paper.png')" }}
        />
        {/* Decorative institutional rings — bottom-left */}
        <div className="pointer-events-none absolute -bottom-24 -left-24 h-80 w-80 rounded-full border border-sidebar-foreground/[0.05]" />
        <div className="pointer-events-none absolute -bottom-16 -left-16 h-64 w-64 rounded-full border border-sidebar-foreground/[0.03]" />

        {/* Logo */}
        <div className="relative z-10 flex h-[72px] items-center gap-3 px-6 border-b border-sidebar-border/60">
          <div className="absolute left-0 right-0 top-0 h-[3px]" style={{ background: "var(--gradient-flag)" }} />
          <img src="/logo-gss.png" alt="American Spaces" className="h-10 w-10 rounded object-contain shrink-0 bg-white p-0.5" />
          <div className="min-w-0">
            <h1 className="font-serif text-[18px] font-normal leading-tight tracking-tight text-sidebar-foreground">{t("app.name")}</h1>
            <p className="text-[10px] uppercase tracking-[0.15em] text-sidebar-foreground/50 truncate">{t("app.tagline")}</p>
          </div>
          <button
            className="ml-auto rounded-lg p-1.5 text-sidebar-foreground/60 hover:bg-sidebar-accent lg:hidden"
            onClick={() => setSidebarOpen(false)}
          >
            <X className="h-5 w-5" />
          </button>
        </div>


        {/* Navigation */}
        <nav className="relative z-10 flex-1 space-y-1 px-3 pt-4 overflow-y-auto">
          {/* Normal Attendance group */}
          <button
            onClick={() => setNormalOpen(!normalOpen)}
            className="flex w-full items-center justify-between px-3 mb-2"
          >
            <p className="text-[10px] font-semibold uppercase tracking-widest text-sidebar-foreground/30">
              {t("nav.groups.normal")}
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
                  {t("nav.groups.program")}
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

          {/* Restaurant group */}
          {showRestaurant && (
            <>
              <button
                onClick={() => setRestaurantOpen(!restaurantOpen)}
                className="flex w-full items-center justify-between px-3 mb-2"
              >
                <p className="text-[10px] font-semibold uppercase tracking-widest text-sidebar-foreground/30">
                  {t("nav.groups.restaurant")}
                </p>
                <ChevronDown className={`h-3 w-3 text-sidebar-foreground/30 transition-transform ${restaurantOpen ? "" : "-rotate-90"}`} />
              </button>
              {restaurantOpen && (
                <div className="space-y-1 mb-4">
                  {restaurantNavItems.map(renderNavItem)}
                </div>
              )}
            </>
          )}

          {/* Admin section */}
          {isAdmin && (
            <>
              <p className="px-3 mb-2 text-[10px] font-semibold uppercase tracking-widest text-sidebar-foreground/30">
                {t("nav.groups.administration")}
              </p>
              <div className="space-y-1">
                {adminNavItems.map(renderNavItem)}
              </div>
            </>
          )}
        </nav>

        {/* User profile */}
        <div className="relative z-10 border-t border-sidebar-border/50 bg-black/20 p-4">
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
              title={t("common.logout")}
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="relative flex h-16 items-center gap-4 border-b border-border/60 bg-card/90 backdrop-blur-md px-4 lg:px-8">
          <div className="absolute left-0 right-0 top-0 h-[3px]" style={{ background: "var(--gradient-flag)" }} />
          <button
            className="rounded-lg p-2 hover:bg-muted transition-colors lg:hidden"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="h-5 w-5 text-foreground" />
          </button>
          <div className="hidden lg:flex items-center gap-2">
            <span className="label-eyebrow">American Corner</span>
            <span className="h-3 w-px bg-border" />
            <span className="font-serif text-base text-foreground">Gitega</span>
          </div>
          <div className="flex-1" />
          <div className="hidden md:flex items-center gap-2 rounded-full border border-border bg-muted/40 px-3 py-1">
            <div className="h-1.5 w-1.5 rounded-full bg-success animate-pulse-slow" />
            <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Live</span>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-5 lg:p-8">{children}</main>
      </div>
    </div>
  );
}

