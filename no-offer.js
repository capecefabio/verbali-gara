(() => {
    // Mantiene la dicitura "La ditta" davanti al nome delle aziende
    // anche nel verbale finale e nelle descrizioni che usano getSoggetto().
    window.getSoggetto = function (dato) {
        return isProfessionista()
            ? `${dato.titolo} ${dato.nomeCaps}`
            : `La ditta ${dato.nomeCaps}`;
    };

    function getTuttiPartecipantiNoOfferta() {
        return $$('.offerta-box')
            .map((box) => Number(box.id.replace('box-', '')))
            .filter(Number.isFinite)
            .map((id) => {
                const box = getBox(id);
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
                    totale,
                    haPresentatoOfferta: imponibile > 0
                };
            })
            .filter(Boolean);
    }

    function getNomePartecipanteNoOfferta(dato) {
        return isProfessionista()
            ? `${dato.titolo} ${dato.nomeCaps}`
            : dato.nomeCaps;
    }

    function generaParagrafoMancataOffertaNoOfferta() {
        const mancanti = getTuttiPartecipantiNoOfferta().filter((dato) => !dato.haPresentatoOfferta);
        if (mancanti.length === 0) return '';

        const nomi = mancanti.map(getNomePartecipanteNoOfferta);

        if (nomi.length === 1) {
            return `${nomi[0]} non ha presentato offerta.`;
        }

        if (nomi.length === 2) {
            return `${nomi[0]} e ${nomi[1]} non hanno presentato offerta.`;
        }

        return `${nomi.slice(0, -1).join(', ')} e ${nomi[nomi.length - 1]} non hanno presentato offerta.`;
    }

    // Solo i partecipanti con imponibile > 0 entrano nella classifica delle offerte.
    window.getOfferteValide = function () {
        return getTuttiPartecipantiNoOfferta().filter((dato) => dato.haPresentatoOfferta);
    };

    // Il verbale può essere generato anche con una sola offerta valida.
    window.generaTestoVerbale = function (dati, computoUfficio) {
        if (dati.length < 1 || computoUfficio <= 0) return '';

        const ordinati = [...dati].sort((a, b) => a.imponibile - b.imponibile);
        const [miglioreOfferta, secondaOfferta] = ordinati;
        const paragrafi = [
            `Esaminate tutte le offerte la miglior offerta è risultata essere quella ${getSoggetto(miglioreOfferta)} che ha presentato offerta per un importo di ${formatImportoOfferta(miglioreOfferta)}.`,
            'la restante documentazione allegata è regolarmente timbrata e firmata.'
        ];

        if (secondaOfferta) {
            const scostamento = calcolaScostamento(miglioreOfferta.imponibile, secondaOfferta.imponibile);
            paragrafi.push(generaParagrafoRiallineamento(secondaOfferta, scostamento));
            paragrafi.push(generaParagrafoAssegnazione(miglioreOfferta, scostamento));
        }

        paragrafi.push(generaParagrafoComputo(computoUfficio, miglioreOfferta));
        paragrafi.push(generaParagrafoMancataOffertaNoOfferta());

        return paragrafi.filter(Boolean).join('\n\n');
    };

    function aggiornaMessaggiMancataOfferta() {
        $$('.offerta-box').forEach((box) => {
            let messaggio = $('.mancata-offerta', box);
            if (!messaggio) {
                messaggio = document.createElement('div');
                messaggio.className = 'mancata-offerta';
                $('.calculation-row', box)?.appendChild(messaggio);
            }

            const nome = $('.nome', box)?.value.trim() || '';
            const imponibile = getValoreNumerico($('.imponibile', box));
            const dato = nome
                ? getTuttiPartecipantiNoOfferta().find((item) => item.id === Number(box.id.replace('box-', '')))
                : null;

            if (dato && imponibile === 0) {
                messaggio.textContent = `${getNomePartecipanteNoOfferta(dato)} non ha presentato offerta`;
                messaggio.classList.add('visible');
                box.classList.add('no-offer');
            } else {
                messaggio.textContent = '';
                messaggio.classList.remove('visible');
                box.classList.remove('no-offer');
            }
        });
    }

    document.addEventListener('input', () => {
        aggiornaMessaggiMancataOfferta();
    });

    document.addEventListener('change', () => {
        aggiornaMessaggiMancataOfferta();
    });

    const observer = new MutationObserver(() => aggiornaMessaggiMancataOfferta());
    const offerte = $('#offerte-list');
    if (offerte) observer.observe(offerte, { childList: true });

    requestAnimationFrame(aggiornaMessaggiMancataOfferta);
})();