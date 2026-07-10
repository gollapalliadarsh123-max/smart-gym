import { ATTENDANCE_CODE_LENGTH } from '../../constants/app';

export function generate4DigitCode(random: () => number = Math.random): string {
  const value = Math.floor(1000 + random() * 9000);
  return String(value).padStart(ATTENDANCE_CODE_LENGTH, '0');
}

export function isValidAttendanceCode(code: string): boolean {
  return new RegExp(`^\\d{${ATTENDANCE_CODE_LENGTH}}$`).test(code.trim());
}
