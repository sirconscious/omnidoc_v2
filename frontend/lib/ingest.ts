const INGEST = "http://localhost:8000";

export interface UploadStatus {
  doc_id: string;
  status: "pending" | "processing" | "indexed" | "error";
  error_message?: string;
}

export async function uploadFile(file: File, collectionId?: string): Promise<UploadStatus> {
  const form = new FormData();
  form.append("file", file);
  if (collectionId) form.append("collection_id", collectionId);

  const res = await fetch(`${INGEST}/ingest`, {
    method: "POST",
    body: form,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.detail || `Upload failed (HTTP ${res.status})`);
  }
  const { doc_id } = await res.json();
  return { doc_id, status: "pending" };
}

export async function fetchStatus(docId: string): Promise<UploadStatus> {
  const res = await fetch(`${INGEST}/ingest/${docId}/status`);
  if (!res.ok) throw new Error(`Status fetch failed (HTTP ${res.status})`);
  return res.json();
}

export function pollStatus(
  docId: string,
  onUpdate: (status: UploadStatus) => void,
  onDone: () => void,
  interval = 1000,
): () => void {
  let stopped = false;

  const poll = async () => {
    while (!stopped) {
      try {
        const status = await fetchStatus(docId);
        onUpdate(status);
        if (status.status === "indexed" || status.status === "error") {
          onDone();
          return;
        }
      } catch {
        // retry
      }
      await new Promise((r) => setTimeout(r, interval));
    }
  };

  poll();
  return () => { stopped = true; };
}

export const SUPPORTED_EXTENSIONS = [".pdf", ".csv", ".docx", ".txt", ".md", ".json"];

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
