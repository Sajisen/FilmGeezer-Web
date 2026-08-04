# FilmGeezer Administrator Passkeys — Audit, Installation, and Test Guide

**Date:** 4 August 2026  
**Correct planned domain:** `filmgeezer.site`  
**Production administrator origin:** `https://admin.filmgeezer.site`  
**Implementation basis:** the 4 August 2026 source ZIP, with the uploaded Building Chat 6 → 7 Markdown handoff used as architectural context.

## 1. What was audited before implementation

The current source was inspected for:

- separate public and administrator applications;
- separate administrator cookie, session collection, CSRF token/header, and trusted Origin enforcement;
- administrator role verification on every privileged session;
- restricted `mfa-enrollment` sessions;
- encrypted TOTP secrets;
- replay-protected TOTP verification;
- one-time recovery-code hashing and consumption;
- recent administrator authentication;
- administrator audit events;
- MongoDB Stable API strict mode;
- the existing support inbox and public Contact flow;
- the manual corrections listed in the handoff.

The five banner files are absent because the user intentionally omitted those large images from the shared ZIP. Their existing imports were not changed.

## 2. Implemented passkey architecture

The implementation adds passkeys as an additional strong factor owned by the existing FilmGeezer administrator user ID. It does not create another administrator identity system.

### Login

```text
Administrator email + password
→ existing short-lived administrator MFA challenge
→ passkey preferred when registered
→ TOTP or recovery code remains available
→ full administrator session only after successful verification
```

Canceling the browser passkey prompt does not consume the parent password challenge, so fallback verification remains available.

### Restricted enrollment

When `ADMIN_MFA_REQUIRED=true` and the administrator has no strong factor:

```text
password accepted
→ restricted enrollment session
→ choose passkey (recommended) or authenticator app
→ successful enrollment upgrades the current session
```

### Sensitive-action confirmation

The existing recent-authentication window now supports:

- passkey confirmation; or
- password plus TOTP/recovery fallback.

Passkey registration and passkey revocation require a recent administrator verification window. Restricted first-factor enrollment uses the fresh password-authenticated enrollment session.

### Multiple credentials

Up to 10 active passkeys can be registered per administrator. Each stores only:

- credential ID;
- public key;
- signature counter;
- transports;
- device type;
- backup/synchronization state;
- user-supplied label;
- requested attachment preference;
- created and last-used dates;
- revocation state.

FilmGeezer never receives or stores fingerprints, face templates, device PINs, or private passkey keys.

### Final-factor protection

Recovery codes are emergency fallback only and do not count as a strong factor.

- TOTP cannot be removed if there are no active passkeys.
- The final passkey cannot be removed if TOTP is not active.
- One method may be removed when another strong method remains.
- A shared per-administrator `admin_security_states` revision document is written inside every factor-changing transaction. This serializes concurrent TOTP/passkey changes and prevents two simultaneous removals from both observing an outdated factor count.

### Recovery-code migration

Existing recovery hashes are moved idempotently from `admin_mfa_factors` into `admin_recovery_factors` without decrypting, reissuing, or exposing codes. Existing TOTP administrators retain their authenticator secret and usable recovery codes.

Passkey-only administrators can generate replacement recovery codes after a recent passkey confirmation. Replacing the set invalidates every prior code.

### New MongoDB collections

```text
admin_recovery_factors
admin_passkey_credentials
admin_passkey_challenges
admin_security_states
```

Indexes include unique administrator ownership records, globally unique passkey credential IDs, active-credential query support, challenge lookup, challenge-parent lookup, and TTL cleanup.

## 3. Required dependency installation

The two `package.json` files contain the exact passkey dependency versions, but this execution environment could not reach the public npm registry and its internal package mirror returned 404 responses for these packages. Therefore, the source was not falsely marked build-clean and the lockfiles were not hand-fabricated. Run the exact install commands below locally; npm will update both lockfiles from the registry.

Run from the project root in PowerShell:

```powershell
cd client
npm install --save-exact @simplewebauthn/browser@13.3.0

cd ../server
npm install --save-exact @simplewebauthn/server@13.3.2

cd ..
```

After installation, confirm that both `package-lock.json` files changed and commit them with the source.

## 4. Environment configuration

Local development:

```env
ADMIN_WEBAUTHN_RP_NAME=FilmGeezer Administration
ADMIN_WEBAUTHN_RP_ID=localhost
ADMIN_WEBAUTHN_ORIGIN=http://localhost:5173
```

Production:

```env
ADMIN_APP_ORIGIN=https://admin.filmgeezer.site
ADMIN_WEBAUTHN_RP_NAME=FilmGeezer Administration
ADMIN_WEBAUTHN_RP_ID=admin.filmgeezer.site
ADMIN_WEBAUTHN_ORIGIN=https://admin.filmgeezer.site
```

The server validates that:

- RP ID and WebAuthn Origin are configured together;
- the Origin contains no path, query, or fragment;
- the Origin hostname exactly matches the configured RP ID;
- the WebAuthn Origin exactly matches `ADMIN_APP_ORIGIN` when configured;
- production WebAuthn uses HTTPS.

Localhost and production passkeys are separate credentials because they use different relying parties.

## 5. Build validation to run locally

```powershell
cd client
npm run lint
npm run build

cd ../server
npm run build

cd ..
git diff --check
```

Expected result: all four commands finish without errors. Do not continue to runtime tests until they pass.

### Validation completed in this environment

