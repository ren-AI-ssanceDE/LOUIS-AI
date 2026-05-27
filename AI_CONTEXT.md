# Louis-AI Developer Context

This document provides a comprehensive overview of the **Louis-AI** application to help AI developers understand its structure, functionality, and development patterns.

## 1. Overview
Louis-AI is a professional financial planning and business simulation tool designed for startups and small businesses. It allows users to create detailed multi-year financial plans, including revenue forecasts, operational costs, financing, and asset management.

### Core Philosophical Principles:
- **Agentic Flow**: The system doesn't just chat; it plans, acts, and critiques.
- **Transparency**: All AI logic uses a visible "Chain-of-Thought" (`<thought>` blocks).
- **Security**: Zero-direct-write. AI proposes changes; humans confirm them via Diffs.
- **Strict English Schema**: All data structures and database fields are in English to ensure LLM stability, while the UI is multilingual (i18n).

### Key Features:
- **Interactive Planning**: Dedicated views for foundation data, products, sales, costs, financing, and assets.
- **Real-time Calculations**: Automatic derivation of P&L (Ertragsplan), Cash Flow (Liquiditätsplan), and Depreciation (Abschreibungsplan).
- **AI Assistant**: A sidebar assistant that can help with data analysis, planning advice, providing real-time market research via integrated search (SearXNG), and directly modifying the business plan data via tool-calling.
- **RAG (Knowledge Base)**: Users can upload documents (PDF, DocX, Excel) to give the AI context about their specific business or industry. Powered by a local transformer pipeline for secure embedding generation.
- **Scenario Comparison**: Create and compare different business scenarios (e.g., Best Case vs. Worst Case).
- **Project Management**: Multi-project support with local persistence (SQLite) and import/export capabilities.
- **Internationalization**: Full support for German and English.

---

## 2. Tech Stack
- **Frontend**: Vite + React + **Strict TypeScript** (No `any` usage permitted).
- **Styling**: Standard CSS (with CSS variables) + Tailwind-style utility classes in some areas.
- **Backend**: Express (Node.js) acting as a proxy and database manager.
- **Database**: SQLite (managed via `dbService.ts` and Express).
- **AI**: Integration with Ollama or custom OpenAI-compatible APIs. Supports streaming and structured output.
- **RAG**: Vector search using `@xenova/transformers` (MiniLM) for embeddings and `lancedb` for vector storage.
- **Charts**: Recharts / D3 for financial visualizations.
- **i18n**: `react-i18next`.

---

## 3. Project Structure

### Root Files
- `App.tsx`: Main application shell, handles routing and global states.
- `types.ts`: **Strictly defined TypeScript interfaces** for the entire data model.
- `i18n.ts`: Internationalization setup.
- `server.ts`: Express backend entry point.
- `metadata.json`: Application metadata (name, description).

### Key Directories
- `/components`: Reusable UI components.
    - `/ai`: AI sidebar components.
    - `/tabs`: Components for each planning view.
- `/services`: Core business logic and shared utilities.
    - `calculationService.ts`: The "brain" - contains all financial formulas.
    - `dataService.ts`: CRUD operations for projects.
    - `aiService.ts`: AI interaction logic.
    - `dbService.ts`: SQLite interaction commands.
- `/hooks`: React hooks separating business logic from components.
    - `useFinancialCalculations.ts`: Orchestrates the `calculationService`.
    - `useAiAssistant.ts`: Main agent orchestration and tool-calling implementation.
- `/views`: High-level page components (Overview, Settings, etc.).
- `/locales`: JSON translation files (`de.json`, `en.json`).
- `/data`: Static data (e.g., AfA tables).

---

## 4. Data Model (`FinancialData`)

The core of the application is the `FinancialData` object, which represents a complete business plan:
- `settings`: Basic company info (name, legal form, foundation date, planning years).
- `products`: List of revenue units with cost breakdown (COGS).
- `sales`: Quantity-based sales forecast (3D array: `[productId][year][month]`).
- `operationalCosts`: Categorized OpEx items.
- `financing`: Equity and debt items (with interest/repayment schedules).
- `assets`: CAPEX items for depreciation.
- `startupCosts`: Initial one-time expenses.

