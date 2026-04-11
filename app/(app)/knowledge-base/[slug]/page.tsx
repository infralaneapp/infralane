import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Eye } from "lucide-react";

import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type ArticlePageProps = {
  params: Promise<{ slug: string }>;
};

export default async function ArticlePage({ params }: ArticlePageProps) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return null;

  const { slug } = await params;

  const article = await prisma.knowledgeBaseArticle.findUnique({
    where: { slug },
  });

  if (!article || !article.published) {
    notFound();
  }

  // Increment view count
  await prisma.knowledgeBaseArticle.update({
    where: { slug },
    data: { viewCount: { increment: 1 } },
  });

  return (
    <div className="space-y-6 max-w-3xl">
      <Link
        href="/knowledge-base"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="size-4" />
        Back to Knowledge Base
      </Link>

      <div>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-semibold tracking-heading text-foreground">
            {article.title}
          </h1>
          {article.category && (
            <Badge variant="secondary">{article.category}</Badge>
          )}
        </div>
        <div className="mt-2 flex items-center gap-3 text-sm text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <Eye className="size-3.5" />
            {article.viewCount + 1} views
          </span>
        </div>
      </div>

      <Card className="p-6 shadow-card">
        <div className="prose prose-sm max-w-none text-foreground">
          {article.content.split("\n").map((paragraph, i) => (
            <p key={i} className="mb-3 last:mb-0 text-sm leading-relaxed text-foreground">
              {paragraph}
            </p>
          ))}
        </div>
      </Card>
    </div>
  );
}
