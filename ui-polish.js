(() => {
    function aggiornaDescrizioniSingole() {
        document.querySelectorAll('.offerta-box').forEach((box) => {
            const id = Number(box.id.replace('box-', ''));
            const output = document.getElementById(`output-singolo-${id}`);
            if (!output || typeof getDatiOfferta !== 'function') return;

            const dato = getDatiOfferta(id);
            if (!dato) {
                output.value = '';
                return;
            }

            if (dato.imponibile === 0) {
                const nome = typeof isProfessionista === 'function' && isProfessionista()
                    ? `${dato.titolo} ${dato.nomeCaps}`
                    : dato.nomeCaps;
                output.value = `${nome} non ha presentato offerta.`;
                return;
            }

            const professionista = typeof isProfessionista === 'function' && isProfessionista();
            const suffisso = typeof getSuffissoImporto === 'function'
                ? getSuffissoImporto(dato.pIva)
                : (professionista ? '+ oneri professionali + iva' : '+ iva');

            output.value = professionista
                ? `${dato.titolo} ${dato.nomeCaps} ha presentato regolare offerta per un importo di € ${formatEuro(dato.imponibile)} ${suffisso} pari a € ${formatEuro(dato.totale)}.`
                : `La ditta ${dato.nomeCaps} ha presentato regolare offerta per un importo di € ${formatEuro(dato.imponibile)} ${suffisso} pari a € ${formatEuro(dato.totale)}.`;
        });
    }

    function aggiornaUICompleta() {
        aggiornaDescrizioniSingole();
        if (typeof aggiornaVerbaleLive === 'function') aggiornaVerbaleLive();
    }

    document.addEventListener('input', (event) => {
        if (event.target.matches('.nome, .imponibile, .perc-iva, .perc-oneri')) aggiornaUICompleta();
    });

    document.addEventListener('change', (event) => {
        if (event.target.matches('.titolo, #tipo-globale')) aggiornaUICompleta();
    });

    document.addEventListener('click', async (event) => {
        const button = event.target.closest('[data-action="copia-singola"]');
        if (!button) return;
        const id = Number(button.dataset.id);
        const output = document.getElementById(`output-singolo-${id}`);
        if (!output?.value) return;
        try {
            await navigator.clipboard.writeText(output.value);
        } catch {
            output.focus();
            output.select();
            document.execCommand('copy');
        }
        const old = button.innerHTML;
        button.innerHTML = '✓';
        setTimeout(() => { button.innerHTML = old; }, 1400);
    });

    const observer = new MutationObserver(() => aggiornaDescrizioniSingole());
    const list = document.getElementById('offerte-list');
    if (list) observer.observe(list, { childList: true });

    requestAnimationFrame(aggiornaDescrizioniSingole);
})();
