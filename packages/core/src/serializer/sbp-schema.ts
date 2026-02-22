import { z } from 'zod';

const subtitleWordSchema = z.object({
  text: z.string(),
  startTime: z.number().min(0),
  endTime: z.number().min(0),
});

const captionAnimationStyleSchema = z.enum([
  'none',
  'word-highlight',
  'word-by-word',
  'karaoke',
  'bounce',
  'typewriter',
]);

const subtitleCueSchema = z.object({
  id: z.string(),
  startTime: z.number().min(0),
  endTime: z.number().min(0),
  text: z.string().max(500),
  words: z.array(subtitleWordSchema).optional(),
  animationStyle: captionAnimationStyleSchema.optional(),
});

const subtitleStyleSchema = z.object({
  fontFamily: z.string(),
  fontSize: z.number().min(8).max(120),
  fontColor: z.string().regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/),
  fontWeight: z.enum(['normal', 'bold']),
  fontStyle: z.enum(['normal', 'italic']),
  backgroundColor: z.string().regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/),
  backgroundOpacity: z.number().min(0).max(1),
  outlineColor: z.string().regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/),
  outlineWidth: z.number().min(0).max(20),
  shadowColor: z.string().regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/),
  shadowBlur: z.number().min(0).max(50),
  position: z.number().min(0).max(100),
  alignment: z.enum(['left', 'center', 'right']),
  lineHeight: z.number().min(0.8).max(3),
  padding: z.number().min(0).max(50),
  highlightColor: z.string().regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/).optional(),
  upcomingColor: z.string().optional(),
});

export const sbpSchema = z.object({
  version: z.literal(1),

  metadata: z.object({
    name: z.string().max(200),
    createdAt: z.string(),
    updatedAt: z.string(),
    appVersion: z.string(),
    generatedBy: z.enum(['ui', 'api']),
    sourceVideoHash: z.string().optional(),
    sourceVideoFilename: z.string().optional(),
  }),

  video: z.object({
    filename: z.string(),
    duration: z.number().positive(),
    width: z.number().int().positive(),
    height: z.number().int().positive(),
    mimeType: z.string(),
    fileSize: z.number().optional(),
  }),

  cues: z.array(subtitleCueSchema).max(10000),

  style: subtitleStyleSchema,

  template: z
    .object({
      id: z.string(),
      name: z.string(),
    })
    .optional(),

  renderSettings: z
    .object({
      preset: z.enum(['fast', 'balanced', 'quality']).optional(),
      codec: z.string().optional(),
      crf: z.number().optional(),
    })
    .optional(),
});

export type SBPSchemaType = z.infer<typeof sbpSchema>;

export { subtitleCueSchema, subtitleStyleSchema };
