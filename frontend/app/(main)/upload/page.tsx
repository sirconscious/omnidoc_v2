"use client";

import { useState, useRef, useCallback, type DragEvent } from "react";
import { Upload, File, X, CheckCircle, AlertCircle, Loader2, Folder } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  uploadFile,
  pollStatus,
  formatFileSize,
  SUPPORTED_EXTENSIONS,
} from "@/lib/ingest";

async function walkEntry(entry: FileSystemEntry): Promise<File[]> {
  if (entry.isFile) {
    const fe = entry as FileSystemFileEntry;
    return new Promise((resolve) => {
      fe.file((file) => {
        const ext = "." + file.name.split(".").pop()?.toLowerCase();
        resolve(SUPPORTED_EXTENSIONS.includes(ext) ? [file] : []);
      }, () => resolve([]));
    });
  }

  const de = entry as FileSystemDirectoryEntry;
  const reader = de.createReader();
  const entries = await new Promise<FileSystemEntry[]>((resolve) => {
    reader.readEntries((results) => resolve(results), () => resolve([]));
  });

  const nested = await Promise.all(entries.map(walkEntry));
  return nested.flat();
}

interface QueueItem {
  file: File;
  docId?: string;
  status: "queued" | "uploading" | "processing" | "indexed" | "error";
  error?: string;
}

export default function UploadPage() {
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const addFiles = useCallback((files: FileList | File[]) => {
    const newItems: QueueItem[] = [];
    for (const file of Array.from(files)) {
      const ext = "." + file.name.split(".").pop()?.toLowerCase();
      if (!SUPPORTED_EXTENSIONS.includes(ext)) {
        newItems.push({ file, status: "error", error: `Unsupported type ${ext}` });
        continue;
      }
      newItems.push({ file, status: "queued" });
    }
    setQueue((prev) => [...prev, ...newItems]);
  }, []);

  const startUpload = async (index: number) => {
    const item = queue[index];
    if (!item || item.status !== "queued") return;

    setQueue((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], status: "uploading" };
      return copy;
    });

    try {
      const result = await uploadFile(item.file);
      setQueue((prev) => {
        const copy = [...prev];
        copy[index] = { ...copy[index], docId: result.doc_id, status: "processing" };
        return copy;
      });

      pollStatus(
        result.doc_id,
        (status) => {
          setQueue((prev) => {
            const copy = [...prev];
            if (status.status === "indexed") {
              copy[index] = { ...copy[index], status: "indexed" };
            } else if (status.status === "error") {
              copy[index] = { ...copy[index], status: "error", error: status.error_message };
            }
            return copy;
          });
        },
        () => {},
      );
    } catch (err) {
      setQueue((prev) => {
        const copy = [...prev];
        copy[index] = { ...copy[index], status: "error", error: err instanceof Error ? err.message : "Upload failed" };
        return copy;
      });
    }
  };

  const handleDrop = async (e: DragEvent) => {
    e.preventDefault();
    setDragging(false);

    const items = e.dataTransfer.items;
    if (!items || items.length === 0) {
      if (e.dataTransfer.files.length > 0) addFiles(e.dataTransfer.files);
      return;
    }

    const allFiles: File[] = [];
    for (let i = 0; i < items.length; i++) {
      const entry = items[i].webkitGetAsEntry();
      if (entry) {
        const files = await walkEntry(entry);
        allFiles.push(...files);
      }
    }

    if (allFiles.length > 0) {
      // show folder icons for directory items
      const newItems: QueueItem[] = allFiles.map((file) => ({
        file,
        status: "queued" as const,
      }));
      setQueue((prev) => [...prev, ...newItems]);
    }
  };

  const handleDragOver = (e: DragEvent) => {
    e.preventDefault();
    setDragging(true);
  };

  const handleDragLeave = (e: DragEvent) => {
    e.preventDefault();
    setDragging(false);
  };

  const removeItem = (index: number) => {
    setQueue((prev) => prev.filter((_, i) => i !== index));
  };

  const uploadAll = () => {
    queue.forEach((item, i) => {
      if (item.status === "queued") startUpload(i);
    });
  };

  const statusIcon = (status: QueueItem["status"]) => {
    switch (status) {
      case "queued":
        return <File className="h-4 w-4 text-muted-foreground" />;
      case "uploading":
      case "processing":
        return <Loader2 className="h-4 w-4 animate-spin text-blue-500" />;
      case "indexed":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "error":
        return <AlertCircle className="h-4 w-4 text-destructive" />;
    }
  };

  const statusLabel = (status: QueueItem["status"]) => {
    switch (status) {
      case "queued":
        return "Queued";
      case "uploading":
        return "Uploading...";
      case "processing":
        return "Processing...";
      case "indexed":
        return "Done";
      case "error":
        return "Error";
    }
  };

  const queuedCount = queue.filter((i) => i.status === "queued").length;

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold tracking-tight mb-6">Upload Documents</h1>

      <Card
        className={`relative border-2 border-dashed p-12 text-center transition-colors cursor-pointer
          ${dragging ? "border-primary bg-primary/5" : "border-muted-foreground/25 hover:border-muted-foreground/50"}`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => inputRef.current?.click()}
      >
        <input
          ref={inputRef}
          type="file"
          multiple
          accept={SUPPORTED_EXTENSIONS.join(",")}
          className="hidden"
          onChange={(e) => e.target.files && addFiles(e.target.files)}
        />
        <Upload className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
        <p className="text-sm font-medium mb-1">
          Drop files or folders here or click to browse
        </p>
        <p className="text-xs text-muted-foreground">
          PDF, CSV, DOCX, TXT, MD, JSON &mdash; directories are walked recursively
        </p>
      </Card>

      {queue.length > 0 && (
        <div className="mt-6 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {queue.length} file{queue.length !== 1 ? "s" : ""}
            </p>
            {queuedCount > 0 && (
              <Button size="sm" onClick={uploadAll}>
                Upload {queuedCount} file{queuedCount !== 1 ? "s" : ""}
              </Button>
            )}
          </div>

          {queue.map((item, i) => (
            <Card key={i} className="p-3 flex items-center gap-3">
              {statusIcon(item.status)}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{item.file.name}</p>
                <p className="text-xs text-muted-foreground">
                  {formatFileSize(item.file.size)}
                </p>
                {item.error && (
                  <p className="text-xs text-destructive mt-0.5">{item.error}</p>
                )}
              </div>
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full shrink-0 ${
                item.status === "indexed" ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" :
                item.status === "error" ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" :
                item.status === "processing" || item.status === "uploading" ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" :
                "bg-muted text-muted-foreground"
              }`}>
                {statusLabel(item.status)}
              </span>
              {(item.status === "queued" || item.status === "error") && (
                <button onClick={() => removeItem(i)} className="shrink-0 text-muted-foreground hover:text-foreground">
                  <X className="h-4 w-4" />
                </button>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
