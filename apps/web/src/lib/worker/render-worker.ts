import { createStorage } from '@subtitle-burner/storage';
import {
  getRenderJobInternal,
  updateRenderJobStatus,
  getSubtitlesByVideo,
  prisma,
} from '@subtitle-burner/database';
import { generateASS } from '@subtitle-burner/ffmpeg';
import type { SubtitleCue, SubtitleStyle } from '@subtitle-burner/types';
import { spawn } from 'child_process';
import { writeFile, readFile, unlink, mkdtemp } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';

export async function processRenderJob(jobId: string): Promise<void> {
  const job = await getRenderJobInternal(jobId);
  if (!job) throw new Error(`Job ${jobId} not found`);

  const storage = await createStorage();

  await updateRenderJobStatus(jobId, {
    status: 'PROCESSING',
    progress: 0,
    startedAt: new Date(),
  });

  const tempDir = await mkdtemp(join(tmpdir(), 'sb-render-'));
  const inputPath = join(tempDir, 'input.mp4');
  const assPath = join(tempDir, 'subtitles.ass');
  const outputPath = join(tempDir, 'output.mp4');

  try {
    // Fetch video record for actual file path
    const video = await prisma.video.findUnique({ where: { id: job.videoId } });
    if (!video) throw new Error(`Video ${job.videoId} not found`);

    // Download video from storage
    await updateRenderJobStatus(jobId, { progress: 5 });
    const videoData = await storage.download(video.filePath);
    await writeFile(inputPath, videoData);

    // Get subtitles
    const subtitle = await getSubtitlesByVideo(job.videoId, job.userId);
    const cues = (subtitle?.content as unknown as SubtitleCue[]) ?? [];
    const style = (job.style ?? subtitle?.style) as unknown as SubtitleStyle;

    if (cues.length === 0) {
      throw new Error('No subtitle cues found');
    }

    // Generate ASS file
    const assContent = generateASS(cues, style, video.width, video.height);
    await writeFile(assPath, assContent, 'utf-8');
    await updateRenderJobStatus(jobId, { progress: 10 });

    // Run FFmpeg
    const progress = await runFFmpeg(inputPath, assPath, outputPath, (p) => {
      updateRenderJobStatus(jobId, { progress: 10 + Math.round(p * 80) }).catch(() => {});
    });

    if (!progress) {
      throw new Error('FFmpeg failed');
    }

    // Upload output
    await updateRenderJobStatus(jobId, { progress: 95 });
    const outputBuffer = await readFile(outputPath);
    const outputKey = `renders/${jobId}/output.mp4`;
    await storage.upload(outputBuffer, outputKey);

    const outputUrl = await storage.getSignedUrl(outputKey, 86400); // 24h

    await updateRenderJobStatus(jobId, {
      status: 'COMPLETED',
      progress: 100,
      outputUrl,
      completedAt: new Date(),
    });
  } catch (err) {
    await updateRenderJobStatus(jobId, {
      status: 'FAILED',
      error: err instanceof Error ? err.message : 'Unknown error',
      completedAt: new Date(),
    });
    throw err;
  } finally {
    // Cleanup temp files
    await Promise.allSettled([
      unlink(inputPath),
      unlink(assPath),
      unlink(outputPath),
    ]);
  }
}

function runFFmpeg(
  inputPath: string,
  assPath: string,
  outputPath: string,
  onProgress: (fraction: number) => void,
): Promise<boolean> {
  return new Promise((resolve, reject) => {
    const args = [
      '-i', inputPath,
      '-vf', `ass=${assPath}`,
      '-c:v', 'libx264',
      '-preset', 'fast',
      '-crf', '23',
      '-c:a', 'copy',
      '-y',
      '-progress', 'pipe:1',
      outputPath,
    ];

    const proc = spawn('ffmpeg', args, { stdio: ['ignore', 'pipe', 'pipe'] });

    let duration = 0;
    let stderr = '';

    proc.stderr.on('data', (data: Buffer) => {
      stderr += data.toString();
      // Extract duration from stderr
      const match = stderr.match(/Duration: (\d+):(\d+):(\d+\.\d+)/);
      if (match && duration === 0) {
        duration = parseFloat(match[1]) * 3600 + parseFloat(match[2]) * 60 + parseFloat(match[3]);
      }
    });

    proc.stdout.on('data', (data: Buffer) => {
      const text = data.toString();
      const match = text.match(/out_time_us=(\d+)/);
      if (match && duration > 0) {
        const currentTime = parseInt(match[1]) / 1_000_000;
        onProgress(Math.min(currentTime / duration, 1));
      }
    });

    proc.on('close', (code) => {
      if (code === 0) resolve(true);
      else reject(new Error(`FFmpeg exited with code ${code}`));
    });

    proc.on('error', reject);
  });
}
