// src/models/groupModel.ts
import { connectToDB } from "../lib/mongo.ts";

/* ---------- Types ---------- */
export interface Group {
  name        : string;   // e.g. "Admin"
  color       : string;   // e.g. "#ff0000"
  permissions : string[]; // e.g. ["delete_paste", "*"]
}

/* ---------- Collection helpers ---------- */
export const GroupModel = {
  async getByName(name: string): Promise<Group | null> {
    const db = await connectToDB();
    return db.collection<Group>("groups").findOne({ name });
  },

  async create(name: string, color: string, permissions: string[]): Promise<Group> {
    const db = await connectToDB();
    const g : Group = { name, color, permissions };
    await db.collection<Group>("groups").insertOne(g);
    return g;
  },

  /** Idempotent seeding of default groups */
  async seedDefaults() {
    const db    = await connectToDB();
    const col   = db.collection<Group>("groups");
    const count = await col.countDocuments();
    if (count === 0) {
      await col.insertMany([
        {
          name: "Admin",
          color: "#FF0000",
          permissions: ["*"],    // all permissions
        },
        {
          name: "Moderator",
          color: "#00CCFF",
          permissions: [
            "delete_paste",
            "delete_comment",
            "ban_user",
          ],
        },
        {
          name: "Member",
          color: "#CCCCCC",
          permissions: [],       // no elevated permissions
        },
      ]);
      console.log("✅ Seeded default user groups (Admin, Moderator, Member)");
    }
  },

  /** NEW – bulk fetch groups by name (used by homeRoute, etc.) */
  async findManyByNames(names: string[]): Promise<Group[]> {
    if (names.length === 0) return [];
    const db = await connectToDB();
    return db
      .collection<Group>("groups")
      .find({ name: { $in: names } })
      .toArray();
  },
};
