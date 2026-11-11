# JMT Book & Author Knowledge Registry — Scope, Evidence and Initial Physics Records

**Date:** 11 November 2026  
**Branch:** `audit/jmt-master-prompt-follow-through`  
**Status:** Initial discovery register; not a complete national bibliography and not a claim that full books have been ingested.

## 1. Product requirement

JMT must build a versioned, source-linked knowledge map of the books actually used by Bangladesh learners, teachers and admission candidates. The scope is broader than NCTB textbooks.

Include, at minimum:
- NCTB textbooks, curriculum/syllabus documents and official teacher guides;
- board-prescribed or institution-recommended texts where documented;
- major Bangladesh HSC reference/academic books, with authors, editors, publishers and editions;
- practical/lab manuals;
- chapter-wise question banks, test papers, model tests and past-paper compilations;
- university admission, engineering, medical, agriculture, GST and other competitive-exam books;
- coaching-centre and teacher-authored materials, clearly labelled as commercial/supplementary;
- international foundational references only where relevant to a defined learning outcome or advanced explanation.

A publisher catalogue or retailer listing is discovery evidence, not proof that a book is officially prescribed or pedagogically superior.

## 2. Initial Physics discovery: Okkhorpotro / Akkhorpatra and “Ishaq Sir”

The user specifically highlighted “Isaac/Isak Sir” and Okkhorpotro. A retailer listing identifies the author as **Prof. Mohammad Ishaque (প্রফেসর মোঃ ইসহাক)** in a separate Physics 1st Paper title published by Ideal Books Dhaka. This is a plausible match for the user's “Ishaq/Isaac Sir” reference, but identity should remain provisional until checked against the physical title page or publisher catalogue.

### Records located

| Record | Bibliographic details | Evidence / status |
|---|---|---|
| Physics 1st Paper (HSC XI–XII), Ideal Books Dhaka | Authors listed: Dr. Amir Hossain Khan, Prof. Mohammad Ishaque, Dr. Md. Nazrul Islam. 2026 edition; retailer lists 1,000 pages and ISBN 978-984-95-0161-9. | Retail listing only; discovery record, not verified against title page. https://deshlibrary.com/product/physicas-ishak1st/?v=92f2567b3638 |
| Okkhorpotro Physics 1st Paper | Authors listed: Prof. Md. Golam Hossain Pramanik, Dewan Nasir Uddin, Prof. Dr. Rabiul Islam. Retailer lists 2026 edition; ISBN 978-984-95-0161-9 appears on a different retailer listing and must not be assumed to apply to this title without verification. | Retailer listing; edition/metadata cross-check required. https://trustmart.bd/product/পদার্থবিজ্ঞান-১ম-পত্র-উচ্চ-মাধ্যমিক |
| Okkhorpotro Physics 2nd Paper (HSC XI–XII) | Authors listed: Prof. Md. Golam Hossain Pramanik, Dewan Nasir Uddin, Dr. Rabiul Islam. 12th edition, 2026; retailer lists 992 pages and ISBN 2607020410454. | Retailer listing; verify on title/copyright page. https://www.eboighar.com/index.php/booksdetails/77994/ |
| Okkhorpotro Practical Physics 1st & 2nd Paper | Same three authors listed; 10th edition, 2026; 192 pages; retailer lists ISBN 2607020410576. | Retailer listing; verify on title/copyright page. https://www.eboighar.com/index.php/bn/booksdetails/78011/ |
| Okkhorpotro Mathematical Physics 2nd Paper | Retailer lists 3rd edition, 2026; 800 pages; author metadata not visible in the retrieved snippet. | Discovery only; author and ISBN need direct verification. https://www.eboighar.com.bd/bn/booksdetails/77912/ |

**Important bibliographic caution:** The same ISBN appearing on more than one retailer page may reflect a retailer data error or a mismatched product record. Do not merge records on title similarity alone. ISBN, author order, edition, publisher imprint and physical title-page evidence must be reconciled.

## 3. Broader HSC Science author discovery leads

