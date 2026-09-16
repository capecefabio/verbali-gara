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

function formatImportoOfferta(dato, options = {}) {
    const compresa = Boolean(options.compresa);
    if (compresa) return `€ ${formatEuro(dato.totale)} iva compresa`;
    return `€ ${formatEuro(dato.imponibile)} ${getSuffissoImporto(dato.pIva)}`;
}

function creaOffertaMarkup(id) {
    return `
        <article class="offerta-box" id="box-${id}">
            <div class="participant-topline">
                <div class="participant-number">${id}</div>
                <div class="participant-meta">
                    <span class="badge">Soggetto ${id}</span>
                    <span class="participant-type">${isProfessionista() ? 'Professionista' : 'Azienda'}</span>
                </div>
            </div>

            <div class="row identity-row">
                <div class="field titolo-field hidden" id="titolo-container-${id}">
                    <label>Titolo</label>
                    <select class="titolo">
                        <option value="L'Arch.">L'Arch.</option>
                        <option value="L'Ing.">L'Ing.</option>
                        <option value="Lo Studio">Lo Studio</option>
                    </select>
                </div>
                <div class="field name-field">
                    <label>Nome / Ragione Sociale</label>
                    <input type="text" class="nome" placeholder="Inserire nome..." autocomplete="organization">
                </div>
            </div>

            <div class="row calculation-row">
                <div class="field imponibile-field">
                    <label>Imponibile</label>
                    <div class="input-with-prefix">
                        <span>€</span>
                        <input type="number" step="0.01" min="0" class="imponibile" placeholder="0,00" inputmode="decimal">
                    </div>
                </div>
                <div class="calc-group">
                    <div class="field oneri-container hidden" id="oneri-container-${id}">
                        <label>Oneri (%)</label>
                        <input type="number" min="0" step="0.01" class="perc-oneri" value="${PERCENTUALE_ONERI_DEFAULT}" inputmode="decimal">
                    </div>
                    <div class="field">
                        <label>IVA (%)</label>
                        <input type="number" min="0" step="0.01" class="perc-iva" value="${PERCENTUALE_IVA_DEFAULT}" inputmode="decimal">
                    </div>
                </div>
                <div class="field totale-field">
                    <label>Totale</label>
                    <input type="text" class="totale" readonly placeholder="€ 0,00">
                </div>
            </div>

            <div class="single-offer-area">
                <button type="button" class="btn-single-offer" data-action="genera-singola" data-id="${id}">
                    Genera descrizione offerta
                </button>
                <textarea class="output-singolo" id="output-singolo-${id}" rows="2" readonly placeholder="La descrizione della singola offerta comparirà qui..."></textarea>
            </div>
        </article>
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

    $$('.participant-type').forEach((elemento) => {
        elemento.textContent = tipo === TIPO_PROFESSIONISTA ? 'Professionista' : 'Azienda';
    });

    aggiornaVisibilitaInterfaccia();
    aggiornaVerbaleLive();
}

function mostraApp(tipo) {
    aggiornaTabTipo(tipo);

    const welcome = $('#welcome-screen');
    const app = $('#app-shell');

    if (welcome) welcome.hidden = true;
    if (app) app.hidden = false;

    requestAnimationFrame(() => {
        app?.classList.add('app-enter');
        $('#computo-ufficio')?.focus({ preventScroll: true });
    });
}

function mostraWelcome() {
    const welcome = $('#welcome-screen');
    const app = $('#app-shell');

    if (app) app.hidden = true;
    if (welcome) welcome.hidden = false;

    requestAnimationFrame(() => {
        welcome?.classList.add('welcome-enter');
        $('.type-card')?.focus({ preventScroll: true });
    });
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
    aggiornaVerbaleLive();
    getBox(nuovoId)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    $(`.nome`, getBox(nuovoId))?.focus();
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
        const box = elemento.closest('.offerta-box');
        if (box) aggiornaTotale(Number(box.id.replace('box-', '')));
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
    totaleField.value = `€ ${formatEuro(totale)}`;
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

    return {
        id,
        titolo: isProfessionista() ? ($('.titolo', box)?.value || '') : 'La ditta',
        nomeCaps: nomeRaw.toUpperCase(),
        imponibile,
        pIva,
        pOneri,
        totale
    };
}

function getSoggetto(dato) {
    return isProfessionista()
        ? `${dato.titolo} ${dato.nomeCaps}`
        : `la ditta ${dato.nomeCaps}`;
}

function generaSingola(id) {
    const dato = getDatiOfferta(id);
    const output = document.getElementById(`output-singolo-${id}`);
    if (!output) return;

    if (!dato) {
        output.value = 'Inserisci il nome del partecipante.';
        return;
    }

    if (dato.imponibile === 0) {
        const nome = isProfessionista()
            ? `${dato.titolo} ${dato.nomeCaps}`
            : dato.nomeCaps;
        output.value = `${nome} non ha presentato offerta.`;
        return;
    }

    const suffisso = getSuffissoImporto(dato.pIva);
    const frase = isProfessionista()
        ? `${dato.titolo} ${dato.nomeCaps} ha presentato regolare offerta per un importo di € ${formatEuro(dato.imponibile)} ${suffisso} pari a € ${formatEuro(dato.totale)}.`
        : `La ditta ${dato.nomeCaps} ha presentato regolare offerta per un importo di € ${formatEuro(dato.imponibile)} ${suffisso} pari a € ${formatEuro(dato.totale)}.`;

    output.value = frase;
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
        : 'non superiore al 5% rispetto alla migliore offerta si ritiene di dover procedere ad una richiesta di riallineamento.';

    return `avendo la seconda offerta (${soggetto} offerta per un importo di ${importo}) uno scostamento rispetto alla prima offerta ${confronto}`;
}

function generaParagrafoComputo(computoUfficio, miglioreOfferta) {
    const differenzaAssoluta = Math.abs(computoUfficio - miglioreOfferta.imponibile);

    if (differenzaAssoluta < SOGLIA_ALLINEAMENTO) {
        return `Si segnala che la miglior offerta è risultata essere allineata al computo di ufficio pari a € ${formatEuro(computoUfficio)}.`;
    }

    const scostamentoPercentuale = ((computoUfficio - miglioreOfferta.imponibile) / computoUfficio) * 100;
    const valoreAssolutoPerc = Math.abs(Math.round(scostamentoPercentuale));
    const direzione = scostamentoPercentuale >= 0 ? 'in meno' : 'superiore';

    return `Si segnala che la miglior offerta presenta uno scostamento di circa il ${valoreAssolutoPerc}% ${direzione} rispetto al computo di ufficio pari a € ${formatEuro(computoUfficio)}.`;
}

function generaParagrafoAssegnazione(miglioreOfferta, scostamento) {
    if (scostamento <= SOGLIA_RIALLINEAMENTO) return '';

    return `Si ritiene pertanto opportuno di assegnare l'attività ${getSoggetto(miglioreOfferta)} che ha presentato offerta per un importo di ${formatImportoOfferta(miglioreOfferta)}.`;
}

