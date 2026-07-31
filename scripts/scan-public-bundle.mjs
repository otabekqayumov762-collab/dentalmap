import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { basename, extname, join, relative, resolve } from "node:path";

const root = resolve(process.argv[2] || "out");

if (!existsSync(root) || !statSync(root).isDirectory()) {
  console.error(`Public bundle directory not found: ${root}`);
  process.exit(1);
}

// `_headers` is deliberately absent here: it is the Netlify header control file,
// which Netlify consumes and never serves. It must live in the publish directory
// to work at all, so instead of banning it we assert below that the Nginx runtime
// config makes it unreachable on that deployment path.
const forbiddenArtifactNames = new Set([
  ".env",
  "docker-compose.yml",
  "dockerfile",
  "nginx.conf",
  "package-lock.json",
  "package.json",
  "tsconfig.json"
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

/** The Netlify `_headers` file may sit in the publish directory, but the Nginx
 *  deployment path serves that same directory as its web root. Require the
 *  generated runtime config to exist outside the bundle and to 404 the probe. */
function verifyNginxArtifactGuard() {
  const generatedConfig = resolve("generated", "nginx.conf");
  if (!existsSync(generatedConfig)) {
    findings.push(
      "generated/nginx.conf: missing — the runtime Nginx config must be generated outside the published bundle"
    );
    return;
  }
  const config = readFileSync(generatedConfig, "utf8");
  if (!/location\s+~\s+\(\^\|\/\)\\\.\s*\{\s*return\s+404;/.test(config)) {
    findings.push("generated/nginx.conf: missing the dotfile 404 guard");
  }
  if (!/_headers/.test(config) || !/return 404;/.test(config)) {
    findings.push("generated/nginx.conf: missing the deployment-artifact 404 guard for _headers");
  }
}

verifyNginxArtifactGuard();

if (findings.length) {
  console.error("Public bundle security scan failed:");
  for (const finding of findings) {
    console.error(`- ${finding}`);
  }
  process.exit(1);
}

console.log("Public bundle security scan passed: no server credentials or private deployment artifacts found.");
