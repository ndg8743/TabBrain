# Claude Code Build Prompt: AI Tab & Bookmark Organizer Chrome Extension

## Project Overview

Build a Chrome extension called **"TabBrain"** that uses AI (via user-provided API keys) to intelligently organize browser chaos. This is a "clean up my mess" tool for users with hundreds of tabs across multiple windows and thousands of bookmarks in disorganized folders.

**Critical constraint:** Optimize all prompts, batching, and architecture for smaller open-source models (20B-120B parameters) like Llama 3.1 70B, Qwen 2.5 72B, Mistral Large, DeepSeek V3, or local models via Ollama. These models have smaller context windows (8K-32K typical), less reliable JSON output, and need explicit, simple instructions.

---

## Core Features (Priority Order)

### 1. Window Topic Detection
Analyze all tabs in each browser window and assign a descriptive topic/category label. Users with 10+ windows need to understand "what was I researching here?"

**Behavior:**
- Scan all tabs in a window (URL + title only, never page content)
- Suggest a 2-4 word topic label (e.g., "GPU Cluster Setup", "React Authentication", "Home Renovation")
- Let user accept, edit, or skip each suggestion
- Store window labels in extension storage for reference

### 2. Duplicate Detection & Cleanup
Find and remove duplicate tabs and bookmarks across the entire browser.

**Behavior:**
- Normalize URLs (strip tracking params, www, trailing slashes, protocol)
- Group exact duplicates
- Optionally detect "near duplicates" (same domain + similar path, e.g., `/docs/v1` vs `/docs/v2`)
- Present grouped duplicates with checkboxes for batch deletion
- Always keep the oldest/first instance by default

### 3. Domain-Based Sorting
Reorder tabs within a window by domain, grouping related sites together.

**Behavior:**
- Sort alphabetically by domain
- Optionally group subdomains with parent (docs.github.com with github.com)
- Preserve pinned tabs at the start
- Offer "sort all windows" or "sort current window" options

### 4. Tab Group Auto-Creation
Automatically create Chrome tab groups based on AI-detected categories.

**Behavior:**
- Categorize tabs into predefined categories (Tech, Shopping, Social, News, Entertainment, Research, Finance, Productivity, Other)
- Only create groups for categories with 2+ tabs
- Assign consistent colors per category
- Name groups with category or detected sub-topic
- Handle existing tab groups gracefully (don't break user's manual groups)

### 5. Window Merge Suggestions
Detect windows that should probably be combined.

**Behavior:**
- Identify windows with overlapping topics (>50% similar domains or AI-detected theme overlap)
- Suggest merges with preview of combined result
- Execute merge by moving all tabs from source to destination window
- Close empty source window after merge

### 6. Bookmark Organization
Process the entire bookmark tree and organize it.

**Behavior:**
- Detect and rename "New Folder", "Untitled", "Folder (1)" type folders based on contents
- Find orphaned bookmarks in root or Bookmarks Bar that should be in folders
- Suggest folder structure based on bookmark categories
- Detect dead links (optional, requires fetch - make this opt-in)
- Handle bookmark folders with 100+ items specially (suggest splitting)

---

## Technical Architecture

### Extension Type & UI
- **Manifest V3** (required for Chrome Web Store as of 2024)
- **Side Panel UI** (not popup) - provides persistent workspace that doesn't close on click-away
- **Options Page** for API key configuration and preferences
- Service worker background script (no persistent background page in MV3)

### Build System & Tooling
- **Vite** with **CRXJS plugin** for hot reload during development
- **TypeScript** with strict mode enabled
- **React 18** for UI components (or Svelte if you prefer smaller bundles)
- **Tailwind CSS** for styling (purged for minimal bundle)
- **pnpm** for package management

