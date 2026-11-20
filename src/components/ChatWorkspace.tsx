import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowRight,
  ArrowUpRight,
  Award,
  BookOpen,
  Briefcase,
  Check,
  ChevronRight,
  Copy,
  Edit2,
  Eraser,
  GraduationCap,
  HelpCircle,
  MessageSquare,
  Mic,
  MicOff,
  Plus,
  RotateCw,
  Search,
  Send,
  ThumbsDown,
  ThumbsUp,
  Trash2,
  X,
} from 'lucide-react';
import {
  CATEGORY_CARDS,
  HighlightCategoryId,
  SIDEBAR_SAMPLE_QUESTIONS,
} from '../nlp/faqEngine';
import { CampusLogo } from './CampusLogo';
import { FloatingAiOrb } from './FloatingAiOrb';
import {
  ChatPreferences,
  getInitials,
  StudentProfile,
} from './ProfileModal';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  matchedCategory?: string | null;
  matchedQuestion?: string | null;
  sourceQuery?: string;
  candidateIndex?: number;
  feedback?: 'up' | 'down' | null;
  followUps?: string[];
  animateTyping?: boolean;
}

export interface ConversationThread {
  id: string;
  title: string;
  isCustomTitle?: boolean;
  updatedAt: string;
  updatedAtMs: number;
  messages: ChatMessage[];
}

interface SpeechRecognitionAlternativeLike {
  transcript: string;
}

interface SpeechRecognitionResultLike {
  isFinal: boolean;
  [index: number]: SpeechRecognitionAlternativeLike;
}

interface SpeechRecognitionEventLike {
  results: ArrayLike<SpeechRecognitionResultLike>;
}

interface SpeechRecognitionErrorEventLike {
  error: string;
}

interface SpeechRecognitionInstance {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
}

type SpeechRecognitionConstructor = new () => SpeechRecognitionInstance;

interface ChatWorkspaceProps {
  conversations: ConversationThread[];
  activeConversationId: string;
  messages: ChatMessage[];
  isTyping: boolean;
  profile: StudentProfile;
  preferences: ChatPreferences;
  onSendMessage: (text: string) => void;
  onRegenerateMessage: (assistantMessageId: string) => void;
  onFeedback: (assistantMessageId: string, vote: 'up' | 'down') => void;
  onNewChat: () => void;
  onClearConversation: () => void;
  onSelectConversation: (id: string) => void;
  onRenameConversation: (id: string, newTitle: string) => void;
  onDeleteConversation: (id: string) => void;
  onClearAllHistory: () => void;
  onOpenHelp: () => void;
  onOpenProfile: () => void;
  onNotify: (message: string, variant?: 'success' | 'info' | 'error') => void;
  mobileSidebarOpen: boolean;
  onCloseMobileSidebar: () => void;
}

function getTimeGreeting(studentName: string): string {
  const hour = new Date().getHours();
  const timePrefix =
    hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  const trimmed = studentName.trim();
  if (!trimmed || trimmed.toLowerCase() === 'student') {
    return `${timePrefix}, student.`;
  }

  const firstName = trimmed.split(/\s+/)[0];
  return `${timePrefix}, ${firstName}.`;
}

type HistoryBucketLabel = 'Today' | 'Yesterday' | 'Previous 7 Days' | 'Earlier';

function classifyHistoryBucket(timestampMs: number): HistoryBucketLabel {
  const now = new Date();
  const startOfToday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate()
  ).getTime();
  const oneDayMs = 24 * 60 * 60 * 1000;
  const startOfYesterday = startOfToday - oneDayMs;
  const startOfSevenDaysAgo = startOfToday - 7 * oneDayMs;

  if (timestampMs >= startOfToday) return 'Today';
  if (timestampMs >= startOfYesterday) return 'Yesterday';
  if (timestampMs >= startOfSevenDaysAgo) return 'Previous 7 Days';
  return 'Earlier';
}

const BUCKET_ORDER: HistoryBucketLabel[] = [
  'Today',
  'Yesterday',
  'Previous 7 Days',
  'Earlier',
];

const CATEGORY_ICONS: Record<HighlightCategoryId, React.ReactNode> = {
  Admissions: <GraduationCap className="h-4 w-4" aria-hidden="true" />,
  Academics: <BookOpen className="h-4 w-4" aria-hidden="true" />,
  Scholarships: <Award className="h-4 w-4" aria-hidden="true" />,
  Placements: <Briefcase className="h-4 w-4" aria-hidden="true" />,
};

const TypewriterText: React.FC<{
  text: string;
  animate: boolean;
  onProgress?: () => void;
}> = ({ text, animate, onProgress }) => {
  const [visibleLength, setVisibleLength] = useState<number>(() =>
    animate ? 0 : text.length
  );

  useEffect(() => {
    if (!animate) {
      setVisibleLength(text.length);
      return;
    }

    const prefersReduced =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced) {
      setVisibleLength(text.length);
      return;
    }

    setVisibleLength(0);
    let current = 0;
    const step = Math.max(2, Math.ceil(text.length / 26));
    const timer = window.setInterval(() => {
      current = Math.min(text.length, current + step);
      setVisibleLength(current);
      onProgress?.();
      if (current >= text.length) {
        window.clearInterval(timer);
      }
    }, 16);

    return () => window.clearInterval(timer);
  }, [text, animate, onProgress]);

  return <>{text.slice(0, visibleLength)}</>;
};

