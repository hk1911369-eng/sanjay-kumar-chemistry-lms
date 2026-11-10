# Virtual laboratory model register

This register records the numerical scope and educational limitations of the newer interactive laboratory models. A published catalogue entry is not a claim that the simulation replaces a physical laboratory or calibrated scientific software.

## Chemistry: reaction kinetics (`kinetics`)

- Model: single irreversible reaction `A → products` with zero-, first- or second-order integrated rate laws.
- Temperature: Arrhenius dependence, anchored to the supplied rate constant at 298.15 K.
- Catalyst: the catalysed and uncatalysed pathways share an explicitly stated pre-exponential factor; the catalyst lowers activation energy only.
- Outputs: concentration-time and instantaneous-rate curves, rate constants with order-dependent units, analytical half-life, initial rate and catalyst rate factor.
- Important limitation: real mechanisms, solvent effects, mass transfer, side reactions and changing temperature are not represented.
- Regression tests: `tests/virtual-lab-models.test.mjs` and `tests/chemical-kinetics-lab.test.mjs`.

## Chemistry: equilibrium and Le Chatelier (`equilibrium`)

- Model: reversible `A ⇌ B` system with constant volume and conserved total analytical concentration.
- Equilibrium: `K(T)` follows the van’t Hoff relation; initial reaction quotient `Q = [B]/[A]` determines the initial net direction.
- Catalyst: changes only the phenomenological relaxation rate; it does not change `K` or the equilibrium composition.
- Time course: exponential relaxation toward the calculated equilibrium composition. It is a teaching approximation, not an elementary reversible rate mechanism.
- Outputs: initial and current reaction quotient, temperature-dependent equilibrium constant, equilibrium and current concentrations, approach time and concentration curves.
- Important limitation: activities, non-ideal solutions, side reactions, changing volume and detailed forward/reverse elementary kinetics are omitted. This template intentionally does not claim a pressure effect for a reaction with equal gas stoichiometry.
- Regression tests: `tests/virtual-lab-models.test.mjs` and `tests/chemical-equilibrium-lab.test.mjs`.

## Physics: two-source wave interference (`wave-interference`)

- Model: two coherent point sources with equal amplitudes, configurable wavelength, frequency, source separation, initial phase difference and observation distance.
- Propagation: `v = fλ`; instantaneous displacement is a snapshot, while the field and screen profile show time-averaged intensity.
- Outputs: two-dimensional relative intensity field, one-dimensional screen profile, approximate far-field fringe spacing, wave speed and central displacement.
- Important limitation: uniform two-dimensional medium, ideal point sources, no source directivity, boundaries, absorption, dispersion or finite detector size. The `λD/d` fringe spacing is an approximation.
- Regression tests: `tests/virtual-lab-models.test.mjs` and `tests/wave-interference-lab.test.mjs`.

## Biology: mitosis and meiosis (`cell-division`)

- Model: stage-by-stage chromosome and chromatid state transitions for mitosis and meiosis.
- Tracks: cell count, chromosomes per cell, chromatids per chromosome, ploidy and DNA content in C notation.
- Meiosis options: crossing-over and independent assortment can be switched on or off; independent-assortment combinations are `2^n` before considering crossing-over.
- Important limitation: chromosome drawing is schematic and represents only a sample pair; the model omits checkpoints, spindle errors, mutation, chromosome-specific recombination rates and cell-type-specific differences.
- Regression tests: `tests/virtual-lab-models.test.mjs` and `tests/cell-division-lab.test.mjs`.

## Release and catalogue rule

Every new simulation template must be connected in all four places:

1. A bounded numerical model and matching TypeScript declaration.
2. A student-facing component with keyboard/touch controls, accessible descriptions and explicit model assumptions.
3. The student studio, admin catalogue selector and server-side template allowlist.
4. A database constraint migration, a subject-mapped catalogue migration and regression tests.

Catalogue publication and successful build checks are necessary but not sufficient for scientific sign-off. Before production release, verify the rendered experience with subject teachers, review the numerical assumptions, test student/teacher permissions and validate the full learning-completion path in a non-production environment.
