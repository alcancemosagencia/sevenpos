import {beforeEach,describe,expect,it,vi} from 'vitest';
import {PlatformRpcCompatibilityAdapter,calendarPeriodEnd,isSignatureMismatch,legacyGrantArguments} from '../platform/services/PlatformRpcCompatibilityAdapter';
import {PlatformAdminService} from '../platform/services/PlatformAdminService';
const {rpc}=vi.hoisted(()=>({rpc:vi.fn()}));
vi.mock('../infrastructure/cloud/supabaseClient',()=>({getSupabaseClient:()=>({rpc})}));
const missing={code:'PGRST202',message:'Could not find the function public.platform_list_businesses(p_limit, p_offset) in the schema cache'};
const row={business_id:'business',business_name:'QA',country_code:'VE',owner_name:'Owner',owner_email:'qa@example.invalid',
 plan_code:'PRO',subscription_status:'PAST_DUE',billing_source:'MANUAL',current_period_end:'2027-01-01'};
const list={items:[row],total_count:1,limit:10,offset:20};
const grant={businessId:'business',reason:'TESTER' as const,interval:'MONTHLY' as const,startAt:'2026-01-31T12:00:00Z'};
describe('Platform bridge dual contract',()=>{
 let adapter:PlatformRpcCompatibilityAdapter;
 beforeEach(()=>{rpc.mockReset();adapter=new PlatformRpcCompatibilityAdapter();});
 it('canonical list sends filters and aligned pagination without a fallback',async()=>{
  rpc.mockResolvedValue({data:list,error:null});
  const result=await adapter.list({search:'QA',country:'VE',plan:'PRO',subscriptionStatus:'PAST_DUE',billingSource:'MANUAL',limit:10,offset:20});
  expect(result.items[0]).toMatchObject({effectivePlan:'PRO',deviceCount:null,cloudMembershipCount:null,lastActivityAt:null});
  expect(adapter.getVersion()).toBe('PLATFORM01B');expect(rpc).toHaveBeenCalledTimes(1);
  expect(rpc).toHaveBeenCalledWith('platform_list_businesses',{p_search:'QA',p_country:'VE',p_plan:'PRO',p_subscription_status:'PAST_DUE',p_billing_source:'MANUAL',p_limit:10,p_offset:20});
 });
 it('legacy read fallback maps only the deterministic missing signature',async()=>{
  rpc.mockResolvedValueOnce({data:null,error:missing}).mockResolvedValueOnce({data:{items:[{...row,active_devices_count:2,active_members_count:3}],total_count:1},error:null});
  const result=await adapter.list({subscriptionStatus:'PAST_DUE',billingSource:'MANUAL',limit:10,offset:20});
  expect(adapter.getVersion()).toBe('LEGACY');expect(result.items[0].deviceCount).toBe(2);expect(result.items[0].cloudMembershipCount).toBe(3);
  expect(rpc).toHaveBeenLastCalledWith('platform_list_businesses',{p_search:null,p_country:null,p_plan:null,p_status:'PAST_DUE',p_source:'MANUAL',p_page:3,p_page_size:10});
 });
 for(const error of [{code:'42501',message:'PLATFORM_FORBIDDEN'},{code:'P0001',message:'ACTIVE_PROVIDER_SUBSCRIPTION'},
 {code:'P0001',message:'MANUAL_ACTIVATION_CONFLICT'},{code:'22023',message:'INVALID_VALUE'},
 {code:'NETWORK_ERROR',message:'Failed to fetch'},{code:'PGRST203',message:'Ambiguous overload'},
 {code:'PGRST202',message:'Could not find the function public.other(p_limit) in the schema cache'}]){
  it(`never falls back for ${error.code}/${error.message}`,async()=>{
   rpc.mockResolvedValue({data:null,error});await expect(adapter.list()).rejects.toThrow();expect(rpc).toHaveBeenCalledTimes(1);
  });
 }
 it('network rejection never retries',async()=>{rpc.mockRejectedValue(new Error('network'));await expect(adapter.list()).rejects.toThrow();expect(rpc).toHaveBeenCalledTimes(1);});
 for(const [limit,offset] of [[0,0],[101,0],[1,-1]])it(`rejects pagination ${limit}/${offset}`,async()=>{
  await expect(adapter.list({limit,offset})).rejects.toThrow('paginación');expect(rpc).not.toHaveBeenCalled();
 });
 it('canonical accepts arbitrary offset; legacy rejects it before a second request',async()=>{
  rpc.mockResolvedValueOnce({data:list,error:null});await adapter.list({limit:10,offset:3});
  rpc.mockClear();rpc.mockResolvedValueOnce({data:null,error:missing});
  await expect(adapter.list({limit:10,offset:3})).rejects.toThrow('paginación');expect(rpc).toHaveBeenCalledTimes(1);
 });
 it('legacy blocks activation including transport fallback',async()=>{
  rpc.mockResolvedValueOnce({data:null,error:missing}).mockResolvedValueOnce({data:{items:[],total_count:0},error:null});
  await expect(adapter.activate(grant)).rejects.toThrow('temporalmente deshabilitada');
  expect(rpc.mock.calls.every(call=>call[0]==='platform_list_businesses')).toBe(true);
 });
 for(const reason of ['FRIEND_FAMILY','TESTER','INTERNAL','COMPENSATION','OTHER'] as const)it(`new backend permits zero-cost ${reason}`,async()=>{
  rpc.mockResolvedValueOnce({data:{items:[],total_count:0},error:null}).mockResolvedValueOnce({data:{success:true,idempotent:true},error:null});
  expect((await adapter.activate({...grant,reason})).success).toBe(true);
  expect(rpc).toHaveBeenLastCalledWith('platform_activate_manual_pro',{p_business_id:'business',p_reason:reason,p_interval:'MONTHLY',p_start_at:grant.startAt,p_reference:null,p_amount_minor:0,p_currency:null,p_internal_note:null});
 });
 it('mutation signature failure cannot trigger a legacy mutation',async()=>{
  rpc.mockResolvedValueOnce({data:{items:[],total_count:0},error:null}).mockResolvedValueOnce({data:null,error:{...missing,message:missing.message.replace('platform_list_businesses','platform_activate_manual_pro')}});
  await expect(adapter.activate(grant)).rejects.toThrow();expect(rpc).toHaveBeenCalledTimes(2);expect(adapter.getVersion()).toBe('UNKNOWN');
 });
 it('assisted sale rejects before any request',async()=>{
  await expect(adapter.activate({...grant,reason:'ASSISTED_SALE' as never})).rejects.toThrow('todavía no');expect(rpc).not.toHaveBeenCalled();
 });
 it('loaded artifact notices legacy to new cutover on the next read',async()=>{
  rpc.mockResolvedValueOnce({data:null,error:missing}).mockResolvedValueOnce({data:{items:[],total_count:0},error:null});
  await adapter.list();expect(adapter.getVersion()).toBe('LEGACY');
  rpc.mockResolvedValue({data:{items:[],total_count:0},error:null});await adapter.list();expect(adapter.getVersion()).toBe('PLATFORM01B');
  adapter.setIdentity('another-user');expect(adapter.getVersion()).toBe('UNKNOWN');
 });
 for(const legacy of [true,false])it(`detail normalization ${legacy?'legacy':'new'}`,async()=>{
  const detail={business:{id:'business'},subscription:{plan_code:'PRO',status:'PAST_DUE'},diagnostic:{resolved_entitlement_plan:'FREE'},
   ...(legacy?{devices:[{revoked_at:null}],members:[{status:'ACTIVE'}]}:{devices_count:2,cloud_membership_count:3,subscription_events:[{event_type:'SUBSCRIPTION_EXPIRED'}]})};
  rpc.mockResolvedValue({data:detail,error:null});const result=await adapter.detail('business');
  expect(result.diagnostic.resolved_entitlement_plan).toBe('PRO');expect(result.devices_count).toBe(legacy?1:2);
  expect(result.devices).toHaveLength(legacy?1:0);expect(result.subscription_events).toHaveLength(legacy?0:1);
 });
 it('legacy calendar transport clamps UTC month/leap-year boundaries',()=>{
  expect(calendarPeriodEnd(grant.startAt,'MONTHLY')).toBe('2026-02-28T12:00:00.000Z');
  expect(calendarPeriodEnd('2024-02-29T12:00:00Z','ANNUAL')).toBe('2025-02-28T12:00:00.000Z');
  expect(legacyGrantArguments(grant)).toMatchObject({p_amount:0,p_payment_method:null,p_period_end:'2026-02-28T12:00:00.000Z'});
 });
 for(const data of [{is_admin:true,role:'SUPER_ADMIN'}, {is_admin:true,role:'SUPER_ADMIN',is_active:true}])it('accepts authorized legacy/new session shape',async()=>{
  rpc.mockResolvedValue({data,error:null});expect(await new PlatformAdminService().getCurrentAdmin()).not.toBeNull();
 });
 for(const data of [{is_admin:true,role:'SUPPORT_ADMIN'},{is_admin:true,role:'SUPER_ADMIN',is_active:false},{is_admin:true,role:'SUPER_ADMIN',is_active:null}])it('fails closed on role/inactive/malformed active flag',async()=>{
  rpc.mockResolvedValue({data,error:null});expect(await new PlatformAdminService().getCurrentAdmin()).toBeNull();
 });
 it('signature detector requires correct function and deterministic code',()=>{
  expect(isSignatureMismatch(missing,'platform_list_businesses')).toBe(true);
  expect(isSignatureMismatch({...missing,code:'42501'},'platform_list_businesses')).toBe(false);
 });
});
