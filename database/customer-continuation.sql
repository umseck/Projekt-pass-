-- Additive customer continuation. Apply after schema.sql, workflow.sql and operator.sql.
-- No legacy owner keys, participants, journal or messaging RPCs are enabled.
begin;
create table if not exists pp_private.customer_members (
 project_id uuid not null references pp_private.projects(id) on delete cascade,
 user_id uuid not null,
 login_email text not null,
 accepted_at timestamptz not null default now(),
 revoked_at timestamptz,
 primary key(project_id,user_id)
);
create unique index if not exists customer_one_current_owner on pp_private.customer_members(project_id) where revoked_at is null;
create index if not exists customer_members_user_idx on pp_private.customer_members(user_id) where revoked_at is null;
create table if not exists pp_private.customer_invites (
 project_id uuid primary key references pp_private.projects(id) on delete cascade,
 email text not null,
 token_hash text not null unique check(token_hash ~ '^[a-f0-9]{64}$'),
 created_by uuid not null,
 transfer boolean not null default false,
 created_at timestamptz not null default now(),
 expires_at timestamptz not null,
 consumed_at timestamptz,
 attempts integer not null default 0,
 last_attempt_at timestamptz
);
create table if not exists pp_private.customer_events (
 id uuid primary key,
 project_id uuid not null references pp_private.projects(id) on delete cascade,
 author_id uuid not null,
 author_label text not null,
 recorded_at timestamptz not null default now(),
 event jsonb not null check(jsonb_typeof(event)='object')
);
create index if not exists customer_events_project_idx on pp_private.customer_events(project_id,recorded_at,id);
alter table pp_private.customer_members enable row level security;
alter table pp_private.customer_invites enable row level security;
alter table pp_private.customer_events enable row level security;
do $$ declare t text; begin
 foreach t in array array['customer_members','customer_invites','customer_events'] loop
  if not exists(select 1 from pg_policies where schemaname='pp_private' and tablename=t and policyname=t||'_no_direct_access') then
   execute format('create policy %I on pp_private.%I for all to anon, authenticated using (false) with check (false)',t||'_no_direct_access',t);
  end if;
 end loop;
end $$;
revoke all on pp_private.customer_members,pp_private.customer_invites,pp_private.customer_events from public,anon,authenticated;
grant select,insert,update,delete on pp_private.customer_members,pp_private.customer_invites to service_role;
grant select,insert on pp_private.customer_events to service_role;

-- The original remains available after customer acceptance; ordinary business
-- deletion is for drafts only. A personal-data erasure process is separate.
create or replace function pp_private.keep_original_handover() returns trigger
language plpgsql security invoker set search_path='' as $$
begin
 if old.status='handed_over' or old.handover_snapshot is not null then raise exception 'PP_HANDOVER_LOCKED'; end if;
 return old;
end;$$;
revoke all on function pp_private.keep_original_handover() from public,anon,authenticated;
grant execute on function pp_private.keep_original_handover() to service_role;
drop trigger if exists keep_original_handover on pp_private.projects;
create trigger keep_original_handover before delete on pp_private.projects for each row execute function pp_private.keep_original_handover();

create or replace function pp_private.customer_project_view(p pp_private.projects, actor uuid) returns jsonb
language sql stable security invoker set search_path='' as $$
 select jsonb_build_object('id',p.id,'title',coalesce(p.handover_snapshot->>'title',p.title),'pass_number',(select number from pp_private.passes where id=p.pass_id),
  'activated_at',p.activated_at,'handed_over_at',p.handed_over_at,
  'content',coalesce(p.handover_snapshot->'content',p.content),
  'company',(select jsonb_build_object('name',profile->>'name','contact',profile->>'contact','phone',profile->>'phone','email',profile->>'email','website',profile->>'website','logo',profile->>'logo') from pp_private.companies where id=p.company_id),
  'handover_snapshot',case when p.handover_snapshot is null then null else jsonb_build_object('title',p.handover_snapshot->'title','content',p.handover_snapshot->'content','activated_at',p.handover_snapshot->'activated_at','handed_over_at',p.handover_snapshot->'handed_over_at',
   'company',jsonb_build_object('name',p.handover_snapshot->'company'->>'name','contact',p.handover_snapshot->'company'->>'contact','phone',p.handover_snapshot->'company'->>'phone','email',p.handover_snapshot->'company'->>'email','website',p.handover_snapshot->'company'->>'website','logo',p.handover_snapshot->'company'->>'logo'),'legacy',coalesce(p.handover_snapshot->'legacy','false')) end,
  'additions',coalesce((select jsonb_agg(e.event || jsonb_build_object('id',e.id,'author_id',e.author_id,'author_label',e.author_label,'recorded_at',e.recorded_at) order by e.recorded_at,e.id) from pp_private.customer_events e where e.project_id=p.id),'[]'),
  'permissions',jsonb_build_object('can_add',exists(select 1 from pp_private.customer_members m where m.project_id=p.id and m.user_id=actor and m.revoked_at is null),'can_transfer',exists(select 1 from pp_private.customer_members m where m.project_id=p.id and m.user_id=actor and m.revoked_at is null)),
  'token',(select token from pp_private.passes where id=p.pass_id),
  'current_owner_email',(select login_email from pp_private.customer_members where project_id=p.id and revoked_at is null));
