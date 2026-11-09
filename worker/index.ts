import handler from 'vinext/server/fetch-handler';
export default {
 async fetch(request:Request, env:Cloudflare.Env, ctx:ExecutionContext){
  const response=await handler.fetch(request,env,ctx);
  const secured=new Response(response.body,response);
  secured.headers.set('X-Content-Type-Options','nosniff');
  secured.headers.set('Referrer-Policy','same-origin');
  secured.headers.set('Permissions-Policy','camera=(), microphone=(), geolocation=()');
  secured.headers.set('Content-Security-Policy',"object-src 'none'; base-uri 'self'; form-action 'self'");
  return secured;
 }
};
