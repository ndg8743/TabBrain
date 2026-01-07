# TabBrain Development Guide

## Project Overview

TabBrain is a Chrome extension that uses AI (via user-provided API keys) to intelligently organize browser tabs and bookmarks. It's designed for users with hundreds of tabs across multiple windows and thousands of bookmarks.

**Key constraint:** Optimized for smaller open-source models (20B-120B parameters) like Llama 3.1 70B, Qwen, Gemma, etc. via Ollama or Open WebUI.

## Tech Stack

- **Build:** Vite + CRXJS plugin (hot reload for Chrome extensions)
- **Language:** TypeScript (strict mode)
- **UI Framework:** React 18
- **Styling:** Tailwind CSS
- **Animations:** Motion (framer-motion)
- **Package Manager:** pnpm

## Project Structure

```
src/
├── background/
│   ├── index.ts              # Service worker entry point
│   ├── message-handler.ts    # All Chrome message handlers (LLM calls, tab ops, etc.)
│   └── state.ts              # Persistent state management
│
├── sidepanel/
│   ├── index.html            # Side panel HTML
│   ├── main.tsx              # React entry
│   ├── App.tsx               # Main app with routing
│   ├── pages/
│   │   ├── Dashboard.tsx     # Main view with feature cards
│   │   ├── WindowOrganizer.tsx   # Window topic detection & tab categorization
│   │   ├── DuplicateFinder.tsx   # Find/remove duplicate tabs
│   │   ├── BookmarkCleaner.tsx   # Bookmark organization
│   │   └── Settings.tsx      # Quick settings in side panel
│   ├── components/           # Reusable UI components
│   └── hooks/
│       ├── useLLM.ts         # LLM-related hooks (useWindowTopic, useCategorizeTabs, etc.)
│       └── ...               # Other hooks for Chrome APIs
│
├── options/
│   ├── index.html            # Options page HTML
│   └── App.tsx               # Full settings page (API config, model selection)
│
├── lib/
│   ├── llm/
│   │   ├── provider.ts           # Abstract LLM provider interface
│   │   ├── openai-compatible.ts  # OpenAI-compatible provider (works with OpenAI, Ollama, Open WebUI, etc.)
│   │   ├── prompt-builder.ts     # All LLM prompts (topic detection, categorization, etc.)
│   │   ├── response-parser.ts    # Robust JSON extraction from LLM responses
│   │   └── batch-processor.ts    # Batch processing with retry logic
│   │
│   ├── chrome/
│   │   ├── tabs.ts           # Tab operations (query, close, move, group)
│   │   ├── bookmarks.ts      # Bookmark tree operations
│   │   ├── tab-groups.ts     # Tab group management
│   │   ├── windows.ts        # Window operations
│   │   └── storage.ts        # chrome.storage wrapper
│   │
│   ├── algorithms/
│   │   ├── url-normalizer.ts # URL deduplication logic
│   │   ├── similarity.ts     # Levenshtein, Jaccard for fuzzy matching
│   │   └── clustering.ts     # Group similar items without AI
│   │
│   └── utils/
│       ├── token-estimator.ts    # Approximate token counts for batching
│       ├── retry.ts              # Exponential backoff
│       └── logger.ts             # Debug logging
│
└── types/
    ├── domain.ts             # App domain types (TabInfo, WindowInfo, etc.)
    └── llm.ts                # LLM-related types
```

## LLM Integration

### Supported Providers

All providers use the OpenAI-compatible API format:
- **OpenAI** - `https://api.openai.com/v1`
- **Anthropic** - `https://api.anthropic.com`
- **Ollama** - `http://localhost:11434`
- **Open WebUI** - Custom URL ending with `/api`
- **LM Studio** - `http://localhost:1234/v1`
- **Any OpenAI-compatible API**

### Open WebUI Configuration (User's Setup)

The user has Open WebUI running at:
- **Base URL:** `https://gpt.hydra.newpaltz.edu/api` (MUST end with `/api`)
- **API Key:** `sk-d6f4a889c13741129422af1dd77a5908`
- **Available models:** 22 models including `deepseek-r1:32b`, `gemma3:27b`, `llama3.1:70b`, etc.

### URL Construction Logic (`openai-compatible.ts`)

```typescript
// Completion endpoint
if (isOllama()) return `${base}/api/chat`
if (base.endsWith('/api')) return `${base}/chat/completions`  // Open WebUI
if (base.endsWith('/v1')) return `${base}/chat/completions`   // OpenAI-style
return `${base}/v1/chat/completions`  // Default

// Models endpoint
if (isOllama()) return `${base}/api/tags`
if (base.endsWith('/api')) return `${base}/models`  // Open WebUI
if (base.endsWith('/v1')) return `${base}/models`   // OpenAI-style
return `${base}/v1/models`  // Default
```

### Message Flow for LLM Calls

