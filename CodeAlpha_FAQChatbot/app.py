"""
CodeAlpha Artificial Intelligence Internship — Task 2: Intelligent FAQ Chatbot
Project: CampusAssist — College & Student Support FAQ Chatbot
Stack: Python, Streamlit, Scikit-learn (TF-IDF + Cosine Similarity), Pandas
"""

from __future__ import annotations

import json
import re
import string
from dataclasses import dataclass
from pathlib import Path
from typing import Any

import pandas as pd
import streamlit as st
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

FAQ_FILE = Path(__file__).parent / "faqs.json"
SIMILARITY_THRESHOLD = 0.22

SUGGESTED_QUESTIONS = [
    "How do I apply for undergraduate admission?",
    "What is the annual tuition fee structure?",
    "What is the minimum attendance requirement?",
    "What scholarships are available for students?",
    "What are the central library opening hours?",
    "How does the Training and Placement Cell support students?",
]

SIDEBAR_SAMPLE_QUESTIONS = {
    "Admissions & Courses": [
        "What documents are required during admission?",
        "Can I change my elective subject after semester registration?",
    ],
    "Fees & Scholarships": [
        "Can I pay my tuition fees in installments?",
        "What GPA is required to renew a merit scholarship?",
    ],
    "Exams & Attendance": [
        "How do I download my exam hall ticket?",
        "How do I apply for medical leave or attendance condonation?",
    ],
    "Campus & Placements": [
        "Are on-campus hostels and accommodation available?",
        "When do campus internships and placement drives begin?",
    ],
}

FALLBACK_MESSAGE = (
    "I could not find a confident match for that question in the student support knowledge base. "
    "Try rephrasing with keywords related to Admissions, Courses, Fees, Scholarships, Exams, "
    "Attendance, Library, Placements, Campus Facilities, or Contact & Support — or click one of the "
    "suggested questions to explore."
)

EMPTY_INPUT_MESSAGE = (
    "Please enter a valid question containing words or keywords so I can search the FAQ knowledge base."
)


# ---------------------------------------------------------------------------
# NLP Preprocessing & Matching Engine
# ---------------------------------------------------------------------------

STOPWORDS = {
    "a", "an", "the", "is", "are", "am", "was", "were", "be", "been", "being",
    "do", "does", "did", "have", "has", "had", "i", "me", "my", "we", "our",
    "you", "your", "it", "its", "they", "them", "their", "this", "that", "there",
    "to", "of", "in", "on", "at", "for", "with", "by", "from", "into", "about",
    "and", "or", "if", "as", "not", "no", "please", "tell", "know", "want",
    "need", "can", "could", "would", "should", "may", "might", "will", "get",
    "what", "when", "where", "who", "whom", "which", "why", "how", "many", "much",
}


def normalize_token(token: str) -> str:
    """Apply lightweight deterministic suffix normalization without external corpora."""
    if len(token) > 4 and token.endswith("ies"):
        return token[:-3] + "y"
    if len(token) > 4 and token.endswith("es") and token[-3] in ("s", "x", "z", "h"):
        return token[:-2]
    if len(token) > 3 and token.endswith("s") and not token.endswith(("ss", "us", "is", "as")):
        return token[:-1]
    if len(token) > 5 and token.endswith("ing"):
        return token[:-3]
    if len(token) > 4 and token.endswith("ed") and not token.endswith("eed"):
        return token[:-2]
    return token


def preprocess_text(text: str) -> str:
    """
    Normalize input text for TF-IDF vectorization:
    1. Convert to lowercase
    2. Remove punctuation
    3. Normalize extra whitespace
    4. Filter filler/interrogative stopwords and normalize word suffixes
    """
    if not text:
        return ""

    cleaned = text.lower().strip()
    cleaned = cleaned.translate(str.maketrans(string.punctuation, " " * len(string.punctuation)))
    cleaned = re.sub(r"[^a-z0-9\s]", " ", cleaned)
    tokens = re.sub(r"\s+", " ", cleaned).strip().split()

    if not tokens:
        return ""

    filtered_tokens = [normalize_token(tok) for tok in tokens if tok not in STOPWORDS]
    if not filtered_tokens:
        filtered_tokens = [normalize_token(tok) for tok in tokens]
    return " ".join(filtered_tokens)


