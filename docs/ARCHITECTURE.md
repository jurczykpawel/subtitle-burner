# Architecture

## System Overview

```
┌─────────────┐     ┌──────────┐     ┌──────────┐
│   Browser    │────▶│  Next.js  │────▶│  Prisma   │──▶ PostgreSQL
│ (FFmpeg.wasm)│     │  App      │     │  ORM      │
└─────────────┘     └────┬─────┘     └──────────┘
                         │
                    ┌────▼─────┐
                    │  Queue   │
                    │ Adapter  │
                    └────┬─────┘
                ┌────────┼────────┐
                ▼                 ▼
        ┌──────────┐     ┌──────────┐
        │  Inngest  │     │  BullMQ  │
        │  (Cloud)  │     │  (VPS)   │
        └────┬─────┘     └────┬─────┘
             └────────┬───────┘
                 ┌────▼─────┐
                 │  FFmpeg   │
                 │  Worker   │
                 └──────────┘
```

## Monorepo Structure

```
subtitle-burner/
├── apps/web/              # Next.js application
│   ├── src/
│   │   ├── app/           # App Router pages & API routes
│   │   ├── components/    # React components (editor, timeline, video, UI)
│   │   ├── lib/           # Auth, API helpers, bridges, hooks
│   │   └── store/         # Zustand state management (4 stores)
│   ├── worker/            # BullMQ worker (standalone process)
│   └── e2e/               # Playwright tests
├── packages/
│   ├── types/             # Shared TypeScript interfaces
│   ├── core/              # Engines (subtitle, template, render, playback), action system, serializer
│   ├── ffmpeg/            # SRT parser, ASS generator, time utils
│   ├── database/          # Prisma schema + query helpers
│   ├── queue/             # Queue adapters (Inngest, BullMQ)
│   ├── storage/           # Storage adapters (Supabase, MinIO)
│   └── transcription/     # Audio extraction, Whisper transcription, word grouping
├── docker/                # Dockerfiles + nginx config
├── scripts/               # Setup scripts
└── docs/                  # Documentation
```

## Core Engines (`packages/core`)

Pure-function engines that accept state and return new state (no side effects):

| Engine | Description |
|--------|-------------|
| `SubtitleEngine` | CRUD for cues: add, update, remove, split, merge, reorder. Preserves per-word timing and animation style. |
| `TemplateEngine` | 8 built-in templates (Classic, Cinematic, Bold Box, Modern, Minimal Top, Neon, Yellow Box, Typewriter) + custom template CRUD. Style sanitization. |
| `RenderEngine` | Preset management (speed/balanced/quality), resolution helpers, progress tracking. |
| `PlaybackController` | Play/pause, seek, playback rate, active cue detection. |
| `CaptionAnimationRenderer` | Per-word animation: none, word-highlight, word-by-word, karaoke, bounce, typewriter. |
| `ActionSystem` | Generic undo/redo with inverse action pairs. Max 50 history entries. |
| `ProjectSerializer` | SBP (Subtitle Burner Project) format: Zod-validated JSON serialization of full project state. |

## State Management

### Zustand Stores (`apps/web/src/store/`)

| Store | Responsibility |
|-------|---------------|
| `project-store` | Cues, style, metadata, action system (undo/redo). Persisted per project. |
| `engine-store` | Render state, playback state, transcription status. Transient. |
| `timeline-store` | Zoom, scroll, snap, selection, drag state. Transient. |
| `ui-store` | Sidebar tab, sidebar width, timeline height. Persisted to localStorage. |

### Bridge Pattern (`apps/web/src/lib/bridges/`)

Bridges are React hooks that combine multiple stores and engines into focused APIs for components:

