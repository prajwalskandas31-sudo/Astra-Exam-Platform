// Central role definitions. Every API route and the proxy should use these
// instead of hand-written role lists, so a role is never silently locked out.

export const ROLES = ["SUPER_ADMIN", "INSTITUTE_ADMIN", "FACULTY", "MENTOR", "STUDENT", "PARENT"] as const;
export type AppRole = (typeof ROLES)[number];

export const ADMIN_ROLES: readonly AppRole[] = ["SUPER_ADMIN", "INSTITUTE_ADMIN"];
export const STAFF_ROLES: readonly AppRole[] = ["SUPER_ADMIN", "INSTITUTE_ADMIN", "FACULTY", "MENTOR"];

export const isAdmin = (role?: string | null) => !!role && (ADMIN_ROLES as readonly string[]).includes(role);
export const isStaff = (role?: string | null) => !!role && (STAFF_ROLES as readonly string[]).includes(role);

export function homePathForRole(role?: string | null): string {
  if (isAdmin(role)) return "/admin";
  if (role === "FACULTY" || role === "MENTOR") return "/mentor";
  if (role === "PARENT") return "/dashboard/parent";
  return "/student";
}

export const ROLE_LABELS: Record<AppRole, string> = {
  SUPER_ADMIN: "Super Admin",
  INSTITUTE_ADMIN: "Institute Admin",
  FACULTY: "Faculty",
  MENTOR: "Mentor",
  STUDENT: "Student",
  PARENT: "Parent",
};
