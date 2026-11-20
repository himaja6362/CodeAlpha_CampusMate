import rawFaqsJson from '../../CodeAlpha_FAQChatbot/faqs.json?raw';

export interface FAQItem {
  id: string;
  category: string;
  question: string;
  variations: string[];
  answer: string;
}

export interface CandidateMatch {
  id: string;
  category: string;
  question: string;
  answer: string;
  score: number;
}

export interface MatchResult {
  matched: boolean;
  isEmptyInput: boolean;
  answer: string;
  score: number;
  category: string | null;
  matchedQuestion: string | null;
  matchedPhrase: string | null;
  preprocessedQuery: string;
  topCandidates: CandidateMatch[];
}

export const SIMILARITY_THRESHOLD = 0.22;

export const FALLBACK_MESSAGE =
  "I couldn't find a specific answer for that question in our campus guide. " +
  'Try asking about admissions, courses, tuition fees, scholarships, exams, ' +
  'attendance, library hours, placements, or campus facilities — or reach out to ' +
  'the Student Helpdesk for personal assistance.';

export const EMPTY_INPUT_MESSAGE =
  'Please type a question about admissions, academics, fees, or campus life so I can help.';

export type HighlightCategoryId = 'Admissions' | 'Academics' | 'Scholarships' | 'Placements';

export interface CategoryCardSpec {
  id: HighlightCategoryId;
  title: string;
  subtitle: string;
  suggestedQuestions: string[];
}

export const CATEGORY_CARDS: CategoryCardSpec[] = [
  {
    id: 'Admissions',
    title: 'Admissions',
    subtitle: 'Applications, eligibility, deadlines & verification',
    suggestedQuestions: [
      'How do I apply for admission?',
      'What documents are required during admission?',
      'When is the last date to apply for the upcoming academic session?',
      'Is there an entrance exam for admission?',
    ],
  },
  {
    id: 'Academics',
    title: 'Academics',
    subtitle: 'Courses, exam schedules, attendance & library',
    suggestedQuestions: [
      'How can I check my exam schedule?',
      'What is the minimum attendance requirement to sit for exams?',
      'What undergraduate and postgraduate courses are offered?',
      'What are the central library opening hours?',
    ],
  },
  {
    id: 'Scholarships',
    title: 'Scholarships',
    subtitle: 'Merit awards, financial aid & tuition waivers',
    suggestedQuestions: [
      'What scholarships are available?',
      'How do I apply for a scholarship or financial aid?',
      'What GPA is required to renew a merit scholarship?',
      'Can I pay my tuition fees in installments?',
    ],
  },
  {
    id: 'Placements',
    title: 'Placements',
    subtitle: 'Career training, internships & campus recruiters',
    suggestedQuestions: [
      'Does the college offer placement training?',
      'What is the placement record and average salary package?',
      'Which top companies recruit from the campus?',
      'When do campus internships and placement drives begin?',
    ],
  },
];

export const SIDEBAR_SAMPLE_QUESTIONS: string[] = [
  'What documents are required during admission?',
  'Can I pay my tuition fees in installments?',
  'What is the minimum attendance requirement?',
  'What are the central library opening hours?',
  'Are on-campus hostels and accommodation available?',
];

const STOPWORDS = new Set([
  'a', 'an', 'the', 'is', 'are', 'am', 'was', 'were', 'be', 'been', 'being',
  'do', 'does', 'did', 'have', 'has', 'had', 'i', 'me', 'my', 'we', 'our',
  'you', 'your', 'it', 'its', 'they', 'them', 'their', 'this', 'that', 'there',
  'to', 'of', 'in', 'on', 'at', 'for', 'with', 'by', 'from', 'into', 'about',
  'and', 'or', 'if', 'as', 'not', 'no', 'please', 'tell', 'know', 'want',
  'need', 'can', 'could', 'would', 'should', 'may', 'might', 'will', 'get',
  'what', 'when', 'where', 'who', 'whom', 'which', 'why', 'how', 'many', 'much',
]);

