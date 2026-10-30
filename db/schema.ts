import { sqliteTable, text } from "drizzle-orm/sqlite-core";

export const settings = sqliteTable("settings", {
    key: text("key").primaryKey(),
    value: text("value").notNull(),
});

export const diary = sqliteTable("diary", {
    id: text("id").primaryKey(),
    authorId: text("author_id").notNull(),
    title: text("title").notNull(),
    body: text("body").notNull(),
    visibility: text("visibility").notNull().default("private"),
    tag: text("tag").notNull().default("生活"),
    date: text("date").notNull(),
});
