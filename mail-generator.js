(() => {
    function escapeHtml(testo) {
        return String(testo)
            .replaceAll('&', '&amp;')
            .replaceAll('<', '&lt;')
            .replaceAll('>', '&gt;')
            .replaceAll('"', '&quot;')
            .replaceAll("'", '&#039;');
    }

    function trovaMiglioreOfferta() {
        if (typeof getOfferteValide !== 'function') return null;
        const offerte = getOfferteValide();
        return [...offerte].sort((a, b) => a.imponibile - b.imponibile)[0] || null;
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

        let migliore = trovaMiglioreOfferta();
        let nomeMigliore = migliore ? getSoggetto(migliore) : '';
        if (!nomeMigliore) nomeMigliore = 'quella indicata nel verbale';

        const testo = `Ciao a tutti,\n\ncomunichiamo che l’evento di gara è stato chiuso.\nVerbale apertura buste in allegato.\n\nI documenti si trovano su:\n\n${ftp}\n\nLa miglior offerta risulta essere quella di ${nomeMigliore}.\n\nSaluti,`;
        output.value = testo;
        if (status) status.textContent = migliore ? 'Mail generata.' : 'Mail generata. Il miglior offerente non è ancora disponibile in questa sessione.';
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
