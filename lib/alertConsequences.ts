// Conséquences pédagogiques par type d'alerte — la couche « communication » de Caldra.
// Chaque alerte ne dit pas juste CE QUI s'est passé, mais CE QUE le comportement peut
// PROVOQUER. Ton : direct, factuel, comportemental — jamais de prédiction de marché,
// jamais culpabilisant. Une phrase courte.
// Toute nouvelle alerte de lib/engine.ts devrait avoir sa conséquence ici.

export const ALERT_CONSEQUENCES: Record<string, string> = {
  outside_session:
    "Les trades hors de tes heures planifiées sont souvent dictés par l'ennui ou l'impulsivité — statistiquement les plus perdants.",
  revenge_sizing:
    "Augmenter la taille pour « se refaire » après une perte est la première cause de compte explosé.",
  immediate_reentry:
    "Reprendre une position dans la foulée, c'est réagir à l'émotion plutôt qu'à ton plan — l'erreur s'enchaîne.",
  overtrading:
    "Multiplier les trades dilue ton edge et accumule les frais — la qualité prime sur la quantité.",
  averaging_down:
    "Renforcer une position perdante transforme une petite perte en perte qui peut effacer ta semaine.",
  euphoria_sizing:
    "Gonfler la taille après un gain (excès de confiance) rend le prochain trade perdant bien plus cher.",
  accelerating_frequency:
    "Quand le rythme s'emballe en perdant, c'est le tilt : les décisions deviennent réactives et coûteuses.",
  end_of_day_desperation:
    "Vouloir rattraper juste avant la clôture pousse à des risques qu'on ne prendrait jamais le matin.",
  news_trading:
    "Trader sur une news à fort impact avec un spread élargi, c'est laisser le hasard décider, pas ton edge.",
  unfamiliar_symbol:
    "Trader un actif que tu ne suis pas d'habitude, c'est sortir de ta zone de compétence — tu n'as pas tes repères.",
  consecutive_losses:
    "Une série de pertes use le mental ; continuer sans pause, c'est trader en dégradé et creuser le trou.",
  drawdown_alert:
    "Au-delà de ta limite de perte journalière, une mauvaise journée peut devenir une catastrophe.",
  stop_not_respected:
    "Laisser courir une perte au-delà de ton stop, c'est une seule fois qui peut effacer des dizaines de bons trades.",
  risk_exceeded:
    "Une position trop grosse pour ton risque, c'est un seul trade qui peut abîmer tout ton mois.",
  overleverage:
    "Un levier excessif amplifie les pertes autant que les gains — un petit mouvement contre toi suffit à liquider.",
  no_stop:
    "Un trade sans stop, c'est un risque illimité : il suffit d'un gap pour faire très mal.",
  cut_winners_hold_losers:
    "Couper tes gains vite et garder tes pertes longtemps inverse ton ratio risque/récompense — mathématiquement perdant.",
  drawdown_override:
    "Continuer après avoir dépassé ta limite max, c'est le scénario classique de la session qui finit en blow-up.",
}

/** Conséquence pédagogique pour un type d'alerte (ou null si inconnu). */
export function alertConsequence(type?: string | null): string | null {
  if (!type) return null
  return ALERT_CONSEQUENCES[type] ?? null
}
