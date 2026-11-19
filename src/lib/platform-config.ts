import { prisma } from "@/lib/prisma";
import { encryptSecret, decryptSecret } from "@/lib/crypto";

export type PlatformConfigKey =
  | "NEXT_PUBLIC_APP_URL"
  | "CRON_SECRET"
  | "META_APP_ID"
  | "META_APP_SECRET"
  | "META_EMBEDDED_SIGNUP_CONFIG_ID"
  | "WHATSAPP_WEBHOOK_VERIFY_TOKEN"
  | "GOOGLE_CLIENT_ID"
  | "GOOGLE_CLIENT_SECRET"
  | "GOOGLE_REDIRECT_URI"
  | "RESEND_API_KEY"
  | "EMAIL_FROM"
  | "IYZICO_API_KEY"
  | "IYZICO_SECRET_KEY"
  | "GEMINI_API_KEY";

export const PLATFORM_CONFIG_DEFS: Record<
  PlatformConfigKey,
  { isSecret: boolean; group: "GENERAL" | "META" | "GOOGLE" | "EMAIL" | "PAYMENT" | "AI" }
> = {
  NEXT_PUBLIC_APP_URL: { isSecret: false, group: "GENERAL" },
  CRON_SECRET: { isSecret: true, group: "GENERAL" },
  META_APP_ID: { isSecret: false, group: "META" },
  META_APP_SECRET: { isSecret: true, group: "META" },
  META_EMBEDDED_SIGNUP_CONFIG_ID: { isSecret: false, group: "META" },
  WHATSAPP_WEBHOOK_VERIFY_TOKEN: { isSecret: true, group: "META" },
  GOOGLE_CLIENT_ID: { isSecret: false, group: "GOOGLE" },
  GOOGLE_CLIENT_SECRET: { isSecret: true, group: "GOOGLE" },
  GOOGLE_REDIRECT_URI: { isSecret: false, group: "GOOGLE" },
  RESEND_API_KEY: { isSecret: true, group: "EMAIL" },
  EMAIL_FROM: { isSecret: false, group: "EMAIL" },
  IYZICO_API_KEY: { isSecret: true, group: "PAYMENT" },
  IYZICO_SECRET_KEY: { isSecret: true, group: "PAYMENT" },
  GEMINI_API_KEY: { isSecret: true, group: "AI" },
};

/**
 * Reads a single platform setting from DB (decrypted if secret), falling back to process.env.
 * Allows Super Admin to manage all integrations directly from /admin without redeploying.
 */
export async function getPlatformConfig(key: PlatformConfigKey): Promise<string | undefined> {
  try {
    const row = await prisma.platformSetting.findUnique({ where: { key } });
    if (row && row.value.trim().length > 0) {
      return row.isSecret ? decryptSecret(row.value) : row.value;
    }
  } catch {
    // Fallback gracefully to env if DB is unavailable or decryption key changed
  }
  const envVal = process.env[key];
  return envVal && envVal.trim().length > 0 ? envVal.trim() : undefined;
}

/**
 * Batch-reads multiple platform settings from DB with env fallback.
 */
export async function getPlatformConfigMap(
  keys: PlatformConfigKey[]
): Promise<Record<PlatformConfigKey, string | undefined>> {
  const result = {} as Record<PlatformConfigKey, string | undefined>;
  let rows: Array<{ key: string; value: string; isSecret: boolean }> = [];

  try {
    rows = await prisma.platformSetting.findMany({
      where: { key: { in: keys } },
    });
  } catch {
    rows = [];
  }

  const rowMap = new Map(rows.map((r) => [r.key, r]));

  for (const key of keys) {
    const row = rowMap.get(key);
    if (row && row.value.trim().length > 0) {
      try {
        result[key] = row.isSecret ? decryptSecret(row.value) : row.value;
        continue;
      } catch {
        // fall through to env
      }
    }
    const envVal = process.env[key];
    result[key] = envVal && envVal.trim().length > 0 ? envVal.trim() : undefined;
  }

  return result;
}

/**
 * Saves platform settings to DB (encrypting secret keys via AES-256-GCM).
 * Empty string clears a non-secret key; secret keys are only updated when a non-empty value is supplied
 * (unless explicitly passed as "__CLEAR__").
 */
export async function savePlatformConfigs(
  updates: Partial<Record<PlatformConfigKey, string>>
): Promise<void> {
  const entries = Object.entries(updates) as Array<[PlatformConfigKey, string | undefined]>;

  for (const [key, rawVal] of entries) {
    const def = PLATFORM_CONFIG_DEFS[key];
    if (!def || rawVal === undefined) continue;

    const trimmed = rawVal.trim();
    if (trimmed === "__CLEAR__") {
      await prisma.platformSetting.deleteMany({ where: { key } });
      continue;
    }

    if (def.isSecret && trimmed.length === 0) {
      // Keep existing secret untouched if admin left password input blank
      continue;
    }

    if (!def.isSecret && trimmed.length === 0) {
      await prisma.platformSetting.deleteMany({ where: { key } });
      continue;
    }

    const storedValue = def.isSecret ? encryptSecret(trimmed) : trimmed;
    await prisma.platformSetting.upsert({
      where: { key },
      update: { value: storedValue, isSecret: def.isSecret },
      create: { key, value: storedValue, isSecret: def.isSecret },
    });
  }
}

function maskSecret(val: string | undefined): string {
  if (!val) return "";
  if (val.length <= 6) return "••••••";
  return `${val.slice(0, 3)}••••••${val.slice(-3)}`;
}

/**
 * Returns safe admin summary (never exposes raw secret values to client).
 */
export async function getPlatformConfigSummary() {
  const allKeys = Object.keys(PLATFORM_CONFIG_DEFS) as PlatformConfigKey[];
  const values = await getPlatformConfigMap(allKeys);

  const fields = {} as Record<
    PlatformConfigKey,
    { isSecret: boolean; isConfigured: boolean; value: string; masked: string }
  >;

  for (const key of allKeys) {
    const def = PLATFORM_CONFIG_DEFS[key];
    const val = values[key] ?? "";
    fields[key] = {
      isSecret: def.isSecret,
      isConfigured: val.length > 0,
      value: def.isSecret ? "" : val,
      masked: def.isSecret ? maskSecret(val) : val,
    };
  }

  return {
    fields,
    statuses: {
      metaWhatsapp: Boolean(values.META_APP_ID && values.META_APP_SECRET),
      metaEmbeddedSignup: Boolean(
        values.META_APP_ID && values.META_APP_SECRET && values.META_EMBEDDED_SIGNUP_CONFIG_ID
      ),
      googleCalendar: Boolean(values.GOOGLE_CLIENT_ID && values.GOOGLE_CLIENT_SECRET),
      emailResend: Boolean(values.RESEND_API_KEY),
      paymentIyzico: Boolean(values.IYZICO_API_KEY && values.IYZICO_SECRET_KEY),
      cronSecured: Boolean(values.CRON_SECRET),
      aiGemini: Boolean(values.GEMINI_API_KEY),
    },
  };
}
