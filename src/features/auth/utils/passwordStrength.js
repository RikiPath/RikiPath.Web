export const PASSWORD_POLICY = Object.freeze({
  minLength: 6,
  maxLength: 128,
});

const COMMON_WEAK_PASSWORDS = new Set([
  '123456',
  '1234567',
  '12345678',
  '123456789',
  '1234567890',
  '123456789a',
  '123123',
  '111111',
  '000000',
  '654321',
  '987654321',
  'password',
  'password1',
  'password123',
  'passw0rd',
  'p@ssword',
  'p@ssw0rd',
  'qwerty',
  'qwerty123',
  'qwertyuiop',
  'asdfgh',
  'asdfghjkl',
  'zxcvbn',
  'zxcvbnm',
  '1q2w3e',
  '1q2w3e4r',
  '1qaz2wsx',
  'abc123',
  'admin123',
  'administrator',
  'welcome',
  'welcome1',
  'iloveyou',
  'sunshine',
  'princess',
  'football',
  'dragon',
  'monkey',
  'letmein',
  'baseball',
  'superman',
  'matkhau',
  'matkhau123',
  'anhyeuem',
  'khongbiet',
  'khongcomatkhau',
  'rikipath',
  'rikipath123',
  'nihongo',
  'jlpt123',
]);

const PREDICTABLE_SEQUENCES = [
  '01234567890',
  '09876543210',
  'abcdefghijklmnopqrstuvwxyz',
  'zyxwvutsrqponmlkjihgfedcba',
  'qwertyuiopasdfghjklzxcvbnm',
  'mnbvcxzlkjhgfdsapoiuytrewq',
  '1qaz2wsx3edc4rfv5tgb6yhn7ujm',
];

const STRENGTH_META = [
  { score: 0, label: '', colorKey: 'neutral' },
  { score: 1, label: 'Rất yếu', colorKey: 'red' },
  { score: 2, label: 'Yếu', colorKey: 'orange' },
  { score: 3, label: 'Trung bình', colorKey: 'amber' },
  { score: 4, label: 'Mạnh', colorKey: 'teal' },
  { score: 5, label: 'Rất mạnh', colorKey: 'green' },
];

function allSameCharacters(value) {
  if (!value) return false;
  const first = value[0];
  for (let i = 1; i < value.length; i++) {
    if (value[i] !== first) return false;
  }
  return true;
}

function isCommonBaseWithDigits(lower) {
  const lettersOnly = lower.replace(/[0-9!@]+$/, '');
  return lettersOnly.length >= 5 && lower.length <= 12 && COMMON_WEAK_PASSWORDS.has(lettersOnly);
}

function isPredictableSequence(lower) {
  if (!lower || lower.length > 12) return false;
  return PREDICTABLE_SEQUENCES.some((seq) => seq.includes(lower));
}

function containsPersonalToken(lowerPassword, email, fullName) {
  if (!lowerPassword) return false;
  if (email) {
    const raw = String(email).trim().toLowerCase();
    const at = raw.indexOf('@');
    const localPart = at > 0 ? raw.slice(0, at) : raw;
    if (localPart.length >= 4 && lowerPassword.includes(localPart)) return true;
  }
  if (fullName) {
    const collapsed = String(fullName).replace(/\s+/g, '').toLowerCase();
    if (collapsed.length >= 5 && lowerPassword.includes(collapsed)) return true;
  }
  return false;
}

function hasRepeatedChunkPattern(lower) {
  if (lower.length < 6) return false;
  return /^(.{1,4})\1+$/.test(lower);
}

function countPhraseWords(value) {
  return value
    .trim()
    .split(/[\s\-_./]+/)
    .filter((token) => token.length >= 2).length;
}

/**
 * Evaluates password strength offline with realistic guessability heuristics
 * aligned with Backend `PasswordPolicyHelper` (never trims or transmits the password).
 */