### Project Structure
```
tabbrain/
├── src/
│   ├── background/
│   │   ├── index.ts                 # Service worker entry
│   │   ├── message-handler.ts       # Message routing
│   │   └── state.ts                 # Persistent state management
│   │
│   ├── sidepanel/
│   │   ├── index.html
│   │   ├── main.tsx
│   │   ├── App.tsx
│   │   ├── pages/
│   │   │   ├── Dashboard.tsx        # Main view with action cards
│   │   │   ├── WindowOrganizer.tsx  # Window topic assignment
│   │   │   ├── DuplicateFinder.tsx  # Duplicate management
│   │   │   ├── BookmarkCleaner.tsx  # Bookmark organization
│   │   │   └── Settings.tsx         # Quick settings access
│   │   ├── components/
│   │   │   ├── TabList.tsx
│   │   │   ├── BookmarkTree.tsx
│   │   │   ├── ProgressBar.tsx
│   │   │   ├── ConfirmDialog.tsx
│   │   │   └── ProviderStatus.tsx
│   │   └── hooks/
│   │       ├── useChromeTabs.ts
│   │       ├── useBookmarks.ts
│   │       └── useLLM.ts
│   │
│   ├── options/
│   │   ├── index.html
│   │   ├── main.tsx
│   │   └── App.tsx                  # API key config, provider selection
│   │
│   ├── lib/
│   │   ├── llm/
│   │   │   ├── provider.ts          # Abstract provider interface
│   │   │   ├── openai-compatible.ts # Works for OpenAI, DeepSeek, Together, etc.
│   │   │   ├── anthropic.ts         # Claude API
│   │   │   ├── ollama.ts            # Local models
│   │   │   ├── prompt-builder.ts    # Prompt templates optimized for small models
│   │   │   ├── response-parser.ts   # Robust JSON extraction
│   │   │   └── batch-processor.ts   # Chunking and rate limiting
│   │   │
│   │   ├── chrome/
│   │   │   ├── tabs.ts              # Tab operations wrapper
│   │   │   ├── bookmarks.ts         # Bookmark tree operations
│   │   │   ├── tab-groups.ts        # Tab group management
│   │   │   ├── windows.ts           # Window operations
│   │   │   └── storage.ts           # chrome.storage wrapper
│   │   │
│   │   ├── algorithms/
│   │   │   ├── url-normalizer.ts    # URL deduplication logic
│   │   │   ├── similarity.ts        # Levenshtein, Jaccard for fuzzy matching
│   │   │   └── clustering.ts        # Group similar items without AI
│   │   │
│   │   └── utils/
│   │       ├── token-estimator.ts   # Approximate token counts
│   │       ├── retry.ts             # Exponential backoff
│   │       └── logger.ts            # Debug logging
│   │
│   └── types/
│       ├── chrome.d.ts              # Extended Chrome API types
│       ├── llm.ts                   # Provider types
│       └── domain.ts                # App domain types
│
├── public/
│   ├── icons/
│   │   ├── icon16.png
│   │   ├── icon48.png
│   │   └── icon128.png
│   └── _locales/                    # i18n if needed
│
├── manifest.json
├── vite.config.ts
├── tailwind.config.js
├── tsconfig.json
└── package.json
```

---

## LLM Integration (Small Model Optimized)

### Supported Providers
1. **OpenAI-compatible APIs** (OpenAI, DeepSeek, Together.ai, OpenRouter, Groq, Fireworks)
2. **Anthropic** (Claude models)
3. **Ollama** (local models - Llama, Mistral, Qwen, Phi, etc.)
4. **LM Studio** (local, OpenAI-compatible endpoint)

### Provider Configuration Schema
```
{
  provider: 'openai' | 'anthropic' | 'ollama' | 'custom',
  apiKey?: string,           // Not needed for Ollama
  baseUrl?: string,          // Custom endpoint
  model: string,             // Model identifier
  maxContextTokens: number,  // User-configurable, default 8000
  temperature: number,       // Default 0.3 for consistency
}
```

### Small Model Prompt Optimization Principles

**These models need different prompting than GPT-4/Claude:**

1. **Explicit JSON schema in every prompt** - Don't assume the model knows JSON format
2. **Few-shot examples are mandatory** - Always include 2-3 examples of expected output
3. **Shorter context windows** - Batch 15-25 items instead of 50+
4. **Simpler category lists** - Use 8-10 categories max, not granular subcategories
5. **Validation and retry** - Expect malformed JSON ~20% of the time, have fallback parsing
6. **Avoid complex reasoning** - Don't ask "why", just ask for classification
7. **One task per prompt** - Don't combine categorization with duplicate detection
8. **Token budget awareness** - Reserve 500+ tokens for response, don't fill context

### Prompt Templates

**System prompt (kept minimal for small models):**
```
You categorize browser tabs and bookmarks. You ONLY output valid JSON arrays. No explanations, no markdown, no extra text.
```

**Window topic detection prompt:**
```
Analyze these browser tabs and suggest ONE topic label (2-4 words) for this window.

Tabs:
1. "React Hooks Guide" | react.dev/docs/hooks
2. "useState vs useReducer" | blog.example.com/react-state
3. "React Testing Library" | testing-library.com/docs/react

Examples of good topic labels:
- "React State Management"
- "Home Renovation Ideas"  
- "Python Machine Learning"
- "Job Search NYC"

Respond with ONLY this JSON format:
{"topic": "your 2-4 word topic here", "confidence": 0.85}
```

**Categorization prompt (batched):**
```
Categorize each item into exactly ONE category.

Categories: Technology, Shopping, News, Entertainment, Social, Finance, Reference, Productivity, Other

Items:
1. "Amazon.com Cart" | amazon.com/cart
2. "GitHub - pytorch/pytorch" | github.com/pytorch
3. "CNN Breaking News" | cnn.com/2024/12/story

Example output:
[{"i":1,"c":"Shopping"},{"i":2,"c":"Technology"},{"i":3,"c":"News"}]

Output JSON array only:
```

