import { connectToDB } from "../lib/mongo.ts";

export interface Group {
  name: string;           // e.g. "Admin" or "Moderator"
  color: string;          // hex string, e.g. "#ff0000"
  permissions: string[];  // e.g. ["delete_paste","ban_user", "*"]
}

export const GroupModel = {
  async getByName(name: string): Promise<Group | null> {
    const db = await connectToDB();
    return db.collection<Group>("groups").findOne({ name });
  },

  async create(name: string, color: string, permissions: string[]): Promise<Group> {
    const db = await connectToDB();
    const g: Group = { name, color, permissions };
    await db.collection("groups").insertOne(g);
    return g;
  },

  /** idempotent seeding of the two defaults */
  async seedDefaults() {
    const db = await connectToDB();
    const col = db.collection<Group>("groups");
    const count = await col.countDocuments();
    if (count === 0) {
      await col.insertMany([
        {
          name: "Admin",
          color: "#FF0000",
          permissions: ["*"],       // wildcard = every permission
        },
        {
          name: "Moderator",
          color: "#00CCFF",
          permissions: [
            "delete_paste",
            "delete_comment",
            "ban_user",
            // …add more as you like
          ],
        },
      ]);
      console.log("✅ Seeded default user groups");
    }
  },
};
