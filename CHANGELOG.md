# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2026-02-21

### Added

- Subtitle editor with visual timeline (drag, resize, snap-to-grid)
- 8 built-in style templates (Classic, Cinematic, Bold Box, Modern, Minimal Top, Neon, Yellow Box, Typewriter)
- 6 caption animation styles (word-highlight, word-by-word, karaoke, bounce, typewriter, none)
- Auto-transcription powered by Whisper via Transformers.js (runs entirely in-browser)
- Browser-side rendering with FFmpeg.wasm (no upload required)
- Server-side rendering with native FFmpeg and BullMQ job queue
- Public REST API v1 with API key authentication (21 endpoints)
- SRT import and export
- Project file format (.sbp) for saving and restoring full project state
- Undo/redo action system with up to 50 history entries
- Dual deployment modes: VPS (Docker with PostgreSQL, Redis, MinIO) and Cloud (Vercel + Supabase + Inngest)
- 414 tests across 7 packages (Vitest unit tests + Playwright E2E)
