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


## 9. Subject bibliography expansion — tranches 10–18 (11 November 2026)

The following tranche documents extend the discovery register. Each remains a source-linked bibliography, not proof of NCTB prescription, full-text review, or content quality. Chemistry sub-tranches are split by resource type and cross-check purpose to avoid treating practical manuals, solutions and practice books as theory textbooks.

| Tranche | Coverage | Key integrity observations | Record |
|---|---|---|---|
| 10 | Physics/Chemistry: Lecture Selu & Zakaria Touhid; Hasan Book House Dr. Shahjahan Tapan, Muhammad Aziz Hasan, Dr. Rana Chowdhury; Lecture Chemistry Sanjit Kumar Guha; Colour Web historical Chemistry | Exam 2027/2028 and language variants are separate; Hasan English Second Paper has 932 vs 991 page-count observations; Lecture identifiers need validation. | [Tranche 10](JMT_HSC_PHYSICS_CHEMISTRY_AUTHOR_REGISTRY_TRANCHE_10_LECTURE_HASAN_COLOURWEB.md) |
| 11 | Physics/Chemistry: Mullick Brothers Physics author team; Hasan Book House Chemistry | Historical/retailer records and author spelling variants are preserved; older editions are not assumed current. | [Tranche 11](JMT_HSC_PHYSICS_CHEMISTRY_AUTHOR_REGISTRY_TRANCHE_11_MULLICK_HARADHAN_NAG.md) |
| 12 | Biology: Akkharpatra Bengali/English and practical editions; Gazi Publishers; Lecture; Nisharga lead | Language variants and practical manuals are separate; Lecture Exam 2028 byline conflict unresolved; Gazi author spelling/page count varies; Nisharga is an unverified lead. | [Tranche 12](JMT_HSC_BIOLOGY_AUTHOR_EDITION_REGISTRY_TRANCHE_12_AKKHARPATRA_GAZI_LECTURE.md) |
| 13 | Physics: Metro Publications / Prof. Dr. Gias Uddin Ahmed; ordinary Physics and Mathematical Physics | Ordinary paper textbooks and Mathematical Physics are distinct; source bylines differ; title-page verification remains necessary. | [Tranche 13](JMT_HSC_PHYSICS_AUTHOR_EDITION_REGISTRY_TRANCHE_13_METRO_GIAS_UDDIN_AHMED.md) |
| 14 | ICT: NCTB boundary, Systech, Akkharpatra, Lecture Creative ICT and Panjeree | Official NCTB textbook is the curriculum anchor; commercial textbooks, practice books and historical Q&A resources must not be conflated; some language/byline/page conflicts remain. | [Tranche 14](JMT_HSC_ICT_RESOURCE_AUTHOR_REGISTRY_TRANCHE_14_NCTB_SYSTECH_AKKHARPATRA_LECTURE_PANJEREE.md) |
| 15 | Higher Mathematics: Akkharpatra, SKL and Alpha | Bengali/English and textbook/solution editions are separate; page counts and bylines conflict across publisher/retailer records. | [Tranche 15](JMT_HSC_HIGHER_MATHEMATICS_AUTHOR_EDITION_REGISTRY_TRANCHE_15_AKKHARPATRA_SKL_ALPHA.md) |
| 16A | Chemistry theory bibliography: Abacus, Akkharpatra, Hasan Book House and Lecture | Source-specific bylines and page counts preserved; Abacus ISBN collision flagged; Lecture catalogue identifiers require validation. | [Tranche 16A](JMT_HSC_CHEMISTRY_AUTHOR_EDITION_REGISTRY_TRANCHE_16_ABACUS_AKKHARPATRA_HASAN_LECTURE.md) |
| 16B | Chemistry edition cross-check: Abacus, Hasan Book House and Lecture | Expanded Abacus English/Bengali responsibility evidence and Hasan/Lecture edition observations; physical title-page confirmation remains outstanding. | [Tranche 16B](JMT_HSC_CHEMISTRY_AUTHOR_EDITION_REGISTRY_TRANCHE_16_ABACUS_HASAN_LECTURE.md) |
| 17A | Hasan Book House Chemistry author/edition deep-dive | Bengali and English bylines vary by edition/source; page counts conflict; practical and solution books are distinct. | [Tranche 17A](JMT_HSC_CHEMISTRY_AUTHOR_EDITION_REGISTRY_TRANCHE_17_HASAN_BOOK_HOUSE_HARADHAN_HAJARI.md) |
| 17B | Chemistry practical and mathematical resources: Akkharpatra and Abacus | Practical manuals and Mathematical Chemistry are separate resources; Abacus ISBN collision is retained as a data-quality issue. | [Tranche 17B](JMT_HSC_CHEMISTRY_PRACTICAL_MATHEMATICAL_RESOURCES_TRANCHE_17_AKKHARPATRA_ABACUS.md) |
| 17C | Chemistry practice and historical resources: Panjeree and Colour Web | Practice/supplement books are not theory textbooks; HSC 2026/2027/2028 cohorts remain separate; Colour Web records are historical. | [Tranche 17C](JMT_HSC_CHEMISTRY_PRACTICE_AND_HISTORICAL_REGISTRY_TRANCHE_17_PANJEREE_COLOUR_WEB.md) |
| 18A | Panjeree Chemistry Supplement++, test papers and Exam 2028 practice books | Paper-specific, combined and cohort-specific resources are separated; raw catalogue identifiers are not accepted as ISBNs without validation. | [Tranche 18A](JMT_HSC_CHEMISTRY_PRACTICE_RESOURCE_REGISTRY_TRANCHE_18_PANJEREE_SUPPLEMENT_TEST_PAPERS.md) |
| 18B | Official NCTB 2026–27 syllabus notice source verification | NCTB notice-index entry/date verified; attachment URL and syllabus contents remain unretrieved, so no subject/marks claims are inferred. | [Tranche 18B](JMT_OFFICIAL_CURRICULUM_SOURCE_VERIFICATION_TRANCHE_18_NCTB_2026_27.md) |

### Consolidated author and publisher discovery leads

- **Biology:** Professor Dr. Md. Azibor/Azibur Rahman; Professor Debashish Roy; Professor Dr. Nur-e-Parvin Khanom/Khanam; Professor Dr. Md. Fazlul Haque; Dr. Irm Jahan; Muid Mustarik; Gazi S. M. Azmol / Gazi Ajmal; Lecture contributors surfaced across editions include Milon Kanti, Dr. Ashfaqul Muid Khandaker, Nadira Akter, Milon Kanti Barua and Professor Md. Ashraf Uddin. Exact edition-level responsibility statements remain to be confirmed.
- **Physics:** Professor Dr. Gias Uddin Ahmed and Mathematical Physics co-contributors Prof. Rashidul Hasan, Prof. Mahera Ahmed, Mohammad Alamgeer Hossain and Dr. Md. Mominul Haque; Professor A. T. M. Shamsur Rahman Selu and Zakaria Touhid; Dr. Shahjahan Tapan, Muhammad Aziz Hasan and Dr. Rana Chowdhury; Mullick Brothers' Sushantu Kumar Sarkar, Vincent Titash Rozario, Professor Abdul Gani and Professor Md. Mozibur Rahman. Exact bylines vary across editions and retailers.
- **ICT:** Mahbubur Rahman (Systech); A. Z. M. Asaduzzaman, Dr. Md. Masud Rana and Mohammad Ariful Islam (Akkharpatra Bengali publisher record); Lecture and Panjeree practice resources have separate editorial/publisher attribution.
- **Higher Mathematics:** Professor Ashim Kumar Saha; Professor Dr. B. M. Ikramul Haque; Md. Nurul Islam; Md. Khalilur Rahman (Akkharpatra editions); Md. Ketab Uddin and Prof. Md. Nazrul Islam (SKL); S. U. Ahmed (Alpha), with older Alpha records also naming A. F. M. Abdur Rahman and M. A. Jabbar.
- **Chemistry:** Dr. Gazi Md. Ahsanul Kabir; Dr. Rabiul Islam; Mahbub Hasan Linkon/Lingcon; Dr. Md. Abdul Karim; Dr. Md. Nurul Islam; Prof. Haradhan Nag; Dr. Saroj Kanti Singha Hazari (name spelling varies); Sanjit Kumar Guha; Swapan Kumar Mistry (historical Colour Web records). Panjeree practice resources list Panjeree Editorial Board as a collective editorial responsibility body, not an individual author.

### Bibliography status rules reinforced

1. A discovered author is not automatically a verified canonical person. Keep alias candidates and exact printed bylines separately.
2. An edition's language, paper, resource type and cohort are edition-level facts, not book-family assumptions.
3. ISBNs must be validated for length/check digit and checked for duplicate assignment. Retailer SKU/product IDs are not ISBNs.
4. A publisher catalogue proves portfolio existence, not NCTB endorsement.
5. A retailer's Exam 2028 label is a source observation until reconciled with the official cohort/syllabus record.
6. Physical title/copyright pages and contents pages remain the preferred verification evidence.
7. Rights review must precede full-text ingestion, storage, indexing for redistribution, or public display.
