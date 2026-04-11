"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Download, Paperclip, X } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Attachment = {
  id: string;
  filename: string;
  size: number;
  url: string;
  createdAt: string;
};

type FileUploadProps = {
  ticketId: string;
};

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function FileUpload({ ticketId }: FileUploadProps) {
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const fetchAttachments = useCallback(async () => {
    try {
      const res = await fetch(`/api/tickets/${ticketId}/attachments`);
      if (!res.ok) throw new Error("Failed to fetch attachments");
      const data = await res.json();
      setAttachments(data.data?.attachments ?? data.attachments ?? []);
    } catch {
      toast.error("Failed to load attachments.");
    }
  }, [ticketId]);

  useEffect(() => {
    fetchAttachments();
  }, [fetchAttachments]);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_FILE_SIZE) {
      toast.error("File exceeds the 10MB limit.");
      if (inputRef.current) inputRef.current.value = "";
      return;
    }

    setUploading(true);
    setProgress(0);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const xhr = new XMLHttpRequest();

      await new Promise<void>((resolve, reject) => {
        xhr.upload.addEventListener("progress", (event) => {
          if (event.lengthComputable) {
            setProgress(Math.round((event.loaded / event.total) * 100));
          }
        });

        xhr.addEventListener("load", () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve();
          } else {
            reject(new Error(xhr.responseText || "Upload failed"));
          }
        });

        xhr.addEventListener("error", () => reject(new Error("Upload failed")));
        xhr.open("POST", `/api/tickets/${ticketId}/attachments`);
        xhr.send(formData);
      });

      toast.success("File uploaded.");
      await fetchAttachments();
    } catch {
      toast.error("Failed to upload file.");
    } finally {
      setUploading(false);
      setProgress(0);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function handleRemove(attachmentId: string) {
    try {
      const res = await fetch(
        `/api/tickets/${ticketId}/attachments/${attachmentId}`,
        { method: "DELETE" }
      );
      if (!res.ok) throw new Error("Failed to delete");
      setAttachments((prev) => prev.filter((a) => a.id !== attachmentId));
      toast.success("Attachment removed.");
    } catch {
      toast.error("Failed to remove attachment.");
    }
  }

  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Paperclip className="size-4" />
          Attachments
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <input
          ref={inputRef}
          type="file"
          className="hidden"
          onChange={handleFileChange}
        />

        <Button
          variant="outline"
          size="sm"
          disabled={uploading}
          onClick={() => inputRef.current?.click()}
        >
          <Paperclip className="size-3.5" data-icon="inline-start" />
          {uploading ? "Uploading..." : "Attach file"}
        </Button>

        {uploading && (
          <div className="space-y-1">
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary transition-all duration-200"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground">{progress}%</p>
          </div>
        )}

        {attachments.length > 0 && (
          <ul className="space-y-1.5">
            {attachments.map((att) => (
              <li
                key={att.id}
                className="flex items-center justify-between gap-2 rounded-md border border-border px-2.5 py-1.5 text-sm"
              >
                <div className="flex items-center gap-2 truncate">
                  <Paperclip className="size-3.5 shrink-0 text-muted-foreground" />
                  <span className="truncate">{att.filename}</span>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {formatFileSize(att.size)}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <a
                    href={att.url}
                    download={att.filename}
                    className="inline-flex size-6 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
                  >
                    <Download className="size-3.5" />
                  </a>
                  <button
                    type="button"
                    onClick={() => handleRemove(att.id)}
                    className="inline-flex size-6 items-center justify-center rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                  >
                    <X className="size-3.5" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}

        {attachments.length === 0 && !uploading && (
          <p className="text-xs text-muted-foreground">No attachments yet.</p>
        )}
      </CardContent>
    </Card>
  );
}
