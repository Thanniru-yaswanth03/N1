import { DropFile, IDropFileDocument } from '../models/drop-file.model.js';
import { Types } from 'mongoose';

export interface IDropFileRepository {
  create(data: Partial<IDropFileDocument>): Promise<IDropFileDocument>;
  createMany(data: Partial<IDropFileDocument>[]): Promise<IDropFileDocument[]>;
  findByDropId(dropId: string | Types.ObjectId): Promise<IDropFileDocument[]>;
  findById(id: string): Promise<IDropFileDocument | null>;
  findByStoredName(storedName: string): Promise<IDropFileDocument | null>;
  deleteByDropId(dropId: string | Types.ObjectId): Promise<number>;
  deleteById(id: string): Promise<boolean>;
}

export class DropFileRepository implements IDropFileRepository {
  /**
   * Persists a single DropFile document.
   */
  async create(data: Partial<IDropFileDocument>): Promise<IDropFileDocument> {
    const file = new DropFile(data);
    return file.save();
  }

  /**
   * Batch persists multiple DropFile documents in one operation.
   */
  async createMany(data: Partial<IDropFileDocument>[]): Promise<IDropFileDocument[]> {
    if (data.length === 0) return [];
    const inserted = await DropFile.insertMany(data as Array<Record<string, unknown>>);
    return inserted as unknown as IDropFileDocument[];
  }

  /**
   * Finds all files belonging to a specific Drop ID.
   */
  async findByDropId(dropId: string | Types.ObjectId): Promise<IDropFileDocument[]> {
    return DropFile.find({ dropId }).exec();
  }

  /**
   * Finds a file document by its MongoDB ObjectId.
   */
  async findById(id: string): Promise<IDropFileDocument | null> {
    return DropFile.findById(id).exec();
  }

  /**
   * Finds a file document by its stored unique filename.
   */
  async findByStoredName(storedName: string): Promise<IDropFileDocument | null> {
    return DropFile.findOne({ storedName: storedName.trim() }).exec();
  }

  /**
   * Deletes all file metadata associated with a Drop ID.
   * Returns the count of deleted documents.
   */
  async deleteByDropId(dropId: string | Types.ObjectId): Promise<number> {
    const result = await DropFile.deleteMany({ dropId }).exec();
    return result.deletedCount || 0;
  }

  /**
   * Deletes a specific file document by ID.
   */
  async deleteById(id: string): Promise<boolean> {
    const result = await DropFile.findByIdAndDelete(id).exec();
    return Boolean(result);
  }
}

export const dropFileRepository = new DropFileRepository();
