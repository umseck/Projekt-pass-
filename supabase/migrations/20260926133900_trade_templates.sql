-- Per-business onboarding; template snapshot and fugenlos search; own operator workspace.
begin;
create or replace function public.pp_api(op text, actor uuid, args jsonb default '{}') returns jsonb
language plpgsql security invoker set search_path = '' as $$
declare
 cid uuid; pass pp_private.passes; project pp_private.projects;
 company pp_private.companies; result jsonb;
begin
 if op in ('scan','owner_save') then
   select * into pass from pp_private.passes where token=args->>'token' and not disabled;
   select * into project from pp_private.projects where pass_id=pass.id and status='handed_over' for update;
   if project.id is null then raise exception 'PP_NOT_FOUND'; end if;
   if op='owner_save' then
     if project.owner_key_hash is null or project.owner_key_hash is distinct from args->>'key_hash' then
       raise exception 'PP_FORBIDDEN';
     end if;
     if project.owner_version <> (args->>'version')::integer then raise exception 'PP_CONFLICT'; end if;
     if jsonb_typeof(args->'additions') <> 'array' or jsonb_array_length(args->'additions')>30 then
       raise exception 'PP_INVALID';
     end if;
     update pp_private.projects set owner_additions=args->'additions',owner_version=owner_version+1,
       updated_at=now() where id=project.id returning * into project;
   end if;
   return pp_private.customer_view(project,pass.number);
 end if;

 if actor is null then raise exception 'PP_UNAUTHORIZED'; end if;
 select company_id into cid from pp_private.members where user_id=actor;
 if cid is null then raise exception 'PP_FORBIDDEN'; end if;
 select * into company from pp_private.companies where id=cid;

 if op='bootstrap' then
   return jsonb_build_object('company',company.profile,'company_version',company.version,
    'passes',(select coalesce(jsonb_agg(jsonb_build_object('id',s.id,'number',s.number,'token',s.token,
      'disabled',s.disabled,'project_id',p.id) order by s.number),'[]')
      from pp_private.passes s left join pp_private.projects p on p.pass_id=s.id where s.company_id=cid),
    'projects',(select coalesce(jsonb_agg(jsonb_build_object('id',id,'title',title,'status',status,
      'pass_id',pass_id,'activated_at',activated_at,'internal',internal,'content',jsonb_build_object(
        'trade',content->'trade','tile',(content->'tile') - 'label_photo','grout',(content->'grout') - 'label_photo','silicone',(content->'silicone') - 'label_photo',
        'surface',(content->'surface') - 'label_photo','primer',(content->'primer') - 'label_photo','waterproofing',(content->'waterproofing') - 'label_photo','finish',(content->'finish') - 'label_photo'))
      order by activated_at desc),'[]') from pp_private.projects where company_id=cid));
 elsif op='company_save' then
   update pp_private.companies set profile=args->'profile',version=version+1
     where id=cid and version=(args->>'version')::integer returning * into company;
   if company.id is null then raise exception 'PP_CONFLICT'; end if;
   return jsonb_build_object('company',company.profile,'company_version',company.version);
 elsif op='activate' then
   select * into pass from pp_private.passes where id=(args->>'pass_id')::uuid and company_id=cid for update;
   if pass.id is null or pass.disabled then raise exception 'PP_NOT_FOUND'; end if;
   select * into project from pp_private.projects where pass_id=pass.id;
   -- Retrying an activation after a network interruption returns the existing project.
   if project.id is null then
     insert into pp_private.projects(pass_id,company_id,title,company_snapshot,content)
     values(pass.id,cid,args->>'title',company.profile - 'favorites' - 'care_notes',
       jsonb_build_object('trade',coalesce(company.profile->>'trade','tile'),'care_notes',coalesce(company.profile->'care_notes','{}')))
     returning * into project;
   end if;
 else
   select * into project from pp_private.projects where id=(args->>'id')::uuid and company_id=cid for update;
   if project.id is null then raise exception 'PP_NOT_FOUND'; end if;
   select * into pass from pp_private.passes where id=project.pass_id;
   if op not in ('project','preview') and project.version <> (args->>'version')::integer then
     raise exception 'PP_CONFLICT';
   end if;
   if op='save' then
     update pp_private.projects set title=args->>'title',
      content=(args->'content') || jsonb_build_object('trade',coalesce(project.content->>'trade','tile')),internal=args->'internal',
      version=version+1,updated_at=now() where id=project.id returning * into project;
   elsif op='handover' then
     update pp_private.projects set status='handed_over',handed_over_at=coalesce(handed_over_at,now()),
      version=version+1,updated_at=now() where id=project.id returning * into project;
   elsif op='owner_key' then
     update pp_private.projects set owner_key_hash=args->>'key_hash',version=version+1,
       updated_at=now() where id=project.id returning * into project;
   elsif op='visibility' then
     update pp_private.passes set disabled=(args->>'disabled')::boolean where id=pass.id;
     update pp_private.projects set version=version+1,updated_at=now() where id=project.id returning * into project;
   elsif op='delete' then
     -- Reuse is unsafe in a real pilot: the former customer still has the physical card.
     -- Retire the pass, never let an old NFC URL reveal the next customer's project.
     delete from pp_private.projects where id=project.id;
     update pp_private.passes set disabled=true where id=pass.id;
     return jsonb_build_object('deleted',true);
   elsif op='preview' then
     return pp_private.customer_view(project,pass.number) || jsonb_build_object('version',project.version);
   elsif op<>'project' then raise exception 'PP_INVALID';
   end if;
 end if;
 return to_jsonb(project) - 'owner_key_hash' || jsonb_build_object('pass_number',pass.number,
   'token',pass.token,'disabled',(select disabled from pp_private.passes where id=pass.id));
end;
$$;

revoke all on function public.pp_api(text,uuid,jsonb) from public,anon,authenticated;
grant execute on function public.pp_api(text,uuid,jsonb) to service_role;

create or replace function public.pp_control(op text, actor uuid, args jsonb default '{}') returns jsonb
language plpgsql security invoker set search_path = '' as $$
declare
 invite pp_private.access_invites;
 business pp_private.companies;
 cid uuid;
 result jsonb;
 is_operator boolean;
 new_business boolean;
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
   insert into pp_private.companies(id,profile) values(cid,(args->'profile') || '{"onboarding_complete":false}'::jsonb) on conflict(id) do nothing;
   new_business=found;
   if new_business then
     insert into pp_private.passes(company_id,number,token)
       select cid,n::integer,value from jsonb_array_elements_text(args->'tokens') with ordinality t(value,n);
   end if;
   if coalesce((args->>'use_for_me')::boolean,false) then
     -- Only a newly created business can be claimed; never an existing foreign business.
     if not new_business and not exists(select 1 from pp_private.members where user_id=actor and company_id=cid) then
       raise exception 'PP_FORBIDDEN';
     end if;
     insert into pp_private.members(user_id,company_id) values(actor,cid) on conflict(user_id) do nothing;
     if not exists(select 1 from pp_private.members where user_id=actor and company_id=cid) then
       raise exception 'PP_ACCOUNT_IN_USE';
     end if;
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
