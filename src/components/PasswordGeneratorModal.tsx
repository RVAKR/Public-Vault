import React, { useState, useEffect } from 'react';
import { 
  X, 
  Sparkles, 
  Copy, 
  Check, 
  RefreshCw, 
  ShieldCheck, 
  Sliders, 
  KeyRound,
  Hash,
  Type
} from 'lucide-react';
import { PasswordGeneratorOptions } from '../types';
import { generatePassword, calculatePasswordStrength } from '../services/crypto';

interface PasswordGeneratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectPassword?: (password: string) => void;
  onCopyText: (text: string, label: string) => void;
}

export const PasswordGeneratorModal: React.FC<PasswordGeneratorModalProps> = ({
  isOpen,
  onClose,
  onSelectPassword,
  onCopyText,
}) => {
  const [options, setOptions] = useState<PasswordGeneratorOptions>({
    length: 20,
    uppercase: true,
    lowercase: true,
    numbers: true,
    symbols: true,
    avoidAmbiguous: true,
    mode: 'random',
    wordCount: 4,
  });

  const [generatedPassword, setGeneratedPassword] = useState('');
  const [copied, setCopied] = useState(false);
  const [history, setHistory] = useState<string[]>([]);

  const regenerate = () => {
    const pwd = generatePassword(options);
    setGeneratedPassword(pwd);
    setCopied(false);
    setHistory((prev) => [pwd, ...prev.filter((p) => p !== pwd)].slice(0, 5));
  };

  useEffect(() => {
    if (isOpen) {
      regenerate();
    }
  }, [isOpen, options]);

  if (!isOpen) return null;

  const strength = calculatePasswordStrength(generatedPassword);

  const handleCopy = () => {
    onCopyText(generatedPassword, 'Generated Password');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div id="password-generator-modal" className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in-95">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-400" />
            <h3 className="text-base font-bold text-white">Cryptographic Password Generator</h3>
          </div>
          <button
            id="btn-close-generator"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {/* Password Output Box */}
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between gap-3">
              <span className="font-mono text-base sm:text-lg text-emerald-400 font-bold tracking-wider break-all select-all flex-1">
                {generatedPassword}
              </span>
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  id="btn-regen-password"
                  onClick={regenerate}
                  title="Generate new password"
                  className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
                <button
                  id="btn-copy-gen-password"
                  onClick={handleCopy}
                  title="Copy to clipboard"
                  className="px-3 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors"
                >
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  <span>{copied ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
            </div>

            {/* Strength Meter Bar */}
            <div className="space-y-1 pt-1 border-t border-slate-800/80">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">Security Score:</span>
                <span className={`font-semibold ${strength.color}`}>
                  {strength.label} ({strength.score}/100)
                </span>
              </div>
              <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-300 ${
                    strength.score < 50 ? 'bg-rose-500' : strength.score < 80 ? 'bg-amber-400' : 'bg-emerald-400'
                  }`}
                  style={{ width: `${strength.score}%` }}
                />
              </div>
            </div>
          </div>

          {/* Mode Selector */}
          <div className="grid grid-cols-3 gap-2">
            {[
              { id: 'random', label: 'Random', icon: KeyRound },
              { id: 'passphrase', label: 'Passphrase', icon: Type },
              { id: 'pin', label: 'PIN Code', icon: Hash },
            ].map((m) => {
              const Icon = m.icon;
              const isSel = options.mode === m.id;
              return (
                <button
                  key={m.id}
                  type="button"
                  id={`btn-mode-${m.id}`}
                  onClick={() => setOptions({ ...options, mode: m.id as any })}
                  className={`py-2 px-3 rounded-xl border text-xs font-medium flex items-center justify-center gap-1.5 transition-all ${
                    isSel
                      ? 'bg-slate-800 border-cyan-500 text-white shadow-sm'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:bg-slate-800/60'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{m.label}</span>
                </button>
              );
            })}
          </div>

          {/* Mode Specific Controls */}
          {options.mode === 'random' && (
            <div className="space-y-4">
              {/* Length Slider */}
              <div>
                <div className="flex items-center justify-between text-xs font-medium text-slate-300 mb-1.5">
                  <span>Password Length</span>
                  <span className="font-mono text-cyan-400 font-bold">{options.length} characters</span>
                </div>
                <input
                  id="range-password-length"
                  type="range"
                  min={8}
                  max={48}
                  value={options.length}
                  onChange={(e) => setOptions({ ...options, length: parseInt(e.target.value, 10) })}
                  className="w-full accent-cyan-500 cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-slate-500">
                  <span>8 chars</span>
                  <span>24 chars</span>
                  <span>48 chars</span>
                </div>
              </div>

              {/* Character Toggles */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <label className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-950/60 border border-slate-800 cursor-pointer hover:bg-slate-800/40">
                  <input
                    type="checkbox"
                    checked={options.uppercase}
                    onChange={(e) => setOptions({ ...options, uppercase: e.target.checked })}
                    className="accent-cyan-500 rounded"
                  />
                  <span className="text-slate-200">Uppercase (A-Z)</span>
                </label>
                <label className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-950/60 border border-slate-800 cursor-pointer hover:bg-slate-800/40">
                  <input
                    type="checkbox"
                    checked={options.lowercase}
                    onChange={(e) => setOptions({ ...options, lowercase: e.target.checked })}
                    className="accent-cyan-500 rounded"
                  />
                  <span className="text-slate-200">Lowercase (a-z)</span>
                </label>
                <label className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-950/60 border border-slate-800 cursor-pointer hover:bg-slate-800/40">
                  <input
                    type="checkbox"
                    checked={options.numbers}
                    onChange={(e) => setOptions({ ...options, numbers: e.target.checked })}
                    className="accent-cyan-500 rounded"
                  />
                  <span className="text-slate-200">Numbers (0-9)</span>
                </label>
                <label className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-950/60 border border-slate-800 cursor-pointer hover:bg-slate-800/40">
                  <input
                    type="checkbox"
                    checked={options.symbols}
                    onChange={(e) => setOptions({ ...options, symbols: e.target.checked })}
                    className="accent-cyan-500 rounded"
                  />
                  <span className="text-slate-200">Symbols (!@#$%)</span>
                </label>
              </div>

              <label className="flex items-center gap-2 text-xs text-slate-400 cursor-pointer">
                <input
                  type="checkbox"
                  checked={options.avoidAmbiguous}
                  onChange={(e) => setOptions({ ...options, avoidAmbiguous: e.target.checked })}
                  className="accent-cyan-500 rounded"
                />
                <span>Avoid ambiguous characters (e.g. 0, O, l, 1, I)</span>
              </label>
            </div>
          )}

          {options.mode === 'passphrase' && (
            <div className="space-y-3">
              <div>
                <div className="flex items-center justify-between text-xs font-medium text-slate-300 mb-1.5">
                  <span>Number of Words</span>
                  <span className="font-mono text-cyan-400 font-bold">{options.wordCount || 4} words</span>
                </div>
                <input
                  type="range"
                  min={3}
                  max={7}
                  value={options.wordCount || 4}
                  onChange={(e) => setOptions({ ...options, wordCount: parseInt(e.target.value, 10) })}
                  className="w-full accent-cyan-500 cursor-pointer"
                />
              </div>
              <p className="text-xs text-slate-400">
                Passphrases use the Diceware method to create easily memorizable phrases with mathematical high entropy.
              </p>
            </div>
          )}

          {options.mode === 'pin' && (
            <div className="space-y-3">
              <div>
                <div className="flex items-center justify-between text-xs font-medium text-slate-300 mb-1.5">
                  <span>PIN Digits</span>
                  <span className="font-mono text-cyan-400 font-bold">{options.length || 6} digits</span>
                </div>
                <input
                  type="range"
                  min={4}
                  max={12}
                  value={options.length || 6}
                  onChange={(e) => setOptions({ ...options, length: parseInt(e.target.value, 10) })}
                  className="w-full accent-cyan-500 cursor-pointer"
                />
              </div>
            </div>
          )}

          {/* Session History */}
          {history.length > 1 && (
            <div className="pt-3 border-t border-slate-800">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1.5">
                Session History
              </span>
              <div className="space-y-1 max-h-24 overflow-y-auto">
                {history.slice(1).map((hist, idx) => (
                  <div
                    key={idx}
                    onClick={() => {
                      setGeneratedPassword(hist);
                      onCopyText(hist, 'Password from history');
                    }}
                    className="p-1.5 rounded-lg bg-slate-950 hover:bg-slate-800 text-xs font-mono text-slate-400 hover:text-white cursor-pointer flex items-center justify-between"
                  >
                    <span className="truncate">{hist}</span>
                    <Copy className="w-3 h-3 shrink-0 ml-2" />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-800 flex items-center justify-end gap-2 bg-slate-900">
          <button
            id="btn-close-generator-footer"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-medium text-slate-300 hover:bg-slate-800"
          >
            Done
          </button>
          {onSelectPassword && (
            <button
              id="btn-use-generated-password"
              onClick={() => {
                onSelectPassword(generatedPassword);
                onClose();
              }}
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-cyan-600 hover:bg-cyan-500 text-white shadow-md"
            >
              Use This Password
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
