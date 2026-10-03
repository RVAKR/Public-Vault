import React, { useState } from 'react';
import { 
  X, 
  Archive, 
  Mail, 
  Download, 
  CheckCircle2, 
  AlertCircle, 
  FileText, 
  ShieldCheck, 
  Calendar,
  Send,
  Loader2,
  FolderArchive,
  Clock
} from 'lucide-react';
import { VaultItem } from '../types';
import { generateMonthlyArchiveZip, sendArchiveEmail, MonthlyArchiveResult } from '../services/archive';
import { logArchiveToFirestore } from '../services/firebase';

interface MonthlyArchiveModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: VaultItem[];
  userEmail: string;
  userId?: string;
  onSuccessToast: (msg: string) => void;
}

export const MonthlyArchiveModal: React.FC<MonthlyArchiveModalProps> = ({
  isOpen,
  onClose,
  items,
  userEmail,
  userId,
  onSuccessToast,
}) => {
  const [recipientEmail, setRecipientEmail] = useState(userEmail || 'admin@boreddy.com');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [lastGenerated, setLastGenerated] = useState<MonthlyArchiveResult | null>(null);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  if (!isOpen) return null;

  const handleGenerateArchive = async () => {
    setIsGenerating(true);
    setStatusMessage(null);
    try {
      const result = await generateMonthlyArchiveZip(items, recipientEmail);
      setLastGenerated(result);
      setStatusMessage({
        type: 'success',
        text: `Archive packaged successfully: ${result.zipFileName} (${(result.totalSizeBytes / 1024).toFixed(1)} KB)`
      });
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: err.message || 'Failed to assemble monthly ZIP archive'
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownloadZip = () => {
    if (!lastGenerated) return;
    const url = URL.createObjectURL(lastGenerated.zipBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = lastGenerated.zipFileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    onSuccessToast(`Monthly archive downloaded: ${lastGenerated.zipFileName}`);
  };

  const handleSendEmail = async () => {
    if (!recipientEmail || !recipientEmail.includes('@')) {
      setStatusMessage({ type: 'error', text: 'Please provide a valid recipient email address.' });
      return;
    }

    setIsSending(true);
    setStatusMessage(null);
    try {
      let archive = lastGenerated;
      if (!archive) {
        archive = await generateMonthlyArchiveZip(items, recipientEmail);
        setLastGenerated(archive);
      }

      const sendResult = await sendArchiveEmail(
        archive.zipBlob,
        archive.zipFileName,
        recipientEmail,
        archive.itemCount,
        archive.attachmentCount
      );

      if (userId) {
        await logArchiveToFirestore(
          userId,
          recipientEmail,
          archive.zipFileName,
          archive.itemCount,
          archive.attachmentCount
        ).catch(console.warn);
      }

      setStatusMessage({
        type: 'success',
        text: sendResult.message
      });
      onSuccessToast(`Monthly archive package queued for ${recipientEmail}!`);
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: err.message || 'Error dispatching archive package.'
      });
    } finally {
      setIsSending(false);
    }
  };

  const attachmentCount = items.reduce((acc, item) => {
    return acc + ((item as any).attachments?.length || 0);
  }, 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
      <div 
        id="monthly-archive-modal"
        className="relative w-full max-w-xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500/20 to-indigo-500/20 border border-cyan-800/40 flex items-center justify-center text-cyan-400">
              <FolderArchive className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
                Monthly Archival Export & Email
                <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-950 text-emerald-400 border border-emerald-800/50">
                  Automated ZIP
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Package all credentials, encrypted files, and reports into a secure offline ZIP
              </p>
            </div>
          </div>
          <button
            id="btn-close-archive-modal"
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body Content */}
        <div className="p-6 space-y-5 overflow-y-auto">
          {/* Manifest stats overview */}
          <div className="grid grid-cols-3 gap-3">
            <div className="p-3.5 bg-slate-950/60 rounded-xl border border-slate-800">
              <span className="text-[11px] text-slate-400 block font-medium">Total Credentials</span>
              <span className="text-xl font-bold text-cyan-400">{items.length}</span>
              <span className="text-[10px] text-slate-500 block">Logins, cards, IDs</span>
            </div>
            <div className="p-3.5 bg-slate-950/60 rounded-xl border border-slate-800">
              <span className="text-[11px] text-slate-400 block font-medium">Decrypted Files</span>
              <span className="text-xl font-bold text-amber-400">{attachmentCount}</span>
              <span className="text-[10px] text-slate-500 block">Passports, PDFs, docs</span>
            </div>
            <div className="p-3.5 bg-slate-950/60 rounded-xl border border-slate-800">
              <span className="text-[11px] text-slate-400 block font-medium">Archive Schedule</span>
              <span className="text-xl font-bold text-emerald-400">Monthly</span>
              <span className="text-[10px] text-slate-500 block">Offline cold backup</span>
            </div>
          </div>

          {/* Recipient Email Input */}
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-slate-200">
              Target Recipient Email Address
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                id="input-archive-recipient-email"
                type="email"
                value={recipientEmail}
                onChange={(e) => setRecipientEmail(e.target.value)}
                placeholder="admin@boreddy.com"
                className="w-full bg-slate-950/70 border border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 font-mono"
              />
            </div>
            <p className="text-[11px] text-slate-400">
              The packaged ZIP archive and manifest summary will be sent to this verified address.
            </p>
          </div>

          {/* Contents of ZIP package */}
          <div className="p-4 rounded-xl bg-slate-950/40 border border-slate-800 space-y-2.5">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-200">
              <Archive className="w-4 h-4 text-indigo-400" />
              <span>What's inside the generated Monthly ZIP file:</span>
            </div>
            <ul className="text-xs text-slate-300 space-y-1.5 list-disc list-inside">
              <li><strong className="text-cyan-300 font-mono">credentials.csv</strong>: Full CSV format of all passwords, cards, pins, and notes.</li>
              <li><strong className="text-emerald-300 font-mono">documents/</strong>: Folder containing every decoded PDF, passport, and document attachment.</li>
              <li><strong className="text-amber-300 font-mono">README_VAULT_SUMMARY.md</strong>: Readable index and categorization table.</li>
            </ul>
          </div>

          {/* Feedback message banner */}
          {statusMessage && (
            <div className={`p-3.5 rounded-xl border flex items-start gap-2.5 text-xs ${
              statusMessage.type === 'success' 
                ? 'bg-emerald-950/50 border-emerald-800/80 text-emerald-200' 
                : 'bg-rose-950/50 border-rose-800/80 text-rose-200'
            }`}>
              {statusMessage.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              )}
              <span className="leading-relaxed">{statusMessage.text}</span>
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="px-6 py-4 border-t border-slate-800/90 bg-slate-950/60 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              id="btn-generate-zip-only"
              onClick={handleGenerateArchive}
              disabled={isGenerating || isSending}
              className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-2 border border-slate-700 transition-colors disabled:opacity-50 cursor-pointer"
            >
              {isGenerating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Archive className="w-3.5 h-3.5 text-cyan-400" />}
              <span>{lastGenerated ? 'Re-package ZIP' : 'Build ZIP'}</span>
            </button>

            {lastGenerated && (
              <button
                id="btn-download-monthly-zip"
                onClick={handleDownloadZip}
                className="px-3.5 py-2 rounded-xl bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-800 text-emerald-300 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download .ZIP</span>
              </button>
            )}
          </div>

          <button
            id="btn-dispatch-monthly-email"
            onClick={handleSendEmail}
            disabled={isGenerating || isSending}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white text-xs font-semibold flex items-center gap-2 shadow-md transition-all disabled:opacity-50 cursor-pointer"
          >
            {isSending ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Sending Archive...</span>
              </>
            ) : (
              <>
                <Send className="w-3.5 h-3.5" />
                <span>Send to {recipientEmail.split('@')[0]}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
