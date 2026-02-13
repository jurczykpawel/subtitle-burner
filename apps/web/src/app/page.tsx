'use client';

import { useEditorStore } from '@/store/editor-store';
import { VideoUploader } from '@/components/video/video-uploader';
import { VideoPlayer } from '@/components/video/video-player';
import { SubtitleList } from '@/components/editor/subtitle-list';
import { StylePanel } from '@/components/editor/style-panel';
import { Toolbar } from '@/components/editor/toolbar';
import { Timeline } from '@/components/timeline/timeline';

export default function EditorPage() {
  const videoUrl = useEditorStore((s) => s.videoUrl);

  if (!videoUrl) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <VideoUploader />
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col bg-background text-foreground">
      {/* Toolbar */}
      <Toolbar />

      {/* Main content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left: Video */}
        <div className="flex flex-1 flex-col">
          <div className="relative flex-1 bg-black">
            <VideoPlayer />
          </div>
        </div>

        {/* Right: Style panel + Subtitle list */}
        <div className="flex w-80 flex-col border-l">
          <StylePanel />
          <SubtitleList />
        </div>
      </div>

      {/* Bottom: Timeline */}
      <Timeline />
    </div>
  );
}
