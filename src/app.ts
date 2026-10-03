/**
 * app.ts — Main application shell
 */

import { vault } from './store';
import type { Credential, ArchivedCredential } from './store';
import {
  icons, initToast, toast, credCard,
  detailField, showModal, copyText, esc, categoryIcon
} from './ui';
import { openCredentialForm } from './form';

// ── State ──────────────────────────────────────────────────────────────────

let activeCategory = 'All';
let activeCredId: string | null = null;
let searchQuery = '';

// ── Auth Screen ───────────────────────────────────────────────────────────

export function renderAuth(root: HTMLElement) {
  root.innerHTML = `
    <div id="auth-screen">
      <div class="auth-card">
        <div class="auth-logo">🔐</div>
        <h1 class="auth-title">Public-Vault</h1>
        <p class="auth-subtitle">Your encrypted credential store</p>

        <div class="auth-tabs">
          <button class="auth-tab ${vault.isSetup ? '' : 'active'}" id="tab-setup">New Vault</button>
          <button class="auth-tab ${vault.isSetup ? 'active' : ''}" id="tab-unlock">Unlock</button>
        </div>

        <!-- Setup panel -->
        <div id="panel-setup" class="${vault.isSetup ? 'hidden' : ''}">
          <div class="flex col gap16">
            <div class="form-group">
              <label>Master Password</label>
              <div class="input-wrap">
                <input id="setup-pwd" type="password" placeholder="Min 8 characters" autocomplete="new-password" />
                <button class="toggle-eye" id="setup-eye">${icons.eye}</button>
              </div>
              <div class="strength-bar"><div class="strength-fill" id="setup-strength"></div></div>
              <div class="small" id="setup-strength-label" style="color:var(--text3)"></div>
            </div>
            <div class="form-group">
              <label>Confirm Password</label>
              <div class="input-wrap">
                <input id="setup-confirm" type="password" placeholder="Repeat password" autocomplete="new-password" />
              </div>
            </div>
            <div id="setup-msg" class="auth-msg hidden"></div>
            <button id="setup-btn" class="btn-primary btn-full">Create Vault</button>
            <p style="font-size:.78rem;text-align:center;color:var(--text3)">
              ${icons.shield} AES-256-GCM · PBKDF2 600k iterations<br>
              Your password is <strong>never stored</strong>
            </p>
          </div>
        </div>

        <!-- Unlock panel -->
        <div id="panel-unlock" class="${vault.isSetup ? '' : 'hidden'}">
          <div class="flex col gap16">
            <div class="form-group">
              <label>Master Password</label>
              <div class="input-wrap">
                <input id="unlock-pwd" type="password" placeholder="Enter master password" autocomplete="current-password" />
                <button class="toggle-eye" id="unlock-eye">${icons.eye}</button>
              </div>
            </div>
            <div id="unlock-msg" class="auth-msg hidden"></div>
            <button id="unlock-btn" class="btn-primary btn-full">Unlock Vault</button>
            <button id="reset-btn" class="btn-ghost btn-full btn-sm" style="color:var(--text3)">
              Reset vault (delete all data)
            </button>
          </div>
        </div>
      </div>
    </div>
  `;

  bindAuthEvents(root);
}

