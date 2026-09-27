import { db } from '../database/index.js';
import { movies } from '../database/schema.js';
import { eq, desc } from 'drizzle-orm';

export default async (req: Request) => {
  const url = new URL(req.url);
  const method = req.method;

  try {
    // GET /api/movies — теперь сортирует по убыванию даты (новые сверху)
    if (method === 'GET') {
      const result = await db.select().from(movies).orderBy(desc(movies.addedAt));
      return new Response(JSON.stringify(result), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // POST /api/movies
    if (method === 'POST') {
      const body = await req.json();

      await db.insert(movies).values({
        id: body.id,
        title: body.title,
        overview: body.overview ?? "",
        poster: body.poster ?? "",
        year: body.year ?? "",
        status: body.status,
        category: body.category ?? "watchlist",
        scoreBoy: body.scoreBoy ?? null,
        scoreGirl: body.scoreGirl ?? null,
        addedAt: new Date(), // обновляем timestamp при добавлении/изменении
      }).onConflictDoUpdate({
        target: movies.id,
        set: {
          title: body.title,
          overview: body.overview ?? "",
          poster: body.poster ?? "",
          year: body.year ?? "",
          status: body.status,
          category: body.category ?? "watchlist",
          scoreBoy: body.scoreBoy ?? null,
          scoreGirl: body.scoreGirl ?? null,
          // ВАЖНО: addedAt НЕ обновляем при редактировании оценок,
          // чтобы просмотренные фильмы сохраняли свою позицию!
        },
      });

      return new Response(JSON.stringify({ success: true }), { status: 200 });
    }

    // DELETE /api/movies?id=123
    if (method === 'DELETE') {
      const id = url.searchParams.get('id');
      if (!id) return new Response('Missing ID', { status: 400 });

      await db.delete(movies).where(eq(movies.id, Number(id)));
      return new Response(JSON.stringify({ success: true }), { status: 200 });
    }

    return new Response('Method Not Allowed', { status: 405 });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
};
