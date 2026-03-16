# GrokessMap — Implementation Plan

## Overview
An internal sales tool that allows users to upload Gong recording transcripts (plain text), uses xAI Grok to parse and extract a process flowchart, and renders it in an embedded Excalidraw editor for real-time modification and export.

---

## Tech Stack
| Layer | Choice |
|---|---|
| Framework | **Next.js 14** (App Router, TypeScript) |
| Styling | **Tailwind CSS** + **shadcn/ui** components |
| AI | **xAI Grok API** (for transcript → process map parsing) |
| Diagram Editor | **@excalidraw/excalidraw** (embedded React component) |
| Storage | **Browser localStorage** (history of maps) |
| Auth | Simple PIN gate (env-configurable) |
| Deployment | **Vercel** |

---

## Architecture

```
┌─────────────────────────────────────────────────┐
│  Browser (Next.js App)                          │
│                                                 │
│  ┌──────────┐   ┌──────────┐   ┌────────────┐  │
│  │ PIN Gate  │──▶│ Dashboard │──▶│ Map Editor │  │
│  │ (auth)    │   │ (history) │   │(Excalidraw)│  │
│  └──────────┘   └──────────┘   └────────────┘  │
│                       │               │         │
│                 localStorage    Export .excalidraw│
└───────────────────────┼─────────────────────────┘
                        │
              ┌─────────▼──────────┐
              │  /api/parse-transcript │
              │  (Next.js API Route)   │
              │  → xAI Grok API        │
              └────────────────────┘
```

---

## Step-by-Step Implementation

### Phase 1: Project Scaffolding
1. **Initialize Next.js project** with TypeScript, Tailwind CSS, App Router
2. **Install dependencies**:
   - `@excalidraw/excalidraw` — embedded diagram editor
   - `shadcn/ui` — polished UI components (Button, Dialog, Card, Input, etc.)
   - `lucide-react` — icons
   - `uuid` — unique IDs for saved maps
3. **Configure environment variables**:
   - `XAI_API_KEY` — xAI Grok API key
   - `APP_PIN` — shared PIN for the gate (default: `1234` for dev)
4. **Set up project structure**:
   ```
   src/
   ├── app/
   │   ├── layout.tsx          # Root layout with fonts, metadata
   │   ├── page.tsx            # PIN gate → redirects to /dashboard
   │   ├── dashboard/
   │   │   └── page.tsx        # Main dashboard with history + upload
   │   └── editor/
   │       └── [id]/
   │           └── page.tsx    # Excalidraw editor for a specific map
   ├── components/
   │   ├── pin-gate.tsx        # PIN entry form
   │   ├── transcript-upload.tsx # Drag-and-drop + paste upload
   │   ├── process-map-editor.tsx # Excalidraw wrapper
   │   ├── history-list.tsx    # List of saved process maps
   │   └── ui/                 # shadcn/ui components
   ├── lib/
   │   ├── grok.ts             # xAI Grok API client
   │   ├── parse-to-excalidraw.ts # Convert LLM output → Excalidraw elements
   │   ├── storage.ts          # localStorage helpers (save/load/delete maps)
   │   └── types.ts            # TypeScript types
   └── api/
       └── parse-transcript/
           └── route.ts        # POST endpoint: transcript → process map JSON
   ```

---

### Phase 2: PIN Gate Authentication
- Simple full-screen PIN entry form
- PIN is validated against `APP_PIN` env var via a lightweight API route
- On success, set a session flag in `localStorage` (or a cookie)
- Redirect to `/dashboard`
- PIN gate wraps all routes (middleware or layout-level check)

**Key files**: `src/components/pin-gate.tsx`, `src/app/page.tsx`

---

### Phase 3: Transcript Upload
- **Drag-and-drop zone** for `.txt` files
- **Paste area** for copying transcript text directly
- File validation (must be `.txt`, reasonable size limit ~500KB)
- Preview of first few lines of transcript before processing
- "Generate Process Map" button triggers the API call
- Loading state with animated progress indicator

**Key files**: `src/components/transcript-upload.tsx`, `src/app/dashboard/page.tsx`

---

### Phase 4: xAI Grok API Integration
- **API Route** (`/api/parse-transcript`):
  - Receives transcript text in POST body
  - Sends structured prompt to xAI Grok API:
    - System prompt: "You are a business process analyst. Extract the current-state process from this sales call transcript. Return a structured JSON flowchart."
    - Defines a strict JSON schema for the response:
      ```json
      {
        "title": "string",
        "summary": "string",
        "steps": [
          {
            "id": "string",
            "label": "string",
            "type": "process | decision | start | end",
            "connections": [
              { "target": "string", "label": "string (optional, e.g., Yes/No)" }
            ]
          }
        ]
      }
      ```
  - Returns parsed JSON to frontend

- **Prompt engineering considerations**:
  - Instruct Grok to focus on the **prospect's current workflow** (not the sales pitch)
  - Handle decision points (e.g., "if the deal is above $50K, they go to legal review")
  - Cap at ~15-20 steps to keep maps readable
  - Include start/end nodes

**Key files**: `src/app/api/parse-transcript/route.ts`, `src/lib/grok.ts`

---

