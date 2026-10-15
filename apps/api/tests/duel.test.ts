import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { connectDatabase, disconnectDatabase } from '../src/database/connection.js';
import { DuelRoom } from '../src/models/duel-room.model.js';
import { duelRoomRepository } from '../src/repositories/duel-room.repository.js';
import { duelRoomService } from '../src/services/duel-room.service.js';
import { sampleDuelQuestions, QUESTION_BANK } from '../src/services/duel-question-bank.js';
import { DuelCategory } from '@n1/shared';

describe('N1 Phase 13: Quably Duel API & Service Tests', () => {
  const app = createApp();

  beforeAll(async () => {
    await connectDatabase();
    await DuelRoom.deleteMany({});
  });

  afterAll(async () => {
    await DuelRoom.deleteMany({});
    await disconnectDatabase();
  });

  describe('1. Question Bank & Sampling', () => {
    const categories: DuelCategory[] = [
      'python',
      'java',
      'javascript',
      'sql',
      'debugging',
      'aptitude',
      'logical-reasoning',
      'technical-trivia',
      'cs-fundamentals',
      'brain-puzzles',
    ];

    it('contains questions for all 10 required categories', () => {
      for (const cat of categories) {
        const questionsInCat = QUESTION_BANK.filter(q => q.category === cat);
        expect(
          questionsInCat.length,
          `Category ${cat} should have questions in the bank`
        ).toBeGreaterThanOrEqual(2);
      }
    });

    it('samples randomized questions matching category and requested count', () => {
      const sampled = sampleDuelQuestions('python', 'easy', 5);
      expect(sampled.length).toBe(5);
      expect(sampled.every(q => q.category === 'python')).toBe(true);
      expect(sampled[0]).toHaveProperty('correctOption');
      expect(sampled[0]).toHaveProperty('explanation');
      expect(sampled[0].options.length).toBe(4);
    });

    it('strips secret answers when generating client-facing questions', async () => {
      const { room } = await duelRoomService.createRoom({
        category: 'javascript',
        difficulty: 'medium',
        questionCount: 4,
        hostName: 'DevAce',
      });

      const clientQuestions = duelRoomService.getClientQuestions(room);
      expect(clientQuestions.length).toBe(4);
      for (const q of clientQuestions) {
        expect(q).toHaveProperty('id');
        expect(q).toHaveProperty('question');
        expect(q).toHaveProperty('options');
        expect(q.options.length).toBe(4);
        expect((q as unknown as { correctOption?: number }).correctOption).toBeUndefined();
        expect((q as unknown as { explanation?: string }).explanation).toBeUndefined();
      }
    });
  });

  describe('2. Room Creation (POST /api/duel/rooms)', () => {
    it('creates a challenge room with valid category and difficulty', async () => {
      const res = await request(app)
        .post('/api/duel/rooms')
        .send({
          category: 'sql',
          difficulty: 'hard',
          questionCount: 5,
          hostName: 'DatabaseMaster',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.code).toMatch(/^[A-Z0-9]{6}$/);
      expect(res.body.data.hostToken).toBeDefined();
      expect(res.body.data.hostPlayer.name).toBe('DatabaseMaster');
      expect(res.body.data.hostPlayer.isHost).toBe(true);
      expect(res.body.data.room.category).toBe('sql');
      expect(res.body.data.room.difficulty).toBe('hard');
      expect(res.body.data.room.questionCount).toBe(5);
      expect(res.body.data.room.status).toBe('WAITING_FOR_OPPONENT');
    });

    it('rejects invalid category', async () => {
      const res = await request(app)
        .post('/api/duel/rooms')
        .send({
          category: 'invalid-category',
          difficulty: 'medium',
          questionCount: 5,
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('rejects question count below minimum or above maximum', async () => {
      const resLow = await request(app)
        .post('/api/duel/rooms')
        .send({
          category: 'python',
          difficulty: 'easy',
          questionCount: 1, // min is 3
        });
      expect(resLow.status).toBe(400);

      const resHigh = await request(app)
        .post('/api/duel/rooms')
        .send({
          category: 'python',
          difficulty: 'easy',
          questionCount: 25, // max is 20
        });
      expect(resHigh.status).toBe(400);
    });
  });

  describe('3. Room Retrieval (GET /api/duel/rooms/:code)', () => {
    it('retrieves existing room with case-insensitive code', async () => {
      const { room } = await duelRoomService.createRoom({
        category: 'debugging',
        difficulty: 'medium',
        questionCount: 4,
        hostName: 'BugHunter',
      });

      const res = await request(app).get(`/api/duel/rooms/${room.code.toLowerCase()}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.room.code).toBe(room.code);
      expect(res.body.data.room.category).toBe('debugging');
      expect(res.body.data.host.name).toBe('BugHunter');
      expect(res.body.data.opponent).toBeNull();
    });

    it('returns 404 for unknown room code', async () => {
      const res = await request(app).get('/api/duel/rooms/ZZZZ99');
      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('ROOM_NOT_FOUND');
    });

    it('returns 400 for malformed room code', async () => {
      const res = await request(app).get('/api/duel/rooms/toolongcode123');
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('INVALID_ROOM_CODE');
    });
  });

  describe('4. Opponent Joining (POST /api/duel/rooms/:code/join)', () => {
    it('allows an opponent to join a waiting room', async () => {
      const { room } = await duelRoomService.createRoom({
        category: 'aptitude',
        difficulty: 'easy',
        questionCount: 5,
        hostName: 'Alice',
      });

      const res = await request(app)
        .post(`/api/duel/rooms/${room.code}/join`)
        .send({ playerName: 'Bob' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.player.name).toBe('Bob');
      expect(res.body.data.player.isHost).toBe(false);
      expect(res.body.data.playerToken).toBeDefined();

      // Verify room now lists opponent
      const checkRes = await request(app).get(`/api/duel/rooms/${room.code}`);
      expect(checkRes.body.data.opponent.name).toBe('Bob');
    });

    it('rejects third player when opponent slot is already occupied', async () => {
      const { room } = await duelRoomService.createRoom({
        category: 'cs-fundamentals',
        difficulty: 'medium',
        questionCount: 5,
      });

      await request(app)
        .post(`/api/duel/rooms/${room.code}/join`)
        .send({ playerName: 'Opponent1' });

      // Second join attempt
      const res2 = await request(app)
        .post(`/api/duel/rooms/${room.code}/join`)
        .send({ playerName: 'Opponent2' });

      expect(res2.status).toBe(409);
      expect(res2.body.error.code).toBe('ROOM_BUSY');
    });
  });

  describe('5. Authoritative Answer Scoring & Results Calculation', () => {
    it('awards 100 base points plus speed bonus for correct answers', async () => {
      const { room, hostToken } = await duelRoomService.createRoom({
        category: 'python',
        difficulty: 'easy',
        questionCount: 3,
        hostName: 'Player1',
      });

      const firstQuestion = room.questions[0]!;
      const correctOption = firstQuestion.correctOption;

      // Submit correct answer with 50 seconds remaining
      const evalCorrect = await duelRoomService.evaluateAnswer(
        room,
        hostToken,
        0,
        correctOption,
        50
      );

      expect(evalCorrect.isCorrect).toBe(true);
      // Base (100) + speed bonus (Math.floor(50/60 * 50) = 41) = 141
      expect(evalCorrect.scoreEarned).toBeGreaterThanOrEqual(140);
      expect(evalCorrect.totalScore).toBe(evalCorrect.scoreEarned);
      expect(evalCorrect.nextQuestionIndex).toBe(1);
    });

    it('awards 0 points for incorrect answers', async () => {
      const { room, hostToken } = await duelRoomService.createRoom({
        category: 'python',
        difficulty: 'easy',
        questionCount: 3,
        hostName: 'Player2',
      });

      const firstQuestion = room.questions[0]!;
      const wrongOption = (firstQuestion.correctOption + 1) % 4;

      const evalWrong = await duelRoomService.evaluateAnswer(
        room,
        hostToken,
        0,
        wrongOption,
        55
      );

      expect(evalWrong.isCorrect).toBe(false);
      expect(evalWrong.scoreEarned).toBe(0);
      expect(evalWrong.totalScore).toBe(0);
      expect(evalWrong.nextQuestionIndex).toBe(1);
    });

    it('compiles head-to-head match results with answer breakdown', async () => {
      const { room, hostToken } = await duelRoomService.createRoom({
        category: 'brain-puzzles',
        difficulty: 'easy',
        questionCount: 3,
        hostName: 'Sherlock',
      });

      const joinRes = await duelRoomService.joinRoom(room.code, 'Watson');
      const opponentToken = joinRes.token;

      // Host answers question 0 correctly
      await duelRoomService.evaluateAnswer(
        joinRes.room,
        hostToken,
        0,
        room.questions[0]!.correctOption,
        45
      );

      // Opponent answers question 0 incorrectly
      const updatedRoom = (await duelRoomService.getRoom(room.code))!;
      await duelRoomService.evaluateAnswer(
        updatedRoom,
        opponentToken,
        0,
        (room.questions[0]!.correctOption + 1) % 4,
        40
      );

      const finalRoom = (await duelRoomService.getRoom(room.code))!;
      const results = duelRoomService.compileMatchResults(finalRoom);

      expect(results.winnerId).toBe(hostToken);
      expect(results.isDraw).toBe(false);
      expect(results.host.name).toBe('Sherlock');
      expect(results.host.correctCount).toBe(1);
      expect(results.opponent.name).toBe('Watson');
      expect(results.opponent.correctCount).toBe(0);
      expect(results.review.length).toBe(3);
      expect(results.review[0]!.hostAnswer).toBe(room.questions[0]!.correctOption);
    });
  });

  describe('6. Room Expiration & Cleanup', () => {
    it('deletes expired duel rooms when cleanup is invoked', async () => {
      const { room } = await duelRoomService.createRoom({
        category: 'technical-trivia',
        difficulty: 'mixed',
        questionCount: 3,
      });

      // Manually set expiration date in the past
      await DuelRoom.updateOne({ code: room.code }, { expiresAt: new Date(Date.now() - 10000) });

      const deletedCount = await duelRoomRepository.deleteExpired(new Date());
      expect(deletedCount).toBeGreaterThanOrEqual(1);

      const lookup = await duelRoomService.getRoom(room.code);
      expect(lookup).toBeNull();
    });
  });
});
