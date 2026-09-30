begin;
alter table pp_private.messages add column if not exists needs_reply boolean not null default false;
alter table pp_private.messages add column if not exists resolved boolean not null default false;
alter table pp_private.messages add column if not exists reply_to uuid references pp_private.messages(id);
create or replace function public.pp_flow(op text,actor uuid,args jsonb default '{}') returns jsonb
language plpgsql security invoker set search_path='' as $$
declare p pp_private.projects; c pp_private.companies; person pp_private.participants; rowp pp_private.participants;
 parent pp_private.messages; mid uuid; ids uuid[]; out jsonb; bodytext text; affected integer;
begin
 if op in ('flow_portal','flow_reply') then
  select * into person from pp_private.participants where token=args->>'token' and not revoked;
  if person.id is null then raise exception 'PP_NOT_FOUND'; end if;
  select * into p from pp_private.projects where id=person.project_id;
 -- Legacy owner-journal lookup retained for existing database compatibility;
 -- no current application operation routes here.
 elsif op='flow_owner_entry' then
  select p0.* into p from pp_private.projects p0 join pp_private.passes s on s.id=p0.pass_id where s.token=args->>'token' and not s.disabled and p0.status='handed_over';
  if p.id is null then raise exception 'PP_NOT_FOUND'; end if;
  if p.owner_key_hash is null or p.owner_key_hash is distinct from args->>'key_hash' then raise exception 'PP_FORBIDDEN'; end if;
 else
  if actor is null then raise exception 'PP_UNAUTHORIZED'; end if;
  select p0.* into p from pp_private.projects p0 join pp_private.members m on m.company_id=p0.company_id where p0.id=(args->>'project_id')::uuid and m.user_id=actor;
 end if;
 if p.id is null then raise exception 'PP_NOT_FOUND'; end if;
 -- Serialize project activity and all idempotency/rate checks.
 select * into p from pp_private.projects where id=p.id for update;
 if person.id is not null and exists(select 1 from pp_private.passes where id=p.pass_id and disabled) then raise exception 'PP_NOT_FOUND'; end if;
 select * into c from pp_private.companies where id=p.company_id;
 if p.status='handed_over' and op in ('flow_post','flow_reply','flow_resolve') then raise exception 'PP_HANDOVER_LOCKED'; end if;
 if op='flow_resolve' then
  update pp_private.messages set resolved=coalesce((args->>'resolved')::boolean,false) where id=(args->>'id')::uuid and project_id=p.id and needs_reply;
  if not found then raise exception 'PP_NOT_FOUND'; end if;
  return jsonb_build_object('ok',true);
 elsif op='flow_participant' then
  if not exists(select 1 from pp_private.participants where id=(args->>'id')::uuid and project_id=p.id) then
   if (select count(*) from pp_private.participants where project_id=p.id and not revoked)>=20 then raise exception 'PP_LIMIT'; end if;
   if exists(select 1 from pp_private.participants where project_id=p.id and email=args->>'email' and not revoked) then raise exception 'PP_PARTICIPANT_EXISTS'; end if;
   insert into pp_private.participants(id,project_id,name,email,role,token) values((args->>'id')::uuid,p.id,args->>'name',args->>'email',args->>'role',args->>'access_token');
  end if;
  select * into rowp from pp_private.participants where id=(args->>'id')::uuid and project_id=p.id;
  if rowp.id is null or rowp.revoked then raise exception 'PP_NOT_FOUND'; end if;
  insert into pp_private.mail_outbox(project_id,participant_id,event_id,email,subject,body) values(p.id,rowp.id,rowp.id,rowp.email,'PROJEKTPASS: Einladung',
   'Sie wurden zum Projekt „'||p.title||'“ eingeladen. Ihr persönlicher Zugang (nicht weitergeben): '||(args->>'origin')||'/#site/'||rowp.token) on conflict(event_id,email) do nothing;
  return jsonb_build_object('access_link',args->>'origin'||'/#site/'||rowp.token);
 elsif op='flow_link' then
  select * into rowp from pp_private.participants where id=(args->>'id')::uuid and project_id=p.id and not revoked;
  if rowp.id is null then raise exception 'PP_NOT_FOUND'; end if;
  return jsonb_build_object('access_link',(args->>'origin')||'/#site/'||rowp.token);
 elsif op='flow_revoke' then
  update pp_private.participants set revoked=true where id=(args->>'id')::uuid and project_id=p.id;
  update pp_private.mail_outbox set status='cancelled' where project_id=p.id and participant_id=(args->>'id')::uuid and status in ('pending','error');
  return jsonb_build_object('ok',true);
 elsif op in ('flow_post','flow_reply') then
  mid=(args->>'id')::uuid;
  if exists(select 1 from pp_private.messages where id=mid and project_id=p.id and author_participant is not distinct from person.id) then return jsonb_build_object('ok',true); end if;
  if person.id is not null and (select count(*) from pp_private.messages where author_participant=person.id and created_at>now()-interval '1 hour')>=20 then raise exception 'PP_RATE_LIMIT'; end if;
  if (select count(*) from pp_private.messages where project_id=p.id)>=500 then raise exception 'PP_LIMIT'; end if;
  ids=array(select distinct value::uuid from jsonb_array_elements_text(coalesce(args->'recipients','[]')));
  if exists(select 1 from unnest(ids) x where not exists(select 1 from pp_private.participants where id=x and project_id=p.id and not revoked)) then raise exception 'PP_FORBIDDEN'; end if;
  if person.id is not null or coalesce((args->>'internal')::boolean,false) then ids='{}'; end if;
  if person.id is not null and coalesce((args->>'shared')::boolean,false) then
   ids=array(select id from pp_private.participants where project_id=p.id and not revoked);
  end if;
  if args->>'reply_to' is not null then
   select * into parent from pp_private.messages where id=(args->>'reply_to')::uuid and project_id=p.id;
   if parent.id is null or (person.id is not null and (parent.internal or not coalesce(person.id=any(parent.recipients) or parent.author_participant=person.id,false))) then raise exception 'PP_FORBIDDEN'; end if;
   ids=array(select distinct x from unnest(parent.recipients||array[parent.author_participant]) x join pp_private.participants r on r.id=x where r.project_id=p.id and not r.revoked);
  end if;
  insert into pp_private.messages(id,project_id,author_participant,author_name,body,photos,documents,recipients,internal,needs_reply,reply_to)
   values(mid,p.id,person.id,coalesce(person.name,c.profile->>'name'),args->>'body',coalesce(args->'photos','[]'),coalesce(args->'documents','[]'),ids,case when parent.id is not null then parent.internal when person.id is not null then false else coalesce((args->>'internal')::boolean,false) end,coalesce((args->>'needs_reply')::boolean,false),parent.id);
  if coalesce((args->>'notify')::boolean,false) then
   for rowp in select * from pp_private.participants where id=any(ids) and id is distinct from person.id loop
    insert into pp_private.mail_outbox(project_id,participant_id,event_id,email,subject,body) values(p.id,rowp.id,mid,rowp.email,'PROJEKTPASS: Neue Mitteilung',
     'Im Projekt „'||p.title||'“ gibt es eine neue Mitteilung. Persönlichen Zugang öffnen: '||(args->>'origin')||'/#site/'||rowp.token) on conflict(event_id,email) do nothing;
   end loop;
  end if;
  if person.id is not null and coalesce((args->>'notify')::boolean,false) and coalesce(c.profile->>'email','')<>'' then
   insert into pp_private.mail_outbox(project_id,event_id,email,subject,body) values(p.id,mid,c.profile->>'email','PROJEKTPASS: Neue Rückmeldung',
    'Im Projekt „'||p.title||'“ gibt es eine Rückmeldung. Ansehen und antworten: '||(args->>'origin')||'/#work/'||p.id) on conflict(event_id,email) do nothing;
  end if;
  return jsonb_build_object('ok',true,'dispatch_project',p.id,'dispatch_actor',(select user_id from pp_private.members where company_id=p.company_id limit 1));
 -- Legacy journal write branch retained for existing database compatibility.
 -- The application server no longer accepts these operations.
 elsif op in ('flow_entry','flow_owner_entry') then
  if p.status<>'handed_over' then raise exception 'PP_NOT_HANDED_OVER'; end if;
  if (select count(*) from pp_private.journal where project_id=p.id and created_at>now()-interval '1 hour')>=30 then raise exception 'PP_RATE_LIMIT'; end if;
  insert into pp_private.journal(id,project_id,kind,title,body,performed_on,next_due,photos,documents,author_name,source)
    values((args->>'id')::uuid,p.id,args->>'kind',args->>'title',args->>'body',(args->>'performed_on')::date,nullif(args->>'next_due','')::date,
    coalesce(args->'photos','[]'),coalesce(args->'documents','[]'),case when op='flow_owner_entry' then 'Eigentümer' else c.profile->>'name' end,case when op='flow_owner_entry' then 'owner' else 'business' end)
    on conflict(id) do nothing;
  return jsonb_build_object('ok',true);
 elsif op='flow_mail_claim' then
  -- No browser-accessible claim endpoint: called only by the trusted server.
  with picked as (select o.id from pp_private.mail_outbox o where o.project_id=p.id and (o.status in ('pending','error') or (o.status='sending' and o.lease_until<now())) and o.attempts<5
    and not exists(select 1 from pp_private.participants x where x.id=o.participant_id and x.revoked) order by o.created_at limit 20 for update skip locked),
  claimed as (update pp_private.mail_outbox o set status='sending',attempts=attempts+1,lease_until=now()+interval '5 minutes' from picked where o.id=picked.id returning o.*)
  select coalesce(jsonb_agg(to_jsonb(claimed)),'[]') into out from claimed;
  return out;
 elsif op='flow_mail_result' then
  update pp_private.mail_outbox set status=case when args->>'provider_id'<>'' then 'sent' else 'error' end,provider_id=nullif(args->>'provider_id',''),lease_until=null
   where id=(args->>'id')::uuid and project_id=p.id and status='sending';
  return jsonb_build_object('ok',true);
 elsif op not in ('flow_get','flow_portal','flow_dispatch') then raise exception 'PP_NOT_FOUND';
 end if;
 if person.id is not null then
  return jsonb_build_object('id',p.id,'title',p.title,'status',p.status,'name',person.name,'company',c.profile->>'name',
   'messages',coalesce((select jsonb_agg(to_jsonb(m)-'project_id'-'recipients'-'author_participant' order by m.created_at desc) from pp_private.messages m where m.project_id=p.id and not m.internal and (person.id=any(m.recipients) or m.author_participant=person.id)),'[]'),
   'customer_token',case when p.status='handed_over' and person.role='customer' then (select token from pp_private.passes where id=p.pass_id) else null end);
 end if;
 return jsonb_build_object('id',p.id,'title',p.title,'status',p.status,'snapshot',p.handover_snapshot,
  'participants',coalesce((select jsonb_agg(to_jsonb(x)-'token'-'project_id' order by x.created_at) from pp_private.participants x where x.project_id=p.id),'[]'),
  'messages',coalesce((select jsonb_agg(to_jsonb(m)-'project_id' order by m.created_at desc) from pp_private.messages m where m.project_id=p.id),'[]'),
  'mail',coalesce((select jsonb_agg(jsonb_build_object('id',o.id,'email',o.email,'status',o.status,'attempts',o.attempts,'created_at',o.created_at) order by o.created_at desc) from pp_private.mail_outbox o where o.project_id=p.id),'[]'));
end;$$;
revoke all on function public.pp_flow(text,uuid,jsonb) from public,anon,authenticated;
grant execute on function public.pp_flow(text,uuid,jsonb) to service_role;
commit;
