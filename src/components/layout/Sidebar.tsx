"use client";

import { useEffect, useState } from "react";
import { signOut } from "next-auth/react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import {
  LayoutDashboard,
  ShoppingBag,
  BookOpen,
  Award,
  BarChart3,
  FileSpreadsheet,
  Target,
  Clock,
  Bookmark,
  MessageSquare,
  FolderDown,
  Newspaper,
  Settings,
  LogOut,
  Users,
  CheckCircle2,
  Building2,
  Layers,
  Send,
  ScrollText,
  CreditCard,
  ClipboardList,
  Menu,
  X,
  Brain,
  Flag,
  type LucideIcon,
} from "lucide-react";
import { ROLE_LABELS, isAdmin, type AppRole } from "@/lib/roles";
import { cn } from "@/lib/utils";

interface SidebarProps {
  user: {
    name?: string | null;
    email?: string | null;
    role?: string;
  };
}

interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
}

interface NavGroup {
  title?: string;
  items: NavItem[];
}

const STUDENT_NAV: NavGroup[] = [
  {
    items: [
      { label: "Dashboard", href: "/student", icon: LayoutDashboard },
      { label: "Mock Tests", href: "/student/mocks", icon: ClipboardList },
      { label: "My Exams", href: "/student/exams", icon: BookOpen },
    ],
  },
  {
    title: "Performance",
    items: [
      { label: "My Results", href: "/student/my-results", icon: Award },
      { label: "Daily Review", href: "/student/review", icon: Brain },
      { label: "Analysis", href: "/student/analysis", icon: BarChart3 },
      { label: "Mistakes", href: "/student/mistakes", icon: FileSpreadsheet },
      { label: "Practice & Retests", href: "/student/practice", icon: Target },
      { label: "Bookmarks", href: "/student/bookmarks", icon: Bookmark },
      { label: "History", href: "/student/history", icon: Clock },
    ],
  },
  {
    title: "More",
    items: [
      { label: "Messages", href: "/student/messages", icon: MessageSquare },
      { label: "Resources", href: "/student/documents", icon: FolderDown },
      { label: "News & Updates", href: "/student/news", icon: Newspaper },
      { label: "Exam Store", href: "/student/buy-exams", icon: ShoppingBag },
      { label: "Settings", href: "/student/settings", icon: Settings },
    ],
  },
];

const MENTOR_NAV: NavGroup[] = [
  {
    items: [
      { label: "Dashboard", href: "/mentor", icon: LayoutDashboard },
      { label: "Students & Reports", href: "/mentor/students", icon: Users },
      { label: "Batch Analytics", href: "/mentor/analytics", icon: BarChart3 },
    ],
  },
  {
    title: "Content",
    items: [
      { label: "Question Bank", href: "/mentor/question-banks", icon: BookOpen },
      { label: "Test Manager", href: "/mentor/test-manager", icon: Target },
      { label: "Question Reports", href: "/mentor/reports", icon: Flag },
      { label: "Study Materials", href: "/mentor/documents", icon: FolderDown },
    ],
  },
  {
    title: "Communication",
    items: [
      { label: "Approvals & Requests", href: "/mentor/approvals", icon: CheckCircle2 },
      { label: "Announcements", href: "/mentor/messages", icon: MessageSquare },
      { label: "Settings", href: "/mentor/settings", icon: Settings },
    ],
  },
];

const ADMIN_NAV: NavGroup[] = [
  {
    items: [
      { label: "Dashboard", href: "/admin", icon: LayoutDashboard },
      { label: "Academy Analytics", href: "/admin/analytics", icon: BarChart3 },
    ],
  },
  {
    title: "Institute",
    items: [
      { label: "Organization", href: "/admin/organization", icon: Building2 },
      { label: "Users", href: "/admin/users", icon: Users },
      { label: "Batches", href: "/admin/batches", icon: Layers },
      { label: "Approvals", href: "/admin/approvals", icon: CheckCircle2 },
    ],
  },
  {
    title: "Content",
    items: [
      { label: "Question Bank", href: "/admin/question-banks", icon: BookOpen },
      { label: "Test Manager", href: "/admin/test-manager", icon: Target },
      { label: "Question Reports", href: "/admin/reports", icon: Flag },
      { label: "Test Packages", href: "/admin/packages", icon: ShoppingBag },
    ],
  },
  {
    title: "System",
    items: [
      { label: "WhatsApp & SMS", href: "/admin/messaging", icon: MessageSquare },
      { label: "Notification Logs", href: "/admin/notifications", icon: Send },
      { label: "Audit Log", href: "/admin/audit-log", icon: ScrollText },
      { label: "Settings", href: "/admin/settings", icon: Settings },
    ],
  },
];

