import { Peer, type DataConnection } from 'peerjs';
import type { TableState, PlayerAction } from './engine/poker';

export interface TableEmote {
  id: string;
  playerId: string;
  playerName: string;
  symbol: string;
  label: string;
  timestamp: number;
}

export type P2PMessage =
  | { type: 'JOIN'; playerId: string; name: string; initialChips: number }
  | { type: 'SYNC_STATE'; state: TableState }
  | { type: 'PLAYER_ACTION'; playerId: string; action: PlayerAction }
  | { type: 'TABLE_EMOTE'; emote: TableEmote }
  | { type: 'PING'; timestamp: number }
  | { type: 'PONG'; timestamp: number }
  | { type: 'ERROR'; message: string };

export function formatRoomId(roomCode: string): string {
  return `POKER-${roomCode.trim().toUpperCase()}`;
}

export function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let result = '';
  for (let i = 0; i < 4; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export const PEER_CONFIG = {
  debug: 1,
  config: {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      { urls: 'stun:stun2.l.google.com:19302' },
      { urls: 'stun:stun3.l.google.com:19302' },
      { urls: 'stun:stun4.l.google.com:19302' },
      { urls: 'stun:global.stun.twilio.com:3478' },
    ],
  },
};

/**
 * Host Peer Manager: acts as the table authority in star-topology WebRTC mesh.
 */
export class HostPeer {
  private peer: Peer | null = null;
  private connections: Map<string, DataConnection> = new Map();
  private pingInterval: any = null;

  public roomCode: string;
  public hostId: string;
  public onPlayerJoined?: (player: { id: string; name: string; chips: number }) => void;
  public onPlayerDisconnected?: (playerId: string) => void;
  public onPlayerAction?: (playerId: string, action: PlayerAction) => void;
  public onEmoteReceived?: (emote: TableEmote) => void;
  public onError?: (error: string) => void;
  public onReady?: () => void;

  constructor(roomCode: string) {
    this.roomCode = roomCode.trim().toUpperCase();
    this.hostId = formatRoomId(this.roomCode);
  }