function bindAuthEvents(root: HTMLElement) {
  const $ = <T extends HTMLElement>(id: string) => root.querySelector<T>(`#${id}`)!;

  // Tab switching
  $('tab-setup').onclick = () => {
    $('tab-setup').classList.add('active');
    $('tab-unlock').classList.remove('active');
    $<HTMLElement>('panel-setup').classList.remove('hidden');
    $<HTMLElement>('panel-unlock').classList.add('hidden');
  };
  $('tab-unlock').onclick = () => {
    $('tab-unlock').classList.add('active');
    $('tab-setup').classList.remove('active');
    $<HTMLElement>('panel-unlock').classList.remove('hidden');
    $<HTMLElement>('panel-setup').classList.add('hidden');
  };

  // Eye toggles
  bindEye($<HTMLInputElement>('setup-pwd'),   $('setup-eye'));
  bindEye($<HTMLInputElement>('unlock-pwd'),  $('unlock-eye'));

  // Password strength meter
  const strengthEl = $<HTMLInputElement>('setup-strength');
  const strengthLbl = $('setup-strength-label');
  $<HTMLInputElement>('setup-pwd').addEventListener('input', () => {
    const val = $<HTMLInputElement>('setup-pwd').value;
    if (!val) { strengthEl.className = 'strength-fill'; strengthLbl.textContent = ''; return; }
    const sc = pwdScore(val);
    strengthEl.className = `strength-fill ${sc.cls}`;
    strengthLbl.textContent = `Strength: ${sc.label}`;
  });

  // Setup
  $('setup-btn').onclick = async () => {
    const pwd = $<HTMLInputElement>('setup-pwd').value;
    const confirm = $<HTMLInputElement>('setup-confirm').value;
    const msgEl = $('setup-msg');

    if (pwd.length < 8) { showMsg(msgEl, 'Password must be at least 8 characters', 'error'); return; }
    if (pwd !== confirm) { showMsg(msgEl, 'Passwords do not match', 'error'); return; }

    const btn = $<HTMLButtonElement>('setup-btn');
    btn.disabled = true; btn.textContent = 'Creating vault…';

    try {
      await vault.setup(pwd);
      renderApp(root);
    } catch (e) {
      showMsg(msgEl, 'Failed to create vault', 'error');
      btn.disabled = false; btn.textContent = 'Create Vault';
    }
  };

  // Enter key on unlock
  $<HTMLInputElement>('unlock-pwd').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') $('unlock-btn').click();
  });

  // Unlock
  $('unlock-btn').onclick = async () => {
    const pwd = $<HTMLInputElement>('unlock-pwd').value;
    const msgEl = $('unlock-msg');
    const btn = $<HTMLButtonElement>('unlock-btn');

    if (!pwd) { showMsg(msgEl, 'Enter your master password', 'error'); return; }
    btn.disabled = true; btn.textContent = 'Unlocking…';

    const ok = await vault.unlock(pwd);
    if (ok) {
      renderApp(root);
    } else {
      showMsg(msgEl, 'Wrong password — try again', 'error');
      btn.disabled = false; btn.textContent = 'Unlock Vault';
      $<HTMLInputElement>('unlock-pwd').value = '';
      $<HTMLInputElement>('unlock-pwd').focus();
    }
  };

  // Reset
  $('reset-btn').onclick = () => {
    if (confirm('⚠️ Delete ALL vault data permanently? This cannot be undone.')) {
      localStorage.clear();
      location.reload();
    }
  };
}

// ── Vault App ─────────────────────────────────────────────────────────────

export function renderApp(root: HTMLElement) {
  root.innerHTML = `
    <div id="vault-screen">
      <!-- Top bar -->
      <div class="topbar">
        <span class="topbar-logo">🔐</span>
        <span class="topbar-title">Public-Vault</span>
        <div class="topbar-sep"></div>
        <div class="search-wrap">
          <span class="search-icon">${icons.search}</span>
          <input id="search-input" type="search" placeholder="Search credentials…" autocomplete="off" />
        </div>
        <button class="btn-secondary btn-sm" id="btn-add">${icons.add} Add</button>
        <div class="topbar-sep"></div>
        <button class="btn-ghost btn-icon" id="btn-export" title="Export vault">${icons.export}</button>
        <button class="btn-ghost btn-icon" id="btn-import" title="Import vault">${icons.import}</button>
        <button class="btn-ghost btn-icon" id="btn-settings" title="Settings">${icons.settings}</button>
        <button class="btn-ghost btn-icon" id="btn-lock" title="Lock vault">${icons.logout}</button>
      </div>

      <!-- Body -->
      <div class="vault-body">
        <!-- Sidebar -->
        <div class="sidebar" id="sidebar"></div>

        <!-- List -->
        <div class="list-pane" id="list-pane"></div>

        <!-- Detail -->
        <div class="detail-pane" id="detail-pane">
          <div class="empty-state" style="height:100%;display:flex">
            <div class="empty-icon">🔑</div>
            <p>Select a credential to view</p>
          </div>
        </div>
      </div>
    </div>
  `;

  bindAppEvents(root);
  renderSidebar(root);
  renderList(root);
  checkExpiredCredentials(root);
}

