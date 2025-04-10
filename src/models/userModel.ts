import { connectToDB } from "../lib/mongo.ts";

export interface User {
  username: string;
  password: string; // hashed
  createdAt: Date;
}

export const UserModel = {
  async createUser(username: string, hashedPassword: string): Promise<User> {
    const db = await connectToDB();
    const user: User = {
      username,
      password: hashedPassword,
      createdAt: new Date(),
    };
    await db.collection("users").insertOne(user);
    return user;
  },

  async findByUsername(username: string): Promise<User | null> {
    const db = await connectToDB();
    return db.collection<User>("users").findOne({ username });
  }
};
