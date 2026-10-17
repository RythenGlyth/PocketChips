export type Street = 'PREFLOP' | 'FLOP' | 'TURN' | 'RIVER' | 'SHOWDOWN';

export interface Pot {
  id: number;
  amount: number;
  eligiblePlayerIds: string[]; // only players who contributed to this pot level
}

export interface Player {
  id: string;              // PeerJS ID or generated UUID
  name: string;
  chips: number;           // Remaining stack
  currentBet: number;      // Current round bet
  totalHandBet: number;    // Total chips put into the current hand across all streets
  folded: boolean;
  isAllIn: boolean;
  sittingOut: boolean;
  connected: boolean;
  hasActedThisStreet?: boolean;
}

export interface TableState {
  roomCode: string;
  hostPeerId: string;
  handNumber: number;
  street: Street;
  players: Player[];
  dealerIndex: number;
  activePlayerIndex: number;
  smallBlind: number;
  bigBlind: number;
  currentHighestBet: number;
  minRaise: number;
  pots: Pot[];             // Main pot (index 0) + Side pots (1..n)
  history: string[];       // Log of actions for this hand: ["Alice checks", "Bob bets 100"]
  lastState?: string;      // Serialized snapshot for an "Undo" feature on host
  cardsDealtForStreet?: Street; // Street for which the physical cards were confirmed dealt
}

export type PlayerActionType = 'FOLD' | 'CHECK' | 'CALL' | 'BET' | 'RAISE' | 'CONFIRM_CARDS_DEALT';

export interface PlayerAction {
  type: PlayerActionType;
  amount?: number; // For BET/RAISE: the total target bet for the street
}

/**
 * Creates initial empty table state.
 */
export function createInitialTable(
  roomCode: string,
  hostPeerId: string,
  options?: { smallBlind?: number; bigBlind?: number }
): TableState {
  const smallBlind = options?.smallBlind ?? 5;
  const bigBlind = options?.bigBlind ?? 10;
  return {
    roomCode: roomCode.toUpperCase(),
    hostPeerId,
    handNumber: 0,
    street: 'SHOWDOWN',
    players: [],
    dealerIndex: 0,
    activePlayerIndex: -1,
    smallBlind,
    bigBlind,
    currentHighestBet: 0,
    minRaise: bigBlind,
    pots: [],
    history: ['Table created. Waiting for players to join.'],
  };
}

/**
 * Helper to clone table state and save serialized lastState for undo.
 */
function cloneAndSaveState(state: TableState): TableState {
  const serialized = JSON.stringify({
    ...state,
    lastState: undefined,
  });
  const clone: TableState = JSON.parse(serialized);
  clone.lastState = serialized;
  return clone;
}

/**
 * Adds a new player to the table.
 */
export function addPlayer(
  state: TableState,
  player: { id: string; name: string; chips: number }
): TableState {
  const existing = state.players.find((p) => p.id === player.id);
  if (existing) {
    return {
      ...state,
      players: state.players.map((p) =>
        p.id === player.id
          ? { ...p, connected: true, name: player.name || p.name }
          : p
      ),
    };
  }

  const nextState = cloneAndSaveState(state);
  const newPlayer: Player = {
    id: player.id,
    name: player.name.trim() || `Player ${state.players.length + 1}`,
    chips: Math.max(0, player.chips),
    currentBet: 0,
    totalHandBet: 0,
    folded: state.handNumber > 0 && state.street !== 'SHOWDOWN', // sit out/folded if joining mid-hand
    isAllIn: false,
    sittingOut: false,
    connected: true,
    hasActedThisStreet: false,
  };

  nextState.players.push(newPlayer);
  nextState.history.push(`${newPlayer.name} joined the table with ${newPlayer.chips} chips.`);
  return nextState;
}

/**
 * Removes or marks player disconnected.
 */
export function removePlayer(state: TableState, playerId: string): TableState {
  const nextState = cloneAndSaveState(state);
  const player = nextState.players.find((p) => p.id === playerId);
  if (!player) return state;

  // If in the middle of a hand and player was active, auto-fold them
  if (nextState.street !== 'SHOWDOWN' && !player.folded && player.totalHandBet > 0) {
    player.folded = true;
    nextState.history.push(`${player.name} left the table (auto-folded).`);
    // Check if only 1 unfolded player remains
    const unfolded = nextState.players.filter((p) => !p.folded && !p.sittingOut);
    if (unfolded.length === 1) {
      return awardSoleSurvivor(nextState, unfolded[0]);
    }
  }

  nextState.players = nextState.players.filter((p) => p.id !== playerId);
  if (nextState.dealerIndex >= nextState.players.length) {
    nextState.dealerIndex = Math.max(0, nextState.players.length - 1);
  }
  return nextState;
}