### Data Naming Strategy:
- **English-Only Schema**: All database and interface fields (e.g., `taxRate`, `materialCosts`) are strictly English.
- **UI Abstraction**: The display layer is decoupled and managed via `i18n` (translations).
- **LLM Stability**: This approach reduces hallucinations when the AI interacts with the financial data by providing a consistent, predictable schema independent of the UI language.

### Calculation Flow:
1. `FinancialData` is updated in the UI.
2. `useFinancialCalculations` triggers `calculateFinancials`.
3. `calculateFinancials` returns `CalculationResults`:
    - `monthly`: Detailed P&L data for every month.
    - `yearly`: Aggregated P&L data per year.
    - `cashFlow`: Detailed liquidity data (Inflows/Outflows).
    - `totalOverview`: KPIs like ROI, ROS, and Payback period.

---

## 5. AI Assistant & Agentic Workflow
 
 The AI Assistant (`AiAssistant.tsx`) follows an advanced **Agentic Flow**:
 - **Model Preference**: 
    - Use `gemini-2.5-flash` for high-speed agentic iterations, orchestration, and tool-calling.
    - Use `gemini-2.5-pro` for deep financial analysis, complex reasoning, or logic critiques if Flash lacks depth.
 - **API Access**: Use `process.env.GEMINI_API_KEY` for accessing the Gemini models.
 - **System Prompts**: System prompts are managed in `components/ai/prompts.ts`. Avoid hardcoding complex prompts directly in hooks or components; update the central prompt file instead.
 - **Iterative ReAct Pattern**: The system works in loops (limited to 4) where the `Orchestrator` decides on the next tool call based on previous execution results.
 - **Visible Chain-of-Thought (CoT)**: The AI generates a `<thought>` block at the start of its response, explaining its reasoning, data analysis, and planned actions. This block is rendered as a toggleable, transparent UI element.
 - **Tool-Calling**: The LLM can suggest changes to the financial data. It returns a `changeProposal` (partial `FinancialData`).
 - **Context Optimization**: To manage the large context window efficiently, `aiContextService.ts` provides "Slimmed" summaries of financial sections unless a `DATA_CHANGE` intent is detected. Heuristics are used to separate stable monthly costs from one-time startup peaks.
 - **Confirmation Flow**: The user sees the proposed changes as a "diff" and can accept or reject them.
 - **Multilingual Intelligence**: All agents are designed to communicate and reason in the user's preferred language (German, English, etc.).

---

## 6. Implementation Patterns

### Adding a New Field to the Model:
1. Update interface in `types.ts`.
2. Update calculations in `services/calculationService.ts`.
3. Update the corresponding view component to allow user input.
4. (Optional) Update `aiContextService.ts` if the AI should know about this new field.

### Adding Translations:
1. Add the key and value to `/locales/de.json` and `/locales/en.json`.
2. Use `useTranslation()` hook in your component: `const { t } = useTranslation();`.
3. Render it: `{t('your_key')}`.

### State Management:
- Global state is managed in `App.tsx` and persisted via `dataService.ts`.
- Deeply nested data updates use `deepClone` (or similar) to maintain immutability.
- Calculation results are memoized to prevent performance lags on large datasets.

---

## 7. Useful Backend Endpoints
- `GET /api/projects`: List all projects.
- `POST /api/project/:id`: Save project data.
- `POST /api/vectors/ingest-file`: Add a document to the RAG knowledge base.
- `POST /api/proxy/ollama`: Streaming endpoint for AI.
- `GET /api/proxy/search`: AI search (Integrated SearXNG support with fallbacks).

---

## 8. Coding Standards (Strict Rules)

- **Type Safety**: The use of the `any` type is strictly forbidden. Developers must always define concrete interfaces or use generics with appropriate constraints.
- **Error Handling**: `catch (e: any)` is prohibited. Use `catch (err: unknown)` and implement type guards/instance checks (e.g., `err instanceof Error`) for specialized error handling and logging.
- **Financial Integrity**: All proposed data changes from the AI (`ProposedChange`) must be validated against `Partial<FinancialData>` to ensure schema compatibility.
- **UI Consistency**: Use Tailwind-style utility classes and maintain the established color palette (professional, financial focus).
- **Consistency**: Maintain consistent naming conventions (camelCase for variables/functions, PascalCase for components/interfaces).
