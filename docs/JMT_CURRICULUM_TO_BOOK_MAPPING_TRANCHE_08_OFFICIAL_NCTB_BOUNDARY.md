# JMT Curriculum-to-Book Mapping — Tranche 08 (Official NCTB Boundary and HSC 2026–27 Source Audit)

**Research date:** 11 November 2026  
**Repository:** hk1911369-eng/sanjay-kumar-chemistry-lms  
**Branch:** audit/jmt-master-prompt-follow-through  
**Purpose:** prevent commercial books and stale syllabus pages from being mistaken for official NCTB textbooks or current cohort curriculum.

## 1. Key finding: official textbook status and commercial reference-book status are different

The NCTB Higher Secondary textbook page currently retrieved is:
https://nctb.gov.bd/site/page/09a1f085-f10e-45c3-b9c6-da9bc6d8cd19/উচ্চমাধ্যমিক

Its displayed last-update date is 12 July 2023. It lists the 2022–2023 academic-year XI–XII textbooks:
1. সাহিত্যপাঠ
2. সহপাঠ
3. English for Today
4. তথ্য ও যোগাযোগ প্রযুক্তি

The page provides Bangla/English PDF columns. It does not list Physics, Chemistry, Biology, Higher Mathematics, Accounting, Economics, or the other commercial HSC reference texts in that displayed list.

Interpretation:
- The official NCTB textbook list and the wider market of HSC subject reference books are different catalogues.
- A publisher listing a book as an HSC textbook does not make it an NCTB-prescribed textbook.
- A commercial author/title may be widely used by colleges or learners and still remain a supplementary/reference resource rather than an official national textbook.
- JMT must represent the source of curricular authority separately from the books learners use to study a subject.

This finding is about what the currently retrieved NCTB page displays; it does not prove that no later official notice or subject-specific resource exists elsewhere. Check current notices and cohort-specific documents before making a definitive statement for a particular academic year.

## 2. NCTB syllabus archive: historical revised-syllabus material must not be reused as current syllabus

Official NCTB archive:
https://nctb.gov.bd/site/page/9a90c854-ce5f-4d77-9915-1ecd0953079d/-

The archive page is labelled for restructured syllabuses and question patterns. The retrieved list includes:
- 2022 HSC revised syllabus;
- 2021 HSC revised syllabus;
- 2023 HSC revised syllabus;
- 2024 HSC revised syllabus (same as 2023 revised syllabus);
- 2025 HSC and equivalent / Alim revised syllabus;
- a 2024–25 XI–XII / HSC 2026 Bangla First Paper syllabus and English First Paper marks-distribution notice.

The page's retrieved content does not itself establish the full current 2026–27 XI curriculum for Physics, Chemistry, Biology, Higher Mathematics, or every other subject. Do not use the page title "SSC & HSC Short Syllabus" as evidence that a current cohort has a short syllabus.

For HSC 2026, the separate Dhaka Board HSC Corner notices previously researched specify full syllabus for regular candidates and a different applicable syllabus for irregular/improvement candidates. Keep this candidate-status distinction in the exam-year registry.

## 3. 2026–27 XI curriculum: third-party transcription is a discovery lead, not an official source

A third-party page claims to reproduce the 2026–27 XI syllabus and shows:
https://www.ajkershikkha.com/2026/10/blog-post.html

The retrieved page includes:
- Bangla First Paper literary selections;
- ICT chapter headings such as ICT in world/Bangladesh context, communication systems and networking, number systems and digital devices, web design/HTML, programming language, and DBMS;
- English First Paper units and lessons.

This page is not hosted on NCTB's official domain. Even if it reproduces a genuine NCTB document, the transcription must be checked against the original official PDF before JMT uses any chapter list, learning outcome, or marks distribution. The retrieved extract did not provide an authenticated original document identifier or verifiable official download link.

The NCTB higher-secondary textbook page and NCTB revised-syllabus archive should be treated as separate source types; neither page alone is sufficient to establish every 2026–27 subject syllabus.