@dataclass
class MatchResult:
    """Structured response returned by the TF-IDF + Cosine Similarity matcher."""

    matched: bool
    answer: str
    score: float
    category: str | None
    matched_question: str | None
    matched_phrase: str | None
    preprocessed_query: str
    top_candidates: list[dict[str, Any]]


class FAQChatbotEngine:
    """Local NLP FAQ matcher powered by TF-IDF Vectorizer and Cosine Similarity."""

    def __init__(self, faqs: list[dict[str, Any]], threshold: float = SIMILARITY_THRESHOLD) -> None:
        self.faqs = faqs
        self.threshold = threshold
        self.records: list[dict[str, Any]] = []

        for faq in faqs:
            phrases = [faq["question"], *faq.get("variations", [])]
            for phrase in phrases:
                processed = preprocess_text(phrase)
                if processed:
                    self.records.append(
                        {
                            "id": faq["id"],
                            "category": faq["category"],
                            "canonical_question": faq["question"],
                            "phrase": phrase,
                            "processed_phrase": processed,
                            "answer": faq["answer"],
                        }
                    )

        self.corpus_df = pd.DataFrame(self.records)
        self.vectorizer = TfidfVectorizer(
            ngram_range=(1, 2),
            sublinear_tf=True,
            norm="l2",
        )
        self.tfidf_matrix = self.vectorizer.fit_transform(self.corpus_df["processed_phrase"])

    def query(self, user_input: str, top_k: int = 3) -> MatchResult:
        """Compute cosine similarity between the user query and all indexed FAQ phrases."""
        processed_query = preprocess_text(user_input)
        if not processed_query:
            return MatchResult(
                matched=False,
                answer=EMPTY_INPUT_MESSAGE,
                score=0.0,
                category=None,
                matched_question=None,
                matched_phrase=None,
                preprocessed_query="",
                top_candidates=[],
            )

        query_vec = self.vectorizer.transform([processed_query])
        similarities = cosine_similarity(query_vec, self.tfidf_matrix).flatten()

        ranked_indices = similarities.argsort()[::-1]
        best_idx = int(ranked_indices[0])
        best_score = float(similarities[best_idx])
        best_row = self.corpus_df.iloc[best_idx]

        # Collect top unique FAQ candidates for the optional expandable inspector
        seen_ids: set[str] = set()
        top_candidates: list[dict[str, Any]] = []
        for idx in ranked_indices:
            row = self.corpus_df.iloc[int(idx)]
            faq_id = str(row["id"])
            if faq_id in seen_ids:
                continue
            seen_ids.add(faq_id)
            top_candidates.append(
                {
                    "category": str(row["category"]),
                    "question": str(row["canonical_question"]),
                    "score": float(similarities[int(idx)]),
                }
            )
            if len(top_candidates) >= top_k:
                break

        if best_score < self.threshold:
            return MatchResult(
                matched=False,
                answer=FALLBACK_MESSAGE,
                score=best_score,
                category=None,
                matched_question=None,
                matched_phrase=None,
                preprocessed_query=processed_query,
                top_candidates=top_candidates,
            )

        return MatchResult(
            matched=True,
            answer=str(best_row["answer"]),
            score=best_score,
            category=str(best_row["category"]),
            matched_question=str(best_row["canonical_question"]),
            matched_phrase=str(best_row["phrase"]),
            preprocessed_query=processed_query,
            top_candidates=top_candidates,
        )


# ---------------------------------------------------------------------------
# Data Loading & Caching
# ---------------------------------------------------------------------------


@st.cache_data(show_spinner=False)
def load_faqs(filepath: Path) -> list[dict[str, Any]]:
    """Load FAQ entries from the external JSON knowledge base."""
    with filepath.open("r", encoding="utf-8") as file:
        data = json.load(file)
    if not isinstance(data, list) or not data:
        raise ValueError("faqs.json must contain a non-empty JSON array of FAQ items.")
    return data


@st.cache_resource(show_spinner=False)
def get_chatbot_engine(faqs: list[dict[str, Any]]) -> FAQChatbotEngine:
    """Build and cache the TF-IDF vectorizer and similarity matrix."""
    return FAQChatbotEngine(faqs=faqs, threshold=SIMILARITY_THRESHOLD)


# ---------------------------------------------------------------------------
# Styling & UI Helpers
# ---------------------------------------------------------------------------


