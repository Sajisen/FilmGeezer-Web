# FilmGeezer Operations & Recovery

This document explains the practical recovery plan for FilmGeezer Web.
It is intentionally small and suitable for the current project scale.

FilmGeezer is a production-minded portfolio application, not a banking or high-availability system. The goal is to protect important user data and make common failures recoverable without adding unnecessary infrastructure.

## 1. What matters most

### Important persistent data

The FilmGeezer MongoDB database contains data that should be recoverable:

- user accounts and account settings;
- authentication identities and password hashes;
- active sessions and security state;
- Watchlists;
- entertainment preferences;
- notifications;
- support conversations;
- audit/security history;
- FilmGeezer-managed application data stored in MongoDB.

Passwords are stored as hashes, but a database backup still contains private application/user information such as email addresses, profile/account metadata, Watchlists, preferences, support text, and audit metadata. Backup files must therefore be treated as sensitive data.

### Re-creatable data

TMDB/AniList/provider metadata that can be fetched again is not treated like primary user data. Process-local caches are also disposable and are rebuilt after a restart or deployment.

### Profile images

Production profile images are stored in a private Railway Bucket. They are lower criticality than accounts and Watchlists. If the bucket were lost, FilmGeezer can fall back to the normal initials/default profile presentation and users can upload profile pictures again.

A separate bucket-backup system is intentionally not maintained at the current scale.

---

## 2. MongoDB protection currently used

FilmGeezer currently uses MongoDB Atlas Free tier.

Current safeguards:

- Atlas Termination Protection is enabled to reduce accidental cluster deletion;
- a local full database backup can be created with MongoDB Database Tools;
- finite operational/history data has retention rules so the free database is not filled indefinitely.

Free-tier Atlas does not provide the same managed backup features as paid backup-enabled tiers, so FilmGeezer currently uses a lightweight local backup workflow instead of paying for infrastructure that the project does not yet need.

---

## 3. Creating a database backup

### Requirements

Install MongoDB Database Tools so both commands are available:

```powershell
mongodump --version
mongorestore --version
```

The backup script reads the MongoDB URI from the existing local `server/.env` file. The connection string is not stored inside the script or committed to Git.

### Run a backup

From the repository root:

```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
.\server\scripts\backupMongo.ps1
```

The execution-policy change above applies only to the current PowerShell process.

The default destination is outside the Git repository:

```text
C:\Users\<Windows user>\FilmGeezer Backups\MongoDB\
```

Each run creates a new timestamped compressed archive, for example:

```text
filmgeezer-full-2026-08-18_163407.archive.gz
filmgeezer-full-2026-08-25_170000.archive.gz
filmgeezer-full-2026-09-01_170000.archive.gz
```

Existing backups are not overwritten by the script.

### Automatic verification

After `mongodump` creates the archive, the script runs `mongorestore --dryRun` against the archive.

This verifies that MongoDB Database Tools can read the restore source without importing data into FilmGeezer.

A successful run ends with a message similar to:

```text
Backup completed and verified successfully.
Verification: mongorestore dry-run passed; no data was imported.
```

A backup should not be considered verified if the dry-run step fails.

---

## 4. Backup schedule

Current practical policy:

- create one full backup approximately once per week while FilmGeezer usage remains small;
- create an extra backup before a major database, authentication, or migration change;
- keep several older backups so one corrupted recent snapshot is not the only recovery option.

Suggested retention while files remain small:

- keep the most recent 8 weekly backups;
- optionally keep one monthly backup for about 6 months;
- remove older copies manually when they are no longer useful.

The backup script deliberately does not auto-delete old backup files. Destructive cleanup of backups should remain an explicit action.

---

## 5. Backup security

A backup archive is compressed, not encrypted by MongoDB's `--gzip` option.

Do not:

- commit backup archives to Git or GitHub;
- place them inside the public repository;
- send them through public/shared file links;
- include them in project ZIPs shared for review;
- expose the MongoDB URI in screenshots, logs, documentation, or commits.

Prefer storing backups on a protected personal device. A second private offline/encrypted copy can be added later if FilmGeezer begins to hold meaningful real-user data.

---

## 6. Restoring after a database incident

A real production restore is intentionally not automated with a one-click script because restoring the wrong snapshot can destroy newer data.

Use this order:

1. Confirm that a real database incident occurred.
2. Avoid unnecessary writes while the incident is being assessed.
3. Identify the most recent known-good verified backup.
4. Confirm what data may have been created or changed after that backup.
5. Review the restore command and target database carefully.
6. Restore only after the target and snapshot are confirmed.
7. Start FilmGeezer and verify account, Watchlist, support, and administration data.
8. Review sessions/security state and revoke sessions if the incident requires it.
9. Verify production health before considering recovery complete.

Do not run a production `mongorestore --drop` casually. The exact restore command should be prepared for the specific incident instead of being copied blindly from documentation.

### Recovery-point limitation

A backup only contains data that existed when the backup was created.

Example:

```text
Monday     full backup
Tuesday    new user registers
Wednesday  user updates Watchlist
Thursday   database is lost
```

Restoring Monday's backup cannot restore the Tuesday/Wednesday changes. This is an accepted limitation of the current weekly local-backup strategy.

If FilmGeezer grows enough that this recovery window becomes unacceptable, moving to an Atlas tier with managed backups becomes justified.

---

## 7. Database retention

Permanent account/product data is not removed simply to save space.

Current retention approach:

| Data | Retention |
| --- | --- |
| Users/accounts | Kept while the account exists |
| Password/local/Google identities | Kept while needed by the account |
| Watchlists/preferences | Kept while needed by the account |
| Authentication audit history | 180 days |
| Admin audit history | 365 days |
| Notifications | 180 days |
| Email-delivery operational history | 90 days |
| Settled support-email state | 30 days |
| Resolved support conversations | 90 days after resolution |
| Spam support conversations | 30 days |
| Open/in-review support conversations | Not age-deleted |

Support conversations and their thread messages use the same deletion schedule. If a resolved conversation is reopened before expiry, its scheduled deletion is removed.

Retention values are application policy for the current FilmGeezer scale, not regulatory guarantees. They can be adjusted when actual usage provides a reason.

---

## 8. Bad Railway deployment

FilmGeezer deployment recovery should remain simple:

```text
bad production deployment
        ↓
identify the last known-good Railway deployment
        ↓
rollback/redeploy the known-good version
        ↓
verify health and important application flows
```

The API already handles `SIGTERM` and attempts graceful shutdown. The Railway API service is configured with:

```text
RAILWAY_DEPLOYMENT_DRAINING_SECONDS=15
```

This gives the application time to stop accepting work and finish shutdown instead of being terminated immediately during deployment replacement.

---

## 9. External-service failures

### TMDB / media-data provider unavailable

FilmGeezer uses caching and stale successful discovery results where appropriate. A temporary provider failure should be treated as a degraded-data incident, not as lost user data.

### Resend unavailable

User/account actions should not be "recovered" by editing MongoDB manually unless an incident specifically requires it. First restore the email provider/configuration and retry the normal application workflow where possible.

### Railway Bucket unavailable

Profile-picture display may degrade, but the MongoDB account remains the source of account state. The bucket is intentionally considered lower criticality than the database.

---

## 10. Administrator recovery

FilmGeezer's separate administrator authentication supports MFA/passkeys and recovery codes.

Administrator recovery codes should be kept in a secure location outside the repository. They must never be committed or placed in this document.

If every administrator authentication/recovery factor is lost, do not improvise direct database edits. Treat that as a security incident and prepare a controlled recovery procedure after verifying account ownership and the current admin-auth implementation.

---

## 11. Secret compromise / rotation

Real secrets belong in local environment files and Railway variables, never in Git.

Examples include:

- MongoDB credentials;
- TMDB token;
- authentication/session peppers;
- Resend API/webhook secrets;
- admin MFA encryption/recovery secrets;
- Railway Bucket credentials.

The Google OAuth Web Client ID used by the browser is an identifier rather than a password-like secret, but the remaining server credentials must still be protected.

If a secret is suspected to have leaked:

1. identify what the secret can access;
2. rotate/revoke it at the provider where possible;
3. update Railway and local environment values;
4. redeploy/restart services that depend on it;
5. invalidate sessions or credentials when the changed secret affects authentication;
6. verify production behavior and review logs/audits for suspicious activity.

A detailed secret-by-secret rotation checklist belongs in the final security review, because rotation effects differ between credentials.

---

## 12. Recovery priorities

Use this priority order during an incident:

```text
1. Protect account/security state
2. Protect MongoDB user and Watchlist/preferences data
3. Restore normal application/API availability
4. Restore support/notification operations
5. Restore profile images and other lower-criticality presentation data
```

The recovery design should remain proportional to FilmGeezer. Multi-region failover, Kubernetes, Redis-based recovery coordination, or a custom backup service are intentionally deferred until measured scale or business requirements justify them.

---

## 13. When this plan should be upgraded

Revisit the recovery architecture when one or more of these becomes true:

- FilmGeezer has meaningful active-user data that cannot tolerate roughly a week of possible data loss;
- MongoDB storage approaches the Free-tier limit;
- multiple API replicas require shared infrastructure;
- profile images become important enough to require independent backup/versioning;
- the application begins generating revenue or has contractual availability/data-recovery expectations;
- restore testing shows the current manual workflow is too slow or risky.

Until then, the current approach is deliberately simple: termination protection, verified local MongoDB snapshots, sensible data retention, Railway rollback, and documented recovery steps.