### Phase 5: Process Map → Excalidraw Conversion
- **Conversion engine** that transforms the structured JSON into Excalidraw elements:
  - **Rectangles** for process steps (rounded corners)
  - **Diamonds** for decision points
  - **Rounded rectangles/ovals** for start/end
  - **Arrows** for connections between steps
  - **Text labels** on shapes and arrows
- **Auto-layout algorithm**:
  - Top-to-bottom flow
  - Decision branches split left/right
  - Consistent spacing (horizontal: 200px, vertical: 150px)
  - Auto-calculate positions based on graph structure
- Output is a valid `ExcalidrawElement[]` array

**Key files**: `src/lib/parse-to-excalidraw.ts`

---

### Phase 6: Excalidraw Editor Integration
- Embed `@excalidraw/excalidraw` React component
- Load generated elements into the editor
- Full Excalidraw toolbar (draw, add shapes, text, arrows, etc.)
- **Header bar** with:
  - Map title (editable)
  - "Export .excalidraw" button
  - "Save" button (saves to localStorage)
  - "Back to Dashboard" link
- **Export functionality**:
  - Serialize current Excalidraw state to JSON
  - Trigger browser download as `.excalidraw` file
  - File is fully compatible with excalidraw.com

**Key files**: `src/components/process-map-editor.tsx`, `src/app/editor/[id]/page.tsx`

---

### Phase 7: History & Local Storage
- **Storage schema** (in localStorage under `grokessmap_history`):
  ```json
  [
    {
      "id": "uuid",
      "title": "Customer Onboarding Process",
      "summary": "Current onboarding flow for enterprise customers...",
      "transcript": "Speaker 1: So walk me through...",
      "excalidrawData": { /* full Excalidraw scene */ },
      "createdAt": "2024-01-15T10:30:00Z",
      "updatedAt": "2024-01-15T11:00:00Z"
    }
  ]
  ```
- **Dashboard** shows cards for each saved map:
  - Title, summary (truncated), date
  - Click to open in editor
  - Delete button with confirmation
- Sort by most recently updated

**Key files**: `src/lib/storage.ts`, `src/components/history-list.tsx`

---

### Phase 8: UI Polish & UX
- **Dark mode** support (Excalidraw has native dark mode)
- **Responsive layout** (primarily desktop-focused, graceful on tablet)
- **Loading states**: skeleton loaders for dashboard, animated spinner during AI processing
- **Error handling**: toast notifications for API errors, validation errors
- **Empty states**: friendly message when no maps exist yet
- **Keyboard shortcuts**: Cmd+S to save, Cmd+E to export

---

### Phase 9: Vercel Deployment Configuration
- `vercel.json` or Next.js config for deployment
- Environment variables set in Vercel dashboard:
  - `XAI_API_KEY`
  - `APP_PIN`
- Edge-compatible API routes

---

## File Manifest (All Files to Create)

| # | File | Purpose |
|---|---|---|
| 1 | `package.json` | Dependencies and scripts |
| 2 | `next.config.js` | Next.js configuration (Excalidraw transpile) |
| 3 | `tailwind.config.ts` | Tailwind + shadcn theme |
| 4 | `tsconfig.json` | TypeScript config |
| 5 | `.env.local` | Local environment variables |
| 6 | `.env.example` | Template for env vars |
| 7 | `src/app/layout.tsx` | Root layout |
| 8 | `src/app/page.tsx` | PIN gate entry point |
| 9 | `src/app/globals.css` | Global styles + Tailwind imports |
| 10 | `src/app/dashboard/page.tsx` | Dashboard with upload + history |
| 11 | `src/app/editor/[id]/page.tsx` | Excalidraw editor page |
| 12 | `src/app/api/parse-transcript/route.ts` | Grok API integration |
| 13 | `src/app/api/verify-pin/route.ts` | PIN verification endpoint |
| 14 | `src/components/pin-gate.tsx` | PIN entry UI |
| 15 | `src/components/transcript-upload.tsx` | Upload/paste component |
| 16 | `src/components/process-map-editor.tsx` | Excalidraw wrapper |
| 17 | `src/components/history-list.tsx` | Saved maps list |
| 18 | `src/components/header.tsx` | App header/nav |
| 19 | `src/lib/grok.ts` | xAI API client |
| 20 | `src/lib/parse-to-excalidraw.ts` | JSON → Excalidraw elements |
| 21 | `src/lib/storage.ts` | localStorage CRUD |
| 22 | `src/lib/types.ts` | Shared TypeScript types |
| 23 | `src/lib/utils.ts` | Utility functions (cn, etc.) |
| 24 | `.gitignore` | Git ignore rules |
| 25 | `README.md` | Project documentation |

---

## Key Risks & Mitigations
| Risk | Mitigation |
|---|---|
| Grok output doesn't match JSON schema | Use structured output / JSON mode, add validation + retry |
| Excalidraw SSR issues (it's client-only) | Dynamic import with `ssr: false` |
| Large transcripts exceed token limits | Chunk or truncate to ~8K tokens, summarize first |
| Auto-layout overlapping shapes | Use a simple layered graph algorithm with collision detection |
| localStorage size limits (~5-10MB) | Compress data, limit history to 50 entries, warn when nearing limit |
