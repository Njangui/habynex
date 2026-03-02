import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/LanguageContext";
import { Helmet } from "react-helmet-async";

const Terms = () => {
  const navigate = useNavigate();
  const { language } = useLanguage();

  return (
    <>
      <Helmet>
        <title>{language === "fr" ? "Conditions Générales d'Utilisation - Habinex" : "Terms of Service - Habinex"}</title>
      </Helmet>

      <div className="min-h-screen bg-background">
        <div className="max-w-4xl mx-auto px-4 py-8">
          <Button variant="ghost" onClick={() => navigate(-1)} className="mb-6 gap-2">
            <ArrowLeft className="w-4 h-4" />
            {language === "fr" ? "Retour" : "Back"}
          </Button>

          <article className="prose prose-sm sm:prose max-w-none text-foreground">
            <h1 className="text-3xl font-bold text-foreground mb-2">
              {language === "fr" ? "Conditions Générales d'Utilisation" : "Terms of Service"}
            </h1>
            <p className="text-muted-foreground mb-8">
              {language === "fr" ? "Dernière mise à jour : 17 février 2026" : "Last updated: February 17, 2026"}
            </p>

            {language === "fr" ? (
              <>
                <section className="mb-8">
                  <h2 className="text-xl font-semibold text-foreground">1. Objet</h2>
                  <p className="text-muted-foreground">
                    Les présentes Conditions Générales d'Utilisation (ci-après « CGU ») régissent l'accès et l'utilisation de la plateforme Habinex (ci-après « la Plateforme »), accessible via l'application web et mobile. Habinex est une plateforme immobilière intelligente qui met en relation des chercheurs de logement, des propriétaires, des agents immobiliers et des agences en Afrique.
                  </p>
                </section>

                <section className="mb-8">
                  <h2 className="text-xl font-semibold text-foreground">2. Inscription et Comptes Utilisateurs</h2>
                  <p className="text-muted-foreground">
                    L'inscription sur la Plateforme est ouverte à toute personne physique majeure ou personne morale. Lors de l'inscription, l'utilisateur s'engage à fournir des informations exactes, complètes et à jour. Quatre types de comptes sont disponibles :
                  </p>
                  <ul className="text-muted-foreground list-disc pl-6 space-y-1">
                    <li><strong>Chercheur (Seeker)</strong> : personne recherchant un logement en location, colocation ou achat.</li>
                    <li><strong>Propriétaire (Owner)</strong> : personne proposant un ou plusieurs biens immobiliers.</li>
                    <li><strong>Agent immobilier</strong> : professionnel mandaté pour gérer des biens pour le compte de propriétaires.</li>
                    <li><strong>Agence immobilière</strong> : structure professionnelle de gestion immobilière.</li>
                  </ul>
                </section>

                <section className="mb-8">
                  <h2 className="text-xl font-semibold text-foreground">3. Vérification d'Identité</h2>
                  <p className="text-muted-foreground">
                    Les propriétaires, agents et agences immobilières sont tenus de soumettre les documents suivants pour vérification :
                  </p>
                  <ul className="text-muted-foreground list-disc pl-6 space-y-1">
                    <li>Une photo recto et verso de leur carte nationale d'identité ou passeport.</li>
                    <li>Un selfie tenant la pièce d'identité de manière visible.</li>
                  </ul>
                  <p className="text-muted-foreground">
                    Ces documents seront examinés par notre équipe d'administration. <strong>Tant que la vérification n'est pas validée par un administrateur, les annonces publiées par l'utilisateur resteront en mode brouillon et ne seront pas visibles sur la Plateforme.</strong> L'utilisateur peut néanmoins utiliser toutes les autres fonctionnalités de la Plateforme pendant ce processus.
                  </p>
                </section>

                <section className="mb-8">
                  <h2 className="text-xl font-semibold text-foreground">4. Publication d'Annonces</h2>
                  <p className="text-muted-foreground">
                    Les annonces immobilières doivent être conformes aux règles suivantes :
                  </p>
                  <ul className="text-muted-foreground list-disc pl-6 space-y-1">
                    <li>Les informations (prix, superficie, localisation, équipements) doivent être exactes et vérifiables.</li>
                    <li>Les photos doivent représenter le bien réel et ne pas être trompeuses.</li>
                    <li>Toute annonce frauduleuse, trompeuse ou contenant des informations fausses sera supprimée sans préavis et pourra entraîner la suspension du compte.</li>
                    <li>Les annonces ne doivent contenir aucun contenu discriminatoire, offensant ou illégal.</li>
                  </ul>
                </section>

                <section className="mb-8">
                  <h2 className="text-xl font-semibold text-foreground">5. Système de Confiance et Réputation</h2>
                  <p className="text-muted-foreground">
                    Habinex utilise un système de score de confiance basé sur :
                  </p>
                  <ul className="text-muted-foreground list-disc pl-6 space-y-1">
                    <li>La vérification d'identité (niveaux 1 à 4).</li>
                    <li>Les avis et évaluations des autres utilisateurs.</li>
                    <li>Le taux de réponse aux demandes.</li>
                    <li>L'historique des transactions.</li>
                  </ul>
                  <p className="text-muted-foreground">
                    Tout abus du système de notation (faux avis, manipulation) est strictement interdit et sanctionné.
                  </p>
                </section>

                <section className="mb-8">
                  <h2 className="text-xl font-semibold text-foreground">6. Messagerie et Communication</h2>
                  <p className="text-muted-foreground">
                    La Plateforme offre un système de messagerie interne. Les utilisateurs s'engagent à :
                  </p>
                  <ul className="text-muted-foreground list-disc pl-6 space-y-1">
                    <li>Communiquer de manière respectueuse et professionnelle.</li>
                    <li>Ne pas envoyer de spam, de contenu commercial non sollicité ou de liens malveillants.</li>
                    <li>Ne pas harceler d'autres utilisateurs.</li>
                  </ul>
                </section>

                <section className="mb-8">
                  <h2 className="text-xl font-semibold text-foreground">7. Transactions et Paiements</h2>
                  <p className="text-muted-foreground">
                    Les transactions financières sur la Plateforme (boosts, abonnements Pro, services escrow) sont soumises aux conditions suivantes :
                  </p>
                  <ul className="text-muted-foreground list-disc pl-6 space-y-1">
                    <li>Les prix sont affichés en Francs CFA (XAF).</li>
                    <li>Les commissions applicables sont transparentes et consultables dans les règles de commission.</li>
                    <li>Les transactions escrow protègent les deux parties et sont libérées selon les conditions convenues.</li>
                    <li>Tout litige de transaction doit être signalé dans les 7 jours suivant la transaction.</li>
                  </ul>
                </section>

                <section className="mb-8">
                  <h2 className="text-xl font-semibold text-foreground">8. Services Professionnels (Marketplace)</h2>
                  <p className="text-muted-foreground">
                    La Plateforme propose une marketplace de services immobiliers (déménagement, plomberie, électricité, etc.). Les prestataires de services s'engagent à :
                  </p>
                  <ul className="text-muted-foreground list-disc pl-6 space-y-1">
                    <li>Fournir des services conformes à leur description et devis.</li>
                    <li>Respecter les délais convenus.</li>
                    <li>Maintenir un niveau de qualité professionnel.</li>
                  </ul>
                </section>

                <section className="mb-8">
                  <h2 className="text-xl font-semibold text-foreground">9. Protection des Données Personnelles</h2>
                  <p className="text-muted-foreground">
                    Habinex s'engage à protéger les données personnelles de ses utilisateurs conformément aux lois applicables. Les données collectées incluent :
                  </p>
                  <ul className="text-muted-foreground list-disc pl-6 space-y-1">
                    <li>Informations d'identification (nom, email, téléphone).</li>
                    <li>Documents de vérification (traités de manière confidentielle).</li>
                    <li>Préférences de recherche et historique de navigation.</li>
                  </ul>
                  <p className="text-muted-foreground">
                    Les données ne sont jamais vendues à des tiers. L'utilisateur peut demander la suppression de ses données à tout moment.
                  </p>
                </section>

                <section className="mb-8">
                  <h2 className="text-xl font-semibold text-foreground">10. Modération et Sanctions</h2>
                  <p className="text-muted-foreground">
                    Habinex se réserve le droit de :
                  </p>
                  <ul className="text-muted-foreground list-disc pl-6 space-y-1">
                    <li>Supprimer tout contenu non conforme aux présentes CGU.</li>
                    <li>Suspendre temporairement ou définitivement un compte en cas de violation.</li>
                    <li>Signaler aux autorités compétentes tout comportement illégal.</li>
                  </ul>
                  <p className="text-muted-foreground">
                    Les motifs de sanction incluent : fausses annonces, usurpation d'identité, harcèlement, fraude, manipulation des avis, et tout comportement portant atteinte à la sécurité de la communauté.
                  </p>
                </section>

                <section className="mb-8">
                  <h2 className="text-xl font-semibold text-foreground">11. Limitation de Responsabilité</h2>
                  <p className="text-muted-foreground">
                    Habinex agit en tant qu'intermédiaire et ne peut être tenu responsable :
                  </p>
                  <ul className="text-muted-foreground list-disc pl-6 space-y-1">
                    <li>De la qualité ou de l'état des biens publiés par les utilisateurs.</li>
                    <li>Des litiges entre utilisateurs concernant une transaction immobilière.</li>
                    <li>De la véracité des informations fournies par les utilisateurs, malgré les processus de vérification.</li>
                    <li>Des interruptions temporaires de service pour maintenance ou mise à jour.</li>
                  </ul>
                </section>

                <section className="mb-8">
                  <h2 className="text-xl font-semibold text-foreground">12. Propriété Intellectuelle</h2>
                  <p className="text-muted-foreground">
                    L'ensemble des éléments de la Plateforme (logo, design, code, contenu éditorial) est protégé par le droit de la propriété intellectuelle. Toute reproduction sans autorisation est interdite. Les contenus publiés par les utilisateurs restent leur propriété mais font l'objet d'une licence d'utilisation non exclusive au profit de Habinex.
                  </p>
                </section>

                <section className="mb-8">
                  <h2 className="text-xl font-semibold text-foreground">13. Modification des CGU</h2>
                  <p className="text-muted-foreground">
                    Habinex se réserve le droit de modifier les présentes CGU à tout moment. Les utilisateurs seront informés de toute modification substantielle. La poursuite de l'utilisation de la Plateforme après modification vaut acceptation des nouvelles conditions.
                  </p>
                </section>

                <section className="mb-8">
                  <h2 className="text-xl font-semibold text-foreground">14. Droit Applicable et Litiges</h2>
                  <p className="text-muted-foreground">
                    Les présentes CGU sont régies par le droit camerounais. En cas de litige, les parties s'engagent à rechercher une solution amiable. À défaut, les tribunaux compétents de Yaoundé seront saisis.
                  </p>
                </section>

                <section className="mb-8">
                  <h2 className="text-xl font-semibold text-foreground">15. Contact</h2>
                  <p className="text-muted-foreground">
                    Pour toute question relative aux présentes CGU, contactez-nous à : <strong>support@habinex.com</strong>
                  </p>
                </section>
              </>
            ) : (
              <>
                <section className="mb-8">
                  <h2 className="text-xl font-semibold text-foreground">1. Purpose</h2>
                  <p className="text-muted-foreground">
                    These Terms of Service (hereinafter "ToS") govern access to and use of the Habinex platform (hereinafter "the Platform"), accessible via web and mobile applications. Habinex is an intelligent real estate platform connecting home seekers, property owners, real estate agents, and agencies in Africa.
                  </p>
                </section>

                <section className="mb-8">
                  <h2 className="text-xl font-semibold text-foreground">2. Registration and User Accounts</h2>
                  <p className="text-muted-foreground">
                    Registration on the Platform is open to any adult individual or legal entity. During registration, users agree to provide accurate, complete, and up-to-date information. Four types of accounts are available:
                  </p>
                  <ul className="text-muted-foreground list-disc pl-6 space-y-1">
                    <li><strong>Seeker</strong>: person looking for housing for rent, shared living, or purchase.</li>
                    <li><strong>Owner</strong>: person offering one or more real estate properties.</li>
                    <li><strong>Real estate agent</strong>: professional managing properties on behalf of owners.</li>
                    <li><strong>Real estate agency</strong>: professional property management structure.</li>
                  </ul>
                </section>

                <section className="mb-8">
                  <h2 className="text-xl font-semibold text-foreground">3. Identity Verification</h2>
                  <p className="text-muted-foreground">
                    Owners, agents, and agencies are required to submit the following documents for verification:
                  </p>
                  <ul className="text-muted-foreground list-disc pl-6 space-y-1">
                    <li>A front and back photo of their national ID card or passport.</li>
                    <li>A selfie holding the ID document visibly.</li>
                  </ul>
                  <p className="text-muted-foreground">
                    These documents will be reviewed by our administration team. <strong>Until verification is approved by an administrator, listings published by the user will remain in draft mode and will not be visible on the Platform.</strong> The user may still use all other Platform features during this process.
                  </p>
                </section>

                <section className="mb-8">
                  <h2 className="text-xl font-semibold text-foreground">4. Listing Publication</h2>
                  <p className="text-muted-foreground">
                    Property listings must comply with the following rules:
                  </p>
                  <ul className="text-muted-foreground list-disc pl-6 space-y-1">
                    <li>Information (price, area, location, amenities) must be accurate and verifiable.</li>
                    <li>Photos must represent the actual property and not be misleading.</li>
                    <li>Any fraudulent or misleading listing will be removed without notice and may result in account suspension.</li>
                    <li>Listings must not contain discriminatory, offensive, or illegal content.</li>
                  </ul>
                </section>

                <section className="mb-8">
                  <h2 className="text-xl font-semibold text-foreground">5. Trust and Reputation System</h2>
                  <p className="text-muted-foreground">
                    Habinex uses a trust score system based on identity verification levels, user reviews, response rates, and transaction history. Any abuse of the rating system is strictly prohibited and sanctioned.
                  </p>
                </section>

                <section className="mb-8">
                  <h2 className="text-xl font-semibold text-foreground">6. Messaging and Communication</h2>
                  <p className="text-muted-foreground">
                    Users must communicate respectfully, not send spam or unsolicited commercial content, and not harass other users through the Platform's messaging system.
                  </p>
                </section>

                <section className="mb-8">
                  <h2 className="text-xl font-semibold text-foreground">7. Transactions and Payments</h2>
                  <p className="text-muted-foreground">
                    Financial transactions on the Platform (boosts, Pro subscriptions, escrow services) are displayed in CFA Francs (XAF). Commissions are transparent, and escrow transactions protect both parties. Any transaction dispute must be reported within 7 days.
                  </p>
                </section>

                <section className="mb-8">
                  <h2 className="text-xl font-semibold text-foreground">8. Data Protection</h2>
                  <p className="text-muted-foreground">
                    Habinex is committed to protecting users' personal data in accordance with applicable laws. Data is never sold to third parties. Users may request deletion of their data at any time.
                  </p>
                </section>

                <section className="mb-8">
                  <h2 className="text-xl font-semibold text-foreground">9. Moderation and Sanctions</h2>
                  <p className="text-muted-foreground">
                    Habinex reserves the right to remove non-compliant content, suspend accounts, and report illegal behavior to authorities. Sanctions include: fake listings, identity theft, harassment, fraud, and review manipulation.
                  </p>
                </section>

                <section className="mb-8">
                  <h2 className="text-xl font-semibold text-foreground">10. Limitation of Liability</h2>
                  <p className="text-muted-foreground">
                    Habinex acts as an intermediary and cannot be held responsible for property quality, user disputes, information accuracy, or temporary service interruptions.
                  </p>
                </section>

                <section className="mb-8">
                  <h2 className="text-xl font-semibold text-foreground">11. Applicable Law</h2>
                  <p className="text-muted-foreground">
                    These ToS are governed by Cameroonian law. In case of dispute, parties agree to seek an amicable solution first. Otherwise, the competent courts of Yaoundé shall have jurisdiction.
                  </p>
                </section>

                <section className="mb-8">
                  <h2 className="text-xl font-semibold text-foreground">12. Contact</h2>
                  <p className="text-muted-foreground">
                    For any questions regarding these ToS, contact us at: <strong>support@habinex.com</strong>
                  </p>
                </section>
              </>
            )}
          </article>
        </div>
      </div>
    </>
  );
};

export default Terms;