export function setPlayerConnected(
  state: TableState,
  playerId: string,
  connected: boolean
): TableState {
  return {
    ...state,
    players: state.players.map((p) =>
      p.id === playerId ? { ...p, connected } : p
    ),
  };
}

export function rebuyPlayer(
  state: TableState,
  playerId: string,
  chipsToAdd: number
): TableState {
  const nextState = cloneAndSaveState(state);
  const player = nextState.players.find((p) => p.id === playerId);
  if (!player) return state;

  player.chips += Math.max(0, chipsToAdd);
  if (player.chips > 0 && player.isAllIn && state.street === 'SHOWDOWN') {
    player.isAllIn = false;
  }
  nextState.history.push(`${player.name} re-bought +${chipsToAdd} (Stack: ${player.chips}).`);
  return nextState;
}

export function toggleSitOut(state: TableState, playerId: string): TableState {
  const nextState = cloneAndSaveState(state);
  const player = nextState.players.find((p) => p.id === playerId);
  if (!player) return state;

  player.sittingOut = !player.sittingOut;
  nextState.history.push(
    `${player.name} is now ${player.sittingOut ? 'sitting out' : 'back in the game'}.`
  );

  // If sitting out during active hand and was active, fold them
  if (player.sittingOut && state.street !== 'SHOWDOWN' && !player.folded) {
    player.folded = true;
    const unfolded = nextState.players.filter((p) => !p.folded && !p.sittingOut);
    if (unfolded.length === 1) {
      return awardSoleSurvivor(nextState, unfolded[0]);
    }
    if (nextState.activePlayerIndex >= 0 && nextState.players[nextState.activePlayerIndex]?.id === playerId) {
      return advanceAction(nextState);
    }
  }

  return nextState;
}

/**
 * Finds the index of the next active player clockwise from startIndex.
 * "Active" means not sitting out and has chips > 0 (or during a hand, not folded and not all-in if action required).
 */
export function getNextPlayerIndex(
  players: Player[],
  startIndex: number,
  filter: (p: Player) => boolean
): number {
  if (players.length === 0) return -1;
  for (let step = 1; step <= players.length; step++) {
    const idx = (startIndex + step) % players.length;
    if (filter(players[idx])) {
      return idx;
    }
  }
  return -1;
}

/**
 * Starts a new hand.
 * Advances dealer button, resets bets/statuses, deducts blinds, sets UTG to act.
 */
