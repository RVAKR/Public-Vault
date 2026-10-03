/**
 * ui.ts — DOM builders and re-usable UI components
 */

import type { Credential } from './store';

// ── Toast ─────────────────────────────────────────────────────────────────

let toastContainer: HTMLElement;

export function initToast() {
  toastContainer = document.createElement('div');
  toastContainer.id = 'toast-container';
  document.body.appendChild(toastContainer);
}

export function toast(msg: string, type: 'success' | 'error' | 'info' = 'success') {
  const el = document.createElement('div');
  el.className = `toast toast-${type}`;
  el.textContent = msg;
  toastContainer.appendChild(el);
  setTimeout(() => el.remove(), 2800);
}

// ── Icons (inline SVG strings) ────────────────────────────────────────────

export const icons = {
  lock:     '🔐',
  key:      '🗝️',
  copy:     '📋',
  eye:      '👁️',
  eyeOff:   '🙈',
  add:      '＋',
  edit:     '✏️',
  delete:   '🗑️',
  search:   '🔍',
  export:   '📤',
  import:   '📥',
  logout:   '🚪',
  shield:   '🛡️',
  card:     '💳',
  note:     '📝',
  person:   '👤',
  ssh:      '💻',
  api:      '🔌',
  link:     '🔗',
  close:    '✕',
  check:    '✓',
  settings: '⚙️',
  folder:   '📁',
  gen:      '✨',
} as const;

// ── Category icon map ─────────────────────────────────────────────────────

export function categoryIcon(cat: string): string {
  const map: Record<string, string> = {
    'Login':    icons.key,
    'Card':     icons.card,
    'Note':     icons.note,
    'Identity': icons.person,
    'SSH Key':  icons.ssh,
    'API Key':  icons.api,
  };
  return map[cat] ?? icons.lock;
}

// ── Password strength ─────────────────────────────────────────────────────

export function passwordStrength(pwd: string): { level: number; label: string; cls: string } {
  let score = 0;
  if (pwd.length >= 8)  score++;
  if (pwd.length >= 12) score++;
  if (/[A-Z]/.test(pwd)) score++;
  if (/[0-9]/.test(pwd)) score++;
  if (/[^A-Za-z0-9]/.test(pwd)) score++;

  if (score <= 1) return { level: score, label: 'Weak',   cls: 'strength-weak' };
  if (score <= 2) return { level: score, label: 'Fair',   cls: 'strength-fair' };
  if (score <= 3) return { level: score, label: 'Good',   cls: 'strength-good' };
  return              { level: score, label: 'Strong', cls: 'strength-strong' };
}

// ── Password generator ────────────────────────────────────────────────────

export function generatePassword(length = 20): string {
  const alpha  = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz';
  const digits = '23456789';
  const syms   = '!@#$%^&*-_=+?';
  const all    = alpha + digits + syms;
  const arr    = crypto.getRandomValues(new Uint8Array(length));
  let out = '';
  for (const b of arr) out += all[b % all.length];
  return out;
}

// ── Copy to clipboard ─────────────────────────────────────────────────────

export async function copyText(text: string, label = 'Copied') {
  try {
    await navigator.clipboard.writeText(text);
    toast(`${label} to clipboard`, 'success');
  } catch {
    toast('Copy failed', 'error');
  }
}

// ── Modal ─────────────────────────────────────────────────────────────────

export function showModal(content: HTMLElement, onClose?: () => void): () => void {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  const modal = document.createElement('div');
  modal.className = 'modal';
  modal.appendChild(content);
  overlay.appendChild(modal);
  document.body.appendChild(overlay);

  const close = () => { overlay.remove(); onClose?.(); };
  overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
  return close;
}

// ── Credential card ───────────────────────────────────────────────────────

export function credCard(cred: Credential, onClick: () => void): HTMLElement {
  const card = document.createElement('div');
  card.className = 'cred-card';
  card.dataset.id  = cred.id;
  card.dataset.cat = cred.category;
  card.innerHTML = `
    <div class="cred-icon">${categoryIcon(cred.category)}</div>
    <div class="cred-info">
      <div class="cred-title">${esc(cred.title)}</div>
      <div class="cred-user">${esc(cred.username || cred.url || '—')}</div>
      <span class="cred-cat">${esc(cred.category)}</span>
    </div>
  `;
  card.addEventListener('click', onClick);
  return card;
}

// ── Escape HTML ───────────────────────────────────────────────────────────

export function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// ── Detail field row ──────────────────────────────────────────────────────

export function detailField(
  label: string,
  value: string,
  opts: { secret?: boolean; isUrl?: boolean; copyLabel?: string } = {}
): HTMLElement {
  const wrap = document.createElement('div');
  wrap.className = 'detail-field';

  const lbl = document.createElement('div');
  lbl.className = 'detail-label';
  lbl.textContent = label;

  const val = document.createElement('div');
  val.className = 'detail-value';

  const txt = document.createElement('span');
  txt.className = 'val-text';

  if (opts.isUrl && value) {
    const a = document.createElement('a');
    a.href = value.startsWith('http') ? value : `https://${value}`;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    a.textContent = value;
    txt.appendChild(a);
  } else if (opts.secret) {
    txt.className = 'val-text val-hidden';
    txt.textContent = '••••••••••••';
  } else {
    txt.textContent = value || '—';
  }

  // Copy button
  const copyBtn = document.createElement('button');
  copyBtn.className = 'btn-ghost btn-sm btn-icon';
  copyBtn.title = 'Copy';
  copyBtn.textContent = icons.copy;
  copyBtn.addEventListener('click', () => copyText(value, opts.copyLabel ?? label));

  val.appendChild(txt);

  // Toggle visibility for secrets
  if (opts.secret) {
    let shown = false;
    const eyeBtn = document.createElement('button');
    eyeBtn.className = 'btn-ghost btn-sm btn-icon';
    eyeBtn.title = 'Reveal';
    eyeBtn.textContent = icons.eye;
    eyeBtn.addEventListener('click', () => {
      shown = !shown;
      txt.textContent = shown ? value : '••••••••••••';
      txt.className = shown ? 'val-text mono' : 'val-text val-hidden';
      eyeBtn.textContent = shown ? icons.eyeOff : icons.eye;
    });
    val.appendChild(eyeBtn);
  }

  val.appendChild(copyBtn);
  wrap.appendChild(lbl);
  wrap.appendChild(val);
  return wrap;
}
