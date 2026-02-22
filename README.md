<div align="center">

<!-- Replace with your actual logo/banner when available -->
<img src="docs/assets/banner-placeholder.svg" alt="Subtitle Burner" width="600" />

# Subtitle Burner

**Burn styled subtitles into any video -- in the browser or on your server. Open source, self-hostable, no vendor lock-in.**

[![CI](https://github.com/jurczykpawel/subtitle-burner/actions/workflows/ci.yml/badge.svg)](https://github.com/jurczykpawel/subtitle-burner/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Status: Beta](https://img.shields.io/badge/Status-Beta-orange.svg)]()
[![Tests: 414](https://img.shields.io/badge/Tests-414_passing-brightgreen.svg)]()
[![PRs Welcome](https://img.shields.io/badge/PRs-Welcome-brightgreen.svg)](docs/CONTRIBUTING.md)

[Live Demo](https://demo.subtitleburner.com) | [Documentation](docs/) | [API Reference](#public-api-v1) | [Community](https://github.com/jurczykpawel/subtitle-burner/discussions) | [Report Bug](https://github.com/jurczykpawel/subtitle-burner/issues)

</div>

---

## Why Subtitle Burner?

Most subtitle tools are either closed-source SaaS products with usage limits, or command-line FFmpeg scripts that require manual timing. Subtitle Burner fills the gap:

- **No upload required** -- client-side rendering with FFmpeg.wasm keeps your video on your machine
- **Visual timeline editor** -- drag, resize, and fine-tune subtitle timing instead of hand-editing SRT timestamps
- **Word-level animations** -- 6 caption animation styles (karaoke, bounce, typewriter, and more) that go beyond static text
- **Auto-transcription built in** -- Whisper runs directly in the browser, no external API keys needed
- **Fully self-hostable** -- deploy on your own VPS with Docker or use Vercel + Supabase. Your data, your infrastructure

### What It Does

Subtitle Burner is a web application for adding styled, animated subtitles to video files. You upload (or drop) a video, create or import subtitles, style them with templates and animations, and render the final video with subtitles permanently embedded ("burned in"). It supports both browser-based and server-based rendering.

### Who It's For

- **Content creators** who need subtitled videos for social media (YouTube, TikTok, Instagram Reels)
- **Video editors** who want a visual subtitle workflow without heavyweight desktop software
- **Developers** who need programmatic subtitle rendering via a REST API
- **Teams** who want a self-hosted solution with no per-video fees

### Alternative To

Subtitle Burner can replace tools like **Kapwing**, **Descript** (subtitle features), **VEED.io**, or manual **FFmpeg** command-line workflows -- without subscription fees or upload limits.

---

## Features

### Subtitle Editing

- **Visual timeline editor** -- drag and resize subtitle blocks with snap-to-grid
- **8 built-in templates** -- Classic, Cinematic, Bold Box, Modern, Minimal Top, Neon, Yellow Box, Typewriter
- **Full style control** -- font family, size, color, outline, shadow, position, alignment
- **SRT import/export** -- load existing subtitle files, edit visually, export back to SRT
- **Project files (.sbp)** -- save and restore full project state as JSON
- **Undo/redo** -- action system with up to 50 history entries

### Caption Animations

- **6 animation styles** -- word-highlight, word-by-word, karaoke, bounce, typewriter, or no animation
- **Per-word timing** -- each word can have individual start/end timestamps for precise animation control

### Auto-Transcription

- **In-browser Whisper** -- powered by Hugging Face Transformers.js, runs entirely client-side
- **Word-level timestamps** -- automatic word grouping with configurable max words, max duration, and punctuation breaks
- **No API keys required** -- the model loads and runs in your browser

### Rendering

- **Client-side rendering** -- FFmpeg.wasm burns subtitles directly in the browser. No upload, no server needed
- **Server-side rendering** -- queue jobs to a server with native FFmpeg for faster processing of longer videos
- **3 render presets** -- speed, balanced, and quality modes with configurable resolution

### Public API v1

- **REST API** with API key authentication (`Authorization: Bearer sb_...`)
- **21 endpoints** -- render jobs, project management, template CRUD, API key management
- **Zod-validated** requests and responses

### Self-Hosting

- **Two deployment modes** -- VPS (Docker with PostgreSQL, Redis, MinIO) or Cloud (Vercel + Supabase + Inngest)
- **Automatic detection** -- the app auto-detects deployment mode from environment variables
- **No vendor lock-in** -- swap storage or queue backends without changing application code

---

## Quick Start

### Prerequisites

| Requirement | Version |
|-------------|---------|
| [Bun](https://bun.sh/) | 1.3+ |
| [Node.js](https://nodejs.org/) | 20+ |
| [PostgreSQL](https://www.postgresql.org/) | 15+ (or use Docker) |
| OS | macOS, Linux, or Windows (WSL) |

### Run Locally (Development)

**1. Clone and install**

```bash
git clone https://github.com/jurczykpawel/subtitle-burner.git
cd subtitle-burner
bun install
```

**2. Set up environment**

```bash
cp .env.example .env
```

Edit `.env` with at minimum these two values:

```env
AUTH_SECRET=your-random-secret-here        # Generate with: openssl rand -base64 32
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/subtitle_burner
```

**3. Start the database**

```bash
docker run -d --name sb-postgres -p 5432:5432 \
  -e POSTGRES_USER=postgres -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=subtitle_burner postgres:16-alpine
```

**4. Initialize database schema**

```bash
cd packages/database
./node_modules/.bin/prisma generate
./node_modules/.bin/prisma db push
cd ../..
```

**5. Start the dev server**

```bash
bun run dev
```

Open [http://localhost:3000](http://localhost:3000) and create an account at [http://localhost:3000/signup](http://localhost:3000/signup).

### Build for Production

```bash
bun run build
```

For full deployment instructions:

- **VPS (Docker)**: See [Self-host guide](docs/DEPLOYMENT_VPS.md) -- PostgreSQL, Redis, MinIO, all in Docker
- **Cloud (Vercel)**: See [Vercel + Supabase guide](docs/DEPLOYMENT_CLOUD.md) -- Vercel for app, Supabase for storage, Inngest for queue

---

## Tech Stack

| Layer | Technology | Role |
|-------|-----------|------|
| **Framework** | [Next.js 16](https://nextjs.org/) (App Router) | Server-side rendering, API routes, file-based routing |
| **Language** | [TypeScript](https://www.typescriptlang.org/) | Type safety across all packages |
| **UI** | [React 19](https://react.dev/) | Component framework |
| **Styling** | [Tailwind CSS](https://tailwindcss.com/) + [shadcn/ui](https://ui.shadcn.com/) | Utility-first CSS with accessible component library |
| **State** | [Zustand](https://zustand-demo.pmnd.rs/) | 4 client-side stores (project, engine, timeline, UI) |
| **Auth** | [Auth.js](https://authjs.dev/) (NextAuth v5) | Email/password + magic links, JWT sessions |
| **Database** | [PostgreSQL](https://www.postgresql.org/) + [Prisma ORM](https://www.prisma.io/) | Relational storage with type-safe queries |
| **Storage** | [MinIO](https://min.io/) / [Supabase Storage](https://supabase.com/storage) | Video and rendered file storage (adapter pattern) |
| **Queue** | [BullMQ](https://docs.bullmq.io/) + [Redis](https://redis.io/) / [Inngest](https://www.inngest.com/) | Background render job processing (adapter pattern) |
| **Client Rendering** | [FFmpeg.wasm](https://ffmpegwasm.netlify.app/) | In-browser video processing via WebAssembly |
| **Server Rendering** | [FFmpeg](https://ffmpeg.org/) (native) | Server-side subtitle burning |
| **Transcription** | [Transformers.js](https://huggingface.co/docs/transformers.js/) (Whisper) | In-browser speech-to-text with word timestamps |
| **Monorepo** | [Turborepo](https://turbo.build/) + [Bun](https://bun.sh/) workspaces | Build orchestration and dependency management |
| **Testing** | [Vitest](https://vitest.dev/) + [Playwright](https://playwright.dev/) | 414 unit tests + E2E tests |

---

## Architecture

### Directory Structure

```
subtitle-burner/
├── apps/web/                  # Next.js application
│   ├── src/
│   │   ├── app/               # Pages & API routes (internal + v1)
│   │   ├── components/        # React components (editor, timeline, video, UI)
│   │   ├── lib/               # Auth, API helpers, bridges, hooks
│   │   └── store/             # Zustand state management (4 stores)
│   ├── worker/                # BullMQ render worker (standalone process)
│   └── e2e/                   # Playwright E2E tests
├── packages/
│   ├── types/                 # Shared TypeScript interfaces
│   ├── core/                  # Engines, action system, serializer, templates
│   ├── ffmpeg/                # SRT parser, ASS generator, time utils
│   ├── database/              # Prisma schema + query helpers
│   ├── queue/                 # Queue adapters (Inngest, BullMQ)
│   ├── storage/               # Storage adapters (Supabase, MinIO)
│   └── transcription/         # Audio extraction, Whisper, word grouping
├── docker/                    # Dockerfiles + nginx config
├── scripts/                   # Setup scripts
└── docs/                      # Documentation
```

### Key Technologies

| Package | Purpose |
|---------|---------|
| **`packages/core`** | Pure-function engines (SubtitleEngine, TemplateEngine, RenderEngine, PlaybackController, CaptionAnimationRenderer, ActionSystem, ProjectSerializer). No side effects -- accepts state, returns new state. |
| **`packages/ffmpeg`** | Parses SRT files, generates ASS subtitle files (including karaoke timing tags), and provides time-format utilities. |
| **`packages/database`** | Prisma schema defining 10 tables (User, Video, Subtitle, RenderJob, Template, ApiKey, Project, etc.) plus type-safe query helpers. |
| **`packages/queue`** | Adapter pattern -- auto-detects Inngest (cloud) or BullMQ (VPS) based on environment variables. |
| **`packages/storage`** | Adapter pattern -- auto-detects Supabase Storage (cloud) or MinIO (VPS) based on environment variables. |
| **`packages/transcription`** | Extracts audio via Web Audio API, runs Whisper via Transformers.js, groups words into subtitle cues. |
| **`packages/types`** | Shared TypeScript interfaces used across all packages. |

For a detailed system design diagram, adapter pattern explanation, and full API route reference, see [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

---

## Usage

### Local Mode (No Account Required)

1. Open the app at `http://localhost:3000`
2. Drop a video file (**MP4**, **WebM**, **MOV**, **MKV** -- up to 500 MB)
3. Add subtitles with the **+ Add Subtitle** button or import an **SRT** file
4. Edit text, timing, and style in the right panel
5. Use the timeline to drag and resize subtitle blocks
6. Click **Render** then **Browser** to burn subtitles client-side
7. Download the rendered video

### Dashboard Mode (With Account)

1. Sign up or sign in at `/login`
2. Upload videos from the dashboard -- they are stored in cloud/MinIO storage
3. Edit subtitles -- changes auto-save every 2 seconds
4. Render using **Server** mode for faster processing of long videos
5. Download rendered videos from the dashboard

### Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `Space` | Play / Pause |
| `Left Arrow` | Seek back 0.1s (`Shift`: 1s) |
| `Right Arrow` | Seek forward 0.1s (`Shift`: 1s) |
| `Delete` / `Backspace` | Remove selected subtitle |

### SRT Workflow

1. Click **Import SRT** in the toolbar to load existing subtitles
2. Edit timing and text visually
3. Click **Export SRT** to save the result

### API Usage Examples

The public API uses API key authentication. Generate a key from the dashboard or via the API.

**Create a render job:**

```bash
curl -X POST https://your-instance.com/api/v1/render \
  -H "Authorization: Bearer sb_your_api_key" \
  -H "Content-Type: application/json" \
  -d '{
    "videoId": "video-uuid-here",
    "style": {
      "fontFamily": "Arial",
      "fontSize": 48,
      "primaryColor": "#FFFFFF",
      "outlineColor": "#000000",
      "outlineWidth": 2
    },
    "cues": [
      {
        "start": 0,
        "end": 3.5,
        "text": "Hello world",
        "words": [
          { "word": "Hello", "start": 0, "end": 1.5 },
          { "word": "world", "start": 1.8, "end": 3.5 }
        ],
        "animationStyle": "karaoke"
      }
    ]
  }'
```

**Check render status:**

```bash
curl https://your-instance.com/api/v1/render/job-uuid \
  -H "Authorization: Bearer sb_your_api_key"
```

**Download rendered video:**

```bash
curl -L https://your-instance.com/api/v1/render/job-uuid/download \
  -H "Authorization: Bearer sb_your_api_key" \
  -o output.mp4
```

**List templates:**

```bash
curl https://your-instance.com/api/v1/templates/gallery \
  -H "Authorization: Bearer sb_your_api_key"
```

For the full list of 21 API endpoints, see the [API Routes section in ARCHITECTURE.md](docs/ARCHITECTURE.md#public-api-v1).

---

## Development Commands

```bash
bun install                # Install all dependencies
bun run dev                # Start dev server (http://localhost:3000)
bun run build              # Production build
bun run test               # Run all 414 tests
bun run lint               # Lint all packages
bun run format             # Format with Prettier
bun run format:check       # Check formatting without writing
```

---

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `AUTH_SECRET` | Yes | Random secret for JWT signing (`openssl rand -base64 32`) |
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `SMTP_HOST` | No | SMTP server for magic link emails |
| `SMTP_PORT` | No | SMTP port (default: 587) |
| `SMTP_USER` | No | SMTP username |
| `SMTP_PASS` | No | SMTP password |
| `EMAIL_FROM` | No | From address for emails |
| `REDIS_URL` | No | Redis for BullMQ (VPS mode) |
| `MINIO_ENDPOINT` | No | MinIO endpoint (VPS mode) |
| `MINIO_ACCESS_KEY` | No | MinIO access key |
| `MINIO_SECRET_KEY` | No | MinIO secret key |
| `MINIO_BUCKET` | No | MinIO bucket name |
| `NEXT_PUBLIC_FFMPEG_CORE_URL` | No | Custom CDN base URL for FFmpeg WASM core (defaults to unpkg) |
| `NEXT_PUBLIC_SUPABASE_URL` | No | Supabase URL (cloud mode, storage only) |
| `SUPABASE_SERVICE_ROLE_KEY` | No | Supabase service key (cloud mode) |

---

## Roadmap

### Completed

- [x] Visual timeline editor with drag and resize
- [x] 8 built-in subtitle templates
- [x] 6 caption animation styles with per-word timing
- [x] Client-side rendering with FFmpeg.wasm
- [x] Server-side rendering with BullMQ worker
- [x] Auto-transcription with in-browser Whisper
- [x] SRT import/export
- [x] Project file format (.sbp) with save/restore
- [x] Public REST API v1 with 21 endpoints
- [x] Undo/redo action system
- [x] API key management with scoped permissions
- [x] Dual deployment modes (VPS Docker / Cloud Vercel)
- [x] 414 tests across 7 packages

### Planned

- [ ] Multi-language subtitle tracks
- [ ] Batch rendering via API
- [ ] Custom font uploads
- [ ] Video preview with live animation playback
- [ ] Collaborative editing (real-time sync)
- [ ] Plugin system for custom animation styles
- [ ] WebVTT and TTML import/export
- [ ] GPU-accelerated server rendering

---

## Contributing

Contributions are welcome and appreciated. There are many ways to help:

- **Report bugs** -- open an [issue](https://github.com/jurczykpawel/subtitle-burner/issues) with steps to reproduce
- **Suggest features** -- start a [discussion](https://github.com/jurczykpawel/subtitle-burner/discussions) or open an issue tagged `enhancement`
- **Submit pull requests** -- bug fixes, new features, documentation improvements
- **Improve tests** -- the project has 414 tests but more coverage is always welcome
- **Write documentation** -- tutorials, guides, or translations

Please read **[docs/CONTRIBUTING.md](docs/CONTRIBUTING.md)** for development setup, code style guidelines, commit conventions, and the PR process.

---

## License

This project is licensed under the **MIT License**. See the [LICENSE](LICENSE) file for the full text.

### Security and Privacy

Subtitle Burner can process user-uploaded video files and stores user accounts with email and hashed passwords. If you self-host this application:

- Review the [SECURITY.md](SECURITY.md) file for the security policy and vulnerability reporting process
- All video files are stored in your configured storage backend (MinIO or Supabase) -- no data is sent to third parties
- Client-side rendering processes video entirely in the browser -- the file never leaves the user's device
- API keys are stored as SHA-256 hashes, never in plaintext
- All database queries are scoped to the authenticated user (application-level row security)

---

## Support

- **Bug reports and feature requests** -- [GitHub Issues](https://github.com/jurczykpawel/subtitle-burner/issues)
- **Questions and discussions** -- [GitHub Discussions](https://github.com/jurczykpawel/subtitle-burner/discussions)
- **Security vulnerabilities** -- email **security@subtitleburner.com** (see [SECURITY.md](SECURITY.md))

---

## Acknowledgments

Subtitle Burner is built on top of these excellent open-source projects:

| Project | Role |
|---------|------|
| [Next.js](https://nextjs.org/) | Full-stack React framework |
| [FFmpeg](https://ffmpeg.org/) / [FFmpeg.wasm](https://ffmpegwasm.netlify.app/) | Video processing (server and browser) |
| [Transformers.js](https://huggingface.co/docs/transformers.js/) | In-browser Whisper transcription |
| [Zustand](https://zustand-demo.pmnd.rs/) | Lightweight state management |
| [Auth.js](https://authjs.dev/) | Authentication framework |
| [Prisma](https://www.prisma.io/) | Database ORM |
| [BullMQ](https://docs.bullmq.io/) | Redis-backed job queue |
| [Tailwind CSS](https://tailwindcss.com/) | Utility-first CSS framework |
| [shadcn/ui](https://ui.shadcn.com/) | Accessible UI components |
| [Turborepo](https://turbo.build/) | Monorepo build system |
| [Vitest](https://vitest.dev/) | Unit testing framework |
| [Playwright](https://playwright.dev/) | End-to-end testing |