export function startNewHand(state: TableState): TableState {
  const eligiblePlayers = state.players.filter(
    (p) => !p.sittingOut && p.chips > 0
  );

  if (eligiblePlayers.length < 2) {
    throw new Error('Need at least 2 active players with chips to start a hand.');
  }

  const nextState = cloneAndSaveState(state);
  nextState.handNumber += 1;
  nextState.street = 'PREFLOP';
  nextState.cardsDealtForStreet = undefined;
  nextState.history = [`--- Hand #${nextState.handNumber} Started ---`];

  // Advance dealer button if not first hand
  if (state.handNumber > 0) {
    nextState.dealerIndex = getNextPlayerIndex(
      nextState.players,
      state.dealerIndex,
      (p) => !p.sittingOut && p.chips > 0
    );
  } else {
    // Pick first eligible player as dealer if dealer index invalid
    if (!eligiblePlayers.some((_, i) => i === nextState.dealerIndex)) {
      nextState.dealerIndex = nextState.players.findIndex(
        (p) => !p.sittingOut && p.chips > 0
      );
    }
  }

  // Reset player hand fields
  nextState.players.forEach((p) => {
    p.currentBet = 0;
    p.totalHandBet = 0;
    p.isAllIn = false;
    p.hasActedThisStreet = false;
    p.folded = p.sittingOut || p.chips === 0;
  });

  const numActive = eligiblePlayers.length;
  let sbIndex: number;
  let bbIndex: number;
  let utgIndex: number;

  if (numActive === 2) {
    // Heads-up: Dealer is SB, other player is BB.
    // Dealer acts first preflop, BB acts first postflop.
    sbIndex = nextState.dealerIndex;
    bbIndex = getNextPlayerIndex(
      nextState.players,
      sbIndex,
      (p) => !p.sittingOut && p.chips > 0
    );
    utgIndex = sbIndex; // SB acts first preflop in Heads-up
  } else {
    // 3+ players: SB is left of button, BB is left of SB, UTG is left of BB.
    sbIndex = getNextPlayerIndex(
      nextState.players,
      nextState.dealerIndex,
      (p) => !p.sittingOut && p.chips > 0
    );
    bbIndex = getNextPlayerIndex(
      nextState.players,
      sbIndex,
      (p) => !p.sittingOut && p.chips > 0
    );
    utgIndex = getNextPlayerIndex(
      nextState.players,
      bbIndex,
      (p) => !p.sittingOut && p.chips > 0
    );
  }

  // Deduct Small Blind
  const sbPlayer = nextState.players[sbIndex];
  const sbDeduct = Math.min(sbPlayer.chips, nextState.smallBlind);
  sbPlayer.chips -= sbDeduct;
  sbPlayer.currentBet = sbDeduct;
  sbPlayer.totalHandBet = sbDeduct;
  if (sbPlayer.chips === 0) sbPlayer.isAllIn = true;
  nextState.history.push(`${sbPlayer.name} posts Small Blind ${sbDeduct}.`);

  // Deduct Big Blind
  const bbPlayer = nextState.players[bbIndex];
  const bbDeduct = Math.min(bbPlayer.chips, nextState.bigBlind);
  bbPlayer.chips -= bbDeduct;
  bbPlayer.currentBet = bbDeduct;
  bbPlayer.totalHandBet = bbDeduct;
  if (bbPlayer.chips === 0) bbPlayer.isAllIn = true;
  nextState.history.push(`${bbPlayer.name} posts Big Blind ${bbDeduct}.`);

  nextState.currentHighestBet = Math.max(sbDeduct, bbDeduct);
  nextState.minRaise = nextState.bigBlind;
  nextState.pots = calculatePots(nextState.players);
  nextState.activePlayerIndex = utgIndex;

  return nextState;
}

/**
 * Calculates main pot and side pots based on cumulative totalHandBet.
 * Handles uncalled bet refunds when someone raises uncontested.
 */
export function calculatePots(players: Player[]): Pot[] {
  // Collect players who contributed chips
  const contributors = players
    .filter((p) => p.totalHandBet > 0)
    .map((p) => ({
      id: p.id,
      bet: p.totalHandBet,
      folded: p.folded,
      isAllIn: p.isAllIn,
    }));

  if (contributors.length === 0) {
    return [];
  }

  // Handle uncalled bet: if the highest bet exceeds the second highest bet,
  // the excess cannot be won by anyone else and should be accounted for.
  const sortedBets = [...contributors].sort((a, b) => b.bet - a.bet);
  const highestBet = sortedBets[0].bet;
  const secondHighestBet = sortedBets.length > 1 ? sortedBets[1].bet : 0;
  const uncalledExcess = highestBet - secondHighestBet;

  // Working copy of contributions (minus uncalled excess)
  const workingBets = contributors.map((c) => ({
    ...c,
    bet: c.id === sortedBets[0].id ? c.bet - uncalledExcess : c.bet,
  }));

  // Identify distinct non-zero contribution tiers from all-in players (and final max)
  const allInAmounts = workingBets
    .filter((c) => c.isAllIn && c.bet > 0)
    .map((c) => c.bet);

  const maxBet = Math.max(...workingBets.map((c) => c.bet));
  const distinctTiers = Array.from(new Set([...allInAmounts, maxBet]))
    .filter((b) => b > 0)
    .sort((a, b) => a - b);

  if (distinctTiers.length === 0) {
    return [];
  }

  const pots: Pot[] = [];
  let prevTier = 0;
  let potId = 0;

  for (const tier of distinctTiers) {
    const tierDelta = tier - prevTier;
    if (tierDelta <= 0) continue;

    let potAmount = 0;
    const eligiblePlayerIds: string[] = [];

    for (const c of workingBets) {
      if (c.bet > prevTier) {
        const contribution = Math.min(c.bet - prevTier, tierDelta);
        potAmount += contribution;

        // Player is eligible if they contributed up to this tier and didn't fold
        if (!c.folded && c.bet >= tier) {
          eligiblePlayerIds.push(c.id);
        }
      }
    }

    if (potAmount > 0) {
      // If eligible players exist, create pot tier
      if (eligiblePlayerIds.length > 0) {
        pots.push({
          id: potId++,
          amount: potAmount,
          eligiblePlayerIds,
        });
      } else {
        // If everyone at this tier folded, add to previous pot if exists
        if (pots.length > 0) {
          pots[pots.length - 1].amount += potAmount;
        } else {
          pots.push({
            id: potId++,
            amount: potAmount,
            eligiblePlayerIds: workingBets.filter((w) => !w.folded).map((w) => w.id),
          });
        }
      }
    }

    prevTier = tier;
  }

  return pots;
}

