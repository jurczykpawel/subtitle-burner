import { describe, it, expect } from 'vitest';
import {
  TemplateEngine,
  BUILT_IN_TEMPLATES,
  ALLOWED_FONT_FAMILIES,
  sanitizeStyle,
} from '../template-engine';
import { DEFAULT_SUBTITLE_STYLE } from '@subtitle-burner/types';
import type { SubtitleStyle, SubtitleTemplate } from '@subtitle-burner/types';

const engine = new TemplateEngine();

describe('sanitizeStyle', () => {
  it('returns valid style unchanged', () => {
    const style = sanitizeStyle(DEFAULT_SUBTITLE_STYLE);
    expect(style).toEqual(DEFAULT_SUBTITLE_STYLE);
  });

  it('falls back to defaults for missing properties', () => {
    const style = sanitizeStyle({});
    expect(style).toEqual(DEFAULT_SUBTITLE_STYLE);
  });

  it('rejects disallowed font families', () => {
    const style = sanitizeStyle({ fontFamily: 'Comic Sans MS' });
    expect(style.fontFamily).toBe(DEFAULT_SUBTITLE_STYLE.fontFamily);
  });

  it('accepts allowed font families', () => {
    for (const font of ALLOWED_FONT_FAMILIES) {
      const style = sanitizeStyle({ fontFamily: font });
      expect(style.fontFamily).toBe(font);
    }
  });

  it('rejects invalid hex colors', () => {
    const style = sanitizeStyle({ fontColor: 'not-a-color' });
    expect(style.fontColor).toBe(DEFAULT_SUBTITLE_STYLE.fontColor);
  });

  it('accepts valid hex colors (3, 6, 8 digit)', () => {
    expect(sanitizeStyle({ fontColor: '#FFF' }).fontColor).toBe('#FFF');
    expect(sanitizeStyle({ fontColor: '#FF00FF' }).fontColor).toBe('#FF00FF');
    expect(sanitizeStyle({ fontColor: '#FF00FF80' }).fontColor).toBe('#FF00FF80');
  });

  it('clamps fontSize within 8-120', () => {
    expect(sanitizeStyle({ fontSize: 3 }).fontSize).toBe(8);
    expect(sanitizeStyle({ fontSize: 200 }).fontSize).toBe(120);
    expect(sanitizeStyle({ fontSize: 50 }).fontSize).toBe(50);
  });

  it('clamps outlineWidth within 0-20', () => {
    expect(sanitizeStyle({ outlineWidth: -5 }).outlineWidth).toBe(0);
    expect(sanitizeStyle({ outlineWidth: 30 }).outlineWidth).toBe(20);
  });

  it('clamps shadowBlur within 0-50', () => {
    expect(sanitizeStyle({ shadowBlur: -1 }).shadowBlur).toBe(0);
    expect(sanitizeStyle({ shadowBlur: 100 }).shadowBlur).toBe(50);
  });

  it('clamps position within 0-100', () => {
    expect(sanitizeStyle({ position: -10 }).position).toBe(0);
    expect(sanitizeStyle({ position: 150 }).position).toBe(100);
  });

  it('clamps backgroundOpacity within 0-1', () => {
    expect(sanitizeStyle({ backgroundOpacity: -0.5 }).backgroundOpacity).toBe(0);
    expect(sanitizeStyle({ backgroundOpacity: 2 }).backgroundOpacity).toBe(1);
  });

  it('clamps lineHeight within 0.8-3', () => {
    expect(sanitizeStyle({ lineHeight: 0.3 }).lineHeight).toBe(0.8);
    expect(sanitizeStyle({ lineHeight: 5 }).lineHeight).toBe(3);
  });

  it('clamps padding within 0-50', () => {
    expect(sanitizeStyle({ padding: -5 }).padding).toBe(0);
    expect(sanitizeStyle({ padding: 100 }).padding).toBe(50);
  });

  it('only allows valid fontWeight values', () => {
    expect(sanitizeStyle({ fontWeight: 'bold' }).fontWeight).toBe('bold');
    expect(sanitizeStyle({ fontWeight: 'normal' }).fontWeight).toBe('normal');
    expect(sanitizeStyle({ fontWeight: 'bolder' as any }).fontWeight).toBe('normal');
  });

  it('only allows valid fontStyle values', () => {
    expect(sanitizeStyle({ fontStyle: 'italic' }).fontStyle).toBe('italic');
    expect(sanitizeStyle({ fontStyle: 'oblique' as any }).fontStyle).toBe('normal');
  });

  it('only allows valid alignment values', () => {
    expect(sanitizeStyle({ alignment: 'left' }).alignment).toBe('left');
    expect(sanitizeStyle({ alignment: 'center' }).alignment).toBe('center');
    expect(sanitizeStyle({ alignment: 'right' }).alignment).toBe('right');
    expect(sanitizeStyle({ alignment: 'justify' as any }).alignment).toBe(DEFAULT_SUBTITLE_STYLE.alignment);
  });

  // CSS injection prevention tests (security checklist)
  describe('CSS injection prevention', () => {
    it('rejects expression() in color values', () => {
      const style = sanitizeStyle({ fontColor: 'expression(alert(1))' });
      expect(style.fontColor).toBe(DEFAULT_SUBTITLE_STYLE.fontColor);
    });

    it('rejects url() in color values', () => {
      const style = sanitizeStyle({ fontColor: 'url(evil.com)' });
      expect(style.fontColor).toBe(DEFAULT_SUBTITLE_STYLE.fontColor);
    });

    it('rejects @import in values', () => {
      const style = sanitizeStyle({ fontColor: '@import "evil.css"' });
      expect(style.fontColor).toBe(DEFAULT_SUBTITLE_STYLE.fontColor);
    });

    it('rejects -moz-binding in values', () => {
      const style = sanitizeStyle({ fontColor: '-moz-binding:url()' });
      expect(style.fontColor).toBe(DEFAULT_SUBTITLE_STYLE.fontColor);
    });

    it('rejects behavior: in values', () => {
      const style = sanitizeStyle({ fontColor: 'behavior:url(evil.htc)' });
      expect(style.fontColor).toBe(DEFAULT_SUBTITLE_STYLE.fontColor);
    });

    it('rejects javascript: in values', () => {
      const style = sanitizeStyle({ fontColor: 'javascript:alert(1)' });
      expect(style.fontColor).toBe(DEFAULT_SUBTITLE_STYLE.fontColor);
    });

    it('rejects unicode escapes in values', () => {
      const style = sanitizeStyle({ fontColor: '\\u0065xpression(1)' });
      expect(style.fontColor).toBe(DEFAULT_SUBTITLE_STYLE.fontColor);
    });

    it('rejects semicolons in values', () => {
      const style = sanitizeStyle({ fontColor: '#FFF; background: red' });
      expect(style.fontColor).toBe(DEFAULT_SUBTITLE_STYLE.fontColor);
    });

    it('rejects curly braces in values', () => {
      const style = sanitizeStyle({ fontColor: '#FFF { color: red }' });
      expect(style.fontColor).toBe(DEFAULT_SUBTITLE_STYLE.fontColor);
    });
  });
});

