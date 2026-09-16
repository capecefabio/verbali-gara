(() => {
    const DB_NAME = 'airbid-directory';
    const DB_VERSION = 1;
    const STORE_NAME = 'partecipanti';
    const DATALIST_IDS = {
        azienda: 'airbid-suggerimenti-aziende',
        professionista: 'airbid-suggerimenti-professionisti'
    };

    let dbPromise = null;

    function getDb() {
        if (dbPromise) return dbPromise;
        dbPromise = new Promise((resolve, reject) => {
            if (!('indexedDB' in window)) {
                reject(new Error('IndexedDB non disponibile'));
                return;
            }

            const request = indexedDB.open(DB_NAME, DB_VERSION);
            request.onupgradeneeded = () => {
                const db = request.result;
                if (!db.objectStoreNames.contains(STORE_NAME)) {
                    const store = db.createObjectStore(STORE_NAME, { keyPath: 'key' });
                    store.createIndex('type', 'type', { unique: false });
                    store.createIndex('name', 'name', { unique: false });
                    store.createIndex('lastUsedAt', 'lastUsedAt', { unique: false });
                }
            };
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
        return dbPromise;
    }

    function normalize(value) {
        return String(value || '')
            .trim()
            .toLocaleLowerCase('it-IT')
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '');
    }

    function getType() {
        return typeof isProfessionista === 'function' && isProfessionista()
            ? 'professionista'
            : 'azienda';
    }

    function getRecords(type) {
        return getDb().then((db) => new Promise((resolve, reject) => {
            const tx = db.transaction(STORE_NAME, 'readonly');
            const index = tx.objectStore(STORE_NAME).index('type');
            const request = index.getAll(type);
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
            tx.objectStore(STORE_NAME).put({
                key,
                type,
                name: cleanName,
                title: cleanTitle,
                createdAt: now,
                lastUsedAt: now
            });
            tx.oncomplete = resolve;
            tx.onerror = () => reject(tx.error);
        })).catch(() => {});
    }

    function createDatalists() {
        Object.values(DATALIST_IDS).forEach((id) => {
            if (document.getElementById(id)) return;
            const datalist = document.createElement('datalist');
            datalist.id = id;
            document.body.appendChild(datalist);
        });
    }

    async function refreshSuggestions(type) {
        try {
            const records = await getRecords(type);
            records.sort((a, b) => (b.lastUsedAt || 0) - (a.lastUsedAt || 0));
            const datalist = document.getElementById(DATALIST_IDS[type]);
            if (!datalist) return;

            datalist.innerHTML = '';
            const seen = new Set();
            records.forEach((record) => {
                const normalized = normalize(record.name);
                if (seen.has(normalized)) return;
                seen.add(normalized);
                const option = document.createElement('option');
                option.value = record.name;
                if (type === 'professionista' && record.title) option.label = record.title;
                datalist.appendChild(option);
            });
        } catch (_) {
            // L'app continua a funzionare anche se il database locale non è disponibile.
        }
    }

    async function refreshAllSuggestions() {
        await Promise.all([refreshSuggestions('azienda'), refreshSuggestions('professionista')]);
    }

    function prepareNameInput(input) {
        if (!input || input.dataset.directoryReady === 'true') return;
        input.dataset.directoryReady = 'true';
        input.setAttribute('autocomplete', 'off');
        input.setAttribute('list', DATALIST_IDS[getType()]);

        const wrapper = input.closest('.name-field');
        if (wrapper && !wrapper.querySelector('.directory-hint')) {
            const hint = document.createElement('span');
            hint.className = 'directory-hint';
            hint.textContent = 'Archivio locale';
            wrapper.appendChild(hint);
        }
    }

    function prepareAllInputs() {
        createDatalists();
        document.querySelectorAll('.nome').forEach(prepareNameInput);
    }

    function updateInputLists() {
        document.querySelectorAll('.nome').forEach((input) => {
            input.setAttribute('list', DATALIST_IDS[getType()]);
        });
        refreshAllSuggestions();
    }

    function saveFromInput(input) {
        if (!input?.matches('.nome')) return;
        const box = input.closest('.offerta-box');
        if (!box || !input.value.trim()) return;

        const type = getType();
        const title = type === 'professionista' ? box.querySelector('.titolo')?.value || '' : '';
        saveParticipant(type, input.value, title).then(() => refreshSuggestions(type));
    }

    document.addEventListener('blur', (event) => {
        if (event.target.matches('.nome')) saveFromInput(event.target);
    }, true);

    document.addEventListener('change', (event) => {
        if (event.target.matches('.nome, .titolo')) {
            if (event.target.matches('.nome')) saveFromInput(event.target);
            else {
                const box = event.target.closest('.offerta-box');
                const input = box?.querySelector('.nome');
                if (input?.value.trim()) saveFromInput(input);
            }
        }

        if (event.target.matches('#tipo-globale')) updateInputLists();
    });

    document.addEventListener('input', (event) => {
        if (event.target.matches('.nome')) {
            prepareNameInput(event.target);

            // Se l'utente ha scelto un suggerimento già completo, lo salviamo subito.
            getRecords(getType()).then((records) => {
                const value = normalize(event.target.value);
                if (value && records.some((record) => normalize(record.name) === value)) {
                    saveFromInput(event.target);
                }
            }).catch(() => {});
        }
    });

    document.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' && event.target.matches('.nome')) saveFromInput(event.target);
    });

    document.addEventListener('click', (event) => {
        const segment = event.target.closest('.segment');
        if (segment) {
            setTimeout(() => {
                prepareAllInputs();
                updateInputLists();
            }, 0);
        }
    });

    const observer = new MutationObserver(() => prepareAllInputs());
    const list = document.getElementById('offerte-list');
    if (list) observer.observe(list, { childList: true, subtree: true });

    function init() {
        createDatalists();
        prepareAllInputs();
        refreshAllSuggestions();
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
})();
