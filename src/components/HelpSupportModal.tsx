import React from 'react';
import { Clock, Mail, MapPin, Phone, X } from 'lucide-react';

interface HelpSupportModalProps {
  open: boolean;
  onClose: () => void;
  onSelectSupportQuestion: (question: string) => void;
}

export const HelpSupportModal: React.FC<HelpSupportModalProps> = ({
  open,
  onClose,
  onSelectSupportQuestion,
}) => {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-labelledby="support-modal-title"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl border border-slate-200 bg-white/95 p-6 shadow-2xl backdrop-blur-xl dark:border-slate-800 dark:bg-[#11182C]/95"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2
              id="support-modal-title"
              className="font-display text-lg font-semibold text-[#0F1A2E] dark:text-slate-100"
            >
              Student Help &amp; Support
            </h2>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
              Need direct assistance from campus staff? Reach our Student Affairs office below.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close help dialog"
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <div className="mt-5 space-y-3.5 border-t border-slate-100 pt-4 text-sm text-slate-700 dark:border-slate-800 dark:text-slate-300">
          <div className="flex items-start gap-3">
            <Mail className="mt-0.5 h-4 w-4 shrink-0 text-blue-600 dark:text-violet-400" aria-hidden="true" />
            <div>
              <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
                Student Helpdesk Email
              </div>
              <div className="font-medium text-slate-900 dark:text-slate-100">
                support@campusassist.edu
              </div>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <Phone className="mt-0.5 h-4 w-4 shrink-0 text-blue-600 dark:text-violet-400" aria-hidden="true" />
            <div>
              <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
                Helpline Number
              </div>
              <div className="font-medium text-slate-900 dark:text-slate-100">
                +1 (800) 555-0194
              </div>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-blue-600 dark:text-violet-400" aria-hidden="true" />
            <div>
              <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
                On-Campus Desk
              </div>
              <div className="font-medium text-slate-900 dark:text-slate-100">
                Admin Block, Room 102
              </div>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <Clock className="mt-0.5 h-4 w-4 shrink-0 text-blue-600 dark:text-violet-400" aria-hidden="true" />
            <div>
              <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
                Office Hours
              </div>
              <div className="font-medium text-slate-900 dark:text-slate-100">
                Monday – Saturday, 9:00 AM – 5:30 PM
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 border-t border-slate-100 pt-4 dark:border-slate-800">
          <div className="mb-2 text-xs font-medium text-slate-500 dark:text-slate-400">
            Quick support questions
          </div>
          <div className="flex flex-col gap-1.5">
            <button
              type="button"
              onClick={() => {
                onSelectSupportQuestion('How do I reset my forgotten Student Portal password?');
                onClose();
              }}
              className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-left text-xs font-medium text-slate-700 transition-colors hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700 dark:border-slate-700 dark:bg-slate-800/70 dark:text-slate-200 dark:hover:border-violet-500/60 dark:hover:bg-slate-800"
            >
              How do I reset my forgotten Student Portal password?
            </button>
            <button
              type="button"
              onClick={() => {
                onSelectSupportQuestion(
                  'How do I apply for a bonafide certificate or official transcript?'
                );
                onClose();
              }}
              className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-left text-xs font-medium text-slate-700 transition-colors hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700 dark:border-slate-700 dark:bg-slate-800/70 dark:text-slate-200 dark:hover:border-violet-500/60 dark:hover:bg-slate-800"
            >
              How do I apply for a bonafide certificate or official transcript?
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
