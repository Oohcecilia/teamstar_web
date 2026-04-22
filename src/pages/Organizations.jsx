import { useState, useEffect } from "react";
import { Plus, Building2, Users, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle
} from "@/components/ui/dialog";
import EmptyState from "../components/EmptyState";
import { useAuth } from "@/lib/AuthContext";
import { fetchedUserData } from "@/db/api";
import { getDB } from "@/db/couch";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { getSavedTheme, applyTheme } from "@/utils/theme";

export default function Organizations() {
  const { user, setUser } = useAuth();

  const [organizations, setOrganizations] = useState([]);
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editOrg, setEditOrg] = useState(null);
  const [deleteOrg, setDeleteOrg] = useState(null);

  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem("theme");
    return saved ? saved === "dark" : false;
  });

  const [form, setForm] = useState({
    name: "",
    description: "",
  });

  // -------------------------
  // LOAD DATA
  // -------------------------
  const loadData = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const res = await fetchedUserData(user);

      setOrganizations(res?.organizations ?? []);
      setTeams(res?.teams ?? []);
      
    } catch (err) {
      console.error("Load organizations error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {

    const theme = getSavedTheme();
    setDarkMode(applyTheme(theme));

    loadData();
  }, [user]);

  // -------------------------
  // OPEN MODALS
  // -------------------------
  const openCreate = () => {
    setEditOrg(null);
    setForm({ name: "", description: "" });
    setShowForm(true);
  };

  const openEdit = (org) => {
    setEditOrg(org);
    setForm({
      name: org.name || "",
      description: org.description || "",
    });
    setShowForm(true);
  };

  // -------------------------
  // SAVE
  // -------------------------
const handleSave = async (e) => {
    e.preventDefault();

    const db = getDB(user?.id);
    if (!db) return;

    try {
      let orgIdToRefresh = null;

      // =========================
      // UPDATE EXISTING
      // =========================
      if (editOrg?._id) {
        // In PouchDB, we fetch the latest to get the current _rev
        const existing = await db.get(editOrg._id);

        await db.put({
          ...existing, // contains _id and _rev
          name: form.name,
          description: form.description || "",
          updated_at: new Date().toISOString(),
        });
        orgIdToRefresh = editOrg._id;
      }

      // =========================
      // CREATE NEW
      // =========================
      else {
        const newOrgId = `org_${generate(12)}`; // Assuming you use nanoid/generate
        const newOrg = {
          _id: newOrgId,
          type: "organization",
          name: form.name,
          description: form.description || "",
          created_at: new Date().toISOString(),
        };

        await db.put(newOrg);
        orgIdToRefresh = newOrgId;

        // --- UPDATE USER PERMISSIONS ---
        // We must update the User doc so the UI knows they have access to this new org
        const currentUserDoc = await db.get(user.id);

        const updatedUser = {
          ...currentUserDoc,
          access_rights: [
            ...(currentUserDoc.access_rights || []),
            {
              org_id: newOrgId,
              role: "owner",
            },
          ],
        };

        await db.put(updatedUser);

        // Update Global Auth State & Session
        setUser?.(updatedUser);
        sessionStorage.setItem("user", JSON.stringify(updatedUser));
      }

      setShowForm(false);
      // loadData() will be triggered automatically if you use the usePouchChanges hook!
      loadData(); 
    } catch (err) {
      console.error("❌ Save organization error:", err);
    }
  };

  // =========================
  // DELETE
  // =========================
  const handleDelete = async () => {
    if (!deleteOrg) return;

    try {
      const db = getDB(user?.id);
      
      // PouchDB delete needs the _id AND the current _rev
      // You can either pass the doc you already have or fetch it fresh
      const docToDelete = await db.get(deleteOrg._id);
      await db.remove(docToDelete);

      setDeleteOrg(null);
      loadData();
    } catch (err) {
      console.error("❌ Delete organization error:", err);
    }
  };

  // -------------------------
  // LOADING
  // -------------------------
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  // -------------------------
  // UI
  // -------------------------
  return (
    <div className="max-w-7xl mx-auto space-y-6">

      {/* HEADER */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Organizations</h1>
          <p className="text-sm text-muted-foreground">
            {organizations.length} organizations
          </p>
        </div>

        <Button onClick={openCreate}>
          <Plus className="h-4 w-4 mr-2" />
          Organization
        </Button>
      </div>

      {/* EMPTY */}
      {organizations.length === 0 ? (
        <EmptyState
          icon={Building2}
          title="No organizations yet"
          description="Create an organization to get started"
          action={<Button onClick={openCreate}>Create Organization</Button>}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {organizations.map((org) => {
            const orgTeams = teams.filter(
              (t) => t.org_id === org._id
            );

            return (
              <div
                key={org._id}
                onClick={() => openEdit(org)}
                className="bg-card border border-border rounded-2xl p-5 cursor-pointer transition-all hover:shadow-lg hover:shadow-primary/5 hover:border-primary/20 group relative"
              >
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setDeleteOrg(org);
                  }}
                  className="absolute top-4 right-4
                            p-1.5 rounded-lg
                            bg-destructive/10
                            text-destructive
                            opacity-70 hover:opacity-100
                            transition"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>


                <div className="flex items-center gap-3">
                  <Building2 className="h-5 w-5 text-primary" />
                  <div>
                    <h3 className="font-semibold text-sm">{org.name}</h3>
                    <p className="text-xs text-muted-foreground">
                      <Users className="h-3 w-3 inline mr-1" />
                      {orgTeams.length} team
                      {orgTeams.length !== 1 ? "s" : ""}
                    </p>
                  </div>
                </div>

                {org.description && (
                  <p className="text-xs text-muted-foreground mt-3">
                    {org.description}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* FORM */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editOrg ? "Edit Organization" : "New Organization"}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <Label>Name *</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required placeholder="Organization name..." />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Description..." rows={3} />
            </div>
            <div className="flex gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setShowForm(false)} className="flex-1">Cancel</Button>
              <Button type="submit" disabled={!form.name} className="flex-1">{editOrg ? "Update" : "Create"}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* DELETE */}
      <AlertDialog open={!!deleteOrg} onOpenChange={() => setDeleteOrg(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Organization</AlertDialogTitle>
            <AlertDialogDescription>Are you sure you want to delete "{deleteOrg?.name}"?</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  );
}