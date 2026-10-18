import React, { useState, useEffect, useRef } from 'react';
import type { TableState, PlayerAction } from './lib/engine/poker';
import {
  createInitialTable,
  addPlayer,
  removePlayer,
  setPlayerConnected,
  rebuyPlayer,
  toggleSitOut,
  startNewHand,
  applyPlayerAction,
  awardPotShowdown,
  undoLastAction,
  updateBlinds,
  forceFoldPlayer,
  movePlayer,
} from './lib/engine/poker';
import { HostPeer, ClientPeer, type TableEmote } from './lib/p2p';
import type { Sticker } from './components/EmotePicker';
import { sounds } from './lib/audio';
import { wakeLock } from './lib/wakelock';
import {
  saveHostSession,
  getHostSession,
  clearHostSession,
  savePlayerSession,
  getPlayerSession,
  clearPlayerSession,
} from './lib/storage';
import { LobbyView } from './views/LobbyView';
import { HostLobbyView } from './views/HostLobbyView';
import { PlayerView } from './views/PlayerView';
import { TableView } from './views/TableView';

type AppMode = 'LOBBY' | 'HOST_LOBBY' | 'HOST_TABLE' | 'PLAYER';

export const App: React.FC = () => {
  const [mode, setMode] = useState<AppMode>('LOBBY');
  const [tableState, setTableState] = useState<TableState | null>(null);
  const [myPlayerId, setMyPlayerId] = useState<string>('');
  const [isHostPlaying, setIsHostPlaying] = useState<boolean>(true);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [networkError, setNetworkError] = useState<string | null>(null);
  const [initialRoomParam, setInitialRoomParam] = useState<string>(() => {
    if (typeof window === 'undefined') return '';
    const urlParams = new URLSearchParams(window.location.search);
    const room = urlParams.get('room');
    return room ? room.trim().toUpperCase() : '';
  });
  const [activeEmotes, setActiveEmotes] = useState<Record<string, { symbol: string; shout: string }>>({});

  const hostPeerRef = useRef<HostPeer | null>(null);
  const clientPeerRef = useRef<ClientPeer | null>(null);
  const recentEmotesRef = useRef<Set<string>>(new Set());

  // Check URL params and auto-restore sessions on initial load
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const urlParams = new URLSearchParams(window.location.search);
    const roomParam = urlParams.get('room')?.trim().toUpperCase();
    if (roomParam) {
      setInitialRoomParam(roomParam);
    }

    // 1. Check for saved host session in cookies/storage
    // Only restore host session if user was hosting THIS specific room, or no room param was given
    const savedHost = getHostSession();
    if (savedHost && savedHost.tableState && (!roomParam || roomParam === savedHost.roomCode)) {
      restoreHostSession(savedHost);
      return;
    }

    // 2. If roomParam is specified in URL (e.g. from QR code scan or invite link):
    // Switch to LobbyView so player can review/enter name and join that table
    if (roomParam) {
      setMode('LOBBY');
      return;
    }

    // 3. Otherwise, check for saved player session to auto-reconnect to previous table
    const savedPlayer = getPlayerSession();
    if (savedPlayer && savedPlayer.roomCode) {
      handleJoinGame({
        roomCode: savedPlayer.roomCode,
        playerName: savedPlayer.playerName,
      });
    }
  }, []);

  // Update table state, persist in cookies/storage, and broadcast to peers
  const updateHostState = (updater: (prev: TableState) => TableState) => {
    setTableState((prev) => {
      if (!prev) return prev;
      try {
        const next = updater(prev);

        // Save session in cookies & localStorage
        saveHostSession({
          roomCode: next.roomCode,
          isHostPlaying,
          hostPlayerId: myPlayerId,
          tableState: next,
        });

        // Broadcast to all connected clients
        if (hostPeerRef.current) {
          hostPeerRef.current.broadcast(next);
        }
        return next;
      } catch (err: any) {
        console.warn('Error applying state update:', err.message);
        return prev;
      }
    });
  };

  // Restore host session upon page reload
  const restoreHostSession = async (saved: {
    roomCode: string;
    isHostPlaying: boolean;
    hostPlayerId: string;
    tableState: TableState;
  }) => {
    setNetworkError(null);
    setMyPlayerId(saved.hostPlayerId);
    setIsHostPlaying(saved.isHostPlaying);
    setTableState(saved.tableState);

    const hostPeer = new HostPeer(saved.roomCode);
    hostPeerRef.current = hostPeer;

    setupHostHandlers(hostPeer);

    try {
      await hostPeer.initialize();
      setMode(saved.tableState.handNumber > 0 ? 'HOST_TABLE' : 'HOST_LOBBY');
    } catch (e: any) {
      console.warn('Could not restore host peer:', e.message);
      setNetworkError(e.message);
    }
  };

  const handleEmoteTriggered = (emote: TableEmote) => {
    // Avoid double sound/animation triggers for the exact same emote
    if (recentEmotesRef.current.has(emote.id)) return;
    recentEmotesRef.current.add(emote.id);
    setTimeout(() => {
      recentEmotesRef.current.delete(emote.id);
    }, 3500);

    sounds.playEmoteSound();
    setActiveEmotes((prev) => {
      const next = { ...prev, [emote.playerId]: { symbol: emote.symbol, shout: emote.label } };
      // Also map 'host' and hostPlayerId interchangeably if this is from the host
      if (emote.playerId === 'host' || emote.playerId.startsWith('host-')) {
        next['host'] = { symbol: emote.symbol, shout: emote.label };
        next[emote.playerId] = { symbol: emote.symbol, shout: emote.label };
      }
      return next;
    });

    // Auto remove player's floating emote after 3.5s
    setTimeout(() => {
      setActiveEmotes((prev) => {
        const copy = { ...prev };
        delete copy[emote.playerId];
        if (emote.playerId === 'host' || emote.playerId.startsWith('host-')) {
          delete copy['host'];
        }
        return copy;
      });
    }, 3500);
  };

  const setupHostHandlers = (hostPeer: HostPeer) => {
    hostPeer.onPlayerJoined = (player) => {
      updateHostState((current) => {
        const next = addPlayer(current, {
          id: player.id,
          name: player.name,
          chips: player.chips,
        });
        // Immediately sync state to the joining peer
        hostPeer.sendTo(player.id, { type: 'SYNC_STATE', state: next });
        return next;
      });
    };

    hostPeer.onPlayerDisconnected = (playerId) => {
      updateHostState((current) => setPlayerConnected(current, playerId, false));
    };

    hostPeer.onPlayerAction = (playerId, action) => {
      updateHostState((current) => applyPlayerAction(current, playerId, action));
    };

    hostPeer.onEmoteReceived = (emote) => {
      handleEmoteTriggered(emote);
    };

    hostPeer.onError = (err) => {
      setNetworkError(err);
    };
  };

  // Host creates new table
  const handleHostGame = async (params: {
    roomCode: string;
    hostName: string;
    isHostPlaying: boolean;
    initialChips: number;
    smallBlind: number;
    bigBlind: number;
  }) => {
    setNetworkError(null);
    const hostPeer = new HostPeer(params.roomCode);
    hostPeerRef.current = hostPeer;

    const hostPlayerId = 'host-' + Math.random().toString(36).substring(2, 8);
    setMyPlayerId(hostPlayerId);
    setIsHostPlaying(params.isHostPlaying);

    let initialTable = createInitialTable(params.roomCode, hostPeer.hostId, {
      smallBlind: params.smallBlind,
      bigBlind: params.bigBlind,
    });

    if (params.isHostPlaying) {
      initialTable = addPlayer(initialTable, {
        id: hostPlayerId,
        name: params.hostName,
        chips: params.initialChips,
      });
    }

    setTableState(initialTable);
    saveHostSession({
      roomCode: params.roomCode,
      isHostPlaying: params.isHostPlaying,
      hostPlayerId,
      tableState: initialTable,
    });

    setupHostHandlers(hostPeer);

    try {
      await hostPeer.initialize();
      // Go to Host Waiting Lobby so host can wait for players to join before starting
      setMode('HOST_LOBBY');
    } catch (e: any) {
      setNetworkError(e.message || 'Failed to initialize host table.');
    }
  };

  // Client joins table
  const handleJoinGame = async (params: {
    roomCode: string;
    playerName: string;
    initialChips?: number;
  }) => {
    setNetworkError(null);

    // Retrieve or generate persistent player ID
    const savedPlayer = getPlayerSession();
    let playerId = savedPlayer?.playerId;
    if (!playerId) {
      playerId = 'player-' + Math.random().toString(36).substring(2, 9);
    }
    setMyPlayerId(playerId);

    const clientPeer = new ClientPeer({
      roomCode: params.roomCode,
      playerId,
      playerName: params.playerName,
      initialChips: params.initialChips ?? 1000,
    });
    clientPeerRef.current = clientPeer;

    clientPeer.onConnected = () => {
      setIsConnected(true);
      setNetworkError(null);
      savePlayerSession({
        roomCode: params.roomCode,
        playerId: playerId!,
        playerName: params.playerName,
      });
    };

    clientPeer.onDisconnected = () => {
      setIsConnected(false);
    };

    clientPeer.onStateSync = (syncedState) => {
      setTableState(syncedState);
      setMode('PLAYER');
      savePlayerSession({
        roomCode: params.roomCode,
        playerId: playerId!,
        playerName: params.playerName,
      });
    };

    clientPeer.onEmoteReceived = (emote) => {
      if (emote.playerId === playerId) return;
      handleEmoteTriggered(emote);
    };

    clientPeer.onError = (err) => {
      setNetworkError(err);
    };

    try {
      await clientPeer.connect();
    } catch (e: any) {
      setNetworkError(e.message || 'Failed to connect to table.');
    }
  };

  // Player action dispatcher
  const handleClientAction = (action: PlayerAction) => {
    if (clientPeerRef.current) {
      try {
        clientPeerRef.current.sendAction(action);
      } catch (err: any) {
        setNetworkError(err.message);
      }
    }
  };

  // Emote dispatchers
  const handleSendClientEmote = (sticker: Sticker) => {
    const myPlayer = tableState?.players.find((p) => p.id === myPlayerId);
    const emote: TableEmote = {
      id: 'emote-' + Math.random().toString(36).substring(2, 9),
      playerId: myPlayerId,
      playerName: myPlayer ? myPlayer.name : 'Player',
      symbol: sticker.symbol,
      label: sticker.shout,
      timestamp: Date.now(),
    };
    handleEmoteTriggered(emote);
    if (clientPeerRef.current) {
      try {
        clientPeerRef.current.sendEmote(emote);
      } catch (e) {
        console.warn('Failed to send emote:', e);
      }
    }
  };

  const handleSendHostEmote = (sticker: Sticker) => {
    // 1. Resolve host player from tableState
    let hostPlayer = tableState?.players.find((p) => p.id === myPlayerId);
    let effectiveHostId = myPlayerId;

    if (!hostPlayer) {
      hostPlayer = tableState?.players.find((p) => p.id.startsWith('host-'));
      if (hostPlayer) {
        effectiveHostId = hostPlayer.id;
        setMyPlayerId(hostPlayer.id);
      }
    }

    if (!effectiveHostId) {
      effectiveHostId = 'host';
    }

    const emote: TableEmote = {
      id: 'emote-' + Math.random().toString(36).substring(2, 9),
      playerId: effectiveHostId,
      playerName: hostPlayer ? hostPlayer.name : 'Host',
      symbol: sticker.symbol,
      label: sticker.shout,
      timestamp: Date.now(),
    };
    handleEmoteTriggered(emote);
    if (hostPeerRef.current) {
      hostPeerRef.current.broadcastEmote(emote);
    }
  };

  // Host local player action dispatcher
  const handleHostPlayerAction = (playerId: string, action: PlayerAction) => {
    updateHostState((current) => applyPlayerAction(current, playerId, action));
  };

  // Host table control actions
  const handleStartHand = () => {
    updateHostState((current) => startNewHand(current));
  };

  const handleAwardPot = (potIndex: number, winnerIds: string[]) => {
    updateHostState((current) => awardPotShowdown(current, potIndex, winnerIds));
  };

  const handleUndo = () => {
    updateHostState((current) => undoLastAction(current));
  };

  const handleRebuy = (playerId: string, amount: number) => {
    updateHostState((current) => rebuyPlayer(current, playerId, amount));
  };

  const handleForceFold = (playerId: string) => {
    updateHostState((current) => forceFoldPlayer(current, playerId));
  };

  const handleKickPlayer = (playerId: string) => {
    updateHostState((current) => removePlayer(current, playerId));
  };

  const handleToggleSitOut = (playerId: string) => {
    updateHostState((current) => toggleSitOut(current, playerId));
  };

  const handleUpdateBlinds = (small: number, big: number) => {
    updateHostState((current) => updateBlinds(current, small, big));
  };

  const handleMovePlayer = (fromIndex: number, toIndex: number) => {
    updateHostState((current) => movePlayer(current, fromIndex, toIndex));
  };

  const handleLeaveTable = () => {
    wakeLock.release();
    if (tableState) {
      clearHostSession(tableState.roomCode);
    }
    clearPlayerSession();

    if (clientPeerRef.current) {
      clientPeerRef.current.destroy();
      clientPeerRef.current = null;
    }
    if (hostPeerRef.current) {
      hostPeerRef.current.destroy();
      hostPeerRef.current = null;
    }
    setMode('LOBBY');
    setTableState(null);
    setIsConnected(false);
  };

  // View routing: Host Lobby
  if (mode === 'HOST_LOBBY' && tableState) {
    return (
      <HostLobbyView
        tableState={tableState}
        onStartGame={() => {
          handleStartHand();
          setMode('HOST_TABLE');
        }}
        onMovePlayer={handleMovePlayer}
        onKickPlayer={handleKickPlayer}
        onCloseLobby={handleLeaveTable}
      />
    );
  }

  // View routing: Active Host Table / TV View
  if (mode === 'HOST_TABLE' && tableState) {
    return (
      <TableView
        tableState={tableState}
        hostPlayerId={isHostPlaying ? myPlayerId : undefined}
        isHostPlaying={isHostPlaying}
        onStartHand={handleStartHand}
        onPlayerAction={handleHostPlayerAction}
        onAwardPot={handleAwardPot}
        onUndo={handleUndo}
        onRebuy={handleRebuy}
        onForceFold={handleForceFold}
        onKickPlayer={handleKickPlayer}
        onToggleSitOut={handleToggleSitOut}
        onUpdateBlinds={handleUpdateBlinds}
        onMovePlayer={handleMovePlayer}
        onCloseTable={handleLeaveTable}
        activeEmotes={activeEmotes}
        onSendEmote={handleSendHostEmote}
      />
    );
  }

  // View routing: Connected Player View
  if (mode === 'PLAYER' && tableState) {
    return (
      <PlayerView
        tableState={tableState}
        myPlayerId={myPlayerId}
        onAction={handleClientAction}
        onLeaveTable={handleLeaveTable}
        isConnected={isConnected}
        activeEmotes={activeEmotes}
        onSendEmote={handleSendClientEmote}
      />
    );
  }

  // View routing: Initial Joining / Hosting View
  return (
    <LobbyView
      initialRoomCode={initialRoomParam}
      onHostGame={handleHostGame}
      onJoinGame={handleJoinGame}
      error={networkError}
    />
  );
};

export default App;