const PARENT_NAV: NavGroup[] = [
  {
    items: [
      { label: "Overview", href: "/dashboard/parent", icon: LayoutDashboard },
      { label: "Linked Children", href: "/dashboard/parent/children", icon: Users },
      { label: "Report Cards", href: "/dashboard/parent/reports", icon: Award },
      { label: "Weakness Tracker", href: "/dashboard/parent/weaknesses", icon: FileSpreadsheet },
    ],
  },
  {
    title: "Account",
    items: [
      { label: "Request Mock Tests", href: "/dashboard/parent/requests", icon: Send },
      { label: "Fees & Payments", href: "/dashboard/parent/payments", icon: CreditCard },
      { label: "Messages", href: "/dashboard/parent/messages", icon: MessageSquare },
      { label: "Settings", href: "/dashboard/parent/settings", icon: Settings },
    ],
  },
];

const ROOTS = new Set(["/student", "/mentor", "/admin", "/dashboard/parent"]);

function navFor(role?: string): { groups: NavGroup[]; portal: string } {
  if (isAdmin(role)) return { groups: ADMIN_NAV, portal: "Admin Portal" };
  if (role === "MENTOR" || role === "FACULTY") return { groups: MENTOR_NAV, portal: "Faculty Portal" };
  if (role === "PARENT") return { groups: PARENT_NAV, portal: "Parent Portal" };
  return { groups: STUDENT_NAV, portal: "Student Portal" };
}

function BrandMark() {
  return (
    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 text-base font-black text-white shadow-lg shadow-blue-600/25">
      A
    </div>
  );
}

export function Sidebar({ user }: SidebarProps) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const { groups, portal } = navFor(user.role);

  // Close the mobile drawer whenever the route changes
  useEffect(() => setOpen(false), [pathname]);

  const isActive = (href: string) =>
    pathname === href || (!ROOTS.has(href) && pathname.startsWith(`${href}/`));

  const roleLabel = ROLE_LABELS[user.role as AppRole] ?? user.role;

  const nav = (
    <>
      <div className="flex items-center gap-3 border-b border-white/[0.06] px-4 py-4">
        <Link href="/" className="flex min-w-0 items-center gap-3">
          <BrandMark />
          <div className="min-w-0">
            <span className="block text-base font-bold leading-tight text-white">Astra</span>
            <span className="block text-[11px] font-medium text-blue-400">{portal}</span>
          </div>
        </Link>
        <button onClick={() => setOpen(false)} className="ml-auto rounded-lg p-1.5 text-slate-400 hover:bg-white/5 hover:text-white lg:hidden" aria-label="Close menu">
          <X className="h-5 w-5" />
        </button>
      </div>

      <nav className="flex-1 space-y-5 overflow-y-auto px-3 py-4" aria-label="Main">
        {groups.map((group, gi) => (
          <div key={gi} className="space-y-0.5">
            {group.title && <p className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-wider text-slate-500">{group.title}</p>}
            {group.items.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                    active ? "bg-blue-600/15 font-medium text-blue-300" : "text-slate-400 hover:bg-white/[0.04] hover:text-slate-100"
                  )}
                >
                  <Icon className={cn("h-4 w-4 shrink-0", active ? "text-blue-400" : "text-slate-500")} />
                  <span className="truncate">{item.label}</span>
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      <div className="border-t border-white/[0.06] p-3">
        <div className="flex items-center gap-3 rounded-xl bg-white/[0.03] p-2.5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-sm font-bold uppercase text-white">
            {user.name?.charAt(0) || "U"}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-slate-100" title={user.name || ""}>{user.name}</p>
            <p className="truncate text-[11px] text-slate-500" title={user.email || ""}>{roleLabel} · {user.email}</p>
          </div>
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="rounded-lg p-2 text-slate-400 transition hover:bg-rose-500/10 hover:text-rose-400"
            aria-label="Log out"
            title="Log out"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </>
  );

  return (
    <>
      {/* Mobile top bar */}
      <header className="fixed inset-x-0 top-0 z-30 flex h-14 items-center gap-3 border-b border-white/[0.06] bg-slate-950/90 px-4 backdrop-blur-xl lg:hidden">
        <button onClick={() => setOpen(true)} className="rounded-lg p-1.5 text-slate-300 hover:bg-white/5" aria-label="Open menu">
          <Menu className="h-5 w-5" />
        </button>
        <BrandMark />
        <span className="text-sm font-bold text-white">Astra</span>
        <span className="text-xs text-slate-500">· {portal}</span>
      </header>

      {/* Mobile drawer backdrop */}
      {open && <div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden" onClick={() => setOpen(false)} />}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r border-white/[0.06] bg-slate-950/95 backdrop-blur-xl transition-transform duration-200 lg:static lg:z-20 lg:w-64 lg:translate-x-0 lg:bg-slate-900/40",
          open ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {nav}
      </aside>
    </>
  );
}
