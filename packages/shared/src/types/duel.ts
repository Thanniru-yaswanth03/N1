export type DuelCategory =
  | 'python'
  | 'java'
  | 'javascript'
  | 'sql'
  | 'debugging'
  | 'aptitude'
  | 'logical-reasoning'
  | 'technical-trivia'
  | 'cs-fundamentals'
  | 'brain-puzzles';

export type DuelDifficulty = 'easy' | 'medium' | 'hard' | 'mixed';

export interface CreateDuelRoomInput {
  category?: DuelCategory;
  difficulty?: DuelDifficulty;
  questionCount?: number;
  hostName?: string;
}

export interface DuelQuestion {
  id: string;
  category: DuelCategory;
  difficulty: 'easy' | 'medium' | 'hard';
  question: string;
  codeSnippet?: string;
  options: [string, string, string, string];
  correctOption: number; // 0, 1, 2, 3 (authoritative on server)
  explanation: string;
}

/**
 * Question payload sent to client (correctOption stripped to prevent client-side inspection)
 */
export interface DuelClientQuestion {
  id: string;
  category: DuelCategory;
  difficulty: 'easy' | 'medium' | 'hard';
  question: string;
  codeSnippet?: string;
  options: [string, string, string, string];
}

export interface DuelPlayer {
  id: string;
  name: string;
  color: string;
  isHost: boolean;
  score: number;
  currentQuestionIndex: number;
  answers: Array<{
    questionId: string;
    selectedOption: number;
    isCorrect: boolean;
    timeSpentSeconds: number;
    scoreEarned: number;
  }>;
  isFinished: boolean;
  connected: boolean;
}

export type DuelRoomStatus =
  | 'WAITING_FOR_OPPONENT'
  | 'COUNTDOWN'
  | 'IN_PROGRESS'
  | 'FINISHED'
  | 'EXPIRED';

export interface IDuelRoom {
  _id?: string;
  code: string;
  category: DuelCategory;
  difficulty: DuelDifficulty;
  questionCount: number;
  status: DuelRoomStatus;
  host: DuelPlayer;
  opponent: DuelPlayer | null;
  questions: DuelQuestion[];
  matchDurationSeconds: number;
  startedAt?: Date;
  endsAt?: Date;
  createdAt: Date;
  expiresAt: Date;
  isExpired: boolean;
}

export interface DuelRoomSummary {
  code: string;
  category: DuelCategory;
  difficulty: DuelDifficulty;
  questionCount: number;
  status: DuelRoomStatus;
  hostName: string;
  opponentName?: string;
  createdAt: string;
  expiresAt: string;
}

export interface DuelMatchResults {
  winnerId: string | null; // null if draw
  isDraw: boolean;
  matchDurationSeconds: number;
  host: {
    id: string;
    name: string;
    score: number;
    correctCount: number;
    totalAnswered: number;
    accuracy: number;
  };
  opponent: {
    id: string;
    name: string;
    score: number;
    correctCount: number;
    totalAnswered: number;
    accuracy: number;
  };
  review: Array<{
    questionId: string;
    question: string;
    codeSnippet?: string;
    options: [string, string, string, string];
    correctOption: number;
    explanation: string;
    hostAnswer: number | null;
    opponentAnswer: number | null;
  }>;
}

// ── WebSocket Messages ──────────────────────────────────────────────────────

export type DuelSocketClientMessage =
  | { type: 'JOIN_DUEL'; roomCode: string; playerName?: string }
  | { type: 'JOIN_QUEUE'; category?: DuelCategory; difficulty?: DuelDifficulty; playerName?: string }
  | { type: 'LEAVE_QUEUE' }
  | { type: 'SUBMIT_ANSWER'; questionIndex: number; selectedOption: number }
  | { type: 'REQUEST_REMATCH' }
  | { type: 'ACCEPT_REMATCH' };

export type DuelSocketServerMessage =
  | {
      type: 'LOBBY_STATE';
      room: DuelRoomSummary;
      players: DuelPlayer[];
      currentUser: DuelPlayer;
    }
  | { type: 'QUEUE_JOINED'; category: DuelCategory; position: number }
  | { type: 'MATCH_FOUND'; roomCode: string; token: string; opponent: { name: string } }
  | { type: 'OPPONENT_JOINED'; opponent: DuelPlayer }
  | { type: 'COUNTDOWN_TICK'; secondsRemaining: number }
  | {
      type: 'MATCH_START';
      matchDurationSeconds: number;
      questions: DuelClientQuestion[];
      endsAt: string;
    }
  | {
      type: 'ANSWER_RESULT';
      questionIndex: number;
      selectedOption: number;
      isCorrect: boolean;
      scoreEarned: number;
      totalScore: number;
      nextQuestionIndex: number;
    }
  | {
      type: 'PLAYER_PROGRESS';
      playerId: string;
      score: number;
      currentQuestionIndex: number;
      isFinished: boolean;
    }
  | { type: 'MATCH_FINISHED'; results: DuelMatchResults }
  | { type: 'OPPONENT_DISCONNECTED'; gracePeriodSeconds: number }
  | { type: 'OPPONENT_RECONNECTED' }
  | { type: 'OPPONENT_FORFEITED'; winnerId: string }
  | { type: 'REMATCH_OFFERED'; fromPlayerId: string }
  | { type: 'REMATCH_ACCEPTED'; nextRoomCode: string }
  | { type: 'ERROR'; message: string };
