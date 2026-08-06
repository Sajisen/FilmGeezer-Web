import {
  closeMongoConnection,
  grantAdministratorRole,
} from "../features/admin/admin.role.service.js";

function readEmailArgument(): string {
  const argument = process.argv.find((value) => value.startsWith("--email="));
  const email = argument?.slice("--email=".length).trim();

  if (!email) {
    throw new Error(
      "Usage: npm run admin:grant -- --email=administrator@example.com",
    );
  }

  return email;
}

async function main(): Promise<void> {
  const result = await grantAdministratorRole(readEmailArgument());

  console.log(
    result.changed
      ? `Administrator role granted to ${result.email}.`
      : `${result.email} already has the administrator role.`,
  );
}

main()
  .catch((error) => {
    console.error(
      error instanceof Error ? error.message : "Administrator grant failed.",
    );
    process.exitCode = 1;
  })
  .finally(async () => {
    await closeMongoConnection();
  });