import { promises as fs } from "node:fs";
import path from "node:path";

const ROOT = path.resolve(__dirname, "..");
const DEFAULT_DEPLOYMENT_ID = "croignite-cronos-testnet";
const deploymentId = process.argv[2] ?? DEFAULT_DEPLOYMENT_ID;

const ignitionDir = path.join(
  ROOT,
  "blockchain",
  "hardhat",
  "ignition",
  "deployments",
  deploymentId,
);
const deployedAddressesPath = path.join(ignitionDir, "deployed_addresses.json");
const ignitionArtifactsDir = path.join(ignitionDir, "artifacts");
const compiledArtifactsDir = path.join(
  ROOT,
  "blockchain",
  "hardhat",
  "artifacts",
  "contracts",
);

const outAbiDir = path.join(ROOT, "src", "lib", "contracts", "abi");
const ENV_CANDIDATES = [".env.local", ".env"];

function upsertEnvValue(raw: string, key: string, value: string) {
  const lines = raw.split(/\r?\n/);
  let updated = false;

  const nextLines = lines.map((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) {
      return line;
    }

    const [currentKey] = line.split("=");
    if (currentKey === key) {
      updated = true;
      return `${key}=${value}`;
    }

    return line;
  });

  if (!updated) {
    nextLines.push(`${key}=${value}`);
  }

  return `${nextLines.join("\n").replace(/\n+$/, "")}\n`;
}

async function resolveEnvTarget() {
  for (const candidate of ENV_CANDIDATES) {
    const candidatePath = path.join(ROOT, candidate);
    try {
      await fs.access(candidatePath);
      return { path: candidatePath, contents: await fs.readFile(candidatePath, "utf8") };
    } catch {
      continue;
    }
  }

  return { path: path.join(ROOT, ".env.local"), contents: "" };
}

function pickDeploymentKey(deployed: Record<string, string>, suffix: string) {
  const key = Object.keys(deployed).find((entry) => entry.endsWith(suffix));
  if (!key) {
    throw new Error(`Missing deployment entry ending with ${suffix}.`);
  }
  return key;
}

function findDeploymentKey(deployed: Record<string, string>, suffix: string) {
  return Object.keys(deployed).find((entry) => entry.endsWith(suffix));
}

async function writeAbi(artifactKey: string, outName: string) {
  const artifactPath = path.join(ignitionArtifactsDir, `${artifactKey}.json`);
  const artifactRaw = await fs.readFile(artifactPath, "utf8");
  const artifact = JSON.parse(artifactRaw) as { abi?: unknown };

  if (!artifact.abi) {
    throw new Error(`No ABI found in ${artifactPath}.`);
  }

  await fs.writeFile(
    path.join(outAbiDir, `${outName}.json`),
    JSON.stringify(artifact.abi, null, 2) + "\n",
    "utf8",
  );
}

async function writeCompiledAbi(artifactPath: string, outName: string) {
  const artifactRaw = await fs.readFile(artifactPath, "utf8");
  const artifact = JSON.parse(artifactRaw) as { abi?: unknown };

  if (!artifact.abi) {
    throw new Error(`No ABI found in ${artifactPath}.`);
  }

  await fs.writeFile(
    path.join(outAbiDir, `${outName}.json`),
    JSON.stringify(artifact.abi, null, 2) + "\n",
    "utf8",
  );
}

