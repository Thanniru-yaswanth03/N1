import crypto from 'node:crypto';
import {
  DuelCategory,
  DuelDifficulty,
  DuelClientQuestion,
  DuelPlayer,
  DuelRoomSummary,
  DuelMatchResults,
} from '@n1/shared';
import { IDuelRoomDocument } from '../models/duel-room.model.js';
import { DuelRoomRepository, IDuelRoomRepository } from '../repositories/duel-room.repository.js';
import { sampleDuelQuestions } from './duel-question-bank.js';
import { generateDropCode } from '../security/tokens.js';

export interface CreateDuelParams {
  category: DuelCategory;
  difficulty: DuelDifficulty;
  questionCount: number;
  hostName?: string;
}

export class DuelRoomService {
  constructor(private readonly roomRepo: IDuelRoomRepository = new DuelRoomRepository()) {}

  /**
   * Creates a new multiplayer duel room.
   */
  async createRoom(params: CreateDuelParams): Promise<{ room: IDuelRoomDocument; hostToken: string }> {
    let code = generateDropCode();
    let attempts = 0;
    while (await this.roomRepo.findByCode(code)) {
      attempts++;
      if (attempts > 10) {
        throw new Error('Failed to generate unique room code');
      }
      code = generateDropCode();
    }

    const hostToken = crypto.randomUUID();
    const hostPlayer: DuelPlayer = {
      id: hostToken,
      name: (params.hostName || 'Challenger').trim().slice(0, 24) || 'Challenger',
      color: '#6366f1', // Indigo
      isHost: true,
      score: 0,
      currentQuestionIndex: 0,
      answers: [],
      isFinished: false,
      connected: true,
    };

    const questions = sampleDuelQuestions(params.category, params.difficulty, params.questionCount);
    const now = new Date();
    // Duel rooms expire after 2 hours
    const expiresAt = new Date(now.getTime() + 2 * 60 * 60 * 1000);

    const room = await this.roomRepo.create({
      code,
      category: params.category,
      difficulty: params.difficulty,
      questionCount: questions.length,
      status: 'WAITING_FOR_OPPONENT',
      host: hostPlayer,
      opponent: null,
      questions,
      matchDurationSeconds: 60,
      createdAt: now,
      expiresAt,
      isExpired: false,
    });

    return { room, hostToken };
  }

  /**
   * Retrieves a room by short code.
   */
  async getRoom(code: string): Promise<IDuelRoomDocument | null> {
    return this.roomRepo.findByCode(code);
  }

  /**
   * Strips sensitive answer keys from questions for client gameplay.
   */
  getClientQuestions(room: IDuelRoomDocument): DuelClientQuestion[] {
    return room.questions.map(q => ({
      id: q.id,
      category: q.category as DuelCategory,
      difficulty: q.difficulty as 'easy' | 'medium' | 'hard',
      question: q.question,
      codeSnippet: q.codeSnippet,
      options: q.options as [string, string, string, string],
    }));
  }

  /**
   * Formats a room summary for lobby listing and public views.
   */
  toRoomSummary(room: IDuelRoomDocument): DuelRoomSummary {
    return {
      code: room.code,
      category: room.category,
      difficulty: room.difficulty,
      questionCount: room.questionCount,
      status: room.status,
      hostName: room.host.name,
      opponentName: room.opponent?.name,
      createdAt: room.createdAt.toISOString(),
      expiresAt: room.expiresAt.toISOString(),
    };
  }

  /**
   * Joins an opponent to a waiting room.
   */
  async joinRoom(
    code: string,
    playerName?: string
  ): Promise<{ room: IDuelRoomDocument; opponent: DuelPlayer; token: string }> {
    const room = await this.roomRepo.findByCode(code);
    if (!room) {
      throw new Error('Room not found');
    }

    if (room.isExpired || room.status === 'EXPIRED') {
      throw new Error('Room has expired');
    }

    if (room.status !== 'WAITING_FOR_OPPONENT' || room.opponent) {
      throw new Error('Room match is already in progress or completed');
    }

    const token = crypto.randomUUID();
    const opponent: DuelPlayer = {
      id: token,
      name: (playerName || 'Rival').trim().slice(0, 24) || 'Rival',
      color: '#ec4899', // Pink
      isHost: false,
      score: 0,
      currentQuestionIndex: 0,
      answers: [],
      isFinished: false,
      connected: true,
    };

    const updated = await this.roomRepo.setOpponent(code, opponent);
    if (!updated) {
      throw new Error('Failed to join room');
    }

    return { room: updated, opponent, token };
  }