export function evaluatePasswordSecurity(password = '', { email = '', fullName = '', currentPassword } = {}) {
  const value = String(password || '');
  if (!value) {
    return {
      ...STRENGTH_META[0],
      checks: {
        minLength: false,
        recommendedLength: false,
        notCommonOrPredictable: false,
        notPersonal: true,
        differentFromCurrent: currentPassword === undefined ? true : false,
      },
      policyValid: false,
      policyError: '',
    };
  }

  const lower = value.toLowerCase();
  const whitespaceOnly = value.trim().length === 0;
  const minLength = value.length >= PASSWORD_POLICY.minLength && value.length <= PASSWORD_POLICY.maxLength && !whitespaceOnly;
  const recommendedLength = value.length >= 8;
  const sameChars = allSameCharacters(value);
  const inCommon = COMMON_WEAK_PASSWORDS.has(lower) || isCommonBaseWithDigits(lower);
  const isSeq = isPredictableSequence(lower);
  const isRepeatChunk = hasRepeatedChunkPattern(lower);
  const notCommonOrPredictable = !whitespaceOnly && !sameChars && !inCommon && !isSeq && !isRepeatChunk;
  const notPersonal = !containsPersonalToken(lower, email, fullName);
  const differentFromCurrent = currentPassword === undefined ? true : value !== currentPassword;

  let policyError = '';
  if (whitespaceOnly) {
    policyError = 'Mật khẩu mới không thể chỉ gồm khoảng trắng.';
  } else if (value.length < PASSWORD_POLICY.minLength || value.length > PASSWORD_POLICY.maxLength) {
    policyError = `Mật khẩu mới phải từ ${PASSWORD_POLICY.minLength} đến ${PASSWORD_POLICY.maxLength} ký tự.`;
  } else if (sameChars) {
    policyError = 'Mật khẩu mới quá dễ đoán (các ký tự giống hệt nhau). Vui lòng chọn mật khẩu khác.';
  } else if (inCommon) {
    policyError = 'Mật khẩu mới nằm trong danh sách mật khẩu phổ biến dễ bị đoán. Vui lòng chọn mật khẩu khác.';
  } else if (isSeq) {
    policyError = 'Mật khẩu mới là chuỗi ký tự liên tiếp hoặc dãy phím dễ đoán. Vui lòng chọn mật khẩu khó đoán hơn.';
  } else if (!notPersonal) {
    policyError = 'Mật khẩu mới quá giống với email hoặc tên tài khoản của bạn. Vui lòng chọn mật khẩu khó đoán hơn.';
  } else if (!differentFromCurrent) {
    policyError = 'Mật khẩu mới phải khác mật khẩu hiện tại.';
  }

  const policyValid = minLength && notCommonOrPredictable && notPersonal && differentFromCurrent;

  // Multi-factor offline guessability score (1..5): length, diversity, passphrase words, penalties.
  let points = 0;
  if (value.length >= 6) points += 1;
  if (value.length >= 8) points += 1.5;
  if (value.length >= 12) points += 2;
  if (value.length >= 16) points += 1.5;

  const uniqueChars = new Set(value).size;
  if (uniqueChars >= 6) points += 1;
  if (uniqueChars >= 10) points += 1;

  const hasLower = /[a-z]/.test(value);
  const hasUpper = /[A-Z]/.test(value);
  const hasDigit = /\d/.test(value);
  const hasSymbol = /[^A-Za-z0-9\s]/.test(value);
  const hasUnicode = /[^\x20-\x7E]/.test(value);
  const classCount = [hasLower, hasUpper, hasDigit, hasSymbol].filter(Boolean).length;

  if (classCount >= 2) points += 0.75;
  if (classCount >= 3) points += 1;
  if (classCount >= 4) points += 0.75;
  if (hasUnicode) points += 1;

  // Long multi-word passphrases score highly even without special symbols.
  const phraseWords = countPhraseWords(value);
  if (phraseWords >= 3 && value.length >= 14) points += 2;

  // Penalties for guessable structures
  if (!notCommonOrPredictable) points = Math.min(points, 1.5);
  if (!notPersonal) points = Math.min(points, 2);
  if (!differentFromCurrent) points = Math.min(points, 1.5);
  if (/^\d+$/.test(value) && value.length < 12) points = Math.min(points, 2);

  let score = 1;
  if (!minLength || inCommon || sameChars || isSeq) {
    score = 1;
  } else if (points >= 8.0 && notCommonOrPredictable && notPersonal) {
    score = 5;
  } else if (points >= 5.2 && notCommonOrPredictable && notPersonal) {
    score = 4;
  } else if (points >= 4.0) {
    score = 3;
  } else if (points >= 2.5) {
    score = 2;
  }

  return {
    ...STRENGTH_META[score],
    checks: {
      minLength,
      recommendedLength,
      notCommonOrPredictable,
      notPersonal,
      differentFromCurrent,
    },
    policyValid,
    policyError,
  };
}
