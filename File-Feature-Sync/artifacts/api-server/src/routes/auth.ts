import { Router, type IRouter } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { randomUUID } from "crypto";
import { eq } from "drizzle-orm";
import { db, usersTable, userStatsTable } from "@workspace/db";
import { seedBadges } from "../lib/gamification";

const router: IRouter = Router();

const JWT_SECRET = process.env.SESSION_SECRET ?? "echo-coach-dev-secret-change-in-prod";

router.post("/auth/register", async (req, res): Promise<void> => {
  const { email, username, password, role = "student", purpose = "general" } = req.body;

  if (!email || !username || !password) {
    res.status(400).json({ error: "email, username, and password are required" });
    return;
  }
  if (typeof password !== "string" || password.length < 6) {
    res.status(400).json({ error: "Password must be at least 6 characters" });
    return;
  }

  const [existingEmail] = await db.select().from(usersTable).where(eq(usersTable.email, email));
  if (existingEmail) {
    res.status(400).json({ error: "Email already in use" });
    return;
  }

  const [existingUsername] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.username, username));
  if (existingUsername) {
    res.status(400).json({ error: "Username already taken" });
    return;
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const userId = randomUUID();

  const [user] = await db
    .insert(usersTable)
    .values({ id: userId, email, username, passwordHash, role, purpose })
    .returning();

  await db.insert(userStatsTable).values({
    userId: user.id,
    xp: 0,
    level: 1,
    currentStreak: 0,
    longestStreak: 0,
  });

  await seedBadges();

  const token = jwt.sign({ userId: user.id, username: user.username }, JWT_SECRET, {
    expiresIn: "30d",
  });

  req.log.info({ userId: user.id }, "User registered");

  res.status(201).json({
    token,
    userId: user.id,
    username: user.username,
    email: user.email,
    role: user.role,
    purpose: user.purpose,
  });
});

router.post("/auth/login", async (req, res): Promise<void> => {
  const { email, password } = req.body;

  if (!email || !password) {
    res.status(400).json({ error: "email and password are required" });
    return;
  }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.email, email));
  if (!user) {
    res.status(401).json({ error: "Invalid email or password" });
    return;
  }

  const validPassword = await bcrypt.compare(password, user.passwordHash);
  if (!validPassword) {
    res.status(401).json({ error: "Invalid email or password" });
    return;
  }

  const token = jwt.sign({ userId: user.id, username: user.username }, JWT_SECRET, {
    expiresIn: "30d",
  });

  req.log.info({ userId: user.id }, "User logged in");

  res.json({
    token,
    userId: user.id,
    username: user.username,
    email: user.email,
    role: user.role,
    purpose: user.purpose,
  });
});

export default router;
