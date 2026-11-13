import "server-only";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { admin, captcha, username } from "better-auth/plugins";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { cache } from "react";
import { uuidv7 } from "uuidv7";
import { eq } from "drizzle-orm";
import { db, poolDb, schema } from "@/lib/db";
import { sendEmail } from "@/lib/email";
import { BRAND_NAME, SITE_URL } from "@/lib/site";

export const ROLES = ["admin", "editor", "owner", "user"] as const;
export type Role = (typeof ROLES)[number];

function createAuth() {
  return betterAuth({
    appName: BRAND_NAME,
    baseURL: process.env.BETTER_AUTH_URL || SITE_URL,
    secret: process.env.BETTER_AUTH_SECRET,
    database: drizzleAdapter(poolDb(), {
      provider: "pg",
      schema: {
        user: schema.users,
        session: schema.sessions,
        account: schema.accounts,
        verification: schema.verifications,
        rateLimit: schema.rateLimits,
      },
    }),
    advanced: {
      database: { generateId: () => uuidv7() },
      cookiePrefix: "ld",
    },
    emailAndPassword: {
      enabled: true,
      // Simple sign-up: the account is usable immediately and the user is signed in.
      requireEmailVerification: false,
      minPasswordLength: 8,
      autoSignIn: true,
      sendResetPassword: async ({ user, url }) => {
        await sendEmail({
          to: user.email,
          template: "reset-password",
          data: { name: user.name, url },
        });
      },
    },
    // Verification emails are only sent on request (e.g. after an email change), never as a sign-up gate.
    emailVerification: {
      sendOnSignUp: false,
      sendOnSignIn: false,
      autoSignInAfterVerification: true,
      sendVerificationEmail: async ({ user, url }) => {
        await sendEmail({
          to: user.email,
          template: "verify-email",
          data: { name: user.name, url },
        });
      },
    },
    socialProviders:
      process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
        ? {
            google: {
              clientId: process.env.GOOGLE_CLIENT_ID,
              clientSecret: process.env.GOOGLE_CLIENT_SECRET,
              mapProfileToUser: (profile) => ({
                firstName: profile.given_name,
                lastName: profile.family_name,
              }),
            },
          }
        : undefined,
    session: {
      expiresIn: 60 * 60 * 24 * 30,
      updateAge: 60 * 60 * 24,
      cookieCache: { enabled: true, maxAge: 5 * 60 },
    },
    user: {
      changeEmail: { enabled: true },
      deleteUser: { enabled: true },
      additionalFields: {
        firstName: { type: "string", required: false },
        lastName: { type: "string", required: false },
        email2: { type: "string", required: false, input: false },
        phone: { type: "string", required: false, input: false },
        gender: { type: "string", required: false, input: false },
        photoUrl: { type: "string", required: false, input: false },
        country: { type: "string", required: false, input: false },
        state: { type: "string", required: false, input: false },
        city: { type: "string", required: false, input: false },
        address: { type: "string", required: false, input: false },
        zip: { type: "string", required: false, input: false },
        lastLoginAt: { type: "date", required: false, input: false },
      },
    },
    databaseHooks: {
      session: {
        create: {
          after: async (session) => {
            await db
              .update(schema.users)
              .set({ lastLoginAt: new Date() })
              .where(eq(schema.users.id, session.userId));
          },
        },
      },
    },
    // Login/sign-up rate limits live in Neon (rate_limits table): shared across serverless instances, no extra datastore.
    rateLimit: {
      enabled: true,
      storage: "database",
      modelName: "rateLimit",
      window: 60,
      max: 30,
      customRules: {
        "/sign-in/email": { window: 60, max: 10 },
        "/sign-in/username": { window: 60, max: 10 },
        "/sign-up/email": { window: 3600, max: 10 },
        "/request-password-reset": { window: 3600, max: 5 },
        // Reading the current session happens on every page view (header, dashboards): never throttle it.
        "/get-session": false,
      },
    },
    plugins: [
      username(),
      admin({ defaultRole: "user", adminRoles: ["admin"] }),
      ...(process.env.TURNSTILE_SECRET_KEY
        ? [
            captcha({
              provider: "cloudflare-turnstile",
              secretKey: process.env.TURNSTILE_SECRET_KEY,
              endpoints: ["/sign-up/email", "/sign-in/email", "/sign-in/username", "/request-password-reset"],
            }),
          ]
        : []),
      nextCookies(),
    ],
  });
}

type Auth = ReturnType<typeof createAuth>;
let instance: Auth | undefined;

/** Lazily created so builds don't need DATABASE_URL. */
export function getAuth(): Auth {
  instance ??= createAuth();
  return instance;
}

export type Session = Auth["$Infer"]["Session"];
export type SessionUser = Session["user"];

/** Current session for this request (deduped per render). */
export const getSession = cache(async (): Promise<Session | null> => {
  return getAuth().api.getSession({ headers: await headers() });
});

export async function requireUser(redirectTo = "/login"): Promise<SessionUser> {
  const session = await getSession();
  if (!session) redirect(redirectTo);
  return session.user;
}

export function hasRole(user: { role?: string | null } | null | undefined, ...roles: Role[]) {
  return !!user?.role && roles.includes(user.role as Role);
}

/** Signed-out users go to login; signed-in users without the role get a 404 (no redirect, and the admin area isn't revealed). */
export async function requireRole(...roles: Role[]): Promise<SessionUser> {
  const user = await requireUser();
  if (!hasRole(user, ...roles)) notFound();
  return user;
}

export const isStaff = (user: { role?: string | null } | null | undefined) => hasRole(user, "admin", "editor");
