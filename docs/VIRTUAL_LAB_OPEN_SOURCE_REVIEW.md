# JMT Virtual Laboratory — Open-source review register

**Purpose:** record why external projects are or are not reused. A public repository is not automatically safe, accurate, maintained, or suitable for JMT.

## Adopted selectively

### BN Lab Simulations
- Repository: https://github.com/4mser/bn-lab-simulations
- Reviewed revision for the pendulum source: `1d7f884bb629e10676f9a266e10a49792dbf635b`
- Licence: MIT; upstream `LICENSE` and `THIRD_PARTY_NOTICES.md` reviewed.
- Engineering signals: zero runtime dependencies, modular experiment definitions, browser rendering lifecycle controls, and a validation suite that measures the same numerical update functions used by its experiments.
- JMT decision: adapt the double-pendulum equations and RK4 numerical approach only. JMT owns its typed SI-unit model, bounds, canvas renderer, mobile controls, learning integration and regression tests. The upstream rendering runtime is not bundled.
- Attribution and licence text: `THIRD_PARTY_NOTICES.md`.
- Validation boundary: upstream validation results are not treated as proof of JMT's implementation. JMT independently tests finite-state behaviour and energy drift.

## Reviewed, not imported

### myPhysicsLab
- Repository: https://github.com/myphysicslab/myphysicslab
- Licence: Apache-2.0; README and licence reviewed.
- Strength: long-running project with roughly fifty browser-based physics examples and documented mathematical models.
- Constraint: its documented source build expects TypeScript, esbuild, Perl and GNU Make. Importing the whole project would add a second build/runtime architecture.
- JMT decision: keep as a reference for future mechanics and optics models. Re-evaluate individual modules only after a scoped source, licence, test and mobile review.

### VChemLab
- Repository: https://github.com/sdeepak-dev/vchemlab
- Licence: MIT; README and licence reviewed.
- Strength: broad chemistry experiment catalogue, apparatus reference material, guided procedures and quizzes.
- Constraint: the documented implementation is a static monolithic HTML/CSS/JavaScript application with localStorage-based progress. That does not replace JMT's server-authoritative identity, paid-course access, teacher assignment, audit and learning-event architecture.
- JMT decision: use as a product-research reference for experiment coverage and apparatus pedagogy; do not import its application wholesale or treat its local progress model as suitable for JMT.

### Virtual Microscope
- Repository: https://github.com/ia7mad/Virtual-Microscope
- Strength: useful interaction research for objective changes, coarse/fine focus, brightness, pan/zoom, scale bars and mobile layout.
- Constraint: no root `LICENSE` file was found in the reviewed repository contents; the runtime is intentionally monolithic.
- JMT decision: do not copy code, specimen images, annotations or assets unless their ownership and reuse permissions are separately verified. Use only the publicly described interaction concepts as research.

### Virtual lab protocol simulation
- Repository: https://github.com/vosslab/virtual-lab-protocol-simulation
- Licences: LGPL-3.0 for code and CC-BY-4.0 for non-code content; both licence files and README reviewed.
- Strength: YAML-authored workflows compiled into interactive scenes, relevant to future biology protocol training.
- Constraint: LGPL and separate content-attribution obligations need a deliberate distribution/compliance review; its cell-culture workflow is not a general HSC biology lab.
- JMT decision: do not import now. Revisit if JMT builds cell-culture or stepwise laboratory protocol training and can meet the licence and content-attribution obligations.

## Non-negotiable reuse gate

Before any further third-party adoption, record:
1. Exact repository, commit SHA, file paths and licence for every reused code or asset.
2. Whether the licence permits commercial use, modification and distribution, and every notice or source-disclosure obligation.
3. Maintainer activity, release history, open security advisories, transitive dependencies and runtime compatibility.
4. Static security review for network calls, telemetry, dynamic code, unsafe HTML, storage, data collection and permissions.
5. Scientific validation source, numerical method, assumptions, units, uncertainty and edge-case tests.
6. JMT-owned tests, responsive behaviour, keyboard/screen-reader support, reduced-motion handling and performance on low/mid-range Android devices.
7. A documented fallback and removal path if upstream becomes unmaintained or unsuitable.

No external project is imported solely to increase feature count or shorten implementation time.
