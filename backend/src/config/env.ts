import { z } from "zod";

const DEFAULT_CONTRACT_ID =
  "CDXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX";
const MIN_POLLING_INTERVAL_MS = 1000;

function parseBoolean(value: unknown): boolean {
  if (typeof value === "boolean") return value;
  if (typeof value !== "string") return false;
  const normalized = value.trim().toLowerCase();
  return normalized === "true" || normalized === "1" || normalized === "yes";
}

function parseNumber(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value !== "string") return undefined;
  const parsed = Number(value.trim());
  return Number.isFinite(parsed) ? parsed : undefined;
}

function commaSeparatedToArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .flatMap((item) => String(item).split(","))
      .map((item) => item.trim())
      .filter(Boolean);
  }
  if (typeof value !== "string") return [];
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export const BackendEnvSchema = z
  .object({
    PORT: z
      .preprocess(
        (value) => parseNumber(value),
        z.number().int().min(1).max(65535),
      )
      .default(8787)
      .describe("Port on which the backend listens"),
    HOST: z
      .string()
      .nonempty()
      .default("0.0.0.0")
      .describe("Host on which the backend binds"),
    NODE_ENV: z
      .enum(["development", "test", "production"])
      .default("development")
      .describe("Node.js environment"),
    STELLAR_NETWORK: z
      .enum(["testnet", "mainnet", "futurenet", "standalone"])
      .default("testnet")
      .describe("Stellar network to target"),
    SOROBAN_RPC_URL: z
      .string()
      .url()
      .default("https://soroban-testnet.stellar.org")
      .describe("Soroban RPC endpoint"),
    HORIZON_URL: z
      .string()
      .url()
      .default("https://horizon-testnet.stellar.org")
      .describe("Horizon API endpoint"),
    CONTRACT_ID: z
      .string()
      .nonempty()
      .default(DEFAULT_CONTRACT_ID)
      .describe("Primary deployed contract ID"),
    CONTRACT_IDS: z
      .preprocess(
        (value) => commaSeparatedToArray(value),
        z.array(z.string()).default([]),
      )
      .describe("Comma-separated list of additional deployed contract IDs"),
    INDEXING_PARALLELISM: z
      .preprocess(
        (value) => parseNumber(value),
        z.number().int().min(1).default(4),
      )
      .describe("Parallel threads used for indexing"),
    VITE_WS_URL: z
      .string()
      .url()
      .default("ws://localhost:8080")
      .describe("WebSocket URL for real-time updates"),
    EVENT_POLLING_INTERVAL_MS: z
      .preprocess(
        (value) => parseNumber(value),
        z.number().int().min(MIN_POLLING_INTERVAL_MS).default(10000),
      )
      .describe("Event polling interval in milliseconds"),
    EVENT_POLLING_ENABLED: z
      .preprocess((value) => parseBoolean(value), z.boolean().default(true))
      .describe("Enable event polling"),
    DUE_PAYMENTS_JOB_ENABLED: z
      .preprocess((value) => parseBoolean(value), z.boolean().default(true))
      .describe("Enable due payments job"),
    DUE_PAYMENTS_JOB_INTERVAL_MS: z
      .preprocess(
        (value) => parseNumber(value),
        z.number().int().min(1).default(60000),
      )
      .describe("Due payments job interval in milliseconds"),
    CURSOR_CLEANUP_JOB_ENABLED: z
      .preprocess((value) => parseBoolean(value), z.boolean().default(true))
      .describe("Enable cursor cleanup job"),
    CURSOR_CLEANUP_JOB_INTERVAL_MS: z
      .preprocess(
        (value) => parseNumber(value),
        z.number().int().min(1).default(86400000),
      )
      .describe("Cursor cleanup interval in milliseconds"),
    CURSOR_RETENTION_DAYS: z
      .preprocess(
        (value) => parseNumber(value),
        z.number().int().min(0).default(30),
      )
      .describe("Days to retain cursor data"),
    CORS_ORIGIN: z
      .preprocess(
        (value) => commaSeparatedToArray(value),
        z.array(z.string()).default(["*"]),
      )
      .describe("Allowed CORS origin values"),
    REQUEST_BODY_LIMIT: z
      .string()
      .default("64kb")
      .describe("Default JSON body limit for API endpoints"),
    NOTIFICATIONS_REQUEST_BODY_LIMIT: z
      .string()
      .default("16kb")
      .describe("JSON body limit for notification endpoints"),
    SNAPSHOTS_REQUEST_BODY_LIMIT: z
      .string()
      .default("512kb")
      .describe("JSON body limit for snapshot endpoints"),
    WEBHOOKS_REQUEST_BODY_LIMIT: z
      .string()
      .default("32kb")
      .describe("JSON body limit for webhook endpoints"),
    API_KEY: z
      .string()
      .optional()
      .describe("API key for admin and protected routes"),
    CURSOR_STORAGE_TYPE: z
      .enum(["file", "database"])
      .default("file")
      .describe("Cursor storage backend type"),
    DATABASE_PATH: z
      .string()
      .default("./vaultdao.sqlite")
      .describe("SQLite database path"),
    RATE_LIMIT_ENABLED: z
      .preprocess((value) => parseBoolean(value), z.boolean().default(true))
      .describe("Enable rate limiting"),
    RATE_LIMIT_REDIS_URL: z
      .string()
      .optional()
      .describe("Redis URL for rate limiting state"),
    RATE_LIMIT_PROPOSALS_PER_MIN: z
      .preprocess(
        (value) => parseNumber(value),
        z.number().int().min(1).default(100),
      )
      .describe("Proposal request limit per minute"),
    RATE_LIMIT_EXECUTE_PER_MIN: z
      .preprocess(
        (value) => parseNumber(value),
        z.number().int().min(1).default(10),
      )
      .describe("Execute request limit per minute"),
    RATE_LIMIT_DEFAULT_PER_MIN: z
      .preprocess(
        (value) => parseNumber(value),
        z.number().int().min(1).default(60),
      )
      .describe("Default request limit per minute"),
  })
  .superRefine((env, ctx) => {
    if (
      env.nodeEnv === "production" &&
      env.contractId === DEFAULT_CONTRACT_ID
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["CONTRACT_ID"],
        message:
          "CONTRACT_ID must be configured with a real deployed contract ID in production.",
      });
    }

    if (env.nodeEnv === "production" && !env.API_KEY) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["API_KEY"],
        message: "API_KEY is required in production.",
      });
    }

    if (env.nodeEnv === "production" && env.CORS_ORIGIN.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["CORS_ORIGIN"],
        message: "CORS_ORIGIN is required in production.",
      });
    }
  });

export type BackendEnv = z.infer<typeof BackendEnvSchema>;

function formatZodErrorMessage(error: z.ZodError) {
  const rows = error.errors.map((issue) => {
    const variable = issue.path.length > 0 ? issue.path.join(".") : "<root>";
    const received =
      issue.received === undefined
        ? "undefined"
        : JSON.stringify(issue.received);
    const expected = issue.message ?? issue.code;
    return `| ${variable} | ${expected} | ${received} |`;
  });

  return [
    "Invalid backend environment configuration:",
    "",
    "| Variable | Expected | Received |",
    "| --- | --- | --- |",
    ...rows,
    "",
    'Review "backend/.env.example" and update your local or deployed environment before starting the backend.',
  ].join("\n");
}

export function loadEnv(): BackendEnv {
  const parsed = BackendEnvSchema.safeParse(process.env);
  if (!parsed.success) {
    throw new Error(formatZodErrorMessage(parsed.error));
  }

  return parsed.data;
}
