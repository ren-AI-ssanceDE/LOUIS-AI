# LOUIS-AI v1.0.0 – The Local, Privacy-First AI Financial Planner for Businesses & Advisors

---
🇩🇪 **Suchen Sie die deutsche Dokumentation?** [Hier geht es zur deutschen Version (README.de.md)](./README.de.md)
---

[![License: GPL v3](https://img.shields.io/badge/License-GPLv3-blue.svg)](https://www.gnu.org/licenses/gpl-3.0)
[![Node.js](https://img.shields.io/badge/Node.js-%3E%3D%2020.0.0-green.svg)](https://nodejs.org/)
[![Vite](https://img.shields.io/badge/Vite-6.x-purple.svg)](https://vite.dev/)
[![React](https://img.shields.io/badge/React-18.x-blue.svg)](https://react.dev/)

https://github.com/user-attachments/assets/9c16dfcc-f9a0-4ab2-960c-05751dbfd479

---

### 🚀 Stop Excel Chaos & Cloud Data Leaks
Build bank-grade, institution-ready financial plans (optimized for investors and strict European funding bodies like KfW, BAFA, AVGS) 100% locally on your own infrastructure. Formerly a premium B2B SaaS—now fully open-source under GPLv3.

* **Battle-Tested:** In active production use by enterprises and startup consultants for over 12 months.
* **Data Sovereign:** Sensitive financial data, balances, and corporate strategies never leave your network.

---

## ⚡ Quick Start (Docker – Recommended)

Get LOUIS-AI up and running in less than 2 minutes, including a sandboxed, private local web search engine (**SearXNG**) out of the box:

```bash
# 1. Clone the repository and navigate into the folder
git clone <https://github.com/ren-AI-ssanceDE/LOUIS-AI> && cd louis-ai

# 2. Build and spin up the containers in the background
docker-compose up -d --build

```

Once deployed, open **http://localhost:3000** instantly in your browser.

---

## 📊 Core Features

### 1. Comprehensive Financial Modeling & Forecasting

* **Structured Workspace:** Guided entry flows for corporate metadata, granular pricing matrixes, sales volumes, OpEx, CapEx (asset schedules), and dynamic financing (equity & debt schedules).
* **P&L Statements (Ertragsplan):** Automatic real-time formulation and aggregation of monthly and yearly revenues, materials, personnel cost, operating expenses, interest, and depreciation.
* **Cash Flow Statements (Liquiditätsplan):** Live cash inflow/outflow calculations computing monthly liquidity surpluses, dynamic minimum reserves, and funding bottlenecks.
* **Depreciation Tables (Abschreibungsplan):** Integrated with standardized asset schedules (e.g., German AfA-Tables) to automate linear depreciation values and net book values over multiple planning years.
* **Scenario Comparison:** Establish independent business plans (*Best Case vs. Worst Case*) and evaluate key performance metrics, ROI, ROS, and cash runways side-by-side via interactive D3 charts.

### 2. Advanced Multi-Agent Autonomous AI Team

* **The Orchestrator (Louis Visionary):** The command center. Parses complex user input, classifies intent (`DATA_CHANGE`, `ANALYSIS`, `GENERAL`), maps execution paths, and triggers agent tools.
* **The Architect (Execution Assistant):** Runs specialized iterative loops using the ReAct model (up to 4 iterations). Consults local RAG data, fetches anonymized web data, and solves financial mathematical equations.
* **The Critic (Louis QA):** Automatically intercepts data proposals, audits generated arrays for physical and mathematical consistency, filters hallucinations, and enforces core business logic.
* **Visible Chain-of-Thought (CoT):** Strategic thinking, SWOT indicators, and financial reasoning are displayed transparently inside a collapsible UI `<thought>` toggle block.

### 3. Zero-Direct-Write Security Model

Absolute data integrity by design: The AI **cannot write directly** into your workspace database. Instead, it submits structured proposals analyzed and rendered in a **Visual JSON Diff Review Panel**. You inspect proposed financial changes line-by-line and accept or reject them with a single click (Human-in-the-Loop).

### 4. Air-Gapped Local RAG Engine

Upload internal enterprise data (PDF, DocX, Excel sheets) straight into your project context. Louis AI processes files completely offline via a secure local transformer pipeline (`@xenova/transformers`, MiniLM) and handles lightning-fast semantic searches using a local `lancedb` vector store.

---

## 🤖 Multi-Agent Workflow Diagram

```
[User Query] ──> [Orchestrator] ──> Identifies Intent (DATA_CHANGE, ANALYSIS, etc.)
                          │
                          ▼
               [ReAct Loop] (Up to 4 iterations)
               ├── Chat Memory & Context Summary
               ├── Web Search (SearXNG with automated fallback checks)
               ├── Knowledge Base RAG Search (LanceDB + Local Transformers)
               └── Financial Math KPI Calculator
                          │
                          ▼
             [Louis Architect] ──> Builds Thinking & Structured Data Draft
                          │
                          ▼
             [Louis QA Critic] ──> Validates Schema & Financial Soundness
                          │
                          ▼
             [Diff Review UI]  ──> Human Manual Approval ──> Persisted to SQLite DB!

```

---

## 🛠 Tech Stack

### Frontend (UI Layer)

* **Vite + React (TypeScript):** Ultrafast, strictly typed Single-Page Application interface.
* **State Management:** `Zustand` for unified, high-performance global states and action histories.
* **Data Visualization:** `Recharts` and `D3` for professional reactive financial analytics.
* **Localization:** Fully localized with `react-i18next` (English & German pre-configured).
* **Styling:** Modern, modular design engineered with Tailwind CSS.

### Backend (Server Layer)

* **Express (Node.js):** Directs API requests, secures environmental secrets, manages SMTP configurations, and handles file-system SQLite routing.
* **Databases:**
* **SQLite** (`better-sqlite3`) for robust, file-based persistence per project.
* **LanceDB** for embedded, serverless vector search.


* **LLM Engine Compatibility:** Out-of-the-box native integrations for:
* **Ollama:** Secure, locally-run open models (recommended: `qwen2.5:14b` or `mistral`).
* **Google Gemini API:** Utilizing the high-speed `@google/genai` TypeScript SDK.
* **OpenAI / Claude:** Global API endpoints supported.



---

## ⚙️ Alternative Manual Installation (Without Docker)

For detailed operating system requirements, please see [`INSTALL.md`](https://www.google.com/search?q=./INSTALL.md).

### Prerequisites

* **Node.js:** Version 20+ (LTS recommended)
* **Build Tools:** Python and C++ Compilers (GCC/Clang or MS Build Tools) to compile native addons (`better-sqlite3`, `lancedb`).

```bash
# 1. Install all dependencies
npm install

# 2. Build production assets
npm run build

# 3. Fire up development mode
npm run dev

```

### Configuration (.env)

Create a `.env` file in the root folder based on [`.env.example`](https://www.google.com/search?q=./.env.example):

```env
APP_URL="http://localhost:3000"
PROJECT_TOKEN="your_secure_project_token"
# GEMINI_API_KEY="AIzaSy..." # Optional, can also be supplied inside the UI admin panel

```

---

## 📄 License & Open-Source Terms

This software is licensed under the **GNU General Public License v3 (GPLv3)**.

* **Free as in Freedom:** Anyone is permitted to run, audit, modify, and redistribute LOUIS-AI.
* **Copyleft Obligations:** If you distribute modified versions of this software, or host modified versions of it as a paid online service (SaaS), you **MUST** publish your complete modified source code under the same GPLv3 license. Closed-source commercial forks are strictly prohibited.

---

## 💼 Enterprise Support & Customization

**LOUIS-AI is and will always remain 100% free.** However, if you require professional deployment assistance, integration into legacy ERP/banking software, or custom feature branches tailored to your corporate workflow, the official core maintainer is available for hire:

**ren-AI-ssance (Owner: Stefan Tusk)** *Pragmatic AI Solutions & Strategic Management Consulting.*

* **Website:** [https://ren-ai-ssance.de](https://ren-ai-ssance.de)
* **Email:** service@ren-ai-ssance.de
* **Contact:** Stefan Tusk

---

*Built with passion for data-sovereign corporate financial intelligence – www.ren-ai-ssance.de*
