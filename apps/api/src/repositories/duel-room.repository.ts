import { DuelRoom, IDuelRoomDocument } from '../models/duel-room.model.js';
import { DuelRoomStatus, DuelPlayer } from '@n1/shared';

export interface IDuelRoomRepository {
  create(data: Partial<IDuelRoomDocument>): Promise<IDuelRoomDocument>;
  findByCode(code: string): Promise<IDuelRoomDocument | null>;
  updateStatus(
    code: string,
    status: DuelRoomStatus,
    startedAt?: Date,
    endsAt?: Date
  ): Promise<IDuelRoomDocument | null>;
  setOpponent(code: string, opponent: DuelPlayer): Promise<IDuelRoomDocument | null>;
  recordAnswer(
    code: string,
    isHost: boolean,
    answer: DuelPlayer['answers'][0]
  ): Promise<IDuelRoomDocument | null>;
  setPlayerFinished(code: string, isHost: boolean): Promise<IDuelRoomDocument | null>;
  setPlayerConnected(code: string, isHost: boolean, connected: boolean): Promise<IDuelRoomDocument | null>;
  deleteExpired(referenceTime?: Date): Promise<number>;
  deleteByCode(code: string): Promise<boolean>;
}

export class DuelRoomRepository implements IDuelRoomRepository {
  async create(data: Partial<IDuelRoomDocument>): Promise<IDuelRoomDocument> {
    const room = new DuelRoom(data);
    return room.save();
  }

  async findByCode(code: string): Promise<IDuelRoomDocument | null> {
    return DuelRoom.findOne({ code: code.toUpperCase().trim() }).exec();
  }

  async updateStatus(
    code: string,
    status: DuelRoomStatus,
    startedAt?: Date,
    endsAt?: Date
  ): Promise<IDuelRoomDocument | null> {
    const update: Record<string, unknown> = { status };
    if (startedAt !== undefined) update['startedAt'] = startedAt;
    if (endsAt !== undefined) update['endsAt'] = endsAt;

    return DuelRoom.findOneAndUpdate(
      { code: code.toUpperCase().trim() },
      { $set: update },
      { returnDocument: 'after' }
    ).exec();
  }

  async setOpponent(code: string, opponent: DuelPlayer): Promise<IDuelRoomDocument | null> {
    return DuelRoom.findOneAndUpdate(
      { code: code.toUpperCase().trim() },
      { $set: { opponent } },
      { returnDocument: 'after' }
    ).exec();
  }

  async recordAnswer(
    code: string,
    isHost: boolean,
    answer: DuelPlayer['answers'][0]
  ): Promise<IDuelRoomDocument | null> {
    const prefix = isHost ? 'host' : 'opponent';
    return DuelRoom.findOneAndUpdate(
      { code: code.toUpperCase().trim() },
      {
        $push: { [`${prefix}.answers`]: answer },
        $inc: {
          [`${prefix}.score`]: answer.scoreEarned,
          [`${prefix}.currentQuestionIndex`]: 1,
        },
      },
      { returnDocument: 'after' }
    ).exec();
  }

  async setPlayerFinished(code: string, isHost: boolean): Promise<IDuelRoomDocument | null> {
    const field = isHost ? 'host.isFinished' : 'opponent.isFinished';
    return DuelRoom.findOneAndUpdate(
      { code: code.toUpperCase().trim() },
      { $set: { [field]: true } },
      { returnDocument: 'after' }
    ).exec();
  }

  async setPlayerConnected(
    code: string,
    isHost: boolean,
    connected: boolean
  ): Promise<IDuelRoomDocument | null> {
    const field = isHost ? 'host.connected' : 'opponent.connected';
    return DuelRoom.findOneAndUpdate(
      { code: code.toUpperCase().trim() },
      { $set: { [field]: connected } },
      { returnDocument: 'after' }
    ).exec();
  }

  async deleteExpired(referenceTime: Date = new Date()): Promise<number> {
    const result = await DuelRoom.deleteMany({
      expiresAt: { $lte: referenceTime },
    }).exec();
    return result.deletedCount || 0;
  }

  async deleteByCode(code: string): Promise<boolean> {
    const result = await DuelRoom.deleteOne({ code: code.toUpperCase().trim() }).exec();
    return (result.deletedCount || 0) > 0;
  }
}

export const duelRoomRepository = new DuelRoomRepository();
