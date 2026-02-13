'use client';

import { useEditorStore } from '@/store/editor-store';
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

const FONT_FAMILIES = [
  'Arial',
  'Helvetica',
  'Verdana',
  'Georgia',
  'Times New Roman',
  'Courier New',
  'Impact',
  'Comic Sans MS',
];

export function StylePanel() {
  const style = useEditorStore((s) => s.style);
  const setStyle = useEditorStore((s) => s.setStyle);

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
            <Select value={style.fontFamily} onValueChange={(v) => setStyle({ fontFamily: v })}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FONT_FAMILIES.map((font) => (
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
              onValueChange={([v]) => setStyle({ fontSize: v })}
              min={12}
              max={72}
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
                onChange={(e) => setStyle({ fontColor: e.target.value })}
                className="h-8 w-full cursor-pointer p-1"
              />
            </div>
            <div className="flex-1 space-y-1">
              <Label className="text-xs">Background</Label>
              <Input
                type="color"
                value={style.backgroundColor}
                onChange={(e) => setStyle({ backgroundColor: e.target.value })}
                className="h-8 w-full cursor-pointer p-1"
              />
            </div>
          </div>

          {/* Background Opacity */}
          <div className="space-y-1">
            <Label className="text-xs">BG Opacity: {Math.round(style.backgroundOpacity * 100)}%</Label>
            <Slider
              value={[style.backgroundOpacity]}
              onValueChange={([v]) => setStyle({ backgroundOpacity: v })}
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
                onChange={(e) => setStyle({ outlineColor: e.target.value })}
                className="h-8 w-full cursor-pointer p-1"
              />
            </div>
            <div className="flex-1 space-y-1">
              <Label className="text-xs">Width: {style.outlineWidth}</Label>
              <Slider
                value={[style.outlineWidth]}
                onValueChange={([v]) => setStyle({ outlineWidth: v })}
                min={0}
                max={10}
                step={1}
              />
            </div>
          </div>

          {/* Position */}
          <div className="space-y-1">
            <Label className="text-xs">Position: {style.position}%</Label>
            <Slider
              value={[style.position]}
              onValueChange={([v]) => setStyle({ position: v })}
              min={5}
              max={95}
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
                  onClick={() => setStyle({ alignment: align })}
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
                setStyle({ fontWeight: style.fontWeight === 'bold' ? 'normal' : 'bold' })
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
                setStyle({ fontStyle: style.fontStyle === 'italic' ? 'normal' : 'italic' })
              }
            >
              I
            </button>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
