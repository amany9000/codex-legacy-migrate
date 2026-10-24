---
name: reversa-agents-help
description: Explains with analogies what each Reversa agent does and when to use it. Activate with /reversa-agents-help.
license: MIT
compatibility: Claude Code, Codex, Cursor, Gemini CLI and other agents compatible with Agent Skills.
metadata:
  author: sandeco
  version: "1.0.0"
  framework: reversa
  role: help
---

Present exactly the text below, without changes, without summarizing.

---

# Reversa agents: a guide with analogies

Reversa is a team of specialists. Each agent does one thing only, and does it well.

---

## Main menu

| What do you want to do? | Command | Team |
|---|---|---|
| Discover and document a legacy system | `/reversa` | Reversa Agents Core |
| Clarify the idea before any code | `/reversa-brainstorm` | Ideation Agents |
| Create a new project from an idea | `/reversa-new` | Code New Project Agents |
| Implement or evolve code from the specs | `/reversa-forward` | Code Forward Agents |
| Plan the migration of a legacy system | `/reversa-migrate` | Migration Agents |
| Generate a visual documentation mini-site | `/reversa-docs` | Documentation Agents |
| Find out how to sell and how much to charge for the software or a feature | `/reversa-pricing` | Pricing and Size Agents |
| Design, critique, audit or polish a front-end interface | `/impeccable` | Front-end Team (Impeccable) |
| Find out which agent to use | `/reversa-agents-help` | Agent guide |

The Pricing team enters through `/reversa-pricing`. Translators use `/reversa-n8n`.

---

## 💡 Reversa Brainstorm, the table before the build
**Command:** `/reversa-brainstorm`

Before the bricklayer raises a wall, someone sits at the table and asks what the house is for: who it is for, what hurts about living in it as it is today, what the possible paths are, what could go wrong. Nobody draws a floor plan at that table. They only decide what is worth building.

> Use Reversa Brainstorm when the idea is still raw, in a new project or a legacy one. It runs `Framer → Explorer → Challenger → Arbiter → Pre-Spec` and hands the result to `/reversa-new` (greenfield) or `/reversa-requirements` (legacy).

**The five at the table:**

| Agent | Analogy | Command |
|---|---|---|
| **Framer** | The doctor who won't accept "I want drug X" and asks where it hurts | `/reversa-framer` |
| **Explorer** | The guide who shows every trail, including not climbing the mountain | `/reversa-explorer` |
| **Challenger** | The devil's advocate who has seen this project fail before | `/reversa-challenger` |
| **Arbiter** | The judge who gives the verdict and owns what is lost with it, but you decide | `/reversa-arbiter` |
| **Pre-Spec** | The clerk who hands over the minimum for the build to start, and nothing more | `/reversa-pre-spec` |

---

## 🆕 Reversa New: the product founder
**Command:** `/reversa-new`

The founder starts with a still-raw idea, investigates the problem, understands who the product exists for, consolidates a PRD and turns it all into implementation-ready specifications.

> Use Reversa New for greenfield projects. It runs `Ideator → Researcher → Drafter → Spec SDD` and hands the result to `/reversa-forward`.

---

## 🎼 Reversa: the central orchestrator
**Command:** `/reversa`

An orchestra conductor doesn't play any instrument. They know the whole score and say who comes in when, in what order, at what pace. Without them, each musician would play their part without connecting to the others.

> Use Reversa to start or resume the full analysis. It handles the sequence for you.

---

## 🗺️ Scout: the real estate agent
**Command:** `/reversa-scout`

The agent gives the first tour of the property. They don't open drawers, read documents or touch anything. They only map: how many rooms, which neighborhood, what installations exist, the overall condition.

> Use the Scout at the start. It produces the project inventory (languages, frameworks, modules, dependencies) without going into the code.

---

## 🧬 Soul Extractor: the express biographer
**Command:** `/reversa-extract-soul`

The express biographer visits the subject, reads the agent's (Scout's) notes, quickly flips through a few family albums and the letter history (git log), and produces a one-page biography: who they are, what they do, and the founding decisions that shaped their whole life. It is not the full story; it is the distilled soul.

> Use the Soul Extractor right after the Scout, when you want an executive synthesis of the system (purpose, central entities and founding decisions) in a single Spec, without waiting for the whole pipeline. It does not replace the Archaeologist or the Detective.

---

## ⛏️ Archaeologist: the excavator
**Command:** `/reversa-archaeologist`

The archaeologist digs the site patiently, layer by layer. They catalog each artifact found: size, material, location, shape. They don't interpret the civilization; they only describe precisely what is there.

> Use the Archaeologist to analyze the code module by module. It extracts functions, algorithms, data structures and control flows. **It runs one module per session** to save tokens.

---

## 🔍 Detective: Sherlock Holmes
**Command:** `/reversa-detective`

Sherlock Holmes arrives after the archaeologist. He looks at the cataloged artifacts and asks: *"But why is this here? Who put it here? What does it reveal about who lived here?"* He doesn't dig. He interprets.

> Use the Detective after the Archaeologist. It extracts implicit business rules, reads the git history like a diary and reconstructs decisions nobody documented.

---

## 📐 Architect: the cartographer
**Command:** `/reversa-architect`