function generaTestoVerbale(dati, computoUfficio) {
    if (dati.length < 2 || computoUfficio <= 0) return '';

    const ordinati = [...dati].sort((a, b) => a.imponibile - b.imponibile);
    const [miglioreOfferta, secondaOfferta] = ordinati;
    const scostamento = calcolaScostamento(miglioreOfferta.imponibile, secondaOfferta.imponibile);

    const paragrafi = [
        `Esaminate tutte le offerte la miglior offerta è risultata essere quella ${getSoggetto(miglioreOfferta)} che ha presentato offerta per un importo di ${formatImportoOfferta(miglioreOfferta)}.`,
        'la restante documentazione allegata è regolarmente timbrata e firmata.',
        generaParagrafoRiallineamento(secondaOfferta, scostamento),
        generaParagrafoComputo(computoUfficio, miglioreOfferta),
        generaParagrafoAssegnazione(miglioreOfferta, scostamento)
    ].filter(Boolean);

    return paragrafi.join('\n\n');
}

function aggiornaContatorePartecipanti(numero) {
    const elemento = $('#participants-count');
    if (!elemento) return;
    elemento.textContent = `${numero} ${numero === 1 ? 'partecipante' : 'partecipanti'}`;
}

function escapeHtml(testo) {
    return testo
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#039;');
}

