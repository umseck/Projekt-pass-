-- Update existing installations; no project data is rewritten.
begin;
create or replace function pp_private.customer_view(p pp_private.projects, n integer) returns jsonb
language sql stable security invoker set search_path = '' as $$
 select jsonb_build_object('id',p.id,'title',p.title,'pass_number',n,
 'activated_at',p.activated_at,'company',coalesce(
   (select c.profile - 'favorites' - 'care_notes' - 'standards' from pp_private.companies c where c.id=p.company_id),
   p.company_snapshot),
 'content',p.content,'owner_additions',p.owner_additions,'owner_version',p.owner_version);
$$;
revoke all on function pp_private.customer_view(pp_private.projects,integer) from public,anon,authenticated;
grant execute on function pp_private.customer_view(pp_private.projects,integer) to service_role;

-- The browser has NO execute permission. actor comes from /auth/v1/user,
-- never from a request body. No SECURITY DEFINER and no user metadata roles.
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
     values(pass.id,cid,args->>'title',company.profile - 'favorites' - 'care_notes' - 'standards',
       coalesce(company.profile->'standards'->coalesce(company.profile->>'trade','tile'),'{}'::jsonb) ||
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
commit;
