/**
 * form.ts — Add / Edit credential modal
 */

import type { Credential, CredentialInput } from './store';
import { vault } from './store';
import { icons, generatePassword, passwordStrength, showModal, esc } from './ui';

const CATEGORIES = ['Login', 'Card', 'Note', 'Identity', 'SSH Key', 'API Key'];

export function openCredentialForm(
  existing: Credential | null,
  onSave: (input: CredentialInput) => Promise<void>,
  prefillTitle?: string  // Auto-fill from archived credential
): void {
  const isEdit = existing !== null;
  
  // Check if we have an archived credential to auto-fill
  const archived = !isEdit && prefillTitle ? vault.findArchivedByTitle(prefillTitle) : null;

  const content = document.createElement('div');

  // Header
  const header = document.createElement('div');
  header.className = 'modal-header';
  
  let titleText = isEdit ? icons.edit + ' Edit' : icons.add + ' New Credential';
  if (archived) {
    titleText = icons.add + ' New Credential (from archived)';
  }
  header.innerHTML = `<h2>${titleText}</h2>`;
  
  const closeBtn = document.createElement('button');
  closeBtn.className = 'btn-ghost btn-icon';
  closeBtn.textContent = icons.close;
  header.appendChild(closeBtn);

  // Body
  const body = document.createElement('div');
  body.className = 'modal-body';

  // Show archived info banner if auto-filling
  if (archived) {
    const banner = document.createElement('div');
    banner.className = 'auth-msg';
    banner.style.background = 'rgba(79,138,255,.12)';
    banner.style.color = 'var(--accent)';
    banner.style.marginBottom = '16px';
    banner.innerHTML = `
      📦 <strong>Auto-filled from archived credential</strong><br>
      <span style="font-size:.8rem">Archived on ${new Date(archived.archivedAt).toLocaleDateString()}. Update with new secret.</span>
    `;
    body.appendChild(banner);
  }

  // Fields - use archived data if available
  const catField = formSelect('Category', 'category', CATEGORIES, existing?.category ?? archived?.category ?? 'Login');
  const titleField = formInput('Title / Name', 'title', 'text', existing?.title ?? archived?.title ?? '', true);
  const userField  = formInput('Username / Email', 'username', 'text', existing?.username ?? archived?.username ?? '');
  const pwdField   = formPasswordInput(existing?.password ?? '');
  const urlField   = formInput('URL / Website', 'url', 'url', existing?.url ?? archived?.url ?? '');
  const expiryField = formInput('Expires At', 'expiresAt', 'date', existing?.expiresAt ? new Date(existing.expiresAt).toISOString().split('T')[0] : '');
  const notesField = formTextarea('Notes', 'notes', existing?.notes ?? archived?.notes ?? '');

  body.appendChild(catField.el);
  body.appendChild(titleField.el);
  body.appendChild(userField.el);
  body.appendChild(pwdField.el);
  body.appendChild(urlField.el);
  body.appendChild(expiryField.el);
  body.appendChild(notesField.el);

  // Footer
  const footer = document.createElement('div');
  footer.className = 'modal-footer';

  const cancelBtn = document.createElement('button');
  cancelBtn.className = 'btn-secondary';
  cancelBtn.textContent = 'Cancel';

  const saveBtn = document.createElement('button');
  saveBtn.className = 'btn-primary';
  saveBtn.innerHTML = `${icons.check} ${isEdit ? 'Save Changes' : 'Add Credential'}`;

  footer.appendChild(cancelBtn);
  footer.appendChild(saveBtn);

  content.appendChild(header);
  content.appendChild(body);
  content.appendChild(footer);

  const close = showModal(content);

  closeBtn.onclick  = close;
  cancelBtn.onclick = close;

  saveBtn.onclick = async () => {
    const title = titleField.getValue().trim();
    if (!title) { titleField.setError('Title is required'); return; }

    saveBtn.disabled = true;
    saveBtn.textContent = 'Saving…';

    const expiryStr = expiryField.getValue().trim();
    await onSave({
      category: catField.getValue(),
      title,
      username: userField.getValue().trim(),
      password: pwdField.getValue(),
      url:      urlField.getValue().trim(),
      notes:    notesField.getValue().trim(),
      expiresAt: expiryStr ? new Date(expiryStr).getTime() : undefined,
    });

    close();
  };
}

