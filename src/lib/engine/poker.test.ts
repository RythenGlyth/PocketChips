import { describe, it, expect } from 'vitest';
import {
  createInitialTable,
  addPlayer,
  startNewHand,
  applyPlayerAction,
  calculatePots,
  awardPotShowdown,
  undoLastAction,
  movePlayer,
  type Player,
} from './poker';

describe('Poker Engine Domain Logic', () => {
  it('posts blinds correctly for 3 players in Preflop', () => {
    let table = createInitialTable('TEST', 'host1', { smallBlind: 10, bigBlind: 20 });
    table = addPlayer(table, { id: 'p1', name: 'Alice', chips: 1000 });
    table = addPlayer(table, { id: 'p2', name: 'Bob', chips: 1000 });
    table = addPlayer(table, { id: 'p3', name: 'Charlie', chips: 1000 });

    // Hand 1 starts: dealer is index 0 (Alice)
    // SB is index 1 (Bob), BB is index 2 (Charlie), UTG is index 0 (Alice)
    table = startNewHand(table);

    expect(table.street).toBe('PREFLOP');
    expect(table.players[1].chips).toBe(990); // Bob posted SB 10
    expect(table.players[1].currentBet).toBe(10);
    expect(table.players[2].chips).toBe(980); // Charlie posted BB 20
    expect(table.players[2].currentBet).toBe(20);
    expect(table.currentHighestBet).toBe(20);
    expect(table.minRaise).toBe(20);

    // UTG is Alice (index 0)
    expect(table.activePlayerIndex).toBe(0);
    expect(table.players[table.activePlayerIndex].id).toBe('p1');
  });

  it('handles heads-up blind rules correctly', () => {
    let table = createInitialTable('HEAD', 'host1', { smallBlind: 5, bigBlind: 10 });
    table = addPlayer(table, { id: 'p1', name: 'Alice', chips: 500 });
    table = addPlayer(table, { id: 'p2', name: 'Bob', chips: 500 });

    table = startNewHand(table);

    // In heads-up: dealer (index 0 Alice) posts SB, Bob posts BB
    // Alice acts first preflop
    expect(table.players[0].currentBet).toBe(5);
    expect(table.players[1].currentBet).toBe(10);
    expect(table.activePlayerIndex).toBe(0);
  });

  it('validates minimum raise rules properly', () => {
    let table = createInitialTable('RAISE', 'host1', { smallBlind: 10, bigBlind: 20 });
    table = addPlayer(table, { id: 'p1', name: 'Alice', chips: 1000 });
    table = addPlayer(table, { id: 'p2', name: 'Bob', chips: 1000 });
    table = addPlayer(table, { id: 'p3', name: 'Charlie', chips: 1000 });

    table = startNewHand(table); // BB is 20, minRaise is 20, min total bet is 40

    // Alice tries to raise to 30 (illegal, min is 40)
    expect(() => {
      applyPlayerAction(table, 'p1', { type: 'RAISE', amount: 30 });
    }).toThrow(/Minimum bet\/raise is 40/);

    // Alice raises to 50 (valid: raise delta is 30, which is >= minRaise 20)
    table = applyPlayerAction(table, 'p1', { type: 'RAISE', amount: 50 });
    expect(table.currentHighestBet).toBe(50);
    expect(table.minRaise).toBe(30); // new min raise delta is 30!
    expect(table.players[0].chips).toBe(950);
    expect(table.players[0].currentBet).toBe(50);

    // Next is Bob (SB who already put in 10). Next min raise to is 50 + 30 = 80
    expect(table.activePlayerIndex).toBe(1);
    expect(() => {
      applyPlayerAction(table, 'p2', { type: 'RAISE', amount: 70 });
    }).toThrow(/Minimum bet\/raise is 80/);

    // Bob calls 50 (needs 40 more chips)
    table = applyPlayerAction(table, 'p2', { type: 'CALL' });
    expect(table.players[1].chips).toBe(950);
    expect(table.players[1].currentBet).toBe(50);

    // Charlie (BB who put in 20) calls 50 (needs 30 more chips)
    table = applyPlayerAction(table, 'p3', { type: 'CALL' });
    expect(table.players[2].chips).toBe(950);
    expect(table.players[2].currentBet).toBe(0); // Street advanced to FLOP!

    expect(table.street).toBe('FLOP');
    expect(table.pots[0].amount).toBe(150);
  });

  it('calculates side-pots accurately with multiple all-in players of different stack sizes', () => {
    // Setup test players with varying contributions:
    // Dave folded after 50.
    // Alice all-in for 100.
    // Bob all-in for 200.
    // Charlie called 200.
    const players: Player[] = [
      {
        id: 'alice',
        name: 'Alice',
        chips: 0,
        currentBet: 0,
        totalHandBet: 100,
        folded: false,
        isAllIn: true,
        sittingOut: false,
        connected: true,
      },
      {
        id: 'bob',
        name: 'Bob',
        chips: 0,
        currentBet: 0,
        totalHandBet: 200,
        folded: false,
        isAllIn: true,
        sittingOut: false,
        connected: true,
      },
      {
        id: 'charlie',
        name: 'Charlie',
        chips: 500,
        currentBet: 0,
        totalHandBet: 200,
        folded: false,
        isAllIn: false,
        sittingOut: false,
        connected: true,
      },
      {
        id: 'dave',
        name: 'Dave',
        chips: 400,
        currentBet: 0,
        totalHandBet: 50,
        folded: true,
        isAllIn: false,
        sittingOut: false,
        connected: true,
      },
    ];

    const pots = calculatePots(players);

    // Main Pot: up to 100 from Alice (100), Bob (100), Charlie (100), plus Dave (50) = 350.
    // Eligible: Alice, Bob, Charlie (Dave folded).
    expect(pots.length).toBe(2);
    expect(pots[0].amount).toBe(350);
    expect(pots[0].eligiblePlayerIds).toEqual(['alice', 'bob', 'charlie']);

    // Side Pot 1: incremental 100 between Bob (100) and Charlie (100) = 200.
    // Eligible: Bob, Charlie.
    expect(pots[1].amount).toBe(200);
    expect(pots[1].eligiblePlayerIds).toEqual(['bob', 'charlie']);
  });

  it('splits pot evenly and awards odd chip to player closest to dealer left', () => {
    let table = createInitialTable('SPLIT', 'host1');
    table = addPlayer(table, { id: 'p1', name: 'Alice', chips: 0 }); // dealer (index 0)
    table = addPlayer(table, { id: 'p2', name: 'Bob', chips: 0 });   // index 1
    table = addPlayer(table, { id: 'p3', name: 'Charlie', chips: 0 }); // index 2

    table.street = 'SHOWDOWN';
    table.dealerIndex = 0; // Alice is dealer
    // Main Pot has 101 chips, contested by Alice, Bob, and Charlie
    table.pots = [
      {
        id: 0,
        amount: 101,
        eligiblePlayerIds: ['p1', 'p2', 'p3'],
      },
    ];

    // All three tie for the pot
    table = awardPotShowdown(table, 0, ['p1', 'p2', 'p3']);

    // 101 / 3 = 33 each, remainder = 2 chips.
    // Order of distance from dealer left (Alice index 0):
    // 1. Bob (index 1, dist 1) -> gets +1 odd chip (34 total)
    // 2. Charlie (index 2, dist 2) -> gets +1 odd chip (34 total)
    // 3. Alice (index 0, dist 0) -> gets 33 total
    const alice = table.players.find((p) => p.id === 'p1')!;
    const bob = table.players.find((p) => p.id === 'p2')!;
    const charlie = table.players.find((p) => p.id === 'p3')!;

    expect(bob.chips).toBe(34);
    expect(charlie.chips).toBe(34);
    expect(alice.chips).toBe(33);
    expect(table.pots.length).toBe(0);
  });

  it('awards pot immediately to sole survivor when all opponents fold', () => {
    let table = createInitialTable('FOLD', 'host1', { smallBlind: 10, bigBlind: 20 });
    table = addPlayer(table, { id: 'p1', name: 'Alice', chips: 500 });
    table = addPlayer(table, { id: 'p2', name: 'Bob', chips: 500 });
    table = addPlayer(table, { id: 'p3', name: 'Charlie', chips: 500 });

    table = startNewHand(table);
    // Alice is UTG, Alice raises to 60
    table = applyPlayerAction(table, 'p1', { type: 'RAISE', amount: 60 });
    // Bob folds
    table = applyPlayerAction(table, 'p2', { type: 'FOLD' });
    // Charlie folds -> Alice is sole survivor!
    table = applyPlayerAction(table, 'p3', { type: 'FOLD' });

    expect(table.street).toBe('SHOWDOWN');
    // Alice wins: her 60 + Bob's SB 10 + Charlie's BB 20 = 90
    // Alice started with 500, spent 60 (chips was 440) + wins 90 = 530
    const alice = table.players.find((p) => p.id === 'p1')!;
    expect(alice.chips).toBe(530);
  });

  it('supports undoing the last action', () => {
    let table = createInitialTable('UNDO', 'host1', { smallBlind: 10, bigBlind: 20 });
    table = addPlayer(table, { id: 'p1', name: 'Alice', chips: 500 });
    table = addPlayer(table, { id: 'p2', name: 'Bob', chips: 500 });

    table = startNewHand(table);
    const beforeRaise = table;

    // Alice raises to 50
    table = applyPlayerAction(table, 'p1', { type: 'RAISE', amount: 50 });
    expect(table.currentHighestBet).toBe(50);

    // Host hits Undo
    table = undoLastAction(table);
    expect(table.currentHighestBet).toBe(beforeRaise.currentHighestBet);
    expect(table.players[0].chips).toBe(beforeRaise.players[0].chips);
    expect(table.activePlayerIndex).toBe(beforeRaise.activePlayerIndex);
  });

  it('allows short stack all-in raise below standard minimum raise', () => {
    let table = createInitialTable('SHORT', 'host1', { smallBlind: 10, bigBlind: 20 });
    table = addPlayer(table, { id: 'p1', name: 'Alice', chips: 35 }); // only 35 chips!
    table = addPlayer(table, { id: 'p2', name: 'Bob', chips: 500 });
    table = addPlayer(table, { id: 'p3', name: 'Charlie', chips: 500 });

    table = startNewHand(table);
    // Alice is UTG (index 0). BB is 20, min standard raise is 40.
    // Alice pushes all-in for 35 total chips.
    table = applyPlayerAction(table, 'p1', { type: 'RAISE', amount: 35 });
    expect(table.players[0].chips).toBe(0);
    expect(table.players[0].isAllIn).toBe(true);
    expect(table.currentHighestBet).toBe(35);
  });

  it('progresses through streets smoothly when players check down', () => {
    let table = createInitialTable('STREETS', 'host1', { smallBlind: 10, bigBlind: 20 });
    table = addPlayer(table, { id: 'p1', name: 'Alice', chips: 500 });
    table = addPlayer(table, { id: 'p2', name: 'Bob', chips: 500 });

    table = startNewHand(table); // PREFLOP (Alice SB 10, Bob BB 20)
    // Alice calls 20
    table = applyPlayerAction(table, 'p1', { type: 'CALL' });
    // Bob checks option
    table = applyPlayerAction(table, 'p2', { type: 'CHECK' });

    // Street is now FLOP! In heads-up postflop, Bob (BB) acts first
    expect(table.street).toBe('FLOP');
    expect(table.activePlayerIndex).toBe(1);

    table = applyPlayerAction(table, 'p2', { type: 'CHECK' });
    table = applyPlayerAction(table, 'p1', { type: 'CHECK' });

    // Street is now TURN!
    expect(table.street).toBe('TURN');
    table = applyPlayerAction(table, 'p2', { type: 'CHECK' });
    table = applyPlayerAction(table, 'p1', { type: 'CHECK' });

    // Street is now RIVER!
    expect(table.street).toBe('RIVER');
    table = applyPlayerAction(table, 'p2', { type: 'CHECK' });
    table = applyPlayerAction(table, 'p1', { type: 'CHECK' });

    // Street is now SHOWDOWN!
    expect(table.street).toBe('SHOWDOWN');
    expect(table.pots[0].amount).toBe(40);
  });

  it('allows host to reorder player seating and preserves dealer index correctly', () => {
    let table = createInitialTable('REORDER', 'host1');
    table = addPlayer(table, { id: 'p1', name: 'Alice', chips: 1000 });
    table = addPlayer(table, { id: 'p2', name: 'Bob', chips: 1000 });
    table = addPlayer(table, { id: 'p3', name: 'Charlie', chips: 1000 });

    // Set Alice as dealer (index 0)
    table.dealerIndex = 0;

    // Move Charlie (index 2) to first seat (index 0)
    table = movePlayer(table, 2, 0);

    // Order should now be: Charlie (0), Alice (1), Bob (2)
    expect(table.players[0].name).toBe('Charlie');
    expect(table.players[1].name).toBe('Alice');
    expect(table.players[2].name).toBe('Bob');

    // Alice was dealer (now at index 1). dealerIndex should have updated to 1!
    expect(table.dealerIndex).toBe(1);
    expect(table.players[table.dealerIndex].id).toBe('p1');
  });

  it('restarts the round and resets blinds when players are reordered mid-hand', () => {
    let table = createInitialTable('REORDER_MID', 'host1', { smallBlind: 10, bigBlind: 20 });
    table = addPlayer(table, { id: 'p1', name: 'Alice', chips: 1000 });
    table = addPlayer(table, { id: 'p2', name: 'Bob', chips: 1000 });
    table = addPlayer(table, { id: 'p3', name: 'Charlie', chips: 1000 });

    table = startNewHand(table); // Hand 1: Alice dealer, Bob SB (10), Charlie BB (20)
    expect(table.players[1].currentBet).toBe(10); // Bob
    expect(table.players[2].currentBet).toBe(20); // Charlie

    // Now reorder mid-hand: move Charlie (index 2) to index 1 (becomes SB!)
    table = movePlayer(table, 2, 1);

    // Charlie is now at index 1, Bob is now at index 2
    expect(table.players[1].name).toBe('Charlie');
    expect(table.players[2].name).toBe('Bob');

    // Round should have restarted: Charlie is now SB (10), Bob is now BB (20)
    expect(table.players[1].currentBet).toBe(10); // Charlie posts SB
    expect(table.players[2].currentBet).toBe(20); // Bob posts BB
    expect(table.players[0].chips).toBe(1000); // Alice (dealer) refunded any action
    expect(table.players[1].chips).toBe(990); // Charlie has 990
    expect(table.players[2].chips).toBe(980); // Bob has 980
  });

  it('sets cardsDealtForStreet when confirmed and resets upon advancing street', () => {
    let table = createInitialTable('CONFIRM_DEAL', 'host1', { smallBlind: 10, bigBlind: 20 });
    table = addPlayer(table, { id: 'p1', name: 'Alice', chips: 1000 });
    table = addPlayer(table, { id: 'p2', name: 'Bob', chips: 1000 });

    table = startNewHand(table);
    expect(table.street).toBe('PREFLOP');
    expect(table.cardsDealtForStreet).toBeUndefined();

    // Alice (Dealer) confirms cards are dealt
    table = applyPlayerAction(table, 'p1', { type: 'CONFIRM_CARDS_DEALT' });
    expect(table.cardsDealtForStreet).toBe('PREFLOP');

    // Betting proceeds to Flop
    table = applyPlayerAction(table, 'p1', { type: 'CALL' }); // Alice calls BB 20
    table = applyPlayerAction(table, 'p2', { type: 'CHECK' }); // Bob checks

    expect(table.street).toBe('FLOP');
    // For the new street (FLOP), cardsDealtForStreet should reset to undefined!
    expect(table.cardsDealtForStreet).toBeUndefined();
  });
});
