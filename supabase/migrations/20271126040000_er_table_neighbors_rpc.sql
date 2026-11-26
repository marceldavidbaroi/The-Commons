-- Fetch all FK neighbor tables (incoming and outgoing) across the entire diagram for a focused table
create or replace function public.get_er_table_neighbors(
  p_diagram_id uuid,
  p_table_id uuid
)
returns jsonb
language sql
security invoker
set search_path = public
as $$
  with target as (
    select id, name, relations
    from public.er_tables
    where id = p_table_id and diagram_id = p_diagram_id
  ),
  outgoing_names as (
    select distinct (rel->>'to_table') as table_name
    from target, jsonb_array_elements(target.relations) as rel
  )
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', t.id,
    'diagram_id', t.diagram_id,
    'group_id', t.group_id,
    'user_id', t.user_id,
    'name', t.name,
    'columns', t.columns,
    'relations', t.relations,
    'position', t.position,
    'created_at', t.created_at,
    'updated_at', t.updated_at
  )), '[]'::jsonb)
  from public.er_tables t, target
  where t.diagram_id = p_diagram_id
    and t.id <> target.id
    and (
      t.name in (select table_name from outgoing_names)
      or exists (
        select 1
        from jsonb_array_elements(t.relations) as r
        where r->>'to_table' = target.name
      )
    );
$$;

revoke all on function public.get_er_table_neighbors(uuid, uuid) from public;
grant execute on function public.get_er_table_neighbors(uuid, uuid) to authenticated;
