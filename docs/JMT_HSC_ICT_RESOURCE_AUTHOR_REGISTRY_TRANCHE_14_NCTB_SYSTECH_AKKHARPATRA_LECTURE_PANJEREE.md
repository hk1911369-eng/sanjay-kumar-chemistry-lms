# JMT HSC ICT Resource and Author Registry — Tranche 14 (NCTB, Systech, Akkharpatra, Lecture and Panjeree)

**Research date:** 11 November 2026  
**Branch:** `audit/jmt-master-prompt-follow-through`  
**Evidence status:** Direct publisher catalogue/product pages plus retailer metadata. No physical-copy inspection. This tranche deliberately separates the national curriculum textbook from commercial reference books, practice books and test papers.

## 1. Curriculum authority and resource hierarchy

The National Curriculum and Textbook Board (NCTB) is the curriculum/textbook authority. A commercial book's claim that it follows an NCTB syllabus is not proof that NCTB has prescribed or endorsed that commercial book.

Official NCTB archive:
- https://nctb.gov.bd/site/page/9a90c854-ce5f-4d77-9915-1ecd0953079d/-

A third-party 2026 listing reports a 219-page official Class XI–XII ICT textbook, but the PDF itself was not verified against an NCTB-hosted file in this tranche:
- https://nctbbooks.com/book/information-and-communication-technology-class-eleven-twelve/

**Registry rule:** Store the official NCTB textbook separately from commercial reference books. The NCTB textbook is the curriculum anchor; commercial resources can be mapped to it only after edition, cohort and chapter-content checks.

## 2. Systech Publications — Mahbubur Rahman

### Higher Secondary Information and Communication Technology (XI–XII; General and Alim)

- Publisher website: https://www.systechpublications.com.bd/
- Retail record: https://thebookcenterbd.com/product/nformation-and-communication-technology/
- Author: Mahbubur Rahman (মাহবুবুর রহমান).
- Publisher: Systech Publications Ltd.
- Edition: 22nd Edition, September 2026.
- Pages: 696 (retailer record).
- Language: Bangla/English according to retailer metadata; the physical book's exact language presentation needs inspection.
- Scope shown: Class XI–XII, General and Alim.
- The publisher's homepage independently lists “তথ্য ও যোগাযোগ প্রযুক্তি (পাঠ্যবই)” and identifies Mahbubur Rahman as the author of the XI–XII ICT book in its downloadable-publications section.
- The publisher website also lists a separate practical ICT title by Mahbubur Rahman.

**Edition discrepancy:** A BDBOOKS English-version listing reports a 2023 edition with 720 pages:
https://bdbooks.net/product/Information_and_Communication_Technology_For_Classes_11_12_English_Version__Mahbubur_Rahman

A Mamun Books record reports an English-language edition with 670 pages but does not expose a clear edition year in the retrieved extract:
https://mamunbooks.com/en/products/information-and-communication-technology-for-class-11-12

Do not merge 696, 720 and 670 page records. They may be distinct editions, language variants or retailer errors. The 22nd edition / September 2026 record is the current Bengali/general-Alim discovery lead; obtain its title and copyright pages before final bibliographic normalization.

### Separate Systech practice/Q&A resource — HSC 2023

- Publisher product page: https://www.systechpublications.com.bd/main/product/118
- Title: প্রশ্নোত্তরে-সৃজনশীল তথ্য ও যোগাযোগ প্রযুক্তি (এইচএসসি পরীক্ষা ২০২৩).
- Publisher describes it as an exclusive practice resource for XI–XII General and Alim learners.
- Pages: 544.
- Contributor description: teachers from leading colleges; no individual authors named in the retrieved page.
- Resource type: historical exam-specific practice/Q&A book, not the core textbook.
- Its description refers to the 2023 short syllabus. That must not be reused as the current cohort syllabus.

## 3. Akkharpatra Publications — ICT (2026)

### Publisher-origin product page

- Direct publisher page: https://akkharpatra.com/books_details.php?id=156
- Title: তথ্য ও যোগাযোগ প্রযুক্তি (Higher Secondary).
- Publisher: Akkharpatra Prokashani.
- Edition/year: 2026.
- Pages: 816.
- Author list on publisher page:
  1. এ জেড এম আসাদুজ্জামান (A. Z. M. Asaduzzaman)
  2. ড. মো. মাসুদ রানা (Dr. Md. Masud Rana)
  3. মোহাম্মদ আরিফুল ইসলাম (Mohammad Ariful Islam)
- Publisher product description mentions chapter-wise presentation, learning-outcome framing, HTML, website structure, algorithms, flowcharts, Python, SQLite, board questions and university admission questions. These are publisher-described features, not an independent quality assessment.

### English-version retailer record

- Rokomari: https://www.rokomari.com/book/579245/akkharpatra-information-and-communication-technology-class-11-12-english-version
- Title: Akkharpatra Information and Communication Technology (Class 11–12) — English Version.
- Retailer byline: A. Z. M. Asaduzzaman.
- Publisher: Akkharpatra Prokashani.
- Edition: 2026.
- Pages: 816.
- Language: English.
- Retailer classifies it as a textbook.
- **Byline discrepancy:** the publisher's Bengali product page lists three contributors; the English retailer record lists only A. Z. M. Asaduzzaman. Do not assume the English edition has one author or the same three contributors without inspecting its title page.

