import { z } from "zod";
import { NextRequest } from "next/server";

import { getSessionUser } from "@/lib/auth";
import { apiError, apiSuccess, handleApiError, parseRequestBody } from "@/lib/http";
import { prisma } from "@/lib/db";
import { hasPermission } from "@/lib/auth/permissions";

const createArticleSchema = z.object({
  title: z.string().trim().min(1).max(300),
  slug: z.string().trim().min(1).max(200).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug must be lowercase alphanumeric with hyphens"),
  content: z.string().min(1),
  category: z.string().trim().max(100).optional(),
  ticketTypeId: z.string().optional(),
  published: z.boolean().default(false),
});

export async function GET(request: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return apiError("Unauthorized.", { status: 401, code: "UNAUTHORIZED" });
    }

    const url = new URL(request.url);
    const category = url.searchParams.get("category") ?? undefined;
    const search = url.searchParams.get("search") ?? undefined;
    const ticketTypeId = url.searchParams.get("ticketTypeId") ?? undefined;
    const isAdminView = url.searchParams.get("_admin") === "1";

    const where: Record<string, unknown> = {};
    // Admins with settings:manage can see all articles (including drafts)
    if (!isAdminView || !hasPermission(user.role, "settings:manage")) {
      where.published = true;
    }
    if (category) where.category = category;
    if (ticketTypeId) where.ticketTypeId = ticketTypeId;
    if (search) where.title = { contains: search, mode: "insensitive" };

    const articles = await prisma.knowledgeBaseArticle.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });

    return apiSuccess({ articles });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await getSessionUser();
    if (!user || !hasPermission(user.role, "settings:manage")) {
      return apiError("Forbidden.", { status: 403, code: "FORBIDDEN" });
    }

    const payload = await parseRequestBody(request, createArticleSchema);

    const existingSlug = await prisma.knowledgeBaseArticle.findUnique({
      where: { slug: payload.slug },
    });
    if (existingSlug) {
      return apiError("An article with this slug already exists.", {
        status: 409,
        code: "DUPLICATE_SLUG",
      });
    }

    const article = await prisma.knowledgeBaseArticle.create({
      data: {
        ...payload,
        createdBy: user.id,
      },
    });

    return apiSuccess({ article }, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
