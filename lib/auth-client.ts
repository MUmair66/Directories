"use client";
import { createAuthClient } from "better-auth/react";
import { adminClient, usernameClient, inferAdditionalFields } from "better-auth/client/plugins";

export const authClient = createAuthClient({
  plugins: [
    usernameClient(),
    adminClient(),
    inferAdditionalFields({
      user: {
        firstName: { type: "string", required: false },
        lastName: { type: "string", required: false },
      },
    }),
  ],
});

export const { signIn, signUp, signOut, useSession } = authClient;
