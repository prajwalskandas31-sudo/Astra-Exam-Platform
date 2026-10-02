"use client";

import { signOut } from "next-auth/react";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ProfileSwitcher } from "@/components/layout/ProfileSwitcher";
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
  Sparkles,
  Send,
  ShieldCheck,
  Bell,
  CreditCard,
  UserPlus
} from "lucide-react";

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
  icon: any;
  badge?: string;
}

export function Sidebar({ user }: SidebarProps) {
  const pathname = usePathname();

  const isAdmin = user.role === "ADMIN" || user.role === "INSTITUTE_ADMIN" || user.role === "SUPER_ADMIN";
  const isMentor = user.role === "MENTOR" || user.role === "FACULTY";
  const isParent = user.role === "PARENT";
  const isStudent = user.role === "STUDENT" || (!isAdmin && !isMentor && !isParent);

  // Student Navigation Links
  const studentNavItems: NavItem[] = [
    { label: "Dashboard", href: "/student", icon: LayoutDashboard },
    { label: "Buy Exams", href: "/student/buy-exams", icon: ShoppingBag },
    { label: "My Exams", href: "/student/exams", icon: BookOpen },
    { label: "My Results", href: "/student/my-results", icon: Award },
    { label: "Analysis", href: "/student/analysis", icon: BarChart3 },
    { label: "Mistakes", href: "/student/mistakes", icon: FileSpreadsheet, badge: "NEW" },
    { label: "Practice Mode", href: "/student/practice", icon: Target },
    { label: "History", href: "/student/history", icon: Clock },
    { label: "Bookmarked Questions", href: "/student/bookmarks", icon: Bookmark },
    { label: "Messages", href: "/student/messages", icon: MessageSquare },
    { label: "Resources", href: "/student/documents", icon: FolderDown },
    { label: "News & Updates", href: "/student/news", icon: Newspaper },
    { label: "Settings", href: "/student/settings", icon: Settings },
  ];

  // Mentor Navigation Links
  const mentorNavItems: NavItem[] = [
    { label: "Dashboard", href: "/mentor", icon: LayoutDashboard },
    { label: "Candidate Oversight & Reports", href: "/mentor/students", icon: Users },
    { label: "Question Banks", href: "/mentor/question-banks", icon: BookOpen },
    { label: "Test Manager", href: "/mentor/test-manager", icon: Target },
    { label: "Student & Remote Requests", href: "/mentor/approvals", icon: CheckCircle2 },
    { label: "Batch Analytics", href: "/mentor/analytics", icon: BarChart3 },
    { label: "Announcements", href: "/mentor/messages", icon: MessageSquare },
    { label: "Study Materials", href: "/mentor/documents", icon: FolderDown },
    { label: "Settings", href: "/mentor/settings", icon: Settings },
  ];

  // Admin Navigation Links
  const adminNavItems: NavItem[] = [
    { label: "Dashboard", href: "/admin", icon: LayoutDashboard },
    { label: "Organization & Branding", href: "/admin/organization", icon: Building2 },
    { label: "User Management", href: "/admin/users", icon: Users },
    { label: "Batch Management", href: "/admin/batches", icon: Layers },
    { label: "Test Packages Catalog", href: "/admin/packages", icon: ShoppingBag },
    { label: "Question Banks", href: "/admin/question-banks", icon: BookOpen },
    { label: "Test Manager & Templates", href: "/admin/test-manager", icon: Target },
    { label: "Approvals", href: "/admin/approvals", icon: CheckCircle2 },
    { label: "Academy Analytics", href: "/admin/analytics", icon: BarChart3 },
    { label: "WhatsApp Logs", href: "/admin/notifications", icon: Send },
    { label: "Admin Settings", href: "/admin/settings", icon: Settings },
  ];

  // Parent Navigation Links
  const parentNavItems: NavItem[] = [
    { label: "Child Overview", href: "/dashboard/parent", icon: LayoutDashboard },
    { label: "Linked Children", href: "/dashboard/parent/children", icon: Users },
    { label: "Exam Reports & Statements", href: "/dashboard/parent/reports", icon: Award },
    { label: "Fee Payments & Invoices", href: "/dashboard/parent/payments", icon: CreditCard, badge: "FEE" },
    { label: "Request Mock Tests", href: "/dashboard/parent/requests", icon: Send },
    { label: "Weakness Tracker", href: "/dashboard/parent/weaknesses", icon: FileSpreadsheet },
    { label: "Faculty Messages", href: "/dashboard/parent/messages", icon: MessageSquare },
    { label: "Parent Settings", href: "/dashboard/parent/settings", icon: Settings },
  ];

  const currentNavItems = isStudent 
    ? studentNavItems 
    : isMentor 
    ? mentorNavItems 
    : isAdmin 
    ? adminNavItems 
    : parentNavItems;

  return (
    <aside className="w-64 border-r border-white/10 bg-slate-900/60 backdrop-blur-xl flex flex-col h-full shrink-0 shadow-2xl relative z-20 overflow-hidden">
      
      {/* Sidebar Header */}
      <div className="p-4 border-b border-white/10 bg-white/[0.02]">
        <Link href="/" className="flex items-center gap-3 hover:opacity-90 transition-opacity mb-3">
          <div className="w-9 h-9 bg-gradient-to-tr from-blue-600 via-indigo-600 to-blue-500 rounded-xl flex items-center justify-center font-black text-white shadow-lg shadow-blue-500/20 text-lg">
            M
          </div>
          <div>
            <span className="text-lg font-black tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white via-slate-200 to-slate-400 block leading-tight">
              Mock Test Club
            </span>
            <span className="text-[10px] text-blue-400 font-semibold tracking-wider uppercase block">
              {isAdmin ? "Admin Portal" : isMentor ? "Faculty Portal" : isParent ? "Parent Oversight" : "Student Buddy"}
            </span>
          </div>
        </Link>

        {/* Profile Switcher */}
        <ProfileSwitcher currentRole={user.role || "STUDENT"} />

        {/* User Card */}
        <div className="space-y-1 bg-black/30 p-2.5 rounded-xl border border-white/5 relative overflow-hidden group">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-[10px] font-bold uppercase">
              {user.name ? user.name.charAt(0) : "U"}
            </div>
            <div className="overflow-hidden flex-1">
              <p className="font-semibold text-xs text-slate-200 truncate" title={user.name || ""}>{user.name}</p>
              <p className="text-[9px] text-slate-400 truncate" title={user.email || ""}>{user.email}</p>
            </div>
            <span className="text-[9px] bg-blue-500/20 text-blue-300 border border-blue-500/30 px-1.5 py-0.5 rounded font-bold uppercase shrink-0">
              {user.role}
            </span>
          </div>
        </div>
      </div>

      {/* Navigation List */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto custom-scrollbar">
        {currentNavItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          return (
            <Link key={item.href} href={item.href}>
              <span className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs transition-all ${
                isActive 
                  ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30 shadow-[0_0_15px_rgba(37,99,235,0.15)] font-semibold' 
                  : 'text-slate-400 hover:bg-white/5 hover:text-slate-200 border border-transparent'
              }`}>
                <div className="flex items-center gap-3">
                  <Icon className={`w-4 h-4 ${isActive ? 'text-blue-400' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span className="px-1.5 py-0.5 text-[9px] font-bold bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 rounded uppercase tracking-wider">
                    {item.badge}
                  </span>
                )}
              </span>
            </Link>
          );
        })}
      </nav>

      {/* Logout Footer */}
      <div className="p-3 border-t border-white/10 bg-white/[0.02]">
        <Button 
          variant="outline" 
          className="w-full text-red-400 border-red-500/30 bg-red-500/10 hover:text-red-300 hover:bg-red-500/20 transition-all rounded-xl h-8 text-xs flex items-center justify-center gap-2"
          onClick={() => signOut({ callbackUrl: '/login' })}
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Logout</span>
        </Button>
      </div>

    </aside>
  );
}