/**
 * Handles instant pot award when all other players fold.
 */
function awardSoleSurvivor(state: TableState, winner: Player): TableState {
  const totalPot = state.players.reduce((sum, p) => sum + p.totalHandBet, 0);

  winner.chips += totalPot;
  state.history.push(`${winner.name} wins ${totalPot} chips (all opponents folded).`);

  // Clear hand state
  state.street = 'SHOWDOWN';
  state.activePlayerIndex = -1;
  state.pots = [];
  state.players.forEach((p) => {
    p.currentBet = 0;
    p.totalHandBet = 0;
  });

  return state;
}

/**
 * Applies a player action (FOLD, CHECK, CALL, BET, RAISE).
 */
export function applyPlayerAction(
  state: TableState,
  playerId: string,
  action: PlayerAction
): TableState {
  if (action.type === 'CONFIRM_CARDS_DEALT') {
    return confirmCardsDealt(state, playerId);
  }

  if (state.street === 'SHOWDOWN') {
    throw new Error('Hand is already at showdown.');
  }

  if (state.activePlayerIndex < 0 || state.activePlayerIndex >= state.players.length) {
    throw new Error('No active player turn.');
  }

  const currentPlayer = state.players[state.activePlayerIndex];
  if (currentPlayer.id !== playerId) {
    throw new Error(`It is not ${playerId}'s turn. Waiting on ${currentPlayer.name}.`);
  }

  const nextState = cloneAndSaveState(state);
  const player = nextState.players[nextState.activePlayerIndex];

  switch (action.type) {
    case 'FOLD': {
      player.folded = true;
      player.hasActedThisStreet = true;
      nextState.history.push(`${player.name} folds.`);

      // Check if only 1 unfolded player remains
      const activeUnfolded = nextState.players.filter(
        (p) => !p.folded && !p.sittingOut
      );
      if (activeUnfolded.length === 1) {
        return awardSoleSurvivor(nextState, activeUnfolded[0]);
      }
      break;
    }

    case 'CHECK': {
      if (player.currentBet < nextState.currentHighestBet) {
        throw new Error(
          `Cannot check. Current bet to match is ${nextState.currentHighestBet} (you have bet ${player.currentBet}). Must Call or Fold.`
        );
      }
      player.hasActedThisStreet = true;
      nextState.history.push(`${player.name} checks.`);
      break;
    }

    case 'CALL': {
      const needed = nextState.currentHighestBet - player.currentBet;
      if (needed <= 0) {
        // Equivalent to check
        player.hasActedThisStreet = true;
        nextState.history.push(`${player.name} checks.`);
        break;
      }

      const chipsToDeduct = Math.min(player.chips, needed);
      player.chips -= chipsToDeduct;
      player.currentBet += chipsToDeduct;
      player.totalHandBet += chipsToDeduct;
      player.hasActedThisStreet = true;

      if (player.chips === 0) {
        player.isAllIn = true;
        nextState.history.push(
          `${player.name} calls ${chipsToDeduct} (All-in!).`
        );
      } else {
        nextState.history.push(`${player.name} calls ${chipsToDeduct}.`);
      }
      break;
    }

    case 'BET':
    case 'RAISE': {
      const targetBet = action.amount ?? 0;
      const minRequired =
        nextState.currentHighestBet === 0
          ? nextState.bigBlind
          : nextState.currentHighestBet + nextState.minRaise;

      const playerMaxBet = player.chips + player.currentBet;

      if (targetBet > playerMaxBet) {
        throw new Error(
          `Not enough chips. Max bet is ${playerMaxBet}, requested ${targetBet}.`
        );
      }

      // If not all-in, target must meet minimum raise/bet
      if (targetBet < minRequired && targetBet < playerMaxBet) {
        throw new Error(
          `Minimum bet/raise is ${minRequired} (unless going all-in for ${playerMaxBet}).`
        );
      }

      const added = targetBet - player.currentBet;
      if (added <= 0) {
        throw new Error('Raise amount must be greater than current bet.');
      }

      player.chips -= added;
      player.currentBet = targetBet;
      player.totalHandBet += added;
      if (player.chips === 0) {
        player.isAllIn = true;
      }

      const raiseDelta = targetBet - nextState.currentHighestBet;
      if (raiseDelta >= nextState.minRaise) {
        nextState.minRaise = raiseDelta;
      }
      nextState.currentHighestBet = targetBet;

      // Mark this player as acted, reset others who can still respond
      player.hasActedThisStreet = true;
      nextState.players.forEach((p) => {
        if (p.id !== player.id && !p.folded && !p.isAllIn && !p.sittingOut) {
          p.hasActedThisStreet = false;
        }
      });

      const label =
        nextState.street === 'PREFLOP' || state.currentHighestBet > 0
          ? 'raises to'
          : 'bets';
      const allInTag = player.isAllIn ? ' (All-in!)' : '';
      nextState.history.push(`${player.name} ${label} ${targetBet}${allInTag}.`);
      break;
    }

    default:
      throw new Error(`Unknown action type: ${(action as any).type}`);
  }

  // Update pots snapshot
  nextState.pots = calculatePots(nextState.players);

  // Advance action or street
  return advanceAction(nextState);
}

