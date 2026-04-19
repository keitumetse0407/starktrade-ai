---
name: security
description: "Security hardening for fintech trading platform."
---
## Security Rules
1. NEVER hardcode API keys (Alpaca, Paystack, Alpha Vantage, Discord, Telegram)
2. Parameterize ALL SQL — no string concatenation
3. Validate ALL user inputs with Pydantic
4. HTTPS everywhere in production
5. Rate limit all public endpoints (especially auth and trading)
6. bcrypt/argon2 for passwords (NEVER MD5/SHA)
7. HttpOnly + Secure + SameSite cookies
8. CORS whitelist specific origins only
9. CSP headers on frontend
10. Log: failed logins, permission denials, trade rejections, unusual order sizes
11. Encrypt sensitive data at rest (API keys in DB should be encrypted)
12. JWT tokens: short expiry (15min access, 7d refresh), rotate signing keys