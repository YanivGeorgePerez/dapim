import { connectToDB } from "../lib/mongo.ts";

export interface Comment {
  id: string;
  user: string;
  content: string;
  createdAt: Date;
}

export interface Paste {
  id: string;
  title: string;
  content: string;
  user: string;       // Creator's username
  createdAt: Date;
  comments: Comment[];
  views: string[];    // Array of unique IP addresses
}

export const PasteModel = {
  async createPaste(title: string, content: string, user: string): Promise<Paste> {
    const db = await connectToDB();
    // Using crypto.randomUUID for a unique paste id (requires Node 15+ or a polyfill)
    const paste: Paste = {
      id: crypto.randomUUID(),
      title,
      content,
      user,
      createdAt: new Date(),
      comments: [],
      views: []
    };
    await db.collection("pastes").insertOne(paste);
    return paste;
  },

  async getPasteById(id: string): Promise<Paste | null> {
    const db = await connectToDB();
    return await db.collection<Paste>("pastes").findOne({ id });
  },

  async searchPastes(query: string, limit = 20): Promise<Paste[]> {
    const db = await connectToDB();
    const cursor = db.collection<Paste>("pastes").find({
      $or: [
        { title: { $regex: query, $options: "i" } },
        { content: { $regex: query, $options: "i" } }
      ]
    }).limit(limit);
    return await cursor.toArray();
  },

  async getRecentPastes(limit = 20): Promise<Paste[]> {
    const db = await connectToDB();
    const cursor = db.collection<Paste>("pastes").find({}).sort({ createdAt: -1 }).limit(limit);
    return await cursor.toArray();
  },

  // Add a view: push the IP if not already present.
  async addView(pasteId: string, ip: string): Promise<void> {
    const db = await connectToDB();
    await db.collection<Paste>("pastes").updateOne(
      { id: pasteId, views: { $ne: ip } },
      { $push: { views: ip } }
    );
  },

  async addComment(pasteId: string, user: string, content: string): Promise<Comment | null> {
    const db = await connectToDB();
    const comment: Comment = {
      id: crypto.randomUUID(),
      user,
      content,
      createdAt: new Date(),
    };
    const result = await db.collection<Paste>("pastes").updateOne(
      { id: pasteId },
      { $push: { comments: comment } }
    );
    return result.modifiedCount === 0 ? null : comment;
  },

  // New: Get all pastes created by a particular user.
  async getPastesByUser(username: string): Promise<Paste[]> {
    const db = await connectToDB();
    const cursor = db.collection<Paste>("pastes").find({ user: username }).sort({ createdAt: -1 });
    return await cursor.toArray();
  }
};