describe('BUILT_IN_TEMPLATES', () => {
  it('has 8 built-in templates', () => {
    expect(BUILT_IN_TEMPLATES).toHaveLength(8);
  });

  it('all templates are marked as built-in and public', () => {
    for (const template of BUILT_IN_TEMPLATES) {
      expect(template.isBuiltIn).toBe(true);
      expect(template.isPublic).toBe(true);
    }
  });

  it('all templates have unique ids', () => {
    const ids = BUILT_IN_TEMPLATES.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('all templates have valid styles', () => {
    for (const template of BUILT_IN_TEMPLATES) {
      const sanitized = sanitizeStyle(template.style);
      // The sanitized style should match the template style
      expect(sanitized.fontFamily).toBe(template.style.fontFamily);
      expect(sanitized.fontSize).toBe(template.style.fontSize);
    }
  });
});

describe('TemplateEngine', () => {
  describe('getBuiltInTemplates', () => {
    it('returns the built-in templates', () => {
      expect(engine.getBuiltInTemplates()).toBe(BUILT_IN_TEMPLATES);
    });
  });

  describe('createTemplate', () => {
    it('creates a template with sanitized style', () => {
      const template = engine.createTemplate('My Template', { fontSize: 30 });
      expect(template.name).toBe('My Template');
      expect(template.style.fontSize).toBe(30);
      expect(template.isBuiltIn).toBe(false);
      expect(template.isPublic).toBe(false);
      expect(template.id).toBeTruthy();
    });

    it('truncates name to 100 characters', () => {
      const longName = 'A'.repeat(200);
      const template = engine.createTemplate(longName, {});
      expect(template.name).toHaveLength(100);
    });

    it('truncates description to 500 characters', () => {
      const longDesc = 'B'.repeat(600);
      const template = engine.createTemplate('Test', {}, { description: longDesc });
      expect(template.description).toHaveLength(500);
    });

    it('applies category from options', () => {
      const template = engine.createTemplate('Test', {}, { category: 'cinematic' });
      expect(template.category).toBe('cinematic');
    });

    it('defaults to custom category', () => {
      const template = engine.createTemplate('Test', {});
      expect(template.category).toBe('custom');
    });
  });

  describe('updateTemplate', () => {
    it('updates a custom template', () => {
      const template = engine.createTemplate('Old', { fontSize: 20 });
      const templates = [template];
      const result = engine.updateTemplate(templates, template.id, { name: 'New' });
      expect(result[0].name).toBe('New');
    });

    it('does not modify built-in templates', () => {
      const result = engine.updateTemplate(
        [...BUILT_IN_TEMPLATES],
        BUILT_IN_TEMPLATES[0].id,
        { name: 'Hacked' }
      );
      expect(result[0].name).toBe(BUILT_IN_TEMPLATES[0].name);
    });

    it('sanitizes style overrides on update', () => {
      const template = engine.createTemplate('Test', { fontSize: 20 });
      const result = engine.updateTemplate([template], template.id, {
        style: { fontSize: 999 },
      });
      expect(result[0].style.fontSize).toBe(120); // clamped
    });
  });

  describe('removeTemplate', () => {
    it('removes a custom template', () => {
      const template = engine.createTemplate('Test', {});
      const result = engine.removeTemplate([template], template.id);
      expect(result).toHaveLength(0);
    });

    it('does not remove built-in templates', () => {
      const result = engine.removeTemplate([...BUILT_IN_TEMPLATES], BUILT_IN_TEMPLATES[0].id);
      expect(result).toHaveLength(BUILT_IN_TEMPLATES.length);
    });
  });

  describe('applyTemplate', () => {
    it('returns sanitized style from template', () => {
      const template = BUILT_IN_TEMPLATES[0];
      const style = engine.applyTemplate(template);
      expect(style.fontFamily).toBe(template.style.fontFamily);
    });
  });

  describe('mergeStyleOverrides', () => {
    it('merges overrides into base style', () => {
      const result = engine.mergeStyleOverrides(DEFAULT_SUBTITLE_STYLE, { fontSize: 48 });
      expect(result.fontSize).toBe(48);
      expect(result.fontFamily).toBe(DEFAULT_SUBTITLE_STYLE.fontFamily);
    });
  });

  describe('getTemplateById', () => {
    it('finds template in provided list', () => {
      const template = engine.createTemplate('Custom', {});
      expect(engine.getTemplateById([template], template.id)?.name).toBe('Custom');
    });

    it('finds built-in template when not in list', () => {
      const result = engine.getTemplateById([], BUILT_IN_TEMPLATES[0].id);
      expect(result?.id).toBe(BUILT_IN_TEMPLATES[0].id);
    });

    it('returns undefined for unknown id', () => {
      expect(engine.getTemplateById([], 'nonexistent')).toBeUndefined();
    });
  });
});
