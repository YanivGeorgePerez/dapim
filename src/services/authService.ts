import { UserModel } from "../models/userModel.ts";
import bcrypt from "bcryptjs";

export class AuthService {
  async register(username: string, password: string) {
    const existing = await UserModel.findByUsername(username);
    if (existing) throw new Error("Username already taken");

    const hash = await bcrypt.hash(password, 10);
    return UserModel.createUser(username, hash);
  }

  async login(username: string, password: string) {
    const user = await UserModel.findByUsername(username);
    if (!user) throw new Error("Invalid credentials");

    const match = await bcrypt.compare(password, user.password);
    if (!match) throw new Error("Invalid credentials");

    return user;
  }
}
