import { BoardRoomModel, IBoardRoomDocument } from '../models/board-room.model.js';
import { BoardElement } from '@n1/shared';

export interface IBoardRoomRepository {
  create(data: Partial<IBoardRoomDocument>): Promise<IBoardRoomDocument>;
  findByCode(code: string): Promise<IBoardRoomDocument | null>;
  updateElements(code: string, elements: BoardElement[]): Promise<IBoardRoomDocument | null>;
  clearElements(code: string): Promise<IBoardRoomDocument | null>;
  findExpired(referenceTime?: Date, limit?: number): Promise<IBoardRoomDocument[]>;
  markAsExpired(id: string): Promise<IBoardRoomDocument | null>;
  deleteExpired(referenceTime?: Date): Promise<number>;
  deleteByCode(code: string): Promise<boolean>;
}

export class BoardRoomRepository implements IBoardRoomRepository {
  async create(data: Partial<IBoardRoomDocument>): Promise<IBoardRoomDocument> {
    const room = new BoardRoomModel(data);
    return room.save();
  }

  async findByCode(code: string): Promise<IBoardRoomDocument | null> {
    return BoardRoomModel.findOne({ code: code.toUpperCase().trim() }).exec();
  }

  async updateElements(code: string, elements: BoardElement[]): Promise<IBoardRoomDocument | null> {
    return BoardRoomModel.findOneAndUpdate(
      { code: code.toUpperCase().trim(), isExpired: false },
      {
        $set: {
          elements,
          lastActivityAt: new Date(),
        },
      },
      { returnDocument: 'after' }
    ).exec();
  }

  async clearElements(code: string): Promise<IBoardRoomDocument | null> {
    return BoardRoomModel.findOneAndUpdate(
      { code: code.toUpperCase().trim(), isExpired: false },
      {
        $set: {
          elements: [],
          lastActivityAt: new Date(),
        },
      },
      { returnDocument: 'after' }
    ).exec();
  }

  async findExpired(referenceTime: Date = new Date(), limit: number = 100): Promise<IBoardRoomDocument[]> {
    return BoardRoomModel.find({
      isExpired: false,
      expiresAt: { $lte: referenceTime },
    })
      .limit(limit)
      .exec();
  }

  async markAsExpired(id: string): Promise<IBoardRoomDocument | null> {
    return BoardRoomModel.findByIdAndUpdate(
      id,
      {
        $set: {
          isExpired: true,
          elements: [], // Immediately purge canvas elements on expiration
        },
      },
      { returnDocument: 'after' }
    ).exec();
  }

  async deleteExpired(referenceTime: Date = new Date()): Promise<number> {
    const res = await BoardRoomModel.deleteMany({
      $or: [
        { isExpired: true },
        { expiresAt: { $lte: referenceTime } },
      ],
    }).exec();
    return res.deletedCount || 0;
  }

  async deleteByCode(code: string): Promise<boolean> {
    const res = await BoardRoomModel.deleteOne({ code: code.toUpperCase().trim() }).exec();
    return (res.deletedCount || 0) > 0;
  }
}

export const boardRoomRepository = new BoardRoomRepository();