export function normalizeToken(token: string): string {
  if (token.length > 4 && token.endsWith('ies')) {
    return `${token.slice(0, -3)}y`;
  }
  if (token.length > 4 && token.endsWith('es') && ['s', 'x', 'z', 'h'].includes(token[token.length - 3])) {
    return token.slice(0, -2);
  }
  if (
    token.length > 3 &&
    token.endsWith('s') &&
    !token.endsWith('ss') &&
    !token.endsWith('us') &&
    !token.endsWith('is') &&
    !token.endsWith('as')
  ) {
    return token.slice(0, -1);
  }
  if (token.length > 5 && token.endsWith('ing')) {
    return token.slice(0, -3);
  }
  if (token.length > 4 && token.endsWith('ed') && !token.endsWith('eed')) {
    return token.slice(0, -2);
  }
  return token;
}

export function preprocessText(text: string): string {
  if (!text) return '';

  const cleaned = text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (!cleaned) return '';

  const tokens = cleaned.split(' ').filter(Boolean);
  if (tokens.length === 0) return '';

  const filtered = tokens
    .filter((tok) => !STOPWORDS.has(tok))
    .map(normalizeToken);

  if (filtered.length > 0) {
    return filtered.join(' ');
  }
  return tokens.map(normalizeToken).join(' ');
}

function extractNgrams(preprocessed: string): string[] {
  if (!preprocessed) return [];
  const tokens = preprocessed.split(' ').filter(Boolean);
  const terms: string[] = [...tokens];
  for (let i = 0; i < tokens.length - 1; i += 1) {
    terms.push(`${tokens[i]} ${tokens[i + 1]}`);
  }
  return terms;
}

interface IndexedPhrase {
  id: string;
  category: string;
  canonicalQuestion: string;
  phrase: string;
  answer: string;
  vector: Map<string, number>;
}

export class FAQChatbotEngine {
  public readonly faqs: FAQItem[];
  public readonly categories: string[];
  public readonly totalIndexedPhrases: number;
  private readonly threshold: number;
  private readonly idfMap: Map<string, number>;
  private readonly indexedPhrases: IndexedPhrase[];

  constructor(faqs: FAQItem[], threshold: number = SIMILARITY_THRESHOLD) {
    this.faqs = faqs;
    this.threshold = threshold;
    this.categories = Array.from(new Set(faqs.map((item) => item.category))).sort();

    const rawDocs: Array<{
      id: string;
      category: string;
      canonicalQuestion: string;
      phrase: string;
      answer: string;
      terms: string[];
    }> = [];

    for (const faq of faqs) {
      const phrases = [faq.question, ...(faq.variations ?? [])];
      for (const phrase of phrases) {
        const processed = preprocessText(phrase);
        const terms = extractNgrams(processed);
        if (terms.length > 0) {
          rawDocs.push({
            id: faq.id,
            category: faq.category,
            canonicalQuestion: faq.question,
            phrase,
            answer: faq.answer,
            terms,
          });
        }
      }
    }

    this.totalIndexedPhrases = rawDocs.length;

    const dfMap = new Map<string, number>();
    for (const doc of rawDocs) {
      const uniqueTerms = new Set(doc.terms);
      for (const term of uniqueTerms) {
        dfMap.set(term, (dfMap.get(term) ?? 0) + 1);
      }
    }

    const docCount = rawDocs.length;
    this.idfMap = new Map<string, number>();
    for (const [term, df] of dfMap.entries()) {
      this.idfMap.set(term, Math.log((1 + docCount) / (1 + df)) + 1.0);
    }

    this.indexedPhrases = rawDocs.map((doc) => ({
      id: doc.id,
      category: doc.category,
      canonicalQuestion: doc.canonicalQuestion,
      phrase: doc.phrase,
      answer: doc.answer,
      vector: this.vectorizeTerms(doc.terms),
    }));
  }

