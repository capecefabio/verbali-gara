const TIPO_PROFESSIONISTA = "Il professionista";
const NUMERO_OFFERTE = 3;

function getTipoGlobale() {
    return document.getElementById('tipo-globale')?.value || '';
}

function isProfessionista() {
    return getTipoGlobale() === TIPO_PROFESSIONISTA;
}

function getBox(id) {
    return document.getElementById(`box-${id}`);
}

function getValoreNumerico(elemento) {
    return parseFloat(elemento?.value) || 0;
}

function getIvaLabel(percentualeIva) {
    return percentualeIva === 0 ? 'iva esente' : 'iva';
}

function getSuffissoImporto(percentualeIva, professionista = isProfessionista()) {
    const ivaLabel = getIvaLabel(percentualeIva);
    return professionista ? `+ oneri professionali + ${ivaLabel}` : `+ ${ivaLabel}`;
}

function toggleInterfaccia() {
    const professionista = isProfessionista();

    for (let i = 1; i <= NUMERO_OFFERTE; i++) {
        const oneriCont = document.getElementById(`oneri-container-${i}`);
        const titoloCont = document.getElementById(`titolo-container-${i}`);

        if (oneriCont) oneriCont.style.display = professionista ? 'flex' : 'none';
        if (titoloCont) titoloCont.style.display = professionista ? 'block' : 'none';

        calcolaTotale(i);
    }
}

function calcolaTotale(id) {
    const box = getBox(id);
    if (!box) return;

    const imponibile = getValoreNumerico(box.querySelector('.imponibile'));
    const pIva = getValoreNumerico(box.querySelector('.perc-iva'));
    const totaleField = box.querySelector('.totale');

    if (!totaleField) return;

    let baseTotale = imponibile;

    if (isProfessionista()) {
        const pOneri = getValoreNumerico(box.querySelector('.perc-oneri'));
        baseTotale += imponibile * (pOneri / 100);
    }

    const iva = baseTotale * (pIva / 100);
    totaleField.value = (baseTotale + iva).toFixed(2);
}

