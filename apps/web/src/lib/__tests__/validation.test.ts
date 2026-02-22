import { describe, it, expect } from 'vitest';
import {
  validateMagicBytes,
  sanitizeSubtitleText,
  getTierLimits,
  validateFileSize,
} from '../api/validation';

describe('validateMagicBytes', () => {
  it('accepts valid MP4 (ftyp)', () => {
    const buf = new ArrayBuffer(16);
    const view = new Uint8Array(buf);
    // ftyp at offset 4
    view[4] = 0x66;
    view[5] = 0x74;
    view[6] = 0x79;
    view[7] = 0x70;

    expect(validateMagicBytes(buf, 'video/mp4')).toBe(true);
  });

  it('accepts valid WebM (EBML)', () => {
    const buf = new ArrayBuffer(16);
    const view = new Uint8Array(buf);
    view[0] = 0x1a;
    view[1] = 0x45;
    view[2] = 0xdf;
    view[3] = 0xa3;

    expect(validateMagicBytes(buf, 'video/webm')).toBe(true);
  });

  it('rejects invalid bytes', () => {
    const buf = new ArrayBuffer(16);
    expect(validateMagicBytes(buf, 'video/mp4')).toBe(false);
  });

  it('rejects unknown mime type', () => {
    const buf = new ArrayBuffer(16);
    expect(validateMagicBytes(buf, 'video/avi')).toBe(false);
  });
});

describe('sanitizeSubtitleText', () => {
  it('strips script tags', () => {
    expect(sanitizeSubtitleText('<script>alert(1)</script>Hello')).toBe('Hello');
  });

  it('strips HTML tags', () => {
    expect(sanitizeSubtitleText('<b>Bold</b> <i>Italic</i>')).toBe('Bold Italic');
  });

  it('truncates to 500 chars', () => {
    const long = 'a'.repeat(600);
    expect(sanitizeSubtitleText(long)).toHaveLength(500);
  });

  it('passes plain text through', () => {
    expect(sanitizeSubtitleText('Hello World')).toBe('Hello World');
  });
});

describe('getTierLimits', () => {
  it('returns FREE limits', () => {
    const limits = getTierLimits('FREE');
    expect(limits.maxFileSize).toBe(100 * 1024 * 1024);
    expect(limits.rendersPerDay).toBe(10);
  });

  it('returns PRO limits', () => {
    const limits = getTierLimits('PRO');
    expect(limits.maxFileSize).toBe(2 * 1024 * 1024 * 1024);
    expect(limits.rendersPerDay).toBe(Infinity);
  });
});

describe('validateFileSize', () => {
  it('accepts file within limit', () => {
    expect(validateFileSize(50 * 1024 * 1024, 'FREE')).toBe(true);
  });

  it('rejects file over limit', () => {
    expect(validateFileSize(200 * 1024 * 1024, 'FREE')).toBe(false);
  });

  it('accepts large file for PRO', () => {
    expect(validateFileSize(1 * 1024 * 1024 * 1024, 'PRO')).toBe(true);
  });
});
