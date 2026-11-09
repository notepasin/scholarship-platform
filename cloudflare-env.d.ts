declare namespace Cloudflare {
 interface Env {
  DB:D1Database;
  ASSETS:Fetcher;
  AUTH_PEPPER?:string;
  REGISTRATION_ENABLED?:string;
  ENROLLMENT_BEARER_TOKEN?:string;
  PARTNER_API_KEY?:string;
 }
}
