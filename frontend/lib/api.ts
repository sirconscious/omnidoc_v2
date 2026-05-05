const API = "http://localhost:8080/api";
const SEARCH = "http://localhost:8000/search";

// ─── Collections ───────────────────────────────────────────
export interface Collection {
  id: string;
  name: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
}

export const collectionsApi = {
  list: () => fetch(`${API}/collections`).then(r => r.json()) as Promise<Collection[]>,
  get: (id: string) => fetch(`${API}/collections/${id}`).then(r => r.json()) as Promise<Collection>,
  create: (data: { name: string; description?: string }) =>
    fetch(`${API}/collections`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }).then(r => r.json()),
  update: (id: string, data: { name: string; description?: string }) =>
    fetch(`${API}/collections/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }).then(r => r.json()),
  delete: (id: string) =>
    fetch(`${API}/collections/${id}`, { method: "DELETE" }),
};

// ─── Documents ─────────────────────────────────────────────
export interface Document {
  id: string;
  filename: string;
  fileType: string;
  fileSize: number | null;
  minioPath: string | null;
  status: string;
  errorMessage: string | null;
  wordCount: number | null;
  pageCount: number | null;
  createdAt: string;
  updatedAt: string;
}

export const documentsApi = {
  list: () => fetch(`${API}/documents`).then(r => r.json()) as Promise<Document[]>,
  get: (id: string) => fetch(`${API}/documents/${id}`).then(r => r.json()) as Promise<Document>,
  getByCollection: (collectionId: string) =>
    fetch(`${API}/collections/${collectionId}/documents`).then(r => r.json()) as Promise<Document[]>,
  create: (collectionId: string, data: Partial<Document>) =>
    fetch(`${API}/collections/${collectionId}/documents`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }).then(r => r.json()),
  update: (id: string, data: Partial<Document>) =>
    fetch(`${API}/documents/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }).then(r => r.json()),
  delete: (id: string) =>
    fetch(`${API}/documents/${id}`, { method: "DELETE" }),
};

// ─── Files (MinIO) ────────────────────────────────────────
export interface MinioFile {
  name: string;
  size: number;
  lastModified: string;
}

export const filesApi = {
  list: (prefix = "") =>
    fetch(`${API}/files${prefix ? `?prefix=${prefix}` : ""}`).then(r => r.json()) as Promise<MinioFile[]>,
  listRaw: () => fetch(`${API}/files?prefix=raw/`).then(r => r.json()) as Promise<MinioFile[]>,
  listParsed: () => fetch(`${API}/files?prefix=parsed/`).then(r => r.json()) as Promise<MinioFile[]>,
  upload: (file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    return fetch(`${API}/files/upload`, { method: "POST", body: formData });
  },
  download: (path: string) => `${API}/files/download/${path}`,
  delete: (path: string) =>
    fetch(`${API}/files/${path}`, { method: "DELETE" }),
};

// ─── Search ───────────────────────────────────────────────
export interface SearchResult {
  doc_id: string;
  collection_id: string;
  filename: string;
  text: string;
  score: number;
  chunk_index: number;
  has_table?: boolean;
}

export interface DocumentDetail {
  doc_id: string;
  collection_id: string;
  filename: string;
  file_type: string;
  file_size: number | null;
  minio_path: string | null;
  status: string;
  word_count: number | null;
  page_count: number | null;
  created_at: string;
  chunk_count: number;
  full_text: string;
  chunks: Array<{
    chunk_index: number;
    text: string;
    has_table: boolean;
    source_page: string | null;
    source_section: string | null;
    word_count: number;
  }>;
}

export const searchApi = {
  keyword: (query: string, topK = 10) =>
    fetch(`${SEARCH}/keyword?query=${encodeURIComponent(query)}&top_k=${topK}`)
      .then(r => r.json()) as Promise<{ results: SearchResult[]; total: number }>,
  semantic: (query: string, topK = 10) =>
    fetch(`${SEARCH}/semantic?query=${encodeURIComponent(query)}&top_k=${topK}`)
      .then(r => r.json()) as Promise<{ results: SearchResult[]; total: number }>,
  documentDetail: (docId: string) =>
    fetch(`${SEARCH}/document/${encodeURIComponent(docId)}`)
      .then(r => r.json()) as Promise<DocumentDetail>,
};
