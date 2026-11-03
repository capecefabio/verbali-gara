(() => {
    const ARCHIVE_KEY = 'airbid-verbali-archivio-v1';
    const MAIL_ARCHIVE_KEY = 're-verbali-gara-mail-archivio-v1';

    function leggiMailArchivio() {
        try {
            const dati = JSON.parse(localStorage.getItem(MAIL_ARCHIVE_KEY) || '[]');
            return Array.isArray(dati) ? dati : [];
        } catch { return []; }
    }

    function scriviMailArchivio(dati) {
        localStorage.setItem(MAIL_ARCHIVE_KEY, JSON.stringify(dati));
    }

    function escapeHtml(testo) {
        return String(testo).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#039;');
    }

    function formatData(iso) {
        try { return new Intl.DateTimeFormat('it-IT', { dateStyle:'medium', timeStyle:'short' }).format(new Date(iso)); }
        catch { return iso; }
    }

    function aggiornaContatoreMail() {
        const el = document.getElementById('mail-archive-count');
        if (el) el.textContent = leggiMailArchivio().length;
    }

    function salvaMailArchivio(testo) {
        if (!testo) return;
        const record = { id:`${Date.now()}-${Math.random().toString(36).slice(2,8)}`, data:new Date().toISOString(), testo };
        const archivio = leggiMailArchivio();
        archivio.unshift(record);
        scriviMailArchivio(archivio);
        aggiornaContatoreMail();
    }

    function mostraArchivioMail() {
        const modal = document.getElementById('mail-archive-detail');
        const container = document.getElementById('mail-archive-list');
        if (!modal || !container) return;
        const archivio = leggiMailArchivio();
        if (!archivio.length) {
            container.innerHTML = '<div class="mail-archive-empty"><strong>Nessuna mail archiviata</strong><span>Le mail vengono salvate automaticamente quando clicchi su “Copia mail”.</span></div>';
        } else {
            container.innerHTML = archivio.map(record => `<button type="button" class="mail-archive-item" data-mail-archive-id="${escapeHtml(record.id)}"><span class="archive-item-icon">✉</span><span class="mail-archive-item-content"><strong>Mail di gara</strong><small>${escapeHtml(formatData(record.data))}</small></span><span class="mail-archive-item-arrow">→</span></button>`).join('');
        }
        modal.hidden = false;
    }

    function mostraMailArchiviata(id) {
        const record = leggiMailArchivio().find(item => item.id === id);
        const modal = document.getElementById('mail-archive-detail');
        const container = document.getElementById('mail-archive-list');
        if (!record || !modal || !container) return;
        container.innerHTML = `<div class="mail-archive-view">${escapeHtml(record.testo)}</div>`;
        document.getElementById('mail-archive-title').textContent = 'Mail di gara';
        document.getElementById('mail-archive-meta').textContent = formatData(record.data);
    }

    function chiudiArchivioMail() {
        const modal = document.getElementById('mail-archive-detail');
        if (modal) modal.hidden = true;
    }

    function trovaMiglioreOfferta() {
        if (typeof getOfferteValide !== 'function') return null;
        const offerte = getOfferteValide();
        return [...offerte].sort((a,b) => a.imponibile - b.imponibile)[0] || null;
    }

    function trovaMiglioreArchiviata() {
        try {
            const archivio = JSON.parse(localStorage.getItem(ARCHIVE_KEY) || '[]');
            const record = Array.isArray(archivio) ? archivio[0] : null;
            return record?.miglioreOfferta || '';
        } catch { return ''; }
    }

    function nomePerMail(migliore) {
        if (!migliore) return '';
        return isProfessionista() ? `${migliore.titolo} ${migliore.nomeCaps}` : migliore.nomeCaps;
    }

    function formatImportoMail(valore) {
        const numero = Number.parseFloat(valore);
        return Number.isFinite(numero)
            ? new Intl.NumberFormat('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(numero)
            : '';
    }

    function aggiornaCampiRilancio() {
        const rilancio = document.getElementById('mail-rilancio')?.value || '';
        const campi = document.getElementById('mail-no-rilancio-fields');
        if (campi) campi.hidden = rilancio !== 'no';
    }

    function generaMail() {
        const ftp = document.getElementById('mail-ftp-url')?.value.trim() || '';
        const rilancio = document.getElementById('mail-rilancio')?.value || '';
        const output = document.getElementById('mail-output');
        const status = document.getElementById('mail-status');
        if (!output) return;

        const errore = (messaggio, id) => {
            if (status) status.textContent = messaggio;
            document.getElementById(id)?.focus();
        };

        if (!ftp) { errore('Inserisci l’URL FTP per generare la mail.', 'mail-ftp-url'); return; }
        if (!rilancio) { errore('Seleziona se la gara necessita di rilancio.', 'mail-rilancio'); return; }

        let dettagliGara;
        if (rilancio === 'si') {
            dettagliGara = 'La gara necessita di rilancio.';
        } else {
            const nomeMigliore = document.getElementById('mail-migliore-offerta')?.value.trim() || '';
            const coerenza = document.getElementById('mail-sigi-coerente')?.value || '';
            const importoRaw = document.getElementById('mail-sigi-importo')?.value || '';
            const importoNumero = Number.parseFloat(importoRaw);
            const importo = formatImportoMail(importoRaw);

            if (!nomeMigliore) { errore('Indica a chi appartiene la migliore offerta.', 'mail-migliore-offerta'); return; }
            if (!coerenza) { errore('Seleziona se l’offerta è coerente con l’importo di SIGI.', 'mail-sigi-coerente'); return; }
            if (!importo || !Number.isFinite(importoNumero) || importoNumero < 0) { errore('Inserisci l’importo totale disponibile sulla scheda progetto.', 'mail-sigi-importo'); return; }

            const fraseCoerenza = coerenza === 'si'
                ? 'risulta coerente con l’importo totale disponibile sulla scheda progetto pari a Euro'
                : 'non risulta coerente con l’importo totale disponibile sulla scheda progetto pari a Euro';
            dettagliGara = `La gara non necessita di rilancio. La miglior offerta risulta essere quella di ${nomeMigliore}; ${fraseCoerenza} ${importo}.`;
        }

        output.value = `Ciao a tutti,\n\ncomunichiamo che l’evento di gara è stato chiuso.\nVerbale apertura buste in allegato.\n\nI documenti si trovano su:\n\n${ftp}\n\n${dettagliGara}\n\nSaluti,`;
        if (status) status.textContent='Mail generata.';
    }

    async function copiaMail() {
        const output = document.getElementById('mail-output');
        const button = document.querySelector('[data-action="copia-mail"]');
        if (!output?.value) return;
        try { await navigator.clipboard.writeText(output.value); } catch { output.focus(); output.select(); document.execCommand('copy'); }
        salvaMailArchivio(output.value);
        if (button) { const originale=button.innerHTML; button.innerHTML='<span aria-hidden="true">✓</span> Mail copiata'; setTimeout(()=>{button.innerHTML=originale;},1600); }
    }

    window.mostraGeneratoreMailAirBid = () => {
        document.getElementById('welcome-screen')?.setAttribute('hidden',''); document.getElementById('app-shell')?.setAttribute('hidden',''); document.getElementById('archive-screen')?.setAttribute('hidden',''); document.getElementById('mail-screen')?.removeAttribute('hidden'); aggiornaContatoreMail(); document.getElementById('mail-ftp-url')?.focus();
    };

    document.addEventListener('click', event => {
        if (event.target.closest('[data-action="generatore-mail"]')) { window.mostraGeneratoreMailAirBid(); return; }
        if (event.target.closest('[data-action="genera-mail"]')) { generaMail(); return; }
        if (event.target.closest('[data-action="copia-mail"]')) { copiaMail(); return; }
        if (event.target.closest('[data-action="archivio-mail"]')) { mostraArchivioMail(); return; }
        const item = event.target.closest('[data-mail-archive-id]');
        if (item) { mostraMailArchiviata(item.dataset.mailArchiveId); return; }
        if (event.target.closest('[data-action="chiudi-archivio-mail"]')) chiudiArchivioMail();
    });

    document.addEventListener('input', event => {
        if (['mail-ftp-url','mail-migliore-offerta','mail-sigi-importo'].includes(event.target.id)) {
            const status=document.getElementById('mail-status');
            if(status) status.textContent='';
        }
    });
    document.addEventListener('change', event => {
        if (event.target.id === 'mail-rilancio') aggiornaCampiRilancio();
        if (['mail-rilancio','mail-sigi-coerente'].includes(event.target.id)) {
            const status=document.getElementById('mail-status');
            if(status) status.textContent='';
        }
    });
    document.addEventListener('keydown', event => { if (event.key === 'Escape') chiudiArchivioMail(); });
    document.addEventListener('DOMContentLoaded', aggiornaContatoreMail);
})();
