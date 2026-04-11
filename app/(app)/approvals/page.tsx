"use client";

import { useCallback, useEffect, useState } from "react";
import { CheckCircle2, XCircle, Clock, RefreshCw, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

import { formatRelativeTime } from "@/lib/formatters";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from "@/components/ui/select";
import { EmptyState } from "@/components/empty-state";

type ApprovalRequest = {
  id: string;
  status: string;
  reason: string | null;
  createdAt: string;
  decidedAt: string | null;
  ticket: { id: string; sequence: number; title: string };
  requestedBy: { id: string; name: string; email: string };
  approver: { id: string; name: string } | null;
  job: { id: string; status: string; rule: { name: string } } | null;
};

const STATUS_FILTERS = [
  { value: "all", label: "All" },
  { value: "PENDING", label: "Pending" },
  { value: "APPROVED", label: "Approved" },
  { value: "REJECTED", label: "Rejected" },
  { value: "EXPIRED", label: "Expired" },
];

export default function ApprovalsPage() {
  const [approvals, setApprovals] = useState<ApprovalRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("PENDING");
  const [pendingCount, setPendingCount] = useState(0);

  const fetchApprovals = useCallback(async () => {
    setLoading(true);
    try {
      const params = filter !== "all" ? `?status=${filter}` : "";
      const res = await fetch(`/api/approvals${params}`);
      if (!res.ok) throw new Error();
      const json = await res.json();
      setApprovals(json.data.approvals);
      setPendingCount(json.data.pendingCount);
    } catch {
      toast.error("Could not load approvals.");
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => { fetchApprovals(); }, [fetchApprovals]);

  async function handleApprove(id: string) {
    try {
      const res = await fetch(`/api/approvals/${id}/approve`, { method: "POST" });
      if (!res.ok) throw new Error();
      toast.success("Approved.");
      fetchApprovals();
    } catch {
      toast.error("Could not approve request.");
    }
  }

  async function handleReject(id: string) {
    const reason = prompt("Rejection reason (optional):");
    try {
      const res = await fetch(`/api/approvals/${id}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: reason || undefined }),
      });
      if (!res.ok) throw new Error();
      toast.success("Rejected.");
      fetchApprovals();
    } catch {
      toast.error("Could not reject request.");
    }
  }

  return (
    <div className="space-y-4">
      <div className="text-sm text-muted-foreground mb-4">
        <span className="text-foreground font-medium">Approvals</span>
      </div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-foreground">Approval Queue</h1>
          <p className="text-sm text-muted-foreground">
            {pendingCount} pending approval{pendingCount !== 1 ? "s" : ""}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={filter} onValueChange={(v) => { if (v) setFilter(v); }}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUS_FILTERS.map((f) => (
                <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={fetchApprovals}>
            <RefreshCw className="size-3.5" />
          </Button>
        </div>
      </div>

      <Card className="shadow-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Ticket</TableHead>
              <TableHead>Rule</TableHead>
              <TableHead>Requester</TableHead>
              <TableHead className="text-center">Status</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">Loading...</TableCell>
              </TableRow>
            ) : approvals.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6}>
                  <EmptyState
                    icon={ShieldCheck}
                    title="No approvals matching this filter"
                    description="Try changing the status filter to see more results."
                  />
                </TableCell>
              </TableRow>
            ) : (
              approvals.map((a) => (
                <TableRow key={a.id}>
                  <TableCell>
                    <a href={`/tickets/${a.ticket.id}`} className="text-sm text-primary hover:underline font-medium">
                      INF-{a.ticket.sequence}
                    </a>
                    <p className="text-xs text-muted-foreground truncate max-w-[200px]">{a.ticket.title}</p>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {a.job?.rule.name ?? "—"}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{a.requestedBy.name}</TableCell>
                  <TableCell className="text-center">
                    <Badge variant={
                      a.status === "PENDING" ? "outline" :
                      a.status === "APPROVED" ? "default" :
                      a.status === "REJECTED" ? "destructive" : "secondary"
                    }>
                      {a.status === "PENDING" && <Clock className="size-3 mr-1" />}
                      {a.status === "APPROVED" && <CheckCircle2 className="size-3 mr-1" />}
                      {a.status === "REJECTED" && <XCircle className="size-3 mr-1" />}
                      {a.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{formatRelativeTime(a.createdAt)}</TableCell>
                  <TableCell className="text-right">
                    {a.status === "PENDING" && (
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="default" size="sm" onClick={() => handleApprove(a.id)}>
                          <CheckCircle2 className="size-3.5 mr-1" />
                          Approve
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => handleReject(a.id)}>
                          <XCircle className="size-3.5 mr-1" />
                          Reject
                        </Button>
                      </div>
                    )}
                    {a.status !== "PENDING" && a.approver && (
                      <span className="text-xs text-muted-foreground">by {a.approver.name}</span>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
