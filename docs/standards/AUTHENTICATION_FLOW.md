# RikiPath — Authentication & verification flow

Applies to Web authentication screens and their Backend contracts. Use Vietnamese/Japanese copy via `tr()` or `t()` and preserve the existing Sakura auth layout.

1. Login is not registration verification. The normal Login screen must not offer an unsolicited registration-OTP action. A correctly authenticated, verified account signs in without another OTP. An unverified account may receive a contextual continuation only after the user deliberately attempts sign-in.
2. Registration creates at most one account and holds a short-lived verification context. The verification page never sends a code on mount or refresh. An email in a URL or client storage is navigation context, not proof of identity or permission to send mail.
3. Backend alone decides whether a registration code may be issued: account exists, is active, is unverified, and is within cooldown and quota. Unknown and verified addresses receive indistinguishable public responses, with no code or email generated. UI must describe the response neutrally, not claim delivery.
4. Registration verification, password recovery, change-email verification, and MFA (if added) have separate purposes and cannot consume one another's credentials. Codes are short-lived and single-use; reset links are not access tokens.
5. Google sign-in validates the ID token server-side and links by provider subject, not by email alone. Never trust a client-provided email, role, or verification flag. Disabled accounts and accounts with a changed/unverified email cannot receive a session from a stale link.
6. Rate limits, ownership checks, code consumption, and account-state transitions belong to Backend. Frontend countdown is a presentation of server policy, never the security boundary. Do not log OTPs, passwords, ID tokens, access tokens, or reset links.
7. Show a clear next step for missing registration context, invalid/expired code, unavailable email delivery, and network errors. Keep Login, Registration, Verification, Recovery, and Change Email as distinct UX flows. Preserve VI/JA wording and keyboard-accessible forms.

Before changing an auth flow, add focused tests for verified, unverified, unknown, expired, used, repeated, and concurrent requests, plus a Web navigation test. Do not use a real customer email for QA.

## Password Security & Session Revocation Standards

8. Align password validation policy uniformly between Frontend (`passwordStrength.js`) and Backend (`PasswordPolicyHelper.cs`): reject blank-only, single-char repeats, common breached passwords, sequential keyboard walks, and personal tokens (email/name); never trim or silently alter password characters; prefer length/passphrases without forcing arbitrary character-class rules unless required.
9. Evaluate password strength strictly offline on-device (never send passwords to third-party services or log plaintext passwords/hashes); strength meter feedback is advisory guidance and never replaces server-side policy enforcement.
10. Every auth password control must preserve visible `<label>`, clear `placeholder`, `autocomplete` (`current-password` / `new-password`) for Password Managers, non-shifting Show/Hide visibility toggle, Paste support, accessible status announcements, and `prefers-reduced-motion` support.
11. Changing or setting a password or committing a verified `PendingEmail` must revoke prior sessions server-side first (increment `TokenVersion` in transaction, validate `"tv"` claim inside `OnTokenValidated`, deactivate active device tokens) before clearing client storage and redirecting cleanly to `/auth/` with a clear confirmation notice. Never report fake success before server acknowledgment.
