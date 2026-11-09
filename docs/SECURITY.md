# Implemented security and personal data controls

| Control | Implementation/evidence |
|---|---|
| Authentication | Hosting sign-in; `getChatGPTUser()`; anonymous private-data requests return 401 |
| Record authorization | Every state/query/mutation includes the authenticated owner ID |
| Input validation | Length, HTML/control-character guard, GPA 0–4 and integer year 1–8; server side |
| SQL injection | D1 prepared statements with bound values; SQL-looking-name automated test |
| XSS | React text rendering; no `dangerouslySetInnerHTML`; untrusted partner fields are strings |
| Request forgery | Exact same-origin Origin check on writes; JSON content type required |
| Abuse | Persistent fixed-window per-account limiter; 8 KiB bounded request stream |
| SSRF | Fixed partner URL; no arbitrary URL field; redirects disabled |
| Duplicate prevention | Database unique indexes on saved(user,scholarship), checklist(saved,requirement), application(user,scholarship) |
| Transport/browser protections | Hosted HTTPS; nosniff, same-origin referrer, blocked camera/mic/location; CSP object/base/form restrictions |
| Privacy controls | Data minimization; explicit privacy notice; self-export and confirmed deletion |
| Log minimization | Only partner status, timing, course count, user ID; no copied partner name/email or full body in DB |

## Important limits

CSP is intentionally partial and not a comprehensive script policy. No penetration test, formal PDPA certification, admin role workflow or malware scanning has been performed. Automatic tests are useful evidence of defined controls, not proof against all attacks.

Production sign-in is platform-owned. Do not publish the raw Worker on an untrusted header boundary. Portable local sign-in is only a development simulation.

Before collecting real student information: identify data controller and contact, choose/document the applicable processing basis, set retention/deletion schedules including backups, confirm vendor/transfer arrangements, and establish rights/incident procedures. A checkbox alone does not establish compliance. This classroom version requests synthetic data and stores no government IDs, income proofs or uploaded documents.

Account deletion removes application-owned rows through cascading foreign keys. It does not delete the user's hosting/ChatGPT account and does not claim immediate erasure from provider backups or provider access logs. Rate limiting retains an identifier hash for a short time; expired rate rows are removed on later writes.

Partner credentials: `ENROLLMENT_BEARER_TOKEN` is read only by the server route and forwarded to the fixed Team 03 endpoint. It must be configured as a hosting runtime secret; never use `NEXT_PUBLIC_*`, commit it, or put it in a screenshot. Tests verify that it is not returned or written into integration outcome logs.
