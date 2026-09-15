(() => {
    function preparaDescrizioniSingole() {
        document.querySelectorAll('.offerta-box').forEach((box) => {
            const id = Number(box.id.replace('box-', ''));
            const area = box.querySelector('.single-offer-area');
            const output = document.getElementById(`output-singolo-${id}`);
            if (!area || !output) return;
            const oldGenerate = area.querySelector('[data-action="genera-singola"]');
            if (oldGenerate) oldGenerate.style.display = 'none';
            if (!area.querySelector('.single-offer-copy')) {
                const copy = document.createElement('button');
                copy.type = 'button';
                copy.className = 'single-offer-copy';
                copy.dataset.action = 'copia-singola';
                copy.dataset.id = String(id);
                copy.setAttribute('aria-label', 'Copia descrizione offerta');
                copy.title = 'Copia descrizione';
                copy.innerHTML = '▣';
                area.appendChild(copy);
            }
        });
    }

    function aggiornaDescrizioniSingole() {
        preparaDescrizioniSingole();
        document.querySelectorAll('.offerta-box').forEach((box) => {
            const id = Number(box.id.replace('box-', ''));
            const output = document.getElementById(`output-singolo-${id}`);
            if (!output || typeof getDatiOfferta !== 'function') return;
            const dato = getDatiOfferta(id);
            if (!dato) { output.value = ''; return; }
            const professionista = typeof isProfessionista === 'function' && isProfessionista();
            if (dato.imponibile === 0) {
                const nome = professionista ? `${dato.titolo} ${dato.nomeCaps}` : dato.nomeCaps;
                output.value = `${nome} non ha presentato offerta.`;
                return;
            }
            const suffisso = typeof getSuffissoImporto === 'function' ? getSuffissoImporto(dato.pIva) : (professionista ? '+ oneri professionali + iva' : '+ iva');
            output.value = professionista
                ? `${dato.titolo} ${dato.nomeCaps} ha presentato regolare offerta per un importo di € ${formatEuro(dato.imponibile)} ${suffisso} pari a € ${formatEuro(dato.totale)}.`
                : `La ditta ${dato.nomeCaps} ha presentato regolare offerta per un importo di € ${formatEuro(dato.imponibile)} ${suffisso} pari a € ${formatEuro(dato.totale)}.`;
        });
    }

    document.addEventListener('input', (event) => {
        if (event.target.matches('.nome, .imponibile, .perc-iva, .perc-oneri')) aggiornaDescrizioniSingole();
    });
    document.addEventListener('change', (event) => {
        if (event.target.matches('.titolo, #tipo-globale')) aggiornaDescrizioniSingole();
    });
    document.addEventListener('click', async (event) => {
        const button = event.target.closest('[data-action="copia-singola"]');
        if (!button) return;
        const output = document.getElementById(`output-singolo-${Number(button.dataset.id)}`);
        if (!output?.value) return;
        try { await navigator.clipboard.writeText(output.value); }
        catch { output.focus(); output.select(); document.execCommand('copy'); }
        const old = button.innerHTML;
        button.innerHTML = '✓';
        setTimeout(() => { button.innerHTML = old; }, 1400);
    });

    const observer = new MutationObserver(() => { preparaDescrizioniSingole(); aggiornaDescrizioniSingole(); });
    const list = document.getElementById('offerte-list');
    if (list) observer.observe(list, { childList: true, subtree: true });
    requestAnimationFrame(() => { preparaDescrizioniSingole(); aggiornaDescrizioniSingole(); });
})();
