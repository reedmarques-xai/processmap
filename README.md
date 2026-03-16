# GrokessMap

An internal sales tool that converts Gong recording transcripts into editable visual process maps using AI.

## Features

- 📤 **Upload Transcripts** — Drag-and-drop `.txt` files or paste text directly
- 🤖 **AI-Powered Analysis** — xAI Grok parses transcripts into structured flowcharts
- 🎨 **Excalidraw Editor** — Full-featured embedded diagram editor for real-time modifications
- 💾 **Auto-Save History** — All maps saved to browser localStorage
- 📥 **Export .excalidraw** — Download maps as official Excalidraw files (compatible with excalidraw.com)
- 🔒 **PIN Protection** — Simple shared PIN gate for team access

## Tech Stack

- **Next.js 15** (App Router, TypeScript)
- **Tailwind CSS v4**
- **@excalidraw/excalidraw** (embedded React component)
- **xAI Grok API** (transcript → flowchart)
- **localStorage** (persistence)

## Getting Started

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment variables

Copy `.env.example` to `.env.local` and fill in:

```bash
XAI_API_KEY=your-xai-api-key    # Get from https://console.x.ai
APP_PIN=1234                      # Shared team PIN
```

### 3. Run the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) — enter the PIN to access the dashboard.

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Cmd+S` | Save current map |
| `Cmd+E` | Export as .excalidraw |

## Deploy to Vercel

1. Push to GitHub
2. Import in [Vercel](https://vercel.com)
3. Add environment variables (`XAI_API_KEY`, `APP_PIN`)
4. Deploy!

## Project Structure

```
src/
├── app/
│   ├── page.tsx                    # PIN gate entry
│   ├── dashboard/page.tsx          # Upload + history
│   ├── editor/[id]/page.tsx        # Excalidraw editor
│   └── api/
│       ├── parse-transcript/       # Grok API integration
│       └── verify-pin/             # PIN verification
├── components/
│   ├── pin-gate.tsx                # PIN entry UI
│   ├── transcript-upload.tsx       # Upload/paste component
│   ├── process-map-editor.tsx      # Excalidraw wrapper
│   ├── history-list.tsx            # Saved maps list
│   └── header.tsx                  # App header/nav
└── lib/
    ├── grok.ts                     # xAI API client
    ├── prompts/
    │   └── excalidraw-process-map.ts  # Excalidraw generation system prompt
    ├── storage.ts                  # localStorage CRUD
    ├── types.ts                    # TypeScript types
    └── utils.ts                    # Utility functions
```