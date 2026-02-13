'use client';

import { useEditorStore } from '@/store/editor-store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';

export function SubtitleList() {
  const cues = useEditorStore((s) => s.cues);
  const selectedCueId = useEditorStore((s) => s.selectedCueId);
  const setSelectedCueId = useEditorStore((s) => s.setSelectedCueId);
  const updateCue = useEditorStore((s) => s.updateCue);
  const removeCue = useEditorStore((s) => s.removeCue);
  const setCurrentTime = useEditorStore((s) => s.setCurrentTime);

  const sorted = [...cues].sort((a, b) => a.startTime - b.startTime);

  const formatTime = (s: number) => {
    const min = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    const ms = Math.floor((s % 1) * 100);
    return `${min}:${String(sec).padStart(2, '0')}.${String(ms).padStart(2, '0')}`;
  };

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div className="border-b px-3 py-2">
        <h3 className="text-sm font-medium">Subtitles ({cues.length})</h3>
      </div>
      <ScrollArea className="flex-1">
        <div className="space-y-1 p-2">
          {sorted.map((cue) => (
            <div
              key={cue.id}
              className={`cursor-pointer rounded-md border p-2 text-sm transition-colors ${
                selectedCueId === cue.id
                  ? 'border-primary bg-primary/5'
                  : 'border-transparent hover:bg-muted'
              }`}
              onClick={() => {
                setSelectedCueId(cue.id);
                setCurrentTime(cue.startTime);
              }}
            >
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>
                  {formatTime(cue.startTime)} → {formatTime(cue.endTime)}
                </span>
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
                </div>
              ) : (
                <p className="mt-1 truncate">{cue.text}</p>
              )}
            </div>
          ))}

          {cues.length === 0 && (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No subtitles yet. Click &quot;+ Add Subtitle&quot; or import an SRT file.
            </p>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