**Folder naming prompt:**
```
These bookmarks are in a folder called "New Folder". Suggest a better name (2-4 words).

Bookmarks:
1. "Newegg RTX 4090" | newegg.com/...
2. "PCPartPicker Build" | pcpartpicker.com/...
3. "GPU Benchmark Charts" | tomshardware.com/...

Respond ONLY with: {"name": "suggested folder name"}
```

### Response Parsing (Robust)

Small models often return:
- JSON wrapped in markdown code blocks
- Extra text before/after JSON
- Single quotes instead of double quotes
- Trailing commas
- Missing quotes on keys

**Parser must handle all of these:**
1. Strip markdown fences (```json ... ```)
2. Extract content between first `[` or `{` and last `]` or `}`
3. Fix common JSON errors (trailing commas, single quotes)
4. Validate against expected schema
5. On failure, retry with simpler prompt or fall back to heuristics

### Batching Strategy

**For 8K context models (Llama 3.1 8B, Mistral 7B):**
- Batch size: 15-20 items
- Reserve 2000 tokens for system prompt + examples
- Reserve 500 tokens for response
- ~300 tokens per item (URL + title + output)

**For 32K+ context models (Llama 3.1 70B, Qwen 72B, DeepSeek):**
- Batch size: 40-60 items
- Same token reservation ratios
- Can include more few-shot examples

**For 128K+ models (GPT-4o, Claude):**
- Batch size: 100-150 items
- Include comprehensive examples
- Can do multi-step reasoning

### Rate Limiting & Retry

- Implement exponential backoff: 1s, 2s, 4s, 8s, max 3 retries
- Respect provider rate limits (store in config per provider)
- For Ollama: No rate limit, but respect local GPU memory
- Queue requests, process 2-3 concurrent batches max
- Show progress: "Processing batch 3/12..."

---

## Chrome API Usage

### Permissions (manifest.json)
```
"permissions": [
  "storage",           // Settings and state
  "sidePanel",         // Side panel UI
  "tabGroups",         // Create/manage groups
  "alarms"             // For long operations
],
"optional_permissions": [
  "tabs",              // Request when user starts organizing
  "bookmarks"          // Request when user wants bookmark features
],
"host_permissions": [
  "https://api.openai.com/*",
  "https://api.anthropic.com/*",
  "https://api.deepseek.com/*",
  "https://api.together.xyz/*",
  "https://openrouter.ai/*",
  "http://localhost:*/*"    // Ollama/LM Studio
]
```

### Tab Operations
- `chrome.tabs.query({})` - Get all tabs (requires "tabs" permission)
- `chrome.tabs.remove(tabIds)` - Close tabs
- `chrome.tabs.move(tabId, {index, windowId})` - Reorder/move tabs
- `chrome.tabs.group({tabIds, createProperties})` - Create tab groups
- `chrome.tabGroups.update(groupId, {title, color})` - Name and color groups

### Bookmark Operations
- `chrome.bookmarks.getTree()` - Full bookmark tree
- `chrome.bookmarks.update(id, {title})` - Rename folders
- `chrome.bookmarks.remove(id)` - Delete bookmark
- `chrome.bookmarks.move(id, {parentId, index})` - Reorganize
- `chrome.bookmarks.create({parentId, title, url})` - Create new

### Window Operations
- `chrome.windows.getAll({populate: true})` - All windows with tabs
- `chrome.windows.remove(windowId)` - Close window
- `chrome.windows.update(windowId, {focused: true})` - Focus window

### Storage Strategy
- `chrome.storage.local` - API keys (encrypted), settings, cached results
- `chrome.storage.session` - Temporary state, current operation progress
- Never store raw API keys - use Web Crypto API for encryption with user password or machine-derived key

---

## Edge Cases & Error Handling

### Tab/Bookmark Edge Cases
1. **Pinned tabs** - Never move, never group, always preserve position
2. **chrome:// and edge:// URLs** - Skip (can't read, can't categorize)
3. **about:blank tabs** - Offer to close, don't categorize
4. **Tabs with no title** - Use URL domain as fallback title
5. **Suspended/discarded tabs** - Handle `chrome.tabs.discard` state
6. **Bookmark separators** - Some browsers use empty bookmark nodes as separators
7. **Bookmark folders at max depth** - Chrome has depth limits
8. **Synced bookmarks** - Changes may be overwritten by sync, warn user
9. **Very long URLs** - Truncate for LLM, preserve full URL for operations
10. **Unicode/emoji in titles** - Handle encoding properly
11. **Bookmarks with missing URLs** - These are folders, handle differently

