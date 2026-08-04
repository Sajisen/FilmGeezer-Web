import { closeMongoConnection } from "../config/database.js";
import { resetAdministratorMfaByEmail } from "../features/admin/admin.mfa.service.js";

function readEmailArgument(): string | null {
  const argument = process.argv.find((value) => value.startsWith("--email="));
  return argument?.slice("--email=".length).trim() || null;
}

const email = readEmailArgument();

if (!email) {
  console.error(
    "Usage: npm run admin:mfa-reset -- -- --email=administrator@example.com",
  );
  process.exitCode = 1;
} else {
  try {
    const result = await resetAdministratorMfaByEmail(email);
    console.log(
      `Administrator MFA reset for ${result.email}. Revoked sessions: ${result.revokedSessions}.`,
    );
    console.log(
      "The administrator must sign in again. Required-MFA policy will force a new enrollment.",
    );
  } catch (error) {
    console.error(
      error instanceof Error
        ? error.message
        : "Administrator MFA could not be reset.",
    );
    process.exitCode = 1;
  } finally {
    await closeMongoConnection();
  }
}
