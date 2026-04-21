import { Menu, CheckSquare } from "lucide-react";
import NotificationBell from "./NotificationBell";

export default function MobileNav({ onMenuClick }) {
  return (
    <div className="lg:hidden flex items-center justify-between px-4 py-3 border-b border-border bg-card">
      <button
        onClick={onMenuClick}
        className="p-2 hover:bg-muted rounded-xl transition-colors"
      >
        <Menu className="h-5 w-5" />
      </button>
      <div className="flex items-center gap-2">
        <div className="h-7 w-7 rounded-lg bg-primary flex items-center justify-center">
          <CheckSquare className="h-4 w-4 text-primary-foreground" />
        </div>
        <span className="text-sm font-bold">Teamstar</span>
      </div>
      <NotificationBell position="right" />
    </div>
  );
}