import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { basename, extname, join, relative, resolve } from "node:path";

const root = resolve(process.argv[2] || "out");

if (!existsSync(root) || !statSync(root).isDirectory()) {
  console.error(`Public bundle directory not found: ${root}`);
  process.exit(1);
}

const forbiddenArtifactNames = new Set([
  ".env",
  "_headers",
  "docker-compose.yml",
  "dockerfile",
  "nginx.conf",
  "package-lock.json",
  "package.json"
]);
const textExtensions = new Set([".css", ".html", ".js", ".json", ".map", ".svg", ".txt", ".xml"]);
const forbiddenContent = [
  { label: "private key material", pattern: /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/ },
  { label: "Payme server credential name", pattern: /\bPAYME_(?:SECRET|TEST)_KEY\b/ },
  { label: "database credential name", pattern: /\b(?:DATABASE_URL|POSTGRES_PASSWORD)\b/ },
  { label: "Django server secret name", pattern: /\bDJANGO_SECRET_KEY\b/ },
  { label: "Telegram bot credential name", pattern: /\bTELEGRAM_BOT_TOKEN\b/ }
];

const findings = [];

function walk(directory) {
  for (const entry of readdirSync(directory)) {
    const path = join(directory, entry);
    const stat = statSync(path);
    if (stat.isDirectory()) {
      if (entry === ".git") {
        findings.push(`${relative(root, path)}: forbidden .git directory`);
      } else {
        walk(path);
      }
      continue;
    }

    const name = basename(path).toLowerCase();
    if (forbiddenArtifactNames.has(name) || name.startsWith(".env.")) {
      findings.push(`${relative(root, path)}: forbidden deployment/source artifact`);
    }

    if (!textExtensions.has(extname(path).toLowerCase())) {
      continue;
    }
    const content = readFileSync(path, "utf8");
    for (const check of forbiddenContent) {
      if (check.pattern.test(content)) {
        findings.push(`${relative(root, path)}: ${check.label}`);
      }
    }
  }
}

walk(root);

if (findings.length) {
  console.error("Public bundle security scan failed:");
  for (const finding of findings) {
    console.error(`- ${finding}`);
  }
  process.exit(1);
}

console.log("Public bundle security scan passed: no server credentials or private deployment artifacts found.");