- All 370 non-declaration TypeScript/TSX source files passed TypeScript syntax transpilation.
- All relative TypeScript imports resolve; only the intentionally omitted banner-image imports are absent.
- Both package files and both existing lockfiles are valid JSON.
- No old `filmgezer.site` or `filmgazer.site` spelling remains in the changed source.
- No temporary validation stubs, `node_modules`, `dist`, `.data`, `.env`, or `.env.local` are included in the deliverables.
- Uploaded server `.env` values were cross-scanned and were not copied into shareable source.

Actual client lint/build and server build were **not** claimed as passed because dependencies could not be installed in this execution environment.

## 6. Database and startup check

After the local builds pass:

```powershell
cd server
npm run dev
```

Confirm startup creates or validates the new indexes without weakening MongoDB `apiStrict: true`.

Check that legacy recovery hashes are migrated once and cleared from the TOTP document only after the dedicated recovery record exists inside the transaction.

## 7. Functional test matrix

### Existing flow regression

1. Password + TOTP administrator login still works.
2. Password + recovery-code login still works.
3. A used recovery code cannot be reused.
4. Restricted authenticator enrollment still works.
5. Recent password + TOTP/recovery confirmation still works.
6. Support inbox reads, replies, and status updates still work.
7. Public Contact conversations remain unaffected.

### Passkey enrollment

1. Sign in with existing TOTP.
2. Open **Admin → Security**.
3. Confirm recent authentication.
4. Register a Windows Hello platform passkey with a recognizable label.
5. Verify the passkey appears with created date, device type, backup state, and no last-used date initially.
6. Register a second passkey on another trusted device or hardware security key.
7. Verify duplicate/replayed registration responses fail.
8. Verify an expired challenge fails.
9. Verify a browser-prompt cancellation makes no account change.
10. Verify the 11th active credential is rejected by the server.

### Passkey login

1. Sign out.
2. Enter administrator email and password.
3. Confirm the passkey prompt opens first.
4. Complete Windows Hello verification.
5. Verify a full administrator session is issued.
6. Verify `lastUsedAt`, counter, device type, and backup state update.
7. Cancel the prompt and use TOTP fallback.
8. Repeat and use a recovery-code fallback.
9. Verify a credential owned by another administrator is rejected.
10. Verify a revoked credential is rejected.
11. Verify expired and over-attempt challenges require signing in again.

### Restricted enrollment

1. Use a test administrator with no TOTP/passkeys while `ADMIN_MFA_REQUIRED=true`.
2. Sign in with password.
3. Confirm dashboard modules remain inaccessible.
4. Choose passkey and finish enrollment.
5. Save the newly generated recovery codes.
6. Confirm the current session upgrades to full and other privileged sessions are revoked.
7. Repeat on another test account with authenticator enrollment to confirm the alternative remains intact.

### Recent authentication

1. Let the recent-authentication window expire.
2. Attempt passkey registration or removal; expect `ADMIN_RECENT_AUTHENTICATION_REQUIRED`.
3. Confirm with passkey.
4. Retry the sensitive action successfully.
5. Repeat with password + TOTP.
6. Repeat with password + recovery code.

### Final-factor and concurrency protection

1. TOTP only: confirm TOTP removal is blocked.
2. One passkey only: confirm passkey removal is blocked.
3. TOTP + one passkey: remove either one successfully.
4. Two passkeys, no TOTP: remove one; final passkey remains protected.
5. Send two factor-removal requests simultaneously from separate tabs/devices. Confirm at least one transaction conflicts/retries and the final strong factor remains.
6. Confirm recovery codes alone never permit final-factor removal.

### Recovery-code management

1. Existing TOTP recovery codes remain valid after migration.
2. Registering the first passkey without recovery codes generates ten codes once.
3. Adding another passkey does not generate another set when codes already exist.
4. After recent passkey verification, generate replacement codes.
5. Confirm every old code is invalid and each new code works once.

### Emergency reset

```powershell
cd server
npm run admin:mfa-reset -- -- --email=administrator@example.com
```

Confirm the command:

- deletes TOTP, recovery, passkey credentials, and open challenges;
- revokes privileged sessions;
- keeps the administrator role;
- records MFA-reset and passkey-reset audit events as applicable;
- forces restricted enrollment on next login when MFA is required.

## 8. Security review checklist

- Exact trusted admin Origin preserved.
- Admin CSRF preserved for state-changing setup/revoke routes.
- User verification required in registration and authentication ceremonies.
- Challenges are server-generated, short-lived, single-use, attempt-limited, and TTL-cleaned.
- Challenge records bind to administrator/user/session/purpose and existing login challenge where applicable.
- Credential ownership is checked server-side.
- Signature counters use compare-and-update semantics.
- Soft-revoked credentials are excluded from authentication.
- Public key and raw credential ID are not copied into audit details.
- User-specific responses use `Cache-Control: no-store`.
- Public and administrator sessions remain isolated.
- `apiStrict: true` remains unchanged.

## 9. Secret-handling action

The uploaded source ZIP contained `server/.env` and `client/.env.local`. They are excluded from every generated deliverable. If the server file contained real production-capable keys, tokens, peppers, or database credentials, rotate them because the archive was shared outside the local machine.

## 10. Admin UI work after passkeys

Do not mix the full administrator redesign into this security milestone. After all passkey tests pass:

1. define a reusable admin visual system (spacing, typography, cards, forms, tables, badges, dialogs, toasts, empty/loading/error states);
2. rebuild the admin shell/navigation/responsive behavior;
3. refactor Overview, Support, and Security to that system;
4. only then build User administration on the stable design language.

This prevents new modules from copying today’s inconsistent dashboard patterns.

## 11. Git commit after all tests pass

```powershell
git add README.md client server
git commit -m "Add administrator passkeys"
git push
```
