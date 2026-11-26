-- Single-roundtrip RPCs for ER Study to eliminate multi-request waterfalls

-- 1. Diagram Overview: returns diagram metadata, all groups, server table counts, and notes in 1 call
create or replace function public.get_er_diagram_overview(p_diagram_id uuid)
returns jsonb
language sql
security invoker
set search_path = public
as $$
  select jsonb_build_object(
    'diagram', (
      select to_jsonb(d)
      from (
        select id, user_id, name, source_type, created_at, updated_at
        from public.er_diagrams
        where id = p_diagram_id
      ) d
    ),
    'groups', (
      select coalesce(jsonb_agg(to_jsonb(g) order by g.created_at desc, g.id desc), '[]'::jsonb)
      from (
        select id, diagram_id, parent_id, user_id, name, color, position, created_at
        from public.er_groups
        where diagram_id = p_diagram_id
      ) g
    ),
    'counts', (
      select coalesce(jsonb_agg(to_jsonb(c)), '[]'::jsonb)
      from (
        select diagram_id, group_id, table_count
        from public.er_group_table_counts
        where diagram_id = p_diagram_id
      ) c
    ),
    'notes', (
      select coalesce(jsonb_agg(to_jsonb(n) order by n.created_at desc, n.id desc), '[]'::jsonb)
      from (
        select id, diagram_id, user_id, target_type, target_id, content, position, created_at, updated_at
        from public.er_notes
        where diagram_id = p_diagram_id
        limit 100
      ) n
    )
  );
$$;

revoke all on function public.get_er_diagram_overview(uuid) from public;
grant execute on function public.get_er_diagram_overview(uuid) to authenticated;

-- 2. Group Bundle: returns all tables for a group + its child sub-groups in 1 call
create or replace function public.get_er_group_bundle(
  p_diagram_id uuid,
  p_group_id uuid default null
)
returns jsonb
language sql
security invoker
set search_path = public
as $$
  with target_groups as (
    select id
    from public.er_groups
    where diagram_id = p_diagram_id
      and p_group_id is not null
      and (id = p_group_id or parent_id = p_group_id)
  )
  select jsonb_build_object(
    'tables', (
      case
        when p_group_id is null then (
          select coalesce(jsonb_agg(to_jsonb(u) order by u.created_at desc, u.id desc), '[]'::jsonb)
          from (
            select id, diagram_id, group_id, user_id, name, columns, relations, position, created_at, updated_at
            from public.er_ungrouped_tables
            where diagram_id = p_diagram_id
            order by created_at desc, id desc
            limit 50
          ) u
        )
        else (
          select coalesce(jsonb_agg(jsonb_build_object(
            'id', t.id,
            'diagram_id', t.diagram_id,
            'group_id', tg.group_id,
            'user_id', t.user_id,
            'name', t.name,
            'columns', t.columns,
            'relations', t.relations,
            'position', coalesce(tg.position, t.position),
            'created_at', t.created_at,
            'updated_at', t.updated_at
          ) order by tg.created_at desc, t.id desc), '[]'::jsonb)
          from public.er_table_groups tg
          join public.er_tables t on t.id = tg.table_id
          where tg.diagram_id = p_diagram_id
            and tg.group_id in (select id from target_groups)
        )
      end
    )
  );
$$;

revoke all on function public.get_er_group_bundle(uuid, uuid) from public;
grant execute on function public.get_er_group_bundle(uuid, uuid) to authenticated;
