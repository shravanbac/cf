# ContentFlow — AEM Rockstar 2026

Enterprise content operations accelerator. From request to launch, fully automated.

**Live URL:** `https://main--contentflow--shravanbac.aem.page/`

## Tech Stack
- **Authoring:** DA.live (`da.live/shravanbac/contentflow`)
- **Delivery:** Adobe Edge Delivery Services
- **Automation:** Workfront + Fusion + I/O Runtime + Firefly Services

## Setup

1. Create repo `shravanbac/contentflow` on GitHub
2. Push this code to `main` branch
3. Author content in DA.live at `da.live/shravanbac/contentflow`
4. Preview at `https://main--contentflow--shravanbac.aem.page/`

## Block Map

| Section | Block Name | Files |
|---------|-----------|-------|
| Navigation | `header` (auto) | `blocks/header/` |
| Hero + Pipeline | `hero` + `pipeline` | `blocks/hero/`, `blocks/pipeline/` |
| Solution Steps | `solution` | `blocks/solution/` |
| Deliverables | `deliverables` | `blocks/deliverables/` |
| Tech Stack | `tech-stack` | `blocks/tech-stack/` |
| Backstory | `backstory` | `blocks/backstory/` |
| Team | `team` | `blocks/team/` |
| Terminal | `terminal` | `blocks/terminal/` |
| Launch Form | `launch-form` | `blocks/launch-form/` |
| Footer | `footer` (auto) | `blocks/footer/` |

## DA.live Authoring Guide

### `/nav` page
Create a page named `nav` with:
- A list of navigation links (Solution, Deliverables, Tech Stack, etc.)

### `/footer` page
Create a page named `footer` with:
- A paragraph: `ContentFlow by **Cognizant** — Built for AEM Rockstar 2026`

### `/index` page
The main landing page. Each section is authored as a block table in DA.live.
See individual block READMEs for authoring instructions.
