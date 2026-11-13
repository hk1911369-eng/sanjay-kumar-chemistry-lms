# JMT Learning OS — Deep Research Programme and First Evidence Register

**Status:** Research wave 1 — discovery and scoping; not a completed exhaustive audit  
**Date:** 2026-11-11  
**Branch:** `audit/jmt-master-prompt-follow-through`  
**Purpose:** Establish evidence before expanding implementation. The product ambition is to compete with the complete ACS education ecosystem and then differentiate materially, not merely reproduce a school LMS.

## 1. Research rules

1. Separate **verified facts**, **first-hand benchmark observations supplied by the product owner**, **inferences**, and **open questions**.
2. Prefer official Bangladesh authorities for syllabus, textbook edition, examination rules and admission circulars; use commercial sites only as discovery leads or secondary corroboration.
3. Version every curriculum object by cohort, academic year, board, medium, candidate type (regular/irregular/improvement), syllabus effective date and source document.
4. A public feature claim is not proof of a working feature. Verify with product walkthroughs, user evidence, app behaviour, reviews and operational reliability.
5. Do not copy proprietary assets, books, question banks, code, branding or protected content. Record source, licence, permitted use and attribution for every imported resource.
6. Do not build a high-stakes predictor until a leakage-resistant historical evaluation has passed.
7. Research must end in traceable product requirements, source records, acceptance tests and release gates.

## 2. First-wave findings

### 2.1 ACS must be benchmarked as an ecosystem, not only one app

ACS's official group site describes a six-brand ecosystem spanning:
- ACS Future School (school learning);
- Apar's Classroom / ASG Shop (HSC and admission programmes);
- Rhombus Publications (HSC, compact and admission books/question banks);
- Achieve (offline model tests and exam batches);
- ACS Engineering School (engineering learning);
- ACS Mart (marketplace).

This materially expands the competitive benchmark. JMT should compare the entire learner journey—school, HSC, admission preparation, books, practice tests, community, teacher support and offline learning—not only the ACS Future School app.

Sources:
- https://www.acsedtech.com/
- https://www.acsfutureschool.com/
- https://www.acsfutureschool.com/academic-program-2026/f139905f-ebb2-42b8-b42b-8c1c3dcc4f64
- https://www.dhakatribune.com/entertainment/370343/202501081955

### 2.2 ACS Future School public feature inventory

The ACS 2026 academic-program page publicly advertises interactive live classes, recorded and archived classes, CQ/MCQ classes, OneShot classes, daily/weekly quizzes, CQ/SQ practice exams, homework submission, Study Planner, preparation books, half-yearly/annual exam support, parent meetings, app, reward-based learning, extended helpline and Curiosity AI 2.0.

The same page links a free Facebook group for each class and lists class/subject coverage and Academic Series books. It also offers a downloadable routine. The public homepage describes live classes, exams, materials, community and Curiosity AI.

The Google Play listing describes live discussion, peer collaboration, quizzes and learning reports. User reviews surfaced in search also describe playback, loading and course-expiry problems. The benchmark therefore needs a capability score **and** a reliability score.

Sources:
- https://www.acsfutureschool.com/academic-program-2026/f139905f-ebb2-42b8-b42b-8c1c3dcc4f64
- https://www.acsfutureschool.com/
- https://play.google.com/store/apps/details?id=com.codervai.future_school
- https://www.dhakatribune.com/entertainment/370343/202501081955

**Evidence caveat:** The public pages confirm marketed features, not every exact workflow the product owner personally observed (for example the detailed sleep/wake planner, individual lab tools, calculator behaviour or note-ranking UI). Those remain first-hand benchmark claims to verify from screenshots/video and further public posts. Facebook and YouTube content is a continuing research stream; search indexing is incomplete and private/group-only content cannot be treated as publicly verified.

### 2.3 Curriculum and textbook source hierarchy

Initial authoritative source discovery:
- NCTB 2025–26 HSC textbook list: https://nctb.gov.bd/pages/static-pages/6922e145933eb65569e2b37b
- NCTB 2026–27 higher-secondary prescribed syllabus notice surfaced in search: https://nctb.gov.bd/pages/notices/
- Ministry of Education HSC 2026 notices and routine: https://shed.gov.bd/pages/static-pages/694146bea31054345f0fcb25
- NCTB syllabus and question-pattern archive: https://nctb.portal.gov.bd/pages/static-pages/6922dff5933eb65569e24d31
- Board question statistics archive (Rajshahi): https://rajshahieducationboard.gov.bd/pages/static-pages/691997b2933eb65569dde245

Important finding: academic year and candidate status cannot be mixed. For example, a board notice surfaced for HSC 2026 distinguishes regular candidates using the full prescribed syllabus from irregular/improvement candidates using a prior rearranged syllabus. This must be checked against the actual board/NCTB circular before being encoded. One generic “HSC syllabus” is unsafe.

**Next extraction required:** Download and parse the exact current NCTB syllabus, textbook PDFs, subject-wise practical requirements, question structures and marks distributions; create chapter → topic → subtopic → learning outcome → assessment objective → practical mapping for each cohort and medium. Do not rely on search snippets as the canonical curriculum.

### 2.4 Virtual-lab design references

- OLabs (CDAC) describes 400+ online experiments/activities for classes 6–12 across physics, chemistry, biology, mathematics, science, social science and computer science. Its lab structure includes theory, procedure, animation, simulation, viva, observation recording, calculations and graph plotting: https://www.cdac.gov.in/index.aspx?id=project_details&projectId=Onlinelabs%28Olabs%29forschools
- PhET describes research-based interactive simulations across physics, math/statistics, chemistry, earth science and biology, with teacher resources, accessibility and offline access: https://phet.colorado.edu/
- GeoGebra provides different calculator modes, including restrictions relevant to high-stakes exam environments: https://help.geogebra.org/hc/en-us/articles/10470108053277-GeoGebra-Apps

