"use client";

import { useState } from "react";
import { searchApi, type SearchResult } from "@/lib/api";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import SearchResults from "@/components/search/search-results";

export default function Home() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<"keyword" | "semantic">("semantic");
  const [searched, setSearched] = useState(false);

  const handleSearch = async () => {
    if (!query.trim()) return;
    setLoading(true);
    setSearched(true);
    try {
      const data =
        mode === "keyword"
          ? await searchApi.keyword(query)
          : await searchApi.semantic(query);
      setResults(data.results || []);
    } catch (err) {
      console.error("Search error:", err);
      setResults([]);
    }
    setLoading(false);
  };

  return (
    <div className="flex flex-col min-h-screen">
      <div className="flex-1 flex flex-col items-center justify-center px-4">
        <h1 className="text-6xl font-bold tracking-tight mb-8 bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
          Omnidoc
        </h1>

        <div className="w-full max-w-2xl space-y-4">
          <div className="flex items-center gap-2">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                placeholder="Search your documents..."
                className="pl-10 h-12 text-lg rounded-full shadow-sm"
              />
            </div>
          </div>

          <div className="flex justify-center gap-2">
            {(["semantic", "keyword"] as const).map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                  mode === m
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                }`}
              >
                {m === "semantic" ? "Semantic" : "Keyword"}
              </button>
            ))}
            <Button onClick={handleSearch} className="ml-2 rounded-full">
              <Search className="h-4 w-4 mr-1" />
              Search
            </Button>
          </div>
        </div>
      </div>

      {searched && (
        <div className="max-w-4xl mx-auto w-full px-4 pb-12">
          <SearchResults results={results} loading={loading} mode={mode} />
        </div>
      )}
    </div>
  );
}
