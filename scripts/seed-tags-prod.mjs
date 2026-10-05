#!/usr/bin/env node

/**
 * scripts/seed-tags-prod.mjs
 * Updates and synchronizes all system tag groups, categories, and tags in production.
 */

import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  const content = fs.readFileSync(filePath, "utf-8");
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith("#") && trimmed.includes("=")) {
      const idx = trimmed.indexOf("=");
      const key = trimmed.slice(0, idx).trim();
      let val = trimmed.slice(idx + 1).trim();
      if (
        (val.startsWith('"') && val.endsWith('"')) ||
        (val.startsWith("'") && val.endsWith("'"))
      ) {
        val = val.slice(1, -1).trim();
      }
      if (val.length > 0 && !process.env[key]) {
        process.env[key] = val;
      }
    }
  }
}

// Load env hierarchy
loadEnvFile(path.resolve(process.cwd(), ".env.local"));
loadEnvFile(path.resolve(process.cwd(), ".env.local.prod"));
loadEnvFile(path.resolve(process.cwd(), ".env"));

let dbUrl = process.env.DATABASE_URL || process.env.SUPABASE_DB_URL || process.env.POSTGRES_URL;
let projectRef = process.env.SUPABASE_PROJECT_REF;
const dbPassword = process.env.SUPABASE_DB_PASSWORD;

if (!projectRef && process.env.NEXT_PUBLIC_SUPABASE_URL) {
  const match = process.env.NEXT_PUBLIC_SUPABASE_URL.match(/https:\/\/([a-z0-9-]+)\.supabase\.co/i);
  if (match) projectRef = match[1];
}
if (!projectRef) {
  projectRef = "rbnbgyytxgkkcrmkgnro";
}

if (!dbUrl && dbPassword && projectRef) {
  dbUrl = `postgresql://postgres:${encodeURIComponent(dbPassword)}@db.${projectRef}.supabase.co:5432/postgres`;
}

function runCommand(cmd, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, {
      stdio: "inherit",
      env: { ...process.env },
    });
    child.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`Command ${cmd} ${args.join(" ")} exited with code ${code}`));
    });
  });
}

async function executeSqlFile(filePath, label) {
  console.log(`\n⏳ Executing ${label} on production database...`);
  if (dbUrl) {
    await runCommand("npx", ["supabase", "db", "query", "--db-url", dbUrl, "--file", filePath]);
  } else {
    const queryArgs = ["supabase", "db", "query", "--linked", "--file", filePath];
    await runCommand("npx", queryArgs);
  }
  console.log(`✅ ${label} completed.`);
}

async function main() {
  console.log("==================================================================");
  console.log("🏷️  Synchronizing System Tag Groups, Categories & Tags in Production");
  console.log("==================================================================");

  try {
    // 1. Run migrations first to ensure any new schema / functions are applied
    console.log("\n📦 1. Verifying & Pushing Latest Migrations...");
    if (dbUrl) {
      await runCommand("npx", ["supabase", "db", "push", "--db-url", dbUrl, "--include-all"]);
    } else {
      await runCommand("npx", ["supabase", "db", "push", "--linked", "--include-all"]);
    }
    console.log("✅ Migrations are up to date.");

    // 2. Execute seed_system_taxonomies migration file explicitly to ensure groups & category links are refreshed
    const groupsMigrationPath = path.resolve(process.cwd(), "supabase/migrations/20261006000001_seed_system_taxonomies_and_tag_groups.sql");
    if (fs.existsSync(groupsMigrationPath)) {
      await executeSqlFile(groupsMigrationPath, "System Tag Groups & Category Linkages");
    }

    // 3. Execute seed.sql to refresh Core feature tags (Goals, Tasks, Diary, Documents)
    const seedPath = path.resolve(process.cwd(), "supabase/seed.sql");
    if (fs.existsSync(seedPath)) {
      await executeSqlFile(seedPath, "Seed Default Taxonomies (seed.sql)");
    }

    // 4. Verify tag counts in prod
    console.log("\n📊 4. Verifying Production Taxonomy Summary...");
    const verifySql = `
      SELECT 
        tc.feature,
        count(distinct g.id) as groups_count,
        count(distinct tc.id) as categories_count,
        count(distinct t.id) as tags_count
      FROM public.tag_categories tc
      LEFT JOIN public.tag_groups g ON tc.group_id = g.id
      LEFT JOIN public.tags t ON t.category_id = tc.id
      WHERE tc.is_system = true
      GROUP BY tc.feature
      ORDER BY tc.feature;
    `;
    
    if (dbUrl) {
      await runCommand("npx", ["supabase", "db", "query", "--db-url", dbUrl, verifySql]);
    } else {
      await runCommand("npx", ["supabase", "db", "query", "--linked", verifySql]);
    }

    console.log("\n🎉 Production tags, categories, and groups synchronized successfully!");
  } catch (err) {
    console.error("\n❌ Tag synchronization failed:", err.message);
    process.exit(1);
  }
}

main();
