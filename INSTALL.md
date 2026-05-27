# Installation Guide - Louis-AI

This guide describes the installation and setup of **Louis-AI**, a professional financial planning tool.

## Prerequisites

Ensure the following components are installed on your system:

*   **Node.js**: Version 20 or higher (LTS recommended).
*   **npm**: Usually installed with Node.js.
*   **Build Tools**: Python and a C++ compiler are required for native dependencies (`better-sqlite3`, `lancedb`).
*   **AI Backend**: Access to an AI interface (e.g., Google Gemini, Ollama, or OpenAI-compatible APIs).

---

## Installation on Windows

1.  **Clone the Repository**:
    ```bash
    git clone <repository-url>
    cd louis-ai
    ```

2.  **Install Build Tools**:
    Open PowerShell as Administrator and run:
    ```powershell
    npm install --global windows-build-tools
    ```
    *Alternatively*: Install "Desktop development with C++" via the Visual Studio Installer.

3.  **Install Dependencies**:
    ```bash
    npm install
    ```

4.  **Start the Application**:
    ```bash
    npm run dev
    ```

---

## Installation on Linux (Ubuntu/Debian)

1.  **Install System Dependencies**:
    ```bash
    sudo apt-get update
    sudo apt-get install -y build-essential python3 g++ make
    ```

2.  **Clone the Repository**:
    ```bash
    git clone <repository-url>
    cd louis-ai
    ```

3.  **Install Dependencies**:
    ```bash
    npm install
    ```

4.  **Start the Application**:
    ```bash
    npm run dev
    ```

---

## Installation with Docker

Louis-AI provides a pre-configured Docker environment including SearXNG for web search.

> 💡 **Hinweis zum ZIP-Export (AI Studio)**: Beim Exportieren als ZIP-Archiv filtert AI Studio Dateien mit dem Namen `Dockerfile` manchmal automatisch heraus. Kopiere oder benenne einfach die mitgelieferte Datei `Dockerfile.local` um zu `Dockerfile`, bevor du den Build startest!
>
> ```bash
> cp Dockerfile.local Dockerfile
> ```

1.  **Prerequisite**: Docker und Docker Compose müssen installiert sein.

2.  **Container erstellen und starten**:
    ```bash
    docker-compose up -d --build
    ```

3.  **Anwendung aufrufen**:
    Die App ist lokal unter `http://localhost:3000` erreichbar.

---

## Lokales RAG (Vektorsuche) & Provider-Auswahl

Louis-AI verfügt über einen hochentwickelten, ausfallsicheren Embedding-Generator:

1. **Kein Key & Keine Modelle? (Ausfallsicherer Fallback)**:
   * Wenn kein Gemini-Key vorhanden ist und du offline arbeiten möchtest, greift automatisch das **lokale Zero-Dependency Wort-Hashing** (Random Indexing).
   * Dies erfordert **keine** Internetverbindung, lädt **keine** riesigen Modelle im Hintergrund runter, spart RAM/CPU und stellt sicher, dass Dokumenten-Uploads und Suchen lokal sofort und fehlerfrei funktionieren!
2. **Lokaler Transformers.js (Standard)**:
   * Standardmäßig wird versucht, das all-MiniLM-L6-v2-Modell lokal in-memory auszuführen.
3. **Externe APIs**:
   * Du kannst in den Einstellungen jederzeit deinen **Gemini-Key** eingeben oder **OpenAI** / **Ollama** konfigurieren, um hochpräzise Embeddings zu generieren.

---

## Configuration

Most settings are managed directly within the **Louis-AI** user interface.

1.  Start the application and navigate to **Settings**.
2.  Here you can provide the following data:
    *   **AI Interface**: Enter your `GEMINI_API_KEY` or other API credentials.
    *   **Search**: Configure the URL to your SearXNG instance or other search providers.

### Environment Variables (Optional)

If you need specific host settings, you can create a `.env` file:

```bash
cp .env.example .env
```

The `APP_URL` variable is automatically set in cloud environments but can be manually adjusted for local testing.

---

## Getting Started

1.  After starting the application, open `http://localhost:3000` in your browser.
2.  Create a new project or load an example project.
3.  Use the AI Assistant on the right side to refine your business plan.
4.  Documents for the knowledge base (RAG) can be uploaded in the "Knowledge" section.

---

## Troubleshooting

### Issues installing `better-sqlite3`
This is usually due to missing build tools. Ensure that Python and a C++ compiler (GCC/Clang on Linux, MSVC on Windows) are correctly installed.

### Vector Database (LanceDB)
LanceDB requires a modern Node.js environment. If errors occur, check if your Node version is up to date.
