import React, { useState } from 'react';
import { 
  ShieldCheck, 
  Lock, 
  KeyRound, 
  Eye, 
  EyeOff, 
  Upload, 
  Sparkles, 
  HardDriveDownload, 
  Coins, 
  Check, 
  Info,
  RefreshCw,
  AlertTriangle,
  LogIn,
  LogOut,
  User as UserIcon,
  Cloud
} from 'lucide-react';
import { calculatePasswordStrength } from '../services/crypto';
import { User } from 'firebase/auth';

interface VaultLockScreenProps {
  isConfigured: boolean;
  passwordHint?: string;
  onUnlock: (password: string) => Promise<boolean>;
  onCreateVault: (password: string, hint?: string) => Promise<void>;
  onImportBackup: (file: File) => Promise<void>;
  onResetVault: () => Promise<void>;
  currentUser?: User | null;
  onGoogleSignIn: () => Promise<void>;
  onSignOut: () => Promise<void>;
}

export const VaultLockScreen: React.FC<VaultLockScreenProps> = ({
  isConfigured,
  passwordHint,
  onUnlock,
  onCreateVault,
  onImportBackup,
  onResetVault,
  currentUser,
  onGoogleSignIn,
  onSignOut,
}) => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [hint, setHint] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  const strength = calculatePasswordStrength(password);

  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) {
      setErrorMessage('Please enter your Master Password.');
      return;
    }

    setErrorMessage('');
    setIsLoading(true);
    try {
      const success = await onUnlock(password);
      if (!success) {
        setErrorMessage('Incorrect Master Password. Please verify and try again.');
      }
    } catch {
      setErrorMessage('Failed to decrypt vault. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) {
      setErrorMessage('Please choose a Master Password.');
      return;
    }
    if (password.length < 8) {
      setErrorMessage('Master Password should be at least 8 characters long for adequate security.');
      return;
    }
    if (password !== confirmPassword) {
      setErrorMessage('Passwords do not match.');
      return;
    }

    setErrorMessage('');
    setIsLoading(true);
    try {
      await onCreateVault(password, hint.trim() || undefined);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to create vault.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setIsLoading(true);
      setErrorMessage('');
      try {
        await onImportBackup(file);
      } catch (err: any) {
        setErrorMessage(err.message || 'Failed to import backup vault.');
      } finally {
        setIsLoading(false);
      }
    }
  };

  return (
    <div id="vault-lock-screen" className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-4 sm:p-6 relative overflow-hidden">
      {/* Background ambient lighting */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-cyan-900/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-72 h-72 bg-emerald-900/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-lg relative z-10">
        {/* App Identity Banner */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-500/20 via-slate-800 to-emerald-500/20 border border-slate-700/60 shadow-xl mb-4">
            <ShieldCheck className="w-9 h-9 text-cyan-400" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
            Personal Credential & Document Vault
          </h1>
          <p className="text-sm text-slate-400 mt-2 max-w-md mx-auto">
            Zero-Knowledge AES-256-GCM Encrypted Storage • 100% Free Forever • Zero External Servers
          </p>

          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-950/60 border border-emerald-700/50 text-emerald-300 text-xs font-medium mt-3">
            <Coins className="w-3.5 h-3.5" />
            <span>GCP Firebase Free Tier Lifetime • Zero Cloud Subscription</span>
          </div>

          {/* Google Workspace / Gmail SSO Box */}
          <div className="mt-4 flex justify-center">
            {currentUser ? (
              <div className="inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-xs text-slate-200">
                <Cloud className="w-4 h-4 text-cyan-400" />
                <span>Signed in as <strong className="text-white">{currentUser.email}</strong></span>
                <button
                  type="button"
                  onClick={onSignOut}
                  className="ml-1 text-slate-400 hover:text-rose-300 text-[11px] underline"
                >
                  Sign Out
                </button>
              </div>
            ) : (
              <button
                type="button"
                id="btn-google-sso"
                onClick={onGoogleSignIn}
                className="inline-flex items-center gap-2.5 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700/90 border border-slate-600 text-white text-xs font-semibold shadow transition-all cursor-pointer"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                </svg>
                <span>Sign In with Gmail / Google SSO</span>
              </button>
            )}
          </div>
        </div>

        {/* Main Card Container */}
        <div className="bg-slate-900/90 border border-slate-800/90 rounded-2xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl">
          {!isConfigured ? (
            /* Setup New Vault Mode */
            <div>
              <div className="flex items-center justify-between mb-5 border-b border-slate-800 pb-4">
                <div>
                  <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                    <KeyRound className="w-5 h-5 text-cyan-400" />
                    Initialize Your Secure Vault
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Your Master Password derives the AES-256 encryption key. It is never transmitted anywhere.
                  </p>
                </div>
              </div>

              {errorMessage && (
                <div className="mb-5 p-3.5 rounded-xl bg-rose-950/60 border border-rose-800/60 text-rose-300 text-xs flex items-start gap-2.5">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{errorMessage}</span>
                </div>
              )}

              <form onSubmit={handleCreate} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    Master Password <span className="text-rose-400">*</span>
                  </label>
                  <div className="relative">
                    <input
                      id="input-setup-password"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Choose a strong, memorable master password"
                      className="w-full bg-slate-950/80 border border-slate-700/80 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 pr-10"
                      required
                    />
                    <button
                      type="button"
                      id="btn-toggle-setup-password"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>

                  {/* Password Strength Indicator */}
                  {password && (
                    <div className="mt-2.5 space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-400">Strength:</span>
                        <span className={`font-medium ${strength.color}`}>{strength.label}</span>
                      </div>
                      <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className={`h-full transition-all duration-300 ${
                            strength.score < 40 ? 'bg-rose-500' : strength.score < 70 ? 'bg-amber-500' : 'bg-emerald-400'
                          }`}
                          style={{ width: `${Math.max(5, strength.score)}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    Confirm Master Password <span className="text-rose-400">*</span>
                  </label>
                  <input
                    id="input-setup-confirm-password"
                    type={showPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter your master password"
                    className="w-full bg-slate-950/80 border border-slate-700/80 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    Password Hint <span className="text-slate-500">(Optional)</span>
                  </label>
                  <input
                    id="input-setup-hint"
                    type="text"
                    value={hint}
                    onChange={(e) => setHint(e.target.value)}
                    placeholder="e.g. Favorite book and graduation year"
                    className="w-full bg-slate-950/80 border border-slate-700/80 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                  />
                </div>

                <div className="pt-2">
                  <button
                    id="btn-create-vault"
                    type="submit"
                    disabled={isLoading}
                    className="w-full py-3 px-4 rounded-xl font-medium text-sm text-white bg-gradient-to-r from-cyan-600 to-emerald-600 hover:from-cyan-500 hover:to-emerald-500 active:scale-[0.99] transition-all shadow-lg shadow-cyan-900/30 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {isLoading ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Deriving 256-Bit Cryptographic Keys...</span>
                      </>
                    ) : (
                      <>
                        <ShieldCheck className="w-4 h-4" />
                        <span>Create Encrypted Vault</span>
                      </>
                    )}
                  </button>
                </div>
              </form>

              {/* Restore Backup alternative */}
              <div className="mt-6 pt-5 border-t border-slate-800 text-center">
                <p className="text-xs text-slate-400 mb-3">Already have an existing encrypted backup file?</p>
                <label className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-medium text-slate-300 bg-slate-800/80 hover:bg-slate-800 border border-slate-700 cursor-pointer transition-colors">
                  <Upload className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Restore from .vault Backup File</span>
                  <input
                    type="file"
                    accept=".vault,.json"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </label>
              </div>
            </div>
          ) : (
            /* Unlock Existing Vault Mode */
            <div>
              <div className="flex items-center justify-between mb-5 border-b border-slate-800 pb-4">
                <div>
                  <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                    <Lock className="w-5 h-5 text-cyan-400" />
                    Unlock Vault
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">Enter your Master Password to decrypt your records</p>
                </div>
              </div>

              {errorMessage && (
                <div className="mb-5 p-3.5 rounded-xl bg-rose-950/60 border border-rose-800/60 text-rose-300 text-xs flex items-start gap-2.5">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{errorMessage}</span>
                </div>
              )}

              <form onSubmit={handleUnlock} className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-medium text-slate-300">
                      Master Password
                    </label>
                    {passwordHint && (
                      <button
                        type="button"
                        id="btn-show-hint"
                        onClick={() => setShowHint(!showHint)}
                        className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1 cursor-pointer"
                      >
                        <Info className="w-3.5 h-3.5" />
                        <span>{showHint ? 'Hide Hint' : 'View Hint'}</span>
                      </button>
                    )}
                  </div>

                  <div className="relative">
                    <input
                      id="input-unlock-password"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter your master password"
                      autoFocus
                      className="w-full bg-slate-950/80 border border-slate-700/80 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 pr-10"
                      required
                    />
                    <button
                      type="button"
                      id="btn-toggle-unlock-password"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>

                  {showHint && passwordHint && (
                    <div className="mt-2.5 p-2.5 rounded-lg bg-slate-950/60 border border-slate-800 text-xs text-slate-300 flex items-center gap-2">
                      <KeyRound className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      <span>Password Hint: <strong className="text-white">{passwordHint}</strong></span>
                    </div>
                  )}
                </div>

                <div className="pt-2">
                  <button
                    id="btn-unlock-vault"
                    type="submit"
                    disabled={isLoading}
                    className="w-full py-3 px-4 rounded-xl font-medium text-sm text-white bg-gradient-to-r from-cyan-600 to-emerald-600 hover:from-cyan-500 hover:to-emerald-500 active:scale-[0.99] transition-all shadow-lg shadow-cyan-900/30 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {isLoading ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Verifying & Decrypting Vault...</span>
                      </>
                    ) : (
                      <>
                        <Lock className="w-4 h-4" />
                        <span>Unlock Vault</span>
                      </>
                    )}
                  </button>
                </div>
              </form>

              {/* Utility actions */}
              <div className="mt-6 pt-5 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
                <label className="hover:text-slate-200 cursor-pointer flex items-center gap-1.5 transition-colors">
                  <HardDriveDownload className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Restore from Backup</span>
                  <input
                    type="file"
                    accept=".vault,.json"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </label>

                <button
                  type="button"
                  id="btn-reset-vault-trigger"
                  onClick={() => setShowResetConfirm(true)}
                  className="text-slate-500 hover:text-rose-400 transition-colors"
                >
                  Forgot Password?
                </button>
              </div>

              {showResetConfirm && (
                <div className="mt-4 p-4 rounded-xl bg-rose-950/40 border border-rose-800/60 text-xs space-y-2.5">
                  <p className="text-rose-200 font-medium">
                    Because this vault uses zero-knowledge encryption with zero servers, we cannot reset your master password.
                  </p>
                  <p className="text-slate-300">
                    If you have a backup file (.vault), you can restore it anytime. Alternatively, you can purge this vault and create a fresh one.
                  </p>
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setShowResetConfirm(false)}
                      className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      id="btn-confirm-purge-vault"
                      onClick={onResetVault}
                      className="px-3 py-1.5 rounded-lg bg-rose-600 text-white hover:bg-rose-500"
                    >
                      Purge & Start Fresh
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Security & Zero Cost Architecture Guarantees */}
        <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-3 text-center text-xs text-slate-400">
          <div className="p-3 rounded-xl bg-slate-900/50 border border-slate-800/80">
            <span className="font-semibold text-slate-200 block mb-0.5">PBKDF2 + AES-256</span>
            SubtleCrypto 150,000 rounds
          </div>
          <div className="p-3 rounded-xl bg-slate-900/50 border border-slate-800/80">
            <span className="font-semibold text-slate-200 block mb-0.5">Zero Cloud Bills</span>
            100% Client-side IndexedDB
          </div>
          <div className="p-3 rounded-xl bg-slate-900/50 border border-slate-800/80">
            <span className="font-semibold text-slate-200 block mb-0.5">Zero Telemetry</span>
            Never leaves your browser
          </div>
        </div>
      </div>
    </div>
  );
};
