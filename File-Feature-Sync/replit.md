# Workspace

## Overview

pnpm workspace monorepo using TypeScript. This project is **EchoCoach** — an AI Speech Coach web app.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5 with multer (file uploads)
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)
- **Frontend**: React + Vite + Wouter (routing) + Recharts (charts)
- **AI**: OpenAI Whisper (transcription) + GPT-4o-mini (feedback)

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally

## Project Structure

### Artifacts
- **api-server** (`artifacts/api-server/`) — Express REST API, port 8080
- **speaking-coach** (`artifacts/speaking-coach/`) — React/Vite frontend, port 24049, preview at `/`

### Key Features
1. **Audio Recording** — Browser MediaRecorder API with live waveform visualization
2. **Speech Analysis** — Filler word detection, WPM calculation, vocabulary scoring, confidence scoring
3. **AI Feedback** — OpenAI Whisper transcription + GPT-4o-mini feedback generation (fallback mode without API key)
4. **Session History** — Paginated list of all past sessions with scores
5. **Progress Tracking** — 30-day trend charts for all 4 score metrics
6. **Session Details** — Full breakdown: scores, AI feedback, strengths/improvements, transcript

### Scoring System (4 metrics)
- **Fluency Score** — Based on WPM (ideal: 120-160 WPM)
- **Pause Score** (Filler Word Control) — Penalizes detected filler words (um, uh, like, etc.)
- **Vocabulary Score** — Based on unique word ratio
- **Confidence Score** — Heuristic combining pacing, vocabulary, and filler ratio
- **Overall Score** — Average of all 4 metrics

### Database Schema (lib/db)
- `sessions` table — userId, audioPath, transcript, all 4 scores, WPM, fillerWordCount, status, etc.
- `feedback` table — sessionId, feedback text, strengths[], improvements[], fillerWords[]

### API Routes
- `POST /api/sessions/upload` — Upload audio file
- `POST /api/sessions/:sessionId/analyze` — Transcribe + analyze + generate feedback
- `GET /api/sessions` — List sessions (userId, limit, offset)
- `GET /api/sessions/:sessionId` — Get session with scores and feedback
- `GET /api/feedback/:sessionId` — Get feedback for a session
- `GET /api/progress/:userId` — Progress data points (30-day window)
- `GET /api/progress/:userId/summary` — Aggregate stats and streak

### User System
- Currently uses hardcoded `demo-user` as the userId (no auth system)

### Environment Variables
- `OPENAI_API_KEY` — Optional. Without it, app uses a demo transcript and heuristic feedback
- `DATABASE_URL` — PostgreSQL connection string (auto-provisioned)
- `SESSION_SECRET` — Set in secrets

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.