| Bridge | Connects |
|--------|----------|
| `useSubtitleBridge` | project-store + SubtitleEngine → cue CRUD, selection |
| `useStyleBridge` | project-store + TemplateEngine → style getters/setters |
| `useTimelineBridge` | timeline-store + project-store + engine-store → zoom, markers, drag |
| `usePlaybackBridge` | engine-store + PlaybackController → play/pause, seek, rate |
| `useRenderBridge` | engine-store + RenderEngine → render presets, progress |
| `useTemplateBridge` | project-store + TemplateEngine → template gallery, apply/create/remove |
| `useKeyboardBridge` | Registers global keyboard shortcuts (Space, arrows, Delete) |
| `useTranscriptionBridge` | engine-store + transcription package → audio extraction, Whisper, word grouping |

## Authentication

Auth is handled by **Auth.js (NextAuth v5)** with a Prisma adapter for database-backed sessions.

| Feature | Implementation |
|---------|---------------|
| Email + password | Credentials provider + bcrypt hashing |
| Magic links | Nodemailer provider (optional, requires SMTP) |
| Session strategy | JWT (works on serverless and VPS) |
| User storage | Prisma (PostgreSQL) via `@auth/prisma-adapter` |
| Middleware | `auth()` wrapper protects `/dashboard/*` and `/api/*` |

Config: `apps/web/src/lib/auth.ts`
Route handler: `apps/web/src/app/api/auth/[...nextauth]/route.ts`
Registration: `apps/web/src/app/api/auth/register/route.ts`

## Adapter Pattern

The project auto-detects deployment mode based on environment variables:

- **Cloud mode** (`NEXT_PUBLIC_SUPABASE_URL` + `INNGEST_EVENT_KEY` set): Uses Supabase for storage, Inngest for queue.
- **VPS mode** (default): Uses MinIO for storage, BullMQ + Redis for queue.

`detectDeploymentMode()` in `packages/queue/src/index.ts` drives this decision.

Auth and database work the same in both modes — Auth.js + Prisma on PostgreSQL.

## Database Schema

| Table | Description |
|-------|-------------|
| User | id, email, password, name, tier (FREE/PRO/ENTERPRISE), timestamps |
| Account | Auth.js OAuth accounts (provider, tokens) |
| Session | Auth.js sessions (used with database strategy) |
| VerificationToken | Magic link tokens |
| Video | id, userId, filename, filePath, fileSize, duration, width, height, mimeType |
| Subtitle | id, videoId, content (JSON cues), style (JSON style) |
| RenderJob | id, userId, videoId, status, progress, style, outputUrl, error, timestamps |
| Template | id, userId, name, description, category, style (JSON), isPublic, timestamps |
| ApiKey | id, userId, name, keyHash, keyPrefix, scopes, isActive, lastUsedAt, expiresAt, usageCount |
| Project | id, userId, name, data (JSON SBP format), timestamps |

All user-facing queries filter by `userId` for row-level security at the application level.

## API Routes

### Internal Routes

| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| GET/POST | `/api/auth/[...nextauth]` | No | Auth.js handlers (login, callback, session) |
| POST | `/api/auth/register` | No | Create account (email + password) |
| GET | `/api/health` | No | Health check (DB status, deployment mode) |
| GET | `/api/user` | Yes | Current user profile + today's render count |
| GET | `/api/videos` | Yes | List user's videos |
| POST | `/api/videos` | Yes | Upload video (multipart form) |
| GET | `/api/videos/[id]` | Yes | Get video details + signed URL |
| DELETE | `/api/videos/[id]` | Yes | Delete video from storage + DB |
| GET | `/api/videos/[id]/subtitles` | Yes | Get subtitles for video |
| POST | `/api/videos/[id]/subtitles` | Yes | Save subtitles (Zod validated) |
| POST | `/api/render` | Yes | Create render job (Zod validated) |
| GET | `/api/render/[id]` | Yes | Job status + progress |
| GET | `/api/render/[id]/download` | Yes | Redirect to signed download URL |

### Public API v1

