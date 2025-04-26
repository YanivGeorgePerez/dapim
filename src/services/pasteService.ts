import { PasteModel } from "../models/pasteModel.ts";
import { UserModel }  from "../models/userModel.ts";
import { ObjectId }   from "mongodb";

import type { Paste, Comment }          from "../models/pasteModel.ts";
import type { UserWithMethods }         from "../models/userModel.ts";

export class PasteService {
  async createPaste(
    title: string,
    content: string,
    userId: ObjectId
  ): Promise<Paste> {
    return PasteModel.createPaste(title, content, userId);
  }

  async getPasteById(id: ObjectId): Promise<Paste | null> {
    return PasteModel.getPasteById(id);
  }

  async searchPastes(query: string, limit = 20): Promise<Paste[]> {
    // returns enriched list (PasteForList under the hood)
    return (await PasteModel.searchWithAuthor(query, limit)) as unknown as Paste[];
  }

  async getRecentPastes(limit = 20): Promise<Paste[]> {
    return (await PasteModel.listRecentWithAuthor(limit)) as unknown as Paste[];
  }

  async addCommentToPaste(
    pasteId: ObjectId,
    userId: ObjectId,
    content: string
  ): Promise<Comment | null> {
    return PasteModel.addComment(pasteId, userId, content);
  }

  async addViewToPaste(pasteId: ObjectId, ip: string): Promise<void> {
    return PasteModel.addView(pasteId, ip);
  }

  /** Fetch all pastes by a given username */
  async getPastesByUser(username: string): Promise<Paste[]> {
    const u: UserWithMethods | null = await UserModel.findByUsername(username);
    if (!u || !u._id) return [];
    return PasteModel.listByUser(u._id);
  }
}
