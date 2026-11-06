import type { Metadata } from "next";
import Link from "next/link";
import { FAIRMARK_SCALE } from "@truevsad/true-cost";
import { COMPANY, EMAILS } from "@/lib/company";
import { SELLER_LANGUAGE_ALTERNATES, SellerLanguages } from "@/components/SellerLanguages";

export const metadata: Metadata = {
  title: "Per strutture ricettive e venditori — TrueVsAd",
  description:
    "Piccoli hotel, B&B, pensioni e venditori di vacanze con prezzi completi possono unirsi a TrueVsAd come Fair Seller. L'adesione è gratuita; i venditori Gold non pagano nulla.",
  alternates: { languages: SELLER_LANGUAGE_ALTERNATES },
};

/**
 * Italian translation of /sellers, for hotel owners. The English page is the official version:
 * any change there must be made here on the same day, and checked by a native speaker.
 */
export default function SellersItalianPage() {
  return (
    <main lang="it">
      <SellerLanguages current="it" />
      <h1>Per strutture ricettive e venditori</h1>
      <p className="lead">
        TrueVsAd mostra alle famiglie del Regno Unito quanto costa davvero una vacanza. Se i vostri prezzi sono già
        completi, vorremmo mostrare le vostre offerte a queste famiglie.
      </p>
      <p className="hint">
        Questa è una traduzione per vostra comodità. La versione ufficiale è la{" "}
        <Link href="/sellers">pagina in inglese</Link>; in caso di differenze, prevale la versione inglese.
      </p>

      <div className="card">
        <h2 style={{ marginTop: 0 }}>A che punto siamo</h2>
        <p>
          Le offerte in evidenza non sono ancora attive. Iniziamo con <strong>piccoli hotel, B&amp;B e pensioni</strong>,
          e stiamo già parlando con i nostri primi venditori. Finché le offerte in evidenza non saranno aperte, nulla su
          TrueVsAd è a pagamento.
        </p>
      </div>

      <div className="card">
        <h2 style={{ marginTop: 0 }}>Chi può aderire</h2>
        <p>
          Piccoli hotel, B&amp;B, pensioni e aziende di vacanze il cui prezzo pubblicizzato è il prezzo che la famiglia
          paga. Verifichiamo:
        </p>
        <ul>
          <li>
            <strong>Un&apos;impresa reale:</strong> registrata e attiva nel registro ufficiale del proprio paese
            (Companies House nel Regno Unito).
          </li>
          <li>
            <strong>L&apos;autorizzazione ad affittare camere:</strong> la licenza o il codice identificativo turistico,
            dove il vostro paese o la vostra regione lo richiede.
          </li>
          <li>
            <strong>Pacchetti protetti:</strong> se vendete voli con l&apos;alloggio, una licenza ATOL, verificata nel
            registro dell&apos;autorità britannica dell&apos;aviazione civile (CAA). Un hotel che vende solo camere non
            ne ha bisogno.
          </li>
          <li>
            <strong>Nessun provvedimento recente per prezzi ingannevoli</strong> da parte delle autorità britanniche
            della pubblicità (ASA) o della concorrenza e dei consumatori (CMA) negli ultimi 12 mesi.
          </li>
          <li>
            <strong>Un accordo firmato</strong> con il nostro standard, compreso il modo in cui le offerte vengono ritirate.
          </li>
        </ul>
        <p className="hint">Usiamo solo fonti ufficiali, all&apos;adesione e poi ogni 3 mesi.</p>
      </div>

      <div className="card">
        <h2 style={{ marginTop: 0 }}>Lo standard Fair Seller</h2>
        <p>
          Ogni offerta in evidenza ha la stessa etichetta in tre parti, così le famiglie calcolano il proprio prezzo
          reale:
        </p>
        <ol>
          <li>
            <strong>Sempre compreso nel prezzo:</strong> tasse, costi di prenotazione e di carta, e tutto ciò che la
            famiglia non può evitare. Un&apos;imposta di soggiorno locale è inclusa, oppure indicata con il suo importo e
            &ldquo;da pagare in hotel&rdquo;.
          </li>
          <li>
            <strong>Extra facoltativi, ognuno con il suo prezzo esatto:</strong> colazione o trattamento migliore,
            transfer dall&apos;aeroporto (oppure &ldquo;arrivo con mezzi propri&rdquo; senza penali), bagagli da stiva e
            simili. Nulla è mai preselezionato.
          </li>
          <li>
            <strong>Cosa non è offerto:</strong> per esempio &ldquo;nessun transfer&rdquo;, così nessuno lo dà per
            scontato.
          </li>
        </ol>
        <ul>
          <li>Il tipo di camera è indicato, e le foto mostrano quel tipo di camera.</li>
          <li>
            I pasti sono descritti con parole vostre: cosa comprende ogni pasto e i suoi orari. Una colazione semplice
            descritta con onestà rispetta lo standard; una promessa non mantenuta no.
          </li>
          <li>
            L&apos;offerta deve raggiungere FairMark Gold ({FAIRMARK_SCALE.gold}% o meno escluso) o Fair Price (
            {FAIRMARK_SCALE.fair}% o meno), calcolato con lo <Link href="/fairmark/method">stesso metodo</Link> di ogni
            ricevuta. Gli annunci con &ldquo;più tasse e oneri&rdquo; non possono essere messi in evidenza.
          </li>
          <li>Il nostro sistema calcola il prezzo di ogni offerta in evidenza prima di mostrarla, e poi ogni notte.</li>
          <li>
            Se un prezzo cambia, compare un costo che non era nell&apos;etichetta o un controllo non va a buon fine,
            l&apos;offerta viene ritirata la notte stessa.
          </li>
        </ul>
      </div>

      <div className="card">
        <h2 style={{ marginTop: 0 }}>Quanto costa</h2>
        <table className="board">
          <thead>
            <tr>
              <th>Il vostro FairMark</th>
              <th>Quanto ci pagate</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Adesione</td>
              <td>Gratuita, sempre</td>
            </tr>
            <tr>
              <td>
                <strong>FairMark Gold</strong> ({FAIRMARK_SCALE.gold}% o meno escluso)
              </td>
              <td>Nulla</td>
            </tr>
            <tr>
              <td>
                <strong>Fair Price</strong> (oltre il {FAIRMARK_SCALE.gold}%, fino al {FAIRMARK_SCALE.fair}%)
              </td>
              <td>1% delle prenotazioni fatte tramite TrueVsAd</td>
            </tr>
            <tr>
              <td>Oltre il {FAIRMARK_SCALE.fair}% escluso</td>
              <td>Non può essere messo in evidenza</td>
            </tr>
          </tbody>
        </table>
        <p>
          <strong>Guadagniamo meno quando migliorate.</strong> Un venditore Fair paga l&apos;1% e un venditore Gold non
          paga nulla. È voluto: i venditori più corretti devono pagare meno. FairMark è calcolato dal nostro sistema con
          un metodo pubblico, mai a mano, quindi non possiamo abbassare un venditore per guadagnare di più, e chiunque
          può contestare una cifra.
        </p>
        <p>
          Il modo in cui si contano le prenotazioni (per esempio un codice di prenotazione o un link di riferimento) è
          stabilito nell&apos;accordo con il venditore. Non prendiamo mai pagamenti dalle famiglie e non gestiamo mai la
          prenotazione.
        </p>
        <p className="hint">
          <strong>Se le nostre tariffe cambiano:</strong> le rivedremo nel corso del 2027, quando avremo visto come
          funzionano. Ogni modifica viene pubblicata qui e inviata a ogni venditore in evidenza prima di entrare in
          vigore.
        </p>
      </div>

      <div className="card">
        <h2 style={{ marginTop: 0 }}>Ciò che il denaro non può mai comprare</h2>
        <ul>
          <li>Essere in evidenza: rispettare lo standard è l&apos;unico modo per entrare.</li>
          <li>Un FairMark migliore, una ✓ nella classifica dei venditori o un posto in una classifica.</li>
          <li>
            Nascondere la ricevuta di una famiglia. Qualsiasi famiglia può sempre controllare qualsiasi vostra offerta,
            in evidenza o no, e vedere il verdetto.
          </li>
        </ul>
        <p>
          Le offerte in evidenza hanno sempre l&apos;etichetta &ldquo;Featured&rdquo; (in evidenza) e sono mostrate
          separatamente dalle offerte controllate dalle famiglie.
        </p>
      </div>

      <div className="card">
        <h2 style={{ marginTop: 0 }}>Se le famiglie segnalano un problema</h2>
        <ul>
          <li>
            Le segnalazioni ci arrivano in privato, con prove, e non vengono mai pubblicate. Una sola segnalazione non
            esclude mai nessuno.
          </li>
          <li>Ricevete i fatti e 14 giorni per rispondere; l&apos;offerta resta sospesa finché non rispondete.</li>
          <li>Lo stesso problema segnalato da 2 o più famiglie indipendenti entro 12 mesi è un richiamo.</li>
          <li>3 richiami, o la mancata risposta a una segnalazione, vi escludono dai Fair Seller per 6 mesi.</li>
          <li>
            Pubblichiamo solo la nostra decisione, come fatto (per esempio &ldquo;escluso per mancato rispetto della
            regola sulla descrizione delle camere&rdquo;), mai le accuse delle famiglie.
          </li>
        </ul>
        <p>
          Ogni venditore in evidenza riceve anche un rapporto privato su cosa cambiare per arrivare a Gold, basato sulle
          cifre del nostro sistema.
        </p>
      </div>

      <div className="card">
        <h2 style={{ marginTop: 0 }}>Come candidarsi</h2>
        <p>
          Scrivete a <a href={`mailto:${EMAILS.partners}?subject=Fair%20Seller%20application`}>{EMAILS.partners}</a>{" "}
          (in inglese, spagnolo, francese, italiano o greco) indicando:
        </p>
        <ul>
          <li>il nome della vostra impresa, il paese e il numero di registrazione;</li>
          <li>la vostra licenza o il codice identificativo turistico, se richiesto;</li>
          <li>il vostro numero ATOL, se vendete voli con l&apos;alloggio;</li>
          <li>il vostro sito web, e un&apos;offerta di esempio con il prezzo completo e gli extra.</li>
        </ul>
        <p className="hint">
          Inviate solo dati aziendali: nessun nome di ospiti né dati di prenotazione. Conserviamo ciò che inviate, e i
          nostri controlli, finché siete Fair Seller e per 12 mesi dopo, oppure 12 mesi dopo la nostra risposta se non
          aderite. Vedete la nostra <Link href="/privacy">informativa sulla privacy</Link> (in inglese).
        </p>
      </div>

      <div className="card">
        <h2 style={{ marginTop: 0 }}>Da leggere: cosa è TrueVsAd, e cosa non è</h2>
        <ul>
          <li>
            <strong>Non siamo un&apos;agenzia di viaggi né un sito di prenotazione.</strong> Non accettiamo mai
            prenotazioni né pagamenti, e non siamo parte del contratto tra la famiglia e il venditore. Le famiglie
            prenotano direttamente con voi.
          </li>
          <li>
            <strong>Essere in evidenza non è una raccomandazione della vacanza.</strong> Significa che il prezzo
            pubblicizzato rispettava il nostro standard quando lo abbiamo controllato. Non ispezioniamo gli hotel e non
            garantiamo camere, servizio o sicurezza.
          </li>
          <li>
            <strong>FairMark misura solo il prezzo:</strong> quanto un annuncio ha lasciato fuori. Non dice nulla sulla
            qualità di un hotel.
          </li>
          <li>
            <strong>Restate responsabili dei vostri annunci</strong> e del rispetto della legge dove operate, comprese le
            regole britanniche sui prezzi, le norme sui pacchetti turistici, ATOL e le licenze locali. I nostri rapporti
            sono un aiuto per rispettare il nostro standard, non una consulenza legale.
          </li>
          <li>
            <strong>Decidiamo noi chi è in evidenza.</strong> Possiamo rifiutare una candidatura, o escludere un venditore
            o un&apos;offerta che non rispetta più lo standard. Diamo la nostra motivazione, secondo le regole
            pubblicate.
          </li>
          <li>
            <strong>Le famiglie conservano tutti i loro diritti</strong> nei confronti del venditore con cui hanno
            prenotato, qualunque cosa mostri TrueVsAd.
          </li>
        </ul>
        <p className="hint">
          TrueVsAd appartiene a {COMPANY.name}, una società registrata in Inghilterra e Galles. L&apos;accordo con il
          venditore contiene tutte le condizioni. Domande: <a href={`mailto:${EMAILS.partners}`}>{EMAILS.partners}</a>.
        </p>
      </div>
    </main>
  );
}
