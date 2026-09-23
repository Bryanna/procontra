"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import {
  Bell,
  Boxes,
  CalendarCheck,
  ChartNoAxesCombined,
  ClipboardList,
  ClipboardPlus,
  FileScan,
  HeartPulse,
  LayoutDashboard,
  Menu,
  MessageCircleMore,
  Moon,
  MoreHorizontal,
  PackageCheck,
  Search,
  Settings,
  Sun,
  UsersRound,
  X,
  type LucideIcon,
} from "lucide-react";
import { can, type Permission, type StaffRole, type StaffView } from "@/shared/auth/permissions";
import { LogoutConfirmation } from "./logout-confirmation";

interface NavigationItem {
  label: string;
  href: string;
  icon: LucideIcon;
  permission?: Permission;
  section: "operation" | "management";
}

export const navigationItems: NavigationItem[] = [
  { label: "Panel operativo", href: "/", icon: LayoutDashboard, section: "operation" },
  { label: "Pacientes", href: "/pacientes", icon: UsersRound, permission: "patients:read", section: "operation" },
  { label: "Documentos", href: "/documentos", icon: FileScan, permission: "documents:read", section: "operation" },
  { label: "Dispensaciones", href: "/dispensaciones", icon: ClipboardPlus, permission: "dispensations:read", section: "operation" },
  { label: "Inventario", href: "/inventario", icon: Boxes, permission: "inventory:read", section: "operation" },
  { label: "Continuidad", href: "/continuidad", icon: HeartPulse, permission: "continuity:read", section: "operation" },
  { label: "Reservas", href: "/reservas", icon: PackageCheck, permission: "reservations:read", section: "operation" },
  { label: "Mensajería", href: "/mensajeria", icon: MessageCircleMore, permission: "messaging:read", section: "operation" },
  { label: "Programa", href: "/programa", icon: ClipboardList, permission: "continuity:read", section: "management" },
  { label: "Reportes", href: "/reportes", icon: ChartNoAxesCombined, permission: "reports:read", section: "management" },
  { label: "Administración", href: "/administracion", icon: Settings, permission: "administration:manage", section: "management" },
];


const defaultIdentity: StaffView = {
  displayName: "Abel Medrano",
  role: "administrator",
  branches: [{ id: "branch-70", code: "70", name: "Esperanza" }],
};

export function visibleNavigationItems(role: StaffRole): NavigationItem[] {
  return navigationItems.filter((item) => !item.permission || can(role, item.permission));
}

function Brand() {
  return (
    <Link className="brand" href="/" aria-label="PROCONTRA — Panel operativo">
      <span className="brand-mark">
        <Image alt="Farmacia La Línea" height={44} priority src="/brand/logo-mark.png" width={44} />
      </span>
      <span className="brand-copy">
        <strong>PROCONTRA</strong>
        <small>Farmacia La Línea</small>
      </span>
    </Link>
  );
}

