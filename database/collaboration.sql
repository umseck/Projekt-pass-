-- Additive upgrade after schema.sql. Apply once, in one transaction.
begin;
alter table pp_private.projects add column owner_claimed boolean not null default false;
create table pp_private.participants (
 id uuid primary key default gen_random_uuid(),
 project_id uuid not null references pp_private.projects(id) on delete cascade,
 label text not null check(length(label) between 1 and 100),
 key_hash text not null check(key_hash ~ '^[a-f0-9]{64}$'),
 phase text not null check(phase in ('draft','handed_over')),
 revoked boolean not null default false,
 entry jsonb not null default '{}',
 version integer not null default 1,
 updated_at timestamptz not null default now()
);
create index on pp_private.participants(project_id);
create table pp_private.site_notes (
 id uuid primary key default gen_random_uuid(),
 project_id uuid not null references pp_private.projects(id) on delete cascade,
 author text not null,
 author_ref text not null,
 note jsonb not null,
 created_at timestamptz not null default now()
);
create index on pp_private.site_notes(project_id);
alter table pp_private.participants enable row level security;
alter table pp_private.site_notes enable row level security;
create policy participants_no_direct_access on pp_private.participants for all to anon,authenticated using(false) with check(false);
create policy notes_no_direct_access on pp_private.site_notes for all to anon,authenticated using(false) with check(false);
revoke all on pp_private.participants,pp_private.site_notes from public,anon,authenticated;
grant select,insert,update,delete on pp_private.participants,pp_private.site_notes to service_role;

create function pp_private.notes(pid uuid) returns jsonb language sql stable security invoker set search_path='' as $$
 select coalesce(jsonb_agg(jsonb_build_object('id',id,'author',author,'note',note,'created_at',created_at) order by created_at desc),'[]') from pp_private.site_notes where project_id=pid;
$$;
create function pp_private.trades(pid uuid) returns jsonb language sql stable security invoker set search_path='' as $$
 select coalesce(jsonb_agg(jsonb_build_object('id',id,'label',label,'entry',entry,'version',version,'updated_at',updated_at,'revoked',revoked) order by updated_at),'[]') from pp_private.participants where project_id=pid;
$$;
revoke all on function pp_private.notes(uuid),pp_private.trades(uuid) from public,anon,authenticated;
grant execute on function pp_private.notes(uuid),pp_private.trades(uuid) to service_role;
-- Keep the previous tested business operations private, never expose a bypass API.
alter function public.pp_api(text,uuid,jsonb) set schema pp_private;
alter function pp_private.pp_api(text,uuid,jsonb) rename to base_api;
create function public.pp_api(op text,actor uuid,args jsonb default '{}') returns jsonb
language plpgsql security invoker set search_path='' as $$
declare p pp_private.projects; s pp_private.passes; t pp_private.participants; cid uuid; r jsonb; author_name text;
begin
 if op in ('scan','owner_save','owner_manage','owner_invite','owner_revoke','trade_open','trade_save','trade_note','trade_resolve') then
   select * into s from pp_private.passes where token=args->>'token' and not disabled;
   select * into p from pp_private.projects where pass_id=s.id for update;
   if p.id is null then raise exception 'PP_NOT_FOUND'; end if;
   if op='scan' then
     if p.status='draft' then
       return jsonb_build_object('phase','construction','pass_number',s.number,'notes',pp_private.notes(p.id));
     end if;
     return pp_private.base_api(op,actor,args)||jsonb_build_object('trades',pp_private.trades(p.id));
   end if;
   if op like 'owner_%' then
     if p.status<>'handed_over' or p.owner_key_hash is null or p.owner_key_hash is distinct from args->>'key_hash' then raise exception 'PP_FORBIDDEN'; end if;
     update pp_private.projects set owner_claimed=true where id=p.id;
     if op='owner_save' then return pp_private.base_api(op,actor,args); end if;
     if op='owner_manage' then return jsonb_build_object('trades',pp_private.trades(p.id)); end if;
     if op='owner_revoke' then
       update pp_private.participants set revoked=true where id=(args->>'participant_id')::uuid and project_id=p.id;
       if not found then raise exception 'PP_NOT_FOUND'; end if;
       return jsonb_build_object('ok',true);
     end if;
   else
     select * into t from pp_private.participants where id=(args->>'participant_id')::uuid and project_id=p.id;
     if t.id is null or t.revoked or t.phase<>p.status or t.key_hash is distinct from args->>'key_hash' then raise exception 'PP_FORBIDDEN'; end if;
     if op='trade_save' then
       if t.version<>(args->>'version')::integer then raise exception 'PP_CONFLICT'; end if;
       update pp_private.participants set entry=args->'entry',version=version+1,updated_at=now() where id=t.id returning * into t;
     elsif op in ('trade_note','trade_resolve') then
       if p.status<>'draft' then raise exception 'PP_FORBIDDEN'; end if;
       author_name=t.label;
     end if;
     if op not in ('trade_note','trade_resolve') then
       return jsonb_build_object('phase',p.status,'participant_id',t.id,'label',t.label,'entry',t.entry,'version',t.version,'notes',case when p.status='draft' then pp_private.notes(p.id) else '[]'::jsonb end);
     end if;
   end if;
 else
   if actor is null then raise exception 'PP_UNAUTHORIZED'; end if;
   select company_id into cid from pp_private.members where user_id=actor;
   if cid is null then raise exception 'PP_FORBIDDEN'; end if;
   if op not in ('bootstrap','company_save','activate') then
     select * into p from pp_private.projects where id=(args->>'id')::uuid and company_id=cid for update;
     if p.id is null then raise exception 'PP_NOT_FOUND'; end if;
     select * into s from pp_private.passes where id=p.pass_id;
   end if;
   if op in ('site_invite','site_revoke','site_note','site_resolve') then
     if p.status<>'draft' or s.disabled then raise exception 'PP_FORBIDDEN'; end if;
     if op='site_revoke' then
       update pp_private.participants set revoked=true where id=(args->>'participant_id')::uuid and project_id=p.id;
       if not found then raise exception 'PP_NOT_FOUND'; end if;
       return jsonb_build_object('ok',true);
     end if;
     select profile->>'name' into author_name from pp_private.companies where id=cid;
   else
     if op='owner_key' and p.owner_claimed then raise exception 'PP_FORBIDDEN'; end if;
     -- After owner takeover, the creating business cannot destroy or lock their customer's map.
     if p.owner_claimed and op in ('delete','visibility') then raise exception 'PP_FORBIDDEN'; end if;
     if op='handover' then
       if s.disabled then raise exception 'PP_FORBIDDEN'; end if;
       if p.status<>'draft' then raise exception 'PP_CONFLICT'; end if;
       update pp_private.participants set revoked=true where project_id=p.id;
       delete from pp_private.site_notes where project_id=p.id;
     end if;
     r=pp_private.base_api(op,actor,args);
     if r ? 'id' then
       -- No owner additions or editing secrets in business results.
       r=r-'owner_additions'-'owner_version'-'owner_key_hash';
       if op='preview' then r=r||jsonb_build_object('phase',p.status,'trades',case when p.status='draft' then pp_private.trades(p.id) else '[]'::jsonb end); end if;
       if op<>'preview' then
         r=r||jsonb_build_object('notes',case when r->>'status'='draft' then pp_private.notes((r->>'id')::uuid) else '[]'::jsonb end,
          'trades',case when r->>'status'='draft' then pp_private.trades((r->>'id')::uuid) else '[]'::jsonb end);
       end if;
     end if;
     return r;
   end if;
 end if;
 if op in ('site_invite','owner_invite') then
   if op='owner_invite' and args ? 'participant_id' then
     update pp_private.participants set key_hash=args->>'invite_hash',phase='handed_over',revoked=false,version=version+1
       where id=(args->>'participant_id')::uuid and project_id=p.id returning * into t;
     if t.id is null then raise exception 'PP_NOT_FOUND'; end if;
   else
     if (select count(*) from pp_private.participants where project_id=p.id)>=20 then raise exception 'PP_LIMIT'; end if;
     insert into pp_private.participants(project_id,label,key_hash,phase) values(p.id,args->>'label',args->>'invite_hash',p.status) returning * into t;
   end if;
   return jsonb_build_object('participant_id',t.id,'label',t.label);
 end if;
 if op in ('site_resolve','trade_resolve') then
   delete from pp_private.site_notes where id=(args->>'note_id')::uuid and project_id=p.id and author_ref=coalesce(t.id::text,cid::text);
   if not found then raise exception 'PP_FORBIDDEN'; end if;
   return jsonb_build_object('notes',pp_private.notes(p.id));
 end if;
 if op in ('site_note','trade_note') then
   if (select count(*) from pp_private.site_notes where project_id=p.id)>=100 then raise exception 'PP_LIMIT'; end if;
   insert into pp_private.site_notes(project_id,author,author_ref,note) values(p.id,author_name,coalesce(t.id::text,cid::text),args->'note');
   return jsonb_build_object('notes',pp_private.notes(p.id));
 end if;
 raise exception 'PP_INVALID';
end;
$$;
revoke all on function public.pp_api(text,uuid,jsonb) from public,anon,authenticated;
grant execute on function public.pp_api(text,uuid,jsonb) to service_role;
commit;
