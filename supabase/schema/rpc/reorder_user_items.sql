-- RPC: public.reorder_user_items
-- Atomically reorders a list of items for the authenticated user

create or replace function public.reorder_user_items(
  p_item_ids uuid[]
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  i integer;
begin
  v_user_id := auth.uid();
  
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  for i in 1 .. array_length(p_item_ids, 1) loop
    update public.user_items
    set sort_order = i,
        updated_at = now()
    where id = p_item_ids[i]
      and user_id = v_user_id;
  end loop;
end;
$$;

comment on function public.reorder_user_items is 'Updates the sort order index for an array of item IDs belonging to the authenticated user.';