1. **UI Component** (e.g., `WindowOrganizer.tsx`) calls hook function
2. **Hook** (e.g., `useLLM.ts:useWindowTopic`) sends message via `sendMessage('DETECT_WINDOW_TOPIC', {windowId})`
3. **Message Handler** (`message-handler.ts`) receives message, gets LLM config, creates provider
4. **Batch Processor** (`batch-processor.ts`) builds prompt, calls LLM, parses response
5. **Response** flows back through the chain to UI

### Key Message Types

- `GET_LLM_CONFIG` - Get current LLM configuration
- `TEST_LLM_CONNECTION` - Test API connectivity
- `GET_AVAILABLE_MODELS` - Fetch available models from API
- `DETECT_WINDOW_TOPIC` - AI detects topic for window's tabs
- `CATEGORIZE_TABS` - Basic categorization into predefined categories
- `SMART_CATEGORIZE_TABS` - Smart categorization by topic/subtopic
- `CREATE_TAB_GROUPS` - Create Chrome tab groups from categorized tabs

### Prompts (`prompt-builder.ts`)

- `buildTopicPrompt()` - Suggests 2-4 word topic for a window
- `buildCategorizePrompt()` - Categorizes into: Technology, Shopping, News, Entertainment, Social, Finance, Reference, Productivity, Other
- `buildSmartCategorizePrompt()` - Content-based categorization with topic + subtopic
- `buildFolderNamePrompt()` - Suggests folder names for bookmarks
- `buildSmartAssignPrompt()` - Assigns bookmarks to existing folders

### Response Parsing (`response-parser.ts`)

Handles common LLM output issues:
- JSON wrapped in markdown code blocks (```json ... ```)
- Extra text before/after JSON
- Single quotes instead of double quotes
- Trailing commas

## Core Features

### 1. Window Topic Detection
- Analyzes all tabs in a window (URL + title only)
- Suggests 2-4 word topic label
- User can accept, edit, or skip

### 2. Tab Categorization
- **Basic mode:** Predefined categories
- **Smart mode:** AI-detected topics with subtopics

### 3. Tab Group Creation
- Creates Chrome tab groups from categories
- Options: min tabs per group, use subtopics, collapse on create

### 4. Duplicate Detection
- Normalizes URLs (strips tracking params, www, protocol)
- Groups exact duplicates
- Batch deletion with checkboxes

### 5. Domain Sorting
- Sort tabs alphabetically by domain
- Preserves pinned tabs
- Sort current or all windows

### 6. Bookmark Organization
- Detect generic folder names ("New Folder", "Untitled")
- Suggest better names based on contents
- Find orphan bookmarks
- Detect large folders (100+ items)

## Build & Development

```bash
# Install dependencies
pnpm install

# Development with hot reload
pnpm dev

# Build for production
pnpm build

# Type checking
pnpm typecheck
```

**Output:** `dist/` folder - load as unpacked extension in Chrome

## Testing the LLM

Quick API test with curl:
```bash
curl -X POST "https://gpt.hydra.newpaltz.edu/api/chat/completions" \
  -H "Authorization: Bearer sk-d6f4a889c13741129422af1dd77a5908" \
  -H "Content-Type: application/json" \
  -d '{"model":"gemma3:27b","messages":[{"role":"user","content":"Hello"}]}'
```

## Key Files to Know

| File | Purpose |
|------|---------|
| `src/lib/llm/openai-compatible.ts` | LLM provider with URL construction |
| `src/background/message-handler.ts` | All message handlers (LLM, tabs, bookmarks) |
| `src/sidepanel/hooks/useLLM.ts` | React hooks for LLM operations |
| `src/sidepanel/pages/WindowOrganizer.tsx` | Main UI for topic detection & categorization |
| `src/options/App.tsx` | Settings page with model dropdown |
| `src/lib/llm/prompt-builder.ts` | All LLM prompts |
| `src/lib/llm/batch-processor.ts` | LLM batch processing functions |

## Recent Changes (Latest Session)

1. **Fixed Open WebUI URL construction** - URLs ending with `/api` now correctly route to `/api/chat/completions` and `/api/models`

2. **Added model dropdown** - Options page now has a dropdown that fetches available models from the API (click ↻ to refresh)

3. **Added GET_AVAILABLE_MODELS handler** - Background script can fetch models from any provider

4. **Updated Settings instructions** - Side panel Settings page has step-by-step Open WebUI setup guide

## Known Issues / Edge Cases

- Pinned tabs are never moved or grouped
- `chrome://` and `edge://` URLs are skipped
- Some LLMs return JSON wrapped in markdown - parser handles this
- Rate limiting: 2-3 concurrent batches max, exponential backoff on failure
- Thinking models (DeepSeek R1, QwQ) output `<think>` tags - parser strips them
- Uncategorized/Other tabs are skipped when creating groups to avoid lag

## Git Info

- **Repo:** https://github.com/ndg8743/TabBrain.git
- **Main branch:** `main`
- **Latest commit:** `4445302` - "Fix Open WebUI LLM integration and add model dropdown"