  public initialize(): Promise<string> {
    return new Promise((resolve, reject) => {
      try {
        this.peer = new Peer(this.hostId, PEER_CONFIG);

        this.peer.on('open', (id) => {
          this.startHeartbeat();
          if (this.onReady) this.onReady();
          resolve(id);
        });

        this.peer.on('disconnected', () => {
          console.warn('[HostPeer] Disconnected from signaling. Reconnecting...');
          if (this.peer && !this.peer.destroyed) {
            this.peer.reconnect();
          }
        });

        if (typeof document !== 'undefined') {
          document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'visible' && this.peer && !this.peer.destroyed) {
              if (this.peer.disconnected) {
                console.log('[HostPeer] Display/tab active again, restoring signaling connection...');
                this.peer.reconnect();
              }
            }
          });
        }

        this.peer.on('connection', (conn) => {
          this.handleIncomingConnection(conn);
        });

        this.peer.on('error', (err: any) => {
          console.warn('[HostPeer] Peer error:', err);
          if (err.type === 'unavailable-id') {
            const msg = `Room code "${this.roomCode}" is already in use by another active table.`;
            if (this.onError) this.onError(msg);
            reject(new Error(msg));
          } else {
            if (this.onError) this.onError(err.message || 'Host network error');
          }
        });
      } catch (e: any) {
        reject(e);
      }
    });
  }

  private handleIncomingConnection(conn: DataConnection) {
    // Store connection immediately by peer id
    this.connections.set(conn.peer, conn);

    // Register data, close and error listeners immediately so packets are not dropped
    conn.on('data', (rawData: unknown) => {
      const msg = rawData as P2PMessage;
      if (!msg || !msg.type) return;

      switch (msg.type) {
        case 'JOIN': {
          // Player joins or reconnects
          // Associate with playerId
          this.connections.set(msg.playerId, conn);
          if (this.onPlayerJoined) {
            this.onPlayerJoined({
              id: msg.playerId,
              name: msg.name,
              chips: msg.initialChips,
            });
          }
          break;
        }

        case 'PLAYER_ACTION': {
          if (this.onPlayerAction) {
            this.onPlayerAction(msg.playerId, msg.action);
          }
          break;
        }

        case 'TABLE_EMOTE': {
          if (this.onEmoteReceived) {
            this.onEmoteReceived(msg.emote);
          }
          // Relay emote to all OTHER connected peers (excluding sender)
          this.broadcastEmote(msg.emote, conn);
          break;
        }

        case 'PING': {
          conn.send({ type: 'PONG', timestamp: Date.now() });
          break;
        }
      }
    });

    conn.on('open', () => {
      console.log(`[HostPeer] Data channel open with peer: ${conn.peer}`);
    });

    conn.on('close', () => {
      // Find player associated with this conn
      let foundPlayerId: string | null = null;
      for (const [pId, c] of this.connections.entries()) {
        if (c === conn) {
          foundPlayerId = pId;
          this.connections.delete(pId);
          break;
        }
      }
      if (foundPlayerId && this.onPlayerDisconnected) {
        this.onPlayerDisconnected(foundPlayerId);
      }
    });

    conn.on('error', (err) => {
      console.warn('[HostPeer] Connection error with peer:', conn.peer, err);
    });
  }

  public broadcast(state: TableState) {
    const payload: P2PMessage = {
      type: 'SYNC_STATE',
      state,
    };

    // Iterate over unique DataConnection instances to prevent duplicate packets
    const uniqueConns = new Set(this.connections.values());
    for (const conn of uniqueConns) {
      if (conn.open) {
        try {
          conn.send(payload);
        } catch (e) {
          console.warn(`[HostPeer] Failed to send state to ${conn.peer}:`, e);
        }
      }
    }
  }

  public broadcastEmote(emote: TableEmote, excludeConn?: DataConnection) {
    const payload: P2PMessage = {
      type: 'TABLE_EMOTE',
      emote,
    };

    // Relay only to other connected peers, skipping sender to prevent duplicate triggers
    const uniqueConns = new Set(this.connections.values());
    for (const conn of uniqueConns) {
      if (conn !== excludeConn && conn.open) {
        try {
          conn.send(payload);
        } catch (e) {
          console.warn(`[HostPeer] Failed to send emote to ${conn.peer}`);
        }
      }
    }
  }

  public sendTo(playerId: string, message: P2PMessage) {
    const conn = this.connections.get(playerId);
    if (conn && conn.open) {
      try {
        conn.send(message);
      } catch (e) {
        console.warn(`[HostPeer] Failed to send message to ${playerId}:`, e);
      }
    }
  }

  private startHeartbeat() {
    this.pingInterval = setInterval(() => {
      const uniqueConns = new Set(this.connections.values());
      for (const conn of uniqueConns) {
        if (conn.open) {
          try {
            conn.send({ type: 'PING', timestamp: Date.now() });
          } catch (e) {
            console.warn(`[HostPeer] Ping failed for ${conn.peer}`);
          }
        }
      }
    }, 15000);
  }

  public destroy() {
    if (this.pingInterval) clearInterval(this.pingInterval);
    for (const conn of this.connections.values()) {
      try {
        conn.close();
      } catch (e) {}
    }
    this.connections.clear();
    if (this.peer) {
      try {
        this.peer.destroy();
      } catch (e) {}
      this.peer = null;
    }
  }
}

/**
 * Client Peer Manager: connects to host table via room code and handles reactive state updates.
 */
export class ClientPeer {
  private peer: Peer | null = null;
  private conn: DataConnection | null = null;
  private heartbeatTimeout: any = null;
  private reconnectTimer: any = null;
  private joinRetryTimer: any = null;
  private hasReceivedState: boolean = false;
  private destroyed: boolean = false;

  public roomCode: string;
  public playerId: string;
  public playerName: string;
  public initialChips: number;

  public onStateSync?: (state: TableState) => void;
  public onEmoteReceived?: (emote: TableEmote) => void;
  public onConnected?: () => void;
  public onDisconnected?: () => void;
  public onError?: (error: string) => void;

  constructor(options: {
    roomCode: string;
    playerId: string;
    playerName: string;
    initialChips?: number;
  }) {
    this.roomCode = options.roomCode.trim().toUpperCase();
    this.playerId = options.playerId;
    this.playerName = options.playerName;
    this.initialChips = options.initialChips ?? 1000;
  }

