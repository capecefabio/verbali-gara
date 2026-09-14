const TIPO_PROFESSIONISTA = 'Il professionista';
const NUMERO_OFFERTE_INIZIALI = 3;
const SOGLIA_RIALLINEAMENTO = 5;
const SOGLIA_ALLINEAMENTO = 200;
const PERCENTUALE_ONERI_DEFAULT = 4;
const PERCENTUALE_IVA_DEFAULT = 22;

const $ = (selector, parent = document) => parent.querySelector(selector);
const $$ = (selector, parent = document) => [...parent.querySelectorAll(selector)];

function getTipoGlobale() {
    return $('#tipo-globale')?.value || '';
}

function isProfessionista() {
    return getTipoGlobale() === TIPO_PROFESSIONISTA;
}

function getBox(id) {
    return document.getElementById(`box-${id}`);
}

function getValoreNumerico(elemento) {
    const valore = Number.parseFloat(elemento?.value);
    return Number.isFinite(valore) ? valore : 0;
}

function formatEuro(valore) {
    return new Intl.NumberFormat('it-IT', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(valore);
}

function calcolaImporti(imponibile, pIva, pOneri = 0, professionista = isProfessionista()) {
    const oneri = professionista ? imponibile * (pOneri / 100) : 0;
    const baseIva = imponibile + oneri;
    const iva = baseIva * (pIva / 100);

    return {
        imponibile,
        oneri,
        iva,
        totale: baseIva + iva
    };
}

function getIvaLabel(pIva, professionista = isProfessionista()) {
    return professionista && pIva === 0 ? 'iva esente' : 'iva';
}

function getSuffissoImporto(pIva, professionista = isProfessionista()) {
    const ivaLabel = getIvaLabel(pIva, professionista);
    return professionista ? `+ oneri professionali + ${ivaLabel}` : `+ ${ivaLabel}`;
}

function creaOffertaMarkup(id) {
    return `
        <div class="offerta-box" id="box-${id}">
            <span class="badge">Soggetto ${id}</span>
            <div class="row">
                <div class="field titolo-field" id="titolo-container-${id}">
                    <label>Titolo</label>
                    <select class="titolo">
                        <option value="L'Arch.">L'Arch.</option>
                        <option value="L'Ing.">L'Ing.</option>
                        <option value="Lo Studio">Lo Studio</option>
                    </select>
                </div>
                <div class="field">
                    <label>Nome / Ragione Sociale</label>
                    <input type="text" class="nome" placeholder="Inserire nome..." autocomplete="organization">
                </div>
            </div>
            <div class="row">
                <div class="field">
                    <label>Imponibile (€)</label>
                    <input type="number" step="0.01" min="0" class="imponibile" placeholder="0.00" inputmode="decimal">
                </div>
                <div class="calc-group">
                    <div class="field oneri-container" id="oneri-container-${id}">
                        <label>Oneri (%)</label>
                        <input type="number" min="0" step="0.01" class="perc-oneri" value="${PERCENTUALE_ONERI_DEFAULT}" inputmode="decimal">
                    </div>
                    <div class="field">
                        <label>IVA (%)</label>
                        <input type="number" min="0" step="0.01" class="perc-iva" value="${PERCENTUALE_IVA_DEFAULT}" inputmode="decimal">
                    </div>
                </div>
                <div class="field totale-field">
                    <label>Totale Calcolato (€)</label>
                    <input type="number" step="0.01" class="totale" readonly placeholder="0.00">
                </div>
            </div>
            <div class="btn-group-singolo">
                <button type="button" class="btn-small" data-action="genera-singola" data-id="${id}">Genera descrizione</button>
                <button type="button" class="btn-small btn-copy-mini" data-action="copia-singola" data-id="${id}">Copia testo</button>
            </div>
            <textarea id="output-singolo-${id}" class="output-singolo" placeholder="La descrizione apparirà qui..." readonly></textarea>
        </div>
    `;
}

function renderOfferte() {
    const container = $('#offerte-list');
    if (!container) return;

    container.innerHTML = Array.from(
        { length: NUMERO_OFFERTE_INIZIALI },
        (_, index) => creaOffertaMarkup(index + 1)
    ).join('');
}

function aggiornaTabTipo(tipo) {
    const tipoGlobale = $('#tipo-globale');
    if (tipoGlobale) tipoGlobale.value = tipo;

    $$('.segment').forEach((segmento) => {
        const attivo = segmento.dataset.tipo === tipo;
        segmento.classList.toggle('active', attivo);
        segmento.setAttribute('aria-selected', String(attivo));
    });

    aggiornaVisibilitaInterfaccia();
}

function aggiungiPartecipante() {
    const container = $('#offerte-list');
    if (!container) return;

    const ids = $$('.offerta-box', container)
        .map((box) => Number(box.id.replace('box-', '')))
        .filter(Number.isFinite);

    const nuovoId = ids.length > 0 ? Math.max(...ids) + 1 : 1;
    container.insertAdjacentHTML('beforeend', creaOffertaMarkup(nuovoId));

    aggiornaVisibilitaInterfaccia();
    getBox(nuovoId)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function aggiornaVisibilitaInterfaccia() {
    const professionista = isProfessionista();

    $$('.titolo-field').forEach((elemento) => {
        elemento.classList.toggle('hidden', !professionista);
    });

    $$('.oneri-container').forEach((elemento) => {
        elemento.classList.toggle('hidden', !professionista);
    });

    $$('.imponibile, .perc-iva, .perc-oneri').forEach((elemento) => {
        elemento.dispatchEvent(new Event('input', { bubbles: true }));
    });
}

function aggiornaTotale(id) {
    const box = getBox(id);
    if (!box) return;

    const imponibile = getValoreNumerico($('.imponibile', box));
    const pIva = getValoreNumerico($('.perc-iva', box));
    const pOneri = getValoreNumerico($('.perc-oneri', box));
    const totaleField = $('.totale', box);

    if (!totaleField) return;

    const { totale } = calcolaImporti(imponibile, pIva, pOneri);
    totaleField.value = totale.toFixed(2);
}

function calcolaTotale(id) {
    aggiornaTotale(id);
}

function getDatiOfferta(id) {
    const box = getBox(id);
    if (!box) return null;

    const nomeRaw = $('.nome', box)?.value.trim() || '';
    if (!nomeRaw) return null;

    const pIva = getValoreNumerico($('.perc-iva', box));
    const pOneri = getValoreNumerico($('.perc-oneri', box));
    const imponibile = getValoreNumerico($('.imponibile', box));
    const { totale } = calcolaImporti(imponibile, pIva, pOneri);

    const dato = {
        id,
        titolo: isProfessionista() ? ($('.titolo', box)?.value || '') : 'La ditta',
        nomeCaps: nomeRaw.toUpperCase(),
        imponibile,
        pIva,
        pOneri,
        totale
    };

    const totaleField = $('.totale', box);
    if (totaleField) totaleField.value = totale.toFixed(2);

    return dato;
}

function getSoggetto(dato) {
    return isProfessionista()
        ? `${dato.titolo} ${dato.nomeCaps}`
        : `la ditta ${dato.nomeCaps}`;
}

function formatImportoOfferta(dato, { compresa = false } = {}) {
    const suffisso = getSuffissoImporto(dato.pIva);
    const ivaCompresa = compresa && !(isProfessionista() && dato.pIva === 0)
        ? ' iva compresa'
        : '';

    return `€ ${formatEuro(dato.imponibile)} ${suffisso} pari a € ${formatEuro(dato.totale)}${ivaCompresa}`;
}

function generaSingola(id) {
    const dato = getDatiOfferta(id);
    if (!dato) return;

    const descrizione = `${getSoggetto(dato)} ha presentato regolare offerta per un importo di ${formatImportoOfferta(dato)}.`;
    const output = document.getElementById(`output-singolo-${id}`);

    if (output) output.value = descrizione;
}

function getOfferteValide() {
    return $$('.offerta-box')
        .map((box) => Number(box.id.replace('box-', '')))
        .filter(Number.isFinite)
        .map((id) => getDatiOfferta(id))
        .filter(Boolean);
}

function calcolaScostamento(primo, secondo) {
    if (primo === 0) return 0;
    return ((secondo - primo) / primo) * 100;
}

function generaParagrafoRiallineamento(secondaOfferta, scostamento) {
    const soggetto = getSoggetto(secondaOfferta);
    const importo = formatImportoOfferta(secondaOfferta, { compresa: true });
    const confronto = scostamento > SOGLIA_RIALLINEAMENTO
        ? 'superiore al 5% rispetto alla migliore offerta non si ritiene di dover procedere ad una richiesta di riallineamento.'
        : 'inferiore al 5% rispetto alla migliore offerta si ritiene di dover procedere ad una richiesta di riallineamento.';

    return `avendo la seconda offerta (${soggetto} offerta per un importo di ${importo}) uno scostamento rispetto alla prima offerta ${confronto}\n`;
}

function generaParagrafoComputo(computoUfficio, miglioreOfferta) {
    const differenzaAssoluta = Math.abs(computoUfficio - miglioreOfferta.imponibile);

    if (differenzaAssoluta < SOGLIA_ALLINEAMENTO) {
        return `Si segnala che la miglior offerta è risultata essere allineata al computo di ufficio pari a € ${formatEuro(computoUfficio)}.\n`;
    }

    const scostamentoPercentuale = ((computoUfficio - miglioreOfferta.imponibile) / computoUfficio) * 100;
    const valoreAssolutoPerc = Math.abs(Math.round(scostamentoPercentuale));
    const direzione = scostamentoPercentuale >= 0 ? 'in meno' : 'superiore';

    return `Si segnala che la miglior offerta presenta uno scostamento di circa il ${valoreAssolutoPerc}% ${direzione} rispetto al computo di ufficio pari a € ${formatEuro(computoUfficio)}.\n`;
}

function generaParagrafoAssegnazione(miglioreOfferta, scostamento) {
    if (scostamento <= SOGLIA_RIALLINEAMENTO) return '';

    return `Si ritiene pertanto opportuno di assegnare l'attività ${getSoggetto(miglioreOfferta)} che ha presentato offerta per un importo di ${formatImportoOfferta(miglioreOfferta)}.`;
}

function generaVerbale() {
    const computoUfficio = getValoreNumerico($('#computo-ufficio'));
    const dati = getOfferteValide();

    if (dati.length < 2) {
        alert('Inserisci almeno 2 soggetti.');
        return;
    }

    if (computoUfficio <= 0) {
        alert('Inserisci il valore del computo di ufficio.');
        return;
    }

    dati.sort((a, b) => a.imponibile - b.imponibile);

    const [miglioreOfferta, secondaOfferta] = dati;
    const scostamento = calcolaScostamento(miglioreOfferta.imponibile, secondaOfferta.imponibile);

    const paragrafi = [
        `Esaminate tutte le offerte la miglior offerta è risultata essere quella ${getSoggetto(miglioreOfferta)} che ha presentato offerta per un importo di ${formatImportoOfferta(miglioreOfferta)}.`,
        'la restante documentazione allegata è regolarmente timbrata e firmata.',
        generaParagrafoRiallineamento(secondaOfferta, scostamento),
        generaParagrafoComputo(computoUfficio, miglioreOfferta),
        generaParagrafoAssegnazione(miglioreOfferta, scostamento)
    ].filter(Boolean);

    const testo = paragrafi.join('\n');
    const output = $('#output-testo-confronto');
    const risultato = $('#risultato-finale');

    if (output) output.value = testo;
    if (risultato) {
        risultato.classList.remove('hidden');
        risultato.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
}

async function copiaTesto(id) {
    const elemento = document.getElementById(id);
    if (!elemento?.value) return;

    try {
        await navigator.clipboard.writeText(elemento.value);
    } catch {
        elemento.focus();
        elemento.select();
        document.execCommand('copy');
    }

    alert('Copiato!');
}

function gestisciInput(evento) {
    const campo = evento.target.closest('.imponibile, .perc-iva, .perc-oneri');
    if (!campo) return;

    const box = campo.closest('.offerta-box');
    if (box) aggiornaTotale(Number(box.id.replace('box-', '')));
}

function gestisciClick(evento) {
    const segmento = evento.target.closest('.segment');
    if (segmento) {
        aggiornaTabTipo(segmento.dataset.tipo);
        return;
    }

    const pulsante = evento.target.closest('[data-action]');
    if (!pulsante) return;

    const id = Number(pulsante.dataset.id);
    const action = pulsante.dataset.action;

    if (action === 'aggiungi-partecipante') aggiungiPartecipante();
    if (action === 'genera-singola') generaSingola(id);
    if (action === 'copia-singola') copiaTesto(`output-singolo-${id}`);
    if (action === 'genera-verbale') generaVerbale();
    if (action === 'copia-finale') copiaTesto('output-testo-confronto');
}

function inizializza() {
    renderOfferte();

    const tipoGlobale = $('#tipo-globale');
    if (tipoGlobale) tipoGlobale.addEventListener('change', aggiornaVisibilitaInterfaccia);

    document.addEventListener('input', gestisciInput);
    document.addEventListener('click', gestisciClick);

    aggiornaTabTipo(getTipoGlobale() || 'La ditta');
    $$('.offerta-box').forEach((box) => {
        aggiornaTotale(Number(box.id.replace('box-', '')));
    });
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', inizializza, { once: true });
} else {
    inizializza();
}
