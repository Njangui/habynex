// Contenu SEO unique par quartier — utilisé sur /quartier/[slug]
// Objectif : éviter le "thin content" (pages quasi vides composées
// uniquement de listes d'annonces filtrées), qui est mal vu par Google.

export interface NeighborhoodContent {
  intro: string
  ambiance: string
  transport: string
  priceRange: string
  goodFor: string[]
  faq: { question: string; answer: string }[]
}

export const NEIGHBORHOOD_CONTENT: Record<string, NeighborhoodContent> = {
  simbock: {
    intro:
      "Simbock est un quartier résidentiel situé au sud de Yaoundé, apprécié pour son calme et son cadre verdoyant. À mi-chemin entre la ville et la périphérie, il attire des familles et des étudiants à la recherche d'un logement abordable sans s'éloigner trop du centre.",
    ambiance:
      'Quartier calme et en développement, avec de nombreuses constructions récentes. La vie de quartier reste simple : petites boutiques, marchés de proximité et axes routiers en amélioration.',
    transport:
      "Simbock est relié au centre-ville par plusieurs axes desservis par les taxis et motos-taxis. Le trajet vers le centre administratif prend généralement entre 20 et 35 minutes selon la circulation.",
    priceRange:
      'Les loyers à Simbock sont parmi les plus accessibles de Yaoundé : comptez généralement entre 25 000 et 80 000 FCFA pour un studio ou une chambre meublée, et au-delà pour les appartements plus spacieux.',
    goodFor: ['Étudiants', 'Jeunes actifs', 'Budgets serrés', 'Familles cherchant le calme'],
    faq: [
      {
        question: 'Simbock est-il un quartier sûr pour étudier ou vivre seul ?',
        answer:
          "Simbock est globalement considéré comme un quartier paisible, avec une présence communautaire forte. Comme partout, il est recommandé de privilégier les logements situés près des axes principaux et bien éclairés.",
      },
      {
        question: 'Quel est le prix moyen d\'un studio à Simbock ?',
        answer:
          'Un studio meublé se loue généralement entre 35 000 et 65 000 FCFA par mois, selon l\'état du logement et sa proximité avec les axes principaux.',
      },
    ],
  },

  jouvence: {
    intro:
      "Jouvence est un quartier dynamique de Yaoundé, en pleine expansion immobilière. Mélange de constructions modernes et de logements traditionnels, il séduit autant les familles que les jeunes professionnels grâce à son bon rapport qualité-prix.",
    ambiance:
      'Quartier animé, avec une activité commerciale croissante : commerces de proximité, restaurants et nouveaux immeubles résidentiels qui transforment progressivement le paysage urbain.',
    transport:
      "Jouvence bénéficie d'une bonne desserte par taxi et moto-taxi vers les principaux axes de Yaoundé. La proximité avec plusieurs grands axes facilite les déplacements vers le centre-ville.",
    priceRange:
      'Les prix varient fortement selon le standing : entre 100 000 et 250 000 FCFA pour un appartement meublé de 2 à 3 chambres, et au-delà pour les duplex ou villas en vente.',
    goodFor: ['Familles', 'Cadres et professionnels', 'Investissement locatif', 'Logements de standing'],
    faq: [
      {
        question: 'Jouvence est-il adapté pour une famille ?',
        answer:
          "Oui, Jouvence offre une bonne variété de logements familiaux (appartements et duplex de 2 à 4 chambres) ainsi qu'un accès facile aux commerces et écoles environnantes.",
      },
      {
        question: "Peut-on trouver des biens à vendre à Jouvence ?",
        answer:
          "Oui, Jouvence est l'un des quartiers de Yaoundé où l'offre de vente (duplex, appartements) est en croissance, en raison de son développement immobilier actif.",
      },
    ],
  },

  'biyem-assi': {
    intro:
      "Biyem-Assi est l'un des quartiers les plus peuplés et les plus animés de Yaoundé. Véritable petite ville dans la ville, il combine vie étudiante, commerces et habitat dense, ce qui en fait un choix populaire pour louer un logement à prix accessible.",
    ambiance:
      "Quartier très vivant et commerçant, avec un grand marché, de nombreux commerces ouverts tard et une vie de quartier animée à toute heure. L'ambiance est typique des grands quartiers populaires de Yaoundé.",
    transport:
      "Biyem-Assi est très bien desservi par les taxis et motos-taxis, avec un accès direct vers plusieurs axes majeurs de la ville. C'est l'un des quartiers les mieux connectés au reste de Yaoundé.",
    priceRange:
      'Les loyers vont de 20 000 à 45 000 FCFA pour une chambre ou un studio non meublé, et peuvent dépasser 100 000 FCFA pour un appartement meublé de plusieurs pièces.',
    goodFor: ['Étudiants', 'Petits budgets', 'Vie pratique et commerçante', 'Accès rapide au centre-ville'],
    faq: [
      {
        question: 'Pourquoi choisir Biyem-Assi pour se loger ?',
        answer:
          "Biyem-Assi offre un accès facile à tout : transports, marchés, commerces et services, avec des prix de loyer parmi les plus bas de Yaoundé pour les logements simples.",
      },
      {
        question: "Y a-t-il des chambres non meublées disponibles à Biyem-Assi ?",
        answer:
          "Oui, c'est l'un des quartiers où l'offre de chambres non meublées à petit budget est la plus importante, généralement entre 15 000 et 25 000 FCFA par mois.",
      },
    ],
  },

  tkc: {
    intro:
      "TKC est un quartier résidentiel apprécié pour son calme relatif et sa proximité avec plusieurs grands axes de Yaoundé. Il attire principalement des familles et des locataires recherchant un compromis entre tranquillité et accessibilité.",
    ambiance:
      'Quartier essentiellement résidentiel, avec des rues plus calmes que dans les zones commerçantes voisines. On y trouve un mélange de villas, duplex et petits immeubles.',
    transport:
      "TKC est accessible par taxi depuis les principaux axes de Yaoundé. La circulation reste fluide en dehors des heures de pointe.",
    priceRange:
      'Les loyers à TKC se situent généralement entre 80 000 et 350 000 FCFA selon le type de bien (appartement meublé, villa de plusieurs chambres).',
    goodFor: ['Familles', 'Locataires recherchant le calme', 'Villas et grands appartements'],
    faq: [
      {
        question: 'TKC convient-il pour une villa familiale ?',
        answer:
          "Oui, TKC propose une offre intéressante de villas de plusieurs chambres, adaptées aux familles cherchant plus d'espace tout en restant proches du centre de Yaoundé.",
      },
    ],
  },

  awae: {
    intro:
      "Awae est un quartier en pleine croissance situé à l'est de Yaoundé. Longtemps considéré comme excentré, il devient progressivement une alternative intéressante pour les locataires cherchant des logements neufs à des prix plus abordables qu'au centre-ville.",
    ambiance:
      "Zone en développement, avec de nombreuses nouvelles constructions. L'ambiance est plus calme et moins dense que dans les quartiers centraux, avec un cadre encore semi-rural par endroits.",
    transport:
      "L'accès à Awae se fait principalement par taxi ou moto-taxi, avec un temps de trajet plus long vers le centre-ville comparé aux quartiers centraux. Les axes routiers sont en cours d'amélioration.",
    priceRange:
      'Awae propose certains des loyers les plus accessibles de Yaoundé pour des logements récents : studios et chambres souvent disponibles entre 25 000 et 65 000 FCFA.',
    goodFor: ['Petits budgets', 'Logements neufs', 'Étudiants', 'Locataires acceptant un trajet plus long'],
    faq: [
      {
        question: "Awae est-il loin du centre de Yaoundé ?",
        answer:
          "Awae est situé en périphérie est de Yaoundé. Le trajet vers le centre-ville prend généralement plus de temps que depuis les quartiers centraux, mais les prix de location y sont nettement plus bas.",
      },
    ],
  },

  'nkol-eton': {
    intro:
      "Nkol-Eton est un quartier voisin d'Awae, à l'est de Yaoundé, qui connaît un développement immobilier similaire. Il offre des logements à prix doux dans un cadre encore peu dense.",
    ambiance:
      "Quartier résidentiel en expansion, avec une activité commerciale locale modeste mais croissante au fil des nouvelles constructions.",
    transport:
      "Desservi par taxi depuis les axes voisins d'Awae et Olembe, avec un accès progressif aux grands axes de Yaoundé.",
    priceRange:
      'Les prix restent accessibles, comparables à ceux d\'Awae : studios et chambres généralement entre 20 000 et 60 000 FCFA.',
    goodFor: ['Petits budgets', 'Logements récents', 'Calme et tranquillité'],
    faq: [],
  },

  odza: {
    intro:
      "Odza est un quartier périphérique de Yaoundé en forte expansion, situé à proximité de l'aéroport. Il attire de plus en plus de nouveaux résidents grâce à des prix attractifs et à de nombreuses constructions récentes.",
    ambiance:
      "Zone en développement actif, avec un mélange de quartiers résidentiels neufs et de zones encore en construction. L'activité commerciale se densifie progressivement.",
    transport:
      "Odza est accessible par taxi depuis le centre-ville, avec un temps de trajet variable selon la circulation sur les axes principaux qui y mènent.",
    priceRange:
      'Odza propose une bonne diversité de prix, des chambres simples à partir de 20 000 FCFA jusqu\'à des appartements ou villas plus haut de gamme.',
    goodFor: ['Petits et moyens budgets', 'Familles', 'Proximité aéroport'],
    faq: [],
  },

  emana: {
    intro:
      "Emana est un quartier situé au nord de Yaoundé, connu pour sa proximité avec l'Université de Yaoundé I. C'est un quartier prisé par les étudiants et le personnel universitaire, avec une offre importante de petits logements.",
    ambiance:
      "Quartier à forte présence étudiante, animé en permanence par la vie universitaire : librairies, restaurants rapides, cybercafés et logements meublés pour étudiants.",
    transport:
      "Emana est bien relié au reste de Yaoundé par taxi, avec un accès direct vers l'université et les axes du nord de la ville.",
    priceRange:
      'Les chambres et studios pour étudiants sont disponibles à partir de 15 000 à 40 000 FCFA, avec des options meublées légèrement plus chères.',
    goodFor: ['Étudiants', 'Personnel universitaire', 'Petits budgets', 'Logements meublés'],
    faq: [
      {
        question: 'Emana est-il adapté aux étudiants de l\'Université de Yaoundé I ?',
        answer:
          "Oui, Emana est l'un des quartiers les plus proches de l'Université de Yaoundé I et propose une large offre de chambres et studios pensés pour les étudiants, à des prix accessibles.",
      },
    ],
  },
}

export function getNeighborhoodContent(slug: string): NeighborhoodContent | null {
  return NEIGHBORHOOD_CONTENT[slug] ?? null
}
