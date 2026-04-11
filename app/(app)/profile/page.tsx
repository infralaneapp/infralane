"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Pencil, Shield, ShieldCheck, UserCircle } from "lucide-react";
import { toast } from "sonner";

import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";

interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: string;
  createdAt: string;
  slackUserId: string | null;
  _count?: {
    requestedTickets: number;
    assignedTickets: number;
  };
}

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // Name editing
  const [editingName, setEditingName] = useState(false);
  const [nameValue, setNameValue] = useState("");
  const [savingName, setSavingName] = useState(false);

  // Password form
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);

  const fetchProfile = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/profile");
      if (!res.ok) throw new Error();
      const json = await res.json();
      const u = json.data?.user ?? json.data;
      setUser(u);
      setNameValue(u.name);
    } catch {
      toast.error("Could not load profile.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchProfile(); }, [fetchProfile]);

  async function handleSaveName() {
    if (!nameValue.trim() || nameValue === user?.name) {
      setEditingName(false);
      return;
    }
    setSavingName(true);
    try {
      const res = await fetch("/api/auth/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: nameValue.trim() }),
      });
      if (!res.ok) throw new Error();
      toast.success("Name updated.");
      setEditingName(false);
      fetchProfile();
      router.refresh();
    } catch {
      toast.error("Could not update name.");
    } finally {
      setSavingName(false);
    }
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    if (!newPassword.trim()) { toast.error("New password is required."); return; }
    if (newPassword.length < 8) { toast.error("New password must be at least 8 characters."); return; }
    if (newPassword !== confirmPassword) { toast.error("Passwords do not match."); return; }

    setSavingPassword(true);
    try {
      const res = await fetch("/api/auth/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => null);
        throw new Error(err?.error?.message ?? "Failed to change password.");
      }
      toast.success("Password changed.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      toast.error(err.message ?? "Something went wrong.");
    } finally {
      setSavingPassword(false);
    }
  }

  if (loading) {
    return <Card className="p-8 shadow-card"><p className="text-sm text-muted-foreground">Loading...</p></Card>;
  }

  if (!user) return null;

  const roleBadgeVariant = user.role === "ADMIN" ? "default" as const : user.role === "OPERATOR" ? "outline" as const : "secondary" as const;
  const RoleIcon = user.role === "ADMIN" ? ShieldCheck : Shield;
  const memberSince = new Date(user.createdAt).toLocaleDateString("en", { year: "numeric", month: "long", day: "numeric" });

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {/* Profile header */}
      <Card className="p-6 shadow-card">
        <div className="flex items-start gap-5">
          <div className="flex size-16 items-center justify-center rounded-full bg-primary/10 text-2xl font-bold text-primary">
            {user.name.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              {editingName ? (
                <div className="flex items-center gap-2">
                  <Input
                    className="h-8 w-56"
                    value={nameValue}
                    onChange={(e) => setNameValue(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSaveName()}
                    autoFocus
                  />
                  <Button size="icon-sm" onClick={handleSaveName} disabled={savingName}>
                    <Check className="size-3.5" />
                  </Button>
                  <Button size="icon-sm" variant="ghost" onClick={() => { setEditingName(false); setNameValue(user.name); }}>
                    &times;
                  </Button>
                </div>
              ) : (
                <>
                  <h1 className="text-xl font-semibold text-foreground">{user.name}</h1>
                  <Button size="icon-sm" variant="ghost" onClick={() => setEditingName(true)}>
                    <Pencil className="size-3.5" />
                  </Button>
                </>
              )}
            </div>
            <p className="mt-0.5 text-sm text-muted-foreground">{user.email}</p>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <Badge variant={roleBadgeVariant} className="gap-1">
                <RoleIcon className="size-3" />
                {user.role}
              </Badge>
              {user.slackUserId && (
                <Badge variant="outline" className="gap-1 text-green-600 border-green-200 dark:border-green-800">
                  <svg width="12" height="12" viewBox="0 0 54 54" className="shrink-0">
                    <path d="M19.712.133a5.381 5.381 0 0 0-5.376 5.387 5.381 5.381 0 0 0 5.376 5.386h5.376V5.52A5.381 5.381 0 0 0 19.712.133m0 14.365H5.376A5.381 5.381 0 0 0 0 19.884a5.381 5.381 0 0 0 5.376 5.387h14.336a5.381 5.381 0 0 0 5.376-5.387 5.381 5.381 0 0 0-5.376-5.386" fill="#36C5F0"/>
                    <path d="M53.76 19.884a5.381 5.381 0 0 0-5.376-5.386 5.381 5.381 0 0 0-5.376 5.386v5.387h5.376a5.381 5.381 0 0 0 5.376-5.387m-14.336 0V5.52A5.381 5.381 0 0 0 34.048.133a5.381 5.381 0 0 0-5.376 5.387v14.364a5.381 5.381 0 0 0 5.376 5.387 5.381 5.381 0 0 0 5.376-5.387" fill="#2EB67D"/>
                    <path d="M34.048 54a5.381 5.381 0 0 0 5.376-5.387 5.381 5.381 0 0 0-5.376-5.386h-5.376v5.386A5.381 5.381 0 0 0 34.048 54m0-14.365h14.336a5.381 5.381 0 0 0 5.376-5.386 5.381 5.381 0 0 0-5.376-5.387H34.048a5.381 5.381 0 0 0-5.376 5.387 5.381 5.381 0 0 0 5.376 5.386" fill="#ECB22E"/>
                    <path d="M0 34.249a5.381 5.381 0 0 0 5.376 5.386 5.381 5.381 0 0 0 5.376-5.386v-5.387H5.376A5.381 5.381 0 0 0 0 34.25m14.336-.001v14.364A5.381 5.381 0 0 0 19.712 54a5.381 5.381 0 0 0 5.376-5.387V34.249a5.381 5.381 0 0 0-5.376-5.387 5.381 5.381 0 0 0-5.376 5.387" fill="#E01E5A"/>
                  </svg>
                  Slack linked
                </Badge>
              )}
              <span className="text-xs text-muted-foreground">
                Member since {memberSince}
              </span>
            </div>
          </div>
        </div>

        {/* Quick stats */}
        {user._count && (
          <>
            <Separator className="my-5" />
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-lg border border-border bg-muted/50 px-4 py-3 text-center">
                <p className="text-2xl font-semibold text-foreground">{user._count.requestedTickets}</p>
                <p className="text-xs text-muted-foreground">Tickets submitted</p>
              </div>
              <div className="rounded-lg border border-border bg-muted/50 px-4 py-3 text-center">
                <p className="text-2xl font-semibold text-foreground">{user._count.assignedTickets}</p>
                <p className="text-xs text-muted-foreground">Tickets assigned</p>
              </div>
            </div>
          </>
        )}
      </Card>

      {/* Change password */}
      <Card className="p-6 shadow-card">
        <h2 className="text-sm font-semibold text-foreground">Change Password</h2>
        <p className="mt-1 text-xs text-muted-foreground">Update your password. You&apos;ll stay logged in after changing it.</p>
        <Separator className="my-4" />
        <form onSubmit={handleChangePassword} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="current-password">Current password</Label>
            <Input
              id="current-password"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="Enter current password"
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="new-password">New password</Label>
              <Input
                id="new-password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="At least 8 characters"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="confirm-password">Confirm</Label>
              <Input
                id="confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repeat new password"
              />
            </div>
          </div>
          <Button type="submit" disabled={savingPassword}>
            {savingPassword ? "Saving..." : "Change password"}
          </Button>
        </form>
      </Card>
    </div>
  );
}
