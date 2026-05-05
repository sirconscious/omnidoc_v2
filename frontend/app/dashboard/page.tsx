"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import CollectionsPanel from "@/components/dashboard/collections-panel";
import DocumentsPanel from "@/components/dashboard/documents-panel";
import FilesPanel from "@/components/dashboard/files-panel";

export default function DashboardPage() {
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab");

  useEffect(() => {
    if (tabParam) {
      const el = document.querySelector(`[value="${tabParam}"]`) as HTMLElement;
      el?.click();
    }
  }, [tabParam]);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold tracking-tight mb-6">Dashboard</h1>
      <Tabs defaultValue="collections" className="space-y-6">
        <TabsList className="grid w-full max-w-md grid-cols-3">
          <TabsTrigger value="collections">Collections</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
          <TabsTrigger value="files">Files</TabsTrigger>
        </TabsList>

        <TabsContent value="collections">
          <CollectionsPanel />
        </TabsContent>

        <TabsContent value="documents">
          <DocumentsPanel />
        </TabsContent>

        <TabsContent value="files">
          <FilesPanel />
        </TabsContent>
      </Tabs>
    </div>
  );
}
