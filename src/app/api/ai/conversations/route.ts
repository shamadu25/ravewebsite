import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { AI_CONFIG, QUICK_ACTIONS } from "@/lib/ai/config";
import { isRateLimited } from "@/lib/ai/rateLimit";
import { startConversation } from "@/lib/services/conversation";
import { clientIp } from "../_shared";

const StartConversationSchema = z.object({
  visitor_id: z.string().uuid(),
  current_page: z.string().max(2048).nullish(),
  landing_page: z.string().max(2048).nullish(),
  referrer: z.string().max(2048).nullish(),
  utm_source: z.string().max(255).nullish(),
  utm_medium: z.string().max(255).nullish(),
  utm_campaign: z.string().max(255).nullish(),
  utm_content: z.string().max(255).nullish(),
  utm_term: z.string().max(255).nullish(),
  device: z.string().max(50).nullish(),
  browser: z.string().max(50).nullish(),
  language: z.string().max(20).nullish(),
});

export async function POST(request: NextRequest) {
  if (isRateLimited(`start:${clientIp(request)}`)) {
    return NextResponse.json({ error: "Too many requests." }, { status: 429 });
  }

  const body = await request.json().catch(() => null);
  const parsed = StartConversationSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request.", details: parsed.error.flatten() }, { status: 422 });
  }

  const data = parsed.data;

  const conversation = await startConversation({
    visitorId: data.visitor_id,
    currentPage: data.current_page ?? undefined,
    landingPage: data.landing_page ?? undefined,
    referrer: data.referrer ?? undefined,
    utmSource: data.utm_source ?? undefined,
    utmMedium: data.utm_medium ?? undefined,
    utmCampaign: data.utm_campaign ?? undefined,
    utmContent: data.utm_content ?? undefined,
    utmTerm: data.utm_term ?? undefined,
    device: data.device ?? undefined,
    browser: data.browser ?? undefined,
    language: data.language ?? undefined,
  });

  const messages = await prisma.message.findMany({
    where: { conversationId: conversation.id },
    orderBy: { id: "asc" },
  });

  return NextResponse.json(
    {
      id: conversation.externalId,
      stage: conversation.stage,
      status: conversation.status,
      messages: messages.map((m) => ({
        id: m.id,
        role: m.role,
        content: m.content,
        created_at: m.createdAt.toISOString(),
      })),
      quick_actions: QUICK_ACTIONS,
      assistant_name: AI_CONFIG.assistantName,
    },
    { status: 201 }
  );
}
