import { pgTable, integer, text, smallint, timestamp } from "drizzle-orm/pg-core";

export const movies = pgTable("movies", {
  id: integer("id").primaryKey(),
  title: text("title").notNull(),
  overview: text("overview").notNull().default(""),
  poster: text("poster").notNull().default(""),
  year: text("year").notNull().default(""),
  status: text("status").notNull(),       // "watchlist" | "watched"
  category: text("category").notNull().default("watchlist"), // "joint" | "boy" | "girl" | "watchlist"
  scoreBoy: smallint("score_boy"),
  scoreGirl: smallint("score_girl"),
  addedAt: timestamp("added_at").defaultNow().notNull(),
});
