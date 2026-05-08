function toggleInterfaccia() {
    const tipo = document.getElementById('tipo-globale').value;
    for (let i = 1; i <= 3; i++) {
        const oneriCont = document.getElementById(`oneri-container-${i}`);
        const titoloCont = document.getElementById(`titolo-container-${i}`);
        if (oneriCont) oneriCont.style.display = (tipo === "Il professionista") ? 'flex' : 'none';
        if (titoloCont) titoloCont.style.display = (tipo === "Il professionista") ? 'block' : 'none';
        calcolaTotale(i);
    }
}

function calcolaTotale(id) {
    const box = document.getElementById(`box-${id}`);
    if (!box) return;
    const tipo = document.getElementById('tipo-globale').value;
    const imponibile = parseFloat(box.querySelector('.imponibile').value) || 0;
    const pIva = parseFloat(box.querySelector('.perc-iva').value) || 0;
    const totaleField = box.querySelector('.totale');

    if (tipo === "Il professionista") {
        const pOneri = parseFloat(box.querySelector('.perc-oneri').value) || 0;
        const oneri = imponibile * (pOneri / 100);
        const imponibilePiuOneri = imponibile + oneri;
        const iva = imponibilePiuOneri * (pIva / 100);
        totaleField.value = (imponibilePiuOneri + iva).toFixed(2);
    } else {
        const iva = imponibile * (pIva / 100);
        totaleField.value = (imponibile + iva).toFixed(2);
    }
}