function Navigation({ role, onNavigate }: { role: StaffRole; onNavigate?: () => void }) {
  const pathname = usePathname();
  const items = visibleNavigationItems(role);
  const operationItems = items.filter((item) => item.section === "operation");
  const managementItems = items.filter((item) => item.section === "management");

  return (
    <nav className="main-nav" aria-label="Módulos de la plataforma">
      <p className="nav-label">OPERACIÓN</p>
      {operationItems.map((item) => {
        const Icon = item.icon;
        const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
        return (
          <Link
            aria-label={item.label}
            className={`nav-item${active ? " nav-item-active" : ""}`}
            href={item.href}
            key={item.href}
            onClick={onNavigate}
          >
            <Icon size={18} />
            <span>{item.label}</span>
            {item.label === "Documentos" && <i className="nav-count">3</i>}
            {item.label === "Continuidad" && <i className="nav-count nav-count-amber">17</i>}
          </Link>
        );
      })}
      {managementItems.length > 0 && <p className="nav-label nav-label-secondary">GESTIÓN</p>}
      {managementItems.map((item) => {
        const Icon = item.icon;
        const active = pathname.startsWith(item.href);
        return (
          <Link
            aria-label={item.label}
            className={`nav-item${active ? " nav-item-active" : ""}`}
            href={item.href}
            key={item.href}
            onClick={onNavigate}
          >
            <Icon size={18} />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

function BottomNavigation({ role, onMore }: { role: StaffRole; onMore: () => void }) {
  const pathname = usePathname();
  const items = [
    { label: "Inicio", href: "/", icon: LayoutDashboard, permission: undefined },
    { label: "Pacientes", href: "/pacientes", icon: UsersRound, permission: "patients:read" as Permission },
    { label: "Inventario", href: "/inventario", icon: Boxes, permission: "inventory:read" as Permission },
    { label: "Continuidad", href: "/continuidad", icon: HeartPulse, permission: "continuity:read" as Permission },
  ].filter((item) => !item.permission || can(role, item.permission));

  return (
    <nav
      className="bottom-nav"
      aria-label="Navegación inferior"
      style={{ gridTemplateColumns: `repeat(${items.length + 1}, minmax(0, 1fr))` }}
    >
      {items.map((item) => {
        const Icon = item.icon;
        const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
        return (
          <Link
            aria-label={item.label}
            className={`bottom-nav-item${active ? " bottom-nav-active" : ""}`}
            href={item.href}
            key={item.href}
          >
            <Icon size={21} />
            <span>{item.label}</span>
          </Link>
        );
      })}
      <button aria-label="Más opciones" className="bottom-nav-item" onClick={onMore} type="button">
        <MoreHorizontal size={22} />
        <span>Más</span>
      </button>
    </nav>
  );
}

const roleLabels: Record<StaffRole, string> = {
  administrator: "Administrador",
  coordinator: "Coordinación",
  pharmacist: "Farmacéutico",
  inventory: "Inventario",
  attention: "Atención",
  physician: "Médico",
  direction: "Dirección",
};

const initials = (name: string) => name
  .split(/\s+/)
  .filter(Boolean)
  .slice(0, 2)
  .map((part) => part[0]?.toUpperCase())
  .join("") || "US";

export function AppShell({
  children,
  identity,
}: {
  children: ReactNode;
  identity?: StaffView | null;
}) {
  const pathname = usePathname();
  const resolvedIdentity = identity === undefined ? defaultIdentity : identity;
  const [mobileOpen, setMobileOpen] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">("light");

  useEffect(() => {
    const restoreTheme = window.setTimeout(() => {
      const applied = document.documentElement.dataset.theme;
      let saved: string | null = null;
      try {
        saved = window.localStorage?.getItem("procontra-theme") ?? null;
      } catch {
        // The pre-paint theme remains authoritative when storage is unavailable.
      }
      const preferred = window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light";
      setTheme(applied === "dark" || applied === "light"
        ? applied
        : saved === "dark" || saved === "light"
          ? saved
          : preferred);
    }, 0);

    return () => window.clearTimeout(restoreTheme);
  }, []);

  const toggleTheme = () => {
    const next = theme === "light" ? "dark" : "light";
    setTheme(next);
    document.documentElement.dataset.theme = next;
    try {
      window.localStorage?.setItem("procontra-theme", next);
    } catch {
      // Theme switching still works when persistence is blocked.
    }
  };

  if (pathname === "/ingresar" || pathname === "/sin-acceso") {
    return <div className="auth-shell">{children}</div>;
  }

  if (!resolvedIdentity) {
    return <div className="auth-shell" aria-label="Identidad no disponible" />;
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-brand"><Brand /></div>
        <Navigation role={resolvedIdentity.role} />
        <div className="sidebar-footer">
          <div className="user-avatar">{initials(resolvedIdentity.displayName)}</div>
          <div><strong>{resolvedIdentity.displayName}</strong><span>{roleLabels[resolvedIdentity.role]}</span></div>
          <LogoutConfirmation displayName={resolvedIdentity.displayName} />
        </div>
      </aside>

      <div className="app-main">
        <header className="topbar">
          <button
            className="icon-button mobile-menu-button"
            type="button"
            aria-label="Abrir navegación"
            onClick={() => setMobileOpen(true)}
          >
            <Menu size={20} />
          </button>
          <div className="mobile-top-brand"><Brand /></div>
          <div className="topbar-search">
            <Search size={17} />
            <input aria-label="Buscar en PROCONTRA" placeholder="Buscar paciente, medicamento o documento…" />
            <kbd>⌘ K</kbd>
          </div>
          <div className="topbar-actions">
            <button
              aria-label={theme === "light" ? "Cambiar a modo oscuro" : "Cambiar a modo claro"}
              className="icon-button theme-toggle"
              onClick={toggleTheme}
              type="button"
            >
              {theme === "light" ? <Moon size={18} /> : <Sun size={18} />}
            </button>
            <button className="icon-button notification-button" type="button" aria-label="Notificaciones">
              <Bell size={19} /><i />
            </button>
            <button className="date-chip" type="button">
              <CalendarCheck size={16} /> Operación de hoy
            </button>
          </div>
        </header>
        <main className="content">{children}</main>
      </div>

      <BottomNavigation role={resolvedIdentity.role} onMore={() => setMobileOpen(true)} />

      {mobileOpen && (
        <div className="mobile-overlay" role="dialog" aria-label="Navegación principal" aria-modal="true">
          <button className="mobile-backdrop" aria-label="Cerrar navegación" onClick={() => setMobileOpen(false)} />
          <aside className="mobile-drawer">
            <div className="mobile-drawer-heading">
              <Brand />
              <button className="icon-button" type="button" aria-label="Cerrar navegación" onClick={() => setMobileOpen(false)}>
                <X size={20} />
              </button>
            </div>
            <Navigation role={resolvedIdentity.role} onNavigate={() => setMobileOpen(false)} />
          </aside>
        </div>
      )}
    </div>
  );
}
