import { connectToDB } from "../lib/mongo.ts";
import { GroupModel }  from "./groupModel.ts";

/* ---------- Types ---------- */
export interface User {
  username : string;
  password : string;   // bcrypt hash
  createdAt: Date;
  group    : string;   // name of the Group they belong to
}

/* Handy helper attached to one-off lookups */
export type UserWithMethods = User & {
  hasPermission(permission: string): Promise<boolean>;
};

/* ---------- Collection helpers ---------- */
export const UserModel = {
  /** Create a user (default group = "Moderator"). */
  async createUser(username: string, hashedPassword: string): Promise<User> {
    const db = await connectToDB();
    const user: User = {
      username,
      password : hashedPassword,
      createdAt: new Date(),
      group    : "Moderator",
    };
    await db.collection<User>("users").insertOne(user);
    return user;
  },

  /** Find **one** user and attach `.hasPermission()` helper. */
  async findByUsername(username: string): Promise<UserWithMethods | null> {
    const db   = await connectToDB();
    const user = await db
      .collection<User>("users")
      .findOne({ username });

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

  /** NEW – fetch **many** users with a single database call. */
  async findManyByUsernames(usernames: string[]): Promise<User[]> {
    if (usernames.length === 0) return [];
    const db = await connectToDB();
    return db
      .collection<User>("users")
      .find({ username: { $in: usernames } })
      .toArray();
  },
};
