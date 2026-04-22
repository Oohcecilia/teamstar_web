import { useState, useEffect } from "react";
import { UserCircle, Phone, Users, Shield, UserPlus, Loader2, Settings2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import EmptyState from "../components/EmptyState";
import { fetchedUserData } from "@/db/api";
import { useAuth } from "@/lib/AuthContext";
import { createNotification } from "@/db/notification";
import { getSavedTheme, applyTheme } from "@/utils/theme";


import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";


import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import MemberAccessDialog from "@/components/MemberAccessDialog";

const ROLE_STYLE = {
  member: "bg-primary/10 text-primary",
  manager: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  admin: "bg-muted text-muted-foreground",
};

export default function Members() {
  const { isAuthenticated, user, hasFullAccess } = useAuth();

  const [members, setMembers] = useState([]);
  const [teams, setTeams] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  const [accessMember, setAccessMember] = useState(null);

  const [selectedUserId, setSelectedUserId] = useState("");
  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("member");
  const [inviting, setInviting] = useState(false);
  const [inviteSuccess, setInviteSuccess] = useState(false);
  const [organizations, setOrganizations] = useState([]);


  const [selectedOrg, setSelectedOrg] = useState("");
  const [phoneQuery, setPhoneQuery] = useState("");
  const [showPhoneDropdown, setShowPhoneDropdown] = useState(false);

  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem("theme");
    return saved ? saved === "dark" : false;
  });



  // =========================
  // LOAD DATA (PouchDB)
  // =========================
  const load = async () => {
    setLoading(true);

    try {
      const res = await fetchedUserData(user);

      setMembers(res.members ?? []);

      setTeams(res.teams ?? []);

      setOrganizations(res.organizations ?? []);

      setUsers(res.userList ?? []);

    } catch (err) {
      console.error("Load members error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const theme = getSavedTheme();
    setDarkMode(applyTheme(theme));

    load();
  }, [user]);


  const filteredUsers = users.filter((u) =>
    (u.phone || "")
      .toLowerCase()
      .includes(phoneQuery.toLowerCase())
  );

  const currentUser = members.find(m => m._id === user?.id);
  const otherMembers = members.filter(m => m._id !== user?.id);


  // =========================
  // INVITE (PouchDB fallback safe)
  // =========================
  const handleInvite = async (e) => {
    e.preventDefault();
    setInviting(true);

    const selectedOrgName = organizations.find(org => org._id === selectedOrg)?.name || "";

    try {
      const payload = {
        type: "invitation",
        title: "Invitation Received",
        message: `${user?.id || "Someone"} invited you to join ${selectedOrgName}.`,
        org_id: selectedOrg,
        user_id: selectedUserId,
        role: '',
        created_by: user?.id,
      };

      await createNotification(payload, user?.id);

      setInviteSuccess(true);

      // reset form
      setPhoneQuery("");
      setSelectedUserId("");
      setSelectedOrg("");
      setInviteRole("member");
      setShowPhoneDropdown(false);

      setTimeout(() => {
        setInviteSuccess(false);
        setShowInvite(false);
      }, 1500);

    } catch (err) {
      console.error("Invite error:", err);
    } finally {
      setInviting(false);
    }
  };

  // =========================
  // LOADING UI
  // =========================
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  // =========================
  // TEAM LOOKUP MAP
  // =========================
  const teamMap = Object.fromEntries(
    (teams || []).map((t) => [t._id, t])
  );

  return (
    <div className="max-w-7xl mx-auto space-y-6">

      {/* HEADER */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
            Members
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {members.length} members
          </p>
        </div>
        {hasFullAccess && (
          <Button onClick={() => setShowInvite(true)}>
            <UserPlus className="h-4 w-4 mr-2" />
            Invite
          </Button>
        )}
      </div>

      {/* LIST */}
      {members.length === 0 ? (
        <EmptyState
          icon={UserCircle}
          title="No members yet"
          description="Invite members to your workspace"
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {[currentUser, ...otherMembers].filter(Boolean).map((member) => {
            const memberTeams = (member.team_ids || [])
              .map((id) => teamMap[id])
              .filter(Boolean);
            const memberName = `${member.first_name}  ${member.last_name}`;

            return (
              <div
                key={member._id}
                className="bg-card border rounded-2xl p-5"
              >
                {/* USER INFO */}
                <div className="flex items-center gap-3">
                  <div className="h-11 w-11 rounded-xl bg-primary/10 flex items-center justify-center">
                    <span className="text-sm font-bold text-primary">
                      {(member.first_name || member.phone || "?")
                        .charAt(0)
                        .toUpperCase()}
                    </span>
                  </div>

                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold text-sm truncate">
                      {memberName || "Unnamed"}
                      {member._id === user?.id && (
                        <span className="ml-1 text-primary text-[10px]">(You)</span>
                      )}
                    </h3>

                    <p className="text-xs text-muted-foreground truncate flex items-center gap-1">
                      <Phone className="h-3.5 w-3.5" />
                      {member.phone}
                    </p>
                  </div>
                </div>

                {/* TEAMS */}
                {memberTeams.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {memberTeams.map((t) => (
                      <Badge
                        key={t._id}
                        variant="secondary"
                        className="text-[10px]"
                      >
                        {t.name}
                      </Badge>
                    ))}
                  </div>
                )}

                <Button
                  variant="outline"
                  size="sm"
                  className="w-full mt-4 rounded-lg text-xs h-8"
                  onClick={() => setAccessMember(member)}
                >
                  <Settings2 className="h-3.5 w-3.5 mr-1.5" />
                  Manage Access
                </Button>
              </div>
            );
          })}
        </div>
      )}

      {/* Access Dialog */}
      {accessMember && (
        <MemberAccessDialog
          open={true}
          onOpenChange={(v) => {
            if (!v) {
              setAccessMember(null);
              load();
            }
          }}
          member={accessMember}
          teams={teams}
          organizations={organizations}
        />
      )}

      {/* =========================
          INVITE DIALOG (FIXED)
      ========================= */}
      <Dialog open={showInvite} onOpenChange={setShowInvite}>
        <DialogContent className="max-w-sm">

          <DialogHeader>
            <DialogTitle>Invite Member</DialogTitle>
            <DialogDescription>
              Send an invitation to add a new member.
            </DialogDescription>
          </DialogHeader>

          {inviteSuccess ? (
            <div className="py-6 text-center">
              <div className="h-12 w-12 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-3">
                <UserPlus className="h-5 w-5 text-emerald-600" />
              </div>
              <p className="text-sm font-medium">
                Invitation sent!
              </p>
            </div>
          ) : (
            <form onSubmit={handleInvite} className="space-y-4 mt-2">

              <div className="relative">
                <Label>Phone Number *</Label>

                <Input
                  type="number"
                  value={phoneQuery}
                  onChange={(e) => {
                    setPhoneQuery(e.target.value);
                    setShowPhoneDropdown(true);
                    setSelectedUserId(""); // reset selection when typing
                  }}
                  onFocus={() => setShowPhoneDropdown(true)}
                  placeholder="Search phone number..."
                  required
                  className="
                      bg-white text-gray-900 border-gray-300
                      dark:bg-gray-900 dark:text-gray-100 dark:border-gray-700
                      placeholder:text-gray-400 dark:placeholder:text-gray-500
                      focus-visible:ring-2 focus-visible:ring-blue-500
                    "
                />

                {showPhoneDropdown && phoneQuery && (
                  <div className="
                    absolute z-50 mt-1 w-full
                    bg-white border rounded-md shadow max-h-40 overflow-y-auto
                    dark:bg-gray-900 dark:border-gray-700
                  ">
                    {filteredUsers.length > 0 ? (
                      filteredUsers.map((u) => (
                        <div
                          key={u.user_id}
                          className="
                            px-3 py-2 text-sm cursor-pointer
                            text-gray-900 hover:bg-gray-100
                            dark:text-gray-100 dark:hover:bg-gray-800
                          "
                          onClick={() => {
                            setPhoneQuery(u.phone);       // show phone
                            setSelectedUserId(u.user_id); // store ID
                            setShowPhoneDropdown(false);
                          }}
                        >
                          {u.phone} - {u.first_name}
                        </div>
                      ))
                    ) : (
                      <div className="
                        px-3 py-2 text-sm
                        text-gray-400
                        dark:text-gray-500
                      ">
                        No phone number found
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div>
                <Label>Organization *</Label>

                <Select value={selectedOrg} onValueChange={setSelectedOrg}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select organization" />
                  </SelectTrigger>

                  <SelectContent>
                    {organizations.map((org) => (
                      <SelectItem key={org._id} value={org._id}>
                        {org.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={() => setShowInvite(false)}
                >
                  Cancel
                </Button>

                <Button
                  type="submit"
                  className="flex-1"
                  disabled={inviting || !selectedUserId || !selectedOrg || !inviteRole}
                >
                  {inviting ? "Sending..." : "Send Invite"}
                </Button>
              </div>

            </form>
          )}
        </DialogContent>
      </Dialog>

    </div>
  );
}