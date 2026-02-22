'use client';

import { useTemplateBridge } from '@/lib/bridges/use-template-bridge';
import { ALLOWED_FONT_FAMILIES, CAPTION_ANIMATION_STYLES, getAnimationStyleDisplayName } from '@subtitle-burner/core';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';

export function StylePanel() {
  const { style, updateStyle } = useTemplateBridge();

  return (
    <div className="border-b">
      <div className="border-b px-3 py-2">
        <h3 className="text-sm font-medium">Style</h3>
      </div>
      <ScrollArea className="h-64">
        <div className="space-y-3 p-3">
          {/* Font Family */}
          <div className="space-y-1">
            <Label className="text-xs">Font</Label>
            <Select value={style.fontFamily} onValueChange={(v) => updateStyle({ fontFamily: v })}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ALLOWED_FONT_FAMILIES.map((font) => (
                  <SelectItem key={font} value={font} style={{ fontFamily: font }}>
                    {font}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Font Size */}
          <div className="space-y-1">
            <Label className="text-xs">Size: {style.fontSize}px</Label>
            <Slider
              value={[style.fontSize]}
              onValueChange={([v]) => updateStyle({ fontSize: v })}
              min={8}
              max={120}
              step={1}
            />
          </div>

          {/* Colors */}
          <div className="flex gap-2">
            <div className="flex-1 space-y-1">
              <Label className="text-xs">Font Color</Label>
              <Input
                type="color"
                value={style.fontColor}
                onChange={(e) => updateStyle({ fontColor: e.target.value })}
                className="h-8 w-full cursor-pointer p-1"
              />
            </div>
            <div className="flex-1 space-y-1">
              <Label className="text-xs">Background</Label>
              <Input
                type="color"
                value={style.backgroundColor}
                onChange={(e) => updateStyle({ backgroundColor: e.target.value })}
                className="h-8 w-full cursor-pointer p-1"
              />
            </div>
          </div>

          {/* Background Opacity */}
          <div className="space-y-1">
            <Label className="text-xs">BG Opacity: {Math.round(style.backgroundOpacity * 100)}%</Label>
            <Slider
              value={[style.backgroundOpacity]}
              onValueChange={([v]) => updateStyle({ backgroundOpacity: v })}
              min={0}
              max={1}
              step={0.05}
            />
          </div>

          {/* Outline */}
          <div className="flex gap-2">
            <div className="flex-1 space-y-1">
              <Label className="text-xs">Outline</Label>
              <Input
                type="color"
                value={style.outlineColor}
                onChange={(e) => updateStyle({ outlineColor: e.target.value })}
                className="h-8 w-full cursor-pointer p-1"
              />
            </div>
            <div className="flex-1 space-y-1">
              <Label className="text-xs">Width: {style.outlineWidth}</Label>
              <Slider
                value={[style.outlineWidth]}
                onValueChange={([v]) => updateStyle({ outlineWidth: v })}
                min={0}
                max={20}
                step={1}
              />
            </div>
          </div>

          {/* Position */}
          <div className="space-y-1">
            <Label className="text-xs">Position: {style.position}%</Label>
            <Slider
              value={[style.position]}
              onValueChange={([v]) => updateStyle({ position: v })}
              min={0}
              max={100}
              step={1}
            />
          </div>

          {/* Alignment */}
          <div className="space-y-1">
            <Label className="text-xs">Alignment</Label>
            <div className="flex gap-1">
              {(['left', 'center', 'right'] as const).map((align) => (
                <button
                  key={align}
                  className={`flex-1 rounded border px-2 py-1 text-xs capitalize transition-colors ${
                    style.alignment === align
                      ? 'border-primary bg-primary/10'
                      : 'border-border hover:bg-muted'
                  }`}
                  onClick={() => updateStyle({ alignment: align })}
                >
                  {align}
                </button>
              ))}
            </div>
          </div>

          {/* Font Weight & Style */}
          <div className="flex gap-1">
            <button
              className={`flex-1 rounded border px-2 py-1 text-xs font-bold transition-colors ${
                style.fontWeight === 'bold'
                  ? 'border-primary bg-primary/10'
                  : 'border-border hover:bg-muted'
              }`}
              onClick={() =>
                updateStyle({ fontWeight: style.fontWeight === 'bold' ? 'normal' : 'bold' })
              }
            >
              B
            </button>
            <button
              className={`flex-1 rounded border px-2 py-1 text-xs italic transition-colors ${
                style.fontStyle === 'italic'
                  ? 'border-primary bg-primary/10'
                  : 'border-border hover:bg-muted'
              }`}
              onClick={() =>
                updateStyle({ fontStyle: style.fontStyle === 'italic' ? 'normal' : 'italic' })
              }
            >
              I
            </button>
          </div>

          {/* Animation Style */}
          <div className="space-y-1">
            <Label className="text-xs">Animation</Label>
            <Select
              value={style.highlightColor ? 'karaoke' : 'none'}
              onValueChange={() => {/* Animation set per-cue, not per-style */}}
              disabled
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="Per-cue setting" />
              </SelectTrigger>
              <SelectContent>
                {CAPTION_ANIMATION_STYLES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {getAnimationStyleDisplayName(s)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-[10px] text-muted-foreground">Animation style is set per subtitle cue</p>
          </div>

          {/* Karaoke Colors */}
          <div className="flex gap-2">
            <div className="flex-1 space-y-1">
              <Label className="text-xs">Highlight</Label>
              <Input
                type="color"
                value={style.highlightColor ?? '#ffff00'}
                onChange={(e) => updateStyle({ highlightColor: e.target.value })}
                className="h-8 w-full cursor-pointer p-1"
              />
            </div>
            <div className="flex-1 space-y-1">
              <Label className="text-xs">Upcoming</Label>
              <Input
                type="color"
                value={style.upcomingColor ?? '#808080'}
                onChange={(e) => updateStyle({ upcomingColor: e.target.value })}
                className="h-8 w-full cursor-pointer p-1"
              />
            </div>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