export const ChatWorkspace: React.FC<ChatWorkspaceProps> = ({
  conversations,
  activeConversationId,
  messages,
  isTyping,
  profile,
  preferences,
  onSendMessage,
  onRegenerateMessage,
  onFeedback,
  onNewChat,
  onClearConversation,
  onSelectConversation,
  onRenameConversation,
  onDeleteConversation,
  onClearAllHistory,
  onOpenHelp,
  onOpenProfile,
  onNotify,
  mobileSidebarOpen,
  onCloseMobileSidebar,
}) => {
  const [inputValue, setInputValue] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [selectedCategoryId, setSelectedCategoryId] =
    useState<HighlightCategoryId>('Admissions');
  const [historySearch, setHistorySearch] = useState('');
  const [isListening, setIsListening] = useState(false);

  // History management states (inline rename, delete confirmation, clear-all confirmation)
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameDraft, setRenameDraft] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [confirmClearAllSidebar, setConfirmClearAllSidebar] = useState(false);

  const chatEndRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);

  const hasConversation = messages.length > 0 || isTyping;

  const speechSupported = useMemo(() => {
    if (typeof window === 'undefined') return false;
    const win = window as unknown as {
      SpeechRecognition?: SpeechRecognitionConstructor;
      webkitSpeechRecognition?: SpeechRecognitionConstructor;
    };
    return Boolean(win.SpeechRecognition || win.webkitSpeechRecognition);
  }, []);

  const activeCategory = useMemo(
    () =>
      CATEGORY_CARDS.find((c) => c.id === selectedCategoryId) ?? CATEGORY_CARDS[0],
    [selectedCategoryId]
  );

  const nonEmptyConversations = useMemo(
    () =>
      conversations
        .filter((c) => c.messages.length > 0)
        .sort((a, b) => (b.updatedAtMs ?? 0) - (a.updatedAtMs ?? 0)),
    [conversations]
  );

  const groupedHistory = useMemo(() => {
    const q = historySearch.trim().toLowerCase();
    const filtered = q
      ? nonEmptyConversations.filter(
          (c) =>
            c.title.toLowerCase().includes(q) ||
            c.messages.some((m) => m.content.toLowerCase().includes(q))
        )
      : nonEmptyConversations;

    const groups: Record<HistoryBucketLabel, ConversationThread[]> = {
      Today: [],
      Yesterday: [],
      'Previous 7 Days': [],
      Earlier: [],
    };

    for (const conv of filtered) {
      const bucket = classifyHistoryBucket(conv.updatedAtMs ?? Date.now());
      groups[bucket].push(conv);
    }

    return BUCKET_ORDER.map((label) => ({
      label,
      items: groups[label],
    })).filter((g) => g.items.length > 0);
  }, [nonEmptyConversations, historySearch]);

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 144)}px`;
  }, [inputValue]);

  useEffect(() => {
    return () => {
      recognitionRef.current?.stop();
    };
  }, []);

  const submitQuestion = (rawText: string) => {
    const trimmed = rawText.trim();
    if (!trimmed) {
      setValidationError('Please enter a question before sending.');
      onNotify('Please enter a question first.', 'error');
      textareaRef.current?.focus();
      return;
    }
    setValidationError(null);
    onSendMessage(trimmed);
    setInputValue('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
    textareaRef.current?.focus();
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    submitQuestion(inputValue);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (preferences.enterToSend) {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        submitQuestion(inputValue);
      }
    } else if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      submitQuestion(inputValue);
    }
  };

  const handleCopyAnswer = async (id: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      onNotify('Copied answer to clipboard', 'success');
      setTimeout(() => setCopiedId((curr) => (curr === id ? null : curr)), 1800);
    } catch {
      onNotify('Unable to access clipboard in this browser.', 'error');
    }
  };

  const startRename = (conv: ConversationThread) => {
    setConfirmDeleteId(null);
    setRenamingId(conv.id);
    setRenameDraft(conv.title);
  };

  const commitRename = (id: string) => {
    const trimmed = renameDraft.trim();
    if (!trimmed) {
      onNotify('Conversation title cannot be empty.', 'error');
      return;
    }
    onRenameConversation(id, trimmed);
    setRenamingId(null);
    setRenameDraft('');
  };

  const toggleVoiceInput = () => {
    if (!speechSupported) {
      onNotify('Voice input is not supported in this browser.', 'error');
      return;
    }

    if (isListening && recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
      return;
    }

    const win = window as unknown as {
      SpeechRecognition?: SpeechRecognitionConstructor;
      webkitSpeechRecognition?: SpeechRecognitionConstructor;
    };
    const SpeechRec = win.SpeechRecognition || win.webkitSpeechRecognition;
    if (!SpeechRec) return;

    try {
      const recognition = new SpeechRec();
      recognition.lang = 'en-US';
      recognition.interimResults = true;
      recognition.continuous = false;

      recognition.onresult = (event: SpeechRecognitionEventLike) => {
        let transcript = '';
        for (let i = 0; i < event.results.length; i += 1) {
          transcript += event.results[i][0]?.transcript ?? '';
        }
        setInputValue(transcript.trim());
        setValidationError(null);
      };

      recognition.onerror = (event: SpeechRecognitionErrorEventLike) => {
        setIsListening(false);
        const msg =
          event.error === 'not-allowed'
            ? 'Microphone permission was denied.'
            : 'Could not capture voice input. Please try typing.';
        onNotify(msg, 'error');
      };

      recognition.onend = () => {
        setIsListening(false);
        textareaRef.current?.focus();
      };

      recognitionRef.current = recognition;
      setIsListening(true);
      onNotify('Listening... speak your question', 'info');
      recognition.start();
    } catch {
      setIsListening(false);
      onNotify('Could not start voice recognition.', 'error');
    }
  };

  const sidebarContent = (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Top Brand + New Chat */}
      <div className="shrink-0 px-4 pt-5 pb-4">
        <div className="flex items-center gap-2.5 px-1">
          <CampusLogo className="h-8 w-8" />
          <div className="min-w-0">
            <div className="font-display text-sm font-bold text-[#0F1A2E] dark:text-slate-100 truncate">
              CampusMate AI
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 truncate">
              Your intelligent campus companion.
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={() => {
            onNewChat();
            onCloseMobileSidebar();
          }}
          className="mt-4 flex w-full min-h-[40px] items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-violet-600 px-4 py-2 text-xs font-semibold text-white shadow-sm shadow-blue-600/20 transition-all hover:brightness-105 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 whitespace-nowrap"
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          New Chat
        </button>
      </div>

      {/* Scrollable Middle: Searchable Categorized Chat History + Sample Questions */}
      <div className="flex-1 overflow-y-auto px-4 pb-4">
        <div className="border-t border-slate-200/70 pt-4 dark:border-slate-800/80">
          <div className="mb-2 flex items-center justify-between gap-2 px-1">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              Chat history
            </span>

            {nonEmptyConversations.length > 0 && !confirmClearAllSidebar && (
              <button
                type="button"
                onClick={() => setConfirmClearAllSidebar(true)}
                className="text-[11px] font-medium text-slate-400 transition-colors hover:text-rose-600 dark:hover:text-rose-400"
              >
                Delete all
              </button>
            )}
          </div>

          {confirmClearAllSidebar && (
            <div className="mb-2.5 flex items-center justify-between gap-2 rounded-xl border border-rose-200 bg-rose-50/90 px-3 py-2 text-xs dark:border-rose-500/30 dark:bg-rose-500/10">
              <span className="font-medium text-rose-700 dark:text-rose-300">
                Delete all chats?
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setConfirmClearAllSidebar(false)}
                  className="rounded px-2 py-0.5 text-[11px] font-medium text-slate-600 hover:bg-white dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onClearAllHistory();
                    setConfirmClearAllSidebar(false);
                  }}
                  className="rounded bg-rose-600 px-2 py-0.5 text-[11px] font-semibold text-white hover:bg-rose-700"
                >
                  Delete
                </button>
              </div>
            </div>
          )}

          <div className="relative mb-3">
            <Search
              className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400"
              aria-hidden="true"
            />
            <input
              type="text"
              value={historySearch}
              onChange={(e) => setHistorySearch(e.target.value)}
              placeholder="Search previous chats..."
              aria-label="Search previous chats"
              className="h-8 w-full rounded-lg border border-slate-200/90 bg-slate-50/80 pl-8 pr-2.5 text-xs text-slate-800 placeholder:text-slate-400 transition-colors focus:border-blue-500 focus:bg-white focus:outline-none dark:border-slate-700/80 dark:bg-slate-900/70 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-violet-400 dark:focus:bg-slate-900"
            />
          </div>

          {groupedHistory.length === 0 ? (
            <p className="px-1 text-xs text-slate-400 dark:text-slate-500">
              {historySearch.trim()
                ? 'No matching conversations found.'
                : 'Your saved chats will appear here.'}
            </p>
          ) : (
            <div className="space-y-4">
              {groupedHistory.map((group) => (
                <div key={group.label}>
                  <div className="mb-1 px-1 text-[11px] font-semibold text-slate-400 dark:text-slate-500">
                    {group.label}
                  </div>
                  <div className="space-y-1">
                    {group.items.map((conv) => {
                      const isActive = conv.id === activeConversationId;
                      const isRenaming = renamingId === conv.id;
                      const isConfirmingDelete = confirmDeleteId === conv.id;

                      if (isRenaming) {
                        return (
                          <form
                            key={conv.id}
                            onSubmit={(e) => {
                              e.preventDefault();
                              commitRename(conv.id);
                            }}
                            className="flex items-center gap-1 rounded-lg border border-blue-400 bg-white px-2 py-1 dark:border-violet-400 dark:bg-slate-900"
                          >
                            <input
                              type="text"
                              autoFocus
                              value={renameDraft}
                              onChange={(e) => setRenameDraft(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Escape') {
                                  setRenamingId(null);
                                  setRenameDraft('');
                                }
                              }}
                              aria-label="Rename conversation"
                              className="min-w-0 flex-1 bg-transparent text-xs text-slate-900 focus:outline-none dark:text-slate-100"
                            />
                            <button
                              type="submit"
                              aria-label="Save chat title"
                              className="rounded p-1 text-emerald-600 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-slate-800"
                            >
                              <Check className="h-3.5 w-3.5" aria-hidden="true" />
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setRenamingId(null);
                                setRenameDraft('');
                              }}
                              aria-label="Cancel rename"
                              className="rounded p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                            >
                              <X className="h-3.5 w-3.5" aria-hidden="true" />
                            </button>
                          </form>
                        );
                      }

                      if (isConfirmingDelete) {
                        return (
                          <div
                            key={conv.id}
                            className="flex items-center justify-between gap-1.5 rounded-lg border border-rose-200 bg-rose-50/90 px-2.5 py-1.5 text-xs dark:border-rose-500/30 dark:bg-rose-500/15"
                          >
                            <span className="truncate font-medium text-rose-700 dark:text-rose-300">
                              Delete chat?
                            </span>
                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                type="button"
                                onClick={() => {
                                  onDeleteConversation(conv.id);
                                  setConfirmDeleteId(null);
                                }}
                                className="rounded bg-rose-600 px-2 py-0.5 text-[11px] font-semibold text-white hover:bg-rose-700"
                              >
                                Yes
                              </button>
                              <button
                                type="button"
                                onClick={() => setConfirmDeleteId(null)}
                                className="rounded px-1.5 py-0.5 text-[11px] font-medium text-slate-600 hover:bg-white dark:text-slate-300 dark:hover:bg-slate-800"
                              >
                                No
                              </button>
                            </div>
                          </div>
                        );
                      }

                      return (
                        <div
                          key={conv.id}
                          className={`group flex items-center gap-1 rounded-lg px-2.5 py-2 text-xs transition-colors ${
                            isActive
                              ? 'bg-blue-50/90 text-blue-700 font-medium dark:bg-violet-500/15 dark:text-violet-300'
                              : 'text-slate-700 hover:bg-slate-100/80 dark:text-slate-300 dark:hover:bg-slate-800/70'
                          }`}
                        >
                          <button
                            type="button"
                            onClick={() => {
                              onSelectConversation(conv.id);
                              onCloseMobileSidebar();
                            }}
                            className="flex flex-1 min-w-0 items-center gap-2 text-left"
                          >
                            <MessageSquare
                              className={`h-3.5 w-3.5 shrink-0 ${
                                isActive
                                  ? 'text-blue-600 dark:text-violet-400'
                                  : 'text-slate-400 dark:text-slate-500'
                              }`}
                              aria-hidden="true"
                            />
                            <span className="truncate">{conv.title}</span>
                          </button>

                          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity shrink-0">
                            <button
                              type="button"
                              onClick={() => startRename(conv)}
                              aria-label={`Rename ${conv.title}`}
                              title="Rename chat"
                              className="rounded p-1 text-slate-400 hover:bg-white hover:text-blue-600 dark:hover:bg-slate-800 dark:hover:text-violet-300"
                            >
                              <Edit2 className="h-3 w-3" aria-hidden="true" />
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setRenamingId(null);
                                setConfirmDeleteId(conv.id);
                              }}
                              aria-label={`Delete ${conv.title}`}
                              title="Delete chat"
                              className="rounded p-1 text-slate-400 hover:bg-white hover:text-rose-600 dark:hover:bg-slate-800 dark:hover:text-rose-400"
                            >
                              <Trash2 className="h-3 w-3" aria-hidden="true" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Popular Sample Questions */}
        <div className="mt-5 border-t border-slate-200/70 pt-4 dark:border-slate-800/80">
          <div className="px-1 mb-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
            Popular questions
          </div>
          <div className="space-y-1.5">
            {SIDEBAR_SAMPLE_QUESTIONS.map((sample) => (
              <button
                key={sample}
                type="button"
                disabled={isTyping}
                onClick={() => {
                  onSendMessage(sample);
                  onCloseMobileSidebar();
                }}
                className="w-full rounded-lg border border-slate-200/80 bg-white/70 px-3 py-2 text-left text-xs leading-snug text-slate-700 transition-colors hover:border-blue-300 hover:bg-blue-50/60 hover:text-blue-700 disabled:opacity-50 dark:border-slate-800 dark:bg-slate-900/50 dark:text-slate-300 dark:hover:border-violet-500/50 dark:hover:bg-slate-800 dark:hover:text-violet-300"
              >
                {sample}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom Sticky Footer: Help / Support + Student Profile Card */}
      <div className="shrink-0 border-t border-slate-200/70 bg-white/60 px-4 py-3.5 space-y-2.5 dark:border-slate-800/80 dark:bg-[#0D1325]/80">
        <button
          type="button"
          onClick={() => {
            onOpenHelp();
            onCloseMobileSidebar();
          }}
          className="flex w-full min-h-[36px] items-center gap-2 rounded-lg border border-slate-200/90 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:border-blue-300 hover:text-blue-700 dark:border-slate-700/80 dark:bg-slate-900/80 dark:text-slate-200 dark:hover:border-violet-500/50 dark:hover:text-violet-300"
        >
          <HelpCircle
            className="h-3.5 w-3.5 text-blue-600 dark:text-violet-400 shrink-0"
            aria-hidden="true"
          />
          <span>Help / Support</span>
        </button>

        <button
          type="button"
          onClick={() => {
            onOpenProfile();
            onCloseMobileSidebar();
          }}
          aria-label="Open student profile and preferences"
          className="flex w-full items-center justify-between gap-3 rounded-xl border border-slate-200/90 bg-white px-3 py-2.5 text-left shadow-2xs transition-all hover:border-blue-300 hover:shadow-sm dark:border-slate-700/80 dark:bg-slate-900/80 dark:hover:border-violet-400/60"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            {profile.avatarDataUrl ? (
              <img
                src={profile.avatarDataUrl}
                alt={`${profile.name} avatar`}
                referrerPolicy="no-referrer"
                className="h-8 w-8 rounded-full object-cover ring-1 ring-blue-500/30 shrink-0"
              />
            ) : (
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-600 to-violet-600 font-display text-xs font-semibold text-white">
                {getInitials(profile.name)}
              </div>
            )}
            <div className="min-w-0">
              <div className="text-xs font-semibold text-[#0F1A2E] dark:text-slate-100 truncate">
                {profile.name}
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                {profile.email}
              </div>
            </div>
          </div>
          <ChevronRight
            className="h-4 w-4 shrink-0 text-slate-400 dark:text-slate-500"
            aria-hidden="true"
          />
        </button>
      </div>
    </div>
  );

  return (
    <div className="relative flex flex-1 min-h-0 overflow-hidden">
      {/* Desktop Glass Sidebar */}
      <aside className="hidden lg:block w-[290px] shrink-0 border-r border-slate-200/80 bg-white/75 backdrop-blur-xl dark:border-slate-800/80 dark:bg-[#0F1629]/85">
        {sidebarContent}
      </aside>

      {/* Mobile Drawer Sidebar */}
      {mobileSidebarOpen && (
        <div className="fixed inset-0 z-40 flex lg:hidden">
          <div
            className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs"
            onClick={onCloseMobileSidebar}
            aria-hidden="true"
          />
          <aside className="relative z-10 w-[296px] max-w-[85vw] border-r border-slate-200 bg-white/95 backdrop-blur-xl shadow-2xl dark:border-slate-800 dark:bg-[#0F1629]/95">
            {sidebarContent}
          </aside>
        </div>
      )}

      {/* Main Content Stage */}
      <section className="relative flex flex-1 flex-col min-w-0 bg-[#FAF8F5] dark:bg-[#0B1020]">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 overflow-hidden"
        >
          <div className="absolute -top-24 right-[8%] h-80 w-80 rounded-full bg-blue-500/8 blur-3xl dark:bg-blue-500/12" />
          <div className="absolute bottom-12 left-[6%] h-72 w-72 rounded-full bg-violet-500/8 blur-3xl dark:bg-violet-500/12" />
        </div>

        {/* Scrollable Area */}
        <div className="relative z-10 flex-1 overflow-y-auto px-4 py-6 sm:px-8">
          {!hasConversation ? (
            /* ASYMMETRIC PREMIUM WELCOME HOME */
            <div className="mx-auto flex min-h-full max-w-5xl flex-col justify-center py-4 lg:py-8">
              <div className="grid grid-cols-1 items-center gap-8 lg:grid-cols-12 lg:gap-10">
                {/* Left Column */}
                <div className="lg:col-span-7">
                  <div className="mb-3 inline-flex items-center gap-2 text-xs font-medium text-slate-600 dark:text-slate-300">
                    <span
                      className="h-2 w-2 rounded-full bg-emerald-500"
                      aria-hidden="true"
                    />
                    <span>AI assistant ready</span>
                  </div>

                  <p className="font-display text-base font-semibold text-blue-600 dark:text-violet-400">
                    {getTimeGreeting(profile.name)}
                  </p>

                  <h1 className="mt-1.5 font-display text-3xl sm:text-4xl font-bold tracking-tight text-[#0F1A2E] dark:text-slate-50 [text-wrap:balance]">
                    Your campus questions, answered.
                  </h1>

                  <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-slate-600 dark:text-slate-300">
                    From admissions and academics to scholarships and placements — choose
                    a topic below or ask anything in your own words.
                  </p>

                  {/* 4 Interactive Category Cards */}
                  <div className="mt-7 grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {CATEGORY_CARDS.map((card) => {
                      const isSelected = card.id === selectedCategoryId;
                      return (
                        <button
                          key={card.id}
                          type="button"
                          onClick={() => setSelectedCategoryId(card.id)}
                          aria-pressed={isSelected}
                          className={`group flex flex-col justify-between rounded-2xl border p-4 text-left backdrop-blur-md transition-all duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 ${
                            isSelected
                              ? 'border-blue-500/70 bg-white/95 shadow-md shadow-blue-600/10 ring-1 ring-blue-500/30 dark:border-violet-400/70 dark:bg-[#141D35]/95 dark:shadow-violet-500/10 dark:ring-violet-400/30'
                              : 'border-slate-200/80 bg-white/70 hover:-translate-y-0.5 hover:border-blue-300 hover:bg-white/95 hover:shadow-sm dark:border-slate-800 dark:bg-[#11182C]/70 dark:hover:border-violet-500/50 dark:hover:bg-[#141D35]/90'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span
                              className={`inline-flex items-center gap-2 text-xs font-semibold ${
                                isSelected
                                  ? 'text-blue-600 dark:text-violet-300'
                                  : 'text-slate-700 dark:text-slate-200'
                              }`}
                            >
                              {CATEGORY_ICONS[card.id]}
                              {card.title}
                            </span>
                            <ArrowUpRight
                              className={`h-4 w-4 transition-colors ${
                                isSelected
                                  ? 'text-blue-600 dark:text-violet-300'
                                  : 'text-slate-300 group-hover:text-blue-600 dark:text-slate-600 dark:group-hover:text-violet-300'
                              }`}
                              aria-hidden="true"
                            />
                          </div>
                          <span className="mt-2 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                            {card.subtitle}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Smart Suggested Questions */}
                  <div className="mt-6 rounded-2xl border border-slate-200/80 bg-white/75 p-4 backdrop-blur-md dark:border-slate-800 dark:bg-[#11182C]/75">
                    <div className="mb-2.5 flex items-center justify-between gap-2">
                      <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                        Suggested in {activeCategory.title}
                      </span>
                      <span className="text-[11px] text-slate-400 dark:text-slate-500">
                        Click any question to ask
                      </span>
                    </div>
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                      {activeCategory.suggestedQuestions.map((q) => (
                        <button
                          key={q}
                          type="button"
                          onClick={() => submitQuestion(q)}
                          className="group flex items-center justify-between gap-2 rounded-xl border border-slate-200/80 bg-white px-3.5 py-2.5 text-left text-xs font-medium text-slate-700 transition-all hover:border-blue-300 hover:bg-blue-50/60 hover:text-blue-700 dark:border-slate-700/80 dark:bg-slate-900/70 dark:text-slate-200 dark:hover:border-violet-400/60 dark:hover:bg-slate-800 dark:hover:text-violet-300"
                        >
                          <span className="leading-snug">{q}</span>
                          <ArrowRight
                            className="h-3.5 w-3.5 shrink-0 text-slate-300 transition-transform group-hover:translate-x-0.5 group-hover:text-blue-600 dark:text-slate-600 dark:group-hover:text-violet-300"
                            aria-hidden="true"
                          />
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Right Column: Floating AI Orb */}
                <div className="lg:col-span-5">
                  <div className="relative overflow-hidden rounded-3xl border border-slate-200/80 bg-gradient-to-b from-white/90 to-slate-50/80 p-7 text-center shadow-lg shadow-slate-900/5 backdrop-blur-xl dark:border-slate-800/90 dark:from-[#131C35]/90 dark:to-[#0E1529]/90 dark:shadow-black/30">
                    <div className="flex flex-col items-center">
                      <FloatingAiOrb size="lg" />

                      <div className="mt-6">
                        <div className="text-xs font-semibold text-blue-600 dark:text-violet-300">
                          {activeCategory.title} Focus
                        </div>
                        <h2 className="mt-1 font-display text-lg font-semibold text-[#0F1A2E] dark:text-slate-100">
                          Instant student guidance
                        </h2>
                        <p className="mt-1.5 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                          Ask follow-up questions naturally, use voice input, or switch
                          categories anytime.
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() =>
                          submitQuestion(activeCategory.suggestedQuestions[0])
                        }
                        className="mt-5 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-violet-600 px-4 py-2.5 text-xs font-semibold text-white shadow-sm shadow-blue-600/20 transition-all hover:brightness-105 whitespace-nowrap"
                      >
                        <span>Ask: &ldquo;{activeCategory.suggestedQuestions[0]}&rdquo;</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* ACTIVE CONVERSATION STREAM */
            <div className="mx-auto max-w-3xl">
              <div className="mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-slate-200/70 pb-3 dark:border-slate-800/80">
                <div className="inline-flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                  <span
                    className="h-2 w-2 rounded-full bg-emerald-500"
                    aria-hidden="true"
                  />
                  <span>AI assistant ready</span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={onOpenHelp}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200/90 bg-white/80 px-3 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:border-blue-300 hover:text-blue-700 dark:border-slate-700/80 dark:bg-slate-900/70 dark:text-slate-300 dark:hover:border-violet-400/60 dark:hover:text-violet-300 whitespace-nowrap"
                  >
                    <HelpCircle className="h-3.5 w-3.5" aria-hidden="true" />
                    Helpdesk
                  </button>
                  <button
                    type="button"
                    onClick={onClearConversation}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200/90 bg-white/80 px-3 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:border-slate-300 hover:text-slate-900 dark:border-slate-700/80 dark:bg-slate-900/70 dark:text-slate-300 dark:hover:border-slate-600 dark:hover:text-white whitespace-nowrap"
                  >
                    <Eraser className="h-3.5 w-3.5" aria-hidden="true" />
                    Clear Chat
                  </button>
                </div>
              </div>

              <div className="space-y-6 pb-4">
                {messages.map((msg, idx) => {
                  const isUser = msg.role === 'user';
                  const isCopied = copiedId === msg.id;
                  const isLatestAssistant =
                    !isUser && idx === messages.length - 1 && !isTyping;
                  const userDisplayName =
                    profile.name.trim() && profile.name.trim().toLowerCase() !== 'student'
                      ? profile.name.trim().split(/\s+/)[0]
                      : 'You';

                  return (
                    <div
                      key={msg.id}
                      className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}
                    >
                      <div
                        className={`mb-1.5 flex items-center gap-2 text-xs text-slate-400 dark:text-slate-500 ${
                          isUser ? 'flex-row-reverse' : ''
                        }`}
                      >
                        {!isUser && <FloatingAiOrb size="sm" />}
                        <span className="font-medium text-slate-600 dark:text-slate-300">
                          {isUser ? userDisplayName : 'CampusMate AI'}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span>{msg.timestamp}</span>
                      </div>

                      <div
                        className={`relative max-w-[92%] sm:max-w-[84%] rounded-2xl px-4 py-3.5 text-[15px] leading-relaxed ${
                          isUser
                            ? 'rounded-br-sm bg-gradient-to-br from-blue-600 to-violet-600 text-white shadow-sm shadow-blue-600/15'
                            : 'rounded-bl-sm border border-slate-200/90 bg-white/90 text-[#0F1A2E] shadow-xs backdrop-blur-md dark:border-slate-800 dark:bg-[#131C35]/90 dark:text-slate-100'
                        }`}
                      >
                        <p className="whitespace-pre-wrap">
                          {isUser ? (
                            msg.content
                          ) : (
                            <TypewriterText
                              text={msg.content}
                              animate={
                                preferences.typingAnimation && Boolean(msg.animateTyping)
                              }
                              onProgress={scrollToBottom}
                            />
                          )}
                        </p>

                        {!isUser && (
                          <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-2.5 dark:border-slate-800/80">
                            <span className="text-[11px] font-medium text-slate-400 dark:text-slate-500">
                              {msg.matchedCategory
                                ? msg.matchedCategory
                                : 'Campus Support'}
                            </span>

                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => handleCopyAnswer(msg.id, msg.content)}
                                aria-label="Copy answer"
                                className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-medium text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                              >
                                {isCopied ? (
                                  <>
                                    <Check
                                      className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400"
                                      aria-hidden="true"
                                    />
                                    <span className="text-emerald-700 dark:text-emerald-400">
                                      Copied
                                    </span>
                                  </>
                                ) : (
                                  <>
                                    <Copy className="h-3.5 w-3.5" aria-hidden="true" />
                                    <span>Copy</span>
                                  </>
                                )}
                              </button>

                              {msg.sourceQuery && (
                                <button
                                  type="button"
                                  onClick={() => onRegenerateMessage(msg.id)}
                                  aria-label="Regenerate response"
                                  className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-medium text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                                >
                                  <RotateCw className="h-3.5 w-3.5" aria-hidden="true" />
                                  <span>Regenerate</span>
                                </button>
                              )}

                              <button
                                type="button"
                                onClick={() => onFeedback(msg.id, 'up')}
                                aria-label="Helpful answer"
                                aria-pressed={msg.feedback === 'up'}
                                className={`inline-flex items-center rounded-lg p-1.5 transition-colors ${
                                  msg.feedback === 'up'
                                    ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400'
                                    : 'text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200'
                                }`}
                              >
                                <ThumbsUp className="h-3.5 w-3.5" aria-hidden="true" />
                              </button>

                              <button
                                type="button"
                                onClick={() => onFeedback(msg.id, 'down')}
                                aria-label="Not helpful"
                                aria-pressed={msg.feedback === 'down'}
                                className={`inline-flex items-center rounded-lg p-1.5 transition-colors ${
                                  msg.feedback === 'down'
                                    ? 'bg-rose-50 text-rose-600 dark:bg-rose-500/15 dark:text-rose-400'
                                    : 'text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200'
                                }`}
                              >
                                <ThumbsDown className="h-3.5 w-3.5" aria-hidden="true" />
                              </button>
                            </div>
                          </div>
                        )}
                      </div>

                      {preferences.showFollowUps &&
                        isLatestAssistant &&
                        msg.followUps &&
                        msg.followUps.length > 0 && (
                          <div className="mt-3 max-w-[92%] sm:max-w-[84%]">
                            <div className="mb-1.5 text-[11px] font-medium text-slate-400 dark:text-slate-500">
                              Related follow-ups
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {msg.followUps.map((followUp) => (
                                <button
                                  key={followUp}
                                  type="button"
                                  onClick={() => submitQuestion(followUp)}
                                  className="rounded-xl border border-slate-200/90 bg-white/85 px-3 py-1.5 text-left text-xs font-medium text-slate-700 shadow-2xs backdrop-blur-xs transition-all hover:border-blue-300 hover:bg-blue-50/70 hover:text-blue-700 dark:border-slate-700/80 dark:bg-slate-900/75 dark:text-slate-200 dark:hover:border-violet-400/60 dark:hover:bg-slate-800 dark:hover:text-violet-300"
                                >
                                  {followUp}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                    </div>
                  );
                })}

                {isTyping && (
                  <div className="flex flex-col items-start">
                    <div className="mb-1.5 flex items-center gap-2 text-xs font-medium text-slate-600 dark:text-slate-300">
                      <FloatingAiOrb size="sm" thinking />
                      <span>CampusMate AI</span>
                    </div>
                    <div className="inline-flex items-center gap-2.5 rounded-2xl rounded-bl-sm border border-slate-200/90 bg-white/90 px-4 py-3 text-xs font-medium text-slate-500 shadow-xs backdrop-blur-md dark:border-slate-800 dark:bg-[#131C35]/90 dark:text-slate-400">
                      <span>Finding the best answer</span>
                      <span className="inline-flex items-center gap-1" aria-hidden="true">
                        <span className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-bounce [animation-delay:-0.3s] dark:bg-violet-400" />
                        <span className="h-1.5 w-1.5 rounded-full bg-indigo-500 animate-bounce [animation-delay:-0.15s] dark:bg-violet-400" />
                        <span className="h-1.5 w-1.5 rounded-full bg-violet-500 animate-bounce dark:bg-violet-400" />
                      </span>
                    </div>
                  </div>
                )}

                <div ref={chatEndRef} />
              </div>
            </div>
          )}
        </div>

        {/* Fixed Bottom Chat Input */}
        <div className="relative z-10 border-t border-slate-200/70 bg-[#FAF8F5]/90 px-4 pb-4 pt-3 backdrop-blur-md sm:px-8 dark:border-slate-800/80 dark:bg-[#0B1020]/90">
          <div className="mx-auto max-w-3xl">
            <form
              onSubmit={handleFormSubmit}
              className="flex items-end gap-2 rounded-2xl border border-slate-200/90 bg-white/95 p-2 shadow-sm transition-all duration-150 focus-within:border-blue-500 focus-within:ring-4 focus-within:ring-blue-500/10 dark:border-slate-700/80 dark:bg-[#131C35]/95 dark:focus-within:border-violet-400 dark:focus-within:ring-violet-500/15"
            >
              <textarea
                ref={textareaRef}
                rows={1}
                value={inputValue}
                onChange={(e) => {
                  setInputValue(e.target.value);
                  if (validationError) setValidationError(null);
                }}
                onKeyDown={handleKeyDown}
                placeholder={
                  preferences.enterToSend
                    ? 'Ask about admissions, fees, exams, campus life...'
                    : 'Ask about admissions, fees, exams, campus life... (Ctrl+Enter to send)'
                }
                aria-label="Ask CampusMate AI a question"
                className="max-h-36 flex-1 resize-none bg-transparent px-3 py-2 text-sm leading-relaxed text-[#0F1A2E] placeholder:text-slate-400 focus:outline-none dark:text-slate-100 dark:placeholder:text-slate-500"
              />

              <button
                type="button"
                onClick={toggleVoiceInput}
                aria-label={isListening ? 'Stop voice input' : 'Start voice input'}
                title={
                  speechSupported
                    ? isListening
                      ? 'Listening... click to stop'
                      : 'Speak your question'
                    : 'Voice input not supported in this browser'
                }
                className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 ${
                  isListening
                    ? 'bg-rose-50 text-rose-600 ring-2 ring-rose-500/30 dark:bg-rose-500/20 dark:text-rose-400'
                    : 'text-slate-500 hover:bg-slate-100 hover:text-blue-600 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-violet-300'
                }`}
              >
                {isListening ? (
                  <MicOff className="h-4 w-4" aria-hidden="true" />
                ) : (
                  <Mic className="h-4 w-4" aria-hidden="true" />
                )}
              </button>

              <button
                type="submit"
                disabled={isTyping}
                aria-label="Send question"
                className="inline-flex h-10 shrink-0 items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-violet-600 px-4 text-sm font-medium text-white shadow-xs transition-all hover:brightness-105 disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 whitespace-nowrap"
              >
                <span>Send</span>
                <Send className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            </form>

            {validationError && (
              <p
                className="mt-1.5 px-2 text-xs text-rose-600 dark:text-rose-400"
                role="alert"
              >
                {validationError}
              </p>
            )}

            <p className="mt-2 text-center text-[11px] text-slate-400 dark:text-slate-500">
              AI-generated responses may not always be accurate. Confirm important
              information with your college.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
};
