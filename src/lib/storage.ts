import type { TableState } from './engine/poker';

/**
 * Cookie and LocalStorage management for persistent sessions.
 * Cookies store identity and room references; LocalStorage stores larger table state snapshots.
 */

export function setCookie(name: string, value: string, days = 7) {
  if (typeof document === 'undefined') return;
  const expires = new Date(Date.now() + days * 864e5).toUTCString();
  document.cookie = `${encodeURIComponent(name)}=${encodeURIComponent(value)}; expires=${expires}; path=/; SameSite=Lax`;
}

export function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const cookies = document.cookie ? document.cookie.split('; ') : [];
  for (const c of cookies) {
    const [key, ...val] = c.split('=');
    if (decodeURIComponent(key.trim()) === name) {
      return decodeURIComponent(val.join('='));
    }
  }
  return null;
}

export function removeCookie(name: string) {
  if (typeof document === 'undefined') return;
  document.cookie = `${encodeURIComponent(name)}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; SameSite=Lax`;
}

// Session keys
const COOKIE_ROLE = 'pocketchips_role';
const COOKIE_ROOM = 'pocketchips_room';
const COOKIE_PLAYER_ID = 'pocketchips_player_id';
const COOKIE_PLAYER_NAME = 'pocketchips_player_name';
const STORAGE_PREFIX = 'pocketchips_state_';

export interface HostSession {
  roomCode: string;
  isHostPlaying: boolean;
  hostPlayerId: string;
  tableState: TableState;
}

export function saveHostSession(session: HostSession) {
  setCookie(COOKIE_ROLE, 'host', 7);
  setCookie(COOKIE_ROOM, session.roomCode, 7);
  setCookie(COOKIE_PLAYER_ID, session.hostPlayerId, 7);
  try {
    localStorage.setItem(
      `${STORAGE_PREFIX}${session.roomCode}`,
      JSON.stringify(session.tableState)
    );
    localStorage.setItem(
      `pocketchips_host_meta_${session.roomCode}`,
      JSON.stringify({
        isHostPlaying: session.isHostPlaying,
        hostPlayerId: session.hostPlayerId,
      })
    );
  } catch (e) {
    console.warn('Failed to save host state to localStorage', e);
  }
}

export function getHostSession(): HostSession | null {
  const role = getCookie(COOKIE_ROLE);
  const roomCode = getCookie(COOKIE_ROOM);
  const hostPlayerId = getCookie(COOKIE_PLAYER_ID);

  if (role !== 'host' || !roomCode) {
    return null;
  }

  try {
    const rawState = localStorage.getItem(`${STORAGE_PREFIX}${roomCode}`);
    const rawMeta = localStorage.getItem(`pocketchips_host_meta_${roomCode}`);
    if (!rawState) return null;

    const tableState: TableState = JSON.parse(rawState);
    const meta = rawMeta ? JSON.parse(rawMeta) : { isHostPlaying: true, hostPlayerId };

    return {
      roomCode,
      isHostPlaying: meta.isHostPlaying ?? true,
      hostPlayerId: meta.hostPlayerId || hostPlayerId || 'host',
      tableState,
    };
  } catch (e) {
    console.warn('Failed to retrieve host session', e);
    return null;
  }
}

export function clearHostSession(roomCode?: string) {
  removeCookie(COOKIE_ROLE);
  removeCookie(COOKIE_ROOM);
  removeCookie(COOKIE_PLAYER_ID);
  if (roomCode) {
    try {
      localStorage.removeItem(`${STORAGE_PREFIX}${roomCode}`);
      localStorage.removeItem(`pocketchips_host_meta_${roomCode}`);
    } catch (e) {}
  }
}

export interface PlayerSession {
  roomCode: string;
  playerId: string;
  playerName: string;
}

export function savePlayerSession(session: PlayerSession) {
  setCookie(COOKIE_ROLE, 'player', 7);
  setCookie(COOKIE_ROOM, session.roomCode, 7);
  setCookie(COOKIE_PLAYER_ID, session.playerId, 7);
  setCookie(COOKIE_PLAYER_NAME, session.playerName, 7);
  try {
    localStorage.setItem('pocketchips_player_id', session.playerId);
    localStorage.setItem('pocketchips_player_name', session.playerName);
    localStorage.setItem('pocketchips_player_room', session.roomCode);
  } catch (e) {}
}

export function getPlayerSession(): PlayerSession | null {
  const role = getCookie(COOKIE_ROLE);
  const roomCode = getCookie(COOKIE_ROOM) || localStorage.getItem('pocketchips_player_room');
  const playerId = getCookie(COOKIE_PLAYER_ID) || localStorage.getItem('pocketchips_player_id');
  const playerName = getCookie(COOKIE_PLAYER_NAME) || localStorage.getItem('pocketchips_player_name');

  if (role !== 'player' && !playerId) {
    return null;
  }

  if (!roomCode || !playerId) {
    return null;
  }

  return {
    roomCode,
    playerId,
    playerName: playerName || 'Player',
  };
}

export function clearPlayerSession() {
  removeCookie(COOKIE_ROLE);
  removeCookie(COOKIE_ROOM);
  removeCookie(COOKIE_PLAYER_NAME);
  try {
    localStorage.removeItem('pocketchips_player_room');
  } catch (e) {}
}