// ── Helper builders ───────────────────────────────────────────────────────

function formInput(label: string, name: string, type: string, value: string, required = false) {
  const el = document.createElement('div');
  el.className = 'form-group';
  el.innerHTML = `
    <label>${esc(label)}${required ? ' <span style="color:var(--red)">*</span>' : ''}</label>
    <input type="${type}" name="${name}" value="${esc(value)}" autocomplete="off" />
    <span class="small" style="color:var(--red);display:none"></span>
  `;
  const input = el.querySelector('input') as HTMLInputElement;
  const errEl = el.querySelector('span') as HTMLSpanElement;

  return {
    el,
    getValue: () => input.value,
    setError: (msg: string) => {
      errEl.textContent = msg;
      errEl.style.display = 'block';
      input.style.borderColor = 'var(--red)';
      input.addEventListener('input', () => {
        errEl.style.display = 'none';
        input.style.borderColor = '';
      }, { once: true });
    },
  };
}

function formSelect(label: string, _name: string, options: string[], value: string) {
  const el = document.createElement('div');
  el.className = 'form-group';
  el.innerHTML = `
    <label>${esc(label)}</label>
    <select>
      ${options.map((o) => `<option value="${esc(o)}"${o === value ? ' selected' : ''}>${esc(o)}</option>`).join('')}
    </select>
  `;
  const select = el.querySelector('select') as HTMLSelectElement;
  return { el, getValue: () => select.value };
}

function formTextarea(label: string, _name: string, value: string) {
  const el = document.createElement('div');
  el.className = 'form-group';
  el.innerHTML = `
    <label>${esc(label)}</label>
    <textarea autocomplete="off">${esc(value)}</textarea>
  `;
  const ta = el.querySelector('textarea') as HTMLTextAreaElement;
  return { el, getValue: () => ta.value };
}

function formPasswordInput(initialValue: string) {
  const el = document.createElement('div');
  el.className = 'form-group';

  const topRow = document.createElement('div');
  topRow.className = 'flex gap8';
  topRow.style.alignItems = 'center';
  topRow.innerHTML = `<label style="margin:0;flex:1">Password</label>`;

  const genBtn = document.createElement('button');
  genBtn.type = 'button';
  genBtn.className = 'btn-ghost btn-sm';
  genBtn.innerHTML = `${icons.gen} Generate`;
  topRow.appendChild(genBtn);

  const wrap = document.createElement('div');
  wrap.className = 'input-wrap';

  const input = document.createElement('input');
  input.type = 'password';
  input.value = initialValue;
  input.autocomplete = 'new-password';

  const eyeBtn = document.createElement('button');
  eyeBtn.type = 'button';
  eyeBtn.className = 'toggle-eye';
  eyeBtn.textContent = icons.eye;

  const strengthBar = document.createElement('div');
  strengthBar.className = 'strength-bar';
  const fill = document.createElement('div');
  fill.className = 'strength-fill';
  strengthBar.appendChild(fill);

  const strengthLabel = document.createElement('div');
  strengthLabel.className = 'small';
  strengthLabel.style.color = 'var(--text3)';

  let visible = false;
  eyeBtn.onclick = () => {
    visible = !visible;
    input.type = visible ? 'text' : 'password';
    eyeBtn.textContent = visible ? icons.eyeOff : icons.eye;
  };

  function updateStrength() {
    if (!input.value) { fill.className = 'strength-fill'; fill.style.width = '0'; strengthLabel.textContent = ''; return; }
    const s = passwordStrength(input.value);
    fill.className = `strength-fill ${s.cls}`;
    strengthLabel.textContent = `Strength: ${s.label}`;
  }

  input.addEventListener('input', updateStrength);

  genBtn.onclick = () => {
    input.value = generatePassword(20);
    input.type = 'text';
    visible = true;
    eyeBtn.textContent = icons.eyeOff;
    updateStrength();
  };

  wrap.appendChild(input);
  wrap.appendChild(eyeBtn);
  el.appendChild(topRow);
  el.appendChild(wrap);
  el.appendChild(strengthBar);
  el.appendChild(strengthLabel);

  updateStrength();

  return { el, getValue: () => input.value };
}
