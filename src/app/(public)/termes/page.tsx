import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Termes et Conditions — Habynex',
  description: "Conditions générales d'utilisation de la plateforme immobilière Habynex au Cameroun.",
}

export default function TermesPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-12 prose prose-sm dark:prose-invert">
      <h1 className="text-3xl font-bold text-hb-700 dark:text-white mb-2">Termes et Conditions d'utilisation</h1>
      <p className="text-hb-400 text-sm mb-10">Dernière mise à jour : Mai 2026 · Habynex SAS, Yaoundé, Cameroun</p>

      <Section title="1. Présentation de la plateforme">
        <p>Habynex est une plateforme immobilière numérique basée au Cameroun, accessible via le site web <strong>habynex.com</strong> Elle met en relation des propriétaires, des locataires, des acheteurs et des agents immobiliers certifiés. Habynex n'est pas une agence immobilière au sens traditionnel du terme, mais un intermédiaire technologique facilitant les transactions immobilières.</p>
      </Section>

      <Section title="2. Acceptation des conditions">
        <p>En accédant à la plateforme Habynex, en créant un compte ou en utilisant l'un de nos services, vous acceptez sans réserve les présentes conditions générales d'utilisation. Si vous n'acceptez pas ces conditions, vous devez cesser d'utiliser la plateforme immédiatement.</p>
      </Section>

      <Section title="3. Création de compte et responsabilités">
        <ul>
          <li>Vous devez fournir des informations exactes et à jour lors de votre inscription.</li>
          <li>Vous êtes responsable de la confidentialité de votre mot de passe et de toute activité effectuée depuis votre compte.</li>
          <li>Habynex se réserve le droit de suspendre ou supprimer tout compte en cas d'activité frauduleuse, de fausses informations ou de violation des présentes conditions.</li>
          <li>Les mineurs de moins de 18 ans ne peuvent pas créer de compte sans l'accord d'un parent ou tuteur légal.</li>
        </ul>
      </Section>

      <Section title="4. Annonces immobilières">
        <ul>
          <li>Toutes les annonces publiées sur Habynex sont soumises à une validation par l'équipe Habynex avant publication.</li>
          <li>Les propriétaires s'engagent à ne publier que des biens dont ils ont la propriété ou la gestion légale.</li>
          <li>Les photos et descriptions doivent être fidèles à la réalité du bien proposé.</li>
          <li>Habynex se réserve le droit de refuser, modifier ou supprimer toute annonce non conforme à ses standards.</li>
          <li>La publication d'annonces frauduleuses entraîne une exclusion définitive de la plateforme et peut faire l'objet de poursuites judiciaires.</li>
        </ul>
      </Section>

      <Section title="5. Paiements et frais de visite">
        <p className="font-semibold text-red-600">⚠️ IMPORTANT — Sécurité des paiements</p>
        <ul>
          <li><strong>Tous les paiements doivent s'effectuer exclusivement via la plateforme Habynex</strong>, via MTN Mobile Money ou Orange Money.</li>
          <li>Il est strictement interdit de remettre de l'argent directement à un agent Habynex dans le cadre d'une transaction officielle.</li>
          <li>Un pourboire volontaire peut être offert à un agent pour la qualité de son service, mais il n'est en aucun cas obligatoire.</li>
          <li>Habynex décline toute responsabilité pour les paiements effectués en dehors de sa plateforme.</li>
          <li>Les frais de visite sont remboursés intégralement si l'annonce est prouvée frauduleuse.</li>
          <li>Aucun remboursement ne sera effectué pour les visites annulées moins de 24h avant le rendez-vous sans motif valable.</li>
        </ul>
      </Section>

      <Section title="6. Agents Habynex">
        <ul>
          <li>Les agents Habynex sont des prestataires indépendants certifiés par la plateforme après vérification d'identité et signature d'un contrat.</li>
          <li>Ils s'engagent à respecter un code de conduite professionnel, à être ponctuels, courtois et honnêtes.</li>
          <li>Tout manquement à ces obligations peut entraîner la suspension ou la résiliation du contrat d'agent.</li>
          <li>Les agents ne peuvent en aucun cas percevoir des fonds directement des clients pour des prestations officielles Habynex.</li>
        </ul>
      </Section>

      <Section title="7. Programme de parrainage">
        <ul>
          <li>Le programme de parrainage Habynex offre une visite terrain gratuite pour chaque tranche de 5 filleuls ayant créé un compte actif.</li>
          <li>Le code de parrainage ne peut pas être échangé contre de l'argent.</li>
          <li>Toute tentative de manipulation du système de parrainage entraîne la suppression du compte et l'annulation des avantages accumulés.</li>
        </ul>
      </Section>

      <Section title="8. Données personnelles et confidentialité">
        <ul>
          <li>Habynex collecte et traite vos données personnelles conformément à la réglementation camerounaise sur la protection des données.</li>
          <li>Vos données ne sont jamais vendues à des tiers à des fins commerciales.</li>
          <li>Vous disposez d'un droit d'accès, de rectification et de suppression de vos données en contactant privacy@habynex.com.</li>
          <li>Les photos de documents d'identité sont conservées de manière sécurisée uniquement pour la vérification des agents.</li>
        </ul>
      </Section>

      <Section title="9. Propriété intellectuelle">
        <p>Toutes les images, logos, textes et contenus présents sur la plateforme Habynex sont protégés par le droit d'auteur. La reproduction, la copie ou la distribution de ces contenus sans autorisation écrite d'Habynex est strictement interdite. Les photos des annonces sont la propriété des propriétaires ou d'Habynex selon les cas.</p>
      </Section>

      <Section title="10. Limitation de responsabilité">
        <ul>
          <li>Habynex s'efforce de vérifier toutes les annonces, mais ne peut garantir l'exactitude à 100% des informations publiées.</li>
          <li>Habynex n'est pas responsable des litiges entre propriétaires et locataires nés après la mise en relation.</li>
          <li>En cas d'arnaque avérée et signalée, Habynex peut intervenir comme médiateur mais ne peut être tenu pour responsable des pertes financières des utilisateurs.</li>
        </ul>
      </Section>

      <Section title="11. Modification des conditions">
        <p>Habynex se réserve le droit de modifier les présentes conditions à tout moment. Les utilisateurs seront informés par email ou notification sur la plateforme. La poursuite de l'utilisation de la plateforme après modification vaut acceptation des nouvelles conditions.</p>
      </Section>

      <Section title="12. Droit applicable et litiges">
        <p>Les présentes conditions sont régies par le droit camerounais. En cas de litige, les parties s'engagent à rechercher une solution amiable avant tout recours judiciaire. À défaut d'accord amiable, les tribunaux compétents de Yaoundé, Cameroun, seront saisis.</p>
      </Section>

      <Section title="13. Contact">
        <p>Pour toute question relative aux présentes conditions, vous pouvez nous contacter :</p>
        <ul>
          <li>Email : support@habynex.com</li>
          <li>WhatsApp : +237 654 888 084</li>
          <li>Adresse : Yaoundé, Cameroun</li>
        </ul>
      </Section>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-8">
      <h2 className="text-lg font-bold text-hb-700 dark:text-white mb-3 pb-2 border-b border-hb-100 dark:border-hb-700">{title}</h2>
      <div className="text-sm text-hb-500 dark:text-hb-300 space-y-2">{children}</div>
    </div>
  )
}
