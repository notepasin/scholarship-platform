import { env } from 'cloudflare:workers';
import { getChatGPTUser } from '../../chatgpt-auth';
import { handleApi } from '../../../lib/service.mjs';
export const dynamic = 'force-dynamic';
async function handle(request: Request) { return handleApi(request, { db: env.DB, user: await getChatGPTUser(), partnerToken: env.ENROLLMENT_BEARER_TOKEN }); }
export { handle as GET, handle as POST, handle as PATCH, handle as DELETE };