def apply_custom_theme() -> None:
    """Apply clean, light-themed styling with subtle shadows and blue-indigo accents."""
    st.markdown(
        """
        <style>
            .stApp {
                background-color: #F8FAFC;
                color: #0F172A;
            }
            section[data-testid="stSidebar"] {
                background-color: #FFFFFF;
                border-right: 1px solid #E2E8F0;
            }
            .campus-header-card {
                background-color: #FFFFFF;
                border: 1px solid #E2E8F0;
                border-radius: 12px;
                padding: 1.25rem 1.5rem;
                margin-bottom: 1rem;
                box-shadow: 0 1px 3px rgba(15, 23, 42, 0.04);
            }
            .campus-title {
                font-size: 1.45rem;
                font-weight: 700;
                color: #0F172A;
                margin: 0 0 0.25rem 0;
            }
            .campus-subtitle {
                font-size: 0.92rem;
                color: #475569;
                margin: 0;
                line-height: 1.5;
            }
            .sidebar-section-title {
                font-size: 0.78rem;
                font-weight: 700;
                text-transform: uppercase;
                letter-spacing: 0.05em;
                color: #4F46E5;
                margin: 1rem 0 0.5rem 0;
            }
            .sidebar-card {
                background-color: #F8FAFC;
                border: 1px solid #E2E8F0;
                border-radius: 10px;
                padding: 0.85rem 1rem;
                font-size: 0.86rem;
                color: #334155;
                line-height: 1.55;
            }
            div.stButton > button {
                border-radius: 8px;
                border: 1px solid #E2E8F0;
                background-color: #FFFFFF;
                color: #1E293B;
                font-size: 0.84rem;
                font-weight: 500;
                padding: 0.45rem 0.75rem;
                text-align: left;
                transition: all 0.15s ease;
                box-shadow: 0 1px 2px rgba(15, 23, 42, 0.03);
            }
            div.stButton > button:hover {
                border-color: #4F46E5;
                color: #4F46E5;
                background-color: #EEF2FF;
            }
            div[data-testid="stChatMessage"] {
                background-color: #FFFFFF;
                border: 1px solid #E2E8F0;
                border-radius: 12px;
                padding: 0.85rem 1.1rem;
                box-shadow: 0 1px 2px rgba(15, 23, 42, 0.03);
            }
        </style>
        """,
        unsafe_allow_html=True,
    )


def init_session_state() -> None:
    """Initialize chat conversation history in Streamlit session state."""
    if "messages" not in st.session_state:
        st.session_state.messages = [
            {
                "role": "assistant",
                "content": (
                    "Hello! I am CampusAssist, your student support FAQ assistant. "
                    "Ask me anything about admissions, courses, tuition fees, scholarships, "
                    "exams, attendance, library hours, placements, or campus facilities."
                ),
                "meta": None,
            }
        ]


def handle_user_query(user_text: str, engine: FAQChatbotEngine) -> None:
    """Process a user message, query the NLP engine, and append messages to session state."""
    cleaned_display = user_text.strip()
    if not cleaned_display:
        st.session_state.messages.append(
            {
                "role": "assistant",
                "content": EMPTY_INPUT_MESSAGE,
                "meta": None,
            }
        )
        return

    st.session_state.messages.append(
        {
            "role": "user",
            "content": cleaned_display,
            "meta": None,
        }
    )

    result = engine.query(cleaned_display)
    st.session_state.messages.append(
        {
            "role": "assistant",
            "content": result.answer,
            "meta": {
                "matched": result.matched,
                "score": result.score,
                "category": result.category,
                "matched_question": result.matched_question,
                "matched_phrase": result.matched_phrase,
                "preprocessed_query": result.preprocessed_query,
                "top_candidates": result.top_candidates,
            },
        }
    )


def clear_chat() -> None:
    """Reset session conversation history."""
    st.session_state.pop("messages", None)
    init_session_state()


# ---------------------------------------------------------------------------
# Main Application
# ---------------------------------------------------------------------------


