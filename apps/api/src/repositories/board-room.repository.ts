import { BoardRoomModel, IBoardRoomDocument } from '../models/board-room.model.js';
import { BoardElement, BoardChatMessage } from '@n1/shared';

export interface IBoardRoomRepository {
  create(data: Partial<IBoardRoomDocument>): Promise<IBoardRoomDocument>;
  findByCode(code: string): Promise<IBoardRoomDocument | null>;
  updateElements(code: string, elements: BoardElement[]): Promise<IBoardRoomDocument | null>;
  clearElements(code: string): Promise<IBoardRoomDocument | null>;
  updatePermissions(code: string, allowParticipantEditing: boolean): Promise<IBoardRoomDocument | null>;
  setCreatorToken(code: string, creatorToken: string): Promise<IBoardRoomDocument | null>;
  addMessage(code: string, message: BoardChatMessage): Promise<IBoardRoomDocument | null>;
  addKickedUsers(code: string, identifiers: string[]): Promise<IBoardRoomDocument | null>;
  isUserKicked(code: string, identifiers: string[]): Promise<boolean>;
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

  async updatePermissions(code: string, allowParticipantEditing: boolean): Promise<IBoardRoomDocument | null> {
    return BoardRoomModel.findOneAndUpdate(
      { code: code.toUpperCase().trim(), isExpired: false },
      {
        $set: {
          allowParticipantEditing,
          lastActivityAt: new Date(),
        },
      },
      { returnDocument: 'after' }
    ).exec();
  }

  async setCreatorToken(code: string, creatorToken: string): Promise<IBoardRoomDocument | null> {
    return BoardRoomModel.findOneAndUpdate(
      { code: code.toUpperCase().trim(), isExpired: false },
      {
        $set: {
          creatorToken,
          lastActivityAt: new Date(),
        },
      },
      { returnDocument: 'after' }
    ).exec();
  }

  async addMessage(code: string, message: BoardChatMessage): Promise<IBoardRoomDocument | null> {
    return BoardRoomModel.findOneAndUpdate(
      { code: code.toUpperCase().trim(), isExpired: false },
      {
        $push: {
          messages: {
            $each: [message],
            $slice: -100, // Capped at last 100 messages for fast loading
          },
        },
        $set: {
          lastActivityAt: new Date(),
        },
      },
      { returnDocument: 'after' }
    ).exec();
  }

  async addKickedUsers(code: string, identifiers: string[]): Promise<IBoardRoomDocument | null> {
    const validIds = identifiers.filter(id => Boolean(id && typeof id === 'string'));
    if (validIds.length === 0) return null;

    return BoardRoomModel.findOneAndUpdate(
      { code: code.toUpperCase().trim(), isExpired: false },
      {
        $addToSet: {
          kickedUserIds: { $each: validIds },
        },
        $set: {
          lastActivityAt: new Date(),
        },
      },
      { returnDocument: 'after' }
    ).exec();
  }

  async isUserKicked(code: string, identifiers: string[]): Promise<boolean> {
    const validIds = identifiers.filter(id => Boolean(id && typeof id === 'string'));
    if (validIds.length === 0) return false;

    const count = await BoardRoomModel.countDocuments({
      code: code.toUpperCase().trim(),
      kickedUserIds: { $in: validIds },
    }).exec();

    return count > 0;
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
