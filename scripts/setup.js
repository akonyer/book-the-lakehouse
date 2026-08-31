#!/usr/bin/env node

/* eslint-disable @typescript-eslint/no-require-imports */

const { spawnSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");
const readline = require("node:readline");

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const envPath = path.join(process.cwd(), ".env.local");
const examplePath = path.join(process.cwd(), ".env.example");

function ask(question, fallback = "") {
  const suffix = fallback ? ` (${fallback})` : "";
  return new Promise((resolve) => {
    rl.question(`${question}${suffix}: `, (answer) => resolve(answer.trim() || fallback));
  });
}

async function askYesNo(question, fallback = true) {
  const answer = (await ask(`${question} [${fallback ? "Y/n" : "y/N"}]`)).toLowerCase();
  if (!answer) return fallback;
  return answer.startsWith("y");
}

function parseEnv(content) {
  const values = {};
  for (const line of content.split("\n")) {
    const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (match) values[match[1]] = match[2];
  }
  return values;
}

function quote(value) {
  const trimmed = value.trim();
  if (!trimmed) return "";
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed;
  }
  return JSON.stringify(trimmed);
}

function upsert(content, key, value) {
  const line = `${key}=${value}`;
  const pattern = new RegExp(`^${key}=.*$`, "m");
  if (pattern.test(content)) return content.replace(pattern, line);
  return `${content.trimEnd()}\n${line}\n`;
}

function run(command, args) {
  console.log(`\nRunning: ${command} ${args.join(" ")}`);
  return spawnSync(command, args, { stdio: "inherit" }).status === 0;
}

function hasRealMysqlUrl(value) {
  const unquoted = value.replace(/^['"]|['"]$/g, "").trim();
  return /^mysql:\/\//.test(unquoted) && !unquoted.includes("<");
}

async function main() {
  console.log("\nBook the lakehouse — portable setup\n");

  if (!fs.existsSync(envPath)) {
    fs.copyFileSync(examplePath, envPath);
    console.log("Created .env.local from .env.example.");
  }

  let content = fs.readFileSync(envPath, "utf8");
  const current = parseEnv(content);

  const homeName = await ask(
    "Display name",
    current.NEXT_PUBLIC_HOME_NAME?.replace(/^['"]|['"]$/g, "") ||
      "Book the lakehouse",
  );
  const description = await ask(
    "Site description",
    current.NEXT_PUBLIC_SITE_DESCRIPTION?.replace(/^['"]|['"]$/g, "") ||
      "A private family booking calendar.",
  );
  const footer = await ask(
    "Footer text",
    current.NEXT_PUBLIC_FOOTER_TEXT?.replace(/^['"]|['"]$/g, "") || homeName,
  );
  const repository = await ask(
    "Repository URL (optional)",
    current.NEXT_PUBLIC_REPO_URL?.replace(/^['"]|['"]$/g, "") || "",
  );
  const cookiePrefix = await ask(
    "Cookie prefix",
    current.COOKIE_PREFIX || "book-the-lakehouse",
  );

  content = upsert(content, "NEXT_PUBLIC_HOME_NAME", quote(homeName));
  content = upsert(content, "NEXT_PUBLIC_SITE_DESCRIPTION", quote(description));
  content = upsert(content, "NEXT_PUBLIC_FOOTER_TEXT", quote(footer));
  content = upsert(content, "NEXT_PUBLIC_REPO_URL", quote(repository));
  content = upsert(content, "COOKIE_PREFIX", cookiePrefix);
  fs.writeFileSync(envPath, content, { encoding: "utf8", mode: 0o600 });

  console.log("\nSaved non-secret application settings to .env.local.");
  console.log("Set FAMILY_PIN and any payment details directly in that ignored file.");
  console.log("For persistent mode, set a MySQL 8 DATABASE_URL there as well.");

  const configured = hasRealMysqlUrl(parseEnv(content).DATABASE_URL || "");
  if (configured && (await askYesNo("Apply committed database migrations now?"))) {
    if (!run("npm", ["run", "db:migrate"])) {
      throw new Error("Database migration failed; verify DATABASE_URL and MySQL availability");
    }
    if (await askYesNo("Seed the upstream demonstration people and bookings?", false)) {
      if (!run("npm", ["run", "db:seed"])) {
        throw new Error("Database seed failed");
      }
    }
  } else if (!configured) {
    console.log("\nNo configured MySQL URL found; the application will use demo mode.");
  }

  console.log("\nSetup complete.");
  console.log("Run `npm run dev` for development or build the OCI image for deployment.");
}

main()
  .catch((error) => {
    console.error(`\nSetup failed: ${error.message}`);
    process.exitCode = 1;
  })
  .finally(() => rl.close());
