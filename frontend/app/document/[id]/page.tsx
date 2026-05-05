"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowLeft, Download, FileText, Clock, HardDrive, Hash } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { searchApi, filesApi } from "@/lib/api";
import type { DocumentDetail } from "@/lib/api";

const statusColors: Record<string, string> = {
  indexed: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  processing: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  error: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
};

export default function DocumentDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [doc, setDoc] = useState<DocumentDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDoc = async () => {
      try {
        setLoading(true);
        const data = await searchApi.documentDetail(params.id);
        setDoc(data);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to fetch document");
      } finally {
        setLoading(false);
      }
    };
    fetchDoc();
  }, [params.id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-muted-foreground">Loading document...</p>
      </div>
    );
  }

  if (error || !doc) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-destructive">Error: {error || "Document not found"}</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <Button variant="ghost" size="sm" onClick={() => router.push("/")}>
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to Search
      </Button>

      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <CardTitle className="text-2xl flex items-center gap-2">
                <FileText className="h-6 w-6" />
                {doc.filename}
              </CardTitle>
              <div className="flex items-center gap-2">
                <Badge className={statusColors[doc.status] || "bg-gray-100"}>
                  {doc.status}
                </Badge>
                <span className="text-sm text-muted-foreground">{doc.file_type}</span>
              </div>
            </div>
            {doc.minio_path && (
              <Button asChild>
                <a
                  href={filesApi.download(doc.minio_path.replace(/^omnidoc\//, ""))}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download File
                </a>
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div className="flex items-center gap-2">
              <Hash className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-muted-foreground">Word Count</p>
                <p className="font-medium">{doc.word_count ?? "N/A"}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-muted-foreground">Pages</p>
                <p className="font-medium">{doc.page_count ?? "N/A"}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <HardDrive className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-muted-foreground">File Size</p>
                <p className="font-medium">
                  {doc.file_size != null
                    ? doc.file_size > 1024 * 1024
                      ? `${(doc.file_size / (1024 * 1024)).toFixed(2)} MB`
                      : `${(doc.file_size / 1024).toFixed(2)} KB`
                    : "N/A"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-muted-foreground">Created</p>
                <p className="font-medium">
                  {doc.created_at ? new Date(doc.created_at).toLocaleDateString() : "N/A"}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Content Chunks ({doc.chunk_count})</h2>
        {doc.chunks.map((chunk) => (
          <Card key={chunk.chunk_index}>
            <CardHeader className="py-3">
              <div className="flex items-center gap-2">
                <Badge variant="outline">Chunk {chunk.chunk_index}</Badge>
                {chunk.has_table && <Badge variant="secondary">Table</Badge>}
                {chunk.source_page && (
                  <span className="text-sm text-muted-foreground">Page {chunk.source_page}</span>
                )}
                {chunk.source_section && (
                  <span className="text-sm text-muted-foreground">{chunk.source_section}</span>
                )}
                <span className="text-sm text-muted-foreground ml-auto">
                  {chunk.word_count} words
                </span>
              </div>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-wrap text-sm leading-relaxed">{chunk.text}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
