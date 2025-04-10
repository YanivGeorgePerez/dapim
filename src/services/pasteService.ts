import { PasteModel } from "../models/pasteModel.ts";
import type { Paste, Comment } from "../models/pasteModel.ts";

export class PasteService {
  async createPaste(title: string, content: string, user: string): Promise<Paste> {
    return PasteModel.createPaste(title, content, user);
  }

  async getPasteById(id: string): Promise<Paste | null> {
    return PasteModel.getPasteById(id);
  }

  async searchPastes(query: string, limit = 20): Promise<Paste[]> {
    return PasteModel.searchPastes(query, limit);
  }

  async getRecentPastes(limit = 20): Promise<Paste[]> {
    return PasteModel.getRecentPastes(limit);
  }

  async addCommentToPaste(pasteId: string, user: string, content: string): Promise<Comment | null> {
    return PasteModel.addComment(pasteId, user, content);
  }

  async addViewToPaste(pasteId: string, ip: string): Promise<void> {
    return PasteModel.addView(pasteId, ip);
  }
  
  // New: Get all pastes created by a user.
  async getPastesByUser(username: string): Promise<Paste[]> {
    return PasteModel.getPastesByUser(username);
  }
}
