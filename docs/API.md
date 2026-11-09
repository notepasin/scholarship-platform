# API contract — Cloudflare standalone

| Method | Path | Access |
|---|---|---|
| GET | /api/health | Public service status |
| GET | /api/scholarships | Public fictional catalog |
| GET | /api/partner/scholarships | Server-to-server bearer key; read-only catalog + request_id |
| POST | /api/auth/register | Create self-service classroom account; enabled by REGISTRATION_ENABLED |
| POST | /api/auth/login | Username/password; sets HttpOnly session cookie |
| POST | /api/auth/logout | Deletes current server session and expires cookie |
| GET | /api/auth/me | Returns session user or null |
| GET | /api/state | Authenticated user's own business records |
| POST | /api/profile | Own profile only |
| POST / DELETE | /api/saved | Own saved scholarship |
| PATCH | /api/checklist | Own document checklist; locked after application submission |
| POST | /api/applications | Own application; unique user+scholarship |
| POST | /api/integration/enrollment | Authenticated call to Team 03 test student |
| DELETE | /api/account | Delete owned business data; login account remains |

Browser writes require exact same Origin and JSON body <=8 KiB. Identity comes from a random server-stored session, never from caller-supplied user/role headers. Public catalog contains only fictional opportunities. The partner catalog does not expose profiles, checklists, passwords or applications.

## Partner example

```js
// Run on partner's Backend; environment variables are set privately on that server.
const response = await fetch(`${process.env.SCHOLARSHIP_ORIGIN}/api/partner/scholarships`, {
  headers: { Authorization: `Bearer ${process.env.SCHOLARSHIP_API_KEY}` }
});
const result = await response.json();
if (!response.ok) throw new Error(`Scholarship API returned ${response.status}`);
console.log({ request_id: result.request_id, count: result.data.length });
```

Store a sanitized response/status/time on the partner side. Compare request_id to Group 15's `provider_access_logs`. This key authenticates an authorized shared integration, not a named organization identity; initially share it with only the agreed partner group. Rate limit: 120 authenticated provider calls per minute, shared for this endpoint. Missing key config:503; invalid key:401; non-GET:405.

No browser CORS is configured for private partner keys; use a server-to-server call.

## Outbound integration

`lib/partner.mjs` fixes the Team 03 URL, allows no arbitrary URL, disables redirects, bounds returned course fields and uses a 7-second timeout. `ENROLLMENT_BEARER_TOKEN` is added server side. A recorded 401 without a valid token is not proof of completed integration. Test student_id=1 is not mapped to the logged-in student's real identity and never decides actual scholarship awards.
