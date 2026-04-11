import { z } from "zod";
import { NextRequest } from "next/server";

import { getSessionUser } from "@/lib/auth";
import { apiError, apiSuccess, handleApiError, parseRequestBody } from "@/lib/http";
import { prisma } from "@/lib/db";
import { hasPermission } from "@/lib/auth/permissions";

type RouteParams = { params: Promise<{ slug: string }> };

export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return apiError("Unauthorized.", { status: 401, code: "UNAUTHORIZED" });
    }

    const { slug } = await params;

    const article = await prisma.knowledgeBaseArticle.findUnique({
      where: { slug },
    });

    if (!article) {
      return apiError("Article not found.", { status: 404, code: "NOT_FOUND" });
    }

    await prisma.knowledgeBaseArticle.update({
      where: { slug },
      data: { viewCount: { increment: 1 } },
    });

    return apiSuccess({ article: { ...article, viewCount: article.viewCount + 1 } });
  } catch (error) {
    return handleApiError(error);
  }
}

const updateArticleSchema = z.object({
  title: z.string().trim().min(1).max(300).optional(),
  slug: z.string().trim().min(1).max(200).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).optional(),
  content: z.string().min(1).optional(),
  category: z.string().trim().max(100).nullable().optional(),
  ticketTypeId: z.string().nullable().optional(),
  published: z.boolean().optional(),
});

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await getSessionUser();
    if (!user || !hasPermission(user.role, "settings:manage")) {
      return apiError("Forbidden.", { status: 403, code: "FORBIDDEN" });
    }

    const { slug } = await params;
    const payload = await parseRequestBody(request, updateArticleSchema);

    const existing = await prisma.knowledgeBaseArticle.findUnique({ where: { slug } });
    if (!existing) {
      return apiError("Article not found.", { status: 404, code: "NOT_FOUND" });
    }

    if (payload.slug && payload.slug !== slug) {
      const slugTaken = await prisma.knowledgeBaseArticle.findUnique({
        where: { slug: payload.slug },
      });
      if (slugTaken) {
        return apiError("An article with this slug already exists.", {
          status: 409,
          code: "DUPLICATE_SLUG",
        });
      }
    }

    const updated = await prisma.knowledgeBaseArticle.update({
      where: { slug },
      data: payload,
    });

    return apiSuccess({ article: updated });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    const user = await getSessionUser();
    if (!user || !hasPermission(user.role, "settings:manage")) {
      return apiError("Forbidden.", { status: 403, code: "FORBIDDEN" });
    }

    const { slug } = await params;

    const existing = await prisma.knowledgeBaseArticle.findUnique({ where: { slug } });
    if (!existing) {
      return apiError("Article not found.", { status: 404, code: "NOT_FOUND" });
    }

    await prisma.knowledgeBaseArticle.delete({ where: { slug } });

    return apiSuccess({ deleted: true });
  } catch (error) {
    return handleApiError(error);
  }
}