The cartographer visits a territory and produces formal maps: floor plan, elevation map, structural plan. Someone who has never set foot there can understand everything by looking at the maps.

> Use the Architect after the Detective. It synthesizes everything into C4 diagrams, a full ERD and an integration map.

---

## 📝 Writer: the notary
**Command:** `/reversa-writer`

The notary turns what was discovered into formal, precise and traceable contracts. Each clause has a declared degree of certainty. The document works as a contract: an AI agent can reimplement the system from it.

> Use the Writer after the Architect. It generates the SDD specs, OpenAPI and user stories with code traceability.

---

## ⚖️ Reviewer: the spec reviewer
**Command:** `/reversa-reviewer`

The Reviewer takes the Writer's contracts and tries to poke holes in them: *"This is a contradiction. This point has no proof. This rule disappears if the user does X."* It doesn't want to destroy; it wants to make sure what is left standing is solid.

> Use the Reviewer after the Writer. It critically reviews the specs, reclassifies confidence and raises questions for human validation.

---

## 🖼️ Visor: the forensic illustrator
**Command:** `/reversa-visor`

The forensic illustrator works only with images. They receive screenshots of the system and faithfully reconstruct the interface: screens, forms, navigation flows. The system doesn't need to be running; only the photos are needed.

> Use the Visor when screenshots are available. It documents the UI without needing access to the system.

---

## 🗄️ Data Master: the geologist
**Command:** `/reversa-data-master`

The geologist maps the subsoil, the layer nobody sees but that holds everything up. Tables, relationships, constraints, triggers, procedures. The invisible foundation the application is built on.

> Use the Data Master when DDL, migrations or ORM models are available. It documents the database completely.

---

## 🎨 Design System: the stylist
**Command:** `/reversa-design-system`

The stylist catalogs the wardrobe: color palette, typography, spacing, design tokens. The "fashion rules" that govern the system's look: what can and cannot be combined.

> Use Design System when there are CSS files, themes or interface screenshots. It extracts the project's visual tokens.

---

## 🕸️ Code graph: the city map
**Commands:** `/reversa-graph-builder`, `/reversa-graph-navigator`

Before sending the team into an unfamiliar city, someone hands out a map with every street and every connection. Nobody has to walk every block to find the right address.

> `/reversa` builds the graph automatically (AST or semantic, your choice) before the first agent runs, and every agent queries it before reading code. Run `/reversa-graph-builder` directly to rebuild it, or with `off`/`on` to switch graph mode.

---

## 💰 Reversa Pricing: the pricing consultant
**Command:** `/reversa-pricing`

A good pricing consultant doesn't start with the number. First they ask how you want to sell: built to order for one client, as a license, rental, subscription or in an app store. Only once the model is known do they call each specialist: who researches the market, who notes how you charge, who measures the build, who puts together the quote and who calculates how many customers pay the bill. In the end you never get a single number: you get ranges, scenarios and what each price requires.

> Use Reversa Pricing when you want to know how much to charge for the software or a feature, whether you're a beginner or experienced. It detects where you stopped in `_pricing/` and runs `Advisor → Profile → Product` (product) or `Size → Estimate` (service, per feature). Research comes in when you'd rather research than provide the data.

**The six specialists:**

| Agent | Analogy | Command |
|---|---|---|
| **Advisor** | The consultant who asks how you want to sell before talking numbers | `/reversa-pricing-advisor` |
| **Research** | The researcher who goes to the market and comes back with a range, source and date | `/reversa-pricing-research` |
| **Profile** | The accountant who notes how you charge, or researches it for you | `/reversa-pricing-profile` |
| **Size** | The engineer who measures the build from the plan, not by the brick | `/reversa-pricing-size` |
| **Estimate** | The estimator who delivers three scenarios, never a single number | `/reversa-pricing-estimate` |
| **Product** | The planner who says how many customers pay the bill at each price | `/reversa-pricing-product` |

---

## 🎨 Impeccable: the front-end art director
**Command:** `/impeccable`

An award-winning art director doesn't accept the template everyone uses. They look at the screen you already have, ask who it exists for and what the visitor needs to get done, and only then decide: make it bolder, quieter, clearer, faster. They work with 24 design commands (`critique`, `audit`, `polish`, `bolder`, `quieter`, `animate`, `typeset`, `layout`, `harden`, among others) and verify the result by looking at the rendered screen, not just the code.

> Use Impeccable when the interface needs real design: website, landing page, dashboard, form, component or native screen. Run `/impeccable init` once per project and then `/impeccable <command> <target>`. It is the [Impeccable](https://github.com/pbakaus/impeccable) framework created by Paul Bakaus ([site](https://impeccable.style)), shipped with Reversa under the Apache 2.0 license, with full credit to the author.

---

## Recommended sequence

```
Legacy project: /reversa → discovery and specifications
New project:    /reversa-new → PRD and specs → /reversa-forward
Migration:      /reversa → /reversa-migrate → /reversa-forward
Pricing:        /reversa-pricing → advisor → profile → product | size → estimate
Front-end:      /impeccable init → /impeccable <command> <target>

Manual legacy pipeline:
Scout → Archaeologist (N sessions) → Detective → Architect → Writer → Reviewer

Optional in any phase:
Soul Extractor · Visor · Data Master · Design System · Reversa Docs
```
