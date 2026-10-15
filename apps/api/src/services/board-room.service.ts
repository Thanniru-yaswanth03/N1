import { boardRoomRepository, IBoardRoomRepository } from '../repositories/board-room.repository.js';
import { generateDropCode } from '../security/tokens.js';
import { getTemplateElements } from '@n1/shared';
import { CreateBoardRoomInput } from '@n1/validation';
import { BoardElement, BoardRoomSummary } from '@n1/shared';
import { IBoardRoomDocument } from '../models/board-room.model.js';

export interface BoardRoomDetailResult {
  code: string;
  title: string;
  template: string;
  elements: BoardElement[];
  createdAt: string;
  expiresAt: string;
  isExpired: boolean;
  timeRemainingSeconds: number;
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

    const initialElements = getTemplateElements(input.template || 'blank');

    const room = await this.repo.create({
      code,
      title: input.title || 'Study Session',
      template: input.template || 'blank',
      elements: initialElements,
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
  async getRoom(code: string): Promise<BoardRoomDetailResult | null> {
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
        createdAt: room.createdAt.toISOString(),
        expiresAt: room.expiresAt.toISOString(),
        isExpired: true,
        timeRemainingSeconds: 0,
      };
    }

    const timeRemainingSeconds = Math.max(
      0,
      Math.floor((room.expiresAt.getTime() - now.getTime()) / 1000)
    );

    return {
      code: room.code,
      title: room.title,
      template: room.template,
      elements: room.elements || [],
      createdAt: room.createdAt.toISOString(),
      expiresAt: room.expiresAt.toISOString(),
      isExpired: false,
      timeRemainingSeconds,
    };
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
   * Converts a document to public summary.
   */
  toSummary(room: IBoardRoomDocument): BoardRoomSummary {
    return {
      code: room.code,
      title: room.title,
      template: room.template,
      elementCount: (room.elements || []).length,
      createdAt: room.createdAt.toISOString(),
      expiresAt: room.expiresAt.toISOString(),
      isExpired: room.isExpired,
    };
  }
}

export const boardRoomService = new BoardRoomService();
