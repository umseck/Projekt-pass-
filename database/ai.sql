begin;
create table if not exists pp_private.ai_access (actor uuid primary key);
create table if not exists pp_private.ai_state (
 actor uuid primary key references pp_private.ai_access(actor) on delete cascade,
 version integer not null default 0,
 state jsonb not null default '{"inputs":{},"requests":[],"audit":[]}'
);
alter table pp_private.ai_access enable row level security;
alter table pp_private.ai_state enable row level security;
revoke all on pp_private.ai_access, pp_private.ai_state from public,anon,authenticated;
grant select on pp_private.ai_access to service_role;
grant select,insert,update on pp_private.ai_state to service_role;
create or replace function public.pp_ai(op text, actor uuid, args jsonb default '{}') returns jsonb
language plpgsql set search_path='' as $$
declare current_state pp_private.ai_state; p jsonb;
begin
 if actor is null or not exists(select 1 from pp_private.ai_access a where a.actor=pp_ai.actor) then raise exception 'PP_FORBIDDEN'; end if;
 if op='capability' then return '{"allowed":true}'; end if;
 -- Existing tenant checks apply before any original input or suggestion is read.
 p:=public.pp_api('project',actor,jsonb_build_object('id',args->>'project_id'));
 insert into pp_private.ai_state(actor) values(actor) on conflict do nothing;
 select * into current_state from pp_private.ai_state a where a.actor=pp_ai.actor for update;
 if op='commit' then
  if current_state.version<>(args->>'version')::integer then raise exception 'PP_CONFLICT'; end if;
  if jsonb_typeof(args->'state')<>'object' or octet_length((args->'state')::text)>20000000 then raise exception 'PP_LIMIT'; end if;
  if args ? 'save' then
   if p->>'status'='handed_over' then raise exception 'PP_HANDOVER_LOCKED'; end if;
   if args->'save'->>'id' is distinct from p->>'id' then raise exception 'PP_FORBIDDEN'; end if;
   p:=public.pp_api('save',actor,args->'save');
  end if;
  update pp_private.ai_state a set state=args->'state',version=a.version+1 where a.actor=pp_ai.actor returning * into current_state;
 elsif op<>'load' then raise exception 'PP_INVALID'; end if;
 return jsonb_build_object('version',current_state.version,'state',current_state.state,'project',p);
end $$;
revoke all on function public.pp_ai(text,uuid,jsonb) from public,anon,authenticated;
grant execute on function public.pp_ai(text,uuid,jsonb) to service_role;
commit;
