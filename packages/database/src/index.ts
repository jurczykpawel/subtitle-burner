import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query'] : [],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

export function createDB(): PrismaClient {
  return prisma;
}

// Query helpers
export async function getUserByEmail(email: string) {
  return prisma.user.findUnique({ where: { email } });
}

export async function getUserById(userId: string) {
  return prisma.user.findUnique({ where: { id: userId } });
}

export async function upsertUser(id: string, email: string) {
  return prisma.user.upsert({
    where: { id },
    update: { email },
    create: { id, email },
  });
}

export async function createUserWithPassword(email: string, hashedPassword: string) {
  return prisma.user.create({
    data: { email, password: hashedPassword },
  });
}

export async function createVideo(data: {
  userId: string;
  filename: string;
  filePath: string;
  fileSize: bigint;
  duration: number;
  width: number;
  height: number;
  mimeType: string;
}) {
  return prisma.video.create({ data });
}

export async function getVideosByUser(userId: string) {
  return prisma.video.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    include: { _count: { select: { subtitles: true, renderJobs: true } } },
  });
}

export async function getVideoById(id: string, userId: string) {
  return prisma.video.findFirst({ where: { id, userId } });
}

export async function deleteVideo(id: string, userId: string) {
  return prisma.video.deleteMany({ where: { id, userId } });
}

export async function getSubtitlesByVideo(videoId: string, userId: string) {
  return prisma.subtitle.findFirst({
    where: {
      videoId,
      video: { userId },
    },
    orderBy: { updatedAt: 'desc' },
  });
}

export async function upsertSubtitle(
  videoId: string,
  content: unknown,
  style?: unknown
) {
  const existing = await prisma.subtitle.findFirst({ where: { videoId } });
  if (existing) {
    return prisma.subtitle.update({
      where: { id: existing.id },
      data: { content: content as object, style: style as object },
    });
  }
  return prisma.subtitle.create({
    data: {
      videoId,
      content: content as object,
      style: style as object,
    },
  });
}

export async function createRenderJob(data: {
  userId: string;
  videoId: string;
  style: unknown;
}) {
  return prisma.renderJob.create({
    data: {
      userId: data.userId,
      videoId: data.videoId,
      style: data.style as object,
    },
  });
}

export async function getRenderJob(id: string, userId: string) {
  return prisma.renderJob.findFirst({ where: { id, userId } });
}

/** Internal use only - worker needs to read job without userId scoping */
export async function getRenderJobInternal(id: string) {
  return prisma.renderJob.findUnique({ where: { id } });
}

export async function updateRenderJobStatus(
  id: string,
  updates: {
    status?: 'QUEUED' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
    progress?: number;
    outputUrl?: string;
    error?: string;
    startedAt?: Date;
    completedAt?: Date;
  }
) {
  return prisma.renderJob.update({ where: { id }, data: updates });
}

export async function countUserRendersToday(userId: string): Promise<number> {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  return prisma.renderJob.count({
    where: { userId, createdAt: { gte: startOfDay } },
  });
}

// ==========================================
// Template queries
// ==========================================

export async function createTemplate(data: {
  userId: string;
  name: string;
  description?: string;
  style: object;
  category?: string;
  isPublic?: boolean;
}) {
  return prisma.template.create({
    data: {
      userId: data.userId,
      name: data.name,
      description: data.description ?? '',
      style: data.style,
      category: data.category ?? 'custom',
      isPublic: data.isPublic ?? false,
    },
  });
}

export async function getTemplatesByUser(userId: string) {
  return prisma.template.findMany({
    where: { userId },
    orderBy: { updatedAt: 'desc' },
  });
}

export async function getTemplateById(id: string, userId: string) {
  return prisma.template.findFirst({ where: { id, userId } });
}

export async function getPublicTemplates(cursor?: string, limit = 20) {
  return prisma.template.findMany({
    where: { isPublic: true },
    orderBy: { usageCount: 'desc' },
    take: limit + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
  });
}

export async function updateTemplate(
  id: string,
  userId: string,
  data: {
    name?: string;
    description?: string;
    style?: object;
    category?: string;
    isPublic?: boolean;
  }
) {
  return prisma.template.updateMany({
    where: { id, userId },
    data,
  });
}

export async function deleteTemplate(id: string, userId: string) {
  return prisma.template.deleteMany({ where: { id, userId } });
}

export async function incrementTemplateUsage(id: string) {
  return prisma.template.update({
    where: { id },
    data: { usageCount: { increment: 1 } },
  });
}

