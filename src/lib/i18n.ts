import { useState, useEffect } from 'react';
import { getCookie, setCookie } from './storage';

export type Language = 'en' | 'de' | 'es' | 'fr' | 'pirate' | 'klingon';

export interface LanguageOption {
  code: Language;
  name: string;
  flag: string;
}

export const LANGUAGES: LanguageOption[] = [
  { code: 'en', name: 'English', flag: '🇬🇧' },
  { code: 'de', name: 'Deutsch', flag: '🇩🇪' },
  { code: 'es', name: 'Español', flag: '🇪🇸' },
  { code: 'fr', name: 'Français', flag: '🇫🇷' },
  { code: 'pirate', name: 'Pirate Speak', flag: '🏴‍☠️' },
  { code: 'klingon', name: 'tlhIngan Hol', flag: '🛸' },
];

const STORAGE_LANG_KEY = 'pocketchips_lang';

export const translations = {
  en: {
    // Branding & Navigation
    tagline: 'Serverless P2P Poker Chip Counter & Side Pot Assistant for Texas Hold\'em',
    host_game: 'Host Game',
    join_game: 'Join Game',
    room_code: 'Room Code',
    your_name: 'Your Name',
    enter_name: 'Enter your name...',
    initial_chips: 'Initial Chips',
    blinds: 'Blinds',
    small_blind: 'Small Blind',
    big_blind: 'Big Blind',
    create_table: 'Create Poker Table',
    enter_table: 'Join Table',
    scan_qr: 'Scan to Join Table',
    copy_link: 'Copy Direct Link',
    link_copied: 'Link Copied!',
    rejoin_last: 'Rejoin Previous Table',

    // Status & Network
    online: 'Online',
    reconnecting: 'Reconnecting...',
    host_offline_banner: 'Host table is offline or screen locked. Trying to reconnect automatically...',
    waiting_next_hand: 'Waiting for the next round...',
    waiting_on: 'Waiting on {name} to act...',
    you_folded: 'You have folded. Waiting for the hand to complete...',
    you_all_in: 'You are ALL-IN! Watching the action unfold...',
    your_turn: 'Your Turn!',
    screen_awake: 'Screen Awake',

    // Table & Pots
    total_pot: 'Total Pot',
    main_pot: 'Main',
    side_pot: 'Side {index}',
    current_bet: 'Current Bet',
    min_raise: 'Min Raise',
    hand_number: 'Hand #{number}',
    players: '{count} Players',
    dealer_badge: 'D',

    // Actions
    fold: 'Fold',
    check: 'Check',
    call: 'Call ${amount}',
    call_all_in: 'Call All-In (${amount})',
    bet: 'Bet',
    raise: 'Raise to ${amount}',
    all_in: 'All-In (${amount})',
    pot: 'Pot',
    half_pot: '1/2 Pot',

    // Streets
    preflop: 'Preflop',
    flop: 'Flop',
    turn: 'Turn',
    river: 'River',
    showdown: 'Showdown',

    // Dealer instructions
    dealer_deal_preflop: 'Dealer ({name}): Deal 2 hole cards face down to each player.',
    dealer_deal_flop: 'Dealer ({name}): Burn 1 card, then deal the FLOP (3 community cards face up).',
    dealer_deal_turn: 'Dealer ({name}): Burn 1 card, then deal the TURN (4th community card face up).',
    dealer_deal_river: 'Dealer ({name}): Burn 1 card, then deal the RIVER (5th community card face up).',
    confirm_dealt: 'I have dealt the cards',
    cards_dealt_waiting: 'Physical cards dealt. Betting in progress...',

    // Showdown & Winners
    resolving_pot: 'Resolving Pot {index}',
    resolving_main_pot: 'Resolving Main Pot (${amount})',
    resolving_side_pot: 'Resolving Side Pot {index} (${amount})',
    select_winners: 'Tap winning player(s) holding the best 5-card hand:',
    split_pot: 'Split Pot (${amount} each)',
    confirm_payout: 'Award Pot (${amount})',
    all_pots_awarded: 'All pots have been awarded for this hand!',
    deal_next_hand: 'Deal Next Hand',

    // Modals & Extras
    hand_rankings: 'Hand Rankings',
    hand_rankings_short: 'Hands',
    hand_rankings_title: 'Texas Hold\'em Hand Rankings',
    hand_rankings_sub: 'From strongest to weakest (5 best cards determine winner)',
    action_log: 'Action Log',
    table_reactions: 'Reactions',
    react: 'React',
    close: 'Close',
    leave_table: 'Leave Table',
    close_table: 'Close Table',
    undo: 'Undo',
    pause: 'Pause',
    start_hand: 'Start Hand',
    manage_players: 'Players',
    settings: 'Settings',

    // Action Log entries
    log_table_created: 'Table created. Waiting for players to join.',
    log_hand_started: '--- Hand #{number} Started ---',
    log_dealing_street: '--- Dealing {street} ---',
    log_showdown: '--- Showdown: Select winners for each pot ---',
    log_post_sb: '{name} posts Small Blind {amount}.',
    log_post_bb: '{name} posts Big Blind {amount}.',
    log_fold: '{name} folds.',
    log_check: '{name} checks.',
    log_call: '{name} calls {amount}.',
    log_call_all_in: '{name} calls {amount} and is ALL-IN!',
    log_bet: '{name} bets {amount}.',
    log_bet_all_in: '{name} bets {amount} and is ALL-IN!',
    log_raise: '{name} raises to {amount}.',
    log_raise_all_in: '{name} raises to {amount} and is ALL-IN!',
    log_wins_folded: '{name} wins {amount} chips (all opponents folded).',
    log_pot_awarded: '{pot} (${amount}) awarded to {winners}.',
    log_pots_distributed: 'All pots distributed. Hand complete. Ready for next hand.',
    log_undo: '<- Host undid last action.',
    log_force_folded: '{name} was force-folded by host.',
    log_joined: '{name} joined the table with {chips} chips.',
    log_left: '{name} left the table (auto-folded).',
    log_rebought: '{name} re-bought +{chips} (Stack: {total}).',
    log_blinds_increased: 'Blinds increased to {sb}/{bb}.',
    log_cards_dealt: '{name} confirmed physical cards dealt for {street}.',
    log_sitting_out: '{name} is now sitting out.',
    log_back_in_game: '{name} is back in the game.',
    log_seating_adjusted: 'Host adjusted table seating ({name} moved to Seat #{seat}).',
    log_round_restarted: '⚠️ Round restarted due to seating change: Blinds re-posted for new positions.',
  },

  de: {
    // Branding & Navigation
    tagline: 'Serverloser P2P Poker-Chipzähler & Side-Pot-Rechner für Texas Hold\'em',
    host_game: 'Tisch Eröffnen',
    join_game: 'Beitreten',
    room_code: 'Raum-Code',
    your_name: 'Dein Name',
    enter_name: 'Name eingeben...',
    initial_chips: 'Start-Chips',
    blinds: 'Blinds',
    small_blind: 'Small Blind',
    big_blind: 'Big Blind',
    create_table: 'Pokertisch Eröffnen',
    enter_table: 'Tisch Beitreten',
    scan_qr: 'Scannen zum Beitreten',
    copy_link: 'Link Kopieren',
    link_copied: 'Link Kopiert!',
    rejoin_last: 'Letztem Tisch Wieder Beitreten',

    // Status & Network
    online: 'Online',
    reconnecting: 'Verbindung wird wiederhergestellt...',
    host_offline_banner: 'Host-Tisch ist offline oder gesperrt. Automatische Wiederverbindung...',
    waiting_next_hand: 'Warten auf die nächste Hand...',
    waiting_on: 'Warten auf {name}...',
    you_folded: 'Du hast gepasst (Fold). Warte auf das Rundenende...',
    you_all_in: 'Du bist ALL-IN! Verfolge die Runde...',
    your_turn: 'Du bist am Zug!',
    screen_awake: 'Display Aktiv',

    // Table & Pots
    total_pot: 'Gesamtpot',
    main_pot: 'Hauptpot',
    side_pot: 'Side-Pot {index}',
    current_bet: 'Aktueller Einsatz',
    min_raise: 'Min. Erhöhung',
    hand_number: 'Hand #{number}',
    players: '{count} Spieler',
    dealer_badge: 'D',

    // Actions
    fold: 'Passen',
    check: 'Checken',
    call: 'Mitgehen (${amount})',
    call_all_in: 'All-In Mitgehen (${amount})',
    bet: 'Setzen',
    raise: 'Erhöhen auf ${amount}',
    all_in: 'All-In (${amount})',
    pot: 'Pot',
    half_pot: '1/2 Pot',

    // Streets
    preflop: 'Preflop',
    flop: 'Flop',
    turn: 'Turn',
    river: 'River',
    showdown: 'Showdown',

    // Dealer instructions
    dealer_deal_preflop: 'Geber ({name}): Teile jedem Spieler 2 verdeckte Handkarten aus.',
    dealer_deal_flop: 'Geber ({name}): Verbrenne 1 Karte, lege den FLOP offen (3 Karten).',
    dealer_deal_turn: 'Geber ({name}): Verbrenne 1 Karte, lege den TURN offen (4. Karte).',
    dealer_deal_river: 'Geber ({name}): Verbrenne 1 Karte, lege den RIVER offen (5. Karte).',
    confirm_dealt: 'Karten wurden ausgeteilt',
    cards_dealt_waiting: 'Karten ausgeteilt. Setzrunde läuft...',

    // Showdown & Winners
    resolving_pot: 'Pot {index} auszahlen',
    resolving_main_pot: 'Hauptpot auflösen (${amount})',
    resolving_side_pot: 'Side-Pot {index} auflösen (${amount})',
    select_winners: 'Tippe auf den/die Gewinner mit dem besten 5-Karten-Blatt:',
    split_pot: 'Pot teilen (${amount} pro Person)',
    confirm_payout: 'Pot Auszahlen (${amount})',
    all_pots_awarded: 'Alle Pots dieser Hand wurden verteilt!',
    deal_next_hand: 'Nächste Hand Austeilen',

    // Modals & Extras
    hand_rankings: 'Hand-Werte',
    hand_rankings_short: 'Hände',
    hand_rankings_title: 'Texas Hold\'em Reihenfolge der Hände',
    hand_rankings_sub: 'Vom stärksten zum schwächsten Blatt (beste 5 Karten zählen)',
    action_log: 'Verlauf',
    table_reactions: 'Reaktionen',
    react: 'Reagieren',
    close: 'Schließen',
    leave_table: 'Tisch Verlassen',
    close_table: 'Tisch Schließen',
    undo: 'Rückgängig',
    pause: 'Pause',
    start_hand: 'Hand Starten',
    manage_players: 'Spieler',
    settings: 'Einstellungen',

    // Action Log entries
    log_table_created: 'Tisch erstellt. Warten auf Spieler...',
    log_hand_started: '--- Hand #{number} gestartet ---',
    log_dealing_street: '--- Gebe {street} aus ---',
    log_showdown: '--- Showdown: Gewinner für jeden Pot wählen ---',
    log_post_sb: '{name} zahlt Small Blind {amount}.',
    log_post_bb: '{name} zahlt Big Blind {amount}.',
    log_fold: '{name} passt.',
    log_check: '{name} checkt.',
    log_call: '{name} geht mit ({amount}).',
    log_call_all_in: '{name} geht mit ({amount}) und ist ALL-IN!',
    log_bet: '{name} setzt {amount}.',
    log_bet_all_in: '{name} setzt {amount} und ist ALL-IN!',
    log_raise: '{name} erhöht auf {amount}.',
    log_raise_all_in: '{name} erhöht auf {amount} und ist ALL-IN!',
    log_wins_folded: '{name} gewinnt {amount} Chips (alle Gegner gepasst).',
    log_pot_awarded: '{pot} (${amount}) geht an {winners}.',
    log_pots_distributed: 'Alle Pots verteilt. Hand beendet. Bereit für nächste Hand.',
    log_undo: '<- Host hat letzte Aktion rückgängig gemacht.',
    log_force_folded: '{name} wurde vom Host zum Passen gezwungen.',
    log_joined: '{name} ist dem Tisch beigetreten mit {chips} Chips.',
    log_left: '{name} hat den Tisch verlassen (gepasst).',
    log_rebought: '{name} hat +{chips} nachgekauft (Stack: {total}).',
    log_blinds_increased: 'Blinds erhöht auf {sb}/{bb}.',
    log_cards_dealt: '{name} hat die Karten für {street} ausgeteilt.',
    log_sitting_out: '{name} setzt jetzt aus.',
    log_back_in_game: '{name} ist wieder im Spiel.',
    log_seating_adjusted: 'Host hat Sitzplätze angepasst ({name} auf Platz #{seat}).',
    log_round_restarted: '⚠️ Runde wegen Sitzplatzänderung neu gestartet: Blinds neu gesetzt.',
  },

  es: {
    // Branding & Navigation
    tagline: 'Contador de Fichas y Asistente de Bote P2P Sin Servidor para Texas Hold\'em',
    host_game: 'Crear Mesa',
    join_game: 'Unirse a Mesa',
    room_code: 'Código de Sala',
    your_name: 'Tu Nombre',
    enter_name: 'Introduce tu nombre...',
    initial_chips: 'Fichas Iniciales',
    blinds: 'Ciegas',
    small_blind: 'Ciega Pequeña',
    big_blind: 'Ciega Grande',
    create_table: 'Crear Mesa de Poker',
    enter_table: 'Entrar a la Mesa',
    scan_qr: 'Escanear para Unirse',
    copy_link: 'Copiar Enlace',
    link_copied: '¡Enlace Copiado!',
    rejoin_last: 'Reincorporarse a la Mesa',

    // Status & Network
    online: 'En Línea',
    reconnecting: 'Reconectando...',
    host_offline_banner: 'El anfitrión está desconectado o bloqueado. Reconectando automáticamente...',
    waiting_next_hand: 'Esperando la siguiente mano...',
    waiting_on: 'Esperando a {name}...',
    you_folded: 'Te has retirado. Esperando fin de mano...',
    you_all_in: '¡Estás ALL-IN! Observa la acción...',
    your_turn: '¡Tu Turno!',
    screen_awake: 'Pantalla Activa',

    // Table & Pots
    total_pot: 'Bote Total',
    main_pot: 'Principal',
    side_pot: 'Bote Sec. {index}',
    current_bet: 'Apuesta Actual',
    min_raise: 'Subida Mín.',
    hand_number: 'Mano #{number}',
    players: '{count} Jugadores',
    dealer_badge: 'D',

    // Actions
    fold: 'Retirarse',
    check: 'Pasar',
    call: 'Igualar (${amount})',
    call_all_in: 'Igualar All-In (${amount})',
    bet: 'Apostar',
    raise: 'Subir a ${amount}',
    all_in: 'All-In (${amount})',
    pot: 'Bote',
    half_pot: '1/2 Bote',

    // Streets
    preflop: 'Preflop',
    flop: 'Flop',
    turn: 'Turn',
    river: 'River',
    showdown: 'Showdown',

    // Dealer instructions
    dealer_deal_preflop: 'Repartidor ({name}): Reparte 2 cartas ocultas a cada jugador.',
    dealer_deal_flop: 'Repartidor ({name}): Quema 1 carta y reparte el FLOP (3 cartas comunitarias).',
    dealer_deal_turn: 'Repartidor ({name}): Quema 1 carta y reparte el TURN (4ª carta comunitaria).',
    dealer_deal_river: 'Repartidor ({name}): Quema 1 carta y reparte el RIVER (5ª carta comunitaria).',
    confirm_dealt: 'He repartido las cartas',
    cards_dealt_waiting: 'Cartas repartidas. Ronda de apuestas...',

    // Showdown & Winners
    resolving_pot: 'Resolviendo Bote {index}',
    resolving_main_pot: 'Resolviendo Bote Principal (${amount})',
    resolving_side_pot: 'Resolviendo Bote Secundario {index} (${amount})',
    select_winners: 'Toca a los jugadores ganadores con la mejor mano:',
    split_pot: 'Repartir Bote (${amount} c/u)',
    confirm_payout: 'Entregar Bote (${amount})',
    all_pots_awarded: '¡Todos los botes han sido repartidos!',
    deal_next_hand: 'Repartir Siguiente Mano',

    // Modals & Extras
    hand_rankings: 'Valor de Manos',
    hand_rankings_short: 'Manos',
    hand_rankings_title: 'Jerarquía de Manos de Texas Hold\'em',
    hand_rankings_sub: 'De mayor a menor (las 5 mejores cartas deciden el ganador)',
    action_log: 'Historial',
    table_reactions: 'Reacciones',
    react: 'Reaccionar',
    close: 'Cerrar',
    leave_table: 'Salir de la Mesa',
    close_table: 'Cerrar Mesa',
    undo: 'Deshacer',
    pause: 'Pausar',
    start_hand: 'Iniciar Mano',
    manage_players: 'Jugadores',
    settings: 'Ajustes',

    // Action Log entries
    log_table_created: 'Mesa creada. Esperando jugadores...',
    log_hand_started: '--- Mano #{number} iniciada ---',
    log_dealing_street: '--- Repartiendo {street} ---',
    log_showdown: '--- Showdown: Selecciona ganadores para cada bote ---',
    log_post_sb: '{name} pone Ciega Pequeña {amount}.',
    log_post_bb: '{name} pone Ciega Grande {amount}.',
    log_fold: '{name} se retira.',
    log_check: '{name} pasa.',
    log_call: '{name} iguala {amount}.',
    log_call_all_in: '{name} iguala {amount} y está ¡ALL-IN!',
    log_bet: '{name} apuesta {amount}.',
    log_bet_all_in: '{name} apuesta {amount} y está ¡ALL-IN!',
    log_raise: '{name} sube a {amount}.',
    log_raise_all_in: '{name} sube a {amount} y está ¡ALL-IN!',
    log_wins_folded: '{name} gana {amount} fichas (todos se retiraron).',
    log_pot_awarded: '{pot} (${amount}) entregado a {winners}.',
    log_pots_distributed: 'Todos los botes repartidos. Mano completa. Listos para la siguiente.',
    log_undo: '<- El anfitrión deshizo la última acción.',
    log_force_folded: '{name} fue retirado por el anfitrión.',
    log_joined: '{name} se unió a la mesa con {chips} fichas.',
    log_left: '{name} abandonó la mesa (retirado).',
    log_rebought: '{name} recompró +{chips} (Total: {total}).',
    log_blinds_increased: 'Ciegas aumentadas a {sb}/{bb}.',
    log_cards_dealt: '{name} confirmó cartas repartidas para {street}.',
    log_sitting_out: '{name} está en pausa.',
    log_back_in_game: '{name} ha vuelto al juego.',
    log_seating_adjusted: 'El anfitrión ajustó asientos ({name} al Asiento #{seat}).',
    log_round_restarted: '⚠️ Ronda reiniciada por cambio de asientos: Ciegas recolocadas.',
  },

  fr: {
    // Branding & Navigation
    tagline: 'Compteur de Jetons et Gestionnaire de Pots P2P Sans Serveur pour Texas Hold\'em',
    host_game: 'Créer une Table',
    join_game: 'Rejoindre',
    room_code: 'Code de Table',
    your_name: 'Votre Nom',
    enter_name: 'Entrez votre nom...',
    initial_chips: 'Jetons de Départ',
    blinds: 'Blindes',
    small_blind: 'Petite Blinde',
    big_blind: 'Grosse Blinde',
    create_table: 'Créer la Table',
    enter_table: 'Rejoindre la Table',
    scan_qr: 'Scanner pour Rejoindre',
    copy_link: 'Copier le Lien',
    link_copied: 'Lien Copié !',
    rejoin_last: 'Rejoindre la Table Précédente',

    // Status & Network
    online: 'En Ligne',
    reconnecting: 'Reconnexion...',
    host_offline_banner: 'L\'hôte est hors-ligne ou écran verrouillé. Tentative de reconnexion...',
    waiting_next_hand: 'En attente de la main suivante...',
    waiting_on: 'En attente de {name}...',
    you_folded: 'Vous vous êtes couché. Fin de main en cours...',
    you_all_in: 'Vous êtes TAPIS ! Observez le jeu...',
    your_turn: 'À vous de jouer !',
    screen_awake: 'Écran Éveillé',

    // Table & Pots
    total_pot: 'Pot Total',
    main_pot: 'Principal',
    side_pot: 'Pot Secondaire {index}',
    current_bet: 'Mise Actuelle',
    min_raise: 'Relance Min.',
    hand_number: 'Main #{number}',
    players: '{count} Joueurs',
    dealer_badge: 'D',

    // Actions
    fold: 'Se coucher',
    check: 'Parole',
    call: 'Suivre (${amount})',
    call_all_in: 'Suivre Tapis (${amount})',
    bet: 'Miser',
    raise: 'Relancer à ${amount}',
    all_in: 'Tapis (${amount})',
    pot: 'Pot',
    half_pot: '1/2 Pot',

    // Streets
    preflop: 'Préflop',
    flop: 'Flop',
    turn: 'Turn',
    river: 'River',
    showdown: 'Abattage',

    // Dealer instructions
    dealer_deal_preflop: 'Donneur ({name}) : Distribuez 2 cartes fermées à chaque joueur.',
    dealer_deal_flop: 'Donneur ({name}) : Brûlez 1 carte, posez le FLOP (3 cartes visibles).',
    dealer_deal_turn: 'Donneur ({name}) : Brûlez 1 carte, posez le TURN (4e carte visible).',
    dealer_deal_river: 'Donneur ({name}) : Brûlez 1 carte, posez le RIVER (5e carte visible).',
    confirm_dealt: 'Cartes distribuées',
    cards_dealt_waiting: 'Cartes distribuées. Tour d\'enchères en cours...',

    // Showdown & Winners
    resolving_pot: 'Attribution du Pot {index}',
    resolving_main_pot: 'Attribution du Pot Principal (${amount})',
    resolving_side_pot: 'Attribution du Pot Secondaire {index} (${amount})',
    select_winners: 'Sélectionnez le ou les gagnants ayant la meilleure main :',
    split_pot: 'Partager le Pot (${amount} chacun)',
    confirm_payout: 'Attribuer le Pot (${amount})',
    all_pots_awarded: 'Tous les pots de cette main ont été attribués !',
    deal_next_hand: 'Distribuer la Prochaine Main',

    // Modals & Extras
    hand_rankings: 'Valeur des Mains',
    hand_rankings_short: 'Mains',
    hand_rankings_title: 'Ordre des Mains au Texas Hold\'em',
    hand_rankings_sub: 'Du plus fort au plus faible (les 5 meilleures cartes font la main)',
    action_log: 'Historique',
    table_reactions: 'Réactions',
    react: 'Réagir',
    close: 'Fermer',
    leave_table: 'Quitter la Table',
    close_table: 'Fermer la Table',
    undo: 'Annuler',
    pause: 'Pause',
    start_hand: 'Démarrer la Main',
    manage_players: 'Joueurs',
    settings: 'Options',

    // Action Log entries
    log_table_created: 'Table créée. En attente de joueurs...',
    log_hand_started: '--- Main #{number} commencée ---',
    log_dealing_street: '--- Distribution de {street} ---',
    log_showdown: '--- Abattage : Choisissez les gagnants de chaque pot ---',
    log_post_sb: '{name} pose la Petite Blinde {amount}.',
    log_post_bb: '{name} pose la Grosse Blinde {amount}.',
    log_fold: '{name} se couche.',
    log_check: '{name} parole.',
    log_call: '{name} suit {amount}.',
    log_call_all_in: '{name} suit {amount} et est TAPIS !',
    log_bet: '{name} mise {amount}.',
    log_bet_all_in: '{name} mise {amount} et est TAPIS !',
    log_raise: '{name} relance à {amount}.',
    log_raise_all_in: '{name} relance à {amount} et est TAPIS !',
    log_wins_folded: '{name} gagne {amount} jetons (tous ont passé).',
    log_pot_awarded: '{pot} (${amount}) attribué à {winners}.',
    log_pots_distributed: 'Tous les pots distribués. Main terminée. Prêt pour la suivante.',
    log_undo: '<- L\'hôte a annulé la dernière action.',
    log_force_folded: '{name} a été couché par l\'hôte.',
    log_joined: '{name} a rejoint la table avec {chips} jetons.',
    log_left: '{name} a quitté la table (couché).',
    log_rebought: '{name} a recavé +{chips} (Tapis : {total}).',
    log_blinds_increased: 'Blindes augmentées à {sb}/{bb}.',
    log_cards_dealt: '{name} a confirmé la distribution des cartes pour {street}.',
    log_sitting_out: '{name} s\'absente.',
    log_back_in_game: '{name} est de retour dans la partie.',
    log_seating_adjusted: 'L\'hôte a modifié les places ({name} au Siège #{seat}).',
    log_round_restarted: '⚠️ Tour redémarré suite au changement de places : Blindes reposées.',
  },

  pirate: {
    // Branding & Navigation
    tagline: 'PocketChips – Serverless Doubloon Chest & Pirate Booty Counter!',
    host_game: 'Anchor Tavern',
    join_game: 'Board Ship',
    room_code: 'Pirate Secret Code',
    your_name: 'Scallywag Name',
    enter_name: 'Yer pirate handle...',
    initial_chips: 'Starter Doubloons',
    blinds: 'Tribute',
    small_blind: 'Cabin Boy Tribute',
    big_blind: 'Quartermaster Tribute',
    create_table: 'Claim Captain\'s Table',
    enter_table: 'Ahoy! Climb Aboard',
    scan_qr: 'Inspect Treasure Map (QR)',
    copy_link: 'Pillage Direct Link',
    link_copied: 'Booty Link Stashed!',
    rejoin_last: 'Re-board Last Vessel',

    // Status & Network
    online: 'Fair Winds',
    reconnecting: 'Lost at Sea... Scanning Horizon',
    host_offline_banner: 'The Captain\'s lantern went dark! Stand by, scanning the seas...',
    waiting_next_hand: 'Swiggin\' rum \'til next voyage...',
    waiting_on: 'Waitin\' on {name} to pull their weight...',
    you_folded: 'Ye walked the plank! Fish food \'til next hand...',
    you_all_in: 'ALL YER TREASURE IS ON THE LINE, CAP\'N!',
    your_turn: 'Shiver me timbers, make yer move!',
    screen_awake: 'Keep Lantern Lit',

    // Table & Pots
    total_pot: 'Captain\'s Chest',
    main_pot: 'King\'s Gold',
    side_pot: 'Smuggler Stash {index}',
    current_bet: 'Current Wager',
    min_raise: 'Min. Bounty Hike',
    hand_number: 'Voyage #{number}',
    players: '{count} Scallywags',
    dealer_badge: 'Cap\'n',

    // Actions
    fold: 'Walk the Plank',
    check: 'Tap the Deck',
    call: 'Match the Booty (${amount})',
    call_all_in: 'Stake All Doubloons (${amount})',
    bet: 'Stake Gold',
    raise: 'Raise Jolly Roger (${amount})',
    all_in: 'All Treasure (${amount})!',
    pot: 'Whole Chest',
    half_pot: 'Half Chest',

    // Streets
    preflop: 'Before the Storm',
    flop: 'The First Salvo (Flop)',
    turn: 'Turn of the Tides',
    river: 'The Deep Abyss (River)',
    showdown: 'Swords Drawn! (Showdown)',

    // Dealer instructions
    dealer_deal_preflop: 'Cap\'n ({name}): Deal two cursed parchment cards to each pirate.',
    dealer_deal_flop: 'Cap\'n ({name}): Burn 1 parchment, then slam 3 Flop cards upon the deck!',
    dealer_deal_turn: 'Cap\'n ({name}): Burn 1 parchment, reveal the Turn card!',
    dealer_deal_river: 'Cap\'n ({name}): Burn 1 parchment, unleash the River card!',
    confirm_dealt: 'The parchments be dealt!',
    cards_dealt_waiting: 'Deck is set! Cannon fire in progress...',

    // Showdown & Winners
    resolving_pot: 'Plundering Pot {index}',
    resolving_main_pot: 'Plundering Captain\'s Chest (${amount})',
    resolving_side_pot: 'Plundering Smuggler Stash {index} (${amount})',
    select_winners: 'Tap the victorious scallywags with the deadliest cards:',
    split_pot: 'Divvy the Loot (${amount} each)',
    confirm_payout: 'Award Treasure (${amount})',
    all_pots_awarded: 'All chests looted! Weigh anchor for the next voyage!',
    deal_next_hand: 'Weigh Anchor & Deal!',

    // Modals & Extras
    hand_rankings: 'Pirate\'s Code',
    hand_rankings_short: 'Ranks',
    hand_rankings_title: 'Pirate\'s Code of Card Ranks',
    hand_rankings_sub: 'The strongest hand takes all the gold!',
    action_log: 'Captain\'s Log',
    table_reactions: 'Shouts & Taunts',
    react: 'Taunt',
    close: 'Belay That',
    leave_table: 'Abandon Ship',
    close_table: 'Sink Vessel',
    undo: 'Walk Back',
    pause: 'Drop Anchor',
    start_hand: 'Set Sail!',
    manage_players: 'Crew Roster',
    settings: 'Rigging',

    // Action Log entries
    log_table_created: 'Table rigged, me hearties! Awaitin\' scallywags.',
    log_hand_started: '--- Bout #{number} under sail! ---',
    log_dealing_street: '--- Layin\' down {street}! ---',
    log_showdown: '--- Showdown! Award the booty! ---',
    log_post_sb: '{name} tosses Small Blind {amount}.',
    log_post_bb: '{name} tosses Big Blind {amount}.',
    log_fold: '{name} walked the plank (folded).',
    log_check: '{name} taps the timber.',
    log_call: '{name} matches {amount} doubloons.',
    log_call_all_in: '{name} stakes all doubloons matching {amount}!',
    log_bet: '{name} wagers {amount} gold.',
    log_bet_all_in: '{name} wagers ALL IN ({amount})!',
    log_raise: '{name} raises the bounty to {amount}.',
    log_raise_all_in: '{name} goes ALL IN raising to {amount}!',
    log_wins_folded: '{name} plunders {amount} doubloons! All others ran.',
    log_pot_awarded: '{pot} (${amount}) paid out to {winners}.',
    log_pots_distributed: 'All booty divided! Ready for next voyage!',
    log_undo: '<- Cap\'n took back the last move!',
    log_force_folded: '{name} was thrown overboard (force-folded).',
    log_joined: '{name} boarded ship with {chips} doubloons!',
    log_left: '{name} jumped ship!',
    log_rebought: '{name} restocked +{chips} gold (Chest: {total})!',
    log_blinds_increased: 'Stakes raised to {sb}/{bb} doubloons!',
    log_cards_dealt: '{name} laid out cards for {street}!',
    log_sitting_out: '{name} is napin\' in the hammock.',
    log_back_in_game: '{name} returned to deck!',
    log_seating_adjusted: 'Cap\'n shifted crew ({name} to Spot #{seat}).',
    log_round_restarted: '⚠️ Bout restarted: Re-staking doubloons for new posts!',
  },

  klingon: {
    // Branding & Navigation
    tagline: 'PocketChips – tlhIngan Qu\'vatlh Dargh Counter (Poker Assistant)',
    host_game: 'ChenmoH Qu\' (Host)',
    join_game: 'muv (Join Battle)',
    room_code: 'pegh De\' (Room Code)',
    your_name: 'ponglIj (Your Name)',
    enter_name: 'pong yIngu\'...',
    initial_chips: 'Darghmey (Starter Chips)',
    blinds: 'boQ (Blinds)',
    small_blind: 'mach boQ',
    big_blind: 'tIn boQ',
    create_table: 'Qu\'vatlh RaQ ChenmoH',
    enter_table: 'RaQ yI\'el (Enter)',
    scan_qr: 'QR HaSta yIHotlh',
    copy_link: 'Quv De\' yIchel',
    link_copied: 'Qapla\'! De\' chen!',
    rejoin_last: 'May\'mey chegh (Rejoin)',

    // Status & Network
    online: 'Suvrup (Online)',
    reconnecting: 'roD muvqa\' (Reconnecting...)',
    host_offline_banner: 'HoD HaSta Qapbe\'! yIloS, batlh cheghqa\'...',
    waiting_next_hand: 'veS pIqaD loS...',
    waiting_on: '{name} ghoS yIloS...',
    you_folded: 'bImejpu\' (Folded). veS tagh yIloS...',
    you_all_in: 'HOCH DARGHMEY! Hoch pagh batlh!',
    your_turn: 'pegh! bIghHa\'!',
    screen_awake: 'HaSta yIchu\'',

    // Table & Pots
    total_pot: 'Qu\'vatlh Pot',
    main_pot: 'batlh Pot',
    side_pot: 'nIq Pot {index}',
    current_bet: 'lo\'laH bet',
    min_raise: 'ghotI\' Raise',
    hand_number: 'May\' #{number}',
    players: '{count} SuvwI\'pu\'',
    dealer_badge: 'HoD',

    // Actions
    fold: 'yImej (Fold)',
    check: 'yIloS (Check)',
    call: 'yIrap (${amount})',
    call_all_in: 'Hoch yIrap (${amount})',
    bet: 'yIngev (Bet)',
    raise: 'yItlhap (${amount})',
    all_in: 'Hoch! (${amount})',
    pot: 'Qu\' Pot',
    half_pot: 'bID Pot',

    // Streets
    preflop: 'May\'vaD rup (Preflop)',
    flop: 'Flop (wej nav)',
    turn: 'Turn (loS nav)',
    river: 'River (vagh nav)',
    showdown: 'May\' vIghro\' (Showdown)',

    // Dealer instructions
    dealer_deal_preflop: 'HoD ({name}): cha\' navmey pegh yInob.',
    dealer_deal_flop: 'HoD ({name}): wa\' nav yImej, wej Flop navmey yI\'ang!',
    dealer_deal_turn: 'HoD ({name}): wa\' nav yImej, loSDIch Turn nav yI\'ang!',
    dealer_deal_river: 'HoD ({name}): wa\' nav yImej, vaghDIch River nav yI\'ang!',
    confirm_dealt: 'navmey vInobpu\' (Dealt)',
    cards_dealt_waiting: 'navmey DaH ghoS. Suvrup...',

    // Showdown & Winners
    resolving_pot: 'Pot {index} nob',
    resolving_main_pot: 'batlh Pot nob (${amount})',
    resolving_side_pot: 'nIq Pot {index} nob (${amount})',
    select_winners: 'Qapla\' SuvwI\'pu\' yIwIv:',
    split_pot: 'Pot bID (${amount} pro person)',
    confirm_payout: 'Darghmey yInob (${amount})',
    all_pots_awarded: 'Hoch potmey nobpu\'! Qapla\'!',
    deal_next_hand: 'May\' chu\' yItagh!',

    // Modals & Extras
    hand_rankings: 'navmey batlh',
    hand_rankings_short: 'Degh',
    hand_rankings_title: 'Texas Hold\'em navmey batlh list',
    hand_rankings_sub: 'Hoch nIv navmey Qap!',
    action_log: 'May\' QonoS (Log)',
    table_reactions: 'Quv Reactions',
    react: 'Reactions',
    close: 'SoQ',
    leave_table: 'yImej',
    close_table: 'RaQ SoQ',
    undo: 'DoH',
    pause: 'yImev',
    start_hand: 'May\' yItagh',
    manage_players: 'SuvwI\'pu\'',
    settings: 'vu\'mey',

    // Action Log entries
    log_table_created: 'raS chenmoHpu\'. ghotpu\' loSlI\'.',
    log_hand_started: '--- quv #{number} taghpu\' ---',
    log_dealing_street: '--- {street} boq ---',
    log_showdown: '--- tlhIngan quv: pot QapwI\'pu\' yIwIv ---',
    log_post_sb: '{name} mach boQ {amount} pol.',
    log_post_bb: '{name} tIn boQ {amount} pol.',
    log_fold: '{name} jegh (folded).',
    log_check: '{name} \'Ij (check).',
    log_call: '{name} {amount} chaw\'.',
    log_call_all_in: '{name} {amount} Hoch vIvaq!',
    log_bet: '{name} {amount} lang.',
    log_bet_all_in: '{name} {amount} Hoch vIvaq lang!',
    log_raise: '{name} {amount} cher.',
    log_raise_all_in: '{name} {amount} Hoch vIvaq cher!',
    log_wins_folded: '{name} {amount} pot Qap (Hoch jeghpu\').',
    log_pot_awarded: '{pot} (${amount}) {winners} noblo\'pu\'.',
    log_pots_distributed: 'Hoch pot noblo\'pu\'. May\' \'ov. taghqa\'rup.',
    log_undo: '<- ra\'wI\' mIw qIlpu\'.',
    log_force_folded: '{name} ra\'wI\' jeghmoHpu\'.',
    log_joined: '{name} raSchod {chips} Darghmey je.',
    log_left: '{name} raS mejpu\'.',
    log_rebought: '{name} +{chips} Dargh je\'qa\'pu\' ({total}).',
    log_blinds_increased: 'boQ cherqa\'lu\' {sb}/{bb}.',
    log_cards_dealt: '{name} {street} navmey vInobpu\'.',
    log_sitting_out: '{name} ba\'chu\'be\'.',
    log_back_in_game: '{name} cheghpu\'.',
    log_seating_adjusted: 'quv choHpu\' ra\'wI\' ({name} Seat #{seat}).',
    log_round_restarted: '⚠️ quv taghqa\'pu\': boQ chu\' noblo\'pu\'.',
  },
};