function formatEuro(valore) {
    return new Intl.NumberFormat('it-IT', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(valore);
}

function getDatiOfferta(id) {
    const box = getBox(id);
    if (!box) return null;

    const nomeRaw = box.querySelector('.nome')?.value.trim() || '';
    if (!nomeRaw) return null;

    return {
        titolo: isProfessionista() ? (box.querySelector('.titolo')?.value || '') : 'La ditta',
        nomeCaps: nomeRaw.toUpperCase(),
        imponibile: getValoreNumerico(box.querySelector('.imponibile')),
        totale: getValoreNumerico(box.querySelector('.totale')),
        pIva: getValoreNumerico(box.querySelector('.perc-iva'))
    };
}

function getSoggetto(dato) {
    return isProfessionista()
        ? `${dato.titolo} ${dato.nomeCaps}`
        : `la ditta ${dato.nomeCaps}`;
}

function generaSingola(id) {
    const dato = getDatiOfferta(id);
    if (!dato) return;

    const suffisso = getSuffissoImporto(dato.pIva);
    const frase = isProfessionista()
        ? `${dato.titolo} ${dato.nomeCaps} ha presentato regolare offerta per un importo di € ${formatEuro(dato.imponibile)} ${suffisso} pari a € ${formatEuro(dato.totale)}.`
        : `La ditta ${dato.nomeCaps} ha presentato regolare offerta per un importo di € ${formatEuro(dato.imponibile)} ${suffisso} pari a € ${formatEuro(dato.totale)}.`;

    const output = document.getElementById(`output-singolo-${id}`);
    if (output) output.value = frase;
}

function generaVerbale() {
    const computoUfficio = getValoreNumerico(document.getElementById('computo-ufficio'));
    const dati = [];

    for (let i = 1; i <= NUMERO_OFFERTE; i++) {
        const dato = getDatiOfferta(i);
        if (dato) dati.push(dato);
    }

    if (dati.length < 2) {
        alert('Inserisci almeno 2 soggetti.');
        return;
    }

    if (computoUfficio <= 0) {
        alert('Inserisci il valore del computo di ufficio.');
        return;
    }

    dati.sort((a, b) => a.imponibile - b.imponibile);

    const [m1, m2] = dati;
    const scostamentoTraOfferte = m1.imponibile > 0
        ? ((m2.imponibile - m1.imponibile) / m1.imponibile) * 100
        : 0;

    const suffIvaM1 = getSuffissoImporto(m1.pIva);
    const suffIvaM2 = getSuffissoImporto(m2.pIva);
    const sogg1 = getSoggetto(m1);
    const sogg2 = getSoggetto(m2);

    let testo = `Esaminate tutte le offerte la miglior offerta è risultata essere quella ${sogg1} che ha presentato offerta per un importo di € ${formatEuro(m1.imponibile)} ${suffIvaM1} pari a € ${formatEuro(m1.totale)}.\n`;
    testo += `la restante documentazione allegata è regolarmente timbrata e firmata.\n`;

    const suffIvaConCompresaM2 = `${suffIvaM2} pari a € ${formatEuro(m2.totale)}${m2.pIva === 0 ? '' : ' iva compresa'}.`;
    if (scostamentoTraOfferte > 5) {
        testo += `avendo la seconda offerta (${sogg2} offerta per un importo di € ${formatEuro(m2.imponibile)} ${suffIvaConCompresaM2}) uno scostamento rispetto alla prima offerta superiore al 5% rispetto alla migliore offerta non si ritiene di dover procedere ad una richiesta di riallineamento.\n`;
    } else {
        testo += `avendo la seconda offerta (${sogg2} offerta per un importo di € ${formatEuro(m2.imponibile)} ${suffIvaConCompresaM2}) uno scostamento rispetto alla prima offerta inferiore al 5% rispetto alla migliore offerta si ritiene di dover procedere ad una richiesta di riallineamento.\n`;
    }

    const differenzaAssoluta = Math.abs(computoUfficio - m1.imponibile);

    if (differenzaAssoluta < 200) {
        testo += `Si segnala che la miglior offerta è risultata essere allineata al computo di ufficio pari a € ${formatEuro(computoUfficio)}.\n`;
    } else {
        const scostamentoPercentuale = ((computoUfficio - m1.imponibile) / computoUfficio) * 100;
        const valoreAssolutoPerc = Math.abs(Math.round(scostamentoPercentuale));
        const direzione = scostamentoPercentuale >= 0 ? 'in meno' : 'superiore';

        testo += `Si segnala che la miglior offerta presenta uno scostamento di circa il ${valoreAssolutoPerc}% ${direzione} rispetto al computo di ufficio pari a € ${formatEuro(computoUfficio)}.\n`;
    }

    if (scostamentoTraOfferte > 5) {
        const assegnatario = getSoggetto(m1);
        testo += `Si ritiene pertanto opportuno di assegnare l'attività ${assegnatario} che ha presentato offerta per un importo di € ${formatEuro(m1.imponibile)} ${suffIvaM1} pari a € ${formatEuro(m1.totale)}.`;
    }

    const resContainer = document.getElementById('risultato-finale');
    const output = document.getElementById('output-testo-confronto');

    if (output) output.value = testo;
    if (resContainer) {
        resContainer.style.display = 'block';
        window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
    }
}

function copiaTesto(id) {
    const el = document.getElementById(id);
    if (!el?.value) return;

    if (navigator.clipboard?.writeText) {
        navigator.clipboard.writeText(el.value)
            .then(() => alert('Copiato!'))
            .catch(() => copiaTestoLegacy(el));
        return;
    }

    copiaTestoLegacy(el);
}

function copiaTestoLegacy(el) {
    el.select();
    document.execCommand('copy');
    alert('Copiato!');
}
