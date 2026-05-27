# Louis AI — Intelligente Finanzplanung & Multi-Agenten-KI

[![License: GPL v3](https://img.shields.io/badge/License-GPLv3-blue.svg)](https://www.gnu.org/licenses/gpl-3.0)
[![Node.js](https://img.shields.io/badge/Node.js-%3E%3D%2020.0.0-green.svg)](https://nodejs.org/)
[![Vite](https://img.shields.io/badge/Vite-6.x-purple.svg)](https://vite.dev/)
[![React](https://img.shields.io/badge/React-18.x-blue.svg)](https://react.dev/)

**Louis AI** is a professional financial planning, forecasting, and business simulation workspace designed for startups, small businesses, and financial advisors. It empowers users to build rigorous multi-year financial forecasts, analyze cash flows, evaluate investment paths, and perform deep business simulation. 

With **Louis AI**, financial modeling is supercharged by an autonomous **Multi-Agent AI team** following the ReAct loop, backed by a local vector-database RAG engine (Retrieval-Augmented Generation) and secure Human-in-the-Loop validation.

---

## 🇩🇪 Zusammenfassung auf Deutsch

**Louis AI** ist ein hochintegriertes Finanzplanungs- und Simulationswerkzeug für Startups und kleine Unternehmen. Es automatisiert die Erstellung von Ertragsplänen, Liquiditätsplänen und Abschreibungsplänen über mehrere Jahre. Ein fortschrittlicher, mehrteiliger KI-Berater (Multi-Agenten-System mit Orchestrator, Architect und Critic) unterstützt Sie in Echtzeit bei Marktanalysen, SWOT-Auswertungen, Finanzrecherchen und dem automatisierten Ausfüllen von Finanzplanungs-Daten (durch menschlich abgenommene Diff-Echtzeitvorschläge).

---

## 🚀 Core Features

### 📊 Comprehensive Financial Planning & Derivations
*   **Structured Inputs**: Guided interfaces for foundation metadata, granular pricing, sales volumes, OpEx, CapEx (Capitals/Assets), and financing (equity/debt schedules).
*   **Ertragsplan (P&L Statements)**: Automatic real-time formulation and aggregation of monthly and yearly revenues, materials, personnel, operating costs, interest, and depreciation.
*   **Liquiditätsplan (Cash Flow Statements)**: Live cash inflows and outflows calculations, computing monthly liquidity surpluses, dynamic minimum reserves, and funding bottlenecks.
*   **Abschreibungsplan (Depreciation Table)**: Integrated with standard assets schedules (Afa-Tables) to compute linear depreciation values and book values over planning years.
*   **Scenario Comparison (Szenariovergleich)**: Establish independent business plans (e.g., *Best Case vs. Worst Case*) and compare key metrics, ROI, ROS, and liquidity pools side-by-side using fully interactive visual charts.

### 🤖 Advanced Agentic Multi-Agent AI System
*   **The Orchestrator (Louis Visionary)**: Acts as the command center. Analyzes complex requests, parses user intent (`DATA_CHANGE`, `ANALYSIS`, `GENERAL`), maps step-by-step plans, and triggers appropriate tool loops.
*   **The Architect / Execution Assistant**: Runs specialized tools iteratively (e.g., retrieving local RAG context, consulting external search engines, performing complex math calculations) in a ReAct model (up to 4 loops) before producing structured conclusions.
*   **The Critic (Louis QA)**: Automatically intercepts data manipulation, audits generated arrays/values for physical/mathematical consistency, filters out hallucinated models, and flags security issues.
*   **Visible Chain-of-Thought (CoT)**: Outlines the reasoning process, SWOT metrics, and strategic thinking directly in the UI in a transparent `<thought>` toggle block.

### 🔐 Zero-Direct-Write Security Model
To maintain absolute data integrity, the AI **cannot write directly** into your workspace databases. 
Instead, it submits structured proposals which are analyzed, compared, and formatted in a **Visual JSON Diff Review Panel**. You inspect the proposed changes line-by-line and can accept or reject them with a single click.

### 📚 RAG & Integrated Knowledge Base
Upload documents (PDF, DocX, Excel sheets) into your project's personal context. Louis AI parses them locally using a fully secure inline transformer pipeline (`@xenova/transformers`, MiniLM) and handles vector distance search via a local `lancedb` instance, bringing your business plans and custom industry indexes alive.

---

## 🛠 Tech Stack

### Frontend (User Interface)
*   **Vite + React (TypeScript)**: Ultrafast, reliable, and strictly typed SPA interface.
*   **State Management**: `Zustand` for reliable, unified global actions and persistent histories.
*   **Data Visualization**: `Recharts` and `D3` for professional reactive financial analytics.
*   **Internationalization**: Full `react-i18next` localized translation setup supporting English & German.
*   **Styling**: Modern, modular Tailwind CSS layout architecture.

### Backend (Server Layer)
*   **Express (Node.js)**: Proxies requests, protects API secrets, handles email SMTP setups, and directs SQLite database storage.
*   **Databases**: 
    *   **SQLite** (`better-sqlite3`) for robust, reliable local file persistence per project.
    *   **LanceDB** + local mini-transformer pipeline for on-device vector storage.
*   **AI Integration**: Out-of-the-box integration for:
    *   **Google Gemini API**: Utilizing the modern, high-speed `@google/genai` TypeScript SDK.
    *   **Ollama**: Secure, locally-run open LLMs (like `qwen2.5:14b` or `mistral`).
    *   **OpenAI / Claude**: Third-party API support.
*   **Integrated Search**: Connects securely to `SearXNG` instances for real-time market data retrieval.

---

## 📦 Installation & Quick Start

Please read [`INSTALL.md`](./INSTALL.md) for deeper details on different OS platforms. Here is the fast track:

### Option A: Local Run (Node.js)

#### 1. Requirements
*   **Node.js**: Version 20+ (LTS recommended)
*   **Build Tools**: Python and C++ compilers (such as GCC/Clang or MS Build tools) for compilations of native addons (`better-sqlite3`, `lancedb`).

#### 2. Get the Source & Build
```bash
# Clone the repository
git clone <your-repo-url>
cd louis-ai

# Install all npm dependencies
npm install

# Build static assets & server files
npm run build
```

#### 3. Start Development Mode
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

### Option B: Docker Containers (Recommended for SearXNG Integration)

Louis AI provides a reliable, multi-container Docker compose setup, packing SearXNG for sandboxed, private web searches out of the box.

```bash
# Build and spin containers in background
docker-compose up -d --build
```
The workspace will be running immediately at [http://localhost:3000](http://localhost:3000).

---

## ⚙ Config & Environment Variables

Create a `.env` file in the root folder based on [`.env.example`](./.env.example):

```env
# The URL where this app is hosted (optional in cloud setups, useful for OAuth/callbacks)
APP_URL="http://localhost:3000"

# Optional security token protecting API access
PROJECT_TOKEN="your_secure_project_token"

# Optional Google Gemini API Key (Can be supplied directly in the UI as well)
# GEMINI_API_KEY="AIzaSy..."
```

*(Note: API keys can also be fed dynamically details inside the application's Admin Settings Panel to prevent keeping credentials in raw files).*

---

## 🤖 Multi-Agent Workflow Diagram

```
[User Query] ──> [Orchestrator] ──> Intents identified (DATA_CHANGE, ANALYSIS, etc.)
                      │
                      ▼
               [ReAct Loop] (Up to 4 iterations)
               ├── Chat Memory & Summary
               ├── Web Search (SearXNG with retry checks)
               ├── Knowledge Base RAG Search (LanceDB + Transformers)
               └── Financial Math KPIs calculator
                      │
                      ▼
             [Louis Architect] ──> Builds Thinking and Draft Response
                      │
                      ▼
             [Louis QA Critic] ──> Checks schema constraints & financial soundness
                      │
                      ▼
             [Diff Review UI] ──> Human approves changes ──> Saved to SQLite!
```

---

## 📄 License & Commercial Restrictions

This software is licensed under the **GNU General Public License v3 (GPLv3)**.

### Key Terms (GPLv3):
*   **Free as in Freedom**: Anyone is allowed to run, inspect, share, copy, and modify Louis AI.
*   **Must Share Source**: If you distribute modified versions of this software, or host modified versions of it as a paid online service (SaaS), you **MUST** publish your complete modified source code under the same GPLv3 Copyleft license. You cannot make closed-source commercial forks of this tool.
*   **No Warranties**: Released in hope of usefulness, but without any warranties.

For full license details, please see the [`LICENSE`](./LICENSE) file in the root of this repository.

---

*Crafted and compiled by — www.ren-ai-ssance.de*
