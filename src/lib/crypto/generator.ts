export type GeneratorOptions = {
  length: number;
  lowercase: boolean;
  uppercase: boolean;
  digits: boolean;
  symbols: boolean;
};

export const MIN_LENGTH = 8;
export const MAX_LENGTH = 128;

const CHARSETS = {
  lowercase: "abcdefghijklmnopqrstuvwxyz",
  uppercase: "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
  digits: "0123456789",
  symbols: "!@#$%^&*()-_=+[]{};:,.<>?",
} as const;

/** Uniform integer in [0, max), using rejection sampling to avoid modulo bias. */
function randomInt(max: number): number {
  const limit = Math.floor(0x100000000 / max) * max;
  const buffer = new Uint32Array(1);
  do {
    crypto.getRandomValues(buffer);
  } while (buffer[0] >= limit);
  return buffer[0] % max;
}

export function generatePassword(options: GeneratorOptions): string {
  const { length } = options;
  if (!Number.isInteger(length) || length < MIN_LENGTH || length > MAX_LENGTH) {
    throw new RangeError(`Length must be between ${MIN_LENGTH} and ${MAX_LENGTH}`);
  }

  const sets = (Object.keys(CHARSETS) as (keyof typeof CHARSETS)[])
    .filter((name) => options[name])
    .map((name) => CHARSETS[name]);
  if (sets.length === 0) throw new Error("Select at least one character type");

  const alphabet = sets.join("");
  // Retrying keeps the result uniform among passwords that use every chosen set.
  for (;;) {
    const password = Array.from({ length }, () => alphabet[randomInt(alphabet.length)]).join("");
    if (sets.every((set) => [...password].some((char) => set.includes(char)))) return password;
  }
}
