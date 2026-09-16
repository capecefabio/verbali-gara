(() => {
    const DB_NAME = 'airbid-local-data';
    const DB_VERSION = 1;
    const STORE = 'partecipanti';
    const STYLE_ID = 'airbid-address-book-style';

    let dbPromise;

    function openDb() {
        if (dbPromise) return dbPromise;
        dbPromise = new Promise((resolve, reject) => {
            if (!('indexedDB' in window)) return reject(new Error('IndexedDB non disponibile'));
            const request = indexedDB.open(DB_NAME, DB_VERSION);
            request.onupgradeneeded = () => {
                const db = request.result;
                if (!db.objectStoreNames.contains(STORE)) {
                    db.createObjectStore(STORE, { keyPath: 'key' });
                }
            };
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
        return dbPromise;
    }

    async function getAll() {
        const db = await openDb();
        return new Promise((resolve, reject) => {
            const request = db.transaction(STORE, 'readonly').objectStore(STORE).getAll();
            request.onsuccess = () => resolve(request.result || []);
            request.onerror = () => reject(request.error);
        });
    }

    async function save(record) {
        const db = await openDb();
        return new Promise((resolve, reject) => {
            const request = db.transaction(STORE, 'readwrite').objectStore(STORE).put(record);
            request.onsuccess = resolve;
            request.onerror = () => reject(request.error);
        });
    }

    function normalize(value) {
        return String(value || '').trim().toLocaleLowerCase('it-IT').replace(/\s+/g, ' ');
    }

    function isPro() {
        return typeof window.isProfessionista === 'function' && window.isProfessionista();
    }

    function ensureStyles() {
        if (document.getElementById(STYLE_ID)) return;
        const style = document.createElement('style');
        style.id = STYLE_ID;
        style.textContent = `
            .airbid-name-control { display:flex; gap:8px; align-items:stretch; }
            .airbid-name-control .nome { flex:1; min-width:0; }
            .airbid-address-button { flex:0 0 46px; border:1px solid rgba(0,105,150,.18); border-radius:14px; background:rgba(255,255,255,.62); color:#006b4a; cursor:pointer; font-size:20px; line-height:1; transition:.2s ease; box-shadow:0 5px 14px rgba(0,0,0,.04); }
            .airbid-address-button:hover { transform:translateY(-1px); background:rgba(255,255,255,.9); box-shadow:0 8px 18px rgba(0,0,0,.08); }
            .airbid-address-button:active { transform:translateY(0); }
            .airbid-address-panel { position:fixed; z-index:9999; width:min(390px, calc(100vw - 24px)); max-height:min(430px, calc(100vh - 24px)); overflow:auto; padding:10px; border:1px solid rgba(255,255,255,.72); border-radius:20px; background:rgba(248,252,250,.88); backdrop-filter:blur(24px) saturate(150%); -webkit-backdrop-filter:blur(24px) saturate(150%); box-shadow:0 22px 60px rgba(0,35,45,.18); }
            .airbid-address-head { display:flex; align-items:center; justify-content:space-between; padding:7px 8px 10px; }
            .airbid-address-head strong { font-size:14px; color:#17342d; }
            .airbid-address-head span { font-size:12px; color:#71817c; }
            .airbid-address-empty { padding:24px 12px; text-align:center; color:#71817c; font-size:13px; }
            .airbid-address-item { width:100%; display:flex; align-items:center; gap:10px; border:0; border-radius:14px; background:transparent; padding:10px; text-align:left; cursor:pointer; color:#17342d; }
            .airbid-address-item:hover { background:rgba(0,135,90,.09); }
            .airbid-address-icon { width:32px; height:32px; display:grid; place-items:center; border-radius:10px; background:rgba(0,135,90,.1); font-size:16px; flex:none; }
            .airbid-address-text { min-width:0; }
            .airbid-address-text strong { display:block; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; font-size:13px; }
            .airbid-address-text small { display:block; margin-top:2px; color:#74827e; font-size:11px; }
            @media (max-width:600px) { .airbid-address-button { flex-basis:44px; } }
        `;
        document.head.appendChild(style);
    }

    function getRecordFromBox(box) {
        const nameInput = box.querySelector('.nome');
        if (!nameInput) return null;
        const name = nameInput.value.trim();
        if (!name) return null;
        const professional = isPro();
        const title = professional ? (box.querySelector('.titolo')?.value || '') : '';
        const key = professional ? `pro|${normalize(title)}|${normalize(name)}` : `company|${normalize(name)}`;
        return { key, type: professional ? 'professional' : 'company', name, title, updatedAt: Date.now() };
    }

    async function rememberBox(box) {
        const record = getRecordFromBox(box);
        if (!record) return;
        try { await save(record); } catch (_) { /* fallback: the autocomplete simply remains unavailable */ }
    }

    function closePanel() {
        document.querySelector('.airbid-address-panel')?.remove();
    }

    function positionPanel(panel, button) {
        const rect = button.getBoundingClientRect();
        const width = Math.min(390, window.innerWidth - 24);
        let left = Math.min(rect.left, window.innerWidth - width - 12);
        left = Math.max(12, left);
        const panelHeight = Math.min(430, window.innerHeight - 24);
        let top = rect.bottom + 8;
        if (top + panelHeight > window.innerHeight - 12) top = Math.max(12, rect.top - panelHeight - 8);
        panel.style.left = `${left}px`;
        panel.style.top = `${top}px`;
        panel.style.width = `${width}px`;
    }

    async function openAddressBook(button, box) {
        closePanel();
        const panel = document.createElement('div');
        panel.className = 'airbid-address-panel';
        panel.innerHTML = '<div class="airbid-address-head"><strong>Rubrica partecipanti</strong><span>Salvati su questo browser</span></div><div class="airbid-address-list"><div class="airbid-address-empty">Caricamento…</div></div>';
        document.body.appendChild(panel);
        positionPanel(panel, button);

        let records = [];
        try { records = await getAll(); } catch (_) { records = []; }
        const type = isPro() ? 'professional' : 'company';
        records = records.filter((record) => record.type === type).sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));

        const list = panel.querySelector('.airbid-address-list');
        if (!records.length) {
            list.innerHTML = `<div class="airbid-address-empty">Nessun partecipante salvato.<br>Quando ne inserisci uno, verrà aggiunto automaticamente alla rubrica.</div>`;
        } else {
            list.innerHTML = records.map((record, index) => `
                <button type="button" class="airbid-address-item" data-address-index="${index}">
                    <span class="airbid-address-icon">${type === 'professional' ? '♙' : '▦'}</span>
                    <span class="airbid-address-text"><strong></strong><small></small></span>
                </button>
            `).join('');
            list.querySelectorAll('.airbid-address-item').forEach((item, index) => {
                const record = records[index];
                item.querySelector('strong').textContent = record.name;
                item.querySelector('small').textContent = type === 'professional' ? record.title : 'Impresa';
                item.addEventListener('click', () => {
                    const nameInput = box.querySelector('.nome');
                    if (nameInput) {
                        nameInput.value = record.name;
                        nameInput.dispatchEvent(new Event('input', { bubbles: true }));
                    }
                    if (type === 'professional' && box.querySelector('.titolo') && record.title) {
                        box.querySelector('.titolo').value = record.title;
                        box.querySelector('.titolo').dispatchEvent(new Event('change', { bubbles: true }));
                    }
                    closePanel();
                });
            });
        }
    }

    function enhanceBox(box) {
        if (box.dataset.addressBookReady === 'true') return;
        const input = box.querySelector('.nome');
        if (!input) return;
        ensureStyles();
        const control = document.createElement('div');
        control.className = 'airbid-name-control';
        input.parentNode.insertBefore(control, input);
        control.appendChild(input);
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'airbid-address-button';
        button.title = 'Apri rubrica partecipanti';
        button.setAttribute('aria-label', 'Apri rubrica partecipanti');
        button.textContent = '▤';
        button.addEventListener('click', () => openAddressBook(button, box));
        control.appendChild(button);
        box.dataset.addressBookReady = 'true';

        let saveTimer;
        const scheduleSave = () => {
            clearTimeout(saveTimer);
            saveTimer = setTimeout(() => rememberBox(box), 600);
        };
        input.addEventListener('input', scheduleSave);
        input.addEventListener('blur', () => rememberBox(box));
        box.querySelector('.titolo')?.addEventListener('change', () => rememberBox(box));
    }

    function enhanceAll() {
        document.querySelectorAll('.offerta-box').forEach(enhanceBox);
    }

    document.addEventListener('click', (event) => {
        const panel = document.querySelector('.airbid-address-panel');
        if (panel && !panel.contains(event.target) && !event.target.closest('.airbid-address-button')) closePanel();
    });
    window.addEventListener('resize', closePanel);
    window.addEventListener('scroll', closePanel, true);

    const observer = new MutationObserver(enhanceAll);
    const list = document.getElementById('offerte-list');
    if (list) observer.observe(list, { childList: true, subtree: true });
    requestAnimationFrame(enhanceAll);
})();
