import { z } from 'zod';

// ==========================================
// API Keys
// ==========================================

export const createApiKeySchema = z.object({
  name: z.string().min(1).max(100),
  scopes: z.array(z.string()).min(1).optional(),
  expiresInDays: z.number().int().min(1).max(365).optional(),
});

// ==========================================
// Templates
// ==========================================

export const createTemplateSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  style: z.record(z.unknown()),
  category: z.enum(['minimal', 'cinematic', 'bold', 'modern', 'custom']).optional(),
  isPublic: z.boolean().optional(),
});

export const updateTemplateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  style: z.record(z.unknown()).optional(),
  category: z.enum(['minimal', 'cinematic', 'bold', 'modern', 'custom']).optional(),
  isPublic: z.boolean().optional(),
});

// ==========================================
// Render
// ==========================================

export const createRenderSchema = z.object({
  videoId: z.string().uuid(),
  templateId: z.string().uuid().optional(),
  style: z.record(z.unknown()).optional(),
  preset: z.enum(['fast', 'balanced', 'quality']).optional(),
  cues: z
    .array(
      z
        .object({
          id: z.string().min(1),
          startTime: z.number().min(0),
          endTime: z.number().min(0),
          text: z.string().max(500),
          words: z
            .array(
              z.object({
                text: z.string(),
                startTime: z.number().min(0),
                endTime: z.number().min(0),
              })
            )
            .optional(),
          animationStyle: z
            .enum(['none', 'word-highlight', 'word-by-word', 'karaoke', 'bounce', 'typewriter'])
            .optional(),
        })
        .refine((cue) => cue.endTime > cue.startTime, {
          message: 'endTime must be greater than startTime',
        })
    )
    .max(10000)
    .optional(),
  generateProject: z.boolean().optional(),
});

// ==========================================
// Projects
// ==========================================

export const createProjectSchema = z.object({
  name: z.string().min(1).max(200),
  videoId: z.string().uuid().optional(),
});

// ==========================================
// Pagination
// ==========================================

export const paginationSchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});
