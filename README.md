# Mesabi Metallics AI-native Pit-to-Pellet Operating Brain — AIonOS Static Demo

A GitHub Pages-ready frontend demo tailored to Mesabi Metallics and the attached AIonOS deck narrative.

## What this demo shows

- AI-native construction-to-operations handoff for mining, beneficiation and pellet production
- Low-data first wave: readiness, commissioning evidence, SOP/training and mechanical completion agents
- Ramp-up pilots: pellet quality prediction, crusher/conveyor reliability, fleet queue optimization and ESG sentinels
- Geology workflow: drillhole QAQC, model confidence, resource scenario book and drill program optimizer
- Processing workflow: ore blend, P80, silica, Fe grade, moisture and pellet-strength simulation
- Video twin: provided mining video embedded with AI overlays and live scenario narration
- Human-governed agent actions: every recommendation has an owner, KPI, evidence artifact and approval route
- Copilot and evidence vault: RAG-style answers plus generated deliverable catalogue
- Export/import JSON so the full scenario is reproducible with no backend

> Important: This is synthetic demo data and a consultative reference implementation. It contains no Mesabi operational data and should not be treated as mining, safety, engineering, ESG or legal advice.

## How to run locally

The app fetches `data/demo-data.json`, so run it through a static server.

### Option 1: Python static server

```bash
cd Mesabi-AIonOS-Agentic-Demo
python -m http.server 8080
```

Open:

```text
http://localhost:8080
```

### Option 2: Vite dev server

```bash
npm install
npm run dev
```

## How to deploy on GitHub Pages using the web UI

1. Create a new GitHub repository.
2. Upload all files and folders from this repo zip to the repository root.
3. Go to **Settings → Pages**.
4. Under **Build and deployment**, select **Deploy from a branch**.
5. Select branch: `main`; folder: `/root`.
6. Wait for GitHub Pages to publish and open the generated URL.

## Demo storyline

1. Open with the Mission Control page and explain the operating loop: Detect → Diagnose → Simulate → Recommend → Approve → Learn.
2. Press **Start Mesabi scenario**.
3. Show the provided mining video running inside the Video Twin with AI overlays for haul lane, stockpile boundary, equipment movement and dust plume proxy.
4. Move to the Readiness Tower and click **Generate readiness pack**.
5. Show the Pellet Quality panel: off-spec risk is explained using P80, silica and moisture signals.
6. Show the Geology AI panel: QAQC exception register, model confidence heat map, resource scenario book and drill optimization.
7. Show Reliability + ESG and Governance: each action has owner, KPI, evidence and approval route.
8. End with the 90-Day PoV and Copilot questions to secure approval for a focused Proof of Value.

## File structure

```text
Mesabi-AIonOS-Agentic-Demo/
  index.html
  styles.css
  app.js
  package.json
  data/
    demo-data.json
  assets/
    mesabi_pit_to_pellet_feed.mp4
  docs/
    demo-script.md
```

## What to emphasize to Mesabi

- It does not replace SAP, FMS, SCADA, LIMS, CMMS or GIS; it creates a governed agentic layer above them.
- It starts with high-confidence, low-data use cases while Mesabi is moving from construction to operations.
- It produces tangible outputs: Word/PDF, Excel/CSV, PPT, DXF/SVG/GIS-style artifacts, schedules, BI-ready datasets and audit logs.
- The 90-day PoV is designed to prove value with working agents, not slideware.
