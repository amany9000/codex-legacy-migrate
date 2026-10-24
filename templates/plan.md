# Exploration Plan: {{PROJECT}}

> Created by Reversa on {{DATE}}
> Mark each task with ✅ when done.
> You can edit this plan before starting: add, remove or reorder tasks as needed.

---

## Phase 1: Reconnaissance 🔍

- [ ] **Scout**: Folder structure and technology mapping
- [ ] **Scout**: Dependency and package manager analysis
- [ ] **Scout**: Entry points, CI/CD and configuration

## Specs organization decision 🗂️

> Between the Scout and the Archaeologist, Reversa asks how you want to organize the specs (by module, use case, endpoint, hybrid, by features or custom). The choice is persisted in `.reversa/config.toml` under the `[specs]` section and is not asked again in future runs. To show the menu again, remove the section manually.

## Phase 2: Excavation 🏗️

> Reversa fills this section with the real modules once the Scout finishes reconnaissance.

- [ ] **Archaeologist**: Analysis of the modules identified by the Scout

## Phase 3: Interpretation 🧠

- [ ] **Detective**: Git archaeology and retroactive ADRs
- [ ] **Detective**: Implicit business rules and state machines
- [ ] **Detective**: Permission matrix (RBAC/ACL)
- [ ] **Architect**: C4 diagrams (Context, Containers, Components)
- [ ] **Architect**: Full ERD and external integrations
- [ ] **Architect**: Spec Impact Matrix

## Phase 4: Generation 📝

- [ ] **Writer**: SDD specs per component
- [ ] **Writer**: OpenAPI (if applicable)
- [ ] **Writer**: User Stories (if applicable)
- [ ] **Writer**: Code/Spec Matrix

## Phase 5: Review ✅

- [ ] **Reviewer**: Cross-review of specs
- [ ] **Reviewer**: Gap resolution with the user
- [ ] **Reviewer**: Final confidence report

---

## Independent Agents

> Run these agents when the resources are available; they can run in any phase.

- [ ] **Visor**: Interface analysis from screenshots
- [ ] **Data Master**: Full database analysis
- [ ] **Design System**: Design token extraction
- [ ] **Tracer**: Dynamic analysis (requires an accessible system)

---

## Next step

Once the Discovery Team finishes and `_reversa_sdd/` is populated, you can trigger one of the following flows:

- `/reversa-migrate`: orchestrator of the **Migration Team** (Paradigm Advisor → Curator → Strategist → Designer → Screen Translator → Inspector). Generates the specs of the new system. Output in `_reversa_sdd/migration/` and `_reversa_sdd/screens/`.
- `/reversa-reconstructor`: generates a bottom-up plan to reimplement the software from the legacy specs (one task per session).
