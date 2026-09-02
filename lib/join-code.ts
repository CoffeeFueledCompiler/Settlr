import { prisma } from "@/lib/prisma";

// Excludes 0/O/1/I/L so a code read off a phone screen isn't ambiguous.
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function randomCode(length = 6) {
  let code = "";
  for (let i = 0; i < length; i++) {
    code += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  }
  return code;
}

export async function generateUniqueJoinCode(maxAttempts = 10) {
  for (let i = 0; i < maxAttempts; i++) {
    const code = randomCode();
    const existing = await prisma.group.findUnique({ where: { joinCode: code } });
    if (!existing) return code;
  }
  throw new Error("Could not generate a unique join code after multiple attempts");
}
