"use client";

import { useState, useEffect } from "react";
import { documentsApi, type Document } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Plus, Trash2, Pencil, FileText } from "lucide-react";

const statusColors: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  indexed: "bg-green-100 text-green-800",
  processing: "bg-blue-100 text-blue-800",
  error: "bg-red-100 text-red-800",
};

export default function DocumentsPanel() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Document | null>(null);
  const [form, setForm] = useState({
    filename: "",
    fileType: "pdf",
    minioPath: "",
    status: "pending",
  });

  useEffect(() => {
    fetchDocuments();
  }, []);

  const fetchDocuments = async () => {
    try {
      const data = await documentsApi.list();
      setDocuments(data);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  const openCreate = () => {
    setEditing(null);
    setForm({ filename: "", fileType: "pdf", minioPath: "", status: "pending" });
    setDialogOpen(true);
  };

  const openEdit = (d: Document) => {
    setEditing(d);
    setForm({
      filename: d.filename,
      fileType: d.fileType,
      minioPath: d.minioPath || "",
      status: d.status,
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.filename.trim()) return;
    try {
      if (editing) {
        await documentsApi.update(editing.id, form);
      } else {
        await documentsApi.create("acf3a192-c113-4ae3-acba-994d300419dd", form);
      }
      setDialogOpen(false);
      fetchDocuments();
    } catch (e) {
      console.error(e);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this document?")) return;
    try {
      await documentsApi.delete(id);
      fetchDocuments();
    } catch (e) {
      console.error(e);
    }
  };

  const formatSize = (bytes: number | null) => {
    if (!bytes) return "—";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  if (loading) return <p className="text-muted-foreground">Loading...</p>;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-lg font-semibold">Documents</h2>
          <p className="text-sm text-muted-foreground">
            {documents.length} document{documents.length !== 1 ? "s" : ""}
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4 mr-1" />
          New
        </Button>
      </div>

      {documents.length === 0 ? (
        <p className="text-muted-foreground text-center py-8">No documents yet.</p>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Filename</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Size</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {documents.map((d) => (
                <TableRow key={d.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                      <span className="truncate max-w-[200px]">{d.filename}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="uppercase">{d.fileType}</Badge>
                  </TableCell>
                  <TableCell className="text-sm tabular-nums">{formatSize(d.fileSize)}</TableCell>
                  <TableCell>
                    <Badge className={statusColors[d.status] || ""}>
                      {d.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="sm" onClick={() => openEdit(d)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDelete(d.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Document" : "New Document"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium mb-1 block">Filename</label>
              <Input
                value={form.filename}
                onChange={(e) => setForm({ ...form, filename: e.target.value })}
                placeholder="e.g. report.pdf"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Type</label>
              <Input
                value={form.fileType}
                onChange={(e) => setForm({ ...form, fileType: e.target.value })}
                placeholder="pdf, docx, csv..."
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">MinIO Path</label>
              <Input
                value={form.minioPath}
                onChange={(e) => setForm({ ...form, minioPath: e.target.value })}
                placeholder="omnidoc/raw/.../file.pdf"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Status</label>
              <Input
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value })}
                placeholder="pending, indexed, error..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={!form.filename.trim()}>
              {editing ? "Save" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