JMT lab acceptance criteria should include scientific validity, curriculum mapping, learner prediction before manipulation, controlled variables, recorded observations, live graphing, calculations with units, interpretation, viva/reflection, saved reports and teacher review. A moving animation alone is not a lab.

For ICT, require browser HTML/CSS/JS preview, a constrained SQL learning database, and C compilation/execution in an isolated sandbox. Never run learner code inside the main application server or give it network/secrets access.

## 3. Exam Question Predictor — research and validation specification

### 3.1 Product definition

Build separate predictors for each exam family, institution, unit/group, subject, paper, syllabus version and examination year. Examples include HSC subject papers, DU units, BUET, engineering clusters, medical, GST, agriculture and other university-specific tests. These are not one interchangeable exam.

The predictor should produce:
- topic and subtopic probability/ranking;
- question archetype and cognitive-demand forecast;
- likely marks/weight ranges where supported;
- predicted distribution with confidence/uncertainty;
- evidence: historical frequency, recency, syllabus coverage, changed syllabus, exam blueprint and teacher-reviewed rationale;
- practice questions generated from the forecast, clearly separated from the forecast itself.

Never claim access to leaked papers or guaranteed questions. The purpose is evidence-based preparation and better syllabus coverage, not gambling on a narrow “common” list.

### 3.2 HSC 2026 blind backtest requested by the product owner

A genuine retrospective trial must reconstruct the information available **before the first relevant HSC 2026 paper**:
1. Freeze the model, prompt, retrieval index, syllabus edition, books, past papers and all source timestamps at the pre-exam cutoff.
2. Exclude all 2026 exam papers, answer keys, solutions, post-exam coaching posts, social posts discussing actual questions, leaked material and any derivative data.
3. Generate and timestamp predictions for every target subject/paper before revealing the actual exam.
4. Compare predictions to independently coded real 2026 papers.
5. Keep an audit log of all retrieved documents and model versions.

Because the date is now after the 2026 exam, this is a **retrospective blind simulation**, not a live pre-exam prediction. The simulation is valid only if the data firewall and cutoff can be demonstrated. If the historical pre-exam source corpus cannot be reconstructed, mark the 2026 test as contaminated/invalid rather than pretending it is blind.

### 3.3 Rolling-origin evaluation across earlier years

For each historical target year Y:
- train/use only documents that existed before the exam cutoff for year Y;
- predict Y;
- score against the actual paper;
- advance the cutoff to Y+1 and repeat.

Keep separate holdouts for each board, subject, exam type, unit and syllabus regime. Do not randomly split questions from the same paper across train and test. De-duplicate near-identical questions and variants across years before splitting.

### 3.4 Baselines and model comparisons

Compare every advanced model against:
- uniform syllabus coverage;
- historical topic-frequency baseline;
- recency-weighted frequency;
- marks/blueprint-weighted syllabus baseline;
- expert teacher forecast collected before seeing the paper;
- retrieval/statistical model;
- AI-assisted forecast.

If the AI does not outperform simple baselines on held-out years, it is not ready to be marketed as a predictor.

### 3.5 Scoring

Score multiple levels separately:
- topic/subtopic: precision@K, recall@K, weighted recall, NDCG/ranking quality;
- question archetype: precision/recall and confusion matrix;
- marks distribution: absolute error and distribution distance;
- probability quality: Brier score, log loss and calibration curves;
- coverage: fraction of actual exam marks represented by forecasted topics;
- robustness: performance by subject, board, institution/unit, syllabus change and year;
- utility: compare a study plan built from predictions against full-syllabus and baseline plans.

Report uncertainty intervals and sample sizes. Do not use a single “accuracy %” that hides whether a forecast got broad chapters right but missed actual question types or marks.

### 3.6 Generated-question quality is a different evaluation

A model can forecast topics well but generate poor questions. Generated questions need separate expert review and item analysis:
- syllabus/content alignment and factual correctness;
- ambiguity, answer-key validity and originality;
- difficulty and discrimination after pilot responses;
- distractor functioning for MCQs;
- language quality, mark-scheme fit and cognitive demand;
- plagiarism/near-duplicate checks;
- teacher approval before publication.

Research on AI-generated MCQs has found potential weaknesses in difficulty, discrimination and distractor quality, so AI output must not be treated as exam-quality merely because it looks plausible.

Research sources:
- Ofqual, “Predicting predictability”: https://www.gov.uk/government/publications/predicting-predictability
- Systematic review of automatic question generation for education: https://link.springer.com/article/10.1007/s40593-019-00186-y
- 2026 MCQ generation evaluation using classical test theory: https://ink.library.smu.edu.sg/sis_research/11361/

## 4. Research workstreams still open

| Workstream | Required evidence/output | Status |
|---|---|---|
| ACS group and product ecosystem | Brand map, feature matrix, course catalogue, public demos, pricing, learner journey, reliability and support | Started |
| ACS social footprint | Dated Facebook/Instagram/YouTube posts, public groups, app demos, teacher announcements, books and campaigns | Started; incomplete |
| Bangladesh curriculum | Canonical syllabus and textbooks by cohort, class, subject, medium, board and effective date | Source discovery started; extraction pending |
| HSC board exams | Historical papers, marks distribution, practicals, board variation, question taxonomy and exam statistics | Source discovery started |
| University admissions | Institution/unit-specific current circulars, syllabus, marks, negative marking, question archives and year changes | Source discovery started |
| Books and content | NCTB plus licensed supplementary books, chapter maps, edition tracking, question-bank provenance and rights | Pending |
| Virtual labs | Subject-by-subject experiment catalogue, pedagogy, scientific review, accessibility, offline and security patterns | Benchmark discovery started |
| AI tutor and doubt solving | Grounding, Bangla/English accuracy, safety, pedagogy, escalation, cost and evaluation | Pending |
| Exam predictor | Historical corpus, pre-exam cutoff reconstruction, question coding, blind backtests, baselines and calibration | Specification drafted; data work pending |
| Student and teacher research | Bangladesh student/teacher workflows, device/network constraints, interviews and usability tests | Pending |
| Product/technical benchmark | App flows, performance, reliability, privacy, pricing, offline support, accessibility and operational maturity | Pending |

