# JMT Official Curriculum Source Verification — Tranche 18 (NCTB 2026–27 HSC notice and textbook provenance)

**Research date:** 11 November 2026  
**Branch:** `audit/jmt-master-prompt-follow-through`  
**Purpose:** Record a newly surfaced official NCTB notice while preventing an inaccessible attachment or third-party copy from being mistaken for verified syllabus content.

## 1. Official NCTB notice index: 2026–27 Higher Secondary prescribed syllabus

Official NCTB notices page:
- https://nctb.gov.bd/pages/notices/

The live notice index lists this entry:
- Title: `২০২৬-২৭ শিক্ষাবর্ষের উচ্চ মাধ্যমিক ও সমমান শ্রেণির জন্য নির্ধারিত পাঠ্যসূচি`
- Publication date shown in the NCTB notice index: 01-10-2026.
- Authority: National Curriculum and Textbook Board (NCTB).

### Verification limitation
- The NCTB notices page is official evidence that a notice with this title and date is listed.
- A live Firecrawl scrape of the notices page did not expose a detail-page URL or an attachment URL for this row; the rendered notice body was empty/dynamic.
- Targeted search did not recover a direct NCTB-hosted PDF. Search results from third-party sites are not sufficient to establish the contents of the official notice.
- Therefore this tranche does **not** claim to have inspected the syllabus, subject list, learning outcomes, chapter allocations, marks distribution or practical requirements attached to the notice.
- A third-party mirror/index mentions English First Paper, code 107, but that is not accepted as proof of the complete official notice scope.

**Registry status:** `official_notice_index_verified`; `notice_attachment_unretrieved`; `syllabus_content_unverified`.

## 2. Separate official NCTB notice: 2026–27 textbook security paper

The same NCTB notice index lists a second notice dated 24-09-2026:
- Title: `২০২৬-২০২৭ শিক্ষাবর্ষের একাদশ-দ্বাদশ শ্রেণির পাঠ্যপুস্তকসমূহে এনসিটিবি'র জলছাপযুক্ত নিরাপত্তা কাগজসহ মুদ্রণ ও বাঁধাই করে বাজারজাত নিশ্চিত করা সংক্রান্ত গণবিজ্ঞপ্তি`.
- This establishes that NCTB issued a notice about security-paper/watermark requirements for printing and marketing Class XI–XII textbooks for academic year 2026–27.
- It does not, by itself, identify which commercial reference books are prescribed or endorsed, nor does it validate any commercial author's textbook.

**JMT implication:** distinguish NCTB-issued/approved textbooks from commercial reference titles. A publisher's claim of “NCTB syllabus based” is not equivalent to NCTB prescription or endorsement.

## 3. Historical NCTB syllabus archive: scope and age warning

Official archive:
- https://nctb.gov.bd/site/page/9a90c854-ce5f-4d77-9915-1ecd0953079d/-

The archive page currently exposes historical entries including:
- 2022 HSC revised syllabus.
- 2021 HSC revised syllabus.
- 2023 HSC revised syllabus.
- 2024 HSC revised syllabus (noted as similar to 2023).
- 2025 HSC/Alim revised syllabus.
- 2024–25 XI–XII session notices associated with the 2026 HSC exam (Bangla First Paper syllabus and English First Paper marks distribution).

This archive is useful for historical cohort records, but it is not evidence that the current 2026–27 HSC cohort syllabus has been retrieved. The archive's presence of earlier short/revised syllabuses must not lead JMT to apply them to later cohorts.

Official NCTB Higher Secondary page:
- https://nctb.gov.bd/site/page/09a1f085-f10e-45c3-b9c6-da9bc6d8cd19/উচ্চমাধ্যমিক
- Its currently visible textbook list is dated 2022–23 and includes Literature, Companion, English for Today and ICT. Its page last-update metadata is 2023; it must not be represented as the current 2026–27 textbook inventory.

## 4. Required cohort model

For JMT, do not store “HSC syllabus” as one mutable global record. The minimum curriculum key must include:

- Board / authority.
- Academic session (e.g. 2026–27).
- Expected examination year (e.g. 2028, only where official cohort mapping confirms it).
- Candidate status (regular, irregular, improvement, equivalent/Alim, BM, vocational).
- Group / stream.
- Subject and paper.
- Subject code, when verified.
- Medium/language.
- Curriculum/syllabus version and publication date.
- Learning outcome, unit, chapter and subtopic.
- Practical requirement and assessment component.
- Marks distribution, question format, time and pass rules.
- Source document, attachment URL, retrieval date, verification state and source checksum.

Every downstream object—course plan, lesson, textbook map, mock exam, question bank, predictor and admission plan—must bind to this exact curriculum version. Do not allow a later syllabus notice to silently mutate a learner's historical exam plan.

## 5. Official-source retrieval workflow

1. Capture the NCTB notice index row and publication date.
2. Retrieve the notice detail page and original attachment from an NCTB-hosted URL.
3. Preserve the original file, checksum, publication date, language and all pages.
4. Extract text and visually inspect tables/footnotes; OCR is not sufficient for subject codes or marks tables.
5. Have a second reviewer compare extracted data with the source pages.
6. Record the exact cohort and candidate status to which the document applies.
7. Only then promote the source state from `notice_attachment_unretrieved` to `official_syllabus_verified`.
8. Keep third-party mirrors as discovery leads, never as the canonical source where an official copy is available.

## 6. Current JMT action items

- Obtain the original NCTB 01-10-2026 syllabus notice attachment.
- Verify whether the attachment is a general higher-secondary syllabus index, a limited set of subjects, or a complete group-wise curriculum release.
- Verify the 2026–27 official NCTB textbook list and distinguish NCTB textbooks from commercial publisher reference books.
- Inspect NCTB security-paper notice detail and its exact scope.
- Update the Curriculum and Assessment Registry only after the attachment has been inspected.
- Do not infer HSC 2028 Chemistry/Physics/Biology/Higher Mathematics/ICT learning outcomes from the 2026 HSC syllabus or from commercial books' promotional descriptions.

## 7. Scope statement

This tranche verifies the existence and publication dates of two official NCTB notice-index entries. It does not verify the content of the 2026–27 syllabus attachment, a complete 2026–27 textbook list, or the alignment of any commercial reference book. The original NCTB attachments remain a critical unresolved evidence gate.