function creaRiepilogoOfferta(dato, posizione) {
    const migliore = posizione === 1;
    const seconda = posizione === 2;
    const classe = migliore ? 'offer-best' : seconda ? 'offer-second' : '';
    const etichetta = migliore ? 'Migliore offerta' : seconda ? 'Seconda offerta' : `Offerta ${posizione}`;

    return `
        <div class="preview-offer ${classe}">
            <div class="preview-offer-rank">${migliore ? '🏆' : seconda ? '🥈' : posizione}</div>
            <div class="preview-offer-content">
                <strong>${escapeHtml(getSoggetto(dato))}</strong>
                <span>${escapeHtml(etichetta)}</span>
                <small>Imponibile: € ${formatEuro(dato.imponibile)} · Totale: € ${formatEuro(dato.totale)}</small>
            </div>
        </div>
    `;
}

function renderAnteprima(dati, computoUfficio) {
    const preview = $('#verbale-preview');
    if (!preview) return;

    aggiornaContatorePartecipanti($$('.offerta-box').length);

    if (dati.length === 0) {
        preview.innerHTML = `
            <div class="preview-empty">
                <div class="empty-icon">✦</div>
                <strong>Inizia inserendo i dati</strong>
                <span>L'anteprima del verbale comparirà qui automaticamente.</span>
            </div>
        `;
        return;
    }

    const ordinati = [...dati].sort((a, b) => a.imponibile - b.imponibile);
    const testo = generaTestoVerbale(dati, computoUfficio);
    const computoValido = computoUfficio > 0;

    const stato = dati.length < 2
        ? 'Inserisci almeno un altro partecipante per completare il verbale.'
        : !computoValido
            ? 'Inserisci il computo di ufficio per completare il verbale.'
            : 'Verbale aggiornato in tempo reale.';

    const testoPreview = testo || `Dati acquisiti per ${dati.length} partecipant${dati.length === 1 ? 'e' : 'i'}. ${stato}`;

    preview.innerHTML = `
        <div class="preview-document">
            <div class="document-eyebrow">VERBALE DI GARA</div>
            <div class="document-status">${escapeHtml(stato)}</div>
            <div class="document-body">
                ${escapeHtml(testoPreview).split('\n\n').map((paragrafo) => `<p>${paragrafo.replaceAll('\n', '<br>')}</p>`).join('')}
            </div>

            <div class="preview-divider"></div>
            <div class="preview-section-title">Classifica offerte</div>
            <div class="preview-offers">
                ${ordinati.map((dato, index) => creaRiepilogoOfferta(dato, index + 1)).join('')}
            </div>

            ${computoValido ? `
                <div class="preview-computo">
                    <span>Computo di ufficio</span>
                    <strong>€ ${formatEuro(computoUfficio)}</strong>
                </div>
            ` : ''}
        </div>
    `;
}

function aggiornaVerbaleLive() {
    const dati = getOfferteValide();
    const computoUfficio = getValoreNumerico($('#computo-ufficio'));
    const testo = generaTestoVerbale(dati, computoUfficio);
    const copia = $('[data-action="copia-finale"]');

    renderAnteprima(dati, computoUfficio);

    if (copia) {
        copia.disabled = !testo;
        copia.setAttribute('aria-disabled', String(!testo));
    }
}