## 5. Proposed research deliverables before major feature implementation

1. **Curriculum Atlas:** canonical versioned syllabus and book maps for SSC, HSC and selected admission pathways.
2. **ACS Benchmark Dossier:** evidence-backed feature-by-feature and journey-by-journey comparison, separating marketed, publicly demonstrated and first-hand observed capabilities.
3. **Exam Corpus and Taxonomy:** rights-aware archive of past papers, answer keys, topic labels, question types, marks, board/institution and year.
4. **Predictor Research Report:** blind backtest protocol, baseline scores, model scores, failure analysis and go/no-go recommendation.
5. **Virtual Lab Blueprint:** experiment catalogue and technical architecture, with the first physics, mathematics and ICT lab specifications.
6. **Student/Teacher Research:** user journeys, pain points, low-end Android and weak-network requirements, and usability evidence.
7. **JMT Product Requirements and Roadmap:** prioritized requirements with measurable acceptance tests and implementation dependencies.

## 6. Research integrity and scope boundary

- This file records wave-1 discoveries and the research protocol. It is not proof that every ACS social post, every Bangladesh textbook or every admission paper has been collected.
- Social search is incomplete; Facebook groups may be private or login-gated. The product owner's screenshots/videos remain valuable primary evidence.
- Search-indexed third-party question banks are leads, not authoritative or automatically licensed corpora. Verify each paper against scans/official releases and establish content rights.
- No implementation should begin for the predictor until the historical corpus, cutoff and baseline evaluation are reproducible.
- No production migrations, deployment or PR merge are authorized by this research task.


## 7. Research wave 1 — additional discoveries (same date)

### 7.1 ACS public social/community trail and materials

The official ACS Future School 2026 programme page links a public class-based Facebook group (`facebook.com/groups/acsfutureschoolstudents`) and a downloadable routine hosted on Google Drive. The public-page links establish that these resources are part of the advertised learning journey. In this research pass, the Facebook group and Drive routine did not render through the public fetch interface (cache/access limitation), so their actual posts, files and details have **not** been independently audited. Follow-up should inspect publicly accessible posts, videos and screenshots where available; private group content should not be represented as public evidence.

The same official page enumerates the Academic Series subject books: ICT, General Math, Higher Math, Biology, Physics and Chemistry (with part/volume references). It lists Bangla and English paper subjects and other group subjects in its course section. This gives us a concrete book-and-course inventory to compare against the official NCTB curriculum, but it does not establish that ACS books are official textbooks or that the full book contents may be copied.

Source: https://www.acsfutureschool.com/academic-program-2026/f139905f-ebb2-42b8-b42b-8c1c3dcc4f64

### 7.2 ACS ecosystem finding changes the competitive map

The official ACS Group hub explicitly frames the organisation as six brands and links:
- ACS Future School — Class 6–10;
- ASG Shop / Apar's Classroom — HSC and Medical, Engineering, Varsity and IBA admission;
- Rhombus Publications — HSC cycles, compact series, question banks and books;
- Achieve — offline model tests and exam batches;
- ACS Engineering School — engineering learning (marked as upcoming on the hub);
- ACS Mart — marketplace (marked as upcoming on the hub).

The group's own homepage claims 1M+ learners. This is a first-party marketing claim, not an independently audited active-user count. We must record it as such, not treat it as verified adoption. The strategic lesson is that ACS's moat may be the integrated funnel and distribution across brands, not any single app feature.

Source: https://www.acsedtech.com/

### 7.3 Admission exam corpus: official circulars first

A 2025–26 GST integrated admission circular was located on a participating university's official admission domain. It contains eligibility rules, unit exam dates, negative marking (0.25 per wrong answer), pass mark (30), and the participating-university list. The circular is the canonical source for those fields; coaching sites with conflicting marks tables must not override it.

Source: https://admission.kiu.ac.bd/assets/Circular%20GST%202025-26.pdf

The University of Dhaka's official admission portal exposes separate guidance areas for Science, Arts/Law/Social Science, Business Studies, Fine Arts and IBA, including eligibility and examination rules. Each unit therefore needs its own versioned exam specification; do not collapse DU into a single generic test.

Source: https://admission.eis.du.ac.bd/

BUET 2025–26 search results surfaced third-party circular summaries but not yet a verified primary circular PDF in this pass. Those summaries are leads only. Obtain the official BUET admission notice and archive it before writing any BUET marks distribution or syllabus into JMT.

### 7.4 Virtual lab research adds an important design warning

A peer-reviewed design study of two virtual laboratories identifies recurring trade-offs: exploration versus scripted interaction, realism versus enhanced visualization, ambition versus available resources, and the need for guided learning/debriefing. It warns against disguising a linear demonstration as a genuinely interactive lab. A Cambridge Assessment review similarly notes that virtual labs can assess some practical skills but have validity threats and cannot automatically replace all physical practical experience.

Sources:
- https://link.springer.com/article/10.1007/s10639-018-09857-0
- https://www.cambridgeassessment.org.uk/Images/747198-the-validity-of-virtual-labs-for-assessing-science-practical-skills.pdf

### 7.5 Predictor research: distinguish two different forecasting targets

1. **Paper-content forecasting:** forecast topic, subtopic, question archetype and marks distribution before the exam. Evaluate against held-out real papers.
2. **Student-performance forecasting:** estimate an individual student's likely score/readiness from their learning evidence. Evaluate against actual outcomes with cohort/time holdouts and calibration.

These are separate models, data products, metrics and user promises. The first cannot be evaluated using student score accuracy, and the second cannot be judged by topic overlap. JMT should not conflate them under one vague “AI prediction” label.


## 8. Wave-1 source extraction — curriculum and admission details

### 8.1 Official NCTB 2025–26 HSC textbook page

