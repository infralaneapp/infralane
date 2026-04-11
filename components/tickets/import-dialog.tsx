"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Upload, FileUp, AlertCircle, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export function ImportDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<{ imported: number; errors: string[] } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleUpload() {
    if (!file) return;
    setUploading(true);
    setResult(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/tickets/import", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data?.error?.message ?? "Import failed.");
        return;
      }
      setResult(data.data);
      if (data.data.imported > 0) {
        toast.success(`${data.data.imported} ticket(s) imported.`);
        router.refresh();
      }
    } finally {
      setUploading(false);
    }
  }

  function handleClose(isOpen: boolean) {
    setOpen(isOpen);
    if (!isOpen) {
      setFile(null);
      setResult(null);
    }
  }

  return (
    <>
      <Button variant="outline" size="default" onClick={() => setOpen(true)}>
        <Upload className="size-4 mr-1.5" />
        Import
      </Button>
      <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Import Tickets from CSV</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          <p className="text-sm text-muted-foreground">
            Upload a CSV file with columns: <strong>title</strong>, <strong>description</strong>,{" "}
            <strong>ticketTypeKey</strong>, <strong>priority</strong>, and optionally{" "}
            <strong>status</strong>.
          </p>

          <div
            className="flex flex-col items-center gap-3 rounded-lg border-2 border-dashed border-border p-6 cursor-pointer hover:border-primary/40 transition-colors"
            onClick={() => inputRef.current?.click()}
          >
            <FileUp className="size-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              {file ? file.name : "Click to select a .csv file"}
            </p>
            <input
              ref={inputRef}
              type="file"
              accept=".csv"
              className="hidden"
              onChange={(e) => {
                setFile(e.target.files?.[0] ?? null);
                setResult(null);
              }}
            />
          </div>

          <Button onClick={handleUpload} disabled={!file || uploading} className="w-full">
            {uploading ? "Importing..." : "Upload & Import"}
          </Button>

          {result && (
            <div className="space-y-2 rounded-lg border border-border p-3">
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle2 className="size-4 text-green-600" />
                <span className="font-medium text-foreground">
                  {result.imported} ticket(s) imported
                </span>
              </div>
              {result.errors.length > 0 && (
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-sm text-destructive">
                    <AlertCircle className="size-4" />
                    <span className="font-medium">{result.errors.length} error(s)</span>
                  </div>
                  <ul className="max-h-40 overflow-y-auto space-y-0.5 text-xs text-muted-foreground">
                    {result.errors.map((err, i) => (
                      <li key={i}>{err}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
    </>
  );
}
