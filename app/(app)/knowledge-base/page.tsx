"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Search, BookOpen } from "lucide-react";

import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/empty-state";

type Article = {
  id: string;
  title: string;
  slug: string;
  content: string;
  category: string | null;
  viewCount: number;
  createdAt: string;
};

export default function KnowledgeBasePage() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  async function fetchArticles() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (activeCategory) params.set("category", activeCategory);
      const res = await fetch(`/api/knowledge-base?${params}`);
      const data = await res.json();
      if (data.success) setArticles(data.data.articles);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchArticles();
  }, [activeCategory]);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    fetchArticles();
  }

  const categories = Array.from(
    new Set(articles.map((a) => a.category).filter(Boolean))
  ) as string[];

  return (
    <div className="space-y-6">
      <div className="text-sm text-muted-foreground mb-4">
        <span className="text-foreground font-medium">Knowledge Base</span>
      </div>
      <div>
        <h1 className="text-2xl font-semibold tracking-heading text-foreground">
          Knowledge Base
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Browse articles and guides to help you resolve common issues.
        </p>
      </div>

      {/* Search bar */}
      <form onSubmit={handleSearch} className="flex gap-2">
        <div className="relative flex-1 max-w-lg">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search articles..."
            className="pl-9"
          />
        </div>
        <Button type="submit">Search</Button>
      </form>

      {/* Category filters */}
      {categories.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <Button
            variant={activeCategory === null ? "default" : "outline"}
            size="sm"
            onClick={() => setActiveCategory(null)}
          >
            All
          </Button>
          {categories.map((cat) => (
            <Button
              key={cat}
              variant={activeCategory === cat ? "default" : "outline"}
              size="sm"
              onClick={() => setActiveCategory(cat)}
            >
              {cat}
            </Button>
          ))}
        </div>
      )}

      {/* Article grid */}
      {loading ? (
        <div className="text-center text-sm text-muted-foreground py-12">Loading...</div>
      ) : articles.length === 0 ? (
        <Card className="shadow-card">
          <EmptyState
            icon={BookOpen}
            title="No articles found"
            description={search
              ? "Try a different search term."
              : "No published articles are available yet."}
          />
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {articles.map((article) => (
            <Link key={article.id} href={`/knowledge-base/${article.slug}`}>
              <Card className="h-full p-5 shadow-card transition-colors hover:border-primary/30">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="text-sm font-semibold text-foreground line-clamp-2">
                    {article.title}
                  </h3>
                  {article.category && (
                    <Badge variant="secondary" className="shrink-0 text-[11px]">
                      {article.category}
                    </Badge>
                  )}
                </div>
                <p className="mt-2 text-sm text-muted-foreground line-clamp-3">
                  {article.content.slice(0, 150)}
                  {article.content.length > 150 ? "..." : ""}
                </p>
                <p className="mt-3 text-xs text-muted-foreground">
                  {article.viewCount} view{article.viewCount !== 1 ? "s" : ""}
                </p>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
