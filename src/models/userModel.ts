// src/models/userModel.ts
import { connectToDB } from "../lib/mongo.ts";
import { GroupModel }  from "./groupModel.ts";
import type { ObjectId } from "mongodb";

/* ---------- Types ---------- */
export interface User {
  _id?       : ObjectId;   // ← Mongo will assign this
  username   : string;
  password   : string;     // bcrypt hash
  createdAt  : Date;
  group      : string;     // group name
}

export type UserWithMethods = User & {
  hasPermission(permission: string): Promise<boolean>;
};

/* ---------- Collection helpers ---------- */
export const UserModel = {
  /** 
   * Creates a new user in the “Member” group by default.
   */
  async createUser(username: string, hashedPassword: string): Promise<User> {
    const db = await connectToDB();
    const user: Omit<User, "_id"> = {
      username,
      password: hashedPassword,
      createdAt: new Date(),
      group: "Member",       // <-- changed default group
    };
    const res = await db.collection<User>("users").insertOne(user);
    return { ...user, _id: res.insertedId };
  },

  /**
   * Returns null or a UserWithMethods that you can call .hasPermission(...)
   */
  async findByUsername(username: string): Promise<UserWithMethods | null> {
    const db   = await connectToDB();
    const user = await db.collection<User>("users").findOne({ username });
    if (!user) return null;

    return {
      ...user,
      async hasPermission(permission: string) {
        const grp = await GroupModel.getByName(user.group);
        if (!grp) return false;
        if (grp.permissions.includes("*")) return true;
        return grp.permissions.includes(permission);
      },
    };
  },

  /** NEW – bulk-fetch users by username */
  async findManyByUsernames(usernames: string[]): Promise<User[]> {
    if (!usernames.length) return [];
    const db = await connectToDB();
    return db
      .collection<User>("users")
      .find({ username: { $in: usernames } })
      .toArray();
  },
};