// Check for expired credentials and show notification
function checkExpiredCredentials(root: HTMLElement) {
  const archived = vault.getArchived();
  if (archived.length > 0) {
    toast(`${archived.length} expired credential${archived.length !== 1 ? 's' : ''} auto-archived`, 'info');
  }
}

function bindAppEvents(root: HTMLElement) {
  const $ = <T extends HTMLElement>(id: string) => root.querySelector<T>(`#${id}`)!;

  // Search
  $<HTMLInputElement>('search-input').addEventListener('input', (e) => {
    searchQuery = (e.target as HTMLInputElement).value;
    renderList(root);
  });

  // Add
  $('btn-add').onclick = () => {
    openCredentialForm(null, async (input) => {
      await vault.add(input);
      toast('Credential added', 'success');
      renderSidebar(root);
      renderList(root);
    });
  };

  // Lock
  $('btn-lock').onclick = () => {
    vault.lock();
    renderAuth(root);
  };

  // Export
  $('btn-export').onclick = () => showExportModal();

  // Import
  $('btn-import').onclick = () => showImportModal(root);

  // Settings
  $('btn-settings').onclick = () => showSettingsModal();
}

// ── Sidebar ───────────────────────────────────────────────────────────────

function renderSidebar(root: HTMLElement) {
  const sidebar = root.querySelector<HTMLElement>('#sidebar')!;
  const creds = vault.list();
  const categories = vault.categories();

  const allCount = creds.length;
  const cats = [
    { label: 'All Items', icon: icons.lock, count: allCount, key: 'All' },
    ...categories.map((c) => ({ label: c, icon: '📂', count: creds.filter((x) => x.category === c).length, key: c })),
  ];

  const archivedCount = vault.getArchived().length;

  sidebar.innerHTML = `
    <div class="sidebar-section">Library</div>
    ${cats.map((c) => `
      <button class="sidebar-item${activeCategory === c.key ? ' active' : ''}" data-cat="${esc(c.key)}">
        <span>${c.icon}</span>
        <span>${esc(c.label)}</span>
        <span class="sidebar-count">${c.count}</span>
      </button>
    `).join('')}
    ${archivedCount > 0 ? `
      <button class="sidebar-item${activeCategory === 'Archived' ? ' active' : ''}" data-cat="Archived">
        <span>📦</span>
        <span>Archived</span>
        <span class="sidebar-count">${archivedCount}</span>
      </button>
    ` : ''}
    <div class="sidebar-section" style="margin-top:auto">Security</div>
    <button class="sidebar-item" id="sidebar-pwd">
      <span>${icons.key}</span><span>Change Password</span>
    </button>
  `;

  sidebar.querySelectorAll<HTMLButtonElement>('.sidebar-item[data-cat]').forEach((btn) => {
    btn.onclick = () => {
      activeCategory = btn.dataset.cat!;
      activeCredId = null;
      renderSidebar(root);
      renderList(root);
      clearDetail(root);
    };
  });

  const changePwdBtn = sidebar.querySelector('#sidebar-pwd');
  if (changePwdBtn) {
    changePwdBtn.addEventListener('click', () => showChangePasswordModal());
  }
}

// ── Credential List ───────────────────────────────────────────────────────