All v1 routes support both session auth and API key auth (`Authorization: Bearer sb_...`).

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/v1/health` | API health check |
| POST | `/api/v1/render` | Create render job (Zod validated, supports per-word timing + animation style) |
| GET | `/api/v1/render/[id]` | Render job status + progress |
| GET | `/api/v1/render/[id]/download` | Signed download URL |
| GET | `/api/v1/render/[id]/project` | Export project as SBP JSON |
| GET | `/api/v1/projects` | List user projects |
| POST | `/api/v1/projects/[id]/export` | Export project |
| POST | `/api/v1/projects/[id]/import` | Import project from SBP JSON |
| GET | `/api/v1/templates` | List templates |
| POST | `/api/v1/templates` | Create custom template |
| GET | `/api/v1/templates/[id]` | Get template |
| PUT | `/api/v1/templates/[id]` | Update template |
| DELETE | `/api/v1/templates/[id]` | Delete template |
| GET | `/api/v1/templates/gallery` | Public template gallery |
| GET | `/api/v1/api-keys` | List user's API keys |
| POST | `/api/v1/api-keys` | Create API key |
| DELETE | `/api/v1/api-keys/[id]` | Revoke API key |
| POST | `/api/v1/api-keys/[id]/rotate` | Rotate API key |

## Security

- **Input validation**: Zod schemas on all POST/PUT endpoints
- **File validation**: Magic bytes check on video uploads
- **XSS prevention**: Subtitle text sanitized (HTML/script tags stripped)
- **Rate limiting**: In-memory rate limiter on upload endpoint; nginx rate limiting in production
- **Row-level security**: All DB queries scoped to authenticated user's ID
- **API key scoping**: Per-key scopes (render:create, render:read, templates:*, projects:*, api-keys:*)
- **Security headers**: COOP/COEP (for SharedArrayBuffer), X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy, HSTS
- **Password hashing**: bcrypt with cost factor 12

## Client-Side Rendering

Uses `@ffmpeg/ffmpeg` (FFmpeg.wasm) loaded from CDN. Requires `Cross-Origin-Opener-Policy: same-origin` and `Cross-Origin-Embedder-Policy: require-corp` headers for SharedArrayBuffer.

Flow:
1. User clicks Render → Browser
2. FFmpeg.wasm loads in the browser
3. Video file + generated ASS subtitles written to virtual filesystem
4. FFmpeg burns subtitles with `ass` video filter
5. Output downloaded as MP4

## Server-Side Rendering

1. Client POSTs to `/api/render` with `videoId`
2. Job is created in DB (status: QUEUED) and enqueued (Inngest event or BullMQ job)
3. Worker picks up job, downloads video from storage, generates ASS subtitles
4. FFmpeg process burns subtitles (`-vf ass=subtitles.ass`)
5. Output uploaded to storage, job status updated to COMPLETED
6. Client polls `/api/render/[id]` for progress updates
7. Client fetches `/api/render/[id]/download` to get signed download URL

## Transcription

In-browser audio transcription via Hugging Face Transformers.js (Whisper):

1. Audio extracted from video element via Web Audio API (`extractAudioFromElement`)
2. Whisper model runs in browser via `@huggingface/transformers`
3. Word-level timestamps grouped into cues (`groupWordsIntoCues` — configurable max words, max duration, punctuation break)
4. Cues set in project store with per-word timing data

## Testing

350 tests across 20+ test files:

| Package | Tests | What's covered |
|---------|-------|---------------|
| `packages/core` | 199 | Subtitle engine, template engine, render engine, playback controller, action system, serializer, animation renderer |
| `packages/ffmpeg` | 33 | SRT parsing, ASS generation (including karaoke), time utils |
| `packages/database` | 12 | All query helpers (user, video, subtitle, render job, template, API key, project) |
| `packages/transcription` | 10 | Word grouping (splitting, punctuation, timing, animation style) |
| `apps/web` (unit) | 96 | API routes, auth helper, schemas, validation, rate limiting, editor store, auth provider |
| `apps/web` (e2e) | 2 files | Landing page, auth flow |

Run all tests: `bun run test`
