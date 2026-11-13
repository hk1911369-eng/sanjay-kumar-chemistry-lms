# JMT HSC 2028 Curriculum Evidence Boundary — Tranche 18 (NCTB Notice Discovery and Institutional Syllabus Separation)

**Research date:** 11 November 2026  
**Branch:** `audit/jmt-master-prompt-follow-through`  
**Status:** Official NCTB notice listing verified; attachment/body content not yet extracted. A current institution-specific HSC 2028 science syllabus was retrieved and must remain separate from national curriculum truth.

## 1. New official NCTB notice located

NCTB official notice listing:
- https://nctb.gov.bd/pages/notices/
- Notice title: **২০২৬-২৭ শিক্ষাবর্ষের উচ্চ মাধ্যমিক ও সমমান শ্রেণির জন্য নির্ধারিত পাঠ্যসূচি**
- Date shown in NCTB's notice table: **1 October 2026**.
- Exact NCTB detail-page URL discovered through indexed official-site search:
  http://nctb.gov.bd/pages/notices/২০২৬-সালের-শিক্ষাবর্ষের-উচ্চ-মাধ্যমিক-ও-সমমান-শ্রেণীর-জন্য-নির্ধারিত-পাঠ্যসূচি-2yvrhr-6abf70ae2e520f8fc8858d74

**What is verified:** NCTB's official notice listing contains this title and date, and an official detail-page URL exists.

**What is not yet verified:** The detail page did not expose the notice body or downloadable attachment in the current extraction. Therefore, this tranche does not claim the exact subject list, chapter scope, cohort/exam-year applicability, marks distribution, or whether the document is a national HSC 2028 subject syllabus versus another prescribed academic-year syllabus instrument. The attachment must be obtained and read before curriculum mapping.

## 2. Related NCTB official sources

### NCTB higher-secondary textbook page
- https://nctb.gov.bd/site/page/09a1f085-f10e-45c3-b9c6-da9bc6d8cd19/উচ্চমাধ্যমিক
- The page currently surfaced in retrieval is last updated 12 July 2023 and lists 2022–23 Class XI–XII texts: Sahityapath, Sahaypath, English for Today and ICT.
- It is an old page and cannot establish the complete current 2026–27 textbook portfolio.
- Do not infer from this stale page that current HSC science/commercial reference books are NCTB-prescribed textbooks.

### NCTB 2026–27 textbook printing/safety-paper notice
- Official notice listing at https://nctb.gov.bd/pages/notices/
- The 24 September 2026 notice is titled as a public notice about printing, binding and marketing 2026–2027 XI–XII textbooks with NCTB watermark security paper.
- This establishes an official printing/supply process notice, not the identity or NCTB endorsement of every commercial reference book in the market.
- The actual notice and appendices still need extraction.

### NCTB syllabus archive
- https://nctb.gov.bd/site/page/9a90c854-ce5f-4d77-9915-1ecd0953079d/-
- The visible archive lists historical revised syllabuses for HSC 2021–2025 and some 2024–25 session materials. It does not, in the extracted content, show the newly listed 1 October 2026 higher-secondary notice attachment.
- Historical revised syllabuses must not be reused as the current 2026–27/Exam 2028 curriculum.

## 3. Current institution-specific HSC 2028 science syllabus — CESC

- PDF: https://cesc.edu.bd/public/ckfinder/userfiles/files/Syllabus_XI_%26_XII_(Science)_HSC%202028.pdf
- Issuer: Cantonment English School & College, Chattogram Cantonment.
- Class: XI & XII.
- Group: Science.
- Session: 2026–2027.
- HSC examination label: 2028.
- This is an institution-issued syllabus/assessment calendar. It is useful evidence of one school's internal teaching and assessment sequence, not a national NCTB syllabus or universal board exam blueprint.

### Chemistry sequence visible in the school PDF

**First Paper**
- Half-yearly: Chapter 1 Safe Use of Laboratory; Chapter 2 Qualitative Chemistry; Chapter 3 Periodic Properties of Elements and Chemical Bonds.
- First-year final: Chapter 4 Chemical Changes; Chapter 5 Vocational Chemistry.
- Pre-test: full First Paper syllabus (as the school document indicates).