The NCTB page last updated 7 May 2026 lists five higher-secondary titles: সাহিত্যপাঠ, সহপাঠ, English for Today, ICT and ICT (English version). It is important not to assume that every HSC subject has a centrally published NCTB textbook PDF in that list. The full subject syllabus, board-prescribed content, approved references and practical requirements need separate evidence. ACS's Academic Series books for Physics, Chemistry, Biology, General Math and Higher Math are supplementary commercial materials and must be mapped to the applicable official syllabus, not mistaken for official NCTB textbooks.

Canonical page: https://nctb.gov.bd/pages/static-pages/6922e145933eb65569e2b37b

### 8.2 HSC exam source archive

The Ministry of Education's HSC/Equivalent page provides the 2026 notices and timetable and links earlier 2025, 2024, 2023 and 2022/2021 examination information. The Rajshahi Education Board's HSC statistics page lists year-specific statistics for 2019–2026, including a 2026 statistics PDF. These are useful for exam chronology, candidate volume and cohort context; they are not substitutes for question-paper scans or subject syllabuses.

Sources:
- https://shed.gov.bd/pages/static-pages/694146bea31054345f0fcb25
- https://rajshahieducationboard.gov.bd/pages/static-pages/691997b2933eb65569dde245

### 8.3 GST 2025–26 official circular facts

The 2025–26 GST circular hosted on a participating university's official admission domain states:
- Unit A (Science), Unit B (Humanities), Unit C (Business Studies);
- 100-mark, one-hour admission tests;
- 0.25 marks deducted per wrong answer;
- pass mark 30;
- unit-specific eligibility rules;
- exam dates in March/April 2026 and a listed participating-university group.

The subject/marks matrix must be extracted directly from the circular PDF and independently checked before encoding. The same circular states that the integrated admission committee's decision is final. Third-party summaries found in the same search disagreed on some subject distributions; this is precisely why JMT must use the official circular as the source of truth.

Source: https://admission.kiu.ac.bd/assets/Circular%20GST%202025-26.pdf

### 8.4 DU is not one generic admission exam

The official Dhaka University admission portal has separate unit-specific guidance for Science, Arts/Law/Social Science, Business Studies, Fine Arts and IBA. Each unit needs a separate versioned syllabus, eligibility rules, question format and mark distribution. Current-year details must be read from the applicable session's official circular, not inferred from an old question bank.

Source: https://admission.eis.du.ac.bd/

### 8.5 Predictor data integrity: important calendar reality

As of this research date (11 November 2026), HSC 2026 and the 2025–26 GST admission cycle are past events. Therefore, the requested “predict HSC 2026 without giving the model 2026 exam material, then compare with the real paper” can only be run as a **retrospective blind reconstruction**. It is not possible to honestly call it a prospective live prediction now.

The experiment remains useful only if we can reconstruct a trustworthy pre-exam snapshot of the permitted sources. If no timestamped pre-exam corpus exists, use a stricter rolling-origin backtest on earlier years and label the 2026 exercise non-blind. Never remove post-exam documents from today's search index and claim that proves they were unavailable to the model at prediction time; preserve a source manifest and cutoff audit.

### 8.6 HSC and admission predictor should support multiple output levels

For HSC, create separate subject-paper models, including CQ/creative, MCQ, practical/viva where applicable, and marks distribution. For admissions, create independent models by institution + session + unit/group + subject + exam format. For each, predict syllabus coverage and question archetypes, not just the wording of a question. A forecast can be useful even when no exact question repeats, provided it helps students allocate revision time without abandoning the full syllabus.


## 9. ACS ecosystem deepening — first-party brand-site review

The following official brand sites were fetched and reviewed in this pass. This is a public-site inventory, not a usability audit of authenticated student portals.

### 9.1 ASG Shop / Apar's Classroom — HSC and admission engine

The shop page exposes course cycles for HSC 2026, 2027 and 2028, including multiple parallel teacher-led cycles in Physics, Chemistry, Higher Mathematics, Biology, English, Bangla and ICT. It also lists admission products for Varsity/GST, Engineering, Medical, Architecture and IBA, plus second-timer and English-focused batches. The page describes book bundles for selected academic cycles and teacher collaborations.

Strategic implication: JMT needs course and content versioning by cohort, subject, teacher, cycle, language/medium, exam target and batch—not just one course per subject. It should support alternative teaching pathways and clearly show which cycle is appropriate for which learner.

Source: https://aparsclassroom.com/shop

### 9.2 Rhombus Publications — books and question-bank distribution

The official publisher site presents HSC compact series, academic cycles for Physics/Chemistry/Higher Mathematics, university admission books, engineering and medical preparation, IBA, question banks and e-books. The product ecosystem spans printed and digital materials.

Strategic implication: a Learning OS should connect books to versioned chapter/concept maps, practice sets, corrections/errata and source/rights metadata. It must not copy paid book content without a licence. The system should distinguish a book recommendation or reference from content that JMT owns or is licensed to reproduce.

Source: https://www.rhombuspublications.com/

### 9.3 Achieve — offline examination network

Achieve's official site describes offline HSC and admission exam batches, student portal, leaderboard/progress tracking, daily and weekly exams, paper finals, subject finals, model tests, home-practice exams, question banks, solve classes, solve sheets, teacher/top-student guidance, scholarships and Q&A support.

Strategic implication: the benchmark is blended learning. JMT should plan for a digital-to-physical assessment journey: exam scheduling, offline attendance/answer capture, standardized marking, result import, error analysis and a unified learner history. This is a later institutional capability; it should not be faked with a generic online quiz.

Source: https://achievecentre.online/

### 9.4 ACS Engineering School — beyond school and admission

The official engineering site is live and presents courses in electronics, physics, programming, mechanics, mathematics and innovation, with lessons in analytical mechanics, surveying, DC circuits and related engineering concepts. This is notable because the ACS Group hub labels the engineering brand “upcoming”, while its own domain already has a live public course website. Brand-hub status can lag behind actual product status; future ACS research must check each brand domain directly and record observation dates.

Strategic implication: JMT's long-term subject-agnostic architecture should not stop at HSC/admission. It should be able to extend into undergraduate engineering and professional skill pathways without mixing those curricula into school course maps.