  public connect(): Promise<void> {
    this.destroyed = false;
    return new Promise((resolve, reject) => {
      try {
        this.peer = new Peer(PEER_CONFIG);

        this.peer.on('open', () => {
          this.connectToHost(resolve, reject);
        });

        this.peer.on('disconnected', () => {
          console.warn('[ClientPeer] Disconnected from signaling. Reconnecting...');
          if (this.peer && !this.peer.destroyed) {
            this.peer.reconnect();
          }
        });

        if (typeof document !== 'undefined') {
          document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'visible' && this.peer && !this.peer.destroyed) {
              if (this.peer.disconnected) {
                this.peer.reconnect();
              }
              if (!this.conn || !this.conn.open) {
                this.connectToHost();
              }
            }
          });
        }

        this.peer.on('error', (err: any) => {
          console.warn('[ClientPeer] Peer error:', err);
          if (err.type === 'peer-unavailable') {
            // Host is currently offline, asleep or starting up. Keep retrying!
            if (this.onDisconnected) this.onDisconnected();
            if (resolve) resolve();
            this.attemptReconnect();
            return;
          }
          if (this.onError) this.onError(err.message || 'Client networking error');
          reject(err);
        });
      } catch (e) {
        reject(e);
      }
    });
  }

  private connectToHost(
    resolve?: () => void,
    _reject?: (reason?: any) => void
  ) {
    if (this.destroyed || !this.peer) return;

    const hostId = formatRoomId(this.roomCode);
    const conn = this.peer.connect(hostId, {
      reliable: true,
    });

    this.conn = conn;

    conn.on('open', () => {
      // Send JOIN payload with player identity
      const joinMsg: P2PMessage = {
        type: 'JOIN',
        playerId: this.playerId,
        name: this.playerName,
        initialChips: this.initialChips,
      };
      conn.send(joinMsg);

      if (this.onConnected) this.onConnected();
      if (resolve) resolve();

      // Handshake retry: resend JOIN if host state sync hasn't arrived yet
      let retryCount = 0;
      if (this.joinRetryTimer) clearInterval(this.joinRetryTimer);
      this.joinRetryTimer = setInterval(() => {
        if (!this.hasReceivedState && conn.open && retryCount < 4) {
          retryCount++;
          console.log(`[ClientPeer] Retrying JOIN handshake (${retryCount}/4)...`);
          try {
            conn.send(joinMsg);
          } catch (e) {
            console.warn('[ClientPeer] Failed to send JOIN retry:', e);
          }
        } else {
          clearInterval(this.joinRetryTimer);
          this.joinRetryTimer = null;
        }
      }, 1500);
    });

    conn.on('data', (rawData: unknown) => {
      const msg = rawData as P2PMessage;
      if (!msg || !msg.type) return;

      if (msg.type === 'SYNC_STATE') {
        this.hasReceivedState = true;
        if (this.joinRetryTimer) {
          clearInterval(this.joinRetryTimer);
          this.joinRetryTimer = null;
        }
        if (this.onStateSync) {
          this.onStateSync(msg.state);
        }
      } else if (msg.type === 'PING') {
        conn.send({ type: 'PONG', timestamp: Date.now() });
      } else if (msg.type === 'TABLE_EMOTE') {
        if (this.onEmoteReceived) {
          this.onEmoteReceived(msg.emote);
        }
      } else if (msg.type === 'ERROR') {
        if (this.onError) this.onError(msg.message);
      }
    });

    conn.on('close', () => {
      if (this.joinRetryTimer) {
        clearInterval(this.joinRetryTimer);
        this.joinRetryTimer = null;
      }
      if (this.onDisconnected) this.onDisconnected();
      this.attemptReconnect();
    });

    conn.on('error', (err) => {
      console.warn('[ClientPeer] Connection error:', err);
      if (this.joinRetryTimer) {
        clearInterval(this.joinRetryTimer);
        this.joinRetryTimer = null;
      }
      if (this.onDisconnected) this.onDisconnected();
      if (resolve) resolve();
      this.attemptReconnect();
    });
  }

  private attemptReconnect() {
    if (this.destroyed) return;
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    if (this.joinRetryTimer) {
      clearInterval(this.joinRetryTimer);
      this.joinRetryTimer = null;
    }

    this.reconnectTimer = setTimeout(() => {
      if (!this.destroyed && this.peer && !this.peer.destroyed) {
        this.connectToHost();
      }
    }, 2500);
  }

  public sendAction(action: PlayerAction) {
    if (!this.conn || !this.conn.open) {
      throw new Error('Not connected to the host table.');
    }

    const payload: P2PMessage = {
      type: 'PLAYER_ACTION',
      playerId: this.playerId,
      action,
    };
    this.conn.send(payload);
  }

  public sendEmote(emote: TableEmote) {
    if (!this.conn || !this.conn.open) {
      throw new Error('Not connected to the host table.');
    }

    const payload: P2PMessage = {
      type: 'TABLE_EMOTE',
      emote,
    };
    this.conn.send(payload);
  }

  public destroy() {
    this.destroyed = true;
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    if (this.heartbeatTimeout) clearTimeout(this.heartbeatTimeout);
    if (this.joinRetryTimer) {
      clearInterval(this.joinRetryTimer);
      this.joinRetryTimer = null;
    }

    if (this.conn) {
      try {
        this.conn.close();
      } catch (e) {}
      this.conn = null;
    }

    if (this.peer) {
      try {
        this.peer.destroy();
      } catch (e) {}
      this.peer = null;
    }
  }
}

