import { boolean, char, doublePrecision, index, integer, pgTable, text, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { createdAt, geographyPoint, id, updatedAt } from "./_types";

export const states = pgTable(
  "states",
  {
    id: id(),
    name: text("name").notNull(),
    code: char("code", { length: 2 }).notNull(),
    slug: text("slug").notNull(),
    lat: doublePrecision("lat").notNull(),
    lng: doublePrecision("lng").notNull(),
    center: geographyPoint("center"),
    intro: text("intro"),
    metaTitle: text("meta_title"),
    metaDescription: text("meta_description"),
    featured: boolean("featured").notNull().default(false),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [uniqueIndex("states_slug_uidx").on(t.slug), uniqueIndex("states_code_uidx").on(t.code)],
);

export const cities = pgTable(
  "cities",
  {
    id: id(),
    stateId: uuid("state_id")
      .notNull()
      .references(() => states.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    lat: doublePrecision("lat").notNull(),
    lng: doublePrecision("lng").notNull(),
    center: geographyPoint("center"),
    population: integer("population"),
    intro: text("intro"),
    metaTitle: text("meta_title"),
    metaDescription: text("meta_description"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    uniqueIndex("cities_state_slug_uidx").on(t.stateId, t.slug),
    index("cities_population_idx").on(t.population),
  ],
);