Source: https://acsengineeringschool.com/

### 9.5 Competitive architecture inferred from first-party pages

The ACS ecosystem is not a single monolithic app. Its public footprint suggests several specialized products connected by a brand and learner pipeline:
- school-level digital classes, practice and Curiosity AI;
- HSC cycles and admission-specific programmes;
- print/e-book and question-bank publishing;
- offline model-test centres;
- engineering learning;
- a wider marketplace brand.

This is an **inference from public brand/product pages**, not proof of shared account, shared learner database or technical integration between those products. JMT should compete through a genuinely unified learner record and coherent experience while retaining specialized workflows where needed.


## 10. Research tranche 2 — official curriculum and admissions source verification (11 November 2026)

This tranche prioritizes primary government and university sources. It is a source-verification pass, not yet a complete subject-by-subject curriculum extraction or a complete admission-specification matrix.

### 10.1 NCTB syllabus archive: versioning is mandatory

The NCTB official archive page reviewed in this tranche is explicitly a collection of **rearranged/revised examination syllabuses**, sample questions and question-pattern/mark-distribution material. Its visible list includes:
- 2022 SSC and HSC revised syllabuses;
- 2021 HSC revised syllabus;
- 2023 SSC and HSC revised syllabuses;
- 2024 HSC syllabus described as the same as the 2023 revised HSC syllabus;
- 2025 HSC/equivalent and Alim revised syllabus;
- a separate 2024–25 academic-year HSC cohort notice for the 2026 HSC Bangla 1st Paper syllabus and English 1st Paper mark distribution.

This page does **not** establish that all subjects in the 2026 HSC cohort use one short syllabus. It demonstrates why JMT must attach every syllabus document to an explicit cohort and examination year, and why subject-specific notices must be stored separately. Do not reuse the 2023/2025 revised syllabus for the 2026 cohort without a current authoritative notice for that subject.

Primary source: https://nctb.gov.bd/site/page/9a90c854-ce5f-4d77-9915-1ecd0953079d/-

### 10.2 NCTB 2026 textbook catalogue: distinguish textbook catalogue from full curriculum

The official NCTB portal has a page titled “২০২৬ শিক্ষাবর্ষের মাধ্যমিক স্তর ও উচ্চ মাধ্যমিক স্তরের পাঠ্যপুস্তকের তালিকা” (textbook list for the 2026 academic year), updated on 28 December 2025. The page links to an “উচ্চ মাধ্যমিক শ্রেণি” (higher-secondary class) list. A separate NCTB official page for 2024–25 lists five higher-secondary textbook entries: সাহিত্যপাঠ, সহপাঠ, English for Today, ICT (Bangla), and ICT (English version).

Important interpretation: the textbook list is not itself a complete subject syllabus. Science, humanities and business subjects can be governed by prescribed curriculum documents, board syllabuses and approved reference materials beyond the small central NCTB textbook list. JMT must not imply that the five titles are the complete HSC learning corpus.

Primary sources:
- 2026 academic-year textbook list: http://nctb.portal.gov.bd/pages/static-pages/695b98afc4774958d7b7044c
- 2024–25 higher-secondary textbook list: https://nctb.portal.gov.bd/site/page/fc0e3123-dd21-4cf9-8726-9fb850765a5a

### 10.3 Dhaka University official admission portal: current live cycle and separate units

The official DU admission portal was fetched on 11 November 2026. It exposes separate guidance sections for:
- Science Unit;
- Arts, Law and Social Science Unit;
- Business Studies Unit;
- Fine Arts Unit;
- IBA.

The portal's displayed key-date table at retrieval time showed applications and fee payment from 11 November 2026 at 12:00 to 25 November 2026 at 23:59, with separate admit-card and exam dates:
- IBA: 5 December 2026, 10:00–12:00;
- Science: 12 December 2026, 11:00–12:30;
- Arts/Law/Social Science: 19 December 2026, 11:00–12:30;
- Fine Arts: 22 December 2026, 11:00–12:30;
- Business Studies: 26 December 2026, 11:00–12:30.

The extracted portal page does not itself show the session label in the visible text captured here, so the date table should be recorded as a time-stamped observation and linked to the corresponding official circular before encoding it as a formal session-specific exam specification. The portal explicitly advises candidates to use the official portal rather than social media for admission information. That is a product requirement for JMT: admission facts need an official source, retrieval date, session, unit, and change history.

Primary source: https://admission.eis.du.ac.bd/

### 10.4 GST 2025–26: official circular facts captured

The 2025–26 GST circular PDF is hosted by a participating public university admission domain. The extracted circular identifies three units: A (Science), B (Humanities) and C (Business Studies), and includes eligibility rules by SSC/HSC cohort and stream. It specifies the following minimum GPA thresholds (including the fourth subject) in the extracted text:
- Unit A: at least 3.25 in both SSC/equivalent and HSC/equivalent, combined GPA at least 7.00;
- Unit B: at least 3.00 in both, combined GPA at least 6.00;
- Unit C: at least 3.00 in both, combined GPA at least 6.25.

The circular states a 0.25-mark deduction per incorrect answer and a pass mark of 30. The published dates in the circular are Unit C on 27 March 2026, Unit B on 3 April 2026, and Unit A on 10 April 2026, each from 11:00 to 12:00; the architecture drawing/practical component is separately scheduled on 10 April 2026 from 15:00 to 16:00.

The source extraction contains OCR/encoding defects in Bengali. The GPA and date values above should be checked against the rendered PDF pages before they become production data. The exact subject-wise marks matrix and question distribution remain an open extraction task; do not infer it from coaching summaries.

Primary source: https://admission.kiu.ac.bd/assets/Circular%20GST%202025-26.pdf

### 10.5 Agriculture cluster 2025–26: official circular and multi-institution scope

