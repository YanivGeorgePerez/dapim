import { connectToDB } from "../lib/mongo.ts";
import { GroupModel } from "./groupModel.ts";

export interface User {
  username: string;
  password: string;   // hashed
  createdAt: Date;
  group: string;      // name of the Group they belong to
}

// our “augmented” user type, with hasPermission helper
export type UserWithMethods = User & {
  hasPermission(permission: string): Promise<boolean>;
};

export const UserModel = {
  /** Creates a new user in the “Moderator” group by default. */
  async createUser(username: string, hashedPassword: string): Promise<User> {
    const db = await connectToDB();
    const user: User = {
      username,
      password: hashedPassword,
      createdAt: new Date(),
      group: "Moderator",
    };
    await db.collection("users").insertOne(user);
    return user;
  },

  /** Returns null or a UserWithMethods that you can call .hasPermission(...) on */
  async findByUsername(username: string): Promise<UserWithMethods | null> {
    const db = await connectToDB();
    const user = await db.collection<User>("users").findOne({ username });
    if (!user) return null;

    // attach a helper that checks their group’s permissions
    const userWithMethods: UserWithMethods = {
      ...user,
      async hasPermission(permission: string) {
        const group = await GroupModel.getByName(user.group);
        if (!group) return false;
        // wildcard
        if (group.permissions.includes("*")) return true;
        return group.permissions.includes(permission);
      },
    };
    return userWithMethods;
  },
};
