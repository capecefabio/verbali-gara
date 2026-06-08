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
        let imponibile
