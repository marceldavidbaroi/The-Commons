#!/usr/bin/env python3
"""
scripts/seed_tags.py

Upserts and synchronizes system tag groups, categories, and tags from
supabase/taxonomies.json across all user profiles in the database.

Supports:
- Direct execution via Supabase CLI (linked or via --db-url)
- Integration with npm/pnpm commands (e.g. `pnpm tag:prod`)
"""

import os
import sys
import json
import re
import subprocess
from pathlib import Path

def load_env_file(filepath: Path):
    """Load key-values from .env files if not already set in os.environ."""
    if not filepath.exists():
        return
    with open(filepath, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, val = line.split("=", 1)
            key = key.strip()
            val = val.strip()
            if (val.startswith('"') and val.endswith('"')) or (val.startswith("'") and val.endswith("'")):
                val = val[1:-1].strip()
            if key and key not in os.environ:
                os.environ[key] = val

def escape_sql_literal(text: str) -> str:
    """Escape single quotes in SQL strings."""
    if text is None:
        return "NULL"
    return "'" + str(text).replace("'", "''") + "'"

def generate_sync_sql(data: dict) -> str:
    """
    Generate an idempotent PL/pgSQL block to upsert all groups, categories,
    and tags for all profiles.
    """
    sql_lines = [
        "-- ==============================================================================",
        "-- Auto-Generated Tag Synchronization from taxonomies.json",
        "-- ==============================================================================",
        "do $$",
        "declare",
        "  r_prof record;",
        "  v_grp_id bigint;",
        "  v_cat_id bigint;",
        "begin",
        "  for r_prof in (select id from public.profiles) loop"
    ]

    for g in data.get("groups", []):
        feature = g.get("feature", "general")
        name = g.get("name")
        slug = g.get("slug")
        icon = g.get("icon", "folder")
        color = g.get("color", "#6B7280")
        display_order = g.get("display_order", 0)
        is_system = "true" if g.get("is_system", True) else "false"
        blueprint_json = json.dumps(g.get("schema_blueprint", []))

        sql_lines.append(f"\n    -- Group: {name} ({slug}) [{feature}]")
        sql_lines.append("    insert into public.tag_groups (user_id, feature, name, slug, icon, color, display_order, is_system, schema_blueprint)")
        sql_lines.append(f"    values (r_prof.id, {escape_sql_literal(feature)}, {escape_sql_literal(name)}, {escape_sql_literal(slug)}, {escape_sql_literal(icon)}, {escape_sql_literal(color)}, {display_order}, {is_system}, {escape_sql_literal(blueprint_json)}::jsonb)")
        sql_lines.append("    on conflict (user_id, feature, slug) do update set")
        sql_lines.append("      name = excluded.name, icon = excluded.icon, color = excluded.color, display_order = excluded.display_order, schema_blueprint = excluded.schema_blueprint, updated_at = now()")
        sql_lines.append("    returning id into v_grp_id;")
        sql_lines.append("    if v_grp_id is null then")
        sql_lines.append(f"      select id into v_grp_id from public.tag_groups where user_id = r_prof.id and feature = {escape_sql_literal(feature)} and slug = {escape_sql_literal(slug)};")
        sql_lines.append("    end if;")

        for c in g.get("categories", []):
            cat_name = c.get("name")
            cat_slug = c.get("slug")
            cat_color = c.get("color", color)
            cat_order = c.get("display_order", 0)
            cat_is_system = "true" if c.get("is_system", True) else "false"
            cat_blueprint_json = json.dumps(c.get("schema_blueprint", []))

            sql_lines.append(f"\n    -- Category: {cat_name} ({cat_slug})")
            sql_lines.append("    insert into public.tag_categories (user_id, feature, group_id, name, slug, color, display_order, is_system, schema_blueprint)")
            sql_lines.append(f"    values (r_prof.id, {escape_sql_literal(feature)}, v_grp_id, {escape_sql_literal(cat_name)}, {escape_sql_literal(cat_slug)}, {escape_sql_literal(cat_color)}, {cat_order}, {cat_is_system}, {escape_sql_literal(cat_blueprint_json)}::jsonb)")
            sql_lines.append("    on conflict (user_id, feature, slug) do update set")
            sql_lines.append("      group_id = excluded.group_id, name = excluded.name, color = excluded.color, display_order = excluded.display_order, schema_blueprint = excluded.schema_blueprint, updated_at = now()")
            sql_lines.append("    returning id into v_cat_id;")
            sql_lines.append("    if v_cat_id is null then")
            sql_lines.append(f"      select id into v_cat_id from public.tag_categories where user_id = r_prof.id and feature = {escape_sql_literal(feature)} and slug = {escape_sql_literal(cat_slug)};")
            sql_lines.append("    end if;")

            tags = c.get("tags", [])
            if tags:
                sql_lines.append("    -- Tags for category")
                for t in tags:
                    tag_name = t.get("name")
                    tag_slug = t.get("slug")
                    tag_color = escape_sql_literal(t.get("color")) if t.get("color") else "NULL"
                    tag_is_sys = "true" if t.get("is_system", True) else "false"

                    sql_lines.append(f"    insert into public.tags (category_id, user_id, name, slug, color, is_system)")
                    sql_lines.append(f"    values (v_cat_id, r_prof.id, {escape_sql_literal(tag_name)}, {escape_sql_literal(tag_slug)}, {tag_color}, {tag_is_sys})")
                    sql_lines.append("    on conflict (category_id, slug) do update set")
                    sql_lines.append("      name = excluded.name, color = excluded.color, updated_at = now();")

    sql_lines.append("\n  end loop;")
    sql_lines.append("end $$;")

    return "\n".join(sql_lines)

def main():
    repo_root = Path(__file__).resolve().parent.parent

    # 1. Load environment hierarchy
    load_env_file(repo_root / ".env.local")
    load_env_file(repo_root / ".env.local.prod")
    load_env_file(repo_root / ".env")

    db_url = os.environ.get("DATABASE_URL") or os.environ.get("SUPABASE_DB_URL") or os.environ.get("POSTGRES_URL")
    project_ref = os.environ.get("SUPABASE_PROJECT_REF")
    db_password = os.environ.get("SUPABASE_DB_PASSWORD")

    if not project_ref and os.environ.get("NEXT_PUBLIC_SUPABASE_URL"):
        match = re.search(r"https://([a-z0-9-]+)\.supabase\.co", os.environ["NEXT_PUBLIC_SUPABASE_URL"], re.I)
        if match:
            project_ref = match.group(1)

    if not project_ref:
        project_ref = "rbnbgyytxgkkcrmkgnro"

    if not db_url and db_password and project_ref:
        db_url = f"postgresql://postgres:{db_password}@db.{project_ref}.supabase.co:5432/postgres"

    # 2. Load taxonomies from modular directory (supabase/taxonomies/*.json) or monolithic json
    modular_dir = repo_root / "supabase" / "taxonomies"
    json_path = repo_root / "supabase" / "taxonomies.json"

    data = {"groups": []}
    if modular_dir.exists() and any(modular_dir.glob("*.json")):
        source_label = "supabase/taxonomies/*.json (modular)"
        for file in sorted(modular_dir.glob("*.json")):
            with open(file, "r", encoding="utf-8") as f:
                content = json.load(f)
                if isinstance(content, dict):
                    if "groups" in content:
                        data["groups"].extend(content["groups"])
                    else:
                        data["groups"].append(content)
                elif isinstance(content, list):
                    data["groups"].extend(content)
    elif json_path.exists():
        source_label = "supabase/taxonomies.json"
        with open(json_path, "r", encoding="utf-8") as f:
            data = json.load(f)
    else:
        print(f"❌ Error: Neither modular directory {modular_dir} nor JSON file {json_path} found")
        sys.exit(1)

    groups_count = len(data.get("groups", []))
    cats_count = sum(len(g.get("categories", [])) for g in data.get("groups", []))
    tags_count = sum(len(c.get("tags", [])) for g in data.get("groups", []) for c in g.get("categories", []))

    print("==================================================================")
    print("🏷️  Synchronizing System Taxonomies, Groups, Categories & Tags")
    print("==================================================================")
    print(f"📦 Source: {source_label}")
    print(f"📊 Content: {groups_count} Groups, {cats_count} Categories, {tags_count} Tags")

    # 3. Generate SQL script
    sync_sql = generate_sync_sql(data)
    temp_sql_file = repo_root / "supabase" / ".temp_sync_tags.sql"
    with open(temp_sql_file, "w", encoding="utf-8") as f:
        f.write(sync_sql)

    try:
        # 4. Push any pending migrations first
        print("\n⏳ 1. Ensuring migrations are up to date...")
        push_cmd = ["npx", "supabase", "db", "push", "--include-all"]
        if db_url:
            push_cmd.extend(["--db-url", db_url])
        else:
            push_cmd.append("--linked")
        subprocess.run(push_cmd, cwd=repo_root, check=True)

        # 5. Execute generated SQL synchronization
        print("\n⏳ 2. Applying tag groups, categories, and tags...")
        query_cmd = ["npx", "supabase", "db", "query", "--file", str(temp_sql_file)]
        if db_url:
            query_cmd.extend(["--db-url", db_url])
        else:
            query_cmd.append("--linked")
        subprocess.run(query_cmd, cwd=repo_root, check=True)

        # 6. Verify summary
        print("\n📊 3. Verifying Taxonomy Summary in Database...")
        verify_sql = """
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
        """
        verify_cmd = ["npx", "supabase", "db", "query"]
        if db_url:
            verify_cmd.extend(["--db-url", db_url, verify_sql])
        else:
            verify_cmd.extend(["--linked", verify_sql])
        subprocess.run(verify_cmd, cwd=repo_root, check=True)

        print("\n🎉 Taxonomies synchronized successfully!")
    finally:
        if temp_sql_file.exists():
            temp_sql_file.unlink()

if __name__ == "__main__":
    main()
