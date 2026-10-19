/**
 * Lightweight in-memory rate limiter middleware
 * Provides protection against brute force and denial of service without external dependencies.
 */

const ipRequestMap = new Map();

// Periodic cleanup of stale records every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, record] of ipRequestMap.entries()) {
    if (now > record.resetTime) {
      ipRequestMap.delete(key);
    }
  }
}, 5 * 60 * 1000);

export const createRateLimiter = ({
  windowMs = 15 * 60 * 1000, // 15 minutes
  max = 100, // max requests per window
  message = "Too many requests from this IP, please try again later."
} = {}) => {
  return (req, res, next) => {
    const ip = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
    const key = `${req.baseUrl || ''}:${req.path}:${ip}`;
    const now = Date.now();

    let record = ipRequestMap.get(key);

    if (!record || now > record.resetTime) {
      record = {
        count: 1,
        resetTime: now + windowMs
      };
      ipRequestMap.set(key, record);
      return next();
    }

    record.count += 1;

    if (record.count > max) {
      const retryAfter = Math.ceil((record.resetTime - now) / 1000);
      res.setHeader('Retry-After', retryAfter);
      return res.status(429).json({
        success: false,
        message,
        retryAfter
      });
    }

    next();
  };
};

// Standard rate limiters
export const authRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 mins
  max: 30, // 30 attempts per 15 mins
  message: "Too many authentication attempts. Please try again after 15 minutes."
});

export const apiRateLimiter = createRateLimiter({
  windowMs: 60 * 1000, // 1 min
  max: 120, // 120 requests per min
  message: "Request rate limit exceeded. Please slow down."
});