## 4. Lecture Publications — Creative ICT English Version, Exam 2028

- Rokomari: https://www.rokomari.com/book/584690/creative-information-and-communication-technology-english-version-hsc-2028
- Title: Creative Information and Communication Technology English Version — HSC 2028.
- Publisher: Lecture Publications Ltd.
- Edition/date: October 2026.
- Academic year: 2026–27.
- Pages: 960.
- Language: English.
- Retailer lists “Lecture” as author and editor (an editorial/publisher attribution, not an individual author list).
- Product description calls it a complete reference/practice resource with assessment, board analysis and suggestions.
- Resource type: commercial reference/practice book, not the official NCTB textbook.
- Do not treat “exclusive suggestions” or “admission excellence” marketing as evidence of prediction accuracy or educational effectiveness.

## 5. Panjeree ICT — question-and-answer/reference resource

- Retailer listing: https://bookshoper.com/book-details/panjeree-information-communication-technology-english-version-classes-11-12hsc
- Title: Panjeree Information & Communication Technology — English Version (Classes 11–12/HSC).
- Publisher: Panjeree Publications Ltd.
- Byline: Panjeree Editorial Board.
- The retrieved product description identifies topic-wise MCQs, selected textbook questions and solutions, creative/essay-type questions and previous board-exam questions.
- Exact edition, year, page count and ISBN were not exposed in the retrieved extract.
- Resource type: question/solution reference, not the official NCTB textbook.
- Do not infer a single named author from an editorial-board byline.

## 6. Systech identity and resource separation

The Systech publisher homepage lists multiple ICT-related products:
- Higher Secondary ICT textbook by Mahbubur Rahman.
- ICT practical book by Mahbubur Rahman.
- Separate HSC 2023 creative Q&A/practice book.
- Other general computer/IT titles.

These must be distinct registry entries:
- `core_textbook`
- `practical_manual`
- `practice_question_solution`
- `general_computing_reference`

The HSC 2023 Q&A resource is not a current HSC 2028 course textbook. A publisher's downloadable-PDF section does not itself establish redistribution rights for JMT; obtain explicit rights/permission before copying, indexing or distributing any full text.

## 7. ICT content-validation checklist for JMT

A current ICT book review should test more than whether it contains code examples.

### Curriculum and conceptual accuracy
- Number systems and conversions: independently recompute binary, octal, decimal and hexadecimal examples.
- Digital logic: truth tables, Boolean algebra, gates, simplification and circuit diagrams.
- Networking: protocol terminology, addressing, topologies, transmission media and security claims.
- HTML: validate syntax and rendered behavior; distinguish obsolete examples from current practice.
- Programming: compile/run every representative program; verify algorithms, flowcharts, control flow, loops, arrays and input/output assumptions.
- Database: validate relational concepts, keys, normalization claims, SQL syntax and query results.
- Practical work: distinguish a printed screenshot from a reproducible hands-on task.
- Security and privacy: verify contemporary examples and avoid unsafe instructions.

### Code-example testing
For every sampled program:
1. Record the printed source exactly (under lawful review access).
2. Record language/version and execution environment.
3. Run a clean copy in an isolated environment.
4. Test normal, boundary and invalid inputs.
5. Compare actual output with the book's stated output.
6. Record compiler/runtime errors and corrections.
7. Preserve page/edition references so an erratum can be tied to the exact edition.

### Pedagogy
- Verify that each chapter has prerequisite explanations, worked examples, independent exercises, feedback and misconception checks.
- Test Bangla and English terminology consistency.
- Check whether examples are locally meaningful without replacing accurate technical concepts with oversimplifications.
- Separate textbook explanation, practical tasks, board practice and admission enrichment.

## 8. Data-integrity rules

1. The NCTB textbook and commercial reference books have different authority levels.
2. Keep Bangla and English versions as separate edition records.
3. Keep the publisher's author list and retailer byline as separate source observations.
4. Do not normalize 696/720/670 page counts into one value.
5. Do not merge Systech's core textbook with its practical manual or HSC 2023 practice book.
6. Do not treat Lecture's Creative ICT or Panjeree question/solution book as an official textbook.
7. Store the cohort label (e.g. Exam 2028) as a retailer/source observation until mapped to an official NCTB/board cohort definition.
8. Store ISBN only when a valid printed or catalogued ISBN is actually present. Do not substitute retailer product IDs.

## 9. Next actions

1. Obtain Systech 22nd edition 2026 title/copyright/contents pages and verify its language, page count and ISBN.
2. Obtain Akkharpatra ICT Bengali and English title pages to resolve the author-list discrepancy.
3. Retrieve current Panjeree ICT edition/year/ISBN/pages and confirm its exact resource type.
4. Find any Lecture core ICT textbook distinct from its Creative ICT practice/reference book.
5. Verify the official NCTB 2026 ICT textbook file from an NCTB-hosted source and record its version, language, page count and contents.
6. Map the official ICT learning outcomes and practical requirements to each commercial book edition.
7. Do not ingest or distribute copyrighted full texts without permission.

## 10. Scope statement

This tranche adds ICT bibliography and resource-type distinctions. It does not establish a complete national ICT bibliography, NCTB endorsement of commercial products, educational quality ranking, or current cohort alignment. Physical copies and official curriculum files remain necessary for final verification.