function formatEuro(valore) {
    return new Intl.NumberFormat('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(valore);
}

function generaSingola(id) {
    const box = document.getElementById(`box-${id}`);
    const tipo = document.getElementById('tipo-globale').value;
    const nomeRaw = box.querySelector('.nome').value.trim() || `SOGGETTO ${id}`;
    const nomeCaps = nomeRaw.toUpperCase();
    const imponibile = parseFloat(box.querySelector('.imponibile').value) || 0;
    const totale = parseFloat(box.querySelector('.totale').value) || 0;

    let frase = "";
    if (tipo === "Il professionista") {
        const titolo = box.querySelector('.titolo').value;
        frase = `${titolo} ${nomeCaps} ha presentato regolare offerta per un importo di € ${formatEuro(imponibile)} + oneri professionali + iva pari a € ${formatEuro(totale)} iva compresa.`;
    } else {
        frase = `La ditta ${nomeCaps} ha presentato regolare offerta per un importo di € ${formatEuro(imponibile)} + iva pari a € ${formatEuro(totale)} iva compresa.`;
    }
    document.getElementById(`output-singolo-${id}`).value = frase;
}

function generaVerbale() {
    const tipoGlobale = document.getElementById('tipo-globale').value;
    const computoUfficio = parseFloat(document.getElementById('computo-ufficio').value) || 0;
    let dati = [];

    for (let i = 1; i <= 3; i++) {
        const b = document.getElementById(`box-${i}`);
        if (!b) continue;
        let nomeRaw = b.querySelector('.nome').value.trim();
        if (nomeRaw === "") continue;

        let titoloVal = (tipoGlobale === "Il professionista") ? b.querySelector('.titolo').value : "La ditta";
        let nomeCaps = nomeRaw.toUpperCase();
        let imponibile = parseFloat(b.querySelector('.imponibile').value) || 0;
        let totale = parseFloat(b.querySelector('.totale').value) || 0;

        dati.push({ titolo: titoloVal, nomeCaps, imponibile, totale });
    }

    if (dati.length < 2) { alert("Inserisci almeno 2 soggetti."); return; }
    if (computoUfficio <= 0) { alert("Inserisci il valore del computo di ufficio."); return; }

    dati.sort((a, b) => a.imponibile - b.imponibile);
    let m1 = dati[0], m2 = dati[1];
    let scostamentoTraOfferte = ((m2.imponibile - m1.imponibile) / m1.imponibile) * 100;
    
    let testo = "";
    let suff_iva = (tipoGlobale === "Il professionista" ? "+ oneri professionali + iva" : "+ iva");

    if (scostamentoTraOfferte > 5) {
        let soggettoVincitore = (tipoGlobale === "Il professionista") ? `${m1.titolo} ${m1.nomeCaps}` : `della ditta ${m1.nomeCaps}`;
        testo = `Esaminate tutte le offerte la miglior offerta è risultata essere quella ${soggettoVincitore} che ha presentato offerta per un importo di € ${formatEuro(m1.imponibile)} ${suff_iva} pari a € ${formatEuro(m1.totale)} iva compresa.\n`;
        testo += `la restante documentazione allegata è regolarmente timbrata e firmata.\n`;
        let secondoSoggetto = (tipoGlobale === "Il professionista") ? `${m2.titolo} ${m2.nomeCaps}` : `ditta ${m2.nomeCaps}`;
        testo += `avendo la seconda offerta (${secondoSoggetto} offerta per un importo di € ${formatEuro(m2.imponibile)} ${suff_iva} pari a € ${formatEuro(m2.totale)} iva compresa.) uno scostamento rispetto alla prima offerta superiore al 5% rispetto alla migliore offerta non si ritiene di dover procedere ad una richiesta di riallineamento.\n`;
    } else {
        let miglioriOfferte = (tipoGlobale === "Il professionista") ? `dell'${m1.titolo} ${m1.nomeCaps} e quella dell'${m2.titolo} ${m2.nomeCaps}` : `della ditta ${m1.nomeCaps} e quella della ditta ${m2.nomeCaps}`;
        testo = `Esaminate tutte le offerte le migliori offerte risultano essere quelle ${miglioriOfferte} che hanno presentato le seguenti offerte:\n`;
        let d1 = (tipoGlobale === "Il professionista") ? `${m1.titolo} ${m1.nomeCaps}` : `La ditta ${m1.nomeCaps}`;
        let d2 = (tipoGlobale === "Il professionista") ? `${m2.titolo} ${m2.nomeCaps}` : `La ditta ${m2.nomeCaps}`;
        testo += `${d1} ha presentato offerta per un importo di € ${formatEuro(m1.imponibile)} ${suff_iva} pari a € ${formatEuro(m1.totale)} iva compresa.\n`;
        testo += `${d2} ha presentato offerta per un importo di € ${formatEuro(m2.imponibile)} ${suff_iva} pari a € ${formatEuro(m2.totale)} iva compresa.\n`;
        testo += `la restante documentazione allegata è regolarmente timbrata e firmata.\n`;
        testo += `avendo le due offerte uno scostamento inferiore al 5% si ritiene di dover procedere ad una richiesta di riallineamento.\n`;
        if (dati[2]) {
            let m3 = dati[2];
            let d3 = (tipoGlobale === "Il professionista") ? `L'offerta dell'${m3.titolo} ${m3.nomeCaps}` : `L'offerta della ditta ${m3.nomeCaps}`;
            testo += `${d3} ha presentato offerta per un importo di € ${formatEuro(m3.imponibile)} ${suff_iva} pari a € ${formatEuro(m3.totale)} iva compresa risulta essere superiore del ${((m3.imponibile - m1.imponibile) / m1.imponibile * 100).toFixed(2)}%.\n`;
        }
    }

    let differenzaAssoluta = Math.abs(computoUfficio - m1.totale);
    
    if (differenzaAssoluta < 200) {
        testo += `Si segnala che la miglior offerta è risultata essere allineata al computo di ufficio pari a € ${formatEuro(computoUfficio)}.\n`;
    } else {
        let scostamentoPercentuale = ((computoUfficio - m1.totale) / computoUfficio) * 100;
        let valoreAssolutoPerc = Math.abs(Math.round(scostamentoPercentuale));
        let direzione = (scostamentoPercentuale >= 0) ? "in meno" : "superiore";
        
        testo += `Si segnala che la miglior offerta presenta uno scostamento di circa il ${valoreAssolutoPerc}% ${direzione} rispetto al computo di ufficio pari a € ${formatEuro(computoUfficio)}.\n`;
    }
    
    if (scostamentoTraOfferte > 5) {
        let assegnatario = (tipoGlobale === "Il professionista") ? `${m1.titolo} ${m1.nomeCaps}` : `alla ditta ${m1.nomeCaps}`;
        testo += `Si ritiene pertanto opportuno di assegnare l'attività ${assegnatario} che ha presentato offerta per un importo di € ${formatEuro(m1.imponibile)} ${suff_iva} pari a € ${formatEuro(m1.totale)} iva compresa.`;
    }

    const resContainer = document.getElementById('risultato-finale');
    document.getElementById('output-testo-confronto').value = testo;
    resContainer.style.display = 'block';
    window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
}

function copiaTesto(id) {
    const el = document.getElementById(id);
    if (!el || !el.value) return;
    el.select();
    document.execCommand("copy");
    alert("Copiato!");
}
