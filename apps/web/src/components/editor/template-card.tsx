'use client';

import type { SubtitleTemplate } from '@subtitle-burner/types';

interface TemplateCardProps {
  template: SubtitleTemplate;
  isActive: boolean;
  onApply: (template: SubtitleTemplate) => void;
  onRemove?: (id: string) => void;
}

const CATEGORY_COLORS: Record<string, string> = {
  minimal: 'bg-zinc-700 text-zinc-200',
  cinematic: 'bg-amber-800 text-amber-200',
  bold: 'bg-red-800 text-red-200',
  modern: 'bg-blue-800 text-blue-200',
  custom: 'bg-purple-800 text-purple-200',
};

export function TemplateCard({ template, isActive, onApply, onRemove }: TemplateCardProps) {
  const { style } = template;

  return (
    <button
      onClick={() => onApply(template)}
      className={`group relative w-full rounded-lg border p-2 text-left transition-all ${
        isActive
          ? 'border-primary ring-2 ring-primary/40'
          : 'border-border hover:border-primary/50'
      }`}
    >
      {/* Preview area */}
      <div className="flex h-14 items-center justify-center overflow-hidden rounded bg-black/60 px-2">
        <span
          className="truncate text-center"
          style={{
            fontFamily: style.fontFamily,
            fontSize: `${Math.min(style.fontSize, 16)}px`,
            color: style.fontColor,
            fontWeight: style.fontWeight,
            fontStyle: style.fontStyle,
            textShadow:
              style.outlineWidth > 0
                ? `0 0 ${Math.min(style.outlineWidth, 4)}px ${style.outlineColor}`
                : undefined,
            backgroundColor:
              style.backgroundOpacity > 0
                ? `${style.backgroundColor}${Math.round(style.backgroundOpacity * 255)
                    .toString(16)
                    .padStart(2, '0')}`
                : 'transparent',
            padding: '2px 6px',
            borderRadius: '2px',
          }}
        >
          Sample Text
        </span>
      </div>

      {/* Info */}
      <div className="mt-1.5 flex items-center gap-1.5">
        <span className="flex-1 truncate text-xs font-medium">{template.name}</span>
        <span
          className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${
            CATEGORY_COLORS[template.category] ?? CATEGORY_COLORS.custom
          }`}
        >
          {template.category}
        </span>
      </div>

      {/* Remove button for custom templates */}
      {onRemove && !template.isBuiltIn && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRemove(template.id);
          }}
          className="absolute right-1 top-1 hidden rounded bg-destructive/80 px-1.5 py-0.5 text-[10px] text-white group-hover:block"
        >
          Remove
        </button>
      )}
    </button>
  );
}