function renderList(root: HTMLElement) {
  const pane = root.querySelector<HTMLElement>('#list-pane')!;
  
  // Show archived credentials if "Archived" category is selected
  if (activeCategory === 'Archived') {
    renderArchivedList(root);
    return;
  }
  
  let creds = vault.list(searchQuery);
  if (activeCategory !== 'All') creds = creds.filter((c) => c.category === activeCategory);

  const header = document.createElement('div');
  header.className = 'list-header';
  header.innerHTML = `
    <span class="list-title">${esc(activeCategory === 'All' ? 'All Items' : activeCategory)}</span>
    <span class="list-count">${creds.length} item${creds.length !== 1 ? 's' : ''}</span>
  `;

  pane.innerHTML = '';
  pane.appendChild(header);

  if (creds.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'empty-state';
    empty.style.flex = '1';
    empty.innerHTML = `
      <div class="empty-icon">${searchQuery ? icons.search : icons.lock}</div>
      <p>${searchQuery ? `No results for "${esc(searchQuery)}"` : 'No credentials yet.<br>Click <strong>+ Add</strong> to start.'}</p>
    `;
    pane.appendChild(empty);
    return;
  }

  creds.forEach((cred) => {
    const card = credCard(cred, () => {
      activeCredId = cred.id;
      pane.querySelectorAll('.cred-card').forEach((c) => c.classList.remove('active'));
      card.classList.add('active');
      renderDetail(root, cred);
    });
    if (cred.id === activeCredId) card.classList.add('active');
    pane.appendChild(card);
  });
}

// ── Archived List ─────────────────────────────────────────────────────────

function renderArchivedList(root: HTMLElement) {
  const pane = root.querySelector<HTMLElement>('#list-pane')!;
  const archived = vault.getArchived();

  const header = document.createElement('div');
  header.className = 'list-header';
  header.innerHTML = `
    <span class="list-title">📦 Archived (Expired)</span>
    <span class="list-count">${archived.length} item${archived.length !== 1 ? 's' : ''}</span>
  `;

  pane.innerHTML = '';
  pane.appendChild(header);

  if (archived.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'empty-state';
    empty.style.flex = '1';
    empty.innerHTML = `
      <div class="empty-icon">📦</div>
      <p>No archived credentials.<br>Credentials auto-archive when they expire.</p>
    `;
    pane.appendChild(empty);
    return;
  }

  archived.forEach((arc) => {
    const card = document.createElement('div');
    card.className = 'cred-card';
    card.dataset.id = arc.id;
    card.dataset.cat = arc.category;
    card.innerHTML = `
      <div class="cred-icon">${categoryIcon(arc.category)}</div>
      <div class="cred-info">
        <div class="cred-title">${esc(arc.title)}</div>
        <div class="cred-user">${esc(arc.username || arc.url || '—')}</div>
        <span class="cred-cat" style="background:rgba(239,68,68,.1);color:var(--red);border-color:rgba(239,68,68,.3)">
          Expired ${new Date(arc.archivedAt).toLocaleDateString()}
        </span>
      </div>
    `;
    
    card.addEventListener('click', () => {
      activeCredId = arc.id;
      pane.querySelectorAll('.cred-card').forEach((c) => c.classList.remove('active'));
      card.classList.add('active');
      renderArchivedDetail(root, arc);
    });
    
    pane.appendChild(card);
  });
}

// ── Archived Detail ───────────────────────────────────────────────────────

