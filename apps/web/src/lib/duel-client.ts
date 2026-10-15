import {
  CreateDuelRoomInput,
  DuelClientQuestion,
  DuelMatchResults,
  DuelPlayer,
  DuelRoomSummary,
  DuelSocketClientMessage,
  DuelSocketServerMessage,
} from '@n1/shared';

const getApiBase = (): string => {
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL.replace(/\/$/, '');
  }
  return 'http://localhost:5000';
};

const getWsBase = (): string => {
  if (typeof window === 'undefined') return 'ws://localhost:5000/ws/duel';
  const apiBase = getApiBase();
  const url = new URL(apiBase);
  const protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${protocol}//${url.host}/ws/duel`;
};

export async function createDuelRoom(data: CreateDuelRoomInput): Promise<{
  code: string;
  hostToken: string;
  hostPlayer: DuelPlayer;
  room: DuelRoomSummary;
}> {
  const res = await fetch(`${getApiBase()}/api/duel/rooms`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

  const body = await res.json();
  if (!res.ok) {
    throw new Error(body?.error?.message || 'Failed to create duel challenge');
  }

  return body.data;
}

export async function getDuelRoom(code: string): Promise<{
  room: DuelRoomSummary;
  host: { id: string; name: string; color: string };
  opponent: { id: string; name: string; color: string } | null;
}> {
  const res = await fetch(`${getApiBase()}/api/duel/rooms/${code.toUpperCase().trim()}`);
  const body = await res.json();

  if (!res.ok) {
    throw new Error(body?.error?.message || 'Failed to retrieve duel room');
  }

  return body.data;
}

export async function joinDuelRoom(
  code: string,
  playerName?: string
): Promise<{
  code: string;
  playerToken: string;
  player: DuelPlayer;
  room: DuelRoomSummary;
}> {
  const res = await fetch(`${getApiBase()}/api/duel/rooms/${code.toUpperCase().trim()}/join`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ playerName }),
  });

  const body = await res.json();
  if (!res.ok) {
    throw new Error(body?.error?.message || 'Failed to join duel room');
  }

  return body.data;
}

export interface DuelSocketCallbacks {
  onLobbyState?: (data: { room: DuelRoomSummary; players: DuelPlayer[]; currentUser: DuelPlayer }) => void;
  onQueueJoined?: (data: { category: string; position: number }) => void;
  onMatchFound?: (data: { roomCode: string; token: string; opponent: { name: string } }) => void;
  onOpponentJoined?: (opponent: DuelPlayer) => void;
  onCountdownTick?: (secondsRemaining: number) => void;
  onMatchStart?: (data: {
    matchDurationSeconds: number;
    questions: DuelClientQuestion[];
    endsAt: string;
  }) => void;
  onAnswerResult?: (data: {
    questionIndex: number;
    selectedOption: number;
    isCorrect: boolean;
    scoreEarned: number;
    totalScore: number;
    nextQuestionIndex: number;
  }) => void;
  onPlayerProgress?: (data: {
    playerId: string;
    score: number;
    currentQuestionIndex: number;
    isFinished: boolean;
  }) => void;
  onMatchFinished?: (results: DuelMatchResults) => void;
  onOpponentDisconnected?: (gracePeriodSeconds: number) => void;
  onOpponentReconnected?: () => void;
  onOpponentForfeited?: (winnerId: string) => void;
  onRematchOffered?: (fromPlayerId: string) => void;
  onRematchAccepted?: (nextRoomCode: string) => void;
  onError?: (message: string) => void;
  onConnectionChange?: (connected: boolean) => void;
}

export class DuelSocketClient {
  private ws: WebSocket | null = null;
  private roomCode: string = '';
  private token?: string;
  private playerName?: string;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private intentionallyClosed = false;

  constructor(private callbacks: DuelSocketCallbacks) {}

