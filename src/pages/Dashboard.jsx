import { useEffect, useState, useCallback, useRef } from "react";
import { fetchedUserData } from "@/db/api";
import { Link } from "react-router-dom";
import {
  CheckSquare,
  Clock,
  AlertTriangle,
  Users,
  Plus,
  ArrowRight,
  TrendingUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import StatCard from "../components/StatCard";
import TaskCard from "../components/TaskCard";
import TaskFormDialog from "../components/TaskFormDialog";
import TaskDetailDialog from "../components/TaskDetailDialog";
import EmptyState from "../components/EmptyState";
import { isToday, isPast, isFuture } from "date-fns";
import { useAuth } from "@/lib/AuthContext";
import { getDB } from "@/db/couch";
import { getSavedTheme, applyTheme } from "@/utils/theme";

export default function Dashboard() {
  const { isAuthenticated, user, hasFullAccess } = useAuth();

  const [detailTask, setDetailTask] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editTask, setEditTask] = useState(null);

  const [tasks, setTasks] = useState([]);
  const [teams, setTeams] = useState([]);
  const [members, setMembers] = useState([]);
  const [organizations, setOrganizations] = useState([]);
  const [loading, setLoading] = useState(true);

  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem("theme");
    return saved ? saved === "dark" : false;
  });

  const debounceRef = useRef(null);

  // -----------------------------
  // LOAD DATA (STABLE)
  // -----------------------------
  const loadData = useCallback(async () => {
    if (!user?.id) return;

    try {
      setLoading(true);

      const data = await fetchedUserData(user);

      setTasks(data.tasks ?? []);
      setTeams(data.teams ?? []);
      setMembers(data.members ?? []);
      setOrganizations(data.organizations ?? []);
    } catch (err) {
      console.error("Dashboard load error:", err);
    } finally {
      setLoading(false);
    }
  }, [user?.id]); // ✅ tighter dependency

  // -----------------------------
  // INITIAL LOAD + SYNC + LISTENERS
  // -----------------------------
  useEffect(() => {
    if (!user?.id) return;

    let isMounted = true;

    const init = async () => {
      await loadData();
    };

    init();

    const localDB = getDB(user.id);

    const changes = localDB?.changes({
      since: "now",
      live: true,
      include_docs: false,
    }).on("change", () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);

      debounceRef.current = setTimeout(() => {
        if (!isMounted) return;
        loadData();
      }, 300);
    });

    return () => {
      isMounted = false;
      changes?.cancel();

      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [user?.id]); // ✅ IMPORTANT: depend only on id

  // -----------------------------
  // THEME (RUN ONCE)
  // -----------------------------
  useEffect(() => {
    const theme = getSavedTheme();
    setDarkMode(applyTheme(theme));
  }, []); // ✅ THIS is the fix
  // -----------------------------
  // FILTERS (unchanged logic)
  // -----------------------------
  const todayTasks = tasks.filter(
    (t) =>
      t.status === "today" ||
      (t.due_date && isToday(new Date(t.due_date)))
  );

  const upcomingTasks = tasks.filter(
    (t) =>
      t.status === "upcoming" &&
      (!t.due_date || isFuture(new Date(t.due_date)))
  );

  const overdueTasks = tasks.filter(
    (t) =>
      t.status === "previous" ||
      (t.due_date &&
        isPast(new Date(t.due_date)) &&
        t.status !== "completed" &&
        !isToday(new Date(t.due_date)))
  );

  // const completedTasks = tasks.filter((t) => t.status === "completed");



  // -----------------------------
  // LOADING STATE
  // -----------------------------
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  // -----------------------------
  // UI
  // -----------------------------
  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
            Dashboard
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Overview of your workspace
          </p>
        </div>
        {hasFullAccess && (
          <Button
            onClick={() => {
              setEditTask(null);
              setShowForm(true);
            }}
            className="rounded-xl shadow-lg shadow-primary/25"
          >
            <Plus className="h-4 w-4 mr-2" />
            New Task
          </Button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Tasks" value={tasks.length} icon={CheckSquare} />
        <StatCard title="Today" value={todayTasks.length} icon={Clock} />
        <StatCard title="Overdue" value={overdueTasks.length} icon={AlertTriangle} />
        {hasFullAccess && (
          <StatCard title="Teams" value={teams.length} icon={Users} />
        )}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">

        {hasFullAccess && (
          <Button
            variant="outline"
            className="rounded-xl h-auto py-3 justify-start"
            onClick={() => {
              setEditTask(null);
              setShowForm(true);
            }}
          >
            <Plus className="h-4 w-4 mr-2 text-primary" />
            <span className="text-xs font-medium">Add Task</span>
          </Button>
        )}

        {hasFullAccess && (
          <Link to="/teams">
            <Button variant="outline" className="rounded-xl h-auto py-3 justify-start w-full">
              <Users className="h-4 w-4 mr-2 text-primary" />
              <span className="text-xs font-medium">View Teams</span>
            </Button>
          </Link>
        )}
        {hasFullAccess && (
          <Link to="/members">
            <Button variant="outline" className="rounded-xl h-auto py-3 justify-start w-full">
              <TrendingUp className="h-4 w-4 mr-2 text-primary" />
              <span className="text-xs font-medium">Members</span>
            </Button>
          </Link>
        )}



        <Link to="/calendar">
          <Button variant="outline" className="rounded-xl h-auto py-3 justify-start w-full">
            <Clock className="h-4 w-4 mr-2 text-primary" />
            <span className="text-xs font-medium">Calendar</span>
          </Button>
        </Link>
      </div>

      {/* Recent Tasks */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Recent Tasks</h2>
          <Link
            to="/tasks"
            className="text-xs font-medium text-primary hover:underline flex items-center gap-1"
          >
            View All <ArrowRight className="h-3 w-3" />
          </Link>
        </div>

        {tasks.length === 0 ? (
          <EmptyState
            icon={CheckSquare}
            title="No tasks yet"
            description="Create your first task to get started"
            action={hasFullAccess && (
              <Button
                size="sm"
                onClick={() => {
                  setEditTask(null);
                  setShowForm(true);
                }}
              >
                Create Task
              </Button>
            )
            }
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {tasks.slice(0, 6).map((task) => (

              <TaskCard
                key={task._id}
                task={task}
                members={members}
                onClick={(t) => setDetailTask(t)}
              />
            ))}
          </div>
        )}
      </div>

      <TaskDetailDialog
        open={!!detailTask}
        onOpenChange={(v) => { if (!v) setDetailTask(null); }}
        task={detailTask}
        members={members}
        onEdit={(t) => { setDetailTask(null); setEditTask(t); setShowForm(true); }}
      />

      <TaskFormDialog
        open={showForm}
        onOpenChange={setShowForm}
        task={editTask}
        teams={teams}
        members={members}
        organizations={organizations}
        onSaved={loadData}
      />
    </div>
  );
}