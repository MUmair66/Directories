import "server-only";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { admin, twoFactor, username } from "better-auth/plugins";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
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
        twoFactor: schema.twoFactors,
      },
    }),
    advanced: {
      database: { generateId: () => uuidv7() },
      cookiePrefix: "ld",
    },
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: true,
      minPasswordLength: 8,
      autoSignIn: false,
      sendResetPassword: async ({ user, url }) => {
        await sendEmail({
          to: user.email,
          template: "reset-password",
          data: { name: user.name, url },
        });
      },
    },
    emailVerification: {
      sendOnSignUp: true,
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
    rateLimit: { enabled: true, window: 60, max: 30 },
    plugins: [
      username(),
      twoFactor({ issuer: BRAND_NAME }),
      admin({ defaultRole: "user", adminRoles: ["admin"] }),
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

export async function requireRole(...roles: Role[]): Promise<SessionUser> {
  const user = await requireUser();
  if (!hasRole(user, ...roles)) redirect("/dashboard");
  return user;
}

export const isStaff = (user: { role?: string | null } | null | undefined) => hasRole(user, "admin", "editor");