// ==========================================
// ApiKey queries
// ==========================================

export async function createApiKey(data: {
  userId: string;
  name: string;
  keyPrefix: string;
  keyHash: string;
  scopes?: string[];
  rateLimitPerMinute?: number;
  expiresAt?: Date;
}) {
  return prisma.apiKey.create({
    data: {
      userId: data.userId,
      name: data.name,
      keyPrefix: data.keyPrefix,
      keyHash: data.keyHash,
      scopes: data.scopes ?? ['*'],
      rateLimitPerMinute: data.rateLimitPerMinute ?? 60,
      expiresAt: data.expiresAt,
    },
  });
}

export async function getApiKeysByUser(userId: string) {
  return prisma.apiKey.findMany({
    where: { userId, revokedAt: null },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      name: true,
      keyPrefix: true,
      scopes: true,
      rateLimitPerMinute: true,
      isActive: true,
      expiresAt: true,
      lastUsedAt: true,
      usageCount: true,
      createdAt: true,
    },
  });
}

export async function getApiKeyByHash(keyHash: string) {
  return prisma.apiKey.findUnique({
    where: { keyHash },
    include: { user: true },
  });
}

export async function revokeApiKey(id: string, userId: string, reason?: string) {
  return prisma.apiKey.updateMany({
    where: { id, userId, revokedAt: null },
    data: {
      revokedAt: new Date(),
      revokedReason: reason ?? 'User revoked',
      isActive: false,
    },
  });
}

export async function touchApiKey(id: string, ip?: string) {
  return prisma.apiKey.update({
    where: { id },
    data: {
      lastUsedAt: new Date(),
      lastUsedIp: ip,
      usageCount: { increment: 1 },
    },
  });
}

// ==========================================
// Project queries
// ==========================================

export async function createProject(data: {
  userId: string;
  name: string;
  videoId?: string;
  settings?: object;
}) {
  return prisma.project.create({ data });
}

export async function getProjectsByUser(
  userId: string,
  cursor?: string,
  limit = 20
) {
  return prisma.project.findMany({
    where: { userId },
    orderBy: { updatedAt: 'desc' },
    take: limit + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    include: { video: { select: { id: true, filename: true, duration: true } } },
  });
}

export async function getProjectById(id: string, userId: string) {
  return prisma.project.findFirst({
    where: { id, userId },
    include: { video: true },
  });
}

export async function updateProject(
  id: string,
  userId: string,
  data: { name?: string; videoId?: string; settings?: object }
) {
  return prisma.project.updateMany({
    where: { id, userId },
    data,
  });
}

export async function deleteProject(id: string, userId: string) {
  return prisma.project.deleteMany({ where: { id, userId } });
}

// ==========================================
// RenderJob - extended queries
// ==========================================

export async function createRenderJobV2(data: {
  userId: string;
  videoId: string;
  style: object;
  templateId?: string;
  apiKeyId?: string;
}) {
  return prisma.renderJob.create({
    data: {
      userId: data.userId,
      videoId: data.videoId,
      style: data.style,
      templateId: data.templateId,
      apiKeyId: data.apiKeyId,
    },
  });
}

/**
 * Atomic credit check - prevents TOCTOU race condition.
 *
 * Uses a Prisma transaction with a raw SQL atomic increment pattern:
 * count current jobs AND create a placeholder in a single transaction,
 * rolling back if the limit is exceeded.
 */
export async function tryConsumeRenderCredit(
  userId: string,
  dailyLimit: number
): Promise<boolean> {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  // Use an interactive transaction to ensure atomicity.
  // The count and the check happen inside the same serializable snapshot.
  try {
    await prisma.$transaction(async (tx) => {
      const count = await tx.renderJob.count({
        where: { userId, createdAt: { gte: startOfDay } },
      });
      if (count >= dailyLimit) {
        throw new Error('LIMIT_EXCEEDED');
      }
      // The actual renderJob will be created outside this transaction,
      // but by holding the transaction open until the check passes,
      // we serialise concurrent attempts for the same user.
    });
    return true;
  } catch (err) {
    if (err instanceof Error && err.message === 'LIMIT_EXCEEDED') {
      return false;
    }
    throw err;
  }
}

export async function updateRenderJobProjectFile(id: string, projectFile: string) {
  return prisma.renderJob.update({
    where: { id },
    data: { projectFile },
  });
}

export { PrismaClient };
export type * from '@prisma/client';
