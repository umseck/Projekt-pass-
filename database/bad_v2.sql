-- Additive Projektpass Bad schema. Does NOT rewrite existing projects or snapshots.
-- Apply once, transactionally, AFTER the existing schema/operator/workflow installation.
-- Canonical entity aggregates (areas, sections, scopes, uses, document versions/links,
-- care, maintenance, photos, internal notes) are versioned together in bad_drafts.
-- Server-only RPC. No SECURITY DEFINER, anonymous table access, or client role claims.
begin;
create table if not exists pp_private.bad_drafts (
 project_id uuid primary key references pp_private.projects(id),
 company_id uuid not null references pp_private.companies(id),
 data jsonb not null check(data->>'schema'='projektpass-bad/2'),
 version integer not null default 1 check(version>0),updated_at timestamptz not null default now()
);
create table if not exists pp_private.bad_releases (
 id uuid primary key,project_id uuid not null references pp_private.projects(id),
 company_id uuid not null references pp_private.companies(id),number integer not null check(number>0),
 snapshot jsonb not null check(snapshot->>'schema'='projektpass-bad/2'),
 sha256 text not null check(sha256 ~ '^[a-f0-9]{64}$'),request_id uuid not null,
 created_at timestamptz not null default now(),created_by uuid not null,
 unique(project_id,number),unique(project_id,request_id)
);
create table if not exists pp_private.bad_standards (
 id uuid primary key,company_id uuid not null references pp_private.companies(id),
 data jsonb not null,version integer not null default 1,updated_at timestamptz not null default now()
);
create table if not exists pp_private.bad_staff_links (
 id uuid primary key default gen_random_uuid(),project_id uuid not null references pp_private.projects(id),
 company_id uuid not null references pp_private.companies(id),token_hash text not null unique check(token_hash ~ '^[a-f0-9]{64}$'),
 label text not null,area_ids uuid[] not null,expires_at timestamptz not null default(now()+interval '14 days'),
 revoked boolean not null default false,created_at timestamptz not null default now()
);
create table if not exists pp_private.bad_contributions (
 id uuid primary key,project_id uuid not null references pp_private.projects(id),
 link_id uuid not null references pp_private.bad_staff_links(id),data jsonb not null,
 status text not null default 'pending' check(status in ('pending','reviewed','declined')),
 created_at timestamptz not null default now(),reviewed_by uuid,reviewed_at timestamptz
);
create index if not exists bad_releases_company on pp_private.bad_releases(company_id,project_id);
create index if not exists bad_standards_company on pp_private.bad_standards(company_id);
create index if not exists bad_staff_project on pp_private.bad_staff_links(project_id);
create index if not exists bad_contributions_project on pp_private.bad_contributions(project_id);
do $$ declare t text;begin foreach t in array array['bad_drafts','bad_releases','bad_standards','bad_staff_links','bad_contributions'] loop
 execute format('alter table pp_private.%I enable row level security',t);
 execute format('revoke all on pp_private.%I from public, anon, authenticated',t);
 execute format('grant select,insert,update,delete on pp_private.%I to service_role',t);
 if not exists(select 1 from pg_policies where schemaname='pp_private' and tablename=t and policyname='no_direct_access') then
 execute format('create policy no_direct_access on pp_private.%I for all to anon,authenticated using(false) with check(false)',t);end if;
 end loop;end $$;
create or replace function pp_private.bad_immutable() returns trigger language plpgsql security invoker set search_path='' as $$
begin raise exception 'PP_BAD_IMMUTABLE';end;$$;
revoke all on function pp_private.bad_immutable() from public,anon,authenticated;
grant execute on function pp_private.bad_immutable() to service_role;
drop trigger if exists bad_release_immutable on pp_private.bad_releases;
create trigger bad_release_immutable before update or delete on pp_private.bad_releases for each row execute function pp_private.bad_immutable();
create or replace function public.pp_bad(op text,actor uuid,args jsonb default '{}') returns jsonb
language plpgsql security invoker set search_path='' as $$
declare cid uuid;p pp_private.projects;s pp_private.passes;d pp_private.bad_drafts;
 r pp_private.bad_releases;l pp_private.bad_staff_links;n integer;rowid uuid;areas jsonb;sections jsonb;
