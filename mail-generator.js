(() => {
    const ARCHIVE_KEY = 'airbid-verbali-archivio-v1';

    function trovaMiglioreOfferta() {
        if (typeof getOfferteValide !== 'function') return null;
        const offerte = getOfferteValide();
        return [...offerte].sort((a, b) => a.imponibile - b.imponibile)[0] || null;
    }

    function trovaMiglioreArchiviata() {
        try {
            const archivio = JSON.parse(localStorage.getItem(ARCHIVE_KEY) || '[]');
            const record = Array.isArray(archivio) ? archivio[0] : null;
            return record?.miglioreOfferta || '';
        } catch {
            return '';
        }
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

        if (!ftp) {
            if (status) status.textContent = 'Inserisci l’URL FTP per generare la mail.';
            document.getElementById('mail-ftp-url')?.focus();
            return;
        }

        const migliore = trovaMiglioreOfferta();
        let nomeMigliore = nomePerMail(migliore);
        if (!nomeMigliore) nomeMigliore = trovaMiglioreArchiviata();
        if (!nomeMigliore) nomeMigliore = 'quella indicata nel verbale';

        const testo = `Ciao a tutti,\n\ncomunichiamo che l’evento di gara è stato chiuso.\nVerbale apertura buste in allegato.\n\nI documenti si trovano su:\n\n${ftp}\n\nLa miglior offerta risulta essere quella di ${nomeMigliore}.\n\nSaluti,`;
        output.value = testo;
        if (status) status.textContent = 'Mail generata.';
    }

    async function copiaMail() {
        const output = document.getElementById('mail-output');
        const button = document.querySelector('[data-action="copia-mail"]');
        if (!output?.value) return;

        try {
            await navigator.clipboard.writeText(output.value);
        } catch {
            output.focus();
            output.select();
            document.execCommand('copy');
        }

        if (button) {
            const originale = button.innerHTML;
            button.innerHTML = '<span aria-hidden="true">✓</span> Mail copiata';
            setTimeout(() => { button.innerHTML = originale; }, 1600);
        }
    }

    window.mostraGeneratoreMailAirBid = () => {
        document.getElementById('welcome-screen')?.setAttribute('hidden', '');
        document.getElementById('app-shell')?.setAttribute('hidden', '');
        document.getElementById('archive-screen')?.setAttribute('hidden', '');
        document.getElementById('mail-screen')?.removeAttribute('hidden');
        document.getElementById('mail-ftp-url')?.focus();
    };

    document.addEventListener('click', (event) => {
        if (event.target.closest('[data-action="generatore-mail"]')) {
            window.mostraGeneratoreMailAirBid();
            return;
        }
        if (event.target.closest('[data-action="genera-mail"]')) {
            generaMail();
            return;
        }
        if (event.target.closest('[data-action="copia-mail"]')) copiaMail();
    });

    document.addEventListener('input', (event) => {
        if (event.target.id === 'mail-ftp-url') {
            const status = document.getElementById('mail-status');
            if (status) status.textContent = '';
        }
    });
})();