type TranslationKey = keyof typeof translations.en;

let currentLang: Language = 'en';
const listeners = new Set<(lang: Language) => void>();

// Read initial language from cookies or localStorage
export function getSavedLanguage(): Language {
  if (typeof window === 'undefined') return 'en';
  const cookieLang = getCookie(STORAGE_LANG_KEY) as Language | null;
  if (cookieLang && cookieLang in translations) {
    return cookieLang;
  }
  try {
    const localLang = localStorage.getItem(STORAGE_LANG_KEY) as Language | null;
    if (localLang && localLang in translations) {
      return localLang;
    }
  } catch (e) {}

  // Detect browser language
  if (typeof navigator !== 'undefined' && navigator.language) {
    const navLang = navigator.language.slice(0, 2).toLowerCase();
    if (navLang === 'de') return 'de';
    if (navLang === 'es') return 'es';
    if (navLang === 'fr') return 'fr';
  }

  return 'en';
}

currentLang = getSavedLanguage();

export function setLanguage(lang: Language) {
  if (!(lang in translations)) return;
  currentLang = lang;
  setCookie(STORAGE_LANG_KEY, lang, 365);
  try {
    localStorage.setItem(STORAGE_LANG_KEY, lang);
  } catch (e) {}
  listeners.forEach((listener) => listener(lang));
}