The Agriculture Cluster Admission System (ACAS) official domain exposes a 2025–26 admission guideline PDF. The extracted text identifies a cluster of nine public universities and an overall seat count of 3,701, with a stated exam date of 3 January 2026, 14:00–15:00. This source is an official admissions guideline rather than a third-party coaching summary. However, the OCR of the PDF is poor, so the full eligibility, subject weighting, question structure, marks and negative-marking rules must be transcribed from the rendered pages before the JMT exam-spec record is approved.

Primary sources:
- ACAS official notice portal: https://acas.edu.bd/notice
- 2025–26 admission guideline PDF: https://acas.edu.bd/api/file/download/notice/f021b80d-d79e-43a0-a9ac-96130ad452ea.pdf

### 10.6 BUET and medical admission: primary-source retrieval remains incomplete

A search for the 2025–26 BUET circular surfaced a third-party-hosted copy of a prospectus and press coverage, but this tranche did not verify the Bangladesh-national circular directly from BUET's official admission portal. Do not use the third-party copy as the canonical source record. The official admission site retrieval timed out in this pass. BUET's exact eligibility, shortlisting, written-test structure, subject marks and drawing requirements remain pending direct primary-source verification.

For medical admission, the DGME official notice archive is accessible, but the exact 2025–26 public MBBS/BDS domestic admission circular was not successfully extracted in this pass. The DGME archive and Ministry notices remain the canonical retrieval targets; third-party coaching summaries are not acceptable as the final specification source.

Primary targets:
- BUET admission portal: https://admission.buet.ac.bd/
- DGME notices: https://dgme.gov.bd/site/view/notices/সম্পূর্ণ-নোটিশ-বোর্ড

### 10.7 New curriculum and admission data model requirements

The evidence above requires two separate, versioned registries rather than a single generic “syllabus” table.

**Curriculum registry minimum fields**
- jurisdiction and authority (NCTB, education board, ministry, technical/madrasa authority);
- qualification and grade (SSC, HSC, equivalent);
- academic cohort start/end and examination year;
- candidate status where relevant (regular, irregular, improvement);
- board, group/stream, subject, paper and language/medium;
- curriculum/syllabus version, effective date, publication date and superseded date;
- included/excluded chapters and learning outcomes;
- written/MCQ/CQ/practical/viva marks and duration where officially specified;
- canonical source URL, document checksum, retrieval timestamp, page/section locator, evidence grade and reviewer;
- change log and explicit compatibility rules with prior years.

**Admission exam registry minimum fields**
- institution/cluster, academic session, unit/group, programme and candidate category;
- eligible SSC/HSC cohorts, streams and GPA thresholds;
- subjects tested, section weights, question types, total marks and duration;
- negative marking, pass thresholds, drawing/practical components and calculator policy;
- exam date, application windows, official circular version and addenda;
- source URL, checksum, page/section locator, retrieval timestamp, OCR confidence, reviewer and status (draft/verified/superseded).

No admission predictor or student eligibility checker should be built from unversioned or third-party-only specifications.

### 10.8 Evidence grading for this tranche

- **A — Primary source directly fetched:** NCTB official revised-syllabus archive; NCTB official textbook pages; DU official admission portal; GST circular hosted by a participating university; ACAS official admission guideline and notice portal.
- **B — Primary source found but extraction needs visual verification:** GST circular values due OCR/encoding defects; ACAS PDF details due OCR/encoding defects.
- **C — Secondary lead only:** BUET 2025–26 prospectus copy hosted on an education site and press reporting; not accepted as canonical.
- **Open / not yet verified:** BUET domestic circular details; 2025–26 domestic MBBS/BDS exam specification; exact GST subject marks matrix; exact ACAS subject marks matrix; current HSC 2026 science-subject syllabuses and practical mark schemes; subject-by-subject SSC curriculum and assessment matrices.

### 10.9 Next research actions

1. Download and visually inspect each official NCTB attachment, including the 2026 cohort-specific Bangla/English notice, and build a subject/paper chapter map for HSC Science + ICT first.
2. Locate the actual 2026 HSC examination syllabus notices and practical mark schemes from each relevant board/authority; do not assume that an archive page listing historical revised syllabuses is the current syllabus.
3. Transcribe the GST and ACAS circulars page-by-page from rendered PDF pages; reconcile OCR against the original Bengali text.
4. Obtain DU 2026–27 session circular PDFs and each unit's formal guidelines, then freeze the specification with a retrieval date.
5. Retrieve BUET and DGME domestic circulars directly from official domains; record inaccessible pages as a gap, not as evidence.
6. Expand the same primary-source process to engineering cluster, SUST, JU, CU, RU, IUT, IBA and other major programmes, session by session.
7. Build a question-paper archive only after rights/provenance and syllabus-version mapping are recorded.


## 11. Research tranche 3 — HSC operational rules and DU 2026–27 live cycle (11 November 2026)

### 11.1 Critical discovery: 2026 regular and irregular HSC candidates were handled against different syllabus years

The Dhaka Education Board's official HSC Corner lists a notice dated 3 July 2026 titled (translated): “Regarding seating regular examinees (2026 syllabus) and irregular examinees (2025 syllabus) in different rooms and taking extra care in question distribution according to syllabus.”

This is direct primary-source evidence that “HSC 2026” is not a sufficient curriculum identifier. Within the same examination year, candidate status changes the applicable syllabus and operational paper distribution. This is a high-priority rule for JMT:
- identify candidate status before showing syllabus coverage or generating an exam plan;
- bind each learner to the correct syllabus year/version;
- prevent a regular candidate's content map from being mixed with an irregular/improvement candidate's map;
- include status in question-bank filters, mock-exam generation, analytics and predictor evaluation;
- test the eligibility and syllabus mapping against board notices, not assumptions.

Primary source: https://dhakaeducationboard.gov.bd/index.php/site/product/hsccorner?w=on

### 11.2 Practical examinations are a governed assessment workflow, not merely a simulation

The same official HSC Corner lists multiple 2026 notices concerning practical examinations:
- urgent instructions for HSC/equivalent practical examinations (4 August 2026);
- examiner instructions and examiner lists (6–11 August 2026);
- extension of the practical examination and marks-submission deadline (8 August 2026);
- district/city-specific external examiner assignments;
- practical answer-book and other exam materials distribution notices.