A historical HSC science booklist surfaced these Physics author/publisher leads:
- Dr. Amir Hossain Khan, Prof. Mohammad Ishaque, Dr. Md. Nazrul Islam — Ideal Books Dhaka;
- Prof. Md. Golam Hossain Pramanik and Dewan Nasir Uddin — Okkhorpotro;
- A.T.M. Shamsur Rahman Shelu and Zakaria Touhid;
- Md. Abdul Gani, Shushantu Sarkar, Mozibur Rahman and Titash Rozario;
- Dr. Shahjahan Tapan.

The same historical list surfaced Chemistry leads:
- Mahbub Hasan Linkon, Dr. Md. Abdul Karim and Md. Nurul Islam;
- Swapan Kumar Mistry;
- Haradhan Nag;
- Sanjit Kumar Guha.

Source is an older, user-uploaded-style booklist mirror, not an official current prescription list: https://www.scribd.com/document/714137281/Booklist-XI-XII-Science-2021-2022-HSC-2023

These are leads for publisher/edition verification, not a definitive current bibliography. The list must be rebuilt subject-by-subject and session-by-session.

## 4. Book knowledge model

Each title needs a canonical record with:
- stable book ID; exact title in Bangla and English/transliteration;
- author(s), editor(s), contributor(s), role and preferred name spelling;
- publisher/imprint, publication year, edition, ISBN/other identifier, language, format;
- subject, paper, class/cohort, curriculum and examination session applicability;
- official status: prescribed / recommended / supplementary / commercial / unknown;
- intended learner level and prerequisites;
- chapter/section/learning-outcome map with page locators;
- topic coverage, definitions, derivations, worked examples, diagrams, experiments, question types and answer/explanation presence;
- errata, corrections, edition changes and known inconsistencies;
- provenance URL or physical-copy evidence, access date, checksum for permitted digital files, reviewer and confidence;
- copyright/licence status and permitted uses.

Keep separate entities for book, edition, chapter, concept, question, worked solution, experiment and syllabus outcome. Never treat editions as interchangeable.

## 5. How JMT should learn from books

For each lawfully accessible edition, build a chapter-level concept map and compare:
1. syllabus coverage and missing topics;
2. accuracy of definitions, units, formulae, derivations and worked solutions;
3. prerequisite sequencing and explanation clarity;
4. Bengali terminology consistency and English equivalents;
5. worked-example quality and difficulty progression;
6. MCQ/CQ/problem coverage and alignment to current blueprint;
7. practical work, uncertainty, significant figures, graphing and safety;
8. errata and edition-specific changes.

The system should synthesize independent explanations in its own words, cite the relevant book/edition/page when licensed and available, and preserve attribution. Do not reproduce entire copyrighted books, scan dumps, or long passages. Full-text ingestion and redistribution require appropriate rights. If only bibliographic metadata or a lawful excerpt is available, record that limitation rather than pretending to know the whole book.

## 6. Quality assurance and conflict handling

- No single guidebook overrides the official syllabus or board circular.
- Conflicting explanations must be flagged and resolved against authoritative physics/chemistry principles, SI conventions, official curriculum and reliable references.
- Formulae and numerical answers should be independently recomputed and unit-checked.
- Diagrams should be checked for labels, scale, direction and physical consistency.
- Every generated question and solution should retain provenance and a review trail.
- AI extraction is provisional until human review; OCR confidence and page-level evidence must be retained.
- Track both the book's pedagogical approach and JMT's independently verified canonical explanation.

## 7. Next collection sequence

1. Build the full HSC XI–XII Science bibliography for Physics, Chemistry, Biology, Higher Mathematics and ICT, separating official texts from commercial references.
2. Expand to Bangla, English and other compulsory subjects, then humanities and business studies.
3. Catalogue practical manuals and question banks separately.
4. Build admission-preparation bibliographies by target institution/unit and exam session.
5. Obtain title-page, copyright-page, contents-page and representative chapter evidence for each priority edition through lawful sources.
6. Prioritize current editions and books actually used by teachers/students; retain older editions only for historical exam analysis.
7. Publish coverage status transparently: discovered, metadata-verified, edition-verified, contents-mapped, expert-reviewed, rights-cleared.

## 8. Current status

This is an initial discovery register, not “every book” yet. No claim is made that all Bangladesh authors, editions, or book contents have been found or reviewed. The programme must measure completeness by subject/cohort/publisher coverage and verified edition records, not by the number of search results.