/**
 * Checks if current betting street is complete and advances to next player or next street.
 */
function advanceAction(state: TableState): TableState {
  const activeUnfolded = state.players.filter(
    (p) => !p.folded && !p.sittingOut
  );

  // If only 1 player remains unfolded
  if (activeUnfolded.length === 1) {
    return awardSoleSurvivor(state, activeUnfolded[0]);
  }

  // Players eligible to make decisions (not folded, not all-in, not sitting out)
  const decisionMakers = activeUnfolded.filter((p) => !p.isAllIn);

  // Check if street round is complete:
  // 1. If 0 or 1 decision makers left, and all non-all-in players have matched highest bet
  // 2. Everyone who can act has acted, and their currentBet matches currentHighestBet
  const allMatched = decisionMakers.every(
    (p) => p.currentBet === state.currentHighestBet
  );
  const allActed = decisionMakers.every((p) => p.hasActedThisStreet);

  // If nobody can make any more decisions (e.g. all players are all-in, or all but one is all-in and matched)
  if (decisionMakers.length === 0 || (decisionMakers.length === 1 && allMatched && allActed)) {
    // Round is complete!
    return advanceStreet(state);
  }

  if (allMatched && allActed) {
    return advanceStreet(state);
  }

  // Find next player to act
  const nextIdx = getNextPlayerIndex(
    state.players,
    state.activePlayerIndex,
    (p) => !p.folded && !p.isAllIn && !p.sittingOut
  );

  if (nextIdx === -1) {
    return advanceStreet(state);
  }

  state.activePlayerIndex = nextIdx;
  return state;
}

/**
 * Advances the table to the next street (PREFLOP -> FLOP -> TURN -> RIVER -> SHOWDOWN).
 */