This confirms that the practical component includes examiner assignment, formal instructions, answer-book/material handling, deadlines and marks submission. JMT's virtual labs should support learning and preparation, but must not claim that simulation completion alone equals official practical examination competency. A future lab/report workflow should support teacher/examiner rubrics, observation records, viva questions, practical notebook evidence, review status and mark entry while clearly distinguishing simulated evidence from physical practical assessment.

### 11.3 Board-level exam governance and exam-security evidence

The HSC Corner also lists:
- a question-setter/moderator training manual (1 February 2026);
- notices about training question setters and moderators;
- question-paper receipt, storage, dispatch and distribution security instructions (7 July 2026);
- calculator and wristwatch-use instructions for candidates (17 June 2026).

These are important source categories for the exam research programme. The public question-setter/moderator training manual may help explain the official assessment construction process and should be reviewed if accessible. Security notices are operational evidence only; they must not be used to infer or seek confidential examination content.

### 11.4 DU 2026–27 is now confirmed as a separate current admission session

The official DU admission portal exposes an item explicitly titled “Admission Circular for Undergraduate Programs for the 2026–2027 Academic Year” and a separate “Admission Prospectus 2026-27”. It also provides distinct guidelines for Science, Arts/Law/Social Science, Business Studies, Fine Arts and IBA. The current portal date table observed on 11 November 2026 lists the application window as 11–25 November 2026 and unit-specific exam dates from 5–26 December 2026.

This upgrades the earlier portal observation: the live admissions data belongs to the 2026–27 academic session. The formal circular/prospectus files must still be extracted and checked page-by-page before encoding exact marks, subject weights, negative marking, eligibility and question format. Each unit is its own exam specification, not one DU-wide predictor.

Primary source: https://admission.eis.du.ac.bd/

### 11.5 HSC source taxonomy and extraction queue refined

For HSC source capture, JMT should treat the following as distinct document classes:
1. Curriculum/syllabus: included topics and learning outcomes.
2. Examination pattern/mark distribution: CQ/MCQ/written/practical marks, time and question-choice rules.
3. Candidate-status notices: regular, irregular, improvement/private candidate applicability.
4. Practical examination instructions: tasks, examiner responsibilities, marks submission and rubrics.
5. Exam operations: timetable, centre, calculator rules, answer-book handling and security.
6. Question construction/moderation guidance: official public manuals and training materials.
7. Historical question papers and answer keys: separate provenance, rights and confidentiality screening.

This prevents the common mistake of treating a timetable or exam operations notice as a syllabus, or a syllabus PDF as a full assessment blueprint.

Primary source for the live board notice index: https://dhakaeducationboard.gov.bd/index.php/site/product/hsccorner?w=on

### 11.6 Immediate implementation-independent acceptance requirements

- A candidate with HSC exam year 2026 and status “regular” must resolve to the 2026 syllabus version.
- A candidate with HSC exam year 2026 and status “irregular” must resolve to the 2025 syllabus version when the applicable board notice says so.
- The UI must display the syllabus source and effective year visibly, not merely “HSC 2026”.
- A course, planner, mock exam or predictor must refuse to silently combine incompatible syllabus versions.
- Practical lab completion must be labelled “simulation practice” unless reviewed and assessed through the institution's physical practical workflow.
- Every admission test specification must include academic session and unit; DU Science 2026–27 and DU IBA 2026–27 are separate records with separate formal source documents.


### 11.7 Corrected and sharpened 2026 HSC syllabus rule: regular candidates use the full syllabus; irregular/improvement candidates use the 2025 revised syllabus

The Dhaka Education Board HSC Corner lists an official notice dated 28 October 2025 titled “২০২৬ সালের এইচএসসি, আলীম ও সমমান পরীক্ষা পূর্ণাঙ্গ পাঠ্যসূচিতে গ্রহণ প্রসঙ্গে” (regarding holding the 2026 HSC, Alim and equivalent examinations on the full syllabus). The same official index lists a separate notice dated 11 December 2025 concerning the syllabus for irregular/improvement candidates in the 2026 HSC/equivalent/Alim examinations. The 3 July 2026 operational notice then explicitly distinguishes regular candidates under the 2026 syllabus from irregular candidates under the 2025 syllabus and instructs centres to seat them separately and distribute papers according to syllabus.

Therefore the high-confidence operational rule supported by the official board index is:
- HSC 2026 regular candidates: full 2026 syllabus.
- HSC 2026 irregular/improvement candidates: 2025 rearranged/revised syllabus.
- Candidate status is part of curriculum identity and must be resolved before content, question papers, mock exams, planner coverage or prediction.

The 2026 NCTB archive entry for the 2024–25 cohort's Bangla 1st Paper syllabus and English 1st Paper mark distribution should be interpreted as a subject-specific notice within the wider full-syllabus framework, not evidence that the entire 2026 regular cohort followed a short syllabus.

Primary source: Dhaka Education Board HSC Corner, entries dated 28 October 2025, 11 December 2025 and 3 July 2026: https://dhakaeducationboard.gov.bd/index.php/site/product/hsccorner?w=on

This supersedes any weaker inference that the 2026 regular syllabus could be assumed to be a carry-forward of the 2025 revised syllabus. The official 2026 regular/full-syllabus and irregular/improvement/2025-revised distinction must be represented explicitly in the Curriculum Registry.


### 11.8 Source-resolution warning: the publicly retrievable training-manual page found is an SSC manual, not proof of an HSC manual

The official HSC Corner index lists an HSC/equivalent question-setter and moderator training manual dated 1 February 2026. However, a search for the manual title resolved to an official Dhaka Board CMS page whose page heading and downloadable files are explicitly for **SSC and equivalent** (SSC-25), including subject manuals for Physics, Chemistry, Biology and Higher Mathematics. This is not the HSC manual and must not be cited as such.

