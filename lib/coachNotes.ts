// Messages "mindset" de Caldra — la voix du coach, façon Duolingo. Le pool affiché
// dans la sidebar (« message du jour ») = ces citations + les conséquences
// pédagogiques par alerte (lib/alertConsequences.ts). Ton : discipline, process,
// gestion du risque, patience. Jamais de prédiction de marché, jamais culpabilisant.

import { allConsequences } from './alertConsequences'

export const COACH_NOTES: string[] = [
  "La discipline, c'est répéter le bon geste même quand tu n'en as pas envie.",
  "Un bon trade peut être perdant, un mauvais peut être gagnant. Juge le process, pas le résultat.",
  "Le marché sera encore là demain. Ton capital, seulement si tu le protèges.",
  "Ne cherche pas à te refaire. Cherche à bien faire.",
  "Le meilleur trade est parfois celui que tu ne prends pas.",
  "Ton pire ennemi n'est pas le marché, c'est ton impatience.",
  "Couper une perte tôt n'est pas un échec, c'est une compétence.",
  "La taille de ta position décide de ta survie, pas de ton profit.",
  "Respecter ton stop, c'est respecter ton plan — donc te respecter toi.",
  "L'overtrading transforme un bon edge en simples frais de courtage.",
  "Trade le plan, pas l'émotion du moment.",
  "La constance bat l'intensité : un peu, bien, tous les jours.",
  "Le revenge trading, c'est payer deux fois la même erreur.",
  "Les opportunités viennent à ceux qui attendent leur setup.",
  "Tu ne contrôles pas le marché. Tu contrôles ton risque et tes réactions.",
  "Une journée sans trade peut être ta meilleure décision de la semaine.",
  "Le levier amplifie tout — surtout tes erreurs.",
  "Gagner lentement, c'est gagner longtemps.",
  "Ce que tu mesures, tu l'améliores : relis tes sessions.",
  "La peur et l'euphorie sont de mauvais conseillers de sizing.",
  "Protéger son capital n'est pas timide, c'est professionnel.",
  "Un plan ennuyeux exécuté parfaitement bat un plan génial exécuté n'importe comment.",
  "Tu n'as pas besoin d'avoir raison souvent, juste de perdre petit et gagner grand.",
  "Le marché récompense la patience, pas l'agitation.",
  "Sauter un trade douteux, c'est déjà gagner — tu as protégé ton capital et ton mental.",
  "La meilleure position est parfois aucune position.",
  "Ton edge ne vaut rien sans la discipline pour l'appliquer chaque jour.",
  "Accepter une petite perte aujourd'hui, c'est s'éviter une grosse demain.",
  "Le pro vise la régularité ; l'amateur vise le coup d'éclat.",
  "Tes règles te protègent surtout de toi-même.",
]

// Pool complet du « message du jour » : citations + conséquences par alerte.
const POOL = [...COACH_NOTES, ...allConsequences()]

/** Message du jour, stable sur la journée et tournant (basé sur le quantième). */
export function noteOfTheDay(d: Date = new Date()): string {
  const start = Date.UTC(d.getUTCFullYear(), 0, 0)
  const dayOfYear = Math.floor((Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()) - start) / 86_400_000)
  return POOL[dayOfYear % POOL.length]
}

/** Un message au hasard dans tout le pool (varie à chaque visite). */
export function randomNote(): string {
  return POOL[Math.floor(Math.random() * POOL.length)]
}
