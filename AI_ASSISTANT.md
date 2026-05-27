# AI Assistant Architecture & Documentation

This documentation describes the functioning of the integrated AI Assistant (Agentic AI) in the financial planning application. It serves as a guide for developers and as context for LLMs.

## 1. System Overview

The AI Assistant is a **multi-agent, tool-supported (Agentic Flow)** assistant. It acts not just as a chatbot but can understand, analyze, and actively manipulate the application's financial data.

### Core Workflow
1. **Input:** User sends a message via the UI (`AiAssistant.tsx`).
2. **Orchestration (ReAct Loop):** The `Orchestrator` agent analyzes the message and creates an iterative plan. It decides after each step whether more information is needed.
3. **Tool Execution:** The `useAiAssistant` hook executes the planned tools in a loop. Results are aggregated in the `executionContext`.
4. **Thinking Process & Generation:** The LLM generates a **visible thinking process** (`<thought>`), which forms the basis for the final response. This process is multilingual and follows the language of the request.
5. **Critique (Critic):** If data changes are proposed, the `Critic` agent audits the proposal (multilingual).
6. **Output:** The response is streamed. The thinking process is visible in a collapsible block above the response.

---

## 2. Relevant Files

### UI & React Components
- `/components/AiAssistant.tsx`: Main assistant container (Floating Window, Drag & Resize).
- `/components/ai/AiChatBody.tsx`: Chat history display including streaming logic and markdown rendering.
- `/components/ai/AiChatInput.tsx`: Input field with support for Quick Actions.
- `/components/ai/AiAssistantHeader.tsx`: Header controls (Minimize, Close, Settings).
- `/components/ai/AiDataReview.tsx`: UI for auditing and accepting data change proposals.
- `/components/ai/AiChangeProposal.tsx`: Visualization of diffs between current state and proposal.

### Logic & Hooks
- `/hooks/useAiAssistant.ts`: **Central logic unit**. Controls the agent workflow, tool execution loop, and state updates.
- `/services/aiService.ts`: Communication layer to LLM providers (Gemini API / Ollama API).
- `/services/aiContextService.ts`: Collects all relevant context information (financial data, metadata) for the prompt.
- `/services/aiDiffService.ts`: Calculates diffs between JSON objects and applies them safely to the app store.
- `/services/markdownService.ts`: Converts LLM markdown output to safe HTML (including table and code block support).

### Agents & Prompts
- `/components/ai/agents/Orchestrator.ts`: Logic for task planning and intent recognition.
- `/components/ai/agents/Critic.ts`: Logic for automated quality control of data changes.
- `/components/ai/prompts.ts`: Contains system prompts and behavioral rules for all agent roles.
- `/components/ai/schema.ts`: Defines the data schema that the AI is allowed to understand and manipulate.

### Tools
- `/components/ai/tools/index.ts`: Tool registry.
- `/components/ai/tools/SearchTool.ts`: Web search interface (SearXNG).
- `/components/ai/tools/KnowledgeTool.ts`: Vector database interface (RAG).
- `/components/ai/tools/FinancialTool.ts`: Specialized logic for analyzing financial KPIs.
- `/components/ai/tools/PersonaTool.ts`: Enables the AI to adopt various consultant personas.

### Configuration & State
- `/store/index.ts`: Manages AI settings (`aiSettings`) and persistent chat history.
- `/components/einstellungen/`: Various cards (`AiParametersCard.tsx`, `AiPersonaCard.tsx`) for configuring AI parameters.

---

## 3. Technical Features
 
 - **Visible Chain-of-Thought:** The AI uses a `<thought>` block to make its internal strategy and data analysis transparent to the user. This increases trust in AI decisions.
 - **Iterative ReAct Logic:** The assistant can collect data in up to 4 iterations before responding. This allows for dependencies between tools (e.g., web search first, then financial calculation).
 - **Context Slimming:** To use the token limit efficiently and avoid hallucinations, financial data is categorized in `aiContextService.ts` ("Slim Sections") and only sent in detail to the AI as needed.
 - **Agentic Search Retries:** For web search, the system performs up to 3 attempts with refined search terms if no results are returned.
 - **Security Layer:** Data changes are never applied directly but always pass through the `aiDiffService` and require user confirmation in the UI.
 - **Multilingual Support:** All agent prompts are optimized to detect the language of the user request and respond or critique in that language.
