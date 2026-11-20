import React, { useEffect, useRef, useState } from 'react';
import {
  Camera,
  Check,
  Edit3,
  Info,
  Moon,
  SlidersHorizontal,
  Sun,
  Trash2,
  User,
  X,
} from 'lucide-react';

export interface StudentProfile {
  name: string;
  email: string;
  avatarDataUrl: string | null;
}

export interface ChatPreferences {
  typingAnimation: boolean;
  showFollowUps: boolean;
  enterToSend: boolean;
}

interface ProfileModalProps {
  open: boolean;
  onClose: () => void;
  profile: StudentProfile;
  onUpdateProfile: (next: StudentProfile) => void;
  darkMode: boolean;
  onSetDarkMode: (dark: boolean) => void;
  preferences: ChatPreferences;
  onUpdatePreferences: (next: ChatPreferences) => void;
  historyCount: number;
  onClearAllHistory: () => void;
  onNotify: (message: string, variant?: 'success' | 'info' | 'error') => void;
}

export function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'S';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

export const ProfileModal: React.FC<ProfileModalProps> = ({
  open,
  onClose,
  profile,
  onUpdateProfile,
  darkMode,
  onSetDarkMode,
  preferences,
  onUpdatePreferences,
  historyCount,
  onClearAllHistory,
  onNotify,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [draftName, setDraftName] = useState(profile.name);
  const [draftEmail, setDraftEmail] = useState(profile.email);
  const [formError, setFormError] = useState<string | null>(null);
  const [confirmClearAll, setConfirmClearAll] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (open) {
      setDraftName(profile.name);
      setDraftEmail(profile.email);
      setIsEditing(false);
      setFormError(null);
      setConfirmClearAll(false);
    }
  }, [open, profile.name, profile.email]);

  if (!open) return null;

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      onNotify('Please choose a valid image file.', 'error');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      onNotify('Please select an image smaller than 2 MB.', 'error');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        onUpdateProfile({
          ...profile,
          avatarDataUrl: reader.result,
        });
        onNotify('Profile photo updated', 'success');
      }
    };
    reader.onerror = () => {
      onNotify('Could not read the selected image.', 'error');
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleRemoveAvatar = () => {
    onUpdateProfile({
      ...profile,
      avatarDataUrl: null,
    });
    onNotify('Profile photo removed', 'info');
  };

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = draftName.trim();
    const trimmedEmail = draftEmail.trim();

    if (!trimmedName) {
      setFormError('Please enter your name.');
      return;
    }
    if (!trimmedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setFormError('Please enter a valid email address.');
      return;
    }

    setFormError(null);
    onUpdateProfile({
      ...profile,
      name: trimmedName,
      email: trimmedEmail,
    });
    setIsEditing(false);
    onNotify('Profile updated', 'success');
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-labelledby="profile-modal-title"
      onClick={onClose}
    >
      <div
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-slate-200/90 bg-white/95 p-6 shadow-2xl backdrop-blur-xl dark:border-slate-800 dark:bg-[#11182C]/95"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-[#0F1A2E] dark:text-slate-100">
            <User className="h-4.5 w-4.5 text-blue-600 dark:text-violet-400" aria-hidden="true" />
            <h2
              id="profile-modal-title"
              className="font-display text-lg font-semibold"
            >
              Student Profile
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close profile panel"
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        {/* Avatar + Identity Card */}
        <div className="mt-5 rounded-2xl border border-slate-200/80 bg-[#FAF8F5]/80 p-4 dark:border-slate-800 dark:bg-slate-900/60">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="relative shrink-0">
                {profile.avatarDataUrl ? (
                  <img
                    src={profile.avatarDataUrl}
                    alt={`${profile.name} avatar`}
                    referrerPolicy="no-referrer"
                    className="h-14 w-14 rounded-full object-cover ring-2 ring-blue-500/25 dark:ring-violet-400/30"
                  />
                ) : (
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-blue-600 to-violet-600 font-display text-base font-semibold text-white shadow-sm">
                    {getInitials(profile.name)}
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  aria-label="Upload profile photo"
                  title="Upload profile photo"
                  className="absolute -bottom-1 -right-1 inline-flex h-6 w-6 items-center justify-center rounded-full border border-white bg-blue-600 text-white shadow-xs transition-colors hover:bg-blue-700 dark:border-slate-900 dark:bg-violet-600 dark:hover:bg-violet-500"
                >
                  <Camera className="h-3 w-3" aria-hidden="true" />
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarChange}
                  className="hidden"
                />
              </div>

              <div className="min-w-0">
                <div className="font-display text-sm font-semibold text-[#0F1A2E] dark:text-slate-100 truncate">
                  {profile.name}
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400 truncate">
                  {profile.email}
                </div>
                <div className="mt-1.5 flex items-center gap-3 text-[11px]">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="font-medium text-blue-600 hover:underline dark:text-violet-400"
                  >
                    {profile.avatarDataUrl ? 'Change photo' : 'Upload photo'}
                  </button>
                  {profile.avatarDataUrl && (
                    <button
                      type="button"
                      onClick={handleRemoveAvatar}
                      className="text-slate-400 hover:text-rose-600 dark:hover:text-rose-400"
                    >
                      Remove
                    </button>
                  )}
                </div>
              </div>
            </div>

            {!isEditing && (
              <button
                type="button"
                onClick={() => setIsEditing(true)}
                className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 transition-colors hover:border-blue-300 hover:text-blue-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:border-violet-400/60 dark:hover:text-violet-300 whitespace-nowrap"
              >
                <Edit3 className="h-3.5 w-3.5" aria-hidden="true" />
                Edit profile
              </button>
            )}
          </div>

          {isEditing && (
            <form
              onSubmit={handleSaveProfile}
              className="mt-4 space-y-3 border-t border-slate-200/80 pt-4 dark:border-slate-800"
            >
              <div>
                <label
                  htmlFor="student-name-input"
                  className="block text-xs font-medium text-slate-600 dark:text-slate-300"
                >
                  Student name
                </label>
                <input
                  id="student-name-input"
                  type="text"
                  value={draftName}
                  onChange={(e) => setDraftName(e.target.value)}
                  placeholder="Enter your full name"
                  className="mt-1 h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs text-slate-900 focus:border-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:border-violet-400"
                />
              </div>

              <div>
                <label
                  htmlFor="student-email-input"
                  className="block text-xs font-medium text-slate-600 dark:text-slate-300"
                >
                  Email address
                </label>
                <input
                  id="student-email-input"
                  type="email"
                  value={draftEmail}
                  onChange={(e) => setDraftEmail(e.target.value)}
                  placeholder="you@college.edu"
                  className="mt-1 h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs text-slate-900 focus:border-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:border-violet-400"
                />
              </div>

              {formError && (
                <p className="text-xs text-rose-600 dark:text-rose-400" role="alert">
                  {formError}
                </p>
              )}

              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setIsEditing(false);
                    setDraftName(profile.name);
                    setDraftEmail(profile.email);
                    setFormError(null);
                  }}
                  className="h-8 rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-gradient-to-r from-blue-600 to-violet-600 px-3 text-xs font-semibold text-white hover:brightness-105"
                >
                  <Check className="h-3.5 w-3.5" aria-hidden="true" />
                  Save changes
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Theme Preference */}
        <div className="mt-5 border-t border-slate-100 pt-4 dark:border-slate-800">
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="text-xs font-semibold text-[#0F1A2E] dark:text-slate-100">
                Theme preference
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400">
                Choose light ivory or deep navy appearance
              </div>
            </div>

            <div className="flex items-center gap-1 rounded-xl border border-slate-200/90 bg-slate-100/80 p-1 dark:border-slate-700/80 dark:bg-slate-900">
              <button
                type="button"
                onClick={() => onSetDarkMode(false)}
                aria-pressed={!darkMode}
                className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors whitespace-nowrap ${
                  !darkMode
                    ? 'bg-white text-[#0F1A2E] shadow-2xs'
                    : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
                }`}
              >
                <Sun className="h-3.5 w-3.5" aria-hidden="true" />
                Light
              </button>
              <button
                type="button"
                onClick={() => onSetDarkMode(true)}
                aria-pressed={darkMode}
                className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors whitespace-nowrap ${
                  darkMode
                    ? 'bg-slate-800 text-slate-100 shadow-2xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <Moon className="h-3.5 w-3.5" aria-hidden="true" />
                Dark
              </button>
            </div>
          </div>
        </div>

        {/* Chat Preferences */}
        <div className="mt-5 border-t border-slate-100 pt-4 dark:border-slate-800">
          <div className="mb-3 flex items-center gap-2 text-xs font-semibold text-[#0F1A2E] dark:text-slate-100">
            <SlidersHorizontal
              className="h-3.5 w-3.5 text-blue-600 dark:text-violet-400"
              aria-hidden="true"
            />
            <span>Chat preferences</span>
          </div>

          <div className="space-y-2.5">
            <label className="flex cursor-pointer items-center justify-between gap-4 rounded-xl border border-slate-200/80 bg-slate-50/70 px-3.5 py-2.5 dark:border-slate-800 dark:bg-slate-900/50">
              <div>
                <div className="text-xs font-medium text-slate-800 dark:text-slate-200">
                  Typing reveal animation
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400">
                  Animate assistant responses smoothly as they appear
                </div>
              </div>
              <input
                type="checkbox"
                checked={preferences.typingAnimation}
                onChange={(e) =>
                  onUpdatePreferences({
                    ...preferences,
                    typingAnimation: e.target.checked,
                  })
                }
                className="h-4 w-4 accent-blue-600 dark:accent-violet-500"
              />
            </label>

            <label className="flex cursor-pointer items-center justify-between gap-4 rounded-xl border border-slate-200/80 bg-slate-50/70 px-3.5 py-2.5 dark:border-slate-800 dark:bg-slate-900/50">
              <div>
                <div className="text-xs font-medium text-slate-800 dark:text-slate-200">
                  Follow-up suggestions
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400">
                  Show related campus questions after each answer
                </div>
              </div>
              <input
                type="checkbox"
                checked={preferences.showFollowUps}
                onChange={(e) =>
                  onUpdatePreferences({
                    ...preferences,
                    showFollowUps: e.target.checked,
                  })
                }
                className="h-4 w-4 accent-blue-600 dark:accent-violet-500"
              />
            </label>

            <label className="flex cursor-pointer items-center justify-between gap-4 rounded-xl border border-slate-200/80 bg-slate-50/70 px-3.5 py-2.5 dark:border-slate-800 dark:bg-slate-900/50">
              <div>
                <div className="text-xs font-medium text-slate-800 dark:text-slate-200">
                  Press Enter to send
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400">
                  Use Shift + Enter to add a new line
                </div>
              </div>
              <input
                type="checkbox"
                checked={preferences.enterToSend}
                onChange={(e) =>
                  onUpdatePreferences({
                    ...preferences,
                    enterToSend: e.target.checked,
                  })
                }
                className="h-4 w-4 accent-blue-600 dark:accent-violet-500"
              />
            </label>
          </div>
        </div>

        {/* Clear Chat History */}
        <div className="mt-5 border-t border-slate-100 pt-4 dark:border-slate-800">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-xs font-semibold text-[#0F1A2E] dark:text-slate-100">
                Chat history
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 tabular-nums">
                {historyCount === 0
                  ? 'No saved conversations'
                  : `${historyCount} saved conversation${historyCount === 1 ? '' : 's'} on this device`}
              </div>
            </div>

            {!confirmClearAll ? (
              <button
                type="button"
                disabled={historyCount === 0}
                onClick={() => setConfirmClearAll(true)}
                className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50/70 px-3 text-xs font-medium text-rose-700 transition-colors hover:bg-rose-100 disabled:opacity-40 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300 dark:hover:bg-rose-500/20 whitespace-nowrap"
              >
                <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                Clear chat history
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setConfirmClearAll(false)}
                  className="h-8 rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-medium text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onClearAllHistory();
                    setConfirmClearAll(false);
                  }}
                  className="h-8 rounded-lg bg-rose-600 px-3 text-xs font-semibold text-white hover:bg-rose-700"
                >
                  Confirm delete all
                </button>
              </div>
            )}
          </div>
        </div>

        {/* About CampusMate AI */}
        <div className="mt-5 rounded-xl border border-slate-200/80 bg-[#FAF8F5]/80 p-3.5 dark:border-slate-800 dark:bg-slate-900/60">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-[#0F1A2E] dark:text-slate-100">
            <Info className="h-3.5 w-3.5 text-blue-600 dark:text-violet-400" aria-hidden="true" />
            <span>About CampusMate AI</span>
          </div>
          <p className="mt-1 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
            CampusMate AI is your personal campus assistant for quick, reliable answers
            about admissions, courses, tuition fees, scholarships, exams, placements,
            and student facilities.
          </p>
        </div>
      </div>
    </div>
  );
};
