import { useState, useEffect } from "react";
import { useAuth } from "@/lib/AuthContext";
import { createNotification } from "@/db/notification";
import React, { useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import LocationPicker from "@/components/LocationPicker";

import { getDB } from "@/db/couch";
import { nanoid } from "nanoid";



export default function TaskFormDialog({
  open,
  onOpenChange,
  task,
  teams,
  members,
  organizations,
  onSaved,
}) {
  const { user, hasFullAccess } = useAuth();
  const [form, setForm] = useState({
    title: "",
    description: "",
    status: "today",
    priority: "medium",
    due_date: "",
    assigned_to: [],
    team_id: "",
    org_id: "",
    location_name: "",
    latitude: null,
    longitude: null,
    estimated_hours: "",
  });

  const [saving, setSaving] = useState(false);

  const navigate = useNavigate();

  const isEdit = !!task?._id;



  useEffect(() => {
    if (!open) return;

    if (task) {
      setForm({
        title: task.title || "",
        description: task.description || "",
        status: task.status || "today",
        priority: task.priority || "medium",
        due_date: task.due_date
          ? new Date(task.due_date).toISOString().slice(0, 16)
          : "",
        assigned_to: task.assigned_to || [],
        team_id: task.team_id || "",
        org_id: task.org_id || "",
        location_name: task.location_name || "",
        latitude: task.latitude ?? null,
        longitude: task.longitude ?? null,
        estimated_hours: task.estimated_hours ?? "",
      });
    } else {
      setForm({
        title: "",
        description: "",
        status: "today",
        priority: "medium",
        due_date: "",
        assigned_to: [],
        team_id: "",
        org_id: "",
        location_name: "",
        latitude: null,
        longitude: null,
        estimated_hours: "",
      });
    }
  }, [open, task]);

  useEffect(() => {
    if (!open || !task) return;
    if (!form.org_id) return;
    if (!teams?.length) return;

    const exists = teams.some(
      (t) => t._id === task.team_id && t.org_id === form.org_id
    );

    if (exists) {
      setForm((prev) => {
        if (prev.team_id === task.team_id) return prev;

        return {
          ...prev,
          team_id: task.team_id,
        };
      });
    }
  }, [teams, form.org_id, task, open]);

  // -----------------------------
  // SUBMIT (CREATE / UPDATE)
  // -----------------------------
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    const db = getDB(user?.id);
    if (!db) return;

    const data = {
      ...form,
      due_date: form.due_date ? new Date(form.due_date).toISOString() : null,
      latitude: form.latitude,
      longitude: form.longitude,
    };

    try {
      let finalTaskDoc;

      // =========================
      // UPDATE TASK
      // =========================
      if (task?._id) {
        // Fetch the fresh doc to get the current _rev (essential for PouchDB)
        const existingTask = await db.get(task._id);

        const wasCompleted = existingTask.status !== "completed" && data.status === "completed";
        const assigneesChanged = JSON.stringify(existingTask.assigned_to || []) !== JSON.stringify(data.assigned_to || []);

        finalTaskDoc = {
          ...existingTask, // preserves _id and _rev
          ...data,
          type: "task",
          updated_at: new Date().toISOString(),
        };

        await db.put(finalTaskDoc);

        await createNotification({
          type: wasCompleted ? "task_completed" : assigneesChanged ? "task_assigned" : "task_updated",
          title: wasCompleted ? "Task completed" : assigneesChanged ? "Task reassigned" : "Task updated",
          message: `"${data.title}" was updated.`,
          task_id: task._id,
          team_id: data.team_id,
          org_id: data.org_id,
          created_by: user?._id,
        }, user.id);
      }

      // =========================
      // CREATE TASK
      // =========================
      else {
        finalTaskDoc = {
          _id: `task_${nanoid()}`,
          type: "task",
          ...data,
          created_at: new Date().toISOString(),
        };

        await db.put(finalTaskDoc);

        await createNotification({
          type: "task_created",
          title: "Task created",
          message: `New task "${data.title}" was created.`,
          task_id: finalTaskDoc._id,
          team_id: data.team_id,
          org_id: data.org_id,
          created_by: user?._id,
        }, user.id);
      }

      onSaved?.(); // Usually triggers loadData()
      onOpenChange(false);
    } catch (err) {
      console.error("❌ Save task error:", err);
    } finally {
      setSaving(false);
    }
  };




  const filteredTeams = useMemo(() => {
    if (!form.org_id) return [];
    return (teams || []).filter((t) => t.org_id === form.org_id);
  }, [teams, form.org_id]);


  const safeTeamId =
    filteredTeams.some((t) => t._id === form.team_id)
      ? form.team_id
      : "";


  // -----------------------------
  // UI
  // -----------------------------
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{task?._id ? "Edit Task" : "New Task"}</DialogTitle>
          <DialogDescription>
            Fill in the details to create or update a task.
          </DialogDescription>
        </DialogHeader>


        <form onSubmit={handleSubmit} className="space-y-4">
          {/* TITLE */}
          <div>
            <Label>Title *</Label>
            <Input
              value={form.title}
              onChange={(e) =>
                setForm({ ...form, title: e.target.value })
              }
              required
            />
          </div>

          {/* DESCRIPTION */}
          <div>
            <Label>Description</Label>
            <Textarea
              value={form.description}
              onChange={(e) =>
                setForm({ ...form, description: e.target.value })
              }
              rows={3}
            />
          </div>

          {/* STATUS / PRIORITY */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Status *</Label>
              <Select
                value={form.status}
                onValueChange={(v) =>
                  setForm({ ...form, status: v })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {!isEdit ? (
                    <>
                      <SelectItem value="today">Today</SelectItem>
                      <SelectItem value="upcoming">Upcoming</SelectItem>
                    </>
                  ) : (
                    <>
                      <SelectItem value="upcoming">Upcoming</SelectItem>
                      <SelectItem value="today">Today</SelectItem>
                      <SelectItem value="previous">Previous</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                    </>
                  )}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Priority *</Label>
              <Select
                value={form.priority}
                onValueChange={(v) =>
                  setForm({ ...form, priority: v })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* DUE DATE */}
          <div>
            <Label>Due Date *</Label>
            <Input
              type="datetime-local"
              value={form.due_date}
              onChange={(e) =>
                setForm({ ...form, due_date: e.target.value })
              }
              className="
                  w-full
                  bg-white dark:bg-[hsl(var(--background))]
                  text-[hsl(var(--foreground))]
                  border border-[hsl(var(--border))]
                  rounded-lg
                  px-3 py-2
                  text-sm
                  focus:outline-none
                  focus:ring-2 focus:ring-primary
                  dark:[color-scheme:dark]
                "
            />
          </div>

          {/* ORGANIZATION / TEAM */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Organization *</Label>
              <Select
                value={form.org_id}
                onValueChange={(v) => {
                  setForm({
                    ...form,
                    org_id: v,
                    team_id: "" // 🔥 reset team when org changes
                  });
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a organization" />
                </SelectTrigger>
                <SelectContent>
                  {(organizations || []).map((org) => (
                    <SelectItem key={org._id} value={org._id}>
                      {org.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Team *</Label>

              <Select
                value={safeTeamId}
                onValueChange={(val) => {
                  if (val === "__create_team__") {
                    // handle create team action here
                    return;
                  }

                  setForm((prev) => ({
                    ...prev,
                    team_id: val,
                  }));
                }}
                disabled={!form.org_id} // 👈 disable when no org selected (your requirement)
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a team" />
                </SelectTrigger>

                <SelectContent>
                  {/* IF NO TEAMS */}
                  {(!teams || teams.length === 0) ? (
                    <SelectItem
                      value="__create_team__"
                      onPointerDown={(e) => {
                        e.preventDefault(); // Stop the Select from trying to "select" this
                        navigate('/teams?create=true');
                      }}
                    >
                      + Create new team
                    </SelectItem>
                  ) : (
                    <>
                      {filteredTeams.map((team) => (
                        <SelectItem key={team._id} value={team._id}>
                          {team.name}
                        </SelectItem>
                      ))}

                      {/* Optional CTA at bottom */}
                      <SelectItem
                        value="__create_team__"
                        onPointerDown={(e) => {
                          e.preventDefault(); // Stop the Select from trying to "select" this
                          navigate('/teams?create=true');
                        }}
                      >
                        + Create new team
                      </SelectItem>
                    </>
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Estimated Hours */}
          <div>
            <Label>Estimated Hours</Label>
            <Input
              type="number"
              step="0.5"
              min="0"
              value={form.estimated_hours}
              onChange={(e) => setForm({ ...form, estimated_hours: e.target.value })}
              placeholder="e.g. 2.5"
            />
          </div>

          <div>
            <Label>Location</Label>
            <div className="mt-1">
              <LocationPicker
                value={{ location_name: form.location_name, latitude: form.latitude, longitude: form.longitude }}
                onChange={({ location_name, latitude, longitude }) =>
                  setForm((prev) => ({ ...prev, location_name, latitude, longitude }))
                }
              />
            </div>
          </div>

          {/* ACTIONS */}

          {hasFullAccess && (
            <div className="flex gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="flex-1"
              >
                Cancel
              </Button>

              <Button
                type="submit"
                disabled={
                  saving ||
                  !form.title ||
                  !form.status ||
                  !form.priority ||
                  !form.org_id ||
                  !form.team_id
                }
                className="flex-1"
              >
                {saving && (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                )}
                {task?._id ? "Update" : "Create"}
              </Button>
            </div>

          )}
        </form>
      </DialogContent>
    </Dialog>
  );
}