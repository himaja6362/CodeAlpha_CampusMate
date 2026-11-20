# Intelligent FAQ Chatbot Using NLP and Machine Learning

**Project Name:** `CodeAlpha_FAQChatbot`  
**Domain:** College & Student Support (`CampusAssist`)  
**Internship Track:** CodeAlpha Artificial Intelligence Internship  

---

## Overview

**CampusAssist** is an intelligent, locally executed FAQ chatbot built with Python, Streamlit, and Scikit-learn. Instead of relying solely on brittle exact-keyword rules or paid external LLM APIs, it applies Natural Language Processing (NLP) preprocessing, **TF-IDF (Term Frequency–Inverse Document Frequency)** vectorization, and **Cosine Similarity** to understand user intent and retrieve the most relevant answer from a curated 55-entry college student support knowledge base.

---

## Objectives

- Build an intuitive, responsive chat interface for student support queries.
- Separate FAQ content (`faqs.json`) from chatbot logic (`app.py`) for easy maintenance.
- Support natural variations in user phrasing—including short queries and differently worded questions—using NLP similarity scoring rather than exact string matching.
- Prevent misleading or hallucinated replies by enforcing a confidence threshold and returning a helpful fallback message on unrelated or empty queries.
- Run completely offline/locally with zero paid API keys or external model dependencies.

---

## Features

- **Conversational Chat UI**: Clean light-themed Streamlit chat interface with distinct user and assistant message bubbles and persistent session conversation history.
- **55-Entry Multi-Intent Knowledge Base**: Covers 10 essential student support areas with 4–5 paraphrased question variations per FAQ (275 indexed phrasings).
- **NLP Text Preprocessing**: Lowercasing, punctuation stripping, whitespace normalization, and filler-stopword filtering with short-query protection.
- **TF-IDF + Cosine Similarity Engine**: Unigram and bigram (`ngram_range=(1, 2)`) TF-IDF representations matched via cosine similarity.
- **Graceful Fallback & Input Validation**: Handles empty/punctuation-only input and low-confidence unrelated queries (`score < 0.22`) without returning random answers.
- **Suggested Prompt Chips & Sidebar Explorer**: Clickable sample questions in both the sidebar and main workspace for instant testing.
- **Optional Expandable Confidence Inspector**: View the cosine similarity score, matched category, matched variation, preprocessed tokens, and top 3 candidates inside a collapsed expander under each response.
- **Clear Chat Control**: Reset conversation history at any time from the header or sidebar.

---

## Technologies Used

- **Python 3.10+** — Core programming language
- **Streamlit** — Interactive web UI, sidebar, chat components, and session state management
- **Scikit-learn** — `TfidfVectorizer` and `cosine_similarity`
- **Pandas** — Structured corpus indexing and candidate score display
- **JSON (`faqs.json`)** — Decoupled FAQ knowledge base storage

---

## Project Structure

```text
CodeAlpha_FAQChatbot/
├── app.py               # Streamlit UI, NLP preprocessing, and TF-IDF similarity engine
├── faqs.json            # 55 college/student support FAQs with phrased variations
├── requirements.txt     # Python dependencies
├── README.md            # Project documentation
└── screenshots/         # Directory for application UI screenshots
```

---

## How NLP Works in This Project

Every incoming user query and every FAQ question/variation passes through a deterministic preprocessing pipeline in `preprocess_text()`:

1. **Lowercase Conversion**: Converts `"Where Is The Library?"` to `"where is the library?"` so capitalization never affects matching.
2. **Punctuation & Symbol Removal**: Strips punctuation marks (`?`, `!`, `.`, `,`, etc.) and special characters.
3. **Tokenization & Whitespace Normalization**: Splits text cleanly into normalized word tokens.
4. **Lightweight Stopword Filtering**: Removes high-frequency filler words (`"is"`, `"the"`, `"can"`, `"please"`) while preserving fallback tokens if a short query consists mostly of common words.

---

## TF-IDF Explanation

**TF-IDF (Term Frequency–Inverse Document Frequency)** converts text into numerical feature vectors that reflect how important a word or two-word phrase (bigram) is to a specific FAQ relative to the entire dataset:

$$\text{TF-IDF}(t, d) = \text{TF}(t, d) \times \log\left(\frac{N}{1 + \text{DF}(t)}\right)$$

- **Term Frequency ($\text{TF}$)**: Measures how frequently term $t$ appears in document $d$ (using sublinear scaling `1 + log(tf)`).
- **Inverse Document Frequency ($\text{IDF}$)**: Down-weights generic terms appearing across many FAQs and boosts distinctive domain terms such as `scholarship`, `attendance`, `revaluation`, or `hostel`.
- Using `ngram_range=(1, 2)` captures both individual keywords (`"tuition"`) and meaningful two-word phrases (`"tuition fee"`, `"hall ticket"`, `"medical leave"`).

---

## Cosine Similarity Explanation

Once both the user query vector $\vec{q}$ and each FAQ phrase vector $\vec{d}$ are computed, **Cosine Similarity** measures the cosine of the angle between them:

$$\text{Cosine Similarity}(\vec{q}, \vec{d}) = \frac{\vec{q} \cdot \vec{d}}{\|\vec{q}\| \, \|\vec{d}\|}$$

- **Score = `1.0`**: Identical semantic direction (exact term/bigram overlap).
- **Score = `0.0`**: Completely orthogonal (no shared terms).
- **Threshold (`0.22`)**: Matches scoring at or above `0.22` return the corresponding FAQ answer; scores below `0.22` trigger the friendly fallback response so unrelated questions never receive misleading answers.

---

## FAQ Dataset Coverage (`faqs.json`)

The dataset contains **55 FAQs** (with **275 total phrased variations**) spanning 10 student support categories:

1. **Admissions** (6 FAQs) — Application process, eligibility, documents, deadlines, entrance exams, status tracking
2. **Courses** (5 FAQs) — Degree programs, elective add/drop, syllabus downloads, minors/honors, credit duration
3. **Fees** (6 FAQs) — Tuition structure, online payment, installments, late fee penalties, refunds, receipts
4. **Scholarships** (5 FAQs) — Merit/need-based aid, application steps, renewal GPA, external verification, sports quota
5. **Exams** (6 FAQs) — Exam timetables, admit cards, grading scale, revaluation, supplementary exams, result dates
6. **Attendance** (5 FAQs) — 75% requirement, online tracking, medical condonation, duty leave, shortage rules
7. **Library** (5 FAQs) — Opening hours, borrowing limits, IEEE/digital journals, overdue fines, study room booking
8. **Placements** (6 FAQs) — Career support, placement stats, top recruiters, timelines, mandatory internships, eligibility
9. **Campus facilities** (6 FAQs) — Hostels, campus Wi-Fi, bus transport, health clinic, cafeteria/mess, sports & clubs
10. **Contact and support** (5 FAQs) — Helpdesk contact, password reset, bonafide/transcripts, campus location, grievance cell

---

## Installation Instructions

1. **Clone or navigate to the project directory**:
   ```bash
   cd CodeAlpha_FAQChatbot
   ```

2. **Create and activate a virtual environment** (recommended):
   ```bash
   python -m venv venv
   # On macOS / Linux:
   source venv/bin/activate
   # On Windows:
   venv\Scripts\activate
   ```

3. **Install required packages**:
   ```bash
   pip install -r requirements.txt
   ```

---

## How to Run the Application

Launch the Streamlit server from inside `CodeAlpha_FAQChatbot/`:

```bash
streamlit run app.py
```

Streamlit will open the application in your default browser at `http://localhost:8501`.

---

## Example Questions to Test

| Test Case | Example Input | Expected Behavior |
| :--- | :--- | :--- |
| **Exact FAQ Question** | `"What are the central library opening hours?"` | High similarity (~0.90–1.00), returns library timings |
| **Paraphrased Question** | `"Can I split my semester fee into two parts?"` | Matches installment plan FAQ via TF-IDF similarity |
| **Short Question** | `"minimum attendance"` or `"hostel"` | Matches attendance or hostel FAQ confidently |
| **Unrelated Question** | `"What is the recipe for chocolate cake?"` | Low similarity (< 0.22), displays friendly fallback message |
| **Empty / Symbol Input** | `"   "` or `"???"` | Prompts the user to enter a valid question |

---

## Screenshots

Store screenshots of the running Streamlit app inside the `screenshots/` folder before submitting or pushing to GitHub:

- `screenshots/01_main_chat_interface.png` — Light-themed chat workspace with sidebar and suggested prompts
- `screenshots/02_paraphrased_match_and_score.png` — Paraphrased student question with expanded confidence score details
- `screenshots/03_fallback_handling.png` — Graceful fallback response on an out-of-scope query

---

## Future Improvements

- Add **lemmatization** (e.g., WordNetLemmatizer) or **dense sentence embeddings** (`sentence-transformers`) for deeper semantic synonym matching.
- Support **multi-language student queries** with automatic translation or multilingual embeddings.
- Add an **admin FAQ editor tab** inside Streamlit to add, edit, or export `faqs.json` entries directly from the browser.
- Include **chat transcript export** (Markdown/CSV) and feedback thumbs-up/thumbs-down logging to refine low-scoring questions.