**Second Paper**
- First-year final includes Chapter 1 Environmental Chemistry.
- The document's extracted pre-test sequence lists Chapter 2 Organic Chemistry up to multiple substitution reaction of benzene and orientation, and Chapter 3 Quantitative Chemistry.
- Final test preparation includes the remaining organic chemistry scope, Chapter 4 Electrochemistry and Chapter 5 Economic Chemistry.
- The exact school assessment sequence should be checked against the PDF's visual layout because extracted tables may interleave columns.

### Marks and assessment shown in the school document
- Internal evaluation tests show 10 MCQ marks + 10 CQ marks = 20.
- Half-yearly / first-year final tables include 25 MCQ + 50 CQ + 25 practical = 100 (as shown in the extracted table).
- The school's final board-standard test is described as 200 marks across Chemistry First Paper = 100 and Second Paper = 100.
- These are school assessment arrangements and a board-standard practice statement; do not overwrite official board exam structures with them.

## 4. Third-party syllabus claims and conflict handling

Search results surfaced third-party pages making incompatible claims about a separate HSC 2028 short syllabus and exam structure. One result asserted that a short syllabus was published; another stated no separate final official HSC 2028 syllabus was publicly available as of late September 2026.

Neither third-party page is sufficient authority to resolve the conflict. The official NCTB 1 October 2026 notice is now the primary retrieval target. JMT must:
1. Obtain the actual NCTB attachment.
2. Verify issuing authority, document date, title, scope, applicable academic year/cohort and subject coverage.
3. Compare it with the CESC internal schedule and identify differences.
4. Record board circulars separately from NCTB curriculum documents.
5. Keep any institution's term schedule in an institution-scoped record, never in the national curriculum table.

## 5. Required curriculum registry design

Add/retain separate entities for:
- `curriculum_document`: issuing authority, document title, date, version, official URL, attachment checksum, status and scope.
- `cohort_definition`: academic session, Class XI entry year, expected exam year, candidate status and applicable curriculum.
- `subject_syllabus`: subject/paper, subject code, language/medium, units/chapters, learning outcomes, practical requirements and effective dates.
- `institution_syllabus`: institution, campus, session, class, group, term, assessment sequence and local marks.
- `board_exam_blueprint`: board, exam year, subject/paper, MCQ/CQ/practical marks, timing, pass rules and choice rules.
- `evidence_observation`: raw source text, retrieval date, source type, confidence and unresolved conflicts.

Never store school term coverage as a national board syllabus. Never store a commercial publisher's chapter order as official syllabus order without source confirmation.

## 6. JMT product implications

- The planner should distinguish national syllabus completion from a school's teaching calendar.
- A student may belong to a national exam cohort while following an institution-specific term plan; both can be active without conflict.
- Course mapping should show the source and scope of each chapter assignment.
- Exam predictor and mock generator must use the verified board blueprint, not a school's internal term exam distribution.
- If the national official syllabus attachment is unavailable, mark cohort alignment as provisional and do not publish a “complete HSC 2028 syllabus” claim.
- Teacher/admin tools should allow an institution to add its own term plan without modifying the national curriculum source.

## 7. Immediate next actions

1. Obtain the 1 October 2026 NCTB notice attachment and extract all subject-specific syllabus/learning-outcome content.
2. Verify the 24 September 2026 NCTB textbook printing notice and its appendices.
3. Compare official NCTB documents with the CESC HSC 2028 school schedule.
4. Retrieve equivalent institutional plans from other schools only as local teaching-calendar evidence, not national authority.
5. Reconcile the official HSC 2028 Chemistry scope against each commercial book's contents pages.
6. Do not calculate syllabus coverage or predict questions until the national document and board assessment blueprint are both verified.

## 8. Scope statement

This tranche establishes the existence and date of a new NCTB 2026–27 higher-secondary prescribed-syllabus notice and records one institution's HSC 2028 internal syllabus. It does not yet establish the actual national Chemistry/Physics/Biology/Higher Mathematics syllabus contents, marks distribution or final HSC 2028 board exam blueprint. Those remain explicit open verification tasks.
