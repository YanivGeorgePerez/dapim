// ────────────────────────────────────────────────────────────
// src/models/pasteModel.ts
// ────────────────────────────────────────────────────────────
import { ObjectId }    from "mongodb";
import { connectToDB } from "../lib/mongo.ts";

/*────────────────────────
 | Type definitions
 *────────────────────────*/
export interface Comment {
  id:        ObjectId;
  userId:    ObjectId;
  content:   string;
  createdAt: Date;
}

export interface Paste {
  /* We keep our own “id” field so external code never touches Mongo’s _id.   */
  id:        ObjectId;
  title:     string;
  content:   string;
  userId:    ObjectId;
  createdAt: Date;
  comments:  Comment[];
  views:     string[];      // unique IPs
}

/** Shape returned to list views (already enriched with author & group data). */
export interface PasteForList {
  id:        ObjectId;
  title:     string;
  createdAt: Date;
  views:     string[];
  user:      string;   // author username
  userColor: string;   // hex from group
}

/*────────────────────────
 | Helper: typed collection
 *────────────────────────*/
async function col() {
  return (await connectToDB()).collection<Paste>("pastes");
}

/*────────────────────────
 | PasteModel
 *────────────────────────*/
export const PasteModel = {
  /* create a new paste */
  async createPaste(
    title: string,
    content: string,
    userId: ObjectId,
  ): Promise<Paste> {
    const paste: Paste = {
      id: new ObjectId(),
      title,
      content,
      userId,
      createdAt: new Date(),
      comments: [],
      views: [],
    };
    await (await col()).insertOne(paste);
    return paste;
  },

  /* get a single paste by its public id */
  async getPasteById(id: ObjectId): Promise<Paste | null> {
    return (await col()).findOne({ id });
  },

  /* add a unique view (IP) */
  async addView(pasteId: ObjectId, ip: string): Promise<void> {
    await (await col()).updateOne(
      { id: pasteId, views: { $ne: ip } },
      { $push: { views: ip } },
    );
  },

  /* add a comment */
  async addComment(
    pasteId: ObjectId,
    userId: ObjectId,
    content: string,
  ): Promise<Comment | null> {
    const comment: Comment = {
      id: new ObjectId(),
      userId,
      content,
      createdAt: new Date(),
    };
    const res = await (await col()).updateOne(
      { id: pasteId },
      { $push: { comments: comment } },
    );
    return res.modifiedCount ? comment : null;
  },

  /* list helpers (returning enriched objects) */
  async listRecentWithAuthor(limit = 20): Promise<PasteForList[]> {
    return this._listWithAuthor({}, limit);
  },

  async searchWithAuthor(query: string, limit = 20): Promise<PasteForList[]> {
    return this._listWithAuthor(
      {
        $or: [
          { title:   { $regex: query, $options: "i" } },
          { content: { $regex: query, $options: "i" } },
        ],
      },
      limit,
    );
  },

  /* internal aggregation used by both helpers */
  async _listWithAuthor(
    match: Record<string, unknown>,
    limit = 20,
  ): Promise<PasteForList[]> {
    return (await col())
      .aggregate<PasteForList>([
        { $match: match },
        { $sort: { createdAt: -1 } },
        { $limit: limit },

        /* join author */
        {
          $lookup: {
            from: "users",
            localField: "userId",
            foreignField: "_id",
            as: "author",
          },
        },
        { $unwind: "$author" },

        /* join group */
        {
          $lookup: {
            from: "groups",
            localField: "author.group",
            foreignField: "name",
            as: "grp",
          },
        },
        { $unwind: "$grp" },

        /* final projection */
        {
          $project: {
            _id:        0,
            id:         "$id",
            title:      1,
            createdAt:  1,
            views:      1,
            user:       "$author.username",
            userColor:  "$grp.color",
          },
        },
      ])
      .toArray();
  },

  /* pastes by one user */
  async listByUser(userId: ObjectId): Promise<Paste[]> {
    return (await col())
      .find({ userId })
      .sort({ createdAt: -1 })
      .toArray();
  },
};
