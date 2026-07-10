import { PASSWORD_MIN_LENGTH, PASSWORD_SPECIAL_CHARS } from '../../constants/app';

const SPECIAL_CHAR_REGEX = new RegExp(
  `[${PASSWORD_SPECIAL_CHARS.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}]`,
);

export function validatePassword(password: string): boolean {
  return (
    password.length >= PASSWORD_MIN_LENGTH &&
    /[A-Z]/.test(password) &&
    /[a-z]/.test(password) &&
    /[0-9]/.test(password) &&
    SPECIAL_CHAR_REGEX.test(password)
  );
}

export function getPasswordRequirements(): string {
  return `At least ${PASSWORD_MIN_LENGTH} characters with uppercase, lowercase, number, and special character (${PASSWORD_SPECIAL_CHARS}).`;
}
