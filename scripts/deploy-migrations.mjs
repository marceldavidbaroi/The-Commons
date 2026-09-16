#!/usr/bin/env node

import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

// 1. Load .env.local
const envPath = path.resolve(process.cwd(), ".env.local");
if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, "utf-8");
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith("#") && trimmed.includes("=")) {
      const idx = trimmed.indexOf("=");
      const key = trimmed.slice(0, idx).trim();
      const val = trimmed.slice(idx + 1).trim();
      if (!process.env[key]) {
        process.env[key] = val;
      }
    }
  }
}

console.log("\n🚀 Starting Production Migrations Deployment...");

// 2. Extract database connection details
let dbUrl = process.env.DATABASE_URL || process.env.SUPABASE_DB_URL || process.env.POSTGRES_URL;
const projectRef = process.env.SUPABASE_PROJECT_REF || "rbnbgyytxgkkcrmkgnro";
const dbPassword = process.env.SUPABASE_DB_PASSWORD;

if (!dbUrl && dbPassword && projectRef) {
  dbUrl = `postgresql://postgres:${encodeURIComponent(dbPassword)}@db.${projectRef}.supabase.co:5432/postgres`;
}

// 3. Prepare deploy command
let command = "npx";
let args = [];

if (dbUrl) {
  console.log(`📦 Applying migrations using database URL connection...`);
  args = ["supabase", "db", "push", "--db-url", dbUrl, "--include-all"];
} else if (process.env.SUPABASE_ACCESS_TOKEN) {
  console.log(`📦 Applying migrations using linked Supabase project ref (${projectRef})...`);
  args = ["supabase", "db", "push", "--linked", "--include-all"];
} else {
  console.warn(`
⚠️  No DATABASE_URL or SUPABASE_DB_PASSWORD found in .env.local.

To deploy migrations directly:
1. Add DATABASE_URL to your .env.local.prod file:
   DATABASE_URL="postgresql://postgres:[YOUR-PASSWORD]@db.${projectRef}.supabase.co:5432/postgres"
   
   (Or use the Session/Transaction connection string from your Supabase Dashboard -> Project Settings -> Database)

2. Or add SUPABASE_DB_PASSWORD:
   SUPABASE_DB_PASSWORD="your-db-password"

Attempting to run 'npx supabase db push' with interactive prompt or existing link...
`);
  args = ["supabase", "db", "push"];
}

// 4. Run the migration command
const child = spawn(command, args, {
  stdio: "inherit",
  env: {
    ...process.env,
  },
});

child.on("close", (code) => {
  if (code === 0) {
    console.log("\n✅ Production migrations deployed successfully!");
  } else {
    console.error(`\n❌ Migration deployment exited with code ${code}`);
    process.exit(code || 1);
  }
});
