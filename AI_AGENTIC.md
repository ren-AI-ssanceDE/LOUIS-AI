# Documentation: Louis AI Agentic Workflow

This file describes in detail the agentic workflow, the involved agents, tools, and processes within the Louis AI Assistant.

## 1. Philosophical Approach
Louis AI follows an **Agentic Flow** model. Unlike simple chatbots, Louis AI acts as an autonomous advisor that first plans, then gathers information (Tools), analyzes it, and finally develops a solution proposal under strict quality control (Critic).

---

## 2. Agent Roles

### A. The Orchestrator (Louis Visionary)
*   **File:** `/components/ai/agents/Orchestrator.ts`
*   **Task:** The "brain" of the system. Operates according to the **ReAct principle (Reasoning + Acting)**.
*   **Process:**
    1. Analyzes the user request and previous progress (iterative).
    2. Identifies the intent: `DATA_CHANGE`, `ANALYSIS`, or `GENERAL`.
    3. Decides whether the system is "done" (`isComplete`) or requires additional tools.
    4. Dynamically selects the next tools based on intermediate results.

### B. The Assistant (Louis Architect / Engine)
*   **File:** Managed via `/hooks/useAiAssistant.ts` & `/services/aiService.ts`
*   **Task:** The executive unit. Executes tools in a loop (iteration) and collects results in the `executionContext`. Finally synthesizes the final response.

### C. The Critic (Louis QA / Critic)
*   **File:** `/components/ai/agents/Critic.ts`
*   **Task:** The quality control instance. Checks every solution proposal containing data changes before it is presented to the user. It acts multilingually and adapts its critique to the language of the request.
*   **Audit Criteria:**
    - Mathematical correctness of financial data.
    - Logical consistency with the user request.
    - Avoidance of hallucinations (no fabricated data for missing search results).
    - Compliance with security and schema rules.

---

## 3. The Tools

The agents have access to specialized tools via the `/components/ai/tools/` interfaces:

1.  **Thinking Tool:**
    - Utilizes the full capacity of the LLM for complex strategic analyses (e.g., SWOT, strategy development) based on *internal* project data.
2.  **Web Search Tool (SearXNG):**
    - Researches real-time market data, competitor prices, or trends on the internet.
    - *Special Feature:* Includes an automatic retry mechanism (up to 3 attempts) for empty results.
3.  **Local Knowledge Tool (RAG):**
    - Searches documents uploaded by the user (PDFs, Excel, etc.) using vector search.
4.  **Financial Architect Tool:**
    - The most powerful tool for manipulating the financial model. Analyzes the current structure and prepares data changes.
5.  **Persona Tool:**
    - Allows Louis AI to adopt different specialist roles (e.g., critical bank advisor, optimistic investor).

---

## 4. Execution Workflow (Iterative/ReAct)

A typical run of a request looks as follows:

1.  **Trigger:** The user sends a message.
2.  **Iterative Planning (Orchestrator):**
    - The Orchestrator receives the message and previous intermediate results.
    - It generates an intermediate plan (e.g., first `web_search`).
3.  **Tool Execution:**
    - The system executes the tools.
    - Results are carried over into the context for the next iteration.
4.  **Re-Evaluation:**
    - The Orchestrator checks: "Is there enough data (search results + finance summary)?"
    - If no: Next iteration (e.g., `financial_architect`).
    - If yes: `isComplete: true`.
5.  **Drafting & Thinking:**
    - The Louis Architect creates the final draft response.
    - A **visible Chain-of-Thought** is generated in the `<thought>` block to make the logic behind the response transparent.
6.  **Critique Loop:**
    - The Critic agent checks the draft for errors or inconsistencies.
7.  **Presentation:**
    - The user sees the response and can expand the thinking process if needed.
    - Data changes are visualized via the review panel.

---

## 5. Security Mechanisms

- **Zero-Direct-Write:** The AI can never write directly to the database. All changes go through a diff service and human confirmation.
- **Strict Schema Enforcement:** The AI is limited to the `schema.ts` by system prompts and the Critic.
- **Refined Search:** Prevents the AI from "inventing" data if the search is unsuccessful.

---
*Documentation Status: May 2026 (Updated)*
