// Single-user sign-in. Set APP_PASSWORD to turn it on (always in the cloud);
// leave it unset locally and the app stays open.
//
// A signed cookie holds only an expiry time plus an HMAC of it, so there is
// no session table. Changing APP_PASSWORD signs every device out.
import crypto from 'node:crypto';
import { Router } from 'express';

const PASSWORD = process.env.APP_PASSWORD || '';
const SECRET = crypto.createHash('sha256').update(`bread-log-session:${process.env.SESSION_SECRET || PASSWORD}`).digest();
const COOKIE = 'bread_session';
const MAX_AGE_S = 180 * 24 * 60 * 60;

export const authEnabled = PASSWORD.length > 0;

const sign = (value) => crypto.createHmac('sha256', SECRET).update(value).digest('base64url');

function safeEqual(a, b) {
  const ha = crypto.createHash('sha256').update(a).digest();
  const hb = crypto.createHash('sha256').update(b).digest();
  return crypto.timingSafeEqual(ha, hb);
}

function readCookie(req) {
  const header = req.headers.cookie || '';
  for (const part of header.split(';')) {
    const [name, ...rest] = part.trim().split('=');
    if (name === COOKIE) return decodeURIComponent(rest.join('='));
  }
  return null;
}

function isSignedIn(req) {
  if (!authEnabled) return true;
  const token = readCookie(req);
  if (!token) return false;
  const [expires, signature] = token.split('.');
  if (!expires || !signature || Number(expires) < Date.now()) return false;
  return safeEqual(signature, sign(expires));
}

function setCookie(res, req, value, maxAge) {
  const secure = req.secure ? '; Secure' : '';
  res.setHeader('Set-Cookie', `${COOKIE}=${encodeURIComponent(value)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${secure}`);
}

export const authRouter = Router();

authRouter.get('/session', (req, res) => {
  const locked = !authEnabled && Boolean(process.env.VERCEL);
  res.json({ signedIn: !locked && isSignedIn(req), passwordRequired: authEnabled || locked });
});

authRouter.post('/login', async (req, res) => {
  if (!authEnabled && process.env.VERCEL) return res.status(503).json({ error: 'No password is set for this app yet. Add APP_PASSWORD in Vercel and redeploy.' });
  if (!authEnabled) return res.json({ signedIn: true });
  const password = typeof req.body?.password === 'string' ? req.body.password : '';
  if (!safeEqual(password, PASSWORD)) {
    // A short pause makes guessing slow without bothering a real person.
    await new Promise((r) => setTimeout(r, 800));
    return res.status(401).json({ error: 'That password isn’t right' });
  }
  const expires = String(Date.now() + MAX_AGE_S * 1000);
  setCookie(res, req, `${expires}.${sign(expires)}`, MAX_AGE_S);
  res.json({ signedIn: true });
});

authRouter.post('/logout', (req, res) => {
  setCookie(res, req, '', 0);
  res.json({ signedIn: false });
});

export function requireAuth(req, res, next) {
  // Never run open on the internet: in the cloud a password is mandatory.
  if (!authEnabled && process.env.VERCEL) {
    return res.status(503).json({ error: 'This app has no password set. Add APP_PASSWORD in the Vercel project settings and redeploy.' });
  }
  if (isSignedIn(req)) return next();
  res.status(401).json({ error: 'Sign in to continue' });
}