async function copiaVerbale() {
    const dati = getOfferteValide();
    const computoUfficio = getValoreNumerico($('#computo-ufficio'));
    const testo = generaTestoVerbale(dati, computoUfficio);

    if (!testo) return;

    try {
        await navigator.clipboard.writeText(testo);
    } catch {
        const textarea = document.createElement('textarea');
        textarea.value = testo;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();
        document.execCommand('copy');
        textarea.remove();
    }

    const ordinati = [...dati].sort((a, b) => a.imponibile - b.imponibile);
    const miglioreOfferta = ordinati[0];
    window.dispatchEvent(new CustomEvent('airbid-verbale-copiato', {
        detail: {
            testo,
            miglioreOfferta: miglioreOfferta ? (isProfessionista() ? `${miglioreOfferta.titolo} ${miglioreOfferta.nomeCaps}` : miglioreOfferta.nomeCaps) : '',
            tipo: getTipoGlobale()
        }
    }));

    const button = $('[data-action="copia-finale"]');
    if (button) {
        const testoOriginale = button.innerHTML;
        button.innerHTML = '<span aria-hidden="true">✓</span> Verbale copiato';
        button.classList.add('copied');
        setTimeout(() => {
            button.innerHTML = testoOriginale;
            button.classList.remove('copied');
        }, 1800);
    }
}

async function copiaDescrizioneSingola(id) {
    const output = document.getElementById(`output-singolo-${id}`);
    if (!output?.value) return;

    try {
        await navigator.clipboard.writeText(output.value);
    } catch {
        output.focus();
        output.select();
        document.execCommand('copy');
    }

    const button = document.querySelector(`[data-action="copia-singola"][data-id="${id}"]`);
    if (button) {
        const testoOriginale = button.textContent;
        button.textContent = '✓ Copiata';
        setTimeout(() => { button.textContent = testoOriginale; }, 1500);
    }
}

function gestisciInput(evento) {
    const campo = evento.target;
    if (campo.matches('.imponibile, .perc-iva, .perc-oneri')) {
        const box = campo.closest('.offerta-box');
        if (box) aggiornaTotale(Number(box.id.replace('box-', '')));
    }

    if (campo.matches('.nome, .imponibile, .perc-iva, .perc-oneri, #computo-ufficio')) {
        aggiornaVerbaleLive();
    }
}

function gestisciChange(evento) {
    if (evento.target.matches('.titolo, #tipo-globale')) {
        if (evento.target.id === 'tipo-globale') {
            aggiornaTabTipo(evento.target.value);
        } else {
            aggiornaVerbaleLive();
        }
    }
}

function gestisciClick(evento) {
    const segmento = evento.target.closest('.segment');
    if (segmento) {
        aggiornaTabTipo(segmento.dataset.tipo);
        return;
    }

    const pulsante = evento.target.closest('[data-action]');
    if (!pulsante) return;

    const action = pulsante.dataset.action;

    if (action === 'scegli-tipo') {
        mostraApp(pulsante.dataset.tipo);
        return;
    }

    if (action === 'cambia-tipo') {
        mostraWelcome();
        return;
    }

    if (action === 'aggiungi-partecipante') {
        aggiungiPartecipante();
        return;
    }

    if (action === 'genera-singola') {
        generaSingola(Number(pulsante.dataset.id));
        return;
    }

    if (action === 'copia-singola') {
        copiaDescrizioneSingola(Number(pulsante.dataset.id));
        return;
    }

    if (action === 'copia-finale') copiaVerbale();
}

function inizializza() {
    renderOfferte();

    const tipoGlobale = $('#tipo-globale');
    if (tipoGlobale) tipoGlobale.addEventListener('change', gestisciChange);

    document.addEventListener('input', gestisciInput);
    document.addEventListener('change', gestisciChange);
    document.addEventListener('click', gestisciClick);

    aggiornaTabTipo(getTipoGlobale() || 'La ditta');
    $$('.offerta-box').forEach((box) => {
        aggiornaTotale(Number(box.id.replace('box-', '')));
    });
    aggiornaVerbaleLive();
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', inizializza, { once: true });
} else {
    inizializza();
}