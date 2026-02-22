'use client';

import { useSubtitleBridge } from '@/lib/bridges/use-subtitle-bridge';
import {
  CAPTION_ANIMATION_STYLES,
  getAnimationStyleDisplayName,
} from '@subtitle-burner/core';
import type { CaptionAnimationStyle } from '@subtitle-burner/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export function SubtitleList() {
  const {
    sortedCues,
    selectedCueId,
    selectCue,
    updateCue,
    removeCue,
  } = useSubtitleBridge();

  const formatTime = (s: number) => {
    const min = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    const ms = Math.floor((s % 1) * 100);
    return `${min}:${String(sec).padStart(2, '0')}.${String(ms).padStart(2, '0')}`;
  };

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div className="border-b px-3 py-2">
        <h3 className="text-sm font-medium">Subtitles ({sortedCues.length})</h3>
      </div>
      <ScrollArea className="flex-1">
        <div className="space-y-1 p-2">
          {sortedCues.map((cue) => (
            <div
              key={cue.id}
              className={`cursor-pointer rounded-md border p-2 text-sm transition-colors ${
                selectedCueId === cue.id
                  ? 'border-primary bg-primary/5'
                  : 'border-transparent hover:bg-muted'
              }`}
              onClick={() => selectCue(cue.id)}
            >
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>
                  {formatTime(cue.startTime)} → {formatTime(cue.endTime)}
                </span>
                <div className="flex items-center gap-1">
                  {cue.words && cue.words.length > 0 && (
                    <span className="rounded bg-muted px-1 py-0.5 text-[10px]">
                      {cue.words.length}w
                    </span>
                  )}
                  {cue.animationStyle && cue.animationStyle !== 'none' && (
                    <span className="rounded bg-primary/10 px-1 py-0.5 text-[10px] text-primary">
                      {getAnimationStyleDisplayName(cue.animationStyle)}
                    </span>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-5 w-5 p-0 text-muted-foreground hover:text-destructive"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeCue(cue.id);
                    }}
                  >
                    ×
                  </Button>
                </div>
              </div>

              {selectedCueId === cue.id ? (
                <div className="mt-1 space-y-1">
                  <textarea
                    className="w-full resize-none rounded border bg-background p-1 text-sm"
                    rows={2}
                    value={cue.text}
                    onChange={(e) => updateCue(cue.id, { text: e.target.value })}
                    onClick={(e) => e.stopPropagation()}
                  />
                  <div className="flex gap-1">
                    <Input
                      type="number"
                      step="0.1"
                      className="h-6 text-xs"
                      value={cue.startTime.toFixed(1)}
                      onChange={(e) =>
                        updateCue(cue.id, { startTime: parseFloat(e.target.value) || 0 })
                      }
                      onClick={(e) => e.stopPropagation()}
                    />
                    <Input
                      type="number"
                      step="0.1"
                      className="h-6 text-xs"
                      value={cue.endTime.toFixed(1)}
                      onChange={(e) =>
                        updateCue(cue.id, { endTime: parseFloat(e.target.value) || 0 })
                      }
                      onClick={(e) => e.stopPropagation()}
                    />
                  </div>
                  <div onClick={(e) => e.stopPropagation()}>
                    <Select
                      value={cue.animationStyle ?? 'none'}
                      onValueChange={(v) =>
                        updateCue(cue.id, { animationStyle: v as CaptionAnimationStyle })
                      }
                    >
                      <SelectTrigger className="h-6 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {CAPTION_ANIMATION_STYLES.map((style) => (
                          <SelectItem key={style} value={style}>
                            {getAnimationStyleDisplayName(style)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              ) : (
                <p className="mt-1 truncate">{cue.text}</p>
              )}
            </div>
          ))}

          {sortedCues.length === 0 && (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No subtitles yet. Click &quot;+ Add Subtitle&quot; or import an SRT file.
            </p>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
