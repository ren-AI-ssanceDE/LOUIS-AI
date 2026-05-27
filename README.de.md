# LOUIS-AI v1.0.0 – Der lokale, datenschutzkonforme KI-Finanzplaner für Unternehmen & Berater

[![License: GPL v3](https://img.shields.io/badge/License-GPLv3-blue.svg)](https://www.gnu.org/licenses/gpl-3.0)
[![Node.js](https://img.shields.io/badge/Node.js-%3E%3D%2020.0.0-green.svg)](https://nodejs.org/)
[![Vite](https://img.shields.io/badge/Vite-6.x-purple.svg)](https://vite.dev/)
[![React](https://img.shields.io/badge/React-18.x-blue.svg)](https://react.dev/)

---

### 🇩🇪 Auf einen Blick (Deutsch)
**Schluss mit Excel-Chaos und Cloud-Risiken.** Erstellen Sie bankensichere, förderfähige Finanzplanungen (für KfW, BAFA, AVGS, Investoren) zu 100% lokal auf Ihrer eigenen Infrastruktur. Früher eine kostenpflichtige B2B-SaaS – jetzt vollständig Open-Source unter GPLv3.
* **Praxiserprobt:** Seit über 12 Monaten im produktiven Einsatz bei Unternehmen und Gründungsberatern.
* **Datensouverän:** Sensible Finanzdaten verlassen niemals Ihr System.

### 🇬🇧 Overview (English)
**Louis AI** is a professional financial planning, forecasting, and business simulation workspace designed for startups, SMEs, and financial advisors. Build rigorous multi-year financial forecasts, analyze cash flows, and evaluate investment paths – supercharged by an autonomous **Multi-Agent AI team** (ReAct loop), a local vector RAG engine, and secure Human-in-the-Loop validation.

---

## 🚀 Quick Start (Docker – Empfohlen)

Bringen Sie LOUIS-AI inklusive lokaler, anonymisierter Websuche (**SearXNG**) in weniger als 2 Minuten an den Start:

```bash
# 1. Repository klonen und in den Ordner wechseln
git clone <https://github.com/ren-AI-ssanceDE/LOUIS-AI> && cd louis-ai

# 2. Container im Hintergrund bauen und starten
docker-compose up -d --build

```

Öffnen Sie danach sofort **http://localhost:3000** in Ihrem Browser.

---

## 📊 Kern-Features & Funktionen

### 1. Ganzheitliche Finanzplanung & Berechnungen

* **Strukturierte Erfassung:** Geführte Interfaces für Stammdaten, granulare Preismodelle, Absatzvolumen, OpEx, CapEx (Anlagenspiegel) und Finanzierungen (Eigen- und Fremdkapital).
* **Ertragsplan (P&L Statements):** Automatische Echtzeit-Ermittlung und Aggregation von monatlichen/jährlichen Umsätzen, Material, Personal, Betriebskosten, Zinsen und Abschreibungen.
* **Liquiditätsplan (Cash Flow):** Live-Berechnung von Zu- und Abflüssen zur Identifikation von Liquiditätsüberschüssen oder potenziellen Finanzierungsengpässen.
* **Abschreibungsplan (Afa-Tables):** Integrierte Standard-Abschreibungstabellen zur automatischen linearen Berechnung von Buchwerten über die Planungsjahre.
* **Szenarienvergleich:** Erstellen Sie unabhängige Planungen (*Best Case vs. Worst Case*) und vergleichen Sie Kennzahlen, ROI, ROS und Liquidität direkt in interaktiven Charts.

### 2. Fortgeschrittenes Multi-Agenten-KI-System

* **The Orchestrator (Louis Visionary):** Die Kommandozentrale. Analysiert Nutzeranfragen, klassifiziert die Intention (`DATA_CHANGE`, `ANALYSIS`, `GENERAL`) und delegiert Aufgaben an spezialisierte Agenten.
* **The Architect (Execution Assistant):** Arbeitet iterativ in einer ReAct-Schleife (bis zu 4 Loops), durchsucht die lokale Wissensdatenbank (RAG) oder das Web und führt komplexe mathematische Kalkulationen durch.
* **The Critic (Louis QA):** Fängt Datenmanipulationen ab, prüft Arrays/Werte auf mathematische und logische Konsistenz, eliminiert Halluzinationen und sichert die Business-Logik.
* **Transparente Denkprozesse:** Die "Chain-of-Thought" (CoT), SWOT-Metriken und strategische Überlegungen sind in der UI jederzeit über ein `<thought>`-Toggle einsehbar.

### 3. Zero-Direct-Write Sicherheitsmodell

Absolute Datenintegrität: Die KI kann **niemals direkt** in Ihre Projektdatenbank schreiben. Stattdessen generiert das System strukturierte Vorschläge, die Ihnen in einem **Visual JSON Diff Review Panel** Zeile für Zeile angezeigt werden. Sie behalten die volle Kontrolle (Human-in-the-Loop) und nehmen Änderungen mit einem Klick an oder lehnen sie ab.

### 4. Lokales RAG & Wissensbasis

Laden Sie interne Dokumente (PDF, DocX, Excel) direkt in das Projekt. Louis AI verarbeitet diese vollkommen autark und sicher direkt auf Ihrem Gerät mittels einer Inline-Transformer-Pipeline (`@xenova/transformers`, MiniLM) und speichert die Vektoren in einer lokalen `lancedb`-Instanz.

---

## 🤖 Multi-Agenten Workflow-Diagramm

```
[Nutzeranfrage] ──> [Orchestrator] ──> Erkennt Intent (DATA_CHANGE, ANALYSIS, etc.)
                          │
                          ▼
               [ReAct Schleife] (Bis zu 4 Iterationen)
               ├── Chat-Historie & Zusammenfassung
               ├── Websuche (SearXNG mit automatischen Fail-Checks)
               ├── Wissensbasis (RAG via LanceDB + Transformers)
               └── Finanzmathematischer KPI-Kalkulator
                          │
                          ▼
             [Louis Architect] ──> Erstellt Lösungsansatz & Datenentwurf
                          │
                          ▼
             [Louis QA Critic] ──> Validiert Schema & finanzmathematische Korrektheit
                          │
                          ▼
             [Diff Review UI]  ──> Manuelle Freigabe durch Nutzer ──> SQLite DB!

```

---

## 🛠 Tech Stack

### Frontend (UI Layer)

* **Vite + React (TypeScript):** Ultraschnelles, typensicheres Single-Page-Application Interface.
* **State Management:** `Zustand` für performante, zentrale Actions und persistente Historien.
* **Visualisierung:** `Recharts` und `D3` für reaktive, professionelle Finanzgrafiken.
* **Lokalisierung:** Vollständiges `react-i18next` Setup (Deutsch & Englisch vorkonfiguriert).
* **Styling:** Modernes, modulares Layout via Tailwind CSS.

### Backend (Server Layer)

* **Express (Node.js):** Proxy für Anfragen, Schutz von API-Secrets, SMTP-Schnittstelle und Steuerung der Datenhaltung.
* **Datenbanken:**
* **SQLite** (`better-sqlite3`) für robuste, dateibasierte Ausfallsicherheit pro Projekt.
* **LanceDB** für blitzschnelle, lokale Vektorsuche auf dem Endgerät.


* **KI-Schnittstellen (LLMs):** native Integration für:
* **Ollama:** Für 100% lokale Open-Source LLMs (empfohlen: `qwen2.5:14b` oder `mistral`).
* **Google Gemini API:** Über das moderne `@google/genai` TypeScript SDK.
* **OpenAI / Claude:** Support für gängige Drittanbieter-APIs.



---

## ⚙️ Alternative Installation (Ohne Docker)

Details für verschiedene Betriebssysteme finden Sie in der [`INSTALL.md`](https://www.google.com/search?q=./INSTALL.md).

### Voraussetzungen

* **Node.js:** Version 20+ (LTS empfohlen)
* **Build Tools:** Python und C++ Compiler (GCC/Clang oder MS Build Tools) zur Kompilierung nativer Addons (`better-sqlite3`, `lancedb`).

```bash
# 1. Abhängigkeiten installieren
npm install

# 2. Build erstellen
npm run build

# 3. Entwicklungsmodus starten
npm run dev

```

### Konfiguration (.env)

Erstellen Sie eine `.env`-Datei im Root-Verzeichnis basierend auf der [`.env.example`](https://www.google.com/search?q=./.env.example):

```env
APP_URL="http://localhost:3000"
PROJECT_TOKEN="Ihr_sicherer_projekt_token"
# GEMINI_API_KEY="AIzaSy..." # Optional, kann auch direkt in der UI hinterlegt werden

```

*Hinweis: API-Keys können sicher über das Admin-Panel in der UI eingepflegt werden, um Passwörter in Rohdateien zu vermeiden.*

---

## 📄 Lizenz & Open-Source Bedingungen

Diese Software ist lizenziert unter der **GNU General Public License v3 (GPLv3)**.

* **Freiheit des Codes:** Jeder darf LOUIS-AI ausführen, analysieren, modifizieren und verbreiten.
* **Copyleft-Pflicht:** Wenn Sie modifizierte Versionen dieser Software verbreiten oder als kostenpflichtigen Onlinedienst (SaaS) anbieten, **MÜSSEN** Sie den gesamten modifizierten Quellcode unter derselben GPLv3-Lizenz öffentlich zugänglich machen. Geschlossene kommerzielle Forks sind ausgeschlossen.

---

## 💼 Enterprise Support & Individualisierung

**LOUIS-AI ist und bleibt zu 100% kostenlos.** Wenn Sie das System jedoch professionell in Ihre Unternehmensprozesse integrieren möchten, Unterstützung beim Deployment benötigen oder maßgeschneiderte Zusatzfunktionen (z.B. native ERP-/Schnittstellen-Anbindungen) brauchen, steht Ihnen der offizielle Core-Maintainer zur Verfügung:

**ren-AI-ssance (Inh. Stefan Tusk)** *Praxisnahe KI-Lösungen & strategische Unternehmensberatung.*

* **Webseite:** [https://ren-ai-ssance.de](https://ren-ai-ssance.de)
* **E-Mail:** service@ren-ai-ssance.de
* **Ansprechpartner:** Stefan Tusk

---

*Entwickelt mit Leidenschaft für datensouveräne Unternehmensführung – www.ren-ai-ssance.de*
