import { randomBytes } from "node:crypto";

console.log("ADMIN_MFA_ENCRYPTION_KEY=" + randomBytes(32).toString("base64"));
console.log(
  "ADMIN_MFA_RECOVERY_PEPPER=" + randomBytes(48).toString("base64url"),
);