## 4. JMT's required curriculum authority model

Every curriculum statement should carry:

- authority_type: NCTB_curriculum | education_board_notice | admission_authority | institution_specific | publisher_claim | retailer_claim | community_claim
- authority_name: exact issuing body
- document_title
- document_number_or_notice_id
- publication_date
- effective_academic_year
- effective_exam_year
- candidate_status: regular | irregular | improvement | second_timer | other | unspecified
- stream and subject
- paper and subject_code
- medium
- syllabus_version
- official_source_url
- retrieved_at
- document_hash
- verification_status: discovered | retrieved | parsed | visually_reviewed | verified | superseded | rejected
- supersedes_document_id where applicable

A book record should separately include:
- resource_type: official_textbook | commercial_reference | guide | solution_book | test_paper | question_bank | practical_manual | admission_book | course_material
- publisher_claimed_curriculum_alignment
- independently_verified_curriculum_alignment
- chapter_map_status
- content_review_status
- rights_status

## 5. Rules for mapping books to syllabus

1. Start with the official syllabus for the learner's academic cohort and candidate status.
2. Split syllabus into subject, paper, chapter/unit, topic and learning outcome.
3. Capture a book's table of contents from a lawful physical or authorized digital copy.
4. Map each book section to syllabus outcomes using explicit coverage states:
   - full: the topic is substantively taught;
   - partial: only a portion is covered;
   - practice_only: questions but no substantive explanation;
   - extension: content beyond the official syllabus;
   - missing: no matching coverage;
   - conflicting: book content contradicts or misstates the official syllabus;
   - not_reviewed: contents unavailable or not yet checked.
5. Have a qualified subject reviewer check ambiguous mappings and sampled content.
6. Record edition-specific changes; never assume a new edition has unchanged chapter structure.
7. Do not treat retailer category labels such as "HSC 1st Year" or "Exam 2028" as authoritative curriculum statements.

## 6. Consequences for JMT course, planner and predictor

- Course plans should bind to the official syllabus version and cohort, not to a publisher's marketing label.
- A book can be attached as a recommended learning resource without becoming the syllabus authority.
- If two books cover the same outcome differently, JMT should compare content and source evidence rather than automatically select the most popular title.
- Exam question banks must be tagged by year, board, subject, paper, chapter/topic, question type, marks and source rights.
- Predictor training data must distinguish actual official exam questions from coaching/test-paper questions and commercial predictions.
- A guidebook's "common suggestion" is not a guaranteed question forecast.
- HSC 2026 regular, irregular and improvement candidate syllabus differences must not leak into a single undifferentiated course.

## 7. Immediate official-source retrieval queue

1. Retrieve and preserve the original official NCTB 2026–27 XI syllabus documents for Bangla, English and ICT; verify each file's authenticity and metadata.
2. Find official current subject syllabuses or curriculum documents for Physics, Chemistry, Biology, Higher Mathematics, Accounting, Finance, Business Organization, Economics and Humanities subjects.
3. Verify HSC 2027 and HSC 2028 cohort-specific syllabuses separately; do not assume one applies to all.
4. Obtain original official assessment pattern/marks-distribution notices and store them independently from chapter syllabuses.
5. Extract and visually inspect board notices and moderator-training manuals; ZIP availability is not equivalent to content review.
6. Link each commercial book's chapter map to the official syllabus version only after obtaining the contents pages.

## 8. Scope and confidence

**High confidence:** the retrieved NCTB Higher Secondary textbook page is explicitly dated 12 July 2023 and lists four titles for academic year 2022–2023; the retrieved NCTB revised-syllabus archive includes historical revised-syllabus items and a Bangla/English HSC 2026 notice.

**Not yet established:** complete current official 2026–27 subject-by-subject syllabus coverage; all HSC 2027/2028 cohort changes; current full textbook list for every subject; whether any later official document supersedes the pages retrieved here.

JMT should not label this research complete until the original current documents have been retrieved, hashed, parsed, visually checked and versioned.
