import { customType, timestamp, uuid } from "drizzle-orm/pg-core";
import { uuidv7 } from "uuidv7";

/** Case-insensitive text (citext extension). */
export const citext = customType<{ data: string }>({
  dataType() {
    return "citext";
  },
});

/**
 * PostGIS geography(Point, 4326).
 * The app never writes this column directly: a trigger fills it from lat/lng on every save,
 * and PostGIS functions are called through the `sql` template (see lib/geo.ts).
 */
export const geographyPoint = customType<{ data: string; driverData: string }>({
  dataType() {
    return "geography(Point, 4326)";
  },
});

/** tsvector for generated full-text search columns. */
export const tsvector = customType<{ data: string }>({
  dataType() {
    return "tsvector";
  },
});

/** Time-sorted UUIDv7 primary key generated in the app. */
export const id = () =>
  uuid("id")
    .primaryKey()
    .$defaultFn(() => uuidv7());

export const createdAt = () => timestamp("created_at", { withTimezone: true }).notNull().defaultNow();
export const updatedAt = () =>
  timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date());
export const deletedAt = () => timestamp("deleted_at", { withTimezone: true });
