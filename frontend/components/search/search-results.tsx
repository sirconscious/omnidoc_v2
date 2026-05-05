import Link from "next/link";
import { type SearchResult } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileText, Table, Search } from "lucide-react";

interface SearchResultsProps {
  results: SearchResult[];
  loading: boolean;
  mode: "keyword" | "semantic";
}

export default function SearchResults({ results, loading, mode }: SearchResultsProps) {
  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-4">
              <div className="h-4 bg-muted rounded w-1/3 mb-2" />
              <div className="h-3 bg-muted rounded w-2/3" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (results.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <Search className="h-12 w-12 mx-auto mb-4 opacity-30" />
        <p className="text-lg">No results found</p>
        <p className="text-sm">Try a different search term</p>
      </div>
    );
  }

  return (
    <div>
      <p className="text-sm text-muted-foreground mb-3">
        {results.length} result{results.length !== 1 ? "s" : ""} via {mode} search
      </p>
      <div className="space-y-3">
        {results.map((r, i) => (
          <Link key={i} href={`/document/${r.doc_id}`} className="block group">
            <Card className="hover:shadow-md transition-shadow cursor-pointer border-border/60 group-hover:border-primary/40">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                      <p className="font-medium truncate group-hover:text-primary transition-colors">
                        {r.filename}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-1 mb-2">
                      <Badge variant="secondary" className="text-xs">
                        chunk {r.chunk_index}
                      </Badge>
                      {r.has_table && (
                        <Badge variant="outline" className="text-xs">
                          <Table className="h-3 w-3 mr-1" />
                          has table
                        </Badge>
                      )}
                      <Badge variant="secondary" className="text-xs">
                        score: {r.score.toFixed(2)}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-3 leading-relaxed">
                      {r.text}
                    </p>
                  </div>
                  <span className="text-xs text-muted-foreground shrink-0 tabular-nums">
                    {r.score.toFixed(3)}
                  </span>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