  /**
   * Authoritative answer validation and scoring.
   * Base points: 100 per correct answer.
   * Speed bonus: Up to 50 points based on remaining seconds (e.g. 50 * remaining / 60).
   */
  async evaluateAnswer(
    room: IDuelRoomDocument,
    playerId: string,
    questionIndex: number,
    selectedOption: number,
    secondsRemaining: number
  ): Promise<{
    isCorrect: boolean;
    scoreEarned: number;
    totalScore: number;
    nextQuestionIndex: number;
    isFinished: boolean;
    room: IDuelRoomDocument;
  }> {
    const isHost = room.host.id === playerId;
    const player = isHost ? room.host : room.opponent;

    if (!player || player.id !== playerId) {
      throw new Error('Unauthorized player');
    }

    if (questionIndex !== player.currentQuestionIndex) {
      throw new Error('Question index out of sync');
    }

    const question = room.questions[questionIndex];
    if (!question) {
      throw new Error('Invalid question index');
    }

    const isCorrect = question.correctOption === selectedOption;
    let scoreEarned = 0;

    if (isCorrect) {
      const basePoints = 100;
      const speedBonus = Math.max(0, Math.floor((secondsRemaining / 60) * 50));
      scoreEarned = basePoints + speedBonus;
    }

    const timeSpent = Math.max(1, 60 - secondsRemaining);
    const answerRecord = {
      questionId: question.id,
      selectedOption,
      isCorrect,
      timeSpentSeconds: timeSpent,
      scoreEarned,
    };

    const updatedRoom = await this.roomRepo.recordAnswer(room.code, isHost, answerRecord);
    if (!updatedRoom) {
      throw new Error('Failed to record player answer');
    }

    const updatedPlayer = isHost ? updatedRoom.host : updatedRoom.opponent!;
    const nextQuestionIndex = updatedPlayer.currentQuestionIndex;
    const isFinished = nextQuestionIndex >= updatedRoom.questions.length;

    if (isFinished) {
      await this.roomRepo.setPlayerFinished(room.code, isHost);
      updatedPlayer.isFinished = true;
    }

    return {
      isCorrect,
      scoreEarned,
      totalScore: updatedPlayer.score,
      nextQuestionIndex,
      isFinished,
      room: updatedRoom,
    };
  }

  /**
   * Compiles comprehensive match results with head-to-head breakdown and explanation review.
   */
  compileMatchResults(room: IDuelRoomDocument): DuelMatchResults {
    const host = room.host;
    const opponent = room.opponent || {
      id: 'none',
      name: 'Opponent',
      color: '#ec4899',
      isHost: false,
      score: 0,
      currentQuestionIndex: 0,
      answers: [],
      isFinished: true,
      connected: false,
    };

    const hostCorrect = host.answers.filter(a => a.isCorrect).length;
    const oppCorrect = opponent.answers.filter(a => a.isCorrect).length;

    let winnerId: string | null = null;
    let isDraw = false;

    if (host.score > opponent.score) {
      winnerId = host.id;
    } else if (opponent.score > host.score) {
      winnerId = opponent.id;
    } else {
      isDraw = true;
    }

    const review = room.questions.map((q, qIdx) => {
      const hostAns = host.answers.find(a => a.questionId === q.id) || host.answers[qIdx];
      const oppAns = opponent.answers.find(a => a.questionId === q.id) || opponent.answers[qIdx];

      return {
        questionId: q.id,
        question: q.question,
        codeSnippet: q.codeSnippet,
        options: q.options as [string, string, string, string],
        correctOption: q.correctOption,
        explanation: q.explanation,
        hostAnswer: hostAns !== undefined ? hostAns.selectedOption : null,
        opponentAnswer: oppAns !== undefined ? oppAns.selectedOption : null,
      };
    });

    return {
      winnerId,
      isDraw,
      matchDurationSeconds: room.matchDurationSeconds || 60,
      host: {
        id: host.id,
        name: host.name,
        score: host.score,
        correctCount: hostCorrect,
        totalAnswered: host.answers.length,
        accuracy: host.answers.length > 0 ? Math.round((hostCorrect / host.answers.length) * 100) : 0,
      },
      opponent: {
        id: opponent.id,
        name: opponent.name,
        score: opponent.score,
        correctCount: oppCorrect,
        totalAnswered: opponent.answers.length,
        accuracy:
          opponent.answers.length > 0 ? Math.round((oppCorrect / opponent.answers.length) * 100) : 0,
      },
      review,
    };
  }

  /**
   * Creates a rematch room using the settings of an existing room.
   */
  async createRematch(
    oldRoom: IDuelRoomDocument,
    hostPlayerName?: string
  ): Promise<{ room: IDuelRoomDocument; hostToken: string }> {
    return this.createRoom({
      category: oldRoom.category,
      difficulty: oldRoom.difficulty,
      questionCount: oldRoom.questionCount,
      hostName: hostPlayerName || oldRoom.host.name,
    });
  }
}

export const duelRoomService = new DuelRoomService();