function renderArchivedDetail(root: HTMLElement, arc: ArchivedCredential) {
  const pane = root.querySelector<HTMLElement>('#detail-pane')!;
  pane.innerHTML = '';

  // Header
  const header = document.createElement('div');
  header.className = 'detail-header';
  header.innerHTML = `
    <span style="font-size:1.6rem">📦</span>
    <div class="grow">
      <div style="font-weight:700;font-size:1rem">${esc(arc.title)}</div>
      <div style="font-size:.75rem;color:var(--red)">Archived (Expired)</div>
    </div>
  `;

  // Fields (no secrets)
  const body = document.createElement('div');
  body.className = 'detail-body';

  const notice = document.createElement('div');
  notice.className = 'auth-msg';
  notice.style.background = 'rgba(239,68,68,.12)';
  notice.style.color = 'var(--red)';
  notice.innerHTML = `
    🔒 <strong>Secrets cleared</strong><br>
    <span style="font-size:.8rem">Password and sensitive data were removed when this credential expired.</span>
  `;
  body.appendChild(notice);

  if (arc.username) body.appendChild(detailField('Username', arc.username, { copyLabel: 'Username' }));
  if (arc.url)      body.appendChild(detailField('URL', arc.url, { isUrl: true }));
  if (arc.notes)    body.appendChild(detailField('Notes', arc.notes));

  // Timestamps
  const timestampSection = document.createElement('div');
  timestampSection.style.marginTop = '8px';
  timestampSection.style.paddingTop = '12px';
  timestampSection.style.borderTop = '1px solid var(--border)';
  body.appendChild(timestampSection);
  
  timestampSection.appendChild(detailField('Originally Created', new Date(arc.originalCreatedAt).toLocaleString()));
  timestampSection.appendChild(detailField('Expired', new Date(arc.originalExpiresAt).toLocaleString()));
  timestampSection.appendChild(detailField('Archived', new Date(arc.archivedAt).toLocaleString()));

  // Footer
  const footer = document.createElement('div');
  footer.className = 'detail-footer';

  const restoreBtn = document.createElement('button');
  restoreBtn.className = 'btn-primary grow';
  restoreBtn.innerHTML = `${icons.add} Create New (Auto-fill)`;
  restoreBtn.onclick = () => {
    openCredentialForm(null, async (input) => {
      await vault.add(input);
      toast('New credential created', 'success');
      activeCategory = 'All';
      activeCredId = null;
      renderSidebar(root);
      renderList(root);
    }, arc.title);
  };

  const deleteBtn = document.createElement('button');
  deleteBtn.className = 'btn-danger';
  deleteBtn.innerHTML = icons.delete;
  deleteBtn.title = 'Delete permanently';
  deleteBtn.onclick = async () => {
    if (!confirm(`Permanently delete archived "${arc.title}"?`)) return;
    await vault.deleteArchived(arc.id);
    toast('Deleted', 'info');
    activeCredId = null;
    renderSidebar(root);
    renderArchivedList(root);
    clearDetail(root);
  };

  footer.appendChild(restoreBtn);
  footer.appendChild(deleteBtn);

  pane.appendChild(header);
  pane.appendChild(body);
  pane.appendChild(footer);
}

// ── Detail Pane ───────────────────────────────────────────────────────────

function clearDetail(root: HTMLElement) {
  const pane = root.querySelector<HTMLElement>('#detail-pane')!;
  pane.innerHTML = `
    <div class="empty-state" style="height:100%;display:flex">
      <div class="empty-icon">🔑</div>
      <p>Select a credential to view</p>
    </div>
  `;
}

