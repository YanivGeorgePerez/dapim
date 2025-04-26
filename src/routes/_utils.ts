// src/routes/_utils.ts
import path from "path";
import { getUserFromRequest } from "../lib/session.ts";

export async function renderEJS(view: string, data: any): Promise<string> {
  const ejs   = await import("ejs");
  const views = path.join(import.meta.dir, "../views");
  const body  = await ejs.renderFile(path.join(views, `${view}.ejs`), data);

  return ejs.renderFile(
    path.join(views, "layout.ejs"),
    { ...data, user: getUserFromRequest(data.req), body }
  ) as Promise<string>;
}
