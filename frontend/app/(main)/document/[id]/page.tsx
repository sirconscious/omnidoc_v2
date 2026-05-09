"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowLeft, Download, FileText, Clock, HardDrive, Hash, Table as TableIcon, Copy, Check, Eye, ChevronDown, ChevronUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationPrevious,
  PaginationNext,
  PaginationEllipsis,
} from "@/components/ui/pagination";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { searchApi, downloadFile } from "@/lib/api";
import type { DocumentDetail } from "@/lib/api";

const CHUNK_PAGE_SIZE = 5;

const statusColors: Record<string, string> = {
  indexed: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  processing: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  error: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
};

function formatFileSize(bytes: number | null): string {
  if (bytes == null) return "N/A";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function FilenamePopover({ name }: { name: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(name);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0">
          <Eye className="h-3.5 w-3.5" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-96 max-h-80 overflow-auto" align="start">
        <div className="flex items-start justify-between gap-2">
          <code className="text-sm break-all">{name}</code>
          <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={handleCopy}>
            {copied ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

function buildPaginationList(current: number, total: number) {
  if (total <= 1) return [];
  const pages: (number | "...")[] = [];
  if (total <= 7) {
    for (let i = 1; i <= total; i++) pages.push(i);
  } else {
    pages.push(1);
    if (current > 3) pages.push("...");
    const start = Math.max(2, current - 1);
    const end = Math.min(total - 1, current + 1);
    for (let i = start; i <= end; i++) pages.push(i);
    if (current < total - 2) pages.push("...");
    pages.push(total);
  }
  return pages;
}

export default function DocumentDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [doc, setDoc] = useState<DocumentDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [chunkPage, setChunkPage] = useState(1);
  const [expandedChunks, setExpandedChunks] = useState<Set<number>>(new Set());
  const [downloading, setDownloading] = useState(false);

  const toggleChunk = (idx: number) => {
    setExpandedChunks(prev => {
      const next = new Set(prev);
      next.has(idx) ? next.delete(idx) : next.add(idx);
      return next;
    });
  };

  useEffect(() => {
    setChunkPage(1);
    setLoading(true);
    setError(null);
    searchApi.documentDetail(params.id)
      .then(setDoc)
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to fetch document"))
      .finally(() => setLoading(false));
  }, [params.id]);

  const totalChunkPages = doc ? Math.max(1, Math.ceil(doc.chunks.length / CHUNK_PAGE_SIZE)) : 1;
  const safeChunkPage = Math.min(chunkPage, totalChunkPages);
  const chunkStart = (safeChunkPage - 1) * CHUNK_PAGE_SIZE;
  const pageChunks = doc?.chunks.slice(chunkStart, chunkStart + CHUNK_PAGE_SIZE) ?? [];
  const chunkPaginationList = buildPaginationList(safeChunkPage, totalChunkPages);

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-8 w-32" />
        <Card>
          <CardHeader>
            <Skeleton className="h-7 w-64 mb-2" />
            <Skeleton className="h-5 w-32" />
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="space-y-2">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-5 w-16" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
        <Skeleton className="h-6 w-48" />
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardHeader className="py-3">
              <Skeleton className="h-5 w-24" />
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-5/6" />
                <Skeleton className="h-4 w-4/6" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (error || !doc) {
    return (
      <div className="p-6 flex flex-col items-center justify-center py-20 gap-4">
        <p className="text-destructive text-lg">{error || "Document not found"}</p>
        <Button variant="outline" onClick={() => router.push("/")}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Search
        </Button>
      </div>
    );
  }

  const handleDownload = async () => {
    if (!doc?.minio_path || downloading) return;
    setDownloading(true);
    try {
      const path = doc.minio_path.replace(/^omnidoc\//, "");
      await downloadFile(path, doc.filename);
    } catch (e) {
      console.error("Download failed:", e);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <Button variant="ghost" size="sm" onClick={() => router.push("/")}>
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to Search
      </Button>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <FileText className="h-5 w-5 text-primary shrink-0" />
                <CardTitle className="text-xl truncate">
                  {doc.filename}
                </CardTitle>
                <FilenamePopover name={doc.filename} />
              </div>
              <CardDescription className="flex items-center gap-2">
                <Badge variant="outline" className={statusColors[doc.status] || ""}>
                  {doc.status}
                </Badge>
                <span>{doc.file_type?.toUpperCase()}</span>
              </CardDescription>
            </div>
            {doc.minio_path && (
              <Button className="shrink-0" onClick={handleDownload} disabled={downloading}>
                <Download className="h-4 w-4 mr-2" />
                {downloading ? "Downloading..." : "Download"}
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-2 border-t">
            <div className="flex items-center gap-3 py-2">
              <div className="flex items-center justify-center size-9 rounded-lg bg-muted">
                <Hash className="h-4 w-4 text-muted-foreground" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Words</p>
                <p className="font-semibold text-sm">{doc.word_count ?? "—"}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 py-2">
              <div className="flex items-center justify-center size-9 rounded-lg bg-muted">
                <FileText className="h-4 w-4 text-muted-foreground" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Pages</p>
                <p className="font-semibold text-sm">{doc.page_count ?? "—"}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 py-2">
              <div className="flex items-center justify-center size-9 rounded-lg bg-muted">
                <HardDrive className="h-4 w-4 text-muted-foreground" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Size</p>
                <p className="font-semibold text-sm">{formatFileSize(doc.file_size)}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 py-2">
              <div className="flex items-center justify-center size-9 rounded-lg bg-muted">
                <Clock className="h-4 w-4 text-muted-foreground" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Created</p>
                <p className="font-semibold text-sm">
                  {doc.created_at ? new Date(doc.created_at).toLocaleDateString() : "—"}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            Content Chunks
            <Badge variant="secondary" className="text-xs">{doc.chunk_count}</Badge>
          </h2>
        </div>

        <div className="space-y-3">
          {pageChunks.map((chunk, idx) => {
            const globalIdx = chunkStart + idx;
            const isExpanded = expandedChunks.has(globalIdx);
            return (
              <Card key={chunk.chunk_index} className="overflow-hidden">
                <div className="flex items-center gap-2 px-4 py-2.5 border-b bg-muted/30">
                  <Badge variant="outline" className="text-xs font-mono">
                    #{chunk.chunk_index}
                  </Badge>
                  {chunk.has_table && (
                    <Badge variant="secondary" className="text-xs">
                      <TableIcon className="h-3 w-3 mr-1" />
                      Table
                    </Badge>
                  )}
                  {chunk.source_page && (
                    <span className="text-xs text-muted-foreground">Page {chunk.source_page}</span>
                  )}
                  {chunk.source_section && (
                    <span className="text-xs text-muted-foreground truncate">{chunk.source_section}</span>
                  )}
                  <span className="text-xs text-muted-foreground ml-auto shrink-0">
                    {chunk.word_count} words
                  </span>
                </div>
                <button
                  className="w-full flex items-center justify-between gap-2 px-4 py-3 text-left hover:bg-muted/30 transition-colors"
                  onClick={() => toggleChunk(globalIdx)}
                >
                  {isExpanded ? (
                    <>
                      <div className="flex-1 max-h-64 overflow-auto pr-2">
                        <p className="text-sm leading-relaxed whitespace-pre-wrap text-foreground/80">
                          {chunk.text}
                        </p>
                      </div>
                      <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0 ml-2" />
                    </>
                  ) : (
                    <>
                      <span className="text-sm text-muted-foreground italic">Click to view content</span>
                      <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0 ml-2" />
                    </>
                  )}
                </button>
              </Card>
            );
          })}
        </div>

        {totalChunkPages > 1 && (
          <div className="mt-6">
            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious
                    href="#"
                    onClick={(e) => { e.preventDefault(); setChunkPage((p) => Math.max(1, p - 1)); }}
                  />
                </PaginationItem>
                {chunkPaginationList.map((p, i) =>
                  p === "..." ? (
                    <PaginationItem key={`e-${i}`}>
                      <PaginationEllipsis />
                    </PaginationItem>
                  ) : (
                    <PaginationItem key={p}>
                      <PaginationLink
                        href="#"
                        isActive={p === safeChunkPage}
                        onClick={(e) => { e.preventDefault(); setChunkPage(p); }}
                      >
                        {p}
                      </PaginationLink>
                    </PaginationItem>
                  )
                )}
                <PaginationItem>
                  <PaginationNext
                    href="#"
                    onClick={(e) => { e.preventDefault(); setChunkPage((p) => Math.min(totalChunkPages, p + 1)); }}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          </div>
        )}
      </div>
    </div>
  );
}
