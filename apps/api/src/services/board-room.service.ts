import crypto from 'crypto';
import { boardRoomRepository, IBoardRoomRepository } from '../repositories/board-room.repository.js';
import { generateDropCode } from '../security/tokens.js';
import { getTemplateElements } from '@n1/shared';
import { CreateBoardRoomInput } from '@n1/validation';
import { BoardElement, BoardRoomSummary, BoardChatMessage } from '@n1/shared';
import { IBoardRoomDocument } from '../models/board-room.model.js';

export interface BoardRoomDetailResult {
  code: string;
  title: string;
  template: string;
  elements: BoardElement[];
  messages: BoardChatMessage[];
  kickedUserIds: string[];
  createdAt: string;
  expiresAt: string;
  isExpired: boolean;
  timeRemainingSeconds: number;
  allowParticipantEditing: boolean;
  isCreator?: boolean;
  creatorToken?: string;
}

export class BoardRoomService {
  constructor(private readonly repo: IBoardRoomRepository = boardRoomRepository) {}

  /**
   * Generates a collision-resistant 6-character room code.
   */
  private async generateUniqueCode(): Promise<string> {
    for (let attempt = 0; attempt < 10; attempt++) {
      const code = generateDropCode();
      const existing = await this.repo.findByCode(code);
      if (!existing) {
        return code;
      }
    }
    // Fallback timestamp code if collision threshold hit
    return generateDropCode();
  }

  /**
   * Creates a new anonymous shared Study Board room.
   */
  async createRoom(input: CreateBoardRoomInput): Promise<BoardRoomSummary> {
    const code = await this.generateUniqueCode();
    const expiresInMs = (input.expiresInHours || 24) * 60 * 60 * 1000;
    const now = new Date();
    const expiresAt = new Date(now.getTime() + expiresInMs);
    const creatorToken = `cr_${crypto.randomBytes(16).toString('hex')}`;

    const initialElements = getTemplateElements(input.template || 'blank');

    const room = await this.repo.create({
      code,
      title: input.title || 'Study Session',
      template: input.template || 'blank',
      elements: initialElements,
      creatorToken,
      allowParticipantEditing: true,
      createdAt: now,
      expiresAt,
      isExpired: false,
      lastActivityAt: now,
    });

    return this.toSummary(room);
  }

  /**
   * Retrieves an active Study Board room by code.
   * Enforces automatic expiration.
   */
  async getRoom(code: string, providedToken?: string | null): Promise<BoardRoomDetailResult | null> {
    const room = await this.repo.findByCode(code);
    if (!room) {
      return null;
    }

    const now = new Date();
    if (room.isExpired || room.expiresAt <= now) {
      if (!room.isExpired) {
        await this.repo.markAsExpired(room._id!.toString());
      }
      return {
        code: room.code,
        title: room.title,
        template: room.template,
        elements: [],
        messages: [],
        kickedUserIds: [],
        createdAt: room.createdAt.toISOString(),
        expiresAt: room.expiresAt.toISOString(),
        isExpired: true,
        timeRemainingSeconds: 0,
        allowParticipantEditing: false,
        isCreator: false,
      };
    }

    const timeRemainingSeconds = Math.max(
      0,
      Math.floor((room.expiresAt.getTime() - now.getTime()) / 1000)
    );

    const isCreator = Boolean(
      room.creatorToken && providedToken && room.creatorToken === providedToken
    );

    return {
      code: room.code,
      title: room.title,
      template: room.template,
      elements: room.elements || [],
      messages: room.messages || [],
      kickedUserIds: room.kickedUserIds || [],
      createdAt: room.createdAt.toISOString(),
      expiresAt: room.expiresAt.toISOString(),
      isExpired: false,
      timeRemainingSeconds,
      allowParticipantEditing: room.allowParticipantEditing ?? true,
      isCreator,
      creatorToken: isCreator ? room.creatorToken : undefined,
    };
  }

  /**
   * Verifies if a token matches the room creator, or claims creator role
   * if the room has no token yet (legacy rooms).
   */
  async verifyOrClaimCreator(
    code: string,
    providedToken?: string | null
  ): Promise<{ isCreator: boolean; token: string }> {
    const room = await this.repo.findByCode(code);
    if (!room) {
      return { isCreator: false, token: '' };
    }

    if (!room.creatorToken) {
      // First user to join legacy room becomes Creator
      const newToken = providedToken || `cr_${crypto.randomBytes(16).toString('hex')}`;
      await this.repo.setCreatorToken(code, newToken);
      return { isCreator: true, token: newToken };
    }

    const isMatch = Boolean(providedToken && providedToken === room.creatorToken);
    return { isCreator: isMatch, token: room.creatorToken };
  }

  /**
   * Updates participant editing permission for a room.
   */
  async updatePermissions(code: string, allowParticipantEditing: boolean): Promise<boolean> {
    const updated = await this.repo.updatePermissions(code, allowParticipantEditing);
    return !!updated;
  }

  /**
   * Saves elements to an active room.
   */
  async updateElements(code: string, elements: BoardElement[]): Promise<boolean> {
    const updated = await this.repo.updateElements(code, elements);
    return !!updated;
  }

  /**
   * Clears all canvas elements from an active room.
   */
  async clearElements(code: string): Promise<boolean> {
    const updated = await this.repo.clearElements(code);
    return !!updated;
  }

  /**
   * Persists a chat message to the room's message stream.
   */
  async addChatMessage(code: string, message: BoardChatMessage): Promise<boolean> {
    const updated = await this.repo.addMessage(code, message);
    return !!updated;
  }

  /**
   * Records kicked user identifiers in database.
   */
  async kickUser(code: string, identifiers: string[]): Promise<boolean> {
    const updated = await this.repo.addKickedUsers(code, identifiers);
    return !!updated;
  }

  /**
   * Checks if user identifiers are in the kicked list.
   */
  async isUserKicked(code: string, identifiers: string[]): Promise<boolean> {
    return this.repo.isUserKicked(code, identifiers);
  }

  /**
   * Converts a document to public summary.
   */
  toSummary(room: IBoardRoomDocument): BoardRoomSummary {
    return {
      code: room.code,
      title: room.title,
      template: room.template,
      elementCount: (room.elements || []).length,
      allowParticipantEditing: room.allowParticipantEditing ?? true,
      creatorToken: room.creatorToken,
      createdAt: room.createdAt.toISOString(),
      expiresAt: room.expiresAt.toISOString(),
      isExpired: room.isExpired,
      messages: room.messages || [],
      kickedUserIds: room.kickedUserIds || [],
    };
  }
}

export const boardRoomService = new BoardRoomService();
