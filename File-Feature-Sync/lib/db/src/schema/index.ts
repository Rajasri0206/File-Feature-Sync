import {
  pgTable,
  text,
  serial,
  integer,
  real,
  timestamp,
  index,
  boolean,
  unique,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const usersTable = pgTable(
  "users",
  {
    id: text("id").primaryKey(),
    email: text("email").notNull().unique(),
    username: text("username").notNull().unique(),
    passwordHash: text("password_hash").notNull(),
    role: text("role").notNull().default("student"),
    purpose: text("purpose").notNull().default("general"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    index("users_email_idx").on(table.email),
    index("users_username_idx").on(table.username),
  ],
);

export const userStatsTable = pgTable("user_stats", {
  userId: text("user_id").primaryKey().references(() => usersTable.id, { onDelete: "cascade" }),
  xp: integer("xp").notNull().default(0),
  level: integer("level").notNull().default(1),
  currentStreak: integer("current_streak").notNull().default(0),
  longestStreak: integer("longest_streak").notNull().default(0),
  lastActiveDate: text("last_active_date"),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const badgesTable = pgTable("badges", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  icon: text("icon").notNull(),
  condition: text("condition").notNull(),
});

export const userBadgesTable = pgTable(
  "user_badges",
  {
    id: serial("id").primaryKey(),
    userId: text("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
    badgeId: text("badge_id").notNull().references(() => badgesTable.id),
    earnedAt: timestamp("earned_at").notNull().defaultNow(),
  },
  (table) => [
    index("user_badges_user_id_idx").on(table.userId),
    unique("user_badges_unique").on(table.userId, table.badgeId),
  ],
);

export const sessionsTable = pgTable(
  "sessions",
  {
    id: serial("id").primaryKey(),
    userId: text("user_id").notNull(),
    audioPath: text("audio_path").notNull(),
    status: text("status").notNull().default("uploaded"),
    transcript: text("transcript"),
    fluencyScore: real("fluency_score"),
    pauseScore: real("pause_score"),
    vocabularyScore: real("vocabulary_score"),
    confidenceScore: real("confidence_score"),
    overallScore: real("overall_score"),
    wordsPerMinute: real("words_per_minute"),
    uniqueWordRatio: real("unique_word_ratio"),
    fillerWordCount: integer("filler_word_count"),
    totalWords: integer("total_words"),
    durationSeconds: real("duration_seconds"),
    xpEarned: integer("xp_earned"),
    topicUsed: text("topic_used"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    analyzedAt: timestamp("analyzed_at"),
  },
  (table) => [
    index("sessions_user_id_idx").on(table.userId),
    index("sessions_status_idx").on(table.status),
    index("sessions_created_at_idx").on(table.createdAt),
  ],
);

export const feedbackTable = pgTable(
  "feedback",
  {
    id: serial("id").primaryKey(),
    sessionId: integer("session_id")
      .notNull()
      .references(() => sessionsTable.id),
    feedback: text("feedback").notNull(),
    strengths: text("strengths").array(),
    improvements: text("improvements").array(),
    fillerWords: text("filler_words").array(),
    audioFeedbackBase64: text("audio_feedback_base64"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [index("feedback_session_id_idx").on(table.sessionId)],
);

export const insertSessionSchema = createInsertSchema(sessionsTable).omit({
  id: true,
  createdAt: true,
  analyzedAt: true,
});

export const insertFeedbackSchema = createInsertSchema(feedbackTable).omit({
  id: true,
  createdAt: true,
});

export const insertUserSchema = createInsertSchema(usersTable).omit({ createdAt: true });

export type InsertSession = z.infer<typeof insertSessionSchema>;
export type Session = typeof sessionsTable.$inferSelect;
export type InsertFeedback = z.infer<typeof insertFeedbackSchema>;
export type Feedback = typeof feedbackTable.$inferSelect;
export type User = typeof usersTable.$inferSelect;
export type UserStats = typeof userStatsTable.$inferSelect;
export type Badge = typeof badgesTable.$inferSelect;
export type UserBadge = typeof userBadgesTable.$inferSelect;
