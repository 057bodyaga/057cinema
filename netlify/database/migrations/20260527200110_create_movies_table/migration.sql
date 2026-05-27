CREATE TABLE "movies" (
	"id" integer PRIMARY KEY,
	"title" text NOT NULL,
	"overview" text DEFAULT '' NOT NULL,
	"poster" text DEFAULT '' NOT NULL,
	"year" text DEFAULT '' NOT NULL,
	"status" text NOT NULL,
	"category" text DEFAULT 'watchlist' NOT NULL,
	"score_boy" smallint,
	"score_girl" smallint,
	"added_at" timestamp DEFAULT now() NOT NULL
);