$$;
revoke all on function pp_private.customer_project_view(pp_private.projects,uuid) from public,anon,authenticated;
grant execute on function pp_private.customer_project_view(pp_private.projects,uuid) to service_role;

create or replace function public.pp_customer(op text, actor uuid, args jsonb default '{}') returns jsonb
language plpgsql security invoker set search_path='' as $$
declare
 p pp_private.projects;
 invite pp_private.customer_invites;
 owner pp_private.customer_members;
 entry pp_private.customer_events;
 e jsonb;
 is_owner boolean;
 is_business boolean;
begin
 -- A link has no write rights until the server validates Auth and redeems it.
 if op in ('customer_access_info','customer_access_begin','customer_access_redeem') then
  select * into invite from pp_private.customer_invites where token_hash=args->>'token_hash';
  if invite.project_id is null then raise exception 'PP_INVITE_INVALID'; end if;
  select * into p from pp_private.projects where id=invite.project_id for update;
  -- Same lock order as invite generation; re-read after acquiring project lock.
  select * into invite from pp_private.customer_invites where token_hash=args->>'token_hash' for update;
  if invite.project_id is null or invite.consumed_at is not null or invite.expires_at<=now() or p.status<>'handed_over' then raise exception 'PP_INVITE_INVALID'; end if;
  if invite.transfer and not exists(select 1 from pp_private.customer_members where project_id=p.id and user_id=invite.created_by and revoked_at is null) then raise exception 'PP_INVITE_INVALID'; end if;
  if not invite.transfer and exists(select 1 from pp_private.customer_members where project_id=p.id and revoked_at is null) then raise exception 'PP_INVITE_INVALID'; end if;
  if op='customer_access_begin' then
   if invite.last_attempt_at>now()-interval '15 minutes' and invite.attempts>=5 then raise exception 'PP_RATE_LIMIT'; end if;
   update pp_private.customer_invites set attempts=case when last_attempt_at>now()-interval '15 minutes' then attempts+1 else 1 end,last_attempt_at=now() where project_id=p.id;
  elsif op='customer_access_redeem' then
   if actor is null then raise exception 'PP_UNAUTHORIZED'; end if;
   if lower(coalesce(args->>'email',''))<>invite.email then raise exception 'PP_FORBIDDEN'; end if;
   if invite.transfer then
    if coalesce(args->>'pass_token','') !~ '^[a-f0-9]{64}$' then raise exception 'PP_INVALID'; end if;
    update pp_private.customer_members set revoked_at=now() where project_id=p.id and revoked_at is null;
    -- Revokes previous capability readers. The new owner must replace the old QR/NFC link.
    update pp_private.passes set token=args->>'pass_token' where id=p.pass_id;
   end if;
   insert into pp_private.customer_members(project_id,user_id,login_email,accepted_at,revoked_at)
    values(p.id,actor,invite.email,now(),null)
    on conflict(project_id,user_id) do update set login_email=excluded.login_email,accepted_at=now(),revoked_at=null;
   update pp_private.customer_invites set consumed_at=now() where project_id=p.id;
   return jsonb_build_object('ok',true,'project_id',p.id,'transfer',invite.transfer);
  end if;
  return jsonb_build_object('title',p.title,'email',invite.email,'transfer',invite.transfer,'expires_at',invite.expires_at,'project_id',p.id);
 end if;
 if actor is null then raise exception 'PP_UNAUTHORIZED'; end if;
 if op='customer_bootstrap' then
  if not exists(select 1 from pp_private.customer_members where user_id=actor and revoked_at is null) then raise exception 'PP_FORBIDDEN'; end if;
  return jsonb_build_object('role','customer','projects',coalesce((select jsonb_agg(jsonb_build_object('id',p0.id,'title',p0.title,'pass_number',s.number,'handed_over_at',p0.handed_over_at) order by p0.handed_over_at desc) from pp_private.projects p0 join pp_private.customer_members m on m.project_id=p0.id join pp_private.passes s on s.id=p0.pass_id where m.user_id=actor and m.revoked_at is null and p0.status='handed_over'),'[]'));
 end if;
 select * into p from pp_private.projects where id=(args->>'id')::uuid for update;
 if p.id is null or p.status<>'handed_over' then raise exception 'PP_NOT_FOUND'; end if;
 select * into owner from pp_private.customer_members where project_id=p.id and user_id=actor and revoked_at is null;
 is_owner=owner.user_id is not null;
 is_business=exists(select 1 from pp_private.members where user_id=actor and company_id=p.company_id);
 if op='customer_invite' or op='customer_transfer' then
  if (op='customer_invite' and not is_business) or (op='customer_transfer' and not is_owner) then raise exception 'PP_FORBIDDEN'; end if;
  if op='customer_invite' and exists(select 1 from pp_private.customer_members where project_id=p.id and revoked_at is null) then raise exception 'PP_ALREADY_OWNER'; end if;
  if op='customer_transfer' and lower(args->>'email')=owner.login_email then raise exception 'PP_SAME_OWNER'; end if;
  if coalesce(args->>'email','')='' or coalesce(args->>'token_hash','') !~ '^[a-f0-9]{64}$' then raise exception 'PP_INVALID'; end if;
  insert into pp_private.customer_invites(project_id,email,token_hash,created_by,transfer,expires_at)
   values(p.id,lower(args->>'email'),args->>'token_hash',actor,op='customer_transfer',now()+interval '7 days')
   on conflict(project_id) do update set email=excluded.email,token_hash=excluded.token_hash,created_by=actor,transfer=excluded.transfer,created_at=now(),expires_at=excluded.expires_at,consumed_at=null,attempts=0,last_attempt_at=null;
  return jsonb_build_object('expires_at',now()+interval '7 days','project_id',p.id,'transfer',op='customer_transfer');
 end if;
 if not is_owner and not (is_business and op='customer_project') then raise exception 'PP_FORBIDDEN'; end if;
 if op='customer_add' then
  e=args->'event';
  if jsonb_typeof(e) is distinct from 'object' or coalesce(e->>'kind','') not in ('maintenance','repair','change','photo','document') or coalesce(e->>'effect','') not in ('evidence','replaced','unknown') then raise exception 'PP_INVALID'; end if;
  if not exists(select 1 from jsonb_array_elements(coalesce(p.content->'areas','[]')) a where a->>'id'=e->>'area_id') then raise exception 'PP_INVALID_AREA'; end if;
  if coalesce(length(trim(e->>'description')),0)=0 or (e->>'occurred_on')::date>current_date then raise exception 'PP_INVALID'; end if;
  if (e->>'kind'='photo' and jsonb_array_length(coalesce(e->'photos','[]'))=0) or (e->>'kind'='document' and jsonb_array_length(coalesce(e->'documents','[]'))=0) then raise exception 'PP_INVALID'; end if;
  select * into entry from pp_private.customer_events where id=(e->>'id')::uuid;
  if entry.id is not null then
   if entry.project_id<>p.id or entry.author_id<>actor or entry.event is distinct from (e-'id'-'author_id'-'author_label'-'recorded_at') then raise exception 'PP_CONFLICT'; end if;
   return pp_private.customer_project_view(p,actor);
  end if;
  if (select count(*) from pp_private.customer_events where project_id=p.id)>=100 then raise exception 'PP_LIMIT'; end if;
  insert into pp_private.customer_events(id,project_id,author_id,author_label,event) values((e->>'id')::uuid,p.id,actor,owner.login_email,e-'id'-'author_id'-'author_label'-'recorded_at');
 elsif op<>'customer_project' then raise exception 'PP_INVALID'; end if;
 return pp_private.customer_project_view(p,actor);
end;
$$;
revoke all on function public.pp_customer(text,uuid,jsonb) from public,anon,authenticated;
grant execute on function public.pp_customer(text,uuid,jsonb) to service_role;
commit;
