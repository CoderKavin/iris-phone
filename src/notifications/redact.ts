const OTP_KEYWORDS =
  /\b(otp|one[-\s]?time|verification|auth|login|security)[^\w]{0,20}(?:code|pin)?[^\w]{0,20}(\d{4,8})\b|\b(\d{4,8})\b[^\w]{0,20}(?:is your|otp|code|verification)/gi;

const OTP_LOOSE = /\b(\d{6})\b/g;

const PASSWORD_RX =
  /\b(password|passcode|pwd)\s*[:=]\s*[^\s]{4,}/gi;

const CARD_RX = /\b(?:\d[ -]*?){13,19}\b/g;

function luhn(digits: string): boolean {
  let sum = 0;
  let flip = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let n = digits.charCodeAt(i) - 48;
    if (n < 0 || n > 9) return false;
    if (flip) {
      n *= 2;
      if (n > 9) n -= 9;
    }
    sum += n;
    flip = !flip;
  }
  return sum % 10 === 0;
}

function hasOtpContext(text: string): boolean {
  return /(otp|one[-\s]?time|verification|auth|login|passcode|code|pin)/i.test(text);
}

export type RedactionResult = {
  text: string;
  redacted: boolean;
  reasons: string[];
};

export function redact(input: string | null | undefined): RedactionResult {
  if (!input) return {text: input ?? '', redacted: false, reasons: []};
  let text = input;
  const reasons: string[] = [];

  const otpBefore = text;
  text = text.replace(OTP_KEYWORDS, (match, _k1, num1, num2) => {
    const digits = num1 || num2;
    if (digits) return match.replace(digits, '[redacted:otp]');
    return match;
  });
  if (otpBefore !== text) reasons.push('otp');

  if (hasOtpContext(text)) {
    const looseBefore = text;
    text = text.replace(OTP_LOOSE, '[redacted:otp]');
    if (looseBefore !== text && !reasons.includes('otp')) reasons.push('otp');
  }

  const pwdBefore = text;
  text = text.replace(PASSWORD_RX, '[redacted:password]');
  if (pwdBefore !== text) reasons.push('password');

  const cardBefore = text;
  text = text.replace(CARD_RX, match => {
    const digits = match.replace(/\D/g, '');
    if (digits.length < 13 || digits.length > 19) return match;
    if (!luhn(digits)) return match;
    return '[redacted:card]';
  });
  if (cardBefore !== text) reasons.push('card');

  return {text, redacted: reasons.length > 0, reasons};
}
