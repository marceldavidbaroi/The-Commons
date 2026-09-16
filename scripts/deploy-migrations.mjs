#!/usr/bin/env node

import { spawn, execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

// 1. Helper to parse and load .env files
function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  const content = fs.readFileSync(filePath, "utf-8");
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith("#") && trimmed.includes("=")) {
      const idx = trimmed.indexOf("=");
      const key = trimmed.slice(0, idx).trim();
      let val = trimmed.slice(idx + 1).trim();
      // Remove surrounding quotes if present
      if (
        (val.startsWith('"') && val.endsWith('"')) ||
        (val.startsWith("'") && val.endsWith("'"))
      ) {
        val = val.slice(1, -1).trim();
      }
      // Only set if non-empty and not already set
      if (val.length > 0 && !process.env[key]) {
        process.env[key] = val;
      }
    }
  }
}

// Load env files in order (.env.local -> .env.local.prod -> .env)
loadEnvFile(path.resolve(process.cwd(), ".env.local"));
loadEnvFile(path.resolve(process.cwd(), ".env.local.prod"));
loadEnvFile(path.resolve(process.cwd(), ".env"));

console.log("\n🚀 Starting Production Migrations Deployment...");

// 2. Extract database connection details and project ref
let dbUrl = process.env.DATABASE_URL || process.env.SUPABASE_DB_URL || process.env.POSTGRES_URL;
let projectRef = process.env.SUPABASE_PROJECT_REF;
const dbPassword = process.env.SUPABASE_DB_PASSWORD;

// Extract project ref from NEXT_PUBLIC_SUPABASE_URL if not directly set
if (!projectRef && process.env.NEXT_PUBLIC_SUPABASE_URL) {
  const match = process.env.NEXT_PUBLIC_SUPABASE_URL.match(/https:\/\/([a-z0-9-]+)\.supabase\.co/i);
  if (match) {
    projectRef = match[1];
  }
}
if (!projectRef) {
  projectRef = "rbnbgyytxgkkcrmkgnro";
}

// Construct direct Postgres connection string if password and project ref are available
if (!dbUrl && dbPassword && projectRef) {
  dbUrl = `postgresql://postgres:${encodeURIComponent(dbPassword)}@db.${projectRef}.supabase.co:5432/postgres`;
}

// Helper to run a command as a promise with inherited stdio
function runCommand(cmd, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, {
      stdio: "inherit",
      env: { ...process.env },
    });
    child.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`Command exited with code ${code}`));
    });
  });
}

async function main() {
  try {
    if (dbUrl) {
      console.log(`📦 Applying migrations using database URL connection...`);
      await runCommand("npx", ["supabase", "db", "push", "--db-url", dbUrl, "--include-all"]);
    } else if (dbPassword && projectRef) {
      console.log(`📦 Linking Supabase project (${projectRef}) and pushing migrations...`);
      await runCommand("npx", ["supabase", "link", "--project-ref", projectRef, "--password", dbPassword]);
      await runCommand("npx", ["supabase", "db", "push", "--linked", "--include-all"]);
    } else if (process.env.SUPABASE_ACCESS_TOKEN && projectRef) {
      console.log(`📦 Linking with SUPABASE_ACCESS_TOKEN and pushing migrations (${projectRef})...`);
      await runCommand("npx", ["supabase", "link", "--project-ref", projectRef]);
      await runCommand("npx", ["supabase", "db", "push", "--linked", "--include-all"]);
    } else {
      console.warn(`
ℹ️  No DATABASE_URL or SUPABASE_DB_PASSWORD found in .env.local or .env.local.prod.

To deploy migrations automatically without interactive prompts, add one of the following to your .env.local.prod:

  Option A (Direct Connection URL):
  DATABASE_URL="postgresql://postgres:[YOUR-PASSWORD]@db.${projectRef}.supabase.co:5432/postgres"

  Option B (Database Password):
  SUPABASE_DB_PASSWORD="[YOUR-PASSWORD]"

Proceeding with Supabase CLI link to project "${projectRef}" (you may be prompted for your database password)...
`);

      // Attempt to link first if projectRef is known
      console.log(`🔗 Linking to Supabase project: ${projectRef}...`);
      await runCommand("npx", ["supabase", "link", "--project-ref", projectRef]);
      console.log(`📦 Pushing migrations to remote database...`);
      await runCommand("npx", ["supabase", "db", "push", "--linked", "--include-all"]);
    }

    console.log("\n✅ Production migrations deployed successfully!");
  } catch (err) {
    console.error(`\n❌ Migration deployment failed:`, err.message);
    process.exit(1);
  }
}

main();
