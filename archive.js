(() => {
    const STORAGE_KEY = 'airbid-verbali-archivio-v1';

    function leggiArchivio() {
        try {
            const dati = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
            return Array.isArray(dati) ? dati : [];
        } catch {
            return [];
        }
    }

    function scriviArchivio(dati) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(dati));
    }

    function escapeHtml(testo) {
        return String(testo)
            .replaceAll('&', '&amp;')
            .replaceAll('<', '&lt;')
            .replaceAll('>', '&gt;')
            .replaceAll('"', '&quot;')
            .replaceAll("'", '&#039;');
    }

    function salvaVerbaleArchivio(testo, datiExtra = {}) {
        if (!testo) return;

        const record = {
            id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            data: new Date().toISOString(),
            tipo: datiExtra.tipo || 'La ditta',
            miglioreOfferta: datiExtra.miglioreOfferta || '',
            testo
        };

        const archivio = leggiArchivio();
        archivio.unshift(record);
        scriviArchivio(archivio);
        renderArchivio();
    }

    function formatData(iso) {
        try {
            return new Intl.DateTimeFormat('it-IT', {
                dateStyle: 'medium',
                timeStyle: 'short'
            }).format(new Date(iso));
        } catch {
            return iso;
        }
    }

    function renderArchivio() {
        const container = document.getElementById('archive-list');
        if (!container) return;

        const archivio = leggiArchivio();
        const count = document.getElementById('archive-count');
        if (count) count.textContent = `${archivio.length} ${archivio.length === 1 ? 'verbale salvato' : 'verbali salvati'}`;

        if (archivio.length === 0) {
            container.innerHTML = `
                <div class="archive-empty">
                    <div class="archive-empty-icon">▤</div>
                    <strong>Nessun verbale archiviato</strong>
                    <span>I verbali vengono salvati automaticamente ogni volta che clicchi su “Copia verbale negli appunti”.</span>
                </div>
            `;
            return;
        }

        container.innerHTML = archivio.map((record) => `
            <button type="button" class="archive-item" data-archive-id="${escapeHtml(record.id)}">
                <span class="archive-item-icon">▤</span>
                <span class="archive-item-content">
                    <strong>${escapeHtml(record.miglioreOfferta || 'Verbale di gara')}</strong>
                    <small>${escapeHtml(formatData(record.data))} · ${escapeHtml(record.tipo === 'Il professionista' ? 'Professionisti' : 'Imprese')}</small>
                </span>
                <span class="archive-item-arrow">→</span>
            </button>
        `).join('');
    }

    function mostraVerbaleArchivio(id) {
        const record = leggiArchivio().find((item) => item.id === id);
        const modal = document.getElementById('archive-detail');
        if (!record || !modal) return;

        document.getElementById('archive-detail-title').textContent = record.miglioreOfferta || 'Verbale di gara';
        document.getElementById('archive-detail-meta').textContent = `${formatData(record.data)} · ${record.tipo === 'Il professionista' ? 'Professionisti' : 'Imprese'}`;
        document.getElementById('archive-detail-text').textContent = record.testo;
        modal.hidden = false;
    }

    function chiudiDettaglio() {
        const modal = document.getElementById('archive-detail');
        if (modal) modal.hidden = true;
    }

    function mostraSezione(id) {
        document.getElementById('welcome-screen')?.setAttribute('hidden', '');
        document.getElementById('app-shell')?.setAttribute('hidden', '');
        document.getElementById('archive-screen')?.setAttribute('hidden', '');
        document.getElementById('mail-screen')?.setAttribute('hidden', '');
        document.getElementById(id)?.removeAttribute('hidden');
    }

    window.salvaVerbaleArchivio = salvaVerbaleArchivio;
    window.mostraHomeAirBid = () => mostraSezione('welcome-screen');
    window.mostraArchivioAirBid = () => { mostraSezione('archive-screen'); renderArchivio(); };

    document.addEventListener('click', (event) => {
        const item = event.target.closest('[data-archive-id]');
        if (item) mostraVerbaleArchivio(item.dataset.archiveId);

        if (event.target.closest('[data-action="archivio"]')) window.mostraArchivioAirBid();
        if (event.target.closest('[data-action="home"]')) window.mostraHomeAirBid();
        if (event.target.closest('[data-action="chiudi-archivio-dettaglio"]')) chiudiDettaglio();
    });

    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') chiudiDettaglio();
    });

    window.addEventListener('airbid-verbale-copiato', (event) => {
        const { testo, miglioreOfferta, tipo } = event.detail || {};
        salvaVerbaleArchivio(testo, { miglioreOfferta, tipo });
    });

    document.addEventListener('DOMContentLoaded', renderArchivio);
})();
