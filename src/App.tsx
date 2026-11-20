/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { Menu, Moon, Plus, Sun, X } from 'lucide-react';
import {
  EMPTY_INPUT_MESSAGE,
  faqEngine,
  SIMILARITY_THRESHOLD,
} from './nlp/faqEngine';
import {
  ChatMessage,
  ChatWorkspace,
  ConversationThread,
} from './components/ChatWorkspace';
import { CampusLogo } from './components/CampusLogo';
import { HelpSupportModal } from './components/HelpSupportModal';
import {
  ChatPreferences,
  getInitials,
  ProfileModal,
  StudentProfile,
} from './components/ProfileModal';
import { ToastContainer, ToastItem } from './components/ToastContainer';

const STORAGE_KEY = 'campusmate_conversations_v2';
const THEME_STORAGE_KEY = 'campusmate_theme';
const PROFILE_STORAGE_KEY = 'campusmate_student_profile_v1';
const PREFS_STORAGE_KEY = 'campusmate_chat_prefs_v1';

const DEFAULT_PROFILE: StudentProfile = {
  name: 'Student',
  email: 'student@campus.edu',
  avatarDataUrl: null,
};

const DEFAULT_PREFERENCES: ChatPreferences = {
  typingAnimation: true,
  showFollowUps: true,
  enterToSend: true,
};

