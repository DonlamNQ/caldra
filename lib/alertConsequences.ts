// Conséquences pédagogiques par type d'alerte — 3 variantes chacune, pour avoir du
// stock et tourner sans lasser. Ton : direct, imagé, jamais de prédiction de marché,
// jamais culpabilisant. Servent désormais de matière aux « messages du jour »
// (lib/coachNotes.ts), pas dans le feed (qui affiche le détail technique).

export const ALERT_CONSEQUENCES: Record<string, string[]> = {
  outside_session: [
    "Les trades hors de tes heures planifiées sont souvent dictés par l'ennui — et l'ennui ne paie jamais.",
    "Trader hors de ta fenêtre, c'est trader sans préparation : le marché punit l'improvisation.",
    "Tes meilleures heures, tu les as choisies à froid. Le reste, c'est du hasard déguisé.",
  ],
  revenge_sizing: [
    "Doubler la mise pour se refaire est la première cause de compte explosé. Le marché ne te doit rien.",
    "La vengeance n'est pas une stratégie : grossir après une perte transforme une erreur en désastre.",
    "Vouloir récupérer vite ce qu'on vient de perdre, c'est exactement comme ça qu'on perd le reste.",
  ],
  immediate_reentry: [
    "Reprendre une position dans la seconde, c'est l'émotion qui trade à ta place.",
    "Le marché sera encore là dans 5 minutes. Ton sang-froid, peut-être pas si tu te précipites.",
    "Une re-entrée impulsive, c'est rarement une analyse — c'est un réflexe de joueur.",
  ],
  overtrading: [
    "Multiplier les trades dilue ton edge et engraisse ton courtier, pas ton compte.",
    "Trop trader, c'est confondre activité et productivité. Les meilleurs savent attendre.",
    "Chaque trade en trop est une décision de moins bonne qualité. La quantité tue la qualité.",
  ],
  averaging_down: [
    "Renforcer une position perdante transforme une petite perte en trou qui efface ta semaine.",
    "Moyenner à la baisse, c'est ajouter de l'argent à une idée qui a déjà tort.",
    "Ajouter à une position perdante augmente ton exposition au moment où la thèse est déjà en défaut.",
  ],
  euphoria_sizing: [
    "Gonfler la taille après un gain, c'est l'excès de confiance qui prépare la prochaine grosse perte.",
    "L'euphorie voit des certitudes là où il n'y a que de la chance.",
    "Un gain ne rend pas le suivant plus sûr. Même taille, tête froide.",
  ],
  accelerating_frequency: [
    "Quand le rythme s'emballe en perdant, ce n'est plus du trading, c'est du tilt.",
    "Trader de plus en plus vite, c'est le signe que la raison a quitté la pièce.",
    "L'accélération en territoire perdant précède presque toujours la grosse bêtise.",
  ],
  end_of_day_desperation: [
    "Vouloir rattraper avant la clôture pousse à des risques qu'on refuserait le matin.",
    "Le trade de la dernière minute est rarement le meilleur — c'est celui du désespoir.",
    "Finir en beauté ne se décide pas dans la panique des dernières minutes.",
  ],
  news_trading: [
    "Trader une news à fort impact, c'est jouer à pile ou face avec un spread élargi.",
    "Sur une annonce, le hasard décide — pas ton analyse. Laisse passer l'orage.",
    "La volatilité des news ne récompense pas le courage, elle punit l'imprudence.",
  ],
  consecutive_losses: [
    "Une série de pertes use le mental. Continuer sans pause, c'est trader en mode dégradé.",
    "Après plusieurs pertes, ton jugement est altéré — c'est le moment de t'arrêter, pas d'insister.",
    "Les pertes en chaîne sont un signal d'arrêt, pas un défi à relever.",
  ],
  drawdown_alert: [
    "Ta limite de perte journalière transforme une mauvaise journée en simple mauvaise journée.",
    "Au-delà de ton drawdown max, une journée moyenne devient une catastrophe. Protège ton capital.",
    "Le drawdown maîtrisé, c'est ce qui te permet d'être encore là demain.",
  ],
  stop_not_respected: [
    "Laisser courir une perte au-delà du stop, c'est une seule fois qui efface des dizaines de bons trades.",
    "Un stop ignoré, c'est un contrat rompu avec toi-même. La discipline commence là.",
    "Le stop n'est pas une suggestion : c'est la frontière entre une perte et une blessure.",
  ],
  risk_exceeded: [
    "Une position trop grosse, c'est un seul trade qui peut abîmer tout ton mois.",
    "Le sizing décide de ta survie bien avant de décider de ton profit.",
    "Risquer trop sur un trade, c'est donner au hasard le pouvoir de te ruiner.",
  ],
  overleverage: [
    "Le levier amplifie tout — surtout tes erreurs. Un petit mouvement suffit à liquider.",
    "Plus le levier est élevé, plus une faible variation de prix suffit à entamer ton capital.",
    "Un levier élevé réduit la marge d'erreur : la liquidation arrive plus tôt qu'on ne l'anticipe.",
  ],
  no_stop: [
    "Un trade sans stop, c'est un risque illimité : il suffit d'un gap pour tout emporter.",
    "Sans stop, ta perte n'a pas de limite définie : un gap peut l'élargir bien au-delà de ce que tu avais prévu.",
    "Le stop, c'est la première ligne que tu écris avant d'entrer — jamais après.",
  ],
  cut_winners_hold_losers: [
    "Couper tes gains vite et garder tes pertes, c'est inverser ton ratio risque/récompense — perdant à terme.",
    "Laisse courir tes gagnants, coupe tes perdants. Faire l'inverse, c'est saboter ton edge.",
    "Encaisser trop tôt et espérer trop longtemps : le duo qui ruine les bons systèmes.",
  ],
  drawdown_override: [
    "Continuer après avoir dépassé ta limite, c'est le scénario classique du compte explosé en une session.",
    "La règle que tu ignores aujourd'hui est celle qui te coûtera le plus cher.",
    "Dépasser son drawdown max et continuer, c'est choisir l'émotion contre la survie.",
  ],
  unfamiliar_symbol: [
    "Trader un actif que tu ne suis pas, c'est sortir de ta zone de compétence sans tes repères.",
    "Chaque instrument a son rythme. En découvrir un en risquant de l'argent, c'est payer pour apprendre.",
    "L'opportunité sur un actif inconnu est souvent un mirage : tu n'as pas l'avantage que tu crois.",
  ],
}

/** Toutes les conséquences, à plat (pour alimenter les messages du jour). */
export function allConsequences(): string[] {
  return Object.values(ALERT_CONSEQUENCES).flat()
}