function renderDetail(root: HTMLElement, cred: Credential) {
  const pane = root.querySelector<HTMLElement>('#detail-pane')!;
  pane.innerHTML = '';

  // Header
  const header = document.createElement('div');
  header.className = 'detail-header';
  header.innerHTML = `
    <span style="font-size:1.6rem">${icons.lock}</span>
    <div class="grow">
      <div style="font-weight:700;font-size:1rem">${esc(cred.title)}</div>
      <div style="font-size:.75rem;color:var(--text3)">${esc(cred.category)}</div>
    </div>
  `;

  // Fields
  const body = document.createElement('div');
  body.className = 'detail-body';

  if (cred.username) body.appendChild(detailField('Username', cred.username, { copyLabel: 'Username' }));
  if (cred.password) body.appendChild(detailField('Password', cred.password, { secret: true, copyLabel: 'Password' }));
  if (cred.url)      body.appendChild(detailField('URL', cred.url, { isUrl: true }));
  if (cred.notes)    body.appendChild(detailField('Notes', cred.notes));

  // Timestamps section
  const timestampSection = document.createElement('div');
  timestampSection.style.marginTop = '8px';
  timestampSection.style.paddingTop = '12px';
  timestampSection.style.borderTop = '1px solid var(--border)';
  
  body.appendChild(timestampSection);
  timestampSection.appendChild(detailField('Created', new Date(cred.createdAt).toLocaleString()));
  timestampSection.appendChild(detailField('Modified', new Date(cred.updatedAt).toLocaleString()));
  
  if (cred.expiresAt) {
    const now = Date.now();
    const expired = cred.expiresAt < now;
    const expiryDiv = detailField('Expires', new Date(cred.expiresAt).toLocaleString());
    if (expired) {
      const label = expiryDiv.querySelector('.detail-value') as HTMLElement;
      label.style.color = 'var(--red)';
      label.style.borderColor = 'var(--red)';
    }
    timestampSection.appendChild(expiryDiv);
  }
  
  if (cred.lastVisitedAt) {
    timestampSection.appendChild(detailField('Last Visited', new Date(cred.lastVisitedAt).toLocaleString()));
  }

  // Footer
  const footer = document.createElement('div');
  footer.className = 'detail-footer';

  const editBtn = document.createElement('button');
  editBtn.className = 'btn-secondary grow';
  editBtn.innerHTML = `${icons.edit} Edit`;
  editBtn.onclick = () => {
    openCredentialForm(cred, async (input) => {
      await vault.update(cred.id, input);
      toast('Credential updated', 'success');
      renderSidebar(root);
      renderList(root);
      const updated = vault.getById(cred.id);
      if (updated) renderDetail(root, updated);
    });
  };

  const deleteBtn = document.createElement('button');
  deleteBtn.className = 'btn-danger';
  deleteBtn.innerHTML = icons.delete;
  deleteBtn.title = 'Delete';
  deleteBtn.onclick = async () => {
    if (!confirm(`Delete "${cred.title}"?`)) return;
    await vault.remove(cred.id);
    toast('Deleted', 'info');
    activeCredId = null;
    renderSidebar(root);
    renderList(root);
    clearDetail(root);
  };

  const archiveBtn = document.createElement('button');
  archiveBtn.className = 'btn-secondary';
  archiveBtn.innerHTML = '📦 Archive';
  archiveBtn.title = 'Archive (clear secrets, keep metadata)';
  archiveBtn.onclick = async () => {
    if (!confirm(`Archive "${cred.title}"? This will remove the password but keep other details for future reference.`)) return;
    await vault.archiveCredential(cred.id);
    toast('Archived', 'info');
    activeCredId = null;
    renderSidebar(root);
    renderList(root);
    clearDetail(root);
  };

  footer.appendChild(editBtn);
  footer.appendChild(archiveBtn);
  footer.appendChild(deleteBtn);

  pane.appendChild(header);
  pane.appendChild(body);
  pane.appendChild(footer);
}

// ── Export Modal ──────────────────────────────────────────────────────────

function showExportModal() {
  const content = document.createElement('div');
  const json = vault.exportEncrypted();

  content.innerHTML = `
    <div class="modal-header"><h2>${icons.export} Export Vault</h2></div>
    <div class="modal-body">
      <p>This is your <strong>encrypted</strong> vault data. It is safe to store publicly — including in your GitHub repo. Without the master password, it is unreadable.</p>
      <textarea style="height:160px;font-family:monospace;font-size:.75rem" readonly>${esc(json)}</textarea>
    </div>
    <div class="modal-footer">
      <button class="btn-secondary" id="close-export">Close</button>
      <button class="btn-primary" id="download-export">${icons.export} Download vault.json</button>
      <button class="btn-secondary" id="copy-export">${icons.copy} Copy</button>
    </div>
  `;

  const close = showModal(content);
  content.querySelector('#close-export')!.addEventListener('click', close);
  content.querySelector('#copy-export')!.addEventListener('click', () => copyText(json, 'Vault JSON'));
  content.querySelector('#download-export')!.addEventListener('click', () => {
    const blob = new Blob([json], { type: 'application/json' });
    const a = Object.assign(document.createElement('a'), {
      href: URL.createObjectURL(blob),
      download: 'vault.json',
    });
    a.click();
    URL.revokeObjectURL(a.href);
    toast('Downloaded vault.json', 'success');
  });
}

