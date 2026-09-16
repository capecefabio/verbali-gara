(() => {
    const DB_NAME = 'airbid-directory';
    const DB_VERSION = 1;
    const STORE_NAME = 'partecipanti';
    const STYLE_ID = 'airbid-directory-style';
    let dbPromise = null;

    const normalize = (value) => String(value || '').trim().toLocaleLowerCase('it-IT').normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const getType = () => typeof isProfessionista === 'function' && isProfessionista() ? 'professionista' : 'azienda';

    function getDb() {
        if (dbPromise) return dbPromise;
        dbPromise = new Promise((resolve, reject) => {
            if (!('indexedDB' in window)) return reject(new Error('IndexedDB non disponibile'));
            const request = indexedDB.open(DB_NAME, DB_VERSION);
            request.onupgradeneeded = () => {
                const db = request.result;
                if (!db.objectStoreNames.contains(STORE_NAME)) {
                    const store = db.createObjectStore(STORE_NAME, { keyPath: 'key' });
                    store.createIndex('type', 'type', { unique: false });
                    store.createIndex('lastUsedAt', 'lastUsedAt', { unique: false });
                }
            };
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
        return dbPromise;
    }

    function getRecords(type) {
        return getDb().then((db) => new Promise((resolve, reject) => {
            const request = db.transaction(STORE_NAME, 'readonly').objectStore(STORE_NAME).index('type').getAll(type);
            request.onsuccess = () => resolve(request.result || []);
            request.onerror = () => reject(request.error);
        }));
    }

    function saveParticipant(type, name, title = '') {
        const cleanName = String(name || '').trim();
        if (!cleanName) return Promise.resolve();
        const cleanTitle = type === 'professionista' ? String(title || '').trim() : '';
        const key = `${type}|${normalize(cleanTitle)}|${normalize(cleanName)}`;
        const now = Date.now();
        return getDb().then((db) => new Promise((resolve, reject) => {
            const tx = db.transaction(STORE_NAME, 'readwrite');
            tx.objectStore(STORE_NAME).put({ key, type, name: cleanName, title: cleanTitle, createdAt: now, lastUsedAt: now });
            tx.oncomplete = resolve;
            tx.onerror = () => reject(tx.error);
        })).catch(() => {});
    }

    function ensureStyles() {
        if (document.getElementById(STYLE_ID)) return;
        const style = document.createElement('style');
        style.id = STYLE_ID;
        style.textContent = `
            .directory-name-control{display:flex;gap:8px;align-items:stretch;width:100%}
            .directory-name-control .nome{flex:1;min-width:0}
            .directory-open-btn{width:46px;flex:0 0 46px;border:1px solid rgba(0,105,150,.18);border-radius:14px;background:rgba(255,255,255,.68);color:#006b4a;cursor:pointer;font-size:19px;box-shadow:0 5px 14px rgba(0,0,0,.04);transition:transform .18s ease,background .18s ease,box-shadow .18s ease}
            .directory-open-btn:hover{transform:translateY(-1px);background:rgba(255,255,255,.95);box-shadow:0 8px 18px rgba(0,0,0,.08)}
            .directory-open-btn:active{transform:translateY(0)}
            .directory-panel{position:fixed;z-index:10000;width:min(410px,calc(100vw - 24px));max-height:min(520px,calc(100vh - 24px));overflow:auto;padding:10px;border:1px solid rgba(255,255,255,.8);border-radius:22px;background:rgba(248,252,250,.92);backdrop-filter:blur(26px) saturate(150%);-webkit-backdrop-filter:blur(26px) saturate(150%);box-shadow:0 24px 65px rgba(0,35,45,.2)}
            .directory-panel-head{display:flex;align-items:center;justify-content:space-between;padding:7px 8px 10px}.directory-panel-head strong{font-size:15px;color:#17342d}.directory-panel-head span{font-size:11px;color:#74827e}
            .directory-toolbar{display:flex;gap:8px;margin-bottom:8px}.directory-search{width:100%;box-sizing:border-box;border:1px solid rgba(0,105,150,.13);border-radius:13px;padding:9px 11px;background:rgba(255,255,255,.7);outline:none;font:inherit;font-size:13px}.directory-add{border:1px solid rgba(0,135,90,.18);border-radius:13px;padding:0 13px;background:rgba(0,135,90,.1);color:#006b4a;cursor:pointer;font:inherit;font-size:12px;font-weight:700;white-space:nowrap}.directory-add:hover{background:rgba(0,135,90,.16)}
            .directory-item{width:100%;display:flex;align-items:center;gap:10px;border:0;border-radius:14px;background:transparent;padding:10px;text-align:left;cursor:pointer;color:#17342d}.directory-item:hover{background:rgba(0,135,90,.09)}
            .directory-item-icon{width:34px;height:34px;display:grid;place-items:center;border-radius:10px;background:rgba(0,135,90,.1);font-size:16px;flex:none}.directory-item-text{min-width:0}.directory-item-text strong{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:13px}.directory-item-text small{display:block;margin-top:2px;color:#74827e;font-size:11px}.directory-empty{padding:26px 12px;text-align:center;color:#74827e;font-size:13px;line-height:1.5}
            .directory-add-form{display:grid;gap:14px;padding:4px}.directory-add-form label{display:grid;gap:7px;font-size:12px;font-weight:700;color:#17342d}.directory-add-form input,.directory-add-form select{width:100%;box-sizing:border-box;border:1px solid rgba(0,105,150,.15);border-radius:13px;padding:11px 12px;background:rgba(255,255,255,.72);outline:none;font:inherit;font-size:13px}.directory-form-actions{display:flex;justify-content:flex-end;gap:8px;padding-top:2px}.directory-secondary,.directory-primary{border-radius:12px;padding:9px 13px;font:inherit;font-size:12px;font-weight:700;cursor:pointer}.directory-secondary{border:1px solid rgba(0,0,0,.08);background:rgba(255,255,255,.65);color:#52605c}.directory-primary{border:1px solid rgba(0,135,90,.2);background:#00875a;color:white}.directory-cancel{border:0;background:transparent;color:#74827e;cursor:pointer;font-size:22px}
        `;
        document.head.appendChild(style);
    }

    function closePanel() { document.querySelector('.directory-panel')?.remove(); }

    function positionPanel(panel, button) {
        const rect = button.getBoundingClientRect();
        const width = Math.min(410, window.innerWidth - 24);
        let left = Math.min(rect.left, window.innerWidth - width - 12); left = Math.max(12, left);
        const height = Math.min(520, window.innerHeight - 24);
        let top = rect.bottom + 8; if (top + height > window.innerHeight - 12) top = Math.max(12, rect.top - height - 8);
        panel.style.left = `${left}px`; panel.style.top = `${top}px`; panel.style.width = `${width}px`;
    }

    async function openDirectory(button, box) {
        closePanel(); ensureStyles();
        const panel = document.createElement('div'); panel.className = 'directory-panel';
        panel.innerHTML = `<div class="directory-panel-head"><strong>Rubrica partecipanti</strong><span>Archivio locale</span></div><div class="directory-toolbar"><input class="directory-search" type="search" placeholder="Cerca partecipante…" autocomplete="off"><button type="button" class="directory-add">＋ Aggiungi</button></div><div class="directory-items"><div class="directory-empty">Caricamento…</div></div>`;
        document.body.appendChild(panel); positionPanel(panel, button);

        let records = []; try { records = await getRecords(getType()); } catch (_) {}
        records.sort((a,b) => (b.lastUsedAt || 0) - (a.lastUsedAt || 0));
        const type = getType(); const items = panel.querySelector('.directory-items'); const search = panel.querySelector('.directory-search');

        const render = () => {
            const query = normalize(search.value);
            const filtered = records.filter(r => !query || normalize(r.name).includes(query) || normalize(r.title).includes(query));
            if (!filtered.length) { items.innerHTML = '<div class="directory-empty">Nessun partecipante trovato.</div>'; return; }
            items.innerHTML = filtered.map(() => `<button type="button" class="directory-item"><span class="directory-item-icon">${type === 'professionista' ? '♙' : '▦'}</span><span class="directory-item-text"><strong></strong><small></small></span></button>`).join('');
            items.querySelectorAll('.directory-item').forEach((item, i) => {
                const record = filtered[i];
                item.querySelector('strong').textContent = type === 'professionista' && record.title ? `${record.title} ${record.name}` : record.name;
                item.querySelector('small').textContent = type === 'professionista' ? 'Professionista' : 'Impresa';
                item.addEventListener('click', () => {
                    const input = box.querySelector('.nome');
                    if (input) { input.value = record.name; input.dispatchEvent(new Event('input', { bubbles:true })); input.dispatchEvent(new Event('change', { bubbles:true })); }
                    if (type === 'professionista' && record.title) { const title = box.querySelector('.titolo'); if (title) { title.value = record.title; title.dispatchEvent(new Event('change', { bubbles:true })); } }
                    saveParticipant(type, record.name, record.title); closePanel(); input?.focus();
                });
            });
        };

        search.addEventListener('input', render);
        panel.querySelector('.directory-add').addEventListener('click', () => openAddForm(panel, box));
        render(); search.focus();
    }

    function openAddForm(panel, box) {
        const type = getType();
        panel.innerHTML = `<div class="directory-panel-head"><strong>Aggiungi alla rubrica</strong><button type="button" class="directory-cancel" aria-label="Annulla">×</button></div><form class="directory-add-form">${type === 'professionista' ? `<label>Titolo<select class="directory-title"><option value="L'Arch.">L'Arch.</option><option value="L'Ing.">L'Ing.</option><option value="Lo Studio">Lo Studio</option></select></label>` : ''}<label>${type === 'professionista' ? 'Nome / Studio' : 'Nome / Ragione sociale'}<input class="directory-add-name" type="text" placeholder="Inserisci nominativo..." autocomplete="off" required></label><div class="directory-form-actions"><button type="button" class="directory-secondary">Annulla</button><button type="submit" class="directory-primary">Aggiungi</button></div></form>`;
        const restore = () => { closePanel(); };
        panel.querySelectorAll('.directory-cancel,.directory-secondary').forEach((button) => button.addEventListener('click', restore));
        panel.querySelector('form').addEventListener('submit', async (event) => {
            event.preventDefault();
            const name = panel.querySelector('.directory-add-name').value.trim();
            const title = panel.querySelector('.directory-title')?.value || '';
            if (!name) return;
            await saveParticipant(type, name, title);
            const input = box?.querySelector('.nome');
            if (input) {
                input.value = name;
                if (type === 'professionista') { const titleInput = box.querySelector('.titolo'); if (titleInput) titleInput.value = title; }
                input.dispatchEvent(new Event('input', { bubbles:true })); input.dispatchEvent(new Event('change', { bubbles:true })); input.focus();
            }
            closePanel();
        });
        panel.querySelector('.directory-add-name')?.focus();
    }

    function prepareInput(input) {
        if (!input || input.dataset.directoryReady === 'true') return;
        ensureStyles(); input.dataset.directoryReady = 'true'; input.setAttribute('autocomplete', 'off');
        const wrapper = document.createElement('div'); wrapper.className = 'directory-name-control'; input.parentNode.insertBefore(wrapper, input); wrapper.appendChild(input);
        const button = document.createElement('button'); button.type = 'button'; button.className = 'directory-open-btn'; button.textContent = '▤'; button.title = 'Apri rubrica partecipanti'; button.setAttribute('aria-label', 'Apri rubrica partecipanti');
        button.addEventListener('click', () => openDirectory(button, input.closest('.offerta-box'))); wrapper.appendChild(button);
        let timer;
        const remember = () => { clearTimeout(timer); timer = setTimeout(() => { const box = input.closest('.offerta-box'); const title = getType() === 'professionista' ? box?.querySelector('.titolo')?.value || '' : ''; saveParticipant(getType(), input.value, title); }, 500); };
        input.addEventListener('input', remember); input.addEventListener('blur', remember); boxTitleListener(input.closest('.offerta-box'));
    }

    function boxTitleListener(box) {
        if (!box || box.dataset.directoryTitleReady === 'true') return;
        box.dataset.directoryTitleReady = 'true'; box.querySelector('.titolo')?.addEventListener('change', () => { const input = box.querySelector('.nome'); if (input?.value.trim()) saveParticipant(getType(), input.value, box.querySelector('.titolo')?.value || ''); });
    }

    function prepareAll() { document.querySelectorAll('.nome').forEach(prepareInput); }

    document.addEventListener('click', (event) => { if (document.querySelector('.directory-panel') && !event.target.closest('.directory-panel') && !event.target.closest('.directory-open-btn')) closePanel(); const segment = event.target.closest('.segment'); if (segment) setTimeout(prepareAll, 0); });
    window.addEventListener('resize', closePanel); window.addEventListener('scroll', closePanel, true);
    const list = document.getElementById('offerte-list'); if (list) new MutationObserver(prepareAll).observe(list, { childList:true, subtree:true });
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', prepareAll); else prepareAll();
})();