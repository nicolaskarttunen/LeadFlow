import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import prisma from "@/lib/prisma";
import { sendLeadFlowVerificationEmail } from "@/lib/email/send-auth-email";

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  emailVerification: {
    sendVerificationEmail: async ({ user, url }) => {
      void sendLeadFlowVerificationEmail({
        to: user.email,
        name: user.name,
        verificationUrl: url,
      }).catch((error) => {
        console.error("LeadFlow verification email delivery failed", {
          userId: user.id,
          error,
        });
      });
    },
    sendOnSignUp: true,
    sendOnSignIn: true,
    autoSignInAfterVerification: true,
    expiresIn: 60 * 60,
  },
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
    maxPasswordLength: 128,
    requireEmailVerification: true,
  },
  trustedOrigins: [process.env.BETTER_AUTH_URL ?? "http://localhost:3000"],
});
