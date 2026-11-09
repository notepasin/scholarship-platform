import {env} from 'cloudflare:workers';
import {handleApi} from '../../../lib/service.mjs';
import {handleAuth,sessionUser} from '../../../lib/auth.mjs';
import {handleProvider} from '../../../lib/provider.mjs';
export const dynamic='force-dynamic';
async function handle(request:Request){
 const path=new URL(request.url).pathname;
 if(path.startsWith('/api/auth/'))return handleAuth(request,{DB:env.DB,AUTH_PEPPER:env.AUTH_PEPPER,REGISTRATION_ENABLED:env.REGISTRATION_ENABLED,development:import.meta.env.DEV});
 if(path==='/api/partner/scholarships')return handleProvider(request,env);
 return handleApi(request,{db:env.DB,user:await sessionUser(env.DB,request.headers.get('cookie')),partnerToken:env.ENROLLMENT_BEARER_TOKEN});
}
export {handle as GET,handle as POST,handle as PATCH,handle as DELETE};
