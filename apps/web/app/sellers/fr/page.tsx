import type { Metadata } from "next";
import Link from "next/link";
import { FAIRMARK_SCALE } from "@truevsad/true-cost";
import { COMPANY, EMAILS } from "@/lib/company";
import { SELLER_LANGUAGE_ALTERNATES, SellerLanguages } from "@/components/SellerLanguages";

export const metadata: Metadata = {
  title: "Pour les hébergements et les vendeurs — TrueVsAd",
  description:
    "Les petits hôtels, maisons d'hôtes et vendeurs de vacances aux prix complets peuvent rejoindre TrueVsAd comme Fair Sellers. L'adhésion est gratuite ; les vendeurs Gold ne paient rien.",
  alternates: { languages: SELLER_LANGUAGE_ALTERNATES },
};

/**
 * French translation of /sellers, for hotel owners. The English page is the official version:
 * any change there must be made here on the same day, and checked by a native speaker.
 */
export default function SellersFrenchPage() {
  return (
    <main lang="fr">
      <SellerLanguages current="fr" />
      <h1>Pour les hébergements et les vendeurs</h1>
      <p className="lead">
        TrueVsAd montre aux familles britanniques ce que coûtent vraiment des vacances. Si vos prix sont déjà complets,
        nous aimerions présenter vos offres à ces familles.
      </p>
      <p className="hint">
        Ceci est une traduction pour votre confort. La version officielle est la{" "}
        <Link href="/sellers">page en anglais</Link> ; en cas de différence, la version anglaise fait foi.
      </p>

      <div className="card">
        <h2 style={{ marginTop: 0 }}>Où nous en sommes</h2>
        <p>
          Les offres mises en avant ne sont pas encore en ligne. Nous commençons par les{" "}
          <strong>petits hôtels et les maisons d&apos;hôtes</strong>, et nous parlons déjà à nos premiers vendeurs.
          Tant que les offres mises en avant ne sont pas ouvertes, rien sur TrueVsAd n&apos;est payant.
        </p>
      </div>

      <div className="card">
        <h2 style={{ marginTop: 0 }}>Qui peut nous rejoindre</h2>
        <p>
          Les petits hôtels, maisons d&apos;hôtes et entreprises de vacances dont le prix annoncé est le prix payé par
          la famille. Nous vérifions :
        </p>
        <ul>
          <li>
            <strong>Une entreprise réelle :</strong> immatriculée et active au registre officiel de son pays (Companies
            House au Royaume-Uni).
          </li>
          <li>
            <strong>Le droit de louer des chambres :</strong> le classement, la licence ou le numéro
            d&apos;enregistrement touristique, lorsque votre pays ou votre région l&apos;exige.
          </li>
          <li>
            <strong>Des forfaits protégés :</strong> si vous vendez des vols avec l&apos;hébergement, une licence ATOL,
            vérifiée dans le registre de l&apos;autorité britannique de l&apos;aviation civile (CAA). Un hôtel qui ne
            vend que des chambres n&apos;en a pas besoin.
          </li>
          <li>
            <strong>Aucune sanction récente pour prix trompeurs</strong> par les autorités britanniques de la publicité
            (ASA) ou de la concurrence et de la consommation (CMA) au cours des 12 derniers mois.
          </li>
          <li>
            <strong>Un accord signé</strong> avec notre standard, y compris la façon dont les offres sont retirées.
          </li>
        </ul>
        <p className="hint">
          Nous n&apos;utilisons que des sources officielles, à l&apos;adhésion puis tous les 3 mois.
        </p>
      </div>

      <div className="card">
        <h2 style={{ marginTop: 0 }}>Le standard Fair Seller</h2>
        <p>
          Chaque offre mise en avant porte la même étiquette en trois parties, pour que les familles calculent leur
          propre prix réel :
        </p>
        <ol>
          <li>
            <strong>Toujours compris dans le prix :</strong> taxes, frais de réservation et de carte, et tout ce que la
            famille ne peut pas éviter. Une taxe de séjour locale est soit incluse, soit indiquée avec son montant et
            &laquo;&nbsp;à payer à l&apos;hôtel&nbsp;&raquo;.
          </li>
          <li>
            <strong>Options, chacune avec son prix exact :</strong> petit-déjeuner ou formule repas, transferts depuis
            l&apos;aéroport (ou &laquo;&nbsp;arrivée par vos propres moyens&nbsp;&raquo; sans pénalité), bagages en
            soute, etc. Rien n&apos;est jamais présélectionné.
          </li>
          <li>
            <strong>Ce qui n&apos;est pas proposé :</strong> par exemple &laquo;&nbsp;pas de transferts&nbsp;&raquo;,
            pour que personne ne le suppose.
          </li>
        </ol>
        <ul>
          <li>Le type de chambre est nommé, et les photos montrent ce type de chambre.</li>
          <li>
            Les repas sont décrits avec vos propres mots : ce que comprend chaque repas et ses horaires. Un
            petit-déjeuner simple décrit honnêtement respecte le standard ; une promesse non tenue, non.
          </li>
          <li>
            L&apos;offre doit atteindre FairMark Gold ({FAIRMARK_SCALE.gold} % ou moins non inclus) ou Fair Price (
            {FAIRMARK_SCALE.fair} % ou moins), calculé avec la <Link href="/fairmark/method">même méthode</Link> que
            chaque reçu. Les annonces &laquo;&nbsp;plus taxes et frais&nbsp;&raquo; ne peuvent pas être mises en avant.
          </li>
          <li>Notre système calcule le prix de chaque offre mise en avant avant sa publication, puis chaque nuit.</li>
          <li>
            Si un prix change, si un frais absent de l&apos;étiquette apparaît ou si une vérification échoue,
            l&apos;offre est retirée la nuit même.
          </li>
        </ul>
      </div>

      <div className="card">
        <h2 style={{ marginTop: 0 }}>Ce que cela coûte</h2>
        <table className="board">
          <thead>
            <tr>
              <th>Votre FairMark</th>
              <th>Ce que vous nous payez</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Adhésion</td>
              <td>Gratuite, toujours</td>
            </tr>
            <tr>
              <td>
                <strong>FairMark Gold</strong> ({FAIRMARK_SCALE.gold} % ou moins non inclus)
              </td>
              <td>Rien</td>
            </tr>
            <tr>
              <td>
                <strong>Fair Price</strong> (plus de {FAIRMARK_SCALE.gold} %, jusqu&apos;à {FAIRMARK_SCALE.fair} %)
              </td>
              <td>1 % des réservations faites via TrueVsAd</td>
            </tr>
            <tr>
              <td>Plus de {FAIRMARK_SCALE.fair} % non inclus</td>
              <td>Ne peut pas être mis en avant</td>
            </tr>
          </tbody>
        </table>
        <p>
          <strong>Nous gagnons moins quand vous vous améliorez.</strong> Un vendeur Fair paie 1 % et un vendeur Gold ne
          paie rien. C&apos;est voulu : les vendeurs les plus honnêtes sur leurs prix doivent payer le moins. FairMark
          est calculé par notre système selon une méthode publique, jamais à la main : nous ne pouvons donc pas faire
          baisser un vendeur pour gagner plus, et chacun peut contester un chiffre.
        </p>
        <p>
          La façon de compter les réservations (par exemple un code de réservation ou un lien de parrainage) est fixée
          dans l&apos;accord vendeur. Nous ne prenons jamais de paiement des familles et ne gérons jamais la
          réservation.
        </p>
        <p className="hint">
          <strong>Si nos tarifs changent :</strong> nous les réexaminerons en 2027, une fois que nous aurons vu comment
          ils fonctionnent. Tout changement est publié ici et envoyé à chaque vendeur mis en avant avant de
          s&apos;appliquer.
        </p>
      </div>

      <div className="card">
        <h2 style={{ marginTop: 0 }}>Ce que l&apos;argent ne peut jamais acheter</h2>
        <ul>
          <li>Être mis en avant : respecter le standard est le seul moyen d&apos;y accéder.</li>
          <li>Un meilleur FairMark, une ✓ dans le classement des vendeurs ou une place dans un classement.</li>
          <li>
            Cacher le reçu d&apos;une famille. Toute famille peut toujours vérifier n&apos;importe laquelle de vos
            offres, mise en avant ou non, et voir le verdict.
          </li>
        </ul>
        <p>
          Les offres mises en avant portent toujours l&apos;étiquette &laquo;&nbsp;Featured&nbsp;&raquo; (mise en
          avant) et sont présentées à part des offres vérifiées par les familles.
        </p>
      </div>

      <div className="card">
        <h2 style={{ marginTop: 0 }}>Si des familles signalent un problème</h2>
        <ul>
          <li>
            Les signalements nous arrivent en privé, avec des preuves, et ne sont jamais publiés. Un seul signalement ne
            retire jamais personne.
          </li>
          <li>Vous recevez les faits et 14 jours pour répondre ; l&apos;offre est suspendue jusqu&apos;à votre réponse.</li>
          <li>Le même problème signalé par 2 familles indépendantes ou plus en 12 mois constitue un avertissement.</li>
          <li>3 avertissements, ou l&apos;absence de réponse à un signalement, vous retirent des Fair Sellers pendant 6 mois.</li>
          <li>
            Nous publions uniquement notre propre décision, comme un fait (par exemple &laquo;&nbsp;retiré pour
            non-respect de la règle de description des chambres&nbsp;&raquo;), jamais les accusations des familles.
          </li>
        </ul>
        <p>
          Chaque vendeur mis en avant reçoit aussi un rapport privé sur ce qu&apos;il faut changer pour atteindre Gold,
          établi à partir des chiffres de notre système.
        </p>
      </div>

      <div className="card">
        <h2 style={{ marginTop: 0 }}>Comment postuler</h2>
        <p>
          Écrivez à <a href={`mailto:${EMAILS.partners}?subject=Fair%20Seller%20application`}>{EMAILS.partners}</a>{" "}
          (en anglais, espagnol, français, italien ou grec) avec :
        </p>
        <ul>
          <li>le nom de votre entreprise, le pays et le numéro d&apos;immatriculation ;</li>
          <li>votre classement, licence ou numéro d&apos;enregistrement touristique, si vous en avez besoin ;</li>
          <li>votre numéro ATOL, si vous vendez des vols avec l&apos;hébergement ;</li>
          <li>votre site web, et une offre type avec son prix complet et ses options.</li>
        </ul>
        <p className="hint">
          Envoyez uniquement des données d&apos;entreprise : aucun nom de client ni donnée de réservation. Nous gardons
          ce que vous envoyez, ainsi que nos vérifications, tant que vous êtes Fair Seller et 12 mois après, ou 12 mois
          après notre réponse si vous ne nous rejoignez pas. Voir notre{" "}
          <Link href="/privacy">politique de confidentialité</Link> (en anglais).
        </p>
      </div>

      <div className="card">
        <h2 style={{ marginTop: 0 }}>À lire : ce qu&apos;est TrueVsAd, et ce qu&apos;il n&apos;est pas</h2>
        <ul>
          <li>
            <strong>Nous ne sommes ni une agence de voyages ni un site de réservation.</strong> Nous ne prenons jamais de
            réservations ni de paiements, et nous ne sommes pas partie au contrat entre la famille et le vendeur. Les
            familles réservent directement chez vous.
          </li>
          <li>
            <strong>Être mis en avant n&apos;est pas une recommandation des vacances.</strong> Cela signifie que le prix
            annoncé respectait notre standard lors de notre vérification. Nous n&apos;inspectons pas les hôtels et ne
            garantissons ni les chambres, ni le service, ni la sécurité.
          </li>
          <li>
            <strong>FairMark ne mesure que le prix :</strong> ce qu&apos;une annonce a laissé de côté. Il ne dit rien de
            la qualité d&apos;un hôtel.
          </li>
          <li>
            <strong>Vous restez responsable de vos annonces</strong> et du respect de la loi là où vous exercez, y compris
            les règles britanniques sur les prix, les règles sur les voyages à forfait, ATOL et les autorisations
            locales. Nos rapports sont une aide pour respecter notre standard, pas un conseil juridique.
          </li>
          <li>
            <strong>C&apos;est nous qui décidons qui est mis en avant.</strong> Nous pouvons refuser une candidature, ou
            retirer un vendeur ou une offre qui ne respecte plus le standard. Nous donnons notre raison, selon les
            règles publiées.
          </li>
          <li>
            <strong>Les familles conservent tous leurs droits</strong> envers le vendeur chez qui elles ont réservé,
            quoi que montre TrueVsAd.
          </li>
        </ul>
        <p className="hint">
          TrueVsAd appartient à {COMPANY.name}, une société immatriculée en Angleterre et au pays de Galles.
          L&apos;accord vendeur précise l&apos;ensemble des conditions. Questions :{" "}
          <a href={`mailto:${EMAILS.partners}`}>{EMAILS.partners}</a>.
        </p>
      </div>
    </main>
  );
}
