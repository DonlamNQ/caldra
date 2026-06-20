// Messages "mindset" de Caldra — la voix du coach, façon Duolingo : un message par
// jour, stable sur la journée, qui tourne. Ton : discipline, process, gestion du
// risque, patience. Jamais de prédiction de marché, jamais culpabilisant.

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
]

/** Message du jour, stable sur la journée et tournant (basé sur le quantième). */
export function noteOfTheDay(d: Date = new Date()): string {
  const start = Date.UTC(d.getUTCFullYear(), 0, 0)
  const dayOfYear = Math.floor((Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()) - start) / 86_400_000)
  return COACH_NOTES[dayOfYear % COACH_NOTES.length]
}
