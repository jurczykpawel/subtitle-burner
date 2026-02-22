'use client';

import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useProjectStore } from '@/store/project-store';
import { useProjectBridge } from '@/lib/bridges/use-project-bridge';
import { useUIStore } from '@/store/ui-store';
import { VideoUploader } from '@/components/video/video-uploader';
import { VideoPlayer } from '@/components/video/video-player';
import { SubtitleList } from '@/components/editor/subtitle-list';
import { StylePanel } from '@/components/editor/style-panel';
import { TemplateGallery } from '@/components/editor/template-gallery';
import { Toolbar } from '@/components/editor/toolbar';
import { Timeline } from '@/components/timeline/timeline';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function ProjectEditorPage() {
  const params = useParams<{ id: string }>();
  const videoUrl = useProjectStore((s) => s.videoUrl);
  const { loadProject } = useProjectBridge(params.id);
  const [loading, setLoading] = useState(true);

  const sidebarTab = useUIStore((s) => s.sidebarTab);
  const setSidebarTab = useUIStore((s) => s.setSidebarTab);

  useEffect(() => {
    loadProject(params.id).finally(() => setLoading(false));
  }, [params.id, loadProject]);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-muted-foreground">Loading project...</p>
      </div>
    );
  }

  if (!videoUrl) {
    return (
      <div className="flex h-full items-center justify-center">
        <VideoUploader />
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <Toolbar />
      <div className="flex flex-1 overflow-hidden">
        {/* Video preview */}
        <div className="flex flex-1 flex-col">
          <div className="relative flex-1 bg-black">
            <VideoPlayer />
          </div>
        </div>

        {/* Right sidebar with tabs */}
        <div className="flex w-80 flex-col border-l">
          <Tabs
            value={sidebarTab}
            onValueChange={(v) => setSidebarTab(v as 'templates' | 'style' | 'subtitles')}
            className="flex h-full flex-col"
          >
            <TabsList className="mx-2 mt-2 grid w-auto grid-cols-3">
              <TabsTrigger value="templates" className="text-xs">
                Templates
              </TabsTrigger>
              <TabsTrigger value="style" className="text-xs">
                Style
              </TabsTrigger>
              <TabsTrigger value="subtitles" className="text-xs">
                Subtitles
              </TabsTrigger>
            </TabsList>

            <TabsContent value="templates" className="mt-0 flex-1 overflow-hidden">
              <TemplateGallery />
            </TabsContent>
            <TabsContent value="style" className="mt-0 flex-1 overflow-auto">
              <StylePanel />
            </TabsContent>
            <TabsContent value="subtitles" className="mt-0 flex-1 overflow-hidden">
              <SubtitleList />
            </TabsContent>
          </Tabs>
        </div>
      </div>
      <Timeline />
    </div>
  );
}
