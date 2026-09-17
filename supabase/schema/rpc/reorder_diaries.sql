-- RPC: reorder_diaries
-- Reorders the user's diaries by updating their sort_order values according to the provided array

create or replace function public.reorder_diaries(
  p_diary_ids uuid[]
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

  if p_diary_ids is null or array_length(p_diary_ids, 1) = 0 then
    return;
  end if;

  for i in 1 .. array_length(p_diary_ids, 1) loop
    update public.diaries
    set sort_order = i,
        updated_at = now()
    where id = p_diary_ids[i]
      and user_id = v_user_id;
  end loop;
end;
$$;

grant execute on function public.reorder_diaries(uuid[]) to authenticated;
