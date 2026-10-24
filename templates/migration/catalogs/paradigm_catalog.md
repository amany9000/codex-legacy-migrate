---
schemaVersion: 1
kind: paradigm_catalog
description: Advisory catalog of programming paradigms, mapping of stacks to their natural paradigm, and typical gaps per pair (source → target). Used by the Paradigm Advisor.
---

# Paradigm Catalog

> Structured knowledge about paradigms and how they relate to common stacks.
> Updating this catalog is a maintenance task independent of the Paradigm Advisor agent.

## Paradigm catalog

### Procedural
- **Characteristics**: top-level functions, linear flow in controllers, no classes or ornamental use of them, data as dicts/structs, open side effects.
- **Legacy examples**: classic PHP scripts, batch COBOL, pre-OO Perl systems, shell scripts.
- **Signals in `_reversa_sdd/`**: domain described as "functions", linear flows in `process_flows`, no explicit aggregates.

### Classic OO
- **Characteristics**: class hierarchy, strong inheritance, Active Record pattern, logic coupled to the models.
- **Legacy examples**: monolithic Rails, traditional Django, pre-DI Java EE, .NET WebForms / classic.
- **Signals in `_reversa_sdd/`**: classes with broad responsibilities, inheritance in the domain model, anemic controllers calling model methods.

### OO with DI
- **Characteristics**: injection containers, explicit interfaces, Repository / Service pattern, clear separation between layers.
- **Legacy examples**: modern Spring, .NET 6+, NestJS, modern Symfony.
- **Signals in `_reversa_sdd/`**: explicit aggregates, repository interfaces, no Active Record.

### Functional
- **Characteristics**: dominant immutability, pure functions, composition, no implicit side effects, rich typing.
- **Legacy examples**: Haskell, Elm, F#, functional Scala, Clojure.
- **Signals in `_reversa_sdd/`**: algebraic types, no classes, flow expressed as composition.

### Event-driven (asynchronous)
- **Characteristics**: queues / topics, decoupled handlers, no linear flow, eventual consistency, explicit idempotency.
- **Legacy examples**: modern queue-oriented Node backends, SQS / Kafka heavy systems, asynchronous microservices.
- **Signals in `_reversa_sdd/`**: events in the domain model, integrations via queues, long-running processes with retry.

### Actor model
- **Characteristics**: isolated actors with a mailbox, supervision, state isolation.
- **Legacy examples**: Erlang / Elixir / OTP, Akka.
- **Signals in `_reversa_sdd/`**: supervised processes, messages between actors.

### Dataflow
- **Characteristics**: declarative pipelines, flowing transformations, no imperative loops in the domain.
- **Legacy examples**: classic ETLs, Spark, Flink.
- **Signals in `_reversa_sdd/`**: description as a DAG, staged transformations.

## Stack → natural paradigm mapping

| Target stack | Natural paradigm | Viable alternatives | Notes |
|---|---|---|---|
| Node.js 20 (Fastify, Express, NestJS) | asynchronous event-driven | OO with DI (NestJS), light functional | async-first runtime; heavy CPU blocking goes to worker threads |
| Go (net/http, Echo, Fiber) | CSP / goroutines (light event-driven) | structured procedural | concurrency via channels; OO simulated via interfaces |
| Rust (axum, Actix, tokio) | ownership / functional async | event-driven | immutability by default, safety via types |
| Elixir / Phoenix | actor model (BEAM) | functional | supervision via OTP |
| Modern Python (FastAPI, Django 5) | OO with DI or rich procedural | event-driven (Celery, asyncio) | the choice depends on the framework |
| Kotlin (Spring Boot, Ktor) | OO with DI | event-driven (Reactor) | coroutines enable ergonomic async |
| .NET 8 (ASP.NET Core, Minimal API) | OO with DI | event-driven (Channels, MediatR) | OO tradition + first-class asynchrony |
| Modern Java (Spring Boot 3, Quarkus) | OO with DI | event-driven (Project Reactor) | functional libraries possible but not dominant |
| Modern Ruby (Rails 7, Hanami) | classic OO (Rails) or OO with DI (Hanami) | light functional (dry-rb) | Rails dictates Active Record; Hanami is DI-heavy |
| Serverless TypeScript (AWS Lambda, Cloudflare Workers) | event-driven | functional | invocation per event; cold start influences design |

## Typical gaps per pair

| From → To | Main gap | Concrete implications |
|---|---|---|
| procedural → event-driven | synchrony → asynchrony | the response stops being immediate; error handling becomes retry/DLQ; idempotency is mandatory; event order starts to matter |
| procedural → OO with DI | data as dicts → aggregates | invariants live inside aggregates; logic stops living in controllers; dependencies via interfaces |
| procedural → functional | open side effects → pure + isolated | mutability becomes the exception; composition replaces sequence; algebraic types for states |
| classic OO → event-driven | synchronous flow → choreography | actions stop being atomic; distributed transactions become sagas; strong consistency → eventual |
| classic OO → OO with DI | inheritance → composition via interfaces | Active Record disappears; persistence becomes a repository; tests get natural mocks |
| classic OO → functional | mutable encapsulation → immutability | methods with effects become pure functions + explicit update; state expressed as a sequence of transformations |
| OO with DI → event-driven | synchronous command → event | the return stops being immediate; orchestration becomes choreography; ordering by key |
| OO with DI → functional | mocks → testable composition | DI stops being by interface and becomes by function argument |
| functional → event-driven | synchronous composition → messaging | latency rises; failure becomes a message in a DLQ; distributed state |
| event-driven → synchronous procedural | unnatural; only makes sense for small systems | collapse handlers into direct calls; loss of decoupling; strong consistency returns |
| dataflow → event-driven | declarative DAG → mutable choreography | control becomes less predictable; order must be guaranteed by key |
| actor model → OO with DI | messages between actors → synchronous calls | loss of failure isolation; supervision must become try/catch or orchestrated retry |

## Utility function (used by the Paradigm Advisor)

Pseudo-procedure the agent follows when consulting the catalog:

1. Receive `legacy_paradigm` (detected) and `target_stack` (from the brief).
2. Look at `Stack → natural paradigm mapping`, record `target_paradigm` and `alternatives`.
3. Compare `legacy_paradigm` with `target_paradigm`:
   - If equal: return `gap = none`, `implications = []`.
   - If different: look at `Typical gaps per pair` and return `implications`.
4. If the legacy system is hybrid: apply step 3 to each component and return the combined list.

## Catalog test scenarios (for validation)

1. procedural legacy + Node stack → gap = procedural → event-driven, implications = [synchrony/asynchrony, idempotency, retry/DLQ, order]
2. classic OO legacy + .NET 8 stack → gap = classic OO → OO with DI, implications = [inheritance/composition, repository, mocks]
3. classic OO legacy + Go stack → gap = classic OO → CSP, implications = [idiomatic interfaces, channels for coordination, loss of inheritance]
4. functional legacy + Elixir stack → gap = functional → actor model, implications = [distributed state, supervision, messages]
5. event-driven legacy + Node stack → gap = none
6. batch COBOL legacy + serverless TypeScript stack → extreme gap, multiple implications: batch → event-driven, procedural → rich typing, no long loops → short invocations
7. monolithic Rails legacy + Hanami stack → gap = classic OO (Active Record) → OO with DI, implications = [repository, optional dry-monads]
8. hybrid legacy (Rails + Sidekiq) + Node stack → decomposed hybrid: synchronous Rails part → sync Node; async Sidekiq part → modern Node queue