function formatTime(): string {
  return new Date().toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function createEmptyConversation(): ConversationThread {
  return {
    id: `conv-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    title: 'New conversation',
    isCustomTitle: false,
    updatedAt: formatTime(),
    updatedAtMs: Date.now(),
    messages: [],
  };
}

function buildInitialState(): {
  conversations: ConversationThread[];
  activeId: string;
} {
  const fresh = createEmptyConversation();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as ConversationThread[];
      if (Array.isArray(parsed)) {
        const nonEmpty = parsed
          .filter((c) => Array.isArray(c.messages) && c.messages.length > 0)
          .map((c) => ({
            ...c,
            updatedAtMs: typeof c.updatedAtMs === 'number' ? c.updatedAtMs : Date.now(),
            messages: c.messages.map((m) => ({ ...m, animateTyping: false })),
          }));
        return {
          conversations: [fresh, ...nonEmpty],
          activeId: fresh.id,
        };
      }
    }
  } catch {
    // Fallback to clean state
  }
  return {
    conversations: [fresh],
    activeId: fresh.id,
  };
}

function loadInitialProfile(): StudentProfile {
  try {
    const raw = localStorage.getItem(PROFILE_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<StudentProfile>;
      return {
        name: typeof parsed.name === 'string' && parsed.name.trim() ? parsed.name : DEFAULT_PROFILE.name,
        email: typeof parsed.email === 'string' && parsed.email.trim() ? parsed.email : DEFAULT_PROFILE.email,
        avatarDataUrl: typeof parsed.avatarDataUrl === 'string' ? parsed.avatarDataUrl : null,
      };
    }
  } catch {
    // Ignore storage read errors
  }
  return DEFAULT_PROFILE;
}

function loadInitialPreferences(): ChatPreferences {
  try {
    const raw = localStorage.getItem(PREFS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<ChatPreferences>;
      return {
        typingAnimation: parsed.typingAnimation ?? DEFAULT_PREFERENCES.typingAnimation,
        showFollowUps: parsed.showFollowUps ?? DEFAULT_PREFERENCES.showFollowUps,
        enterToSend: parsed.enterToSend ?? DEFAULT_PREFERENCES.enterToSend,
      };
    }
  } catch {
    // Ignore storage read errors
  }
  return DEFAULT_PREFERENCES;
}

function getInitialDarkMode(): boolean {
  try {
    const saved = localStorage.getItem(THEME_STORAGE_KEY);
    if (saved === 'dark') return true;
    if (saved === 'light') return false;
  } catch {
    // Ignore storage read error
  }
  return false;
}

export default function App() {
  const [initialState] = useState(buildInitialState);
  const [conversations, setConversations] = useState<ConversationThread[]>(
    initialState.conversations
  );
  const [activeConversationId, setActiveConversationId] = useState<string>(
    initialState.activeId
  );
  const [profile, setProfile] = useState<StudentProfile>(loadInitialProfile);
  const [preferences, setPreferences] = useState<ChatPreferences>(loadInitialPreferences);
  const [darkMode, setDarkMode] = useState<boolean>(getInitialDarkMode);
  const [isTyping, setIsTyping] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [helpModalOpen, setHelpModalOpen] = useState(false);
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const typingTimerRef = useRef<number | null>(null);

  const pushToast = useCallback(
    (message: string, variant: 'success' | 'info' | 'error' = 'info') => {
      const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      setToasts((prev) => [...prev.slice(-2), { id, message, variant }]);
      window.setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 2600);
    },
    []
  );

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    if (darkMode) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    try {
      localStorage.setItem(THEME_STORAGE_KEY, darkMode ? 'dark' : 'light');
    } catch {
      // Ignore storage write error
    }
  }, [darkMode]);

  useEffect(() => {
    try {
      const nonEmpty = conversations.filter((c) => c.messages.length > 0);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(nonEmpty.slice(0, 30)));
    } catch {
      // Ignore storage quota errors
    }
  }, [conversations]);

  useEffect(() => {
    try {
      localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(profile));
    } catch {
      // Ignore storage quota errors
    }
  }, [profile]);

  useEffect(() => {
    try {
      localStorage.setItem(PREFS_STORAGE_KEY, JSON.stringify(preferences));
    } catch {
      // Ignore storage quota errors
    }
  }, [preferences]);

  useEffect(() => {
    return () => {
      if (typingTimerRef.current !== null) {
        window.clearTimeout(typingTimerRef.current);
      }
    };
  }, []);

  const activeConversation =
    conversations.find((c) => c.id === activeConversationId) ?? conversations[0];
  const activeMessages = activeConversation?.messages ?? [];
  const savedHistoryCount = conversations.filter((c) => c.messages.length > 0).length;

  const handleSendMessage = (rawText: string) => {
    const trimmed = rawText.trim();
    const now = formatTime();
    const nowMs = Date.now();
    const targetId = activeConversationId;

    if (!trimmed) {
      const emptyNotice: ChatMessage = {
        id: `assistant-${nowMs}`,
        role: 'assistant',
        content: EMPTY_INPUT_MESSAGE,
        timestamp: now,
        animateTyping: preferences.typingAnimation,
      };
      setConversations((prev) =>
        prev.map((c) =>
          c.id === targetId
            ? {
                ...c,
                updatedAt: now,
                updatedAtMs: nowMs,
                messages: [...c.messages, emptyNotice],
              }
            : c
        )
      );
      return;
    }

    const userMsg: ChatMessage = {
      id: `user-${nowMs}-${Math.random().toString(36).slice(2, 6)}`,
      role: 'user',
      content: trimmed,
      timestamp: now,
    };

    const autoTitle =
      trimmed.length > 42 ? `${trimmed.slice(0, 42).trim()}...` : trimmed;

    setConversations((prev) =>
      prev.map((c) =>
        c.id === targetId
          ? {
              ...c,
              title:
                c.messages.length === 0 && !c.isCustomTitle ? autoTitle : c.title,
              updatedAt: now,
              updatedAtMs: nowMs,
              messages: [...c.messages, userMsg],
            }
          : c
      )
    );

    if (typingTimerRef.current !== null) {
      window.clearTimeout(typingTimerRef.current);
    }
    setIsTyping(true);

    typingTimerRef.current = window.setTimeout(() => {
      const result = faqEngine.query(trimmed);
      const replyTime = formatTime();
      const replyMs = Date.now();
      const followUps = faqEngine.getFollowUpQuestions(
        result.category,
        result.matchedQuestion,
        3
      );

      const botMsg: ChatMessage = {
        id: `assistant-${replyMs}-${Math.random().toString(36).slice(2, 6)}`,
        role: 'assistant',
        content: result.answer,
        timestamp: replyTime,
        matchedCategory: result.category,
        matchedQuestion: result.matchedQuestion,
        sourceQuery: trimmed,
        candidateIndex: 0,
        feedback: null,
        followUps,
        animateTyping: preferences.typingAnimation,
      };

      setConversations((prev) =>
        prev.map((c) =>
          c.id === targetId
            ? {
                ...c,
                updatedAt: replyTime,
                updatedAtMs: replyMs,
                messages: [...c.messages, botMsg],
              }
            : c
        )
      );
      setIsTyping(false);
      typingTimerRef.current = null;
    }, 420);
  };

  const handleRegenerateMessage = (assistantMessageId: string) => {
    const targetConv = conversations.find((c) => c.id === activeConversationId);
    const targetMsg = targetConv?.messages.find((m) => m.id === assistantMessageId);
    if (!targetMsg || !targetMsg.sourceQuery) return;

    const result = faqEngine.query(targetMsg.sourceQuery, 4);
    const viable = result.topCandidates.filter(
      (cand) => cand.score >= SIMILARITY_THRESHOLD
    );

    let nextContent = result.answer;
    let nextCategory = result.category;
    let nextQuestion = result.matchedQuestion;
    let nextIdx = 0;

    if (viable.length > 1) {
      nextIdx = ((targetMsg.candidateIndex ?? 0) + 1) % viable.length;
      const chosen = viable[nextIdx];
      nextContent = chosen.answer;
      nextCategory = chosen.category;
      nextQuestion = chosen.question;
    }

    const followUps = faqEngine.getFollowUpQuestions(nextCategory, nextQuestion, 3);

    setConversations((prev) =>
      prev.map((c) =>
        c.id === activeConversationId
          ? {
              ...c,
              updatedAtMs: Date.now(),
              messages: c.messages.map((m) =>
                m.id === assistantMessageId
                  ? {
                      ...m,
                      content: nextContent,
                      matchedCategory: nextCategory,
                      matchedQuestion: nextQuestion,
                      candidateIndex: nextIdx,
                      followUps,
                      timestamp: formatTime(),
                      animateTyping: preferences.typingAnimation,
                    }
                  : m
              ),
            }
          : c
      )
    );
    pushToast(
      viable.length > 1 ? 'Showing another relevant answer' : 'Response refreshed',
      'info'
    );
  };

  const handleFeedback = (assistantMessageId: string, vote: 'up' | 'down') => {
    setConversations((prev) =>
      prev.map((c) =>
        c.id === activeConversationId
          ? {
              ...c,
              messages: c.messages.map((m) =>
                m.id === assistantMessageId
                  ? { ...m, feedback: m.feedback === vote ? null : vote }
                  : m
              ),
            }
          : c
      )
    );
    pushToast(
      vote === 'up' ? 'Glad that helped!' : 'Thanks for the feedback — noted.',
      'success'
    );
  };

  const handleNewChat = () => {
    if (typingTimerRef.current !== null) {
      window.clearTimeout(typingTimerRef.current);
      typingTimerRef.current = null;
    }
    setIsTyping(false);

    const existingEmpty = conversations.find((c) => c.messages.length === 0);
    if (existingEmpty) {
      setActiveConversationId(existingEmpty.id);
      return;
    }

    const fresh = createEmptyConversation();
    setConversations((prev) => [fresh, ...prev]);
    setActiveConversationId(fresh.id);
  };

  const handleClearConversation = () => {
    if (typingTimerRef.current !== null) {
      window.clearTimeout(typingTimerRef.current);
      typingTimerRef.current = null;
    }
    setIsTyping(false);

    setConversations((prev) =>
      prev.map((c) =>
        c.id === activeConversationId
          ? {
              ...c,
              title: 'New conversation',
              isCustomTitle: false,
              updatedAtMs: Date.now(),
              messages: [],
            }
          : c
      )
    );
    pushToast('Conversation cleared', 'info');
  };

  const handleSelectConversation = (id: string) => {
    if (typingTimerRef.current !== null) {
      window.clearTimeout(typingTimerRef.current);
      typingTimerRef.current = null;
    }
    setIsTyping(false);
    setActiveConversationId(id);
  };

  const handleRenameConversation = (id: string, newTitle: string) => {
    setConversations((prev) =>
      prev.map((c) =>
        c.id === id ? { ...c, title: newTitle, isCustomTitle: true } : c
      )
    );
    pushToast('Conversation renamed', 'success');
  };

  const handleDeleteConversation = (id: string) => {
    setConversations((prev) => {
      const remaining = prev.filter((c) => c.id !== id);
      if (remaining.length === 0) {
        const fresh = createEmptyConversation();
        setActiveConversationId(fresh.id);
        return [fresh];
      }
      if (id === activeConversationId) {
        setActiveConversationId(remaining[0].id);
      }
      return remaining;
    });
    pushToast('Conversation deleted', 'info');
  };

  const handleClearAllHistory = () => {
    if (typingTimerRef.current !== null) {
      window.clearTimeout(typingTimerRef.current);
      typingTimerRef.current = null;
    }
    setIsTyping(false);

    const fresh = createEmptyConversation();
    setConversations([fresh]);
    setActiveConversationId(fresh.id);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Ignore storage error
    }
    pushToast('All chat history deleted', 'info');
  };

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-[#FAF8F5] text-[#0F1A2E] dark:bg-[#0B1020] dark:text-slate-100">
      {/* Top Glass Header */}
      <header className="flex h-14 shrink-0 items-center justify-between gap-4 border-b border-slate-200/80 bg-white/80 px-4 backdrop-blur-xl sm:px-6 dark:border-slate-800/80 dark:bg-[#0F1629]/85">
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={() => setMobileSidebarOpen((v) => !v)}
            aria-label={mobileSidebarOpen ? 'Close sidebar' : 'Open sidebar'}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 lg:hidden shrink-0 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            {mobileSidebarOpen ? (
              <X className="h-4 w-4" aria-hidden="true" />
            ) : (
              <Menu className="h-4 w-4" aria-hidden="true" />
            )}
          </button>

          <button
            type="button"
            onClick={handleNewChat}
            className="flex items-center gap-2.5 text-left min-w-0 rounded-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
          >
            <CampusLogo className="h-8 w-8" />
            <div className="flex items-baseline gap-2 min-w-0">
              <span className="font-display text-base font-bold tracking-tight text-[#0F1A2E] dark:text-slate-50 whitespace-nowrap">
                CampusMate AI
              </span>
              <span className="hidden sm:inline text-xs font-medium text-slate-400 dark:text-slate-500 whitespace-nowrap">
                Student Assistant
              </span>
            </div>
          </button>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setDarkMode((prev) => !prev)}
            aria-label={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
            title={darkMode ? 'Light mode' : 'Dark mode'}
            className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200/90 bg-white text-slate-600 transition-colors hover:border-blue-300 hover:text-blue-600 dark:border-slate-700/80 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-violet-400/60 dark:hover:text-violet-300"
          >
            {darkMode ? (
              <Sun className="h-4 w-4" aria-hidden="true" />
            ) : (
              <Moon className="h-4 w-4" aria-hidden="true" />
            )}
          </button>

          <button
            type="button"
            onClick={() => setProfileModalOpen(true)}
            aria-label="Open student profile"
            title="Student profile"
            className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200/90 bg-white transition-colors hover:border-blue-300 dark:border-slate-700/80 dark:bg-slate-900 dark:hover:border-violet-400/60 overflow-hidden"
          >
            {profile.avatarDataUrl ? (
              <img
                src={profile.avatarDataUrl}
                alt={profile.name}
                referrerPolicy="no-referrer"
                className="h-full w-full object-cover"
              />
            ) : (
              <span className="font-display text-xs font-semibold text-blue-600 dark:text-violet-300">
                {getInitials(profile.name)}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={handleNewChat}
            className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-violet-600 px-3.5 text-xs font-semibold text-white shadow-xs transition-all hover:brightness-105 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 whitespace-nowrap shrink-0"
          >
            <Plus className="h-3.5 w-3.5" aria-hidden="true" />
            <span>New Chat</span>
          </button>
        </div>
      </header>

      {/* Main Workspace */}
      <main className="flex flex-1 min-h-0 flex-col overflow-hidden">
        <ChatWorkspace
          conversations={conversations}
          activeConversationId={activeConversationId}
          messages={activeMessages}
          isTyping={isTyping}
          profile={profile}
          preferences={preferences}
          onSendMessage={handleSendMessage}
          onRegenerateMessage={handleRegenerateMessage}
          onFeedback={handleFeedback}
          onNewChat={handleNewChat}
          onClearConversation={handleClearConversation}
          onSelectConversation={handleSelectConversation}
          onRenameConversation={handleRenameConversation}
          onDeleteConversation={handleDeleteConversation}
          onClearAllHistory={handleClearAllHistory}
          onOpenHelp={() => setHelpModalOpen(true)}
          onOpenProfile={() => setProfileModalOpen(true)}
          onNotify={pushToast}
          mobileSidebarOpen={mobileSidebarOpen}
          onCloseMobileSidebar={() => setMobileSidebarOpen(false)}
        />
      </main>

      <HelpSupportModal
        open={helpModalOpen}
        onClose={() => setHelpModalOpen(false)}
        onSelectSupportQuestion={handleSendMessage}
      />

      <ProfileModal
        open={profileModalOpen}
        onClose={() => setProfileModalOpen(false)}
        profile={profile}
        onUpdateProfile={setProfile}
        darkMode={darkMode}
        onSetDarkMode={setDarkMode}
        preferences={preferences}
        onUpdatePreferences={setPreferences}
        historyCount={savedHistoryCount}
        onClearAllHistory={handleClearAllHistory}
        onNotify={pushToast}
      />

      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}