async function main() {
  try {
    await fs.access(deployedAddressesPath);
  } catch {
    throw new Error(
      `Missing deployment artifacts at ${deployedAddressesPath}. ` +
        `Deploy with: pnpm hardhat ignition deploy ./ignition/modules/ClipYieldModule.ts ` +
        `--network cronosTestnet --deployment-id ${deploymentId}`,
    );
  }

  const deployedRaw = await fs.readFile(deployedAddressesPath, "utf8");
  const deployed = JSON.parse(deployedRaw) as Record<string, string>;

  await fs.mkdir(outAbiDir, { recursive: true });

  const vaultKey = pickDeploymentKey(deployed, "#ClipYieldVault");
  const factoryKey = findDeploymentKey(deployed, "#ClipYieldBoostVaultFactory");
  const sponsorHubKey = findDeploymentKey(deployed, "#ClipYieldSponsorHub");
  const invoiceKey = findDeploymentKey(deployed, "#ClipYieldInvoiceReceipts");
  const boostPassKey = findDeploymentKey(deployed, "#ClipYieldBoostPass");
  const yieldStreamerKey = findDeploymentKey(deployed, "#SimulatedYieldStreamer");

  const clipYieldVault = deployed[vaultKey];
  const boostFactory = factoryKey ? deployed[factoryKey] : null;
  const sponsorHub = sponsorHubKey ? deployed[sponsorHubKey] : null;
  const invoiceReceipts = invoiceKey ? deployed[invoiceKey] : null;
  const boostPass = boostPassKey ? deployed[boostPassKey] : null;
  const yieldStreamer = yieldStreamerKey ? deployed[yieldStreamerKey] : null;

  await writeAbi(vaultKey, "ClipYieldVault");
  if (factoryKey) {
    await writeAbi(factoryKey, "ClipYieldBoostVaultFactory");
  }
  if (sponsorHubKey) {
    await writeAbi(sponsorHubKey, "ClipYieldSponsorHub");
  }
  if (invoiceKey) {
    await writeAbi(invoiceKey, "ClipYieldInvoiceReceipts");
  }
  if (boostPassKey) {
    await writeAbi(boostPassKey, "ClipYieldBoostPass");
  }
  if (yieldStreamerKey) {
    await writeAbi(yieldStreamerKey, "SimulatedYieldStreamer");
  }

  const boostVaultArtifact = path.join(
    compiledArtifactsDir,
    "realfi",
    "ClipYieldBoostVault.sol",
    "ClipYieldBoostVault.json",
  );
  await writeCompiledAbi(boostVaultArtifact, "ClipYieldBoostVault");

  const envTarget = await resolveEnvTarget();
  let updatedEnv = upsertEnvValue(
    envTarget.contents,
    "NEXT_PUBLIC_CROIGNITE_VAULT_ADDRESS",
    clipYieldVault,
  );
  if (boostFactory) {
    updatedEnv = upsertEnvValue(
      updatedEnv,
      "NEXT_PUBLIC_BOOST_FACTORY_ADDRESS",
      boostFactory,
    );
    updatedEnv = upsertEnvValue(updatedEnv, "BOOST_FACTORY_ADDRESS", boostFactory);
  }
  if (sponsorHub) {
    updatedEnv = upsertEnvValue(
      updatedEnv,
      "NEXT_PUBLIC_SPONSOR_HUB_ADDRESS",
      sponsorHub,
    );
    updatedEnv = upsertEnvValue(updatedEnv, "SPONSOR_HUB_ADDRESS", sponsorHub);
  }
  if (invoiceReceipts) {
    updatedEnv = upsertEnvValue(
      updatedEnv,
      "NEXT_PUBLIC_INVOICE_RECEIPTS_ADDRESS",
      invoiceReceipts,
    );
    updatedEnv = upsertEnvValue(
      updatedEnv,
      "INVOICE_RECEIPTS_ADDRESS",
      invoiceReceipts,
    );
  }
  if (boostPass) {
    updatedEnv = upsertEnvValue(
      updatedEnv,
      "NEXT_PUBLIC_BOOST_PASS_ADDRESS",
      boostPass,
    );
    updatedEnv = upsertEnvValue(updatedEnv, "BOOST_PASS_ADDRESS", boostPass);
  }
  if (yieldStreamer) {
    updatedEnv = upsertEnvValue(
      updatedEnv,
      "NEXT_PUBLIC_YIELD_STREAMER_ADDRESS",
      yieldStreamer,
    );
  }
  await fs.writeFile(envTarget.path, updatedEnv, "utf8");

  console.log("Synced contract outputs:");
  console.log(`- ${outAbiDir}`);
  console.log(`- ${envTarget.path}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
