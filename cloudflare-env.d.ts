declare namespace Cloudflare {
  interface Env {
    DB?: D1Database;
    ENROLLMENT_BEARER_TOKEN?: string;
    BUCKET?: R2Bucket;
  }
}