  public connect(roomCode: string, token?: string, playerName?: string): void {
    this.roomCode = roomCode.toUpperCase().trim();
    this.token = token;
    this.playerName = playerName;
    this.intentionallyClosed = false;

    if (typeof window === 'undefined') return;

    const baseWs = getWsBase();
    const url = new URL(baseWs);
    url.searchParams.set('roomCode', this.roomCode);
    if (this.token) url.searchParams.set('token', this.token);
    if (this.playerName) url.searchParams.set('playerName', this.playerName);

    try {
      this.ws = new WebSocket(url.toString());

      this.ws.onopen = () => {
        this.reconnectAttempts = 0;
        this.callbacks.onConnectionChange?.(true);
      };

      this.ws.onmessage = (event: MessageEvent) => {
        try {
          const message: DuelSocketServerMessage = JSON.parse(event.data);
          this.handleServerMessage(message);
        } catch (err) {
          console.error('[DuelSocket] Failed to parse message', err);
        }
      };

      this.ws.onclose = () => {
        this.callbacks.onConnectionChange?.(false);
        if (!this.intentionallyClosed && this.reconnectAttempts < this.maxReconnectAttempts) {
          this.reconnectAttempts++;
          setTimeout(() => {
            if (!this.intentionallyClosed) {
              this.connect(this.roomCode, this.token, this.playerName);
            }
          }, 1500);
        }
      };

      this.ws.onerror = () => {
        this.callbacks.onError?.('Real-time connection error');
      };
    } catch (err) {
      console.error('[DuelSocket] Connection instantiation failed', err);
      this.callbacks.onError?.('Could not initiate WebSocket connection');
    }
  }

  public joinQueue(category?: string, difficulty?: string, playerName?: string): void {
    this.intentionallyClosed = false;
    if (typeof window === 'undefined') return;

    const baseWs = getWsBase();
    try {
      if (this.ws) {
        this.ws.close();
      }
      this.ws = new WebSocket(baseWs);

      this.ws.onopen = () => {
        this.callbacks.onConnectionChange?.(true);
        this.send({
          type: 'JOIN_QUEUE',
          category: category as any,
          difficulty: difficulty as any,
          playerName,
        });
      };

      this.ws.onmessage = (event: MessageEvent) => {
        try {
          const message: DuelSocketServerMessage = JSON.parse(event.data);
          this.handleServerMessage(message);
        } catch (err) {
          console.error('[DuelSocket] Failed to parse message', err);
        }
      };

      this.ws.onclose = () => {
        this.callbacks.onConnectionChange?.(false);
      };

      this.ws.onerror = () => {
        this.callbacks.onError?.('Matchmaking connection error');
      };
    } catch (err) {
      this.callbacks.onError?.('Could not connect to matchmaking queue');
    }
  }

  public leaveQueue(): void {
    this.send({ type: 'LEAVE_QUEUE' });
    this.disconnect();
  }


  private handleServerMessage(message: DuelSocketServerMessage): void {
    switch (message.type) {
      case 'QUEUE_JOINED':
        this.callbacks.onQueueJoined?.(message);
        break;
      case 'MATCH_FOUND':
        this.callbacks.onMatchFound?.(message);
        break;
      case 'LOBBY_STATE':
        this.callbacks.onLobbyState?.(message);
        break;
      case 'OPPONENT_JOINED':
        this.callbacks.onOpponentJoined?.(message.opponent);
        break;
      case 'COUNTDOWN_TICK':
        this.callbacks.onCountdownTick?.(message.secondsRemaining);
        break;
      case 'MATCH_START':
        this.callbacks.onMatchStart?.(message);
        break;
      case 'ANSWER_RESULT':
        this.callbacks.onAnswerResult?.(message);
        break;
      case 'PLAYER_PROGRESS':
        this.callbacks.onPlayerProgress?.(message);
        break;
      case 'MATCH_FINISHED':
        this.callbacks.onMatchFinished?.(message.results);
        break;
      case 'OPPONENT_DISCONNECTED':
        this.callbacks.onOpponentDisconnected?.(message.gracePeriodSeconds);
        break;
      case 'OPPONENT_RECONNECTED':
        this.callbacks.onOpponentReconnected?.();
        break;
      case 'OPPONENT_FORFEITED':
        this.callbacks.onOpponentForfeited?.(message.winnerId);
        break;
      case 'REMATCH_OFFERED':
        this.callbacks.onRematchOffered?.(message.fromPlayerId);
        break;
      case 'REMATCH_ACCEPTED':
        this.callbacks.onRematchAccepted?.(message.nextRoomCode);
        break;
      case 'ERROR':
        this.callbacks.onError?.(message.message);
        break;
    }
  }

  public submitAnswer(questionIndex: number, selectedOption: number): void {
    this.send({
      type: 'SUBMIT_ANSWER',
      questionIndex,
      selectedOption,
    });
  }

  public requestRematch(): void {
    this.send({ type: 'REQUEST_REMATCH' });
  }

  public acceptRematch(): void {
    this.send({ type: 'ACCEPT_REMATCH' });
  }

  private send(msg: DuelSocketClientMessage): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(msg));
    }
  }

  public disconnect(): void {
    this.intentionallyClosed = true;
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}