export function getCurrentLanguage(): Language {
  return currentLang;
}

export function t(key: TranslationKey, params?: Record<string, string | number>): string {
  const langDict = translations[currentLang] || translations.en;
  let text: string = langDict[key] || translations.en[key] || (key as string);

  if (params) {
    Object.entries(params).forEach(([paramKey, paramVal]) => {
      text = text.replace(new RegExp(`\\{${paramKey}\\}`, 'g'), String(paramVal));
      text = text.replace(new RegExp(`\\$\\{${paramKey}\\}`, 'g'), String(paramVal));
    });
  }

  return text;
}

export function useTranslation() {
  const [lang, setLangState] = useState<Language>(currentLang);

  useEffect(() => {
    const listener = (newLang: Language) => setLangState(newLang);
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, []);

  return {
    t,
    lang,
    setLanguage,
    languages: LANGUAGES,
  };
}

/**
 * Localizes an action log string into the current language.
 * Falls back safely to the original string if not recognized.
 */
export function localizeLogEntry(entry: string, tFn: typeof t = t): string {
  if (!entry) return '';

  // 1. Table created
  if (entry.includes('Table created. Waiting for players to join.')) {
    return tFn('log_table_created');
  }

  // 2. Hand started: "--- Hand #1 Started ---"
  let match = entry.match(/^---\s*Hand\s*#(\d+)\s*Started\s*---$/i);
  if (match) {
    return tFn('log_hand_started', { number: match[1] });
  }

  // 3. Dealing street: "--- Dealing FLOP ---"
  match = entry.match(/^---\s*Dealing\s*([A-Za-z]+)\s*---$/i);
  if (match) {
    const streetKey = match[1].toLowerCase() as TranslationKey;
    const streetName = tFn(streetKey) || match[1];
    return tFn('log_dealing_street', { street: streetName });
  }

  // 4. Showdown announcement
  if (entry.includes('Showdown: Select winners')) {
    return tFn('log_showdown');
  }

  // 5. Blinds
  match = entry.match(/^(.+)\s+posts\s+Small\s+Blind\s+(\d+)\.?$/i);
  if (match) {
    return tFn('log_post_sb', { name: match[1], amount: match[2] });
  }
  match = entry.match(/^(.+)\s+posts\s+Big\s+Blind\s+(\d+)\.?$/i);
  if (match) {
    return tFn('log_post_bb', { name: match[1], amount: match[2] });
  }

  // 6. Fold
  match = entry.match(/^(.+)\s+folds\.?$/i);
  if (match) {
    return tFn('log_fold', { name: match[1] });
  }

  // 7. Check
  match = entry.match(/^(.+)\s+checks\.?$/i);
  if (match) {
    return tFn('log_check', { name: match[1] });
  }

  // 8. Call
  match = entry.match(/^(.+)\s+calls\s+(\d+)\s+and\s+is\s+ALL-IN!?$/i);
  if (match) {
    return tFn('log_call_all_in', { name: match[1], amount: match[2] });
  }
  match = entry.match(/^(.+)\s+calls\s+(\d+)\.?$/i);
  if (match) {
    return tFn('log_call', { name: match[1], amount: match[2] });
  }

  // 9. Bet
  match = entry.match(/^(.+)\s+bets\s+(\d+)\s+and\s+is\s+ALL-IN!?$/i);
  if (match) {
    return tFn('log_bet_all_in', { name: match[1], amount: match[2] });
  }
  match = entry.match(/^(.+)\s+bets\s+(\d+)\.?$/i);
  if (match) {
    return tFn('log_bet', { name: match[1], amount: match[2] });
  }

  // 10. Raise
  match = entry.match(/^(.+)\s+raises\s+to\s+(\d+)\s+and\s+is\s+ALL-IN!?$/i);
  if (match) {
    return tFn('log_raise_all_in', { name: match[1], amount: match[2] });
  }
  match = entry.match(/^(.+)\s+raises\s+to\s+(\d+)\.?$/i);
  if (match) {
    return tFn('log_raise', { name: match[1], amount: match[2] });
  }

  // 11. Winner folded out: "Alice wins 100 chips (all opponents folded)."
  match = entry.match(/^(.+)\s+wins\s+(\d+)\s+chips\s+\(all\s+opponents\s+folded\)\.?$/i);
  if (match) {
    return tFn('log_wins_folded', { name: match[1], amount: match[2] });
  }

  // 12. Pot awarded at showdown: "Main Pot ($100) awarded to Alice (+100)." or "Side Pot #1 ($50) awarded to Bob (+50)."
  match = entry.match(/^(Main Pot|Side Pot #\d+)\s+\(\$(\d+)\)\s+awarded\s+to\s+(.+)\.?$/i);
  if (match) {
    const rawPot = match[1];
    const potLabel = rawPot === 'Main Pot'
      ? tFn('main_pot')
      : tFn('side_pot', { index: rawPot.replace(/[^0-9]/g, '') });
    return tFn('log_pot_awarded', { pot: potLabel, amount: match[2], winners: match[3] });
  }

  // 13. All pots distributed
  if (entry.includes('All pots distributed')) {
    return tFn('log_pots_distributed');
  }

  // 14. Undo
  if (entry.includes('Host undid last action')) {
    return tFn('log_undo');
  }

  // 15. Force fold
  match = entry.match(/^(.+)\s+was force-folded by host\.?$/i);
  if (match) {
    return tFn('log_force_folded', { name: match[1] });
  }

  // 16. Joined
  match = entry.match(/^(.+)\s+joined the table with\s+(\d+)\s+chips\.?$/i);
  if (match) {
    return tFn('log_joined', { name: match[1], chips: match[2] });
  }

  // 17. Left
  match = entry.match(/^(.+)\s+left the table\s*\(auto-folded\)\.?$/i);
  if (match) {
    return tFn('log_left', { name: match[1] });
  }

  // 18. Rebought: "Bob re-bought +500 (Stack: 1000)."
  match = entry.match(/^(.+)\s+re-bought\s+\+(\d+)\s+\(Stack:\s*(\d+)\)\.?$/i);
  if (match) {
    return tFn('log_rebought', { name: match[1], chips: match[2], total: match[3] });
  }

  // 19. Blinds increased: "Blinds increased to 10/20."
  match = entry.match(/^Blinds increased to\s+(\d+)\/(\d+)\.?$/i);
  if (match) {
    return tFn('log_blinds_increased', { sb: match[1], bb: match[2] });
  }

  // 20. Cards dealt: "Bob confirmed physical cards dealt for FLOP."
  match = entry.match(/^(.+)\s+confirmed physical cards dealt for\s+([A-Za-z]+)\.?$/i);
  if (match) {
    const streetKey = match[2].toLowerCase() as TranslationKey;
    const streetName = tFn(streetKey) || match[2];
    return tFn('log_cards_dealt', { name: match[1], street: streetName });
  }

  // 21. Sit out
  match = entry.match(/^(.+)\s+is now sitting out\.?$/i);
  if (match) {
    return tFn('log_sitting_out', { name: match[1] });
  }
  match = entry.match(/^(.+)\s+is back in the game\.?$/i);
  if (match) {
    return tFn('log_back_in_game', { name: match[1] });
  }

  // 22. Seating moved: "Host adjusted table seating (Bob moved to Seat #2)."
  match = entry.match(/^Host adjusted table seating\s+\((.+)\s+moved to Seat #(\d+)\)\.?$/i);
  if (match) {
    return tFn('log_seating_adjusted', { name: match[1], seat: match[2] });
  }

  // 23. Round restarted
  if (entry.includes('Round restarted due to seating change')) {
    return tFn('log_round_restarted');
  }

  // Fallback to raw entry if not matched
  return entry;
}

