(function(){const e=document.createElement("link").relList;if(e&&e.supports&&e.supports("modulepreload"))return;for(const s of document.querySelectorAll('link[rel="modulepreload"]'))a(s);new MutationObserver(s=>{for(const r of s)if(r.type==="childList")for(const i of r.addedNodes)i.tagName==="LINK"&&i.rel==="modulepreload"&&a(i)}).observe(document,{childList:!0,subtree:!0});function n(s){const r={};return s.integrity&&(r.integrity=s.integrity),s.referrerPolicy&&(r.referrerPolicy=s.referrerPolicy),s.crossOrigin==="use-credentials"?r.credentials="include":s.crossOrigin==="anonymous"?r.credentials="omit":r.credentials="same-origin",r}function a(s){if(s.ep)return;s.ep=!0;const r=n(s);fetch(s.href,r)}})();let D;function ae(){D=document.createElement("div"),D.id="toast-container",document.body.appendChild(D)}function v(t,e="success"){const n=document.createElement("div");n.className=`toast toast-${e}`,n.textContent=t,D.appendChild(n),setTimeout(()=>n.remove(),2800)}const o={lock:"🔐",key:"🗝️",copy:"📋",eye:"👁️",eyeOff:"🙈",add:"＋",edit:"✏️",delete:"🗑️",search:"🔍",export:"📤",import:"📥",logout:"🚪",shield:"🛡️",card:"💳",note:"📝",person:"👤",ssh:"💻",api:"🔌",close:"✕",check:"✓",settings:"⚙️",gen:"✨"};function Q(t){return{Login:o.key,Card:o.card,Note:o.note,Identity:o.person,"SSH Key":o.ssh,"API Key":o.api}[t]??o.lock}function re(t){let e=0;return t.length>=8&&e++,t.length>=12&&e++,/[A-Z]/.test(t)&&e++,/[0-9]/.test(t)&&e++,/[^A-Za-z0-9]/.test(t)&&e++,e<=1?{level:e,label:"Weak",cls:"strength-weak"}:e<=2?{level:e,label:"Fair",cls:"strength-fair"}:e<=3?{level:e,label:"Good",cls:"strength-good"}:{level:e,label:"Strong",cls:"strength-strong"}}function ie(t=20){const s="ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz"+"23456789"+"!@#$%^&*-_=+?",r=crypto.getRandomValues(new Uint8Array(t));let i="";for(const c of r)i+=s[c%s.length];return i}async function X(t,e="Copied"){try{await navigator.clipboard.writeText(t),v(`${e} to clipboard`,"success")}catch{v("Copy failed","error")}}function $(t,e){const n=document.createElement("div");n.className="modal-overlay";const a=document.createElement("div");a.className="modal",a.appendChild(t),n.appendChild(a),document.body.appendChild(n);const s=()=>{n.remove()};return n.addEventListener("click",r=>{r.target===n&&s()}),s}function oe(t,e){const n=document.createElement("div");return n.className="cred-card",n.dataset.id=t.id,n.dataset.cat=t.category,n.innerHTML=`
    <div class="cred-icon">${Q(t.category)}</div>
    <div class="cred-info">
      <div class="cred-title">${u(t.title)}</div>
      <div class="cred-user">${u(t.username||t.url||"—")}</div>
      <span class="cred-cat">${u(t.category)}</span>
    </div>
  `,n.addEventListener("click",e),n}function u(t){return t.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;")}function m(t,e,n={}){const a=document.createElement("div");a.className="detail-field";const s=document.createElement("div");s.className="detail-label",s.textContent=t;const r=document.createElement("div");r.className="detail-value";const i=document.createElement("span");if(i.className="val-text",n.isUrl&&e){const l=document.createElement("a");l.href=e.startsWith("http")?e:`https://${e}`,l.target="_blank",l.rel="noopener noreferrer",l.textContent=e,i.appendChild(l)}else n.secret?(i.className="val-text val-hidden",i.textContent="••••••••••••"):i.textContent=e||"—";const c=document.createElement("button");if(c.className="btn-ghost btn-sm btn-icon",c.title="Copy",c.textContent=o.copy,c.addEventListener("click",()=>X(e,n.copyLabel??t)),r.appendChild(i),n.secret){let l=!1;const d=document.createElement("button");d.className="btn-ghost btn-sm btn-icon",d.title="Reveal",d.textContent=o.eye,d.addEventListener("click",()=>{l=!l,i.textContent=l?e:"••••••••••••",i.className=l?"val-text mono":"val-text val-hidden",d.textContent=l?o.eyeOff:o.eye}),r.appendChild(d)}return r.appendChild(c),a.appendChild(s),a.appendChild(r),a}const le=6e5,C=16,N=12;function ce(t){return btoa(String.fromCharCode(...new Uint8Array(t)))}function de(t){return Uint8Array.from(atob(t),e=>e.charCodeAt(0))}async function ee(t,e){const n=await crypto.subtle.importKey("raw",new TextEncoder().encode(t),"PBKDF2",!1,["deriveKey"]);return crypto.subtle.deriveKey({name:"PBKDF2",salt:e,iterations:le,hash:"SHA-256"},n,{name:"AES-GCM",length:256},!1,["encrypt","decrypt"])}async function A(t,e){const n=crypto.getRandomValues(new Uint8Array(C)),a=crypto.getRandomValues(new Uint8Array(N)),s=await ee(e,n),r=await crypto.subtle.encrypt({name:"AES-GCM",iv:a},s,new TextEncoder().encode(t)),i=new Uint8Array(C+N+r.byteLength);return i.set(n,0),i.set(a,C),i.set(new Uint8Array(r),C+N),ce(i.buffer)}async function B(t,e){const n=de(t),a=n.slice(0,C),s=n.slice(C,C+N),r=n.slice(C+N),i=await ee(e,a),c=await crypto.subtle.decrypt({name:"AES-GCM",iv:s},i,r);return new TextDecoder().decode(c)}async function J(t){return A("__vault_ok__",t)}async function G(t,e){try{return await B(e,t)==="__vault_ok__"}catch{return!1}}const te="public_vault";function U(){return Date.now().toString(36)+Math.random().toString(36).slice(2,7)}function P(){try{const t=localStorage.getItem(te);return t?JSON.parse(t):null}catch{return null}}function V(t){localStorage.setItem(te,JSON.stringify(t))}class pe{constructor(){this._pass="",this._creds=[],this._archived=[],this._header=null,this._unlocked=!1}get isUnlocked(){return this._unlocked}get isSetup(){return P()!==null}get count(){return this._creds.length}async setup(e){const n=await J(e),a=await A(JSON.stringify([]),e),s=await A(JSON.stringify([]),e);this._header={version:2,passwordHash:n,data:a,archive:s,updatedAt:Date.now()},V(this._header),this._pass=e,this._creds=[],this._archived=[],this._unlocked=!0}async unlock(e){if(this._header=P(),!this._header||!await G(e,this._header.passwordHash))return!1;try{return this._creds=JSON.parse(await B(this._header.data,e)),this._header.archive?this._archived=JSON.parse(await B(this._header.archive,e)):this._archived=[],await this._autoArchiveExpired(),this._pass=e,this._unlocked=!0,!0}catch{return!1}}lock(){this._pass="",this._creds=[],this._archived=[],this._unlocked=!1}list(e=""){if(!e)return[...this._creds];const n=e.toLowerCase();return this._creds.filter(a=>a.title.toLowerCase().includes(n)||a.username.toLowerCase().includes(n)||a.category.toLowerCase().includes(n)||a.url.toLowerCase().includes(n))}getById(e){const n=this._creds.find(a=>a.id===e);return n&&(n.lastVisitedAt=Date.now(),this._persist()),n}async add(e){const n=Date.now(),a={...e,id:U(),createdAt:n,updatedAt:n};return this._creds.push(a),await this._persist(),a}async update(e,n){const a=this._creds.findIndex(s=>s.id===e);return a===-1?null:(this._creds[a]={...this._creds[a],...n,updatedAt:Date.now()},await this._persist(),this._creds[a])}async remove(e){const n=this._creds.findIndex(a=>a.id===e);return n===-1?!1:(this._creds.splice(n,1),await this._persist(),!0)}categories(){return[...new Set(this._creds.map(e=>e.category).filter(Boolean))].sort()}getArchived(){return[...this._archived]}findArchivedByTitle(e){return this._archived.find(n=>n.title.toLowerCase()===e.toLowerCase())}async archiveCredential(e){const n=this._creds.findIndex(r=>r.id===e);if(n===-1)return!1;const a=this._creds[n],s={id:U(),category:a.category,title:a.title,username:a.username,url:a.url,notes:a.notes,archivedAt:Date.now(),originalCreatedAt:a.createdAt,originalExpiresAt:a.expiresAt||0};return this._archived.push(s),this._creds.splice(n,1),await this._persist(),!0}async deleteArchived(e){const n=this._archived.findIndex(a=>a.id===e);return n===-1?!1:(this._archived.splice(n,1),await this._persist(),!0)}async _autoArchiveExpired(){const e=Date.now(),n=this._creds.filter(a=>a.expiresAt&&a.expiresAt<e);if(n.length!==0){for(const a of n){const s={id:U(),category:a.category,title:a.title,username:a.username,url:a.url,notes:a.notes,archivedAt:e,originalCreatedAt:a.createdAt,originalExpiresAt:a.expiresAt||0};this._archived.push(s)}this._creds=this._creds.filter(a=>!a.expiresAt||a.expiresAt>=e),await this._persist()}}exportEncrypted(){const e=P();if(!e)throw new Error("No vault data");return JSON.stringify(e,null,2)}importEncrypted(e){const n=JSON.parse(e);if(n.version!==2||!n.passwordHash||!n.data)throw new Error("Invalid vault file");V(n),this.lock()}exportPlaintext(){if(!this._unlocked)throw new Error("Vault is locked");return JSON.stringify(this._creds,null,2)}async changeMasterPassword(e,n){return this._header=P(),!this._header||!await G(e,this._header.passwordHash)?!1:(this._pass=n,this._header.passwordHash=await J(n),await this._persist(),!0)}async _persist(){!this._header||!this._pass||(this._header.data=await A(JSON.stringify(this._creds),this._pass),this._header.archive=await A(JSON.stringify(this._archived),this._pass),this._header.updatedAt=Date.now(),V(this._header))}}const p=new pe,ue=["Login","Card","Note","Identity","SSH Key","API Key"];function R(t,e,n){const a=t!==null,s=!a&&n?p.findArchivedByTitle(n):null,r=document.createElement("div"),i=document.createElement("div");i.className="modal-header";let c=a?o.edit+" Edit":o.add+" New Credential";s&&(c=o.add+" New Credential (from archived)"),i.innerHTML=`<h2>${c}</h2>`;const l=document.createElement("button");l.className="btn-ghost btn-icon",l.textContent=o.close,i.appendChild(l);const d=document.createElement("div");if(d.className="modal-body",s){const f=document.createElement("div");f.className="auth-msg",f.style.background="rgba(79,138,255,.12)",f.style.color="var(--accent)",f.style.marginBottom="16px",f.innerHTML=`
      📦 <strong>Auto-filled from archived credential</strong><br>
      <span style="font-size:.8rem">Archived on ${new Date(s.archivedAt).toLocaleDateString()}. Update with new secret.</span>
    `,d.appendChild(f)}const h=he("Category","category",ue,(t==null?void 0:t.category)??(s==null?void 0:s.category)??"Login"),y=H("Title / Name","title","text",(t==null?void 0:t.title)??(s==null?void 0:s.title)??"",!0),g=H("Username / Email","username","text",(t==null?void 0:t.username)??(s==null?void 0:s.username)??""),S=ve((t==null?void 0:t.password)??""),j=H("URL / Website","url","url",(t==null?void 0:t.url)??(s==null?void 0:s.url)??""),z=H("Expires At","expiresAt","date",t!=null&&t.expiresAt?new Date(t.expiresAt).toISOString().split("T")[0]:""),F=me("Notes","notes",(t==null?void 0:t.notes)??(s==null?void 0:s.notes)??"");d.appendChild(h.el),d.appendChild(y.el),d.appendChild(g.el),d.appendChild(S.el),d.appendChild(j.el),d.appendChild(z.el),d.appendChild(F.el);const T=document.createElement("div");T.className="modal-footer";const M=document.createElement("button");M.className="btn-secondary",M.textContent="Cancel";const L=document.createElement("button");L.className="btn-primary",L.innerHTML=`${o.check} ${a?"Save Changes":"Add Credential"}`,T.appendChild(M),T.appendChild(L),r.appendChild(i),r.appendChild(d),r.appendChild(T);const O=$(r);l.onclick=O,M.onclick=O,L.onclick=async()=>{const f=y.getValue().trim();if(!f){y.setError("Title is required");return}L.disabled=!0,L.textContent="Saving…";const K=z.getValue().trim();await e({category:h.getValue(),title:f,username:g.getValue().trim(),password:S.getValue(),url:j.getValue().trim(),notes:F.getValue().trim(),expiresAt:K?new Date(K).getTime():void 0}),O()}}function H(t,e,n,a,s=!1){const r=document.createElement("div");r.className="form-group",r.innerHTML=`
    <label>${u(t)}${s?' <span style="color:var(--red)">*</span>':""}</label>
    <input type="${n}" name="${e}" value="${u(a)}" autocomplete="off" />
    <span class="small" style="color:var(--red);display:none"></span>
  `;const i=r.querySelector("input"),c=r.querySelector("span");return{el:r,getValue:()=>i.value,setError:l=>{c.textContent=l,c.style.display="block",i.style.borderColor="var(--red)",i.addEventListener("input",()=>{c.style.display="none",i.style.borderColor=""},{once:!0})}}}function he(t,e,n,a){const s=document.createElement("div");s.className="form-group",s.innerHTML=`
    <label>${u(t)}</label>
    <select>
      ${n.map(i=>`<option value="${u(i)}"${i===a?" selected":""}>${u(i)}</option>`).join("")}
    </select>
  `;const r=s.querySelector("select");return{el:s,getValue:()=>r.value}}function me(t,e,n){const a=document.createElement("div");a.className="form-group",a.innerHTML=`
    <label>${u(t)}</label>
    <textarea autocomplete="off">${u(n)}</textarea>
  `;const s=a.querySelector("textarea");return{el:a,getValue:()=>s.value}}function ve(t){const e=document.createElement("div");e.className="form-group";const n=document.createElement("div");n.className="flex gap8",n.style.alignItems="center",n.innerHTML='<label style="margin:0;flex:1">Password</label>';const a=document.createElement("button");a.type="button",a.className="btn-ghost btn-sm",a.innerHTML=`${o.gen} Generate`,n.appendChild(a);const s=document.createElement("div");s.className="input-wrap";const r=document.createElement("input");r.type="password",r.value=t,r.autocomplete="new-password";const i=document.createElement("button");i.type="button",i.className="toggle-eye",i.textContent=o.eye;const c=document.createElement("div");c.className="strength-bar";const l=document.createElement("div");l.className="strength-fill",c.appendChild(l);const d=document.createElement("div");d.className="small",d.style.color="var(--text3)";let h=!1;i.onclick=()=>{h=!h,r.type=h?"text":"password",i.textContent=h?o.eyeOff:o.eye};function y(){if(!r.value){l.className="strength-fill",l.style.width="0",d.textContent="";return}const g=re(r.value);l.className=`strength-fill ${g.cls}`,d.textContent=`Strength: ${g.label}`}return r.addEventListener("input",y),a.onclick=()=>{r.value=ie(20),r.type="text",h=!0,i.textContent=o.eyeOff,y()},s.appendChild(r),s.appendChild(i),e.appendChild(n),e.appendChild(s),e.appendChild(c),e.appendChild(d),y(),{el:e,getValue:()=>r.value}}let b="All",k=null,_="";function q(t){t.innerHTML=`
    <div id="auth-screen">
      <div class="auth-card">
        <div class="auth-logo">🔐</div>
        <h1 class="auth-title">Public-Vault</h1>
        <p class="auth-subtitle">Your encrypted credential store</p>

        <div class="auth-tabs">
          <button class="auth-tab ${p.isSetup?"":"active"}" id="tab-setup">New Vault</button>
          <button class="auth-tab ${p.isSetup?"active":""}" id="tab-unlock">Unlock</button>
        </div>

        <!-- Setup panel -->
        <div id="panel-setup" class="${p.isSetup?"hidden":""}">
          <div class="flex col gap16">
            <div class="form-group">
              <label>Master Password</label>
              <div class="input-wrap">
                <input id="setup-pwd" type="password" placeholder="Min 8 characters" autocomplete="new-password" />
                <button class="toggle-eye" id="setup-eye">${o.eye}</button>
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
              ${o.shield} AES-256-GCM · PBKDF2 600k iterations<br>
              Your password is <strong>never stored</strong>
            </p>
          </div>
        </div>

        <!-- Unlock panel -->
        <div id="panel-unlock" class="${p.isSetup?"":"hidden"}">
          <div class="flex col gap16">
            <div class="form-group">
              <label>Master Password</label>
              <div class="input-wrap">
                <input id="unlock-pwd" type="password" placeholder="Enter master password" autocomplete="current-password" />
                <button class="toggle-eye" id="unlock-eye">${o.eye}</button>
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
  `,ye(t)}function ye(t){const e=s=>t.querySelector(`#${s}`);e("tab-setup").onclick=()=>{e("tab-setup").classList.add("active"),e("tab-unlock").classList.remove("active"),e("panel-setup").classList.remove("hidden"),e("panel-unlock").classList.add("hidden")},e("tab-unlock").onclick=()=>{e("tab-unlock").classList.add("active"),e("tab-setup").classList.remove("active"),e("panel-unlock").classList.remove("hidden"),e("panel-setup").classList.add("hidden")},Z(e("setup-pwd"),e("setup-eye")),Z(e("unlock-pwd"),e("unlock-eye"));const n=e("setup-strength"),a=e("setup-strength-label");e("setup-pwd").addEventListener("input",()=>{const s=e("setup-pwd").value;if(!s){n.className="strength-fill",a.textContent="";return}const r=ke(s);n.className=`strength-fill ${r.cls}`,a.textContent=`Strength: ${r.label}`}),e("setup-btn").onclick=async()=>{const s=e("setup-pwd").value,r=e("setup-confirm").value,i=e("setup-msg");if(s.length<8){w(i,"Password must be at least 8 characters","error");return}if(s!==r){w(i,"Passwords do not match","error");return}const c=e("setup-btn");c.disabled=!0,c.textContent="Creating vault…";try{await p.setup(s),W(t)}catch{w(i,"Failed to create vault","error"),c.disabled=!1,c.textContent="Create Vault"}},e("unlock-pwd").addEventListener("keydown",s=>{s.key==="Enter"&&e("unlock-btn").click()}),e("unlock-btn").onclick=async()=>{const s=e("unlock-pwd").value,r=e("unlock-msg"),i=e("unlock-btn");if(!s){w(r,"Enter your master password","error");return}i.disabled=!0,i.textContent="Unlocking…",await p.unlock(s)?W(t):(w(r,"Wrong password — try again","error"),i.disabled=!1,i.textContent="Unlock Vault",e("unlock-pwd").value="",e("unlock-pwd").focus())},e("reset-btn").onclick=()=>{confirm("⚠️ Delete ALL vault data permanently? This cannot be undone.")&&(localStorage.clear(),location.reload())}}function W(t){t.innerHTML=`
    <div id="vault-screen">
      <!-- Top bar -->
      <div class="topbar">
        <span class="topbar-logo">🔐</span>
        <span class="topbar-title">Public-Vault</span>
        <div class="topbar-sep"></div>
        <div class="search-wrap">
          <span class="search-icon">${o.search}</span>
          <input id="search-input" type="search" placeholder="Search credentials…" autocomplete="off" />
        </div>
        <button class="btn-secondary btn-sm" id="btn-add">${o.add} Add</button>
        <div class="topbar-sep"></div>
        <button class="btn-ghost btn-icon" id="btn-export" title="Export vault">${o.export}</button>
        <button class="btn-ghost btn-icon" id="btn-import" title="Import vault">${o.import}</button>
        <button class="btn-ghost btn-icon" id="btn-settings" title="Settings">${o.settings}</button>
        <button class="btn-ghost btn-icon" id="btn-lock" title="Lock vault">${o.logout}</button>
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
  `,be(t),E(t),x(t),fe()}function fe(t){const e=p.getArchived();e.length>0&&v(`${e.length} expired credential${e.length!==1?"s":""} auto-archived`,"info")}function be(t){const e=n=>t.querySelector(`#${n}`);e("search-input").addEventListener("input",n=>{_=n.target.value,x(t)}),e("btn-add").onclick=()=>{R(null,async n=>{await p.add(n),v("Credential added","success"),E(t),x(t)})},e("btn-lock").onclick=()=>{p.lock(),q(t)},e("btn-export").onclick=()=>we(),e("btn-import").onclick=()=>Ce(t),e("btn-settings").onclick=()=>Ee()}function E(t){const e=t.querySelector("#sidebar"),n=p.list(),a=p.categories(),s=n.length,r=[{label:"All Items",icon:o.lock,count:s,key:"All"},...a.map(l=>({label:l,icon:"📂",count:n.filter(d=>d.category===l).length,key:l}))],i=p.getArchived().length;e.innerHTML=`
    <div class="sidebar-section">Library</div>
    ${r.map(l=>`
      <button class="sidebar-item${b===l.key?" active":""}" data-cat="${u(l.key)}">
        <span>${l.icon}</span>
        <span>${u(l.label)}</span>
        <span class="sidebar-count">${l.count}</span>
      </button>
    `).join("")}
    ${i>0?`
      <button class="sidebar-item${b==="Archived"?" active":""}" data-cat="Archived">
        <span>📦</span>
        <span>Archived</span>
        <span class="sidebar-count">${i}</span>
      </button>
    `:""}
    <div class="sidebar-section" style="margin-top:auto">Security</div>
    <button class="sidebar-item" id="sidebar-pwd">
      <span>${o.key}</span><span>Change Password</span>
    </button>
  `,e.querySelectorAll(".sidebar-item[data-cat]").forEach(l=>{l.onclick=()=>{b=l.dataset.cat,k=null,E(t),x(t),I(t)}});const c=e.querySelector("#sidebar-pwd");c&&c.addEventListener("click",()=>xe())}function x(t){const e=t.querySelector("#list-pane");if(b==="Archived"){ne(t);return}let n=p.list(_);b!=="All"&&(n=n.filter(s=>s.category===b));const a=document.createElement("div");if(a.className="list-header",a.innerHTML=`
    <span class="list-title">${u(b==="All"?"All Items":b)}</span>
    <span class="list-count">${n.length} item${n.length!==1?"s":""}</span>
  `,e.innerHTML="",e.appendChild(a),n.length===0){const s=document.createElement("div");s.className="empty-state",s.style.flex="1",s.innerHTML=`
      <div class="empty-icon">${_?o.search:o.lock}</div>
      <p>${_?`No results for "${u(_)}"`:"No credentials yet.<br>Click <strong>+ Add</strong> to start."}</p>
    `,e.appendChild(s);return}n.forEach(s=>{const r=oe(s,()=>{k=s.id,e.querySelectorAll(".cred-card").forEach(i=>i.classList.remove("active")),r.classList.add("active"),se(t,s)});s.id===k&&r.classList.add("active"),e.appendChild(r)})}function ne(t){const e=t.querySelector("#list-pane"),n=p.getArchived(),a=document.createElement("div");if(a.className="list-header",a.innerHTML=`
    <span class="list-title">📦 Archived (Expired)</span>
    <span class="list-count">${n.length} item${n.length!==1?"s":""}</span>
  `,e.innerHTML="",e.appendChild(a),n.length===0){const s=document.createElement("div");s.className="empty-state",s.style.flex="1",s.innerHTML=`
      <div class="empty-icon">📦</div>
      <p>No archived credentials.<br>Credentials auto-archive when they expire.</p>
    `,e.appendChild(s);return}n.forEach(s=>{const r=document.createElement("div");r.className="cred-card",r.dataset.id=s.id,r.dataset.cat=s.category,r.innerHTML=`
      <div class="cred-icon">${Q(s.category)}</div>
      <div class="cred-info">
        <div class="cred-title">${u(s.title)}</div>
        <div class="cred-user">${u(s.username||s.url||"—")}</div>
        <span class="cred-cat" style="background:rgba(239,68,68,.1);color:var(--red);border-color:rgba(239,68,68,.3)">
          Expired ${new Date(s.archivedAt).toLocaleDateString()}
        </span>
      </div>
    `,r.addEventListener("click",()=>{k=s.id,e.querySelectorAll(".cred-card").forEach(i=>i.classList.remove("active")),r.classList.add("active"),ge(t,s)}),e.appendChild(r)})}function ge(t,e){const n=t.querySelector("#detail-pane");n.innerHTML="";const a=document.createElement("div");a.className="detail-header",a.innerHTML=`
    <span style="font-size:1.6rem">📦</span>
    <div class="grow">
      <div style="font-weight:700;font-size:1rem">${u(e.title)}</div>
      <div style="font-size:.75rem;color:var(--red)">Archived (Expired)</div>
    </div>
  `;const s=document.createElement("div");s.className="detail-body";const r=document.createElement("div");r.className="auth-msg",r.style.background="rgba(239,68,68,.12)",r.style.color="var(--red)",r.innerHTML=`
    🔒 <strong>Secrets cleared</strong><br>
    <span style="font-size:.8rem">Password and sensitive data were removed when this credential expired.</span>
  `,s.appendChild(r),e.username&&s.appendChild(m("Username",e.username,{copyLabel:"Username"})),e.url&&s.appendChild(m("URL",e.url,{isUrl:!0})),e.notes&&s.appendChild(m("Notes",e.notes));const i=document.createElement("div");i.style.marginTop="8px",i.style.paddingTop="12px",i.style.borderTop="1px solid var(--border)",s.appendChild(i),i.appendChild(m("Originally Created",new Date(e.originalCreatedAt).toLocaleString())),i.appendChild(m("Expired",new Date(e.originalExpiresAt).toLocaleString())),i.appendChild(m("Archived",new Date(e.archivedAt).toLocaleString()));const c=document.createElement("div");c.className="detail-footer";const l=document.createElement("button");l.className="btn-primary grow",l.innerHTML=`${o.add} Create New (Auto-fill)`,l.onclick=()=>{R(null,async h=>{await p.add(h),v("New credential created","success"),b="All",k=null,E(t),x(t)},e.title)};const d=document.createElement("button");d.className="btn-danger",d.innerHTML=o.delete,d.title="Delete permanently",d.onclick=async()=>{confirm(`Permanently delete archived "${e.title}"?`)&&(await p.deleteArchived(e.id),v("Deleted","info"),k=null,E(t),ne(t),I(t))},c.appendChild(l),c.appendChild(d),n.appendChild(a),n.appendChild(s),n.appendChild(c)}function I(t){const e=t.querySelector("#detail-pane");e.innerHTML=`
    <div class="empty-state" style="height:100%;display:flex">
      <div class="empty-icon">🔑</div>
      <p>Select a credential to view</p>
    </div>
  `}function se(t,e){const n=t.querySelector("#detail-pane");n.innerHTML="";const a=document.createElement("div");a.className="detail-header",a.innerHTML=`
    <span style="font-size:1.6rem">${o.lock}</span>
    <div class="grow">
      <div style="font-weight:700;font-size:1rem">${u(e.title)}</div>
      <div style="font-size:.75rem;color:var(--text3)">${u(e.category)}</div>
    </div>
  `;const s=document.createElement("div");s.className="detail-body",e.username&&s.appendChild(m("Username",e.username,{copyLabel:"Username"})),e.password&&s.appendChild(m("Password",e.password,{secret:!0,copyLabel:"Password"})),e.url&&s.appendChild(m("URL",e.url,{isUrl:!0})),e.notes&&s.appendChild(m("Notes",e.notes));const r=document.createElement("div");if(r.style.marginTop="8px",r.style.paddingTop="12px",r.style.borderTop="1px solid var(--border)",s.appendChild(r),r.appendChild(m("Created",new Date(e.createdAt).toLocaleString())),r.appendChild(m("Modified",new Date(e.updatedAt).toLocaleString())),e.expiresAt){const h=Date.now(),y=e.expiresAt<h,g=m("Expires",new Date(e.expiresAt).toLocaleString());if(y){const S=g.querySelector(".detail-value");S.style.color="var(--red)",S.style.borderColor="var(--red)"}r.appendChild(g)}e.lastVisitedAt&&r.appendChild(m("Last Visited",new Date(e.lastVisitedAt).toLocaleString()));const i=document.createElement("div");i.className="detail-footer";const c=document.createElement("button");c.className="btn-secondary grow",c.innerHTML=`${o.edit} Edit`,c.onclick=()=>{R(e,async h=>{await p.update(e.id,h),v("Credential updated","success"),E(t),x(t);const y=p.getById(e.id);y&&se(t,y)})};const l=document.createElement("button");l.className="btn-danger",l.innerHTML=o.delete,l.title="Delete",l.onclick=async()=>{confirm(`Delete "${e.title}"?`)&&(await p.remove(e.id),v("Deleted","info"),k=null,E(t),x(t),I(t))};const d=document.createElement("button");d.className="btn-secondary",d.innerHTML="📦 Archive",d.title="Archive (clear secrets, keep metadata)",d.onclick=async()=>{confirm(`Archive "${e.title}"? This will remove the password but keep other details for future reference.`)&&(await p.archiveCredential(e.id),v("Archived","info"),k=null,E(t),x(t),I(t))},i.appendChild(c),i.appendChild(d),i.appendChild(l),n.appendChild(a),n.appendChild(s),n.appendChild(i)}function we(){const t=document.createElement("div"),e=p.exportEncrypted();t.innerHTML=`
    <div class="modal-header"><h2>${o.export} Export Vault</h2></div>
    <div class="modal-body">
      <p>This is your <strong>encrypted</strong> vault data. It is safe to store publicly — including in your GitHub repo. Without the master password, it is unreadable.</p>
      <textarea style="height:160px;font-family:monospace;font-size:.75rem" readonly>${u(e)}</textarea>
    </div>
    <div class="modal-footer">
      <button class="btn-secondary" id="close-export">Close</button>
      <button class="btn-primary" id="download-export">${o.export} Download vault.json</button>
      <button class="btn-secondary" id="copy-export">${o.copy} Copy</button>
    </div>
  `;const n=$(t);t.querySelector("#close-export").addEventListener("click",n),t.querySelector("#copy-export").addEventListener("click",()=>X(e,"Vault JSON")),t.querySelector("#download-export").addEventListener("click",()=>{const a=new Blob([e],{type:"application/json"}),s=Object.assign(document.createElement("a"),{href:URL.createObjectURL(a),download:"vault.json"});s.click(),URL.revokeObjectURL(s.href),v("Downloaded vault.json","success")})}function Ce(t){const e=document.createElement("div");e.innerHTML=`
    <div class="modal-header"><h2>${o.import} Import Vault</h2></div>
    <div class="modal-body">
      <p>Paste the contents of a previously exported <code>vault.json</code> file. This will <strong>replace</strong> the current vault data.</p>
      <textarea id="import-json" style="height:160px;font-family:monospace;font-size:.75rem" placeholder='{"version":2,...}'></textarea>
      <div id="import-msg" class="auth-msg hidden"></div>
    </div>
    <div class="modal-footer">
      <button class="btn-secondary" id="close-import">Cancel</button>
      <button class="btn-primary" id="do-import">${o.import} Import</button>
    </div>
  `;const n=$(e);e.querySelector("#close-import").addEventListener("click",n),e.querySelector("#do-import").addEventListener("click",()=>{const a=e.querySelector("#import-json").value.trim(),s=e.querySelector("#import-msg");try{p.importEncrypted(a),v("Vault imported — please unlock","success"),n(),q(t)}catch{s.textContent="Invalid vault file format",s.className="auth-msg error"}})}function Ee(){const t=p.list(),e=document.createElement("div");e.innerHTML=`
    <div class="modal-header"><h2>${o.settings} Settings</h2></div>
    <div class="modal-body">
      <div style="display:flex;gap:16px;flex-wrap:wrap">
        <div style="flex:1;min-width:140px;background:var(--surface2);border:1px solid var(--border);border-radius:12px;padding:16px;text-align:center">
          <div style="font-size:2rem;font-weight:700;color:var(--accent)">${t.length}</div>
          <div style="font-size:.8rem;color:var(--text2)">Credentials</div>
        </div>
        <div style="flex:1;min-width:140px;background:var(--surface2);border:1px solid var(--border);border-radius:12px;padding:16px;text-align:center">
          <div style="font-size:2rem;font-weight:700;color:var(--green)">${p.categories().length}</div>
          <div style="font-size:.8rem;color:var(--text2)">Categories</div>
        </div>
      </div>
      <div style="background:var(--surface2);border:1px solid var(--border);border-radius:12px;padding:16px">
        <div style="font-weight:600;margin-bottom:8px">${o.shield} Security Info</div>
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
  `;const n=$(e);e.querySelector("#close-settings").addEventListener("click",n),e.querySelector("#export-plain").addEventListener("click",()=>{if(!confirm("This will export ALL credentials as readable JSON. Only do this for emergency backup. Continue?"))return;const a=p.exportPlaintext(),s=new Blob([a],{type:"application/json"}),r=Object.assign(document.createElement("a"),{href:URL.createObjectURL(s),download:"vault-plaintext-SENSITIVE.json"});r.click(),URL.revokeObjectURL(r.href),v("Plaintext backup downloaded","info"),n()})}function xe(){const t=document.createElement("div");t.innerHTML=`
    <div class="modal-header"><h2>${o.key} Change Master Password</h2></div>
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
      <button class="btn-primary" id="cp-save">${o.check} Change Password</button>
    </div>
  `;const e=$(t);t.querySelector("#cp-cancel").addEventListener("click",e),t.querySelector("#cp-save").addEventListener("click",async()=>{const n=t.querySelector("#cp-old").value,a=t.querySelector("#cp-new").value,s=t.querySelector("#cp-confirm").value,r=t.querySelector("#cp-msg");if(a.length<8){w(r,"New password must be at least 8 characters","error");return}if(a!==s){w(r,"Passwords do not match","error");return}const i=t.querySelector("#cp-save");i.disabled=!0,i.textContent="Saving…",await p.changeMasterPassword(n,a)?(v("Password changed successfully","success"),e()):(w(r,"Current password is incorrect","error"),i.disabled=!1,i.textContent="Change Password")})}function w(t,e,n){t.textContent=e,t.className=`auth-msg ${n}`}function Z(t,e){e.addEventListener("click",()=>{const n=t.type==="text";t.type=n?"password":"text",e.textContent=n?o.eye:o.eyeOff})}function ke(t){let e=0;return t.length>=8&&e++,t.length>=12&&e++,/[A-Z]/.test(t)&&e++,/[0-9]/.test(t)&&e++,/[^A-Za-z0-9]/.test(t)&&e++,e<=1?{label:"Weak",cls:"strength-weak"}:e<=2?{label:"Fair",cls:"strength-fair"}:e<=3?{label:"Good",cls:"strength-good"}:{label:"Strong",cls:"strength-strong"}}const Y=document.getElementById("app");ae();p.isSetup,q(Y);
