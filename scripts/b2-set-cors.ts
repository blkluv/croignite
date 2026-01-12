import {
  GetBucketCorsCommand,
  PutBucketCorsCommand,
  S3Client,
  type CORSRule,
} from "@aws-sdk/client-s3";

function normalize(value: string) {
  return value.trim().toLowerCase();
}

function parseOrigins(argv: string[]) {
  const origins: string[] = [];

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--origin") {
      origins.push(argv[i + 1] ?? "");
      i += 1;
      continue;
    }
    if (arg === "--origins") {
      const value = argv[i + 1] ?? "";
      i += 1;
      origins.push(...value.split(","));
      continue;
    }
    if (arg === "--help" || arg === "-h") {
      console.log(
        [
          "Usage: tsx scripts/b2-set-cors.ts [--origin <url>] [--origins <url1,url2,...>]",
          "",
          "Defaults to: http://localhost:3000",
        ].join("\n"),
      );
      process.exit(0);
    }
  }

  const cleaned = origins.map((o) => o.trim()).filter(Boolean);
  return cleaned.length ? cleaned : ["http://localhost:3000"];
}

function ruleAllowsOriginForUpload(rule: CORSRule, origin: string) {
  const allowedOrigins = rule.AllowedOrigins?.map(normalize) ?? [];
  const allowedMethods =
    rule.AllowedMethods?.map((method: string) => method.toUpperCase()) ?? [];
  const allowedHeaders = rule.AllowedHeaders?.map(normalize) ?? [];

  const originAllowed =
    allowedOrigins.includes("*") || allowedOrigins.includes(normalize(origin));
  if (!originAllowed) return false;

  if (!allowedMethods.includes("PUT")) return false;

  const headerAllowed =
    allowedHeaders.includes("*") || allowedHeaders.includes("content-type");
  return headerAllowed;
}

async function readCorsRules(client: S3Client, bucket: string) {
  try {
    const res = await client.send(new GetBucketCorsCommand({ Bucket: bucket }));
    return res.CORSRules ?? [];
  } catch (error: unknown) {
    const status =
      error && typeof error === "object" && "$metadata" in error
        ? (error as { $metadata?: { httpStatusCode?: number } }).$metadata
            ?.httpStatusCode
        : undefined;
    const errorName =
      error && typeof error === "object" && "name" in error
        ? (error as { name?: string }).name
        : undefined;
    if (status === 404 || errorName === "NoSuchCORSConfiguration") {
      return [];
    }
    throw error;
  }
}

async function main() {
  const origins = parseOrigins(process.argv.slice(2));

  const {
    B2_S3_ENDPOINT,
    B2_S3_REGION,
    B2_ACCESS_KEY_ID,
    B2_SECRET_ACCESS_KEY,
    B2_BUCKET,
  } = process.env;

  if (!B2_S3_ENDPOINT) throw new Error("Missing env var: B2_S3_ENDPOINT");
  if (!B2_S3_REGION) throw new Error("Missing env var: B2_S3_REGION");
  if (!B2_ACCESS_KEY_ID) throw new Error("Missing env var: B2_ACCESS_KEY_ID");
  if (!B2_SECRET_ACCESS_KEY)
    throw new Error("Missing env var: B2_SECRET_ACCESS_KEY");
  if (!B2_BUCKET) throw new Error("Missing env var: B2_BUCKET");

  for (const origin of origins) {
    const parsed = new URL(origin);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      throw new Error(`Invalid origin: ${origin} (must be http/https)`);
    }
  }

  const client = new S3Client({
    endpoint: B2_S3_ENDPOINT,
    region: B2_S3_REGION,
    credentials: {
      accessKeyId: B2_ACCESS_KEY_ID,
      secretAccessKey: B2_SECRET_ACCESS_KEY,
    },
    forcePathStyle: true,
  });

  const existing = await readCorsRules(client, B2_BUCKET);
  const missingOrigins = origins.filter(
    (origin) =>
      !existing.some((rule: CORSRule) =>
        ruleAllowsOriginForUpload(rule, origin),
      ),
  );

  if (missingOrigins.length === 0) {
    console.log(
      `Bucket CORS already allows browser PUT from: ${origins.join(", ")}`,
    );
    return;
  }

  const nextRule: CORSRule = {
    AllowedOrigins: missingOrigins,
    AllowedMethods: ["PUT", "GET", "HEAD"],
    AllowedHeaders: ["*"],
    ExposeHeaders: ["ETag"],
    MaxAgeSeconds: 3600,
  };

  await client.send(
    new PutBucketCorsCommand({
      Bucket: B2_BUCKET,
      CORSConfiguration: { CORSRules: [...existing, nextRule] },
    }),
  );

  console.log(`Updated bucket CORS. Added origins: ${missingOrigins.join(", ")}`);
}

main().catch((error) => {
  console.error("Failed to set bucket CORS");
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