  private vectorizeTerms(terms: string[]): Map<string, number> {
    const counts = new Map<string, number>();
    for (const term of terms) {
      if (this.idfMap.has(term)) {
        counts.set(term, (counts.get(term) ?? 0) + 1);
      }
    }

    const weighted = new Map<string, number>();
    let sumSquares = 0;

    for (const [term, count] of counts.entries()) {
      const tf = 1.0 + Math.log(count);
      const idf = this.idfMap.get(term) ?? 0;
      const weight = tf * idf;
      if (weight > 0) {
        weighted.set(term, weight);
        sumSquares += weight * weight;
      }
    }

    const norm = Math.sqrt(sumSquares) || 1.0;
    const normalized = new Map<string, number>();
    for (const [term, weight] of weighted.entries()) {
      normalized.set(term, weight / norm);
    }
    return normalized;
  }

  private cosineSimilarity(vecA: Map<string, number>, vecB: Map<string, number>): number {
    let dot = 0;
    const [smaller, larger] = vecA.size <= vecB.size ? [vecA, vecB] : [vecB, vecA];
    for (const [term, weight] of smaller.entries()) {
      const otherWeight = larger.get(term);
      if (otherWeight !== undefined) {
        dot += weight * otherWeight;
      }
    }
    return dot;
  }

  public query(userInput: string, topK: number = 4): MatchResult {
    const preprocessedQuery = preprocessText(userInput);
    if (!preprocessedQuery) {
      return {
        matched: false,
        isEmptyInput: true,
        answer: EMPTY_INPUT_MESSAGE,
        score: 0,
        category: null,
        matchedQuestion: null,
        matchedPhrase: null,
        preprocessedQuery: '',
        topCandidates: [],
      };
    }

    const queryTerms = extractNgrams(preprocessedQuery);
    const queryVec = this.vectorizeTerms(queryTerms);

    const scored = this.indexedPhrases
      .map((entry) => ({
        entry,
        score: this.cosineSimilarity(queryVec, entry.vector),
      }))
      .sort((a, b) => b.score - a.score);

    const best = scored[0];
    const seenFaqIds = new Set<string>();
    const topCandidates: CandidateMatch[] = [];

    for (const item of scored) {
      if (seenFaqIds.has(item.entry.id)) continue;
      seenFaqIds.add(item.entry.id);
      topCandidates.push({
        id: item.entry.id,
        category: item.entry.category,
        question: item.entry.canonicalQuestion,
        answer: item.entry.answer,
        score: item.score,
      });
      if (topCandidates.length >= topK) break;
    }

    if (!best || best.score < this.threshold) {
      return {
        matched: false,
        isEmptyInput: false,
        answer: FALLBACK_MESSAGE,
        score: best ? best.score : 0,
        category: null,
        matchedQuestion: null,
        matchedPhrase: null,
        preprocessedQuery,
        topCandidates,
      };
    }

    return {
      matched: true,
      isEmptyInput: false,
      answer: best.entry.answer,
      score: best.score,
      category: best.entry.category,
      matchedQuestion: best.entry.canonicalQuestion,
      matchedPhrase: best.entry.phrase,
      preprocessedQuery,
      topCandidates,
    };
  }

  public getFollowUpQuestions(
    category: string | null,
    excludeQuestion: string | null,
    limit: number = 3
  ): string[] {
    if (!category) {
      return [
        'How do I apply for undergraduate admission?',
        'What scholarships are available for students?',
        'Where can I check the semester exam schedule?',
      ].slice(0, limit);
    }

    const sameCategory = this.faqs
      .filter(
        (faq) =>
          faq.category === category &&
          faq.question !== excludeQuestion
      )
      .map((faq) => faq.question);

    if (sameCategory.length >= limit) {
      return sameCategory.slice(0, limit);
    }

    const extra = this.faqs
      .filter(
        (faq) =>
          faq.category !== category &&
          faq.question !== excludeQuestion
      )
      .slice(0, limit - sameCategory.length)
      .map((faq) => faq.question);

    return [...sameCategory, ...extra];
  }
}

export const FAQS_DATA: FAQItem[] = JSON.parse(rawFaqsJson) as FAQItem[];
export const faqEngine = new FAQChatbotEngine(FAQS_DATA, SIMILARITY_THRESHOLD);