The SSC manual itself is potentially useful background on Bangladesh's creative-question item-writing and moderation process, but its grade-level scope must remain explicit. The HSC manual's actual downloadable URL and contents are still unresolved. Do not transfer SSC question design rules to HSC without checking the applicable HSC document and current assessment framework.

Sources:
- Official HSC Corner index: https://dhakaeducationboard.gov.bd/index.php/site/product/hsccorner?w=on
- Official CMS page that was retrieved, explicitly headed for SSC/equivalent: https://dhakaeducationboard.gov.bd/index.php/site/cms/24590?w=on


## 12. Research tranche 4 — HSC 2026 assessment architecture and exam operations (11 November 2026)

### 12.1 Official HSC 2026 routine exposes the written assessment structure

The Dhaka Education Board's official HSC Corner includes the HSC 2026 examination routine and candidate instructions. The extracted instructions state:
- For subjects without a 25-mark practical component: MCQ 30 marks in 30 minutes, followed immediately by CQ 70 marks in 2 hours 30 minutes.
- For subjects with a 25-mark practical component: MCQ 25 marks in 25 minutes, followed immediately by CQ 50 marks in 2 hours 35 minutes; the practical component is separately assessed.
- MCQ is held first, then CQ, with no break between the two.
- Candidates must pass the theory, MCQ and practical components separately where applicable.
- Candidates may use a general non-programmable scientific calculator and an ordinary wristwatch; programmable calculators and smartwatches are prohibited.

These rules are high-value for the assessment engine, timed mock exams and score reports. JMT must model component-level marks and pass rules, not merely total marks. The exam simulator must support sequential sections with an automatic section transition and no inter-section break where the official pattern requires it. The calculator policy must be versioned by exam session and must not be generalized to university admission tests.

Primary source: Dhaka Education Board HSC Corner, including the HSC 2026 routine and the 17 June 2026 calculator/watch notice: https://dhakaeducationboard.gov.bd/index.php/site/product/hsccorner?w=on

### 12.2 Do not hardcode the assessment split across all subjects

The board instruction explicitly distinguishes subjects with and without a 25-mark practical component. Therefore the marks blueprint must be a subject-paper-session record. It must not assume:
- every subject has practical marks;
- every subject uses 30 MCQ + 70 CQ;
- practical marks can be combined with theory for pass/fail;
- every institution's internal mock exam should exactly mimic the national public exam.

The source-backed schema should include component name, maximum marks, duration, sequence, mandatory/optional status, separate pass requirement, permitted tools, and effective exam session. For a practical subject, store theory MCQ, theory CQ, practical, and any viva/other components separately only when the official subject-specific rules support them.

### 12.3 HSC practical administration: external examiner and marks submission are explicit workflows

The HSC Corner lists subject-code-grouped examiner instructions, external examiner lists by district/city, urgent practical-exam notices, and a deadline-extension notice for practical examination and online marks submission. This confirms that practical assessment is institutionally administered and examiner-governed.

For JMT:
- Virtual labs should be labelled as simulation-based learning and practice.
- A completed virtual experiment must not automatically be treated as an official HSC practical pass or official practical mark.
- A teacher-facing practical record may capture task, date, candidate, observations, apparatus/simulation mode, rubric, examiner, viva, review and marks, but official mark status must remain distinct from student practice evidence.
- Practical assessment data should support audit trails and role-based access.

Primary source: same official HSC Corner index above; notices dated 4–11 August 2026.

### 12.4 Question-setter/moderator training manual: HSC resource is listed but direct file resolution is pending

The HSC Corner lists an HSC/equivalent question-setter and moderator training manual dated 1 February 2026, as well as HSC question-paper preparation and moderation training notices in late 2025 and early 2026. The public file link was not resolved in this extraction. A separate official page discovered earlier is clearly for SSC-25 and must not be mistaken for the HSC manual.

The HSC Corner also records that the inter-board coordination committee and Dhaka Board's Bangladesh Examination Development Unit were conducting HSC question-paper setter/moderator training. The programme's 23-subject coverage is described in contemporaneous reporting; primary notices remain the preferred source. JMT should pursue the HSC manual and any public assessment-framework materials, but should not infer confidential exam content or seek restricted documents.

Primary source index: https://dhakaeducationboard.gov.bd/index.php/site/product/hsccorner?w=on

### 12.5 Implications for the JMT exam engine

Required domain model:
- Exam blueprint (session, board, qualification, subject, paper, candidate status).
- Exam section (MCQ/CQ/practical/viva/other), ordering, time, maximum marks and instructions.
- Question type and response mode, including choice rules and section-specific navigation.
- Component-level grading and separate pass rules.
- Tool policy (calculator class, watch, device restrictions) by session.
- Exam attempt timer with reliable autosave, reconnect handling and audit events.
- Results that show total score and each separately passed/failed component.
- Mock exam mode that clearly distinguishes official-pattern simulation from a teacher-created assessment.

Acceptance tests:
1. A 2026 HSC subject without practical can configure 30-minute MCQ followed by 150-minute CQ, 100 total marks, with no break.
2. A 2026 HSC subject with 25 practical marks can configure 25-minute MCQ followed by 155-minute CQ, with the 25-mark practical component recorded separately.
3. The result evaluator cannot award an overall pass if a required component's separate pass threshold is not met.
4. Candidate instructions can display the correct calculator/watch policy for that exam session.
5. The same engine supports a different admission exam blueprint without inheriting HSC-specific assumptions.

### 12.6 Evidence grade and limitations

- **A — Primary source:** Dhaka Education Board official HSC Corner and its HSC 2026 routine/candidate instructions and calculator notice.
- **A — Primary source:** official HSC Corner listings of practical examiner instructions and examiner assignments.
- **Open:** exact subject-by-subject mapping of which HSC subjects have 25-mark practical components and their practical rubrics; must be transcribed from official subject-specific documents.
- **Open:** HSC setter/moderator manual direct PDF and contents.
- **Do not use:** third-party "HSC 2026 short syllabus" claims where they contradict the official full-syllabus notice for regular candidates.
