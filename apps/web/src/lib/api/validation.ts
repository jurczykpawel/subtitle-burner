// Magic bytes signatures for video formats
const SIGNATURES: Record<string, { offset: number; bytes: number[] }[]> = {
  'video/mp4': [
    { offset: 4, bytes: [0x66, 0x74, 0x79, 0x70] }, // ftyp
  ],
  'video/webm': [
    { offset: 0, bytes: [0x1a, 0x45, 0xdf, 0xa3] }, // EBML
  ],
  'video/quicktime': [
    { offset: 4, bytes: [0x66, 0x74, 0x79, 0x70] }, // ftyp (same as mp4)
    { offset: 4, bytes: [0x6d, 0x6f, 0x6f, 0x76] }, // moov
  ],
  'video/x-matroska': [
    { offset: 0, bytes: [0x1a, 0x45, 0xdf, 0xa3] }, // EBML (same as webm)
  ],
};

export function validateMagicBytes(
  buffer: ArrayBuffer,
  mimeType: string
): boolean {
  const view = new Uint8Array(buffer);
  const sigs = SIGNATURES[mimeType];
  if (!sigs) return false;

  return sigs.some((sig) =>
    sig.bytes.every((byte, i) => view[sig.offset + i] === byte)
  );
}

export function sanitizeSubtitleText(text: string): string {
  return text
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<[^>]*>/g, '')
    .slice(0, 500);
}

const TIER_LIMITS = {
  FREE: { maxFileSize: 100 * 1024 * 1024, maxDuration: 300, rendersPerDay: 10 },
  PRO: { maxFileSize: 2 * 1024 * 1024 * 1024, maxDuration: 1800, rendersPerDay: Infinity },
  ENTERPRISE: { maxFileSize: 10 * 1024 * 1024 * 1024, maxDuration: Infinity, rendersPerDay: Infinity },
} as const;

export function getTierLimits(tier: 'FREE' | 'PRO' | 'ENTERPRISE') {
  return TIER_LIMITS[tier];
}

export function validateFileSize(size: number, tier: 'FREE' | 'PRO' | 'ENTERPRISE'): boolean {
  return size <= TIER_LIMITS[tier].maxFileSize;
}
