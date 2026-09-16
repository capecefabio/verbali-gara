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

    function generaMail() {
        const ftp = document.getElementById('mail-ftp-url')?.value.trim() || '';
        const output = document.getElementById('mail-output');
        const status = document.getElementById('mail-status');
        if (!output) return;
        if (!ftp) { if (status) status.textContent='Inserisci l’URL FTP per generare la mail.'; document.getElementById('mail-ftp-url')?.focus(); return; }
        const migliore = trovaMiglioreOfferta();
        let nomeMigliore = nomePerMail(migliore);
        if (!nomeMigliore) nomeMigliore = trovaMiglioreArchiviata();
        if (!nomeMigliore) nomeMigliore = 'quella indicata nel verbale';
        output.value = `Ciao a tutti,\n\ncomunichiamo che l’evento di gara è stato chiuso.\nVerbale apertura buste in allegato.\n\nI documenti si trovano su:\n\n${ftp}\n\nLa miglior offerta risulta essere quella di ${nomeMigliore}.\n\nSaluti,`;
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

    document.addEventListener('input', event => { if (event.target.id === 'mail-ftp-url') { const status=document.getElementById('mail-status'); if(status) status.textContent=''; } });
    document.addEventListener('keydown', event => { if (event.key === 'Escape') chiudiArchivioMail(); });
    document.addEventListener('DOMContentLoaded', aggiornaContatoreMail);
})();
