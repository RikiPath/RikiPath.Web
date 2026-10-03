/**
 * Parses base64url encoded JWT payload.
 * Returns decoded JSON payload object or null if invalid.
 */
export function parseJwt(token) {
  if (!token || typeof token !== 'string') return null;
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch (e) {
    console.error('Failed to parse JWT:', e);
    return null;
  }
}

/**
 * Standardizes role names across different conventions (.NET Identity, CamelCase, lowercase).
 */
export function normalizeRole(role) {
  if (!role || typeof role !== 'string') return 'Learner';
  const clean = role.trim();
  const lower = clean.toLowerCase().replace(/[_\s-]/g, '');

  if (lower === 'admin' || lower === 'administrator' || lower === 'sysadmin' || lower === 'systemadmin') {
    return 'Admin';
  }
  if (
    lower === 'contentauthor' ||
    lower === 'author' ||
    lower === 'contentcreator' ||
    lower === 'contentlead' ||
    lower === 'editor' ||
    lower === 'teacher' ||
    lower === 'instructor'
  ) {
    return 'ContentAuthor';
  }
  if (lower === 'consultant' || lower === 'sensei' || lower === 'advisor' || lower === 'counselor' || lower === 'mentor') {
    return 'Mentor';
  }
  if (lower === 'learner' || lower === 'student' || lower === 'user' || lower === 'member') {
    return 'Learner';
  }
  return clean;
}

/**
 * Extracts user claims from JWT payload conforming to standard .NET / OAuth claims.
 */
export function extractUserFromToken(token) {
  const payload = parseJwt(token);
  if (!payload) return null;

  // Extract roles (supports ASP.NET Core URI claim, standard claim, string or array)
  const rawRole =
    payload['http://schemas.microsoft.com/ws/2008/06/identity/claims/role'] ||
    payload.role ||
    payload.roles ||
    payload.Role ||
    payload.Roles;

  let rawRolesList = [];
  if (Array.isArray(rawRole)) {
    rawRolesList = rawRole;
  } else if (typeof rawRole === 'string' && rawRole.trim()) {
    rawRolesList = [rawRole.trim()];
  }

  const normalizedRoles = rawRolesList.map(normalizeRole);
  const primaryRole = normalizedRoles[0] || 'Learner';

  const userId =
    payload['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier'] ||
    payload.nameid ||
    payload.sub ||
    payload.userId ||
    payload.UserId ||
    payload.id ||
    payload.Id ||
    null;

  const email =
    payload['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress'] ||
    payload.email ||
    payload.Email ||
    '';

  const name =
    payload['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name'] ||
    payload['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/givenname'] ||
    payload.name ||
    payload.given_name ||
    payload.unique_name ||
    payload.fullName ||
    (email ? email.split('@')[0] : 'User');

  const isExpired = payload.exp ? payload.exp * 1000 < Date.now() : false;

  return {
    rawPayload: payload,
    userId,
    email,
    name,
    fullName: name,
    roles: normalizedRoles.length > 0 ? normalizedRoles : [primaryRole],
    rawRoles: rawRolesList,
    primaryRole,
    exp: payload.exp,
    isExpired,
  };
}