function advanceStreet(state: TableState): TableState {
  // Update pots from cumulative totalHandBet
  state.pots = calculatePots(state.players);

  // Reset street betting values
  state.currentHighestBet = 0;
  state.minRaise = state.bigBlind;
  state.players.forEach((p) => {
    p.currentBet = 0;
    p.hasActedThisStreet = false;
  });

  const streetProgression: Record<Street, Street> = {
    PREFLOP: 'FLOP',
    FLOP: 'TURN',
    TURN: 'RIVER',
    RIVER: 'SHOWDOWN',
    SHOWDOWN: 'SHOWDOWN',
  };

  const nextStreet = streetProgression[state.street];
  state.street = nextStreet;
  state.cardsDealtForStreet = undefined;

  if (nextStreet === 'SHOWDOWN') {
    state.activePlayerIndex = -1;
    state.history.push('--- Showdown: Select winners for each pot ---');
    return state;
  }

  state.history.push(`--- Dealing ${nextStreet} ---`);

  // Check how many players can make decisions postflop
  const decisionMakers = state.players.filter(
    (p) => !p.folded && !p.isAllIn && !p.sittingOut
  );

  if (decisionMakers.length <= 1) {
    // If 0 or 1 player has chips remaining to bet, automatically advance through remaining streets
    // until SHOWDOWN
    return advanceStreet(state);
  }

  // Postflop action starts at the first active player clockwise from dealer button
  const firstToAct = getNextPlayerIndex(
    state.players,
    state.dealerIndex,
    (p) => !p.folded && !p.isAllIn && !p.sittingOut
  );

  state.activePlayerIndex = firstToAct;
  return state;
}

/**
 * Showdown Resolution:
 * Awards a specific pot to one or more winning players.
 * Handles split pots evenly and awards odd chips to winner closest to dealer's left.
 */
export function awardPotShowdown(
  state: TableState,
  potIndex: number,
  winnerIds: string[]
): TableState {
  if (state.street !== 'SHOWDOWN') {
    throw new Error('Can only award pots during Showdown.');
  }

  if (potIndex < 0 || potIndex >= state.pots.length) {
    throw new Error(`Invalid pot index ${potIndex}.`);
  }

  if (winnerIds.length === 0) {
    throw new Error('Must select at least one winner for the pot.');
  }

  const nextState = cloneAndSaveState(state);
  const pot = nextState.pots[potIndex];

  // Verify winners are eligible
  for (const wId of winnerIds) {
    if (!pot.eligiblePlayerIds.includes(wId)) {
      const p = nextState.players.find((pl) => pl.id === wId);
      throw new Error(`${p?.name || wId} is not eligible for Pot #${potIndex + 1}.`);
    }
  }

  const share = Math.floor(pot.amount / winnerIds.length);
  const remainder = pot.amount % winnerIds.length;

  // Sort winners by distance clockwise from dealer's left to award odd chips
  const sortedWinners = [...winnerIds].sort((aId, bId) => {
    const aIdx = nextState.players.findIndex((p) => p.id === aId);
    const bIdx = nextState.players.findIndex((p) => p.id === bId);
    const aDist = (aIdx - nextState.dealerIndex - 1 + nextState.players.length) % nextState.players.length;
    const bDist = (bIdx - nextState.dealerIndex - 1 + nextState.players.length) % nextState.players.length;
    return aDist - bDist;
  });

  const potName = potIndex === 0 ? 'Main Pot' : `Side Pot #${potIndex}`;
  const winnerNames: string[] = [];

  sortedWinners.forEach((wId, i) => {
    const player = nextState.players.find((p) => p.id === wId)!;
    const bonus = i < remainder ? 1 : 0;
    const payout = share + bonus;
    player.chips += payout;
    winnerNames.push(`${player.name} (+${payout})`);
  });

  nextState.history.push(
    `${potName} ($${pot.amount}) awarded to ${winnerNames.join(', ')}.`
  );

  // Remove the awarded pot
  nextState.pots.splice(potIndex, 1);

  // If all pots resolved, reset totalHandBets
  if (nextState.pots.length === 0) {
    nextState.players.forEach((p) => {
      p.totalHandBet = 0;
      p.currentBet = 0;
    });
    nextState.history.push('All pots distributed. Hand complete. Ready for next hand.');
  }

  return nextState;
}

/**
 * Restores the previous state before the last action.
 */
export function undoLastAction(state: TableState): TableState {
  if (!state.lastState) {
    throw new Error('No previous action to undo.');
  }

  try {
    const restored: TableState = JSON.parse(state.lastState);
    restored.history.push('<- Host undid last action.');
    return restored;
  } catch (err) {
    throw new Error('Failed to restore previous state.');
  }
}

/**
 * Updates blind structure.
 */
