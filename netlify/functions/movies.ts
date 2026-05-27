import type { Config } from "@netlify/functions";
import { db } from "../../db/index.js";
import { movies } from "../../db/schema.js";
import { eq } from "drizzle-orm";

export default async (req: Request) => {
  const url = new URL(req.url);

  if (req.method === "GET") {
    const all = await db.select().from(movies).orderBy(movies.addedAt);
    return Response.json(all);
  }

  if (req.method === "POST") {
    const body = await req.json();
    const row = {
      id: body.id,
      title: body.title,
      overview: body.overview ?? "",
      poster: body.poster ?? "",
      year: body.year ?? "",
      status: body.status,
      category: body.category ?? "watchlist",
      scoreBoy: body.scoreBoy ?? null,
      scoreGirl: body.scoreGirl ?? null,
    };
    await db.insert(movies).values(row).onConflictDoUpdate({
      target: movies.id,
      set: {
        title: row.title,
        overview: row.overview,
        poster: row.poster,
        year: row.year,
        status: row.status,
        category: row.category,
        scoreBoy: row.scoreBoy,
        scoreGirl: row.scoreGirl,
      },
    });
    return Response.json({ ok: true });
  }

  if (req.method === "DELETE") {
    const id = parseInt(url.searchParams.get("id") ?? "0");
    if (!id) return new Response("Missing id", { status: 400 });
    await db.delete(movies).where(eq(movies.id, id));
    return Response.json({ ok: true });
  }

  return new Response("Method not allowed", { status: 405 });
};

export const config: Config = {
  path: "/api/movies",
};
