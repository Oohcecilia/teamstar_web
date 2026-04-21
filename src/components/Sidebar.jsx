import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  CheckSquare,
  Building2,
  Users,
  UserCircle,
  Calendar,
  MapPin,
  Settings,
  LogOut,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/AuthContext";
import NotificationBell from "@/components/NotificationBell";

// =========================
// NAV ITEMS WITH ROLES
// =========================
const navItems = [
  { path: "/", label: "Dashboard", icon: LayoutDashboard },

  { path: "/tasks", label: "Tasks", icon: CheckSquare },

  {
    path: "/organizations",
    label: "Organizations",
    icon: Building2,
    roles: ["owner", "admin"],
  },

  {
    path: "/teams",
    label: "Teams",
    icon: Users,
    roles: ["owner", "admin"],
  },

  {
    path: "/members",
    label: "Members",
    icon: UserCircle,
    roles: ["owner", "admin", "supervisor"],
  },

  { path: "/calendar", label: "Calendar", icon: Calendar },

  { path: "/map", label: "Location", icon: MapPin },

  {
    path: "/settings",
    label: "Settings",
    icon: Settings,
  },
];

export default function Sidebar({ onClose }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout, hasFullAccess } = useAuth();

  // =========================
  // ROLE CHECK (SCALABLE)
  // =========================
  const hasRole = (roles = []) => {
    return user?.access_rights?.some((a) =>
      roles.includes(a.role)
    );
  };

  // =========================
  // FILTER NAV
  // =========================
  const filteredNav = navItems.filter((item) => {
    if (!item.roles) return true; // public
    return hasRole(item.roles);
  });

  const handleLogout = () => {
    logout();
    navigate("/auth");
  };

  return (
    <div className="w-72 h-full bg-card border-r border-border flex flex-col">
      {/* Logo */}
      <div className="p-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-primary flex items-center justify-center">
            <CheckSquare className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="text-lg font-bold tracking-tight">
            Teamstar
          </span>
        </div>

        <div className="flex items-center gap-1">
          <div
            className="hidden sm:block">
            <NotificationBell position="left" />

          </div>

          {onClose && (
            <button
              onClick={onClose}
              className="lg:hidden p-1 hover:bg-muted rounded-lg transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 space-y-1">
        {filteredNav.map((item) => {
          const isActive = location.pathname === item.path;

          return (
            <Link
              key={item.path}
              to={item.path}
              onClick={onClose}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200",
                isActive
                  ? "bg-primary text-primary-foreground shadow-md shadow-primary/25"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              )}
            >
              <item.icon className="h-[18px] w-[18px]" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Logout */}
      <div className="p-3 border-t border-border">
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all w-full"
        >
          <LogOut className="h-[18px] w-[18px]" />
          Sign Out
        </button>
      </div>
    </div>
  );
}