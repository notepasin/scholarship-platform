# Implemented controls and limits

- Authentication: project-owned username/password accounts. Usernames are self-asserted, not identity-verified student records.
- Password storage: PBKDF2-SHA256, random 32-byte salt, 100,000 iterations and HMAC server pepper from AUTH_PEPPER. Constant-time hash comparison. The per-call work factor is constrained by Workers; this is a classroom authentication implementation, not a production identity service.
- Session: 32-byte random token; only SHA-256 digest stored in D1; 12-hour expiry; HttpOnly cookie, SameSite=Lax, Secure and __Host prefix on HTTPS. Insecure HTTP is accepted only for loopback or Vite development, and not enabled by a request header.
- No trust in caller-supplied identity headers. Every protected operation derives user ID from the validated database session.
- SQL uses bound parameters. All business record queries include owner ID.
- Writes require matching Origin; bounded JSON body, field/type/GPA checks and rate limiting.
- Login/registration are rate limited by hashed Cloudflare connection IP and username. Unknown usernames execute the hash step too. Raw IP is not written to the limit table.
- Partner service API is read only, validates a separate bearer key, and returns/logs a correlation request ID without student records or secrets. Logs are pruned to seven days on later successful calls.
- Outbound endpoint is fixed; no arbitrary URL, no redirects; credentials stay on server.
- HTTPS browser headers: nosniff, same-origin referrer, camera/mic/geolocation denied, CSP object/base/form restrictions. CSP is partial, not a complete script policy.
- Data export and confirmed business-data deletion are present. Deletion removes owned profile/bookmarks/checklists/applications/integration logs but retains the login account and hashed password. Provider infrastructure backups/logs follow provider policies.

Missing production capabilities: MFA, email verification, password reset/recovery, breach monitoring, full security audit, detailed retention controls for every account class, formal PDPA assessment. Use synthetic data for evaluation. Before real student data, define the controller/contact, appropriate processing basis, retention/backups, rights handling and incident procedures.

Never commit .dev.vars, passwords or tokens. AUTH_PEPPER rotation invalidates existing password verification unless accounts are migrated/reset. Production secrets are configured in the team's own Cloudflare account, not in GitHub source.

Runtime reference: https://developers.cloudflare.com/workers/runtime-apis/web-crypto/
Per-call PBKDF2 discussion: https://github.com/cloudflare/workerd/issues/1346