// ── Import Modal ──────────────────────────────────────────────────────────

function showImportModal(root: HTMLElement) {
  const content = document.createElement('div');
  content.innerHTML = `
    <div class="modal-header"><h2>${icons.import} Import Vault</h2></div>
    <div class="modal-body">
      <p>Paste the contents of a previously exported <code>vault.json</code> file. This will <strong>replace</strong> the current vault data.</p>
      <textarea id="import-json" style="height:160px;font-family:monospace;font-size:.75rem" placeholder='{"version":2,...}'></textarea>
      <div id="import-msg" class="auth-msg hidden"></div>
    </div>
    <div class="modal-footer">
      <button class="btn-secondary" id="close-import">Cancel</button>
      <button class="btn-primary" id="do-import">${icons.import} Import</button>
    </div>
  `;

  const close = showModal(content);
  content.querySelector('#close-import')!.addEventListener('click', close);
  content.querySelector('#do-import')!.addEventListener('click', () => {
    const json = (content.querySelector<HTMLTextAreaElement>('#import-json')!).value.trim();
    const msg = content.querySelector<HTMLElement>('#import-msg')!;
    try {
      vault.importEncrypted(json);
      toast('Vault imported — please unlock', 'success');
      close();
      renderAuth(root);
    } catch (e) {
      msg.textContent = 'Invalid vault file format';
      msg.className = 'auth-msg error';
    }
  });
}

// ── Settings Modal ────────────────────────────────────────────────────────

function showSettingsModal() {
  const creds = vault.list();
  const content = document.createElement('div');
  content.innerHTML = `
    <div class="modal-header"><h2>${icons.settings} Settings</h2></div>
    <div class="modal-body">
      <div style="display:flex;gap:16px;flex-wrap:wrap">
        <div style="flex:1;min-width:140px;background:var(--surface2);border:1px solid var(--border);border-radius:12px;padding:16px;text-align:center">
          <div style="font-size:2rem;font-weight:700;color:var(--accent)">${creds.length}</div>
          <div style="font-size:.8rem;color:var(--text2)">Credentials</div>
        </div>
        <div style="flex:1;min-width:140px;background:var(--surface2);border:1px solid var(--border);border-radius:12px;padding:16px;text-align:center">
          <div style="font-size:2rem;font-weight:700;color:var(--green)">${vault.categories().length}</div>
          <div style="font-size:.8rem;color:var(--text2)">Categories</div>
        </div>
      </div>
      <div style="background:var(--surface2);border:1px solid var(--border);border-radius:12px;padding:16px">
        <div style="font-weight:600;margin-bottom:8px">${icons.shield} Security Info</div>
        <ul style="list-style:none;display:flex;flex-direction:column;gap:6px;font-size:.85rem;color:var(--text2)">
          <li>✓ AES-256-GCM authenticated encryption</li>
          <li>✓ PBKDF2 key derivation (600,000 iterations)</li>
          <li>✓ Unique salt + IV per encryption operation</li>
          <li>✓ Master password never stored anywhere</li>
          <li>✓ All processing happens in your browser</li>
        </ul>
      </div>
      <button class="btn-danger btn-full" id="export-plain">⚠️ Export Plaintext (emergency backup)</button>
    </div>
    <div class="modal-footer">
      <button class="btn-secondary" id="close-settings">Close</button>
    </div>
  `;

  const close = showModal(content);
  content.querySelector('#close-settings')!.addEventListener('click', close);
  content.querySelector('#export-plain')!.addEventListener('click', () => {
    if (!confirm('This will export ALL credentials as readable JSON. Only do this for emergency backup. Continue?')) return;
    const plain = vault.exportPlaintext();
    const blob = new Blob([plain], { type: 'application/json' });
    const a = Object.assign(document.createElement('a'), {
      href: URL.createObjectURL(blob),
      download: 'vault-plaintext-SENSITIVE.json',
    });
    a.click();
    URL.revokeObjectURL(a.href);
    toast('Plaintext backup downloaded', 'info');
    close();
  });
}

