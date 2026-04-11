"use client";

import { useCallback, useEffect, useState } from "react";
import { Shield, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";

/* -------------------------------------------------------------------------- */
/*  Types                                                                     */
/* -------------------------------------------------------------------------- */

interface TeamMember {
  id: string;
  email: string;
  name: string | null;
  role: "REQUESTER" | "OPERATOR" | "ADMIN";
  slackUserId: string | null;
  createdAt: string;
  _count: {
    assignedTickets: number;
    requestedTickets: number;
  };
}

/* -------------------------------------------------------------------------- */
/*  Page                                                                      */
/* -------------------------------------------------------------------------- */

export default function TeamPage() {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchMembers = useCallback(async () => {
    try {
      const res = await fetch("/api/settings/team");
      if (!res.ok) throw new Error("Failed to fetch team.");
      const json = await res.json();
      setMembers(json.data.members);
    } catch {
      toast.error("Could not load team members.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  async function handleRoleChange(userId: string, role: "REQUESTER" | "OPERATOR" | "ADMIN") {
    try {
      const res = await fetch("/api/settings/team", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, role }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => null);
        throw new Error(err?.error ?? "Failed to update role.");
      }
      toast.success("Role updated.");
      fetchMembers();
    } catch (err: any) {
      toast.error(err.message ?? "Could not update role.");
    }
  }

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }

  if (loading) {
    return (
      <Card className="p-8 shadow-card">
        <p className="text-sm text-muted-foreground">Loading team members...</p>
      </Card>
    );
  }

  return (
    <>
      <p className="text-sm text-muted-foreground">
        {members.length} team member{members.length !== 1 ? "s" : ""}
      </p>

      <Card className="mt-4 shadow-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead className="text-center">Assigned</TableHead>
              <TableHead className="text-center">Requested</TableHead>
              <TableHead>Slack</TableHead>
              <TableHead>Joined</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {members.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="py-8 text-center text-muted-foreground">
                  No team members found.
                </TableCell>
              </TableRow>
            ) : (
              members.map((m) => (
                <TableRow key={m.id}>
                  <TableCell className="font-medium text-foreground">
                    {m.name ?? "Unnamed"}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{m.email}</TableCell>
                  <TableCell>
                    <Badge variant={m.role === "ADMIN" ? "default" : m.role === "OPERATOR" ? "outline" : "secondary"}>
                      {m.role === "ADMIN" ? (
                        <ShieldCheck className="mr-1 size-3" />
                      ) : (
                        <Shield className="mr-1 size-3" />
                      )}
                      {m.role}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center text-muted-foreground">
                    {m._count.assignedTickets}
                  </TableCell>
                  <TableCell className="text-center text-muted-foreground">
                    {m._count.requestedTickets}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-xs">
                    {m.slackUserId ? (
                      <span className="text-green-600" title={m.slackUserId}>Linked</span>
                    ) : (
                      <span className="text-muted-foreground/50">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatDate(m.createdAt)}
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        className="inline-flex h-7 items-center rounded-md border border-input bg-transparent px-2.5 text-xs font-medium transition-colors hover:bg-muted"
                      >
                        Change role
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => handleRoleChange(m.id, "REQUESTER")}
                          disabled={m.role === "REQUESTER"}
                        >
                          <Shield className="size-4" />
                          Requester
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleRoleChange(m.id, "OPERATOR")}
                          disabled={m.role === "OPERATOR"}
                        >
                          <Shield className="size-4" />
                          Operator
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleRoleChange(m.id, "ADMIN")}
                          disabled={m.role === "ADMIN"}
                        >
                          <ShieldCheck className="size-4" />
                          Admin
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>
    </>
  );
}