export function updateBlinds(
  state: TableState,
  smallBlind: number,
  bigBlind: number
): TableState {
  const nextState = cloneAndSaveState(state);
  nextState.smallBlind = Math.max(1, smallBlind);
  nextState.bigBlind = Math.max(2, bigBlind);
  nextState.minRaise = nextState.bigBlind;
  nextState.history.push(
    `Blinds increased to ${nextState.smallBlind}/${nextState.bigBlind}.`
  );
  return nextState;
}

/**
 * Force fold an inactive or stalled player.
 */
export function forceFoldPlayer(state: TableState, playerId: string): TableState {
  const player = state.players.find((p) => p.id === playerId);
  if (!player || player.folded || state.street === 'SHOWDOWN') {
    return state;
  }

  const nextState = cloneAndSaveState(state);
  const p = nextState.players.find((pl) => pl.id === playerId)!;
  p.folded = true;
  p.hasActedThisStreet = true;
  nextState.history.push(`${p.name} was force-folded by host.`);

  const activeUnfolded = nextState.players.filter(
    (pl) => !pl.folded && !pl.sittingOut
  );
  if (activeUnfolded.length === 1) {
    return awardSoleSurvivor(nextState, activeUnfolded[0]);
  }

  if (nextState.activePlayerIndex >= 0 && nextState.players[nextState.activePlayerIndex]?.id === playerId) {
    return advanceAction(nextState);
  }

  return nextState;
}

/**
 * Reorders a player's seat position in the table order.
 * Updates dealerIndex and activePlayerIndex so the dealer button and turn remain with the same players.
 */
export function movePlayer(
  state: TableState,
  fromIndex: number,
  toIndex: number
): TableState {
  if (
    fromIndex < 0 ||
    fromIndex >= state.players.length ||
    toIndex < 0 ||
    toIndex >= state.players.length ||
    fromIndex === toIndex
  ) {
    return state;
  }

  const nextState = cloneAndSaveState(state);
  const currentDealerId = nextState.players[nextState.dealerIndex]?.id;
  const currentActiveId =
    nextState.activePlayerIndex >= 0
      ? nextState.players[nextState.activePlayerIndex]?.id
      : null;

  const updatedPlayers = [...nextState.players];
  const [moved] = updatedPlayers.splice(fromIndex, 1);
  updatedPlayers.splice(toIndex, 0, moved);
  nextState.players = updatedPlayers;

  // Preserve dealer and active player references by ID
  if (currentDealerId) {
    const newDealerIdx = updatedPlayers.findIndex((p) => p.id === currentDealerId);
    if (newDealerIdx >= 0) nextState.dealerIndex = newDealerIdx;
  }

  if (currentActiveId) {
    const newActiveIdx = updatedPlayers.findIndex((p) => p.id === currentActiveId);
    if (newActiveIdx >= 0) nextState.activePlayerIndex = newActiveIdx;
  }

  nextState.history.push(
    `Host adjusted table seating (${moved.name} moved to Seat #${toIndex + 1}).`
  );

  // If a hand is currently active, the posted blinds and turn order are off.
  // Restart the current hand with the new seating arrangement:
  if (nextState.street !== 'SHOWDOWN') {
    // 1. Refund all chips contributed to the current hand
    nextState.players.forEach((p) => {
      p.chips += p.totalHandBet;
      p.currentBet = 0;
      p.totalHandBet = 0;
      p.folded = p.sittingOut || p.chips === 0;
      p.isAllIn = p.chips === 0;
      p.hasActedThisStreet = false;
    });
    nextState.pots = [];

    // 2. Decrement handNumber so startNewHand restarts the same hand number
    nextState.handNumber = Math.max(0, nextState.handNumber - 1);

    // 3. Restart the hand cleanly with re-posted blinds for new positions
    const restarted = startNewHand(nextState);
    restarted.history.push(
      '⚠️ Round restarted due to seating change: Blinds re-posted for new positions.'
    );
    return restarted;
  }

  return nextState;
}

/**
 * Confirms that physical cards have been dealt for the current street.
 * Discards the street announcement banner for all players across the table.
 */
export function confirmCardsDealt(
  state: TableState,
  playerId: string
): TableState {
  const nextState = cloneAndSaveState(state);
  nextState.cardsDealtForStreet = nextState.street;
  const player = nextState.players.find((p) => p.id === playerId);
  const name = player?.name || 'Dealer';
  nextState.history.push(`${name} confirmed physical cards dealt for ${nextState.street}.`);
  return nextState;
}


