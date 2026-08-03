import {
  closeMongoConnection,
  revokeAdministratorRole,
} from "../features/admin/admin.role.service.js";

function readEmailArgument(): string {
  const argument = process.argv.find((value) => value.startsWith("--email="));
  const email = argument?.slice("--email=".length).trim();

  if (!email) {
    throw new Error(
      "Usage: npm run admin:revoke -- --email=administrator@example.com",
    );
  }

  return email;
}

async function main(): Promise<void> {
  const result = await revokeAdministratorRole(readEmailArgument());

  console.log(
    result.changed
      ? `Administrator role revoked from ${result.email}.`
      : `${result.email} does not currently have the administrator role.`,
  );
}

main()
  .catch((error) => {
    console.error(
      error instanceof Error ? error.message : "Administrator revoke failed.",
    );
    process.exitCode = 1;
  })
  .finally(async () => {
    await closeMongoConnection();
  });