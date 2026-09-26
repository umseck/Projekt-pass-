-- Additive operator management. Apply after schema.sql.
begin;
create table pp_private.operators (
 user_id uuid primary key,
 created_at timestamptz not null default now()
);
alter table pp_private.members add column login_email text not null default '';
alter table pp_private.passes drop constraint passes_number_check;
alter table pp_private.passes add constraint passes_number_check check(number>=1);
create table pp_private.pass_batches (
 id uuid primary key,
 company_id uuid not null references pp_private.companies(id),
 quantity integer not null check(quantity between 1 and 100),
 created_at timestamptz not null default now()
);
create index on pp_private.pass_batches(company_id);
create table pp_private.access_invites (
 id uuid primary key default gen_random_uuid(),
 kind text not null check (kind in ('operator','business')),
 company_id uuid unique references pp_private.companies(id) on delete cascade,
 email text,
 token_hash text not null unique check (token_hash ~ '^[a-f0-9]{64}$'),
 created_by uuid,
 created_at timestamptz not null default now(),
 expires_at timestamptz not null,
 consumed_at timestamptz,
 attempts integer not null default 0,
 last_attempt_at timestamptz,
 check ((kind='operator' and company_id is null) or
        (kind='business' and company_id is not null and email is not null))
);
alter table pp_private.operators enable row level security;
alter table pp_private.access_invites enable row level security;
alter table pp_private.pass_batches enable row level security;
create policy operators_no_direct_access on pp_private.operators
 for all to anon, authenticated using (false) with check (false);
create policy invites_no_direct_access on pp_private.access_invites
 for all to anon, authenticated using (false) with check (false);
create policy batches_no_direct_access on pp_private.pass_batches
 for all to anon, authenticated using (false) with check (false);
revoke all on pp_private.operators,pp_private.access_invites,pp_private.pass_batches from public,anon,authenticated;
grant select,insert,update,delete on pp_private.operators,pp_private.access_invites,pp_private.pass_batches to service_role;

create function public.pp_control(op text, actor uuid, args jsonb default '{}') returns jsonb
language plpgsql security invoker set search_path = '' as $$
declare
 invite pp_private.access_invites;
 business pp_private.companies;
 cid uuid;
 result jsonb;
 is_operator boolean;
 batch pp_private.pass_batches;
 last_number integer;
 amount integer;
begin
 -- These operations are callable only by the server, never by anon/authenticated.
 -- The server hashes the bearer link and verifies Auth before access_redeem.
 if op in ('access_info','access_begin','access_redeem') then
   select * into invite from pp_private.access_invites
     where token_hash=args->>'token_hash' for update;
   if invite.id is null or invite.consumed_at is not null or invite.expires_at<=now() then
     raise exception 'PP_INVITE_INVALID';
   end if;
   if invite.kind='operator' and exists(select 1 from pp_private.operators) then
     raise exception 'PP_SETUP_COMPLETE';
   end if;
   if op='access_begin' then
     if invite.last_attempt_at>now()-interval '15 minutes' and invite.attempts>=5 then
       raise exception 'PP_RATE_LIMIT';
     end if;
     update pp_private.access_invites set
       attempts=case when last_attempt_at>now()-interval '15 minutes' then attempts+1 else 1 end,
       last_attempt_at=now() where id=invite.id;
   elsif op='access_redeem' then
     if actor is null then raise exception 'PP_UNAUTHORIZED'; end if;
     if coalesce(args->>'email','')='' or
       (invite.email is not null and invite.email<>lower(args->>'email')) then
       raise exception 'PP_FORBIDDEN';
     end if;
     if invite.kind='operator' then
       -- Only a privately seeded bootstrap invitation can grant this role.
       -- Serialize bootstrap completion even if multiple setup links were seeded.
       perform pg_advisory_xact_lock(714259830);
       if exists(select 1 from pp_private.operators) then raise exception 'PP_SETUP_COMPLETE'; end if;
       insert into pp_private.operators(user_id) values(actor);
     else
       select company_id into cid from pp_private.members where user_id=actor;
       if cid is not null and cid<>invite.company_id then raise exception 'PP_ACCOUNT_IN_USE'; end if;
       -- Lock the business to serialize redemption and invitation replacement.
       perform 1 from pp_private.companies where id=invite.company_id for update;
       if exists(select 1 from pp_private.members where company_id=invite.company_id and user_id<>actor) then
         raise exception 'PP_ALREADY_ACTIVE';
       end if;
       insert into pp_private.members(user_id,company_id,login_email)
         values(actor,invite.company_id,lower(args->>'email'))
         on conflict(user_id) do nothing;
       -- A concurrent redemption for another company must never move membership.
       if not exists(select 1 from pp_private.members where user_id=actor and company_id=invite.company_id) then
         raise exception 'PP_ACCOUNT_IN_USE';
       end if;
     end if;
     update pp_private.access_invites set consumed_at=now() where id=invite.id;
     return jsonb_build_object('ok',true);
   end if;
   return jsonb_build_object('kind',invite.kind,'email',invite.email,'expires_at',invite.expires_at,
     'company_name',(select profile->>'name' from pp_private.companies where id=invite.company_id));
 end if;

 if actor is null then raise exception 'PP_UNAUTHORIZED'; end if;
 select exists(select 1 from pp_private.operators where user_id=actor) into is_operator;
 if op='bootstrap' then
   if exists(select 1 from pp_private.members where user_id=actor) then
     result=public.pp_api('bootstrap',actor,'{}');
   elsif is_operator then result='{}';
   else raise exception 'PP_FORBIDDEN'; end if;
   return result || jsonb_build_object('role',case when is_operator then 'operator' else 'business' end);
 end if;
 if op='passes_add' then
   select company_id into cid from pp_private.members where user_id=actor;
   if cid is null then raise exception 'PP_FORBIDDEN'; end if;
   perform 1 from pp_private.companies where id=cid for update;
   select * into batch from pp_private.pass_batches where id=(args->>'id')::uuid;
   if batch.id is not null then
     if batch.company_id<>cid then raise exception 'PP_FORBIDDEN'; end if;
     return jsonb_build_object('added',batch.quantity,'total',(select count(*) from pp_private.passes where company_id=cid));
   end if;
   amount=(args->>'quantity')::integer;
   if amount is null or amount<1 or amount>100 or jsonb_typeof(args->'tokens') is distinct from 'array' then raise exception 'PP_INVALID'; end if;
   if jsonb_array_length(args->'tokens')<>amount or exists(
     select 1 from jsonb_array_elements_text(args->'tokens') t(value) where value !~ '^[a-f0-9]{64}$'
   ) then raise exception 'PP_INVALID'; end if;
   select coalesce(max(number),0) into last_number from pp_private.passes where company_id=cid;
   insert into pp_private.pass_batches(id,company_id,quantity) values((args->>'id')::uuid,cid,amount);
   insert into pp_private.passes(company_id,number,token)
     select cid,last_number+n::integer,value from jsonb_array_elements_text(args->'tokens') with ordinality t(value,n);
   return jsonb_build_object('added',amount,'total',(select count(*) from pp_private.passes where company_id=cid));
 end if;
 if not is_operator then raise exception 'PP_FORBIDDEN'; end if;

 if op='operator_list' then
   return jsonb_build_object('companies',coalesce((select jsonb_agg(jsonb_build_object(
     'id',c.id,'name',c.profile->>'name','contact',c.profile->>'contact','email',c.profile->>'email',
     'passes',(select count(*) from pp_private.passes where company_id=c.id),
     'projects',(select count(*) from pp_private.projects where company_id=c.id),
     'active',exists(select 1 from pp_private.members where company_id=c.id),
     'invited',exists(select 1 from pp_private.access_invites where company_id=c.id and consumed_at is null and expires_at>now())
   ) order by lower(c.profile->>'name'),c.id) from pp_private.companies c),'[]'));
 end if;
 cid=(args->>'id')::uuid;
 if op='operator_create' then
   if cid is null or coalesce(length(trim(args->'profile'->>'name')),0)=0 then raise exception 'PP_INVALID'; end if;
   if jsonb_typeof(args->'tokens') is distinct from 'array' then raise exception 'PP_INVALID'; end if;
   if jsonb_array_length(args->'tokens')<>20 or exists(
     select 1 from jsonb_array_elements_text(args->'tokens') t(value) where value !~ '^[a-f0-9]{64}$'
   ) then raise exception 'PP_INVALID'; end if;
   insert into pp_private.companies(id,profile) values(cid,args->'profile') on conflict(id) do nothing;
   if found then
     insert into pp_private.passes(company_id,number,token)
       select cid,n::integer,value from jsonb_array_elements_text(args->'tokens') with ordinality t(value,n);
   end if;
 elsif op='operator_save' then
   if coalesce(length(trim(args->'profile'->>'name')),0)=0 then raise exception 'PP_INVALID'; end if;
   update pp_private.companies set profile=args->'profile',version=version+1
     where id=cid and version=(args->>'version')::integer;
   if not found then raise exception 'PP_CONFLICT'; end if;
 elsif op='operator_invite' then
   -- Match redemption lock order: invitation first, then its company.
   perform 1 from pp_private.access_invites where company_id=cid for update;
   perform 1 from pp_private.companies where id=cid for update;
   if not found then raise exception 'PP_NOT_FOUND'; end if;
   if exists(select 1 from pp_private.members where company_id=cid) then raise exception 'PP_ALREADY_ACTIVE'; end if;
   if coalesce(args->>'email','')='' or coalesce(args->>'token_hash','') !~ '^[a-f0-9]{64}$' then raise exception 'PP_INVALID'; end if;
   insert into pp_private.access_invites(kind,company_id,email,token_hash,created_by,expires_at)
     values('business',cid,lower(args->>'email'),args->>'token_hash',actor,now()+interval '7 days')
     on conflict(company_id) do update set email=excluded.email,token_hash=excluded.token_hash,
       created_by=actor,created_at=now(),expires_at=excluded.expires_at,consumed_at=null,attempts=0,last_attempt_at=null;
 elsif op<>'operator_company' then raise exception 'PP_INVALID';
 end if;
 select * into business from pp_private.companies where id=cid;
 if business.id is null then raise exception 'PP_NOT_FOUND'; end if;
 return jsonb_build_object('id',cid,'profile',business.profile,'version',business.version,
   'passes',(select count(*) from pp_private.passes where company_id=cid),
   'projects',(select count(*) from pp_private.projects where company_id=cid),
   'members',coalesce((select jsonb_agg(jsonb_build_object('email',login_email)) from pp_private.members where company_id=cid),'[]'),
   'invite',(select jsonb_build_object('email',email,'expires_at',expires_at,'used',consumed_at is not null)
     from pp_private.access_invites where company_id=cid));
end;
$$;
revoke all on function public.pp_control(text,uuid,jsonb) from public,anon,authenticated;
grant execute on function public.pp_control(text,uuid,jsonb) to service_role;
commit;
