import { prisma } from "@/lib/prisma";
import type { AiPromptVersion } from "@prisma/client";

export async function currentProductionContent(agentKey: string, fallback: string): Promise<string> {
  const prompt = await prisma.aiPrompt.findUnique({
    where: { agentKey },
    include: {
      versions: {
        where: { status: "production" },
        orderBy: { publishedAt: "desc" },
        take: 1,
      },
    },
  });

  return prompt?.versions[0]?.content ?? fallback;
}

export async function draftPrompt(
  agentKey: string,
  name: string,
  content: string,
  createdBy?: string
): Promise<AiPromptVersion> {
  const prompt = await prisma.aiPrompt.upsert({
    where: { agentKey },
    update: {},
    create: { agentKey, name },
  });

  const latest = await prisma.aiPromptVersion.findFirst({
    where: { aiPromptId: prompt.id },
    orderBy: { version: "desc" },
  });

  return prisma.aiPromptVersion.create({
    data: {
      aiPromptId: prompt.id,
      version: (latest?.version ?? 0) + 1,
      content,
      status: "draft",
      createdBy,
    },
  });
}

export async function publishPromptVersion(versionId: number, approvedBy?: string): Promise<AiPromptVersion> {
  return prisma.$transaction(async (tx) => {
    const version = await tx.aiPromptVersion.findUniqueOrThrow({ where: { id: versionId } });

    await tx.aiPromptVersion.updateMany({
      where: { aiPromptId: version.aiPromptId, status: "production" },
      data: { status: "archived" },
    });

    return tx.aiPromptVersion.update({
      where: { id: versionId },
      data: { status: "production", approvedBy, publishedAt: new Date() },
    });
  });
}
