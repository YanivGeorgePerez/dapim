let requestCount = 0;
const RATE_LIMIT = 100; // 100 requests per minute

export function rateLimitMiddleware(req: Request): boolean {
  if (requestCount >= RATE_LIMIT) {
    return false;
  }
  requestCount++;
  setTimeout(() => { requestCount = 0; }, 60000); // Reset every minute
  return true;
}