// ── Change Password Modal ─────────────────────────────────────────────────

function showChangePasswordModal() {
  const content = document.createElement('div');
  content.innerHTML = `
    <div class="modal-header"><h2>${icons.key} Change Master Password</h2></div>
    <div class="modal-body">
      <div class="form-group">
        <label>Current Password</label>
        <input id="cp-old" type="password" autocomplete="current-password" />
      </div>
      <div class="form-group">
        <label>New Password</label>
        <input id="cp-new" type="password" autocomplete="new-password" />
      </div>
      <div class="form-group">
        <label>Confirm New Password</label>
        <input id="cp-confirm" type="password" autocomplete="new-password" />
      </div>
      <div id="cp-msg" class="auth-msg hidden"></div>
    </div>
    <div class="modal-footer">
      <button class="btn-secondary" id="cp-cancel">Cancel</button>
      <button class="btn-primary" id="cp-save">${icons.check} Change Password</button>
    </div>
  `;

  const close = showModal(content);
  content.querySelector('#cp-cancel')!.addEventListener('click', close);
  content.querySelector('#cp-save')!.addEventListener('click', async () => {
    const oldPwd = (content.querySelector<HTMLInputElement>('#cp-old')!).value;
    const newPwd = (content.querySelector<HTMLInputElement>('#cp-new')!).value;
    const confirm = (content.querySelector<HTMLInputElement>('#cp-confirm')!).value;
    const msg = content.querySelector<HTMLElement>('#cp-msg')!;

    if (newPwd.length < 8) { showMsg(msg, 'New password must be at least 8 characters', 'error'); return; }
    if (newPwd !== confirm) { showMsg(msg, 'Passwords do not match', 'error'); return; }

    const btn = content.querySelector<HTMLButtonElement>('#cp-save')!;
    btn.disabled = true; btn.textContent = 'Saving…';

    const ok = await vault.changeMasterPassword(oldPwd, newPwd);
    if (ok) {
      toast('Password changed successfully', 'success');
      close();
    } else {
      showMsg(msg, 'Current password is incorrect', 'error');
      btn.disabled = false; btn.textContent = 'Change Password';
    }
  });
}

// ── Helpers ───────────────────────────────────────────────────────────────

function showMsg(el: HTMLElement, msg: string, type: 'error' | 'success') {
  el.textContent = msg;
  el.className = `auth-msg ${type}`;
}

function bindEye(input: HTMLInputElement, btn: HTMLElement) {
  btn.addEventListener('click', () => {
    const shown = input.type === 'text';
    input.type = shown ? 'password' : 'text';
    btn.textContent = shown ? icons.eye : icons.eyeOff;
  });
}

function pwdScore(pwd: string) {
  let s = 0;
  if (pwd.length >= 8)  s++;
  if (pwd.length >= 12) s++;
  if (/[A-Z]/.test(pwd)) s++;
  if (/[0-9]/.test(pwd)) s++;
  if (/[^A-Za-z0-9]/.test(pwd)) s++;
  if (s <= 1) return { label: 'Weak',   cls: 'strength-weak' };
  if (s <= 2) return { label: 'Fair',   cls: 'strength-fair' };
  if (s <= 3) return { label: 'Good',   cls: 'strength-good' };
  return              { label: 'Strong', cls: 'strength-strong' };
}