### LLM Edge Cases
1. **API key invalid/expired** - Clear error message, link to settings
2. **Rate limited** - Show wait time, queue remaining batches
3. **Context length exceeded** - Reduce batch size automatically, retry
4. **Malformed response** - Retry once with simpler prompt, then fall back to heuristics
5. **Empty response** - Retry, then mark as "uncategorized"
6. **Ollama not running** - Detect and show setup instructions
7. **Network timeout** - 30s timeout, retry with exponential backoff
8. **Provider outage** - Detect repeated failures, suggest switching providers
9. **Model not found** - List available models, let user select
10. **Streaming vs non-streaming** - Support both, prefer non-streaming for JSON

### UI Edge Cases
1. **No tabs permission yet** - Show permission request flow
2. **User closes side panel mid-operation** - Save state, resume on reopen
3. **User closes browser mid-operation** - Graceful save, resume on restart
4. **Very long tab titles** - Truncate with ellipsis in UI
5. **Hundreds of duplicates** - Paginate, don't render all at once
6. **Window with 500+ tabs** - Warning, process in chunks
7. **Bookmark tree with 5000+ items** - Show progress, paginate UI
8. **User makes changes during analysis** - Detect stale state, offer refresh
9. **Multiple extension instances** - Handle storage conflicts
10. **Dark mode** - Respect system preference

### Service Worker Edge Cases
1. **30-second timeout** - For long operations, use alarms to wake up
2. **State lost on restart** - Persist everything to storage
3. **Concurrent messages** - Queue and process sequentially
4. **Memory pressure** - Don't hold large datasets in memory

---

## UI/UX Design Principles

### Side Panel Layout
- Fixed header with extension name and settings gear icon
- Main content area with scrollable action cards
- Sticky progress bar when operations are running
- Toast notifications for success/error states

### Action Cards (Dashboard)
Each feature gets a card with:
- Icon + title
- Brief description
- "Scan" or "Analyze" primary button
- Count badge (e.g., "12 duplicates found")
- Expand to show details/results

### Progress & Feedback
- Show batch progress: "Analyzing tabs: 45/120"
- Estimate time remaining for large operations
- Allow cancel for long operations
- Show cost estimate before running (for paid APIs)

### Confirmation Dialogs
- **Before closing tabs:** "Close 23 duplicate tabs? This cannot be undone."
- **Before merging windows:** Show preview of merged window
- **Before renaming folders:** Show before/after comparison
- Always have clear cancel button

### Accessibility
- Keyboard navigation for all actions
- Screen reader labels on buttons and icons
- High contrast mode support
- Respects reduced-motion preference

---

## Testing Strategy

### Unit Tests (Vitest)
- URL normalization edge cases
- Token estimation accuracy
- JSON response parsing robustness
- Similarity algorithms

### Integration Tests
- Mock Chrome APIs (use @anthropic/chrome-types)
- Mock LLM responses
- Test full flows: scan → categorize → apply

### Manual Testing Checklist
- [ ] Works with 0 tabs
- [ ] Works with 500+ tabs across 10 windows
- [ ] Works with 2000+ bookmarks
- [ ] Handles API key rotation
- [ ] Handles Ollama startup/shutdown
- [ ] Handles network disconnection
- [ ] Preserves pinned tabs
- [ ] Doesn't break existing tab groups
- [ ] Works in Chrome, Edge, Brave (Chromium browsers)

---

## Performance Targets

- **Initial scan:** < 2 seconds for 100 tabs
- **LLM categorization:** < 30 seconds for 100 items (depends on provider)
- **UI responsiveness:** < 100ms for all interactions
- **Memory usage:** < 50MB for extension
- **Bundle size:** < 500KB (gzipped)

---

## Future Considerations (Out of Scope for V1)

- Session saving/restoration
- Scheduled auto-organization
- Cross-device sync of organization preferences
- Firefox/Safari port
- Integration with bookmark managers (Raindrop, Pocket)
- Custom category definitions
- Keyboard shortcuts for quick actions
- Export organization as markdown/JSON

---

## Development Commands

```bash
# Install dependencies
pnpm install

# Development with hot reload
pnpm dev

# Build for production
pnpm build

# Type checking
pnpm typecheck

# Run tests
pnpm test

# Lint and format
pnpm lint
pnpm format
```

---

## Final Notes for Claude Code

1. **Start with the foundation:** Build the Vite + CRXJS setup first, verify hot reload works
2. **Chrome APIs before AI:** Get tab/bookmark reading working before adding LLM integration
3. **Ollama first:** Test with Ollama locally before adding paid providers
4. **One feature at a time:** Get duplicate detection working end-to-end before starting tab grouping
5. **Robust parsing is critical:** Spend extra time on the JSON response parser - it will save debugging later
6. **Keep prompts in separate files:** Easy to iterate and test different prompt strategies
7. **Log everything in dev:** Add verbose logging that can be disabled in production

Build this incrementally, test each piece, and prioritize reliability over features.