# JMT Research Addendum — Source Integrity and HSC 2026 Manual Resolution

**Date:** 11 November 2026  
**Branch:** `audit/jmt-master-prompt-follow-through`  
**Status:** Research addendum; no production changes.

## 1. Correction: reject third-party “HSC 2026 short syllabus” search results

A fresh Exa search surfaced a third-party page titled “HSC Short Syllabus 2026 PDF Download For All Subjects by NCTB” (BestBDJob, published 11 June 2026). Its claims conflict with the official Dhaka Education Board notices already recorded in the main research register: regular HSC 2026 candidates followed the full syllabus, while irregular/improvement candidates followed the applicable 2025 revised syllabus.

The third-party page is therefore **not an authoritative syllabus source** and must not be ingested as curriculum truth. Search ranking, page title, and the phrase “by NCTB” do not establish NCTB authorship. Its chapter summaries and marks tables are unverified and must not be used to seed JMT.

Source lead (rejected as canonical evidence): https://bestbdjob.com/hsc-short-syllabus/

Official NCTB syllabus archive: https://nctb.gov.bd/site/page/9a90c854-ce5f-4d77-9915-1ecd0953079d/-

Official Dhaka Education Board HSC Corner (primary notices on full syllabus, candidate status and exam operations): https://dhakaeducationboard.gov.bd/index.php/site/product/hsccorner?w=on

**Registry rule:** a curriculum document cannot become `verified` based on search snippet, filename, mirror, coaching page, or third-party re-upload. Require issuer, official-domain or authenticated source provenance, publication/effective date, applicable cohort/candidate status, and human review.

## 2. HSC 2026 question-setter/moderator manuals — direct subject ZIP links resolved

The official Dhaka Education Board HSC Corner collection now has direct subject ZIP links identified for the HSC-26 moderator training materials:

- Physics: https://dhakaeducationboard.gov.bd/Moderator%20Training%20Manual/HSC-26/Book_02_Physics.zip
- Chemistry: https://dhakaeducationboard.gov.bd/Moderator%20Training%20Manual/HSC-26/Book_11_Chemistry.zip
- Biology: https://dhakaeducationboard.gov.bd/Moderator%20Training%20Manual/HSC-26/Book_05_Biology.zip
- Higher Mathematics: https://dhakaeducationboard.gov.bd/Moderator%20Training%20Manual/HSC-26/Book_07_Higher_Math.zip
- ICT: https://dhakaeducationboard.gov.bd/Moderator%20Training%20Manual/HSC-26/Book_08_ICT.zip
- Collection/index: https://dhakaeducationboard.gov.bd/index.php/site/cms/24857

This resolves the earlier **link-discovery** gap, not the **content-review** gap. The ZIP files have not yet been unpacked, checksum-recorded, read or assessed for scope. No question-setting principles should be attributed to them until each archive is extracted and the actual document title, issuing authority, date, subject and page content are checked. Keep the SSC-25 manual page separate; it is not a substitute for HSC-26.

## 3. What the fresh search did and did not establish

The search again surfaced the official NCTB archive and official Dhaka Board HSC Corner. It did not retrieve canonical chapter-by-chapter full-syllabus PDFs for all HSC 2026 Science subjects. A search result that describes a full syllabus is not a substitute for the source document.

The official NCTB archive contains historical rearranged syllabuses for earlier examination years and a specific 2024–25 cohort notice for HSC 2026 Bangla 1st Paper syllabus and English 1st Paper marks distribution. These are document-specific records; the archive must not be treated as one consolidated, current, all-subject HSC 2026 syllabus.

## 4. Curriculum registry: minimum verification state machine

Recommended states:

1. `discovered` — URL/title located; not usable for teaching or assessment.
2. `retrieved` — original file/page downloaded or captured with timestamp and checksum.
3. `parsed` — text/tables extracted with page or section locators; OCR confidence recorded.
4. `reviewed` — human reviewer checked issuer, subject, cohort, effective date and content against the original.
5. `verified` — primary source and applicability confirmed; safe for product use within the recorded scope.
6. `superseded` — replaced by a later applicable source; retained for audit and historical cohorts.
7. `rejected` — wrong issuer, wrong cohort, mirror-only, conflicting or otherwise unsuitable.

Do not let a search crawler or AI model promote a record directly from `discovered` to `verified`.

## 5. First HSC 2026 Science extraction batch

Start with subject/paper identity, then map chapters only after retrieving the actual official source:

| Subject | Paper 1 code | Paper 2 code | Manual link resolved? | Syllabus chapter map |
|---|---:|---:|---|---|
| Physics | 174 | 175 | Yes — ZIP identified | Pending primary syllabus extraction |
| Chemistry | 176 | 177 | Yes — ZIP identified | Pending primary syllabus extraction |
| Biology | 178 | 179 | Yes — ZIP identified | Pending primary syllabus extraction |
| Higher Mathematics | 265 | 266 | Yes — ZIP identified | Pending primary syllabus extraction |
| ICT | 275 | 275 (single subject) | Yes — ZIP identified | Pending primary syllabus extraction |

The subject codes above are a working mapping that must be checked against current official board/NCTB documentation before production use. ICT is a single subject, not two distinct paper codes.

## 6. Next gates

- Download the five official ZIPs, preserve original filenames, record SHA-256 checksums, extract without executing embedded content, and review the manuals.
- Obtain official syllabus and textbook sources for each subject and paper; record cohort and candidate applicability.
- Reconcile each syllabus topic against textbook chapter/section/page and the applicable assessment objective.
- Map practical subjects and their marks/rubrics from subject-specific official documentation, not generic third-party tables.
- Visually inspect the original GST and ACAS admission circular PDFs before accepting OCR-derived marks or eligibility.
- Extract DU 2026–27 circular/prospectus unit-by-unit from the official admission portal.
- Keep BUET and domestic MBBS/BDS session specifications marked open until their official session circulars are retrieved and reviewed.

## 7. Product consequence

JMT must preserve the distinction between:
- **source discovery** and **curriculum truth**;
- **question-setter training material** and **public exam content**;
- **syllabus coverage** and **assessment blueprint**;
- **theory assessment** and **practical competency**;
- **regular** and **irregular/improvement** candidate pathways.

These distinctions are foundational to the syllabus planner, course catalogue, question bank, mock-exam engine, teacher analytics and any future predictor.