begin
 if op='bad_read' then
  select * into s from pp_private.passes where token=args->>'token' and not disabled;
  select * into p from pp_private.projects where pass_id=s.id;
  select * into r from pp_private.bad_releases where project_id=p.id and
    (coalesce((args->>'number')::integer,0)=0 or number=(args->>'number')::integer) order by number desc limit 1;
  if r.id is null then return jsonb_build_object('snapshot',null);end if;
  return jsonb_build_object('snapshot',r.snapshot,'sha256',r.sha256,'versions',
    (select jsonb_agg(jsonb_build_object('number',number,'id',id,'published_at',created_at,'kind',snapshot->'release'->>'kind','reason',snapshot->'release'->>'reason') order by number desc)
     from pp_private.bad_releases where project_id=p.id));
 end if;
 if op in ('bad_worker_get','bad_contribute') then
  select * into l from pp_private.bad_staff_links where token_hash=args->>'token_hash' and not revoked and expires_at>now();
  if l.id is null then raise exception 'PP_FORBIDDEN';end if;
  select * into p from pp_private.projects where id=l.project_id;
  select * into d from pp_private.bad_drafts where project_id=l.project_id;
  if d.project_id is null then raise exception 'PP_NOT_FOUND';end if;
  if op='bad_contribute' then
   if not ((args->'contribution'->>'area_id')::uuid=any(l.area_ids)) then raise exception 'PP_FORBIDDEN';end if;
   if not exists(select 1 from jsonb_array_elements(d.data->'areas') a where a->>'id'=args->'contribution'->>'area_id') or
    not exists(select 1 from jsonb_array_elements(d.data->'sections') section where section->>'id'=args->'contribution'->>'section_id'
     and section->'area_ids' ? (args->'contribution'->>'area_id')) then raise exception 'PP_FORBIDDEN';end if;
   if jsonb_array_length(coalesce(d.data->'photos','[]'))>12 or (select count(*) from pp_private.bad_contributions where link_id=l.id and created_at>now()-interval '1 day')>=100 then raise exception 'PP_LIMIT';end if;
   insert into pp_private.bad_contributions(id,project_id,link_id,data)
     values((args->'contribution'->>'id')::uuid,l.project_id,l.id,args->'contribution') on conflict(id) do nothing;
   return jsonb_build_object('received',true,'notice','Beitrag bereitgestellt, nicht veröffentlicht.');
  end if;
  select coalesce(jsonb_agg(jsonb_build_object('id',a->>'id','name',a->>'name','type',a->>'type')),'[]') into areas
   from jsonb_array_elements(d.data->'areas') a where (a->>'id')::uuid=any(l.area_ids);
  select coalesce(jsonb_agg(jsonb_build_object('id',section->>'id','description',section->>'description','area_ids',
   (select coalesce(jsonb_agg(a),'[]') from jsonb_array_elements_text(section->'area_ids') a where a::uuid=any(l.area_ids)))),'[]') into sections
   from jsonb_array_elements(d.data->'sections') section where exists(select 1 from jsonb_array_elements_text(section->'area_ids') a where a::uuid=any(l.area_ids));
  return jsonb_build_object('role','contributor','title',d.data->'project'->>'title','areas',areas,'sections',sections,'label',l.label,'expires_at',l.expires_at);
 end if;
 if actor is null then raise exception 'PP_UNAUTHORIZED';end if;
 select company_id into cid from pp_private.members where user_id=actor;
 if cid is null then raise exception 'PP_FORBIDDEN';end if;
 if op='bad_summary' then return jsonb_build_object('projects',(select coalesce(jsonb_agg(jsonb_build_object('id',project_id,'title',data->'project'->>'title','releases',(select count(*) from pp_private.bad_releases br where br.project_id=bd.project_id))),'[]') from pp_private.bad_drafts bd where company_id=cid));end if;
 select * into p from pp_private.projects where id=(args->>'id')::uuid and company_id=cid;
 if p.id is null then raise exception 'PP_NOT_FOUND';end if;
 select * into s from pp_private.passes where id=p.pass_id;
 select * into d from pp_private.bad_drafts where project_id=p.id for update;
 if op='bad_get' then
  select * into r from pp_private.bad_releases where project_id=p.id order by number desc limit 1;
  return jsonb_build_object('id',p.id,'draft',d.data,'version',coalesce(d.version,0),'pass_number',s.number,'pass_token',s.token,
   'legacy',jsonb_build_object('id',p.id,'title',p.title,'content',p.content,'internal',p.internal,'handover_snapshot',p.handover_snapshot),
   'company',(select profile from pp_private.companies where id=cid),'role','responsible',
   'latest',case when r.id is null then null else jsonb_build_object('id',r.id,'snapshot',r.snapshot,'sha256',r.sha256) end,
   'releases',(select coalesce(jsonb_agg(jsonb_build_object('id',id,'number',number,'published_at',created_at,'request_id',request_id,'kind',snapshot->'release'->>'kind') order by number),'[]') from pp_private.bad_releases where project_id=p.id),
   'standards',(select coalesce(jsonb_agg(data order by updated_at desc),'[]') from pp_private.bad_standards where company_id=cid),
   'contributions',(select coalesce(jsonb_agg(jsonb_build_object('id',c.id,'data',c.data,'status',c.status,'created_at',c.created_at,'by',worker_link.label) order by c.created_at),'[]') from pp_private.bad_contributions c join pp_private.bad_staff_links worker_link on worker_link.id=c.link_id where c.project_id=p.id),
   'staff_links',(select coalesce(jsonb_agg(jsonb_build_object('id',id,'label',label,'area_ids',area_ids,'expires_at',expires_at,'revoked',revoked)),'[]') from pp_private.bad_staff_links where project_id=p.id));
 elsif op='bad_save' then
  if coalesce(d.version,0)<>(args->>'version')::integer then raise exception 'PP_CONFLICT';end if;
  if d.project_id is null then
   insert into pp_private.bad_drafts(project_id,company_id,data) values(p.id,cid,args->'draft') on conflict(project_id) do nothing returning * into d;
   if d.project_id is null then raise exception 'PP_CONFLICT';end if;
  else update pp_private.bad_drafts set data=args->'draft',version=version+1,updated_at=now() where project_id=p.id returning * into d;end if;
  -- Existing released legacy projects are not touched, including title and execution dates.
  if p.status='draft' and p.handover_snapshot is null then update pp_private.projects set title=args->'draft'->'project'->>'title' where id=p.id;end if;
  return jsonb_build_object('version',d.version,'saved_at',d.updated_at);
 elsif op='bad_publish' then
  select * into r from pp_private.bad_releases where project_id=p.id and request_id=(args->>'request_id')::uuid;
  if r.id is not null then return jsonb_build_object('release',jsonb_build_object('id',r.id,'number',r.number),'version',d.version);end if;
  if d.project_id is null or d.version<>(args->>'version')::integer then raise exception 'PP_CONFLICT';end if;
  select coalesce(max(number),0)+1 into n from pp_private.bad_releases where project_id=p.id;
  if (args->'snapshot'->'release'->>'number')::integer<>n then raise exception 'PP_CONFLICT';end if;
  insert into pp_private.bad_releases(id,project_id,company_id,number,snapshot,sha256,request_id,created_by)
    values((args->'snapshot'->'release'->>'id')::uuid,p.id,cid,n,args->'snapshot',args->>'sha256',(args->>'request_id')::uuid,actor) returning * into r;
  update pp_private.bad_drafts set version=version+1,updated_at=now() where project_id=p.id returning * into d;
  return jsonb_build_object('release',jsonb_build_object('id',r.id,'number',r.number,'published_at',r.created_at),'version',d.version);
 elsif op='bad_standard_save' then
  rowid=(args->'standard'->>'id')::uuid;
  if exists(select 1 from pp_private.bad_standards where id=rowid and company_id<>cid) then raise exception 'PP_FORBIDDEN';end if;
  insert into pp_private.bad_standards(id,company_id,data) values(rowid,cid,args->'standard')
   on conflict(id) do update set data=excluded.data,version=pp_private.bad_standards.version+1,updated_at=now() where pp_private.bad_standards.company_id=cid;
  return jsonb_build_object('saved',true);
 elsif op='bad_staff_create' then
  if d.project_id is null then raise exception 'PP_NOT_FOUND';end if;
  if exists(select 1 from jsonb_array_elements_text(args->'area_ids') a where not exists(select 1 from jsonb_array_elements(d.data->'areas') area where area->>'id'=a)) then raise exception 'PP_FORBIDDEN';end if;
  insert into pp_private.bad_staff_links(project_id,company_id,token_hash,label,area_ids)
   values(p.id,cid,args->>'token_hash',args->>'label',array(select a::uuid from jsonb_array_elements_text(args->'area_ids') a)) returning * into l;
  return jsonb_build_object('id',l.id,'expires_at',l.expires_at);
 elsif op='bad_staff_revoke' then
  update pp_private.bad_staff_links set revoked=true where id=(args->>'link_id')::uuid and project_id=p.id and company_id=cid;
  return jsonb_build_object('revoked',true);
 elsif op='bad_review' then
  update pp_private.bad_contributions set status=args->>'status',reviewed_by=actor,reviewed_at=now() where id=(args->>'contribution_id')::uuid and project_id=p.id;
  return jsonb_build_object('reviewed',true);
 else raise exception 'PP_INVALID';end if;
end;$$;
revoke all on function public.pp_bad(text,uuid,jsonb) from public,anon,authenticated;
grant execute on function public.pp_bad(text,uuid,jsonb) to service_role;
commit;