def main() -> None:
    st.set_page_config(
        page_title="CampusAssist — Intelligent FAQ Chatbot",
        page_icon="🎓",
        layout="wide",
        initial_sidebar_state="expanded",
    )

    apply_custom_theme()
    init_session_state()

    faqs = load_faqs(FAQ_FILE)
    engine = get_chatbot_engine(faqs)
    categories = sorted({item["category"] for item in faqs})

    # Sidebar: Chatbot Information, Instructions, and Sample Questions
    with st.sidebar:
        st.markdown("### CampusAssist")
        st.caption("Intelligent College & Student Support FAQ Chatbot")

        st.markdown(
            """
            <div class="sidebar-card">
                <strong>About this assistant</strong><br/>
                CampusAssist uses local NLP preprocessing, TF-IDF vectorization, and Cosine Similarity
                to understand student questions and match them to verified university FAQs without paid APIs.
            </div>
            """,
            unsafe_allow_html=True,
        )

        st.markdown('<div class="sidebar-section-title">How to use</div>', unsafe_allow_html=True)
        st.markdown(
            """
            1. Type a question in natural language at the bottom.<br/>
            2. Or click any sample prompt to test intent matching.<br/>
            3. Open <em>Match details</em> under a reply to inspect its similarity score.
            """,
            unsafe_allow_html=True,
        )

        st.markdown('<div class="sidebar-section-title">Knowledge base</div>', unsafe_allow_html=True)
        st.write(f"**{len(faqs)} FAQs** across **{len(categories)} student support categories**")

        if st.button("Clear Chat", use_container_width=True, key="sidebar_clear_btn"):
            clear_chat()
            st.rerun()

        st.markdown('<div class="sidebar-section-title">Sample questions</div>', unsafe_allow_html=True)
        for group_name, prompts in SIDEBAR_SAMPLE_QUESTIONS.items():
            st.caption(group_name)
            for idx, sample_q in enumerate(prompts):
                if st.button(sample_q, use_container_width=True, key=f"sidebar_q_{group_name}_{idx}"):
                    handle_user_query(sample_q, engine)
                    st.rerun()

    # Main Workspace Header
    header_col, action_col = st.columns([5, 1])
    with header_col:
        st.markdown(
            """
            <div class="campus-header-card">
                <div class="campus-title">CampusAssist Student Support</div>
                <p class="campus-subtitle">
                    Ask questions about admissions, courses, tuition fees, scholarships, exams,
                    attendance, library services, placements, or campus facilities.
                </p>
            </div>
            """,
            unsafe_allow_html=True,
        )
    with action_col:
        st.write("")
        if st.button("Clear Chat", use_container_width=True, key="header_clear_btn"):
            clear_chat()
            st.rerun()

    # Suggested Prompt Chips
    st.caption("Suggested questions")
    chip_cols = st.columns(3)
    for idx, prompt in enumerate(SUGGESTED_QUESTIONS):
        with chip_cols[idx % 3]:
            if st.button(prompt, use_container_width=True, key=f"chip_{idx}"):
                handle_user_query(prompt, engine)
                st.rerun()

    st.divider()

    # Conversation History
    for message in st.session_state.messages:
        role = message["role"]
        with st.chat_message(role):
            st.markdown(message["content"])

            meta = message.get("meta")
            if role == "assistant" and meta is not None:
                with st.expander("View match details & confidence score"):
                    score_pct = meta["score"] * 100
                    col_a, col_b = st.columns(2)
                    with col_a:
                        st.metric("Cosine Similarity", f"{meta['score']:.3f} ({score_pct:.1f}%)")
                    with col_b:
                        st.metric(
                            "Matched Category",
                            meta["category"] if meta["category"] else "Fallback (Low Confidence)",
                        )

                    if meta["matched_question"]:
                        st.write(f"**Matched FAQ Intent:** {meta['matched_question']}")
                    if meta["matched_phrase"] and meta["matched_phrase"] != meta["matched_question"]:
                        st.write(f"**Closest Indexed Variation:** {meta['matched_phrase']}")
                    st.write(f"**Preprocessed Tokens:** `{meta['preprocessed_query'] or '(empty)'}`")

                    if meta["top_candidates"]:
                        st.caption("Top similarity candidates")
                        candidates_df = pd.DataFrame(meta["top_candidates"])
                        candidates_df["score"] = candidates_df["score"].map(lambda s: f"{s:.3f}")
                        candidates_df.columns = ["Category", "FAQ Question", "Similarity"]
                        st.dataframe(candidates_df, hide_index=True, use_container_width=True)

    # Chat Input Box at Bottom
    user_prompt = st.chat_input("Ask a question (e.g., What is the minimum attendance for exams?)")
    if user_prompt is not None:
        handle_user_query(user_prompt, engine)
        st.rerun()


if __name__ == "__main__":
    main()
