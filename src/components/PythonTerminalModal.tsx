import React, { useState, useEffect } from 'react';
import { 
  X, 
  Terminal, 
  Play, 
  Download, 
  Check, 
  Copy, 
  Cpu, 
  HardDrive, 
  ShieldCheck, 
  Sparkles,
  RefreshCw
} from 'lucide-react';

interface PythonTerminalModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCopyText: (text: string, label: string) => void;
}

export const PythonTerminalModal: React.FC<PythonTerminalModalProps> = ({
  isOpen,
  onClose,
  onCopyText,
}) => {
  const [command, setCommand] = useState('python3 vault_cli.py info');
  const [terminalOutput, setTerminalOutput] = useState<string>('');
  const [isRunning, setIsRunning] = useState(false);
  const [pyInfo, setPyInfo] = useState<{
    pythonVersion?: string;
    databaseType?: string;
    zeroCost?: boolean;
    meta?: any;
  }>({});

  useEffect(() => {
    if (isOpen) {
      fetch('/api/python/info')
        .then((res) => res.json())
        .then((data) => {
          setPyInfo(data);
          runCommand('python3 vault_cli.py info');
        })
        .catch(() => {
          setTerminalOutput('Failed to connect to Python backend server.');
        });
    }
  }, [isOpen]);

  const runCommand = async (cmdToRun: string) => {
    setIsRunning(true);
    setTerminalOutput((prev) => prev ? `${prev}\n\n$ ${cmdToRun}\nExecuting...` : `$ ${cmdToRun}\nExecuting...`);

    try {
      const res = await fetch('/api/python/exec', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command: cmdToRun }),
      });
      const data = await res.json();
      
      // Clean ANSI escape codes for clean web terminal rendering if any
      const cleanText = (data.output || data.error || '')
        .replace(/\u001b\[\d+m/g, '')
        .replace(/\u001b\[0m/g, '');

      setTerminalOutput((prev) => {
        const withoutExecuting = prev.replace('\nExecuting...', '');
        return `${withoutExecuting}\n${cleanText}`;
      });
    } catch (err: any) {
      setTerminalOutput((prev) => `${prev}\nError: ${err.message}`);
    } finally {
      setIsRunning(false);
    }
  };

  const handleExecute = (e: React.FormEvent) => {
    e.preventDefault();
    if (!command.trim() || isRunning) return;
    runCommand(command.trim());
  };

  if (!isOpen) return null;

  return (
    <div id="python-terminal-modal" className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-3xl shadow-2xl overflow-hidden my-auto max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-slate-900/95 sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-600 to-amber-500 flex items-center justify-center text-white shadow-md">
              <Terminal className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white">Python 3 Execution Engine & CLI</h3>
                <span className="text-[10px] font-mono bg-blue-950 text-blue-400 border border-blue-800 px-2 py-0.5 rounded-full font-semibold">
                  {pyInfo.pythonVersion || 'Python 3.10'}
                </span>
              </div>
              <p className="text-xs text-slate-400">Zero-cost self-contained local storage & cryptographic CLI</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <a
              id="btn-download-python-sdk"
              href="/api/v1/vault/download-sdk"
              download="vault_client.py"
              title="Download Python 3 SDK Client for multi-app integration"
              className="px-2.5 sm:px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium flex items-center gap-1.5 border border-slate-700 transition-colors"
            >
              <Download className="w-3.5 h-3.5 text-emerald-400" />
              <span className="hidden sm:inline">SDK:</span> vault_client.py
            </a>
            <a
              id="btn-download-python-cli"
              href="/api/python/download-cli"
              download="vault_cli.py"
              title="Download standalone terminal CLI"
              className="px-2.5 sm:px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium flex items-center gap-1.5 border border-slate-700 transition-colors"
            >
              <Download className="w-3.5 h-3.5 text-cyan-400" />
              <span className="hidden sm:inline">CLI:</span> vault_cli.py
            </a>
            <button
              id="btn-close-python-terminal"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Engine Specs Bar */}
        <div className="grid grid-cols-3 gap-2 p-3 bg-slate-950/60 border-b border-slate-800 text-xs">
          <div className="p-2 rounded-lg bg-slate-900/60 border border-slate-800/80 flex items-center gap-2">
            <Cpu className="w-4 h-4 text-cyan-400 shrink-0" />
            <div className="min-w-0">
              <span className="text-[10px] text-slate-400 block truncate">Python Engine</span>
              <span className="text-xs font-semibold text-slate-200 truncate block">
                {pyInfo.pythonVersion || 'Python 3'}
              </span>
            </div>
          </div>

          <div className="p-2 rounded-lg bg-slate-900/60 border border-slate-800/80 flex items-center gap-2">
            <HardDrive className="w-4 h-4 text-emerald-400 shrink-0" />
            <div className="min-w-0">
              <span className="text-[10px] text-slate-400 block truncate">Database</span>
              <span className="text-xs font-semibold text-slate-200 truncate block">
                SQLite3 Local DB
              </span>
            </div>
          </div>

          <div className="p-2 rounded-lg bg-slate-900/60 border border-slate-800/80 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-amber-400 shrink-0" />
            <div className="min-w-0">
              <span className="text-[10px] text-slate-400 block truncate">Monthly Cloud Cost</span>
              <span className="text-xs font-semibold text-emerald-400 truncate block">
                $0.00 (Zero-Cost)
              </span>
            </div>
          </div>
        </div>

        {/* Preset Quick Commands */}
        <div className="p-3 bg-slate-900 border-b border-slate-800 flex items-center gap-2 overflow-x-auto text-xs">
          <span className="text-slate-400 text-[11px] font-semibold uppercase tracking-wider shrink-0 mr-1">
            Quick Run:
          </span>
          {[
            { label: 'Environment Info', cmd: 'python3 vault_cli.py info' },
            { label: 'Generate 24-Char Pwd', cmd: 'python3 vault_cli.py gen --length 24' },
            { label: 'Generate Passphrase', cmd: 'python3 vault_cli.py gen --mode passphrase --words 4' },
            { label: 'Generate PIN', cmd: 'python3 vault_cli.py gen --mode pin --length 6' },
            { label: 'Compute TOTP Token', cmd: 'python3 vault_cli.py totp JBSWY3DPEHPK3PXP' },
            { label: 'CLI Help Manual', cmd: 'python3 vault_cli.py --help' },
          ].map((preset, idx) => (
            <button
              key={idx}
              type="button"
              disabled={isRunning}
              onClick={() => {
                setCommand(preset.cmd);
                runCommand(preset.cmd);
              }}
              className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white shrink-0 border border-slate-700/60 transition-colors disabled:opacity-50"
            >
              {preset.label}
            </button>
          ))}
        </div>

        {/* Terminal Screen */}
        <div className="p-4 bg-slate-950 flex-1 overflow-y-auto font-mono text-xs sm:text-sm text-emerald-400 leading-relaxed min-h-[260px] max-h-[380px] selection:bg-cyan-800 selection:text-white">
          <pre className="whitespace-pre-wrap">{terminalOutput || 'Initializing Python session...'}</pre>
        </div>

        {/* Command Input Form */}
        <form onSubmit={handleExecute} className="p-3 border-t border-slate-800 bg-slate-900 flex items-center gap-2">
          <span className="text-cyan-400 font-mono text-sm font-bold pl-2">$</span>
          <input
            id="input-python-command"
            type="text"
            value={command}
            onChange={(e) => setCommand(e.target.value)}
            placeholder="Type a command (e.g. python3 vault_cli.py gen --length 32)"
            className="flex-1 bg-slate-950 border border-slate-700/80 rounded-xl px-3.5 py-2 text-sm text-white font-mono focus:outline-none focus:border-cyan-500"
          />
          <button
            type="submit"
            id="btn-run-python"
            disabled={isRunning || !command.trim()}
            className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors disabled:opacity-50 cursor-pointer shadow-md"
          >
            {isRunning ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5 fill-current" />}
            <span>{isRunning ? 'Running' : 'Run'}</span>
          </button>
        </form>

        {/* Footer */}
        <div className="p-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400 bg-slate-900/90">
          <span className="text-[11px]">
            Zero-knowledge cryptographic commands executed via Python 3.10 standard library.
          </span>
          <button
            onClick={onClose}
            className="px-3.5 py-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white text-xs"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
