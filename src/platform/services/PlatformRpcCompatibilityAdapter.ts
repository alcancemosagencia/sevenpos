import {getSupabaseClient} from '../../infrastructure/cloud/supabaseClient';
import type {ManualProActivationParams} from '../types/PlatformTypes';

export type RpcVersion = 'UNKNOWN' | 'LEGACY' | 'PLATFORM01B';
export interface ListInput {search?: string; country?: string; plan?: string; subscriptionStatus?: string;
 billingSource?: string; limit?: number; offset?: number}
export type GrantInput=ManualProActivationParams;
type RpcError = {code?: string; message?: string; details?: string | null};
type RpcName='platform_list_businesses'|'platform_get_business_detail'|'platform_activate_manual_pro';
export function isSignatureMismatch(error: RpcError | null, name: RpcName): boolean {
 return error?.code==='PGRST202' && (error.message??'').startsWith(`Could not find the function public.${name}(`)
  && (error.message??'').includes('in the schema cache');
}
export function platformError(error: RpcError | Error | null): string {
 const message=error?.message??'';
 if (('code' in (error??{}) && (error as RpcError).code==='42501') || message.includes('PLATFORM_FORBIDDEN')) return 'No tienes permisos para acceder a Platform.';
 if(message.includes('ACTIVE_PROVIDER_SUBSCRIPTION')||message.includes('CANNOT_OVERWRITE_ACTIVE_MERCADO_PAGO_PRO')) return 'Este negocio ya tiene una suscripción activa con Mercado Pago.';
 if(message.includes('MANUAL_ACTIVATION_CONFLICT')) return 'Ya existe una activación Pro diferente para este período.';
 if(message.includes('ASSISTED_SALE_NOT_SUPPORTED')) return 'La venta asistida todavía no está disponible.';
 if(message.includes('LEGACY_ACTIVATION_DISABLED')) return 'Activación manual temporalmente deshabilitada durante actualización de Platform.';
 if(message.includes('INVALID_PAGINATION')) return 'La paginación solicitada no es válida.';
 return 'No pudimos completar la operación de Platform. Intenta nuevamente.';
}
export function calendarPeriodEnd(start: string, interval: 'MONTHLY'|'ANNUAL'): string {
 const date=new Date(start);
 if(!Number.isFinite(date.getTime()) || !['MONTHLY','ANNUAL'].includes(interval)) throw new Error('INVALID_MANUAL_PERIOD');
 const year=date.getUTCFullYear()+(interval==='ANNUAL'?1:0);
 const month=date.getUTCMonth()+(interval==='MONTHLY'?1:0);
 const last=new Date(Date.UTC(year,month+1,0)).getUTCDate();
 date.setUTCDate(1);date.setUTCFullYear(year,month,Math.min(new Date(start).getUTCDate(),last));
 return date.toISOString();
}
/** Pure, never executed while legacy activation is gated. */
export function legacyGrantArguments(input: GrantInput) {
 return {p_business_id:input.businessId,p_interval:input.interval,p_starts_at:input.startAt,
 p_period_end:calendarPeriodEnd(input.startAt,input.interval),p_reason:input.reason,p_amount:0,p_currency:'CLP',
 p_payment_method:null,p_reference:input.reference??null,p_notes:input.internalNote??null};
}
export const effectivePlan=(plan: unknown,status: unknown): 'FREE'|'PRO'=>plan==='PRO'&&['ACTIVE','PAST_DUE'].includes(String(status))?'PRO':'FREE';
const nullable=(v: unknown)=>v==null?null:String(v);
const count=(v: unknown)=>v==null?null:Number(v);
export class PlatformRpcCompatibilityAdapter {
 private version: RpcVersion='UNKNOWN';
 private identity: string|null=null;
 constructor(private client=getSupabaseClient) {}
 getVersion(){return this.version;}
 reset(){this.version='UNKNOWN';this.identity=null;}
 setIdentity(id: string|null){if(id!==this.identity){this.reset();this.identity=id;}}
 private async request(name:string,args:Record<string,unknown>){
  try{return await this.client().rpc(name,args);}catch{throw new Error(platformError(null));}
 }
 async list(input: ListInput={}) {
  const limit=input.limit??50,offset=input.offset??0;
  if(!Number.isInteger(limit)||limit<1||limit>100||!Number.isInteger(offset)||offset<0) throw new Error(platformError(new Error('INVALID_PAGINATION')));
  const args={p_search:input.search??null,p_country:input.country??null,p_plan:input.plan??null,
   p_subscription_status:input.subscriptionStatus??null,p_billing_source:input.billingSource??null,p_limit:limit,p_offset:offset};
  // Re-probe on reads so the same loaded artifact notices a backend cutover.
  let {data,error}=await this.request('platform_list_businesses',args);
  if(isSignatureMismatch(error,'platform_list_businesses')){
   this.version='LEGACY';
   if(offset%limit!==0)throw new Error(platformError(new Error('INVALID_PAGINATION')));
   ({data,error}=await this.request('platform_list_businesses',{p_search:args.p_search,p_country:args.p_country,p_plan:args.p_plan,
    p_status:args.p_subscription_status,p_source:args.p_billing_source,p_page:offset/limit+1,p_page_size:limit}));
  }else if(!error){this.version='PLATFORM01B';}
  if(error)throw new Error(platformError(error));
  if(!data||!Array.isArray(data.items)||!Number.isFinite(Number(data.total_count))){this.version='UNKNOWN';throw new Error(platformError(null));}
  return {items:(data.items as Record<string,unknown>[]).map((item)=>({businessId:String(item.business_id),businessName:String(item.business_name),
   country:nullable(item.country_code),ownerName:nullable(item.owner_name),ownerEmail:nullable(item.owner_email),
   ownerUserId:nullable(item.owner_user_id),createdAt:nullable(item.created_at),planCode:nullable(item.plan_code),
   effectivePlan:effectivePlan(item.plan_code,item.subscription_status),subscriptionStatus:nullable(item.subscription_status),
   billingSource:nullable(item.billing_source),currentPeriodEnd:nullable(item.current_period_end),
   deviceCount:count(item.device_count??item.active_devices_count),cloudMembershipCount:count(item.cloud_membership_count??item.active_members_count),
   lastActivityAt:nullable(item.last_activity_at),manualReason:nullable(item.manual_reason)})),totalCount:Number(data.total_count),limit,offset};
 }
 async detail(businessId: string){
  const {data,error}=await this.request('platform_get_business_detail',{p_business_id:businessId});
  if(error)throw new Error(platformError(error));
  if(!data?.business||!data?.subscription||!data?.diagnostic)throw new Error(platformError(null));
  return {...data,owner:data.owner??{user_id:null,email:null,name:null,created_at:null},devices:data.devices??[],members:data.members??[],
   devices_count:data.devices_count??(Array.isArray(data.devices)?data.devices.filter((d:{revoked_at?:string|null})=>!d.revoked_at).length:null),
   cloud_membership_count:data.cloud_membership_count??(Array.isArray(data.members)?data.members.filter((m:{status?:string})=>m.status==='ACTIVE').length:null),
   admin_events:data.admin_events??[],subscription_events:data.subscription_events??[],
   diagnostic:{...data.diagnostic,reported_entitlement_plan:data.diagnostic.resolved_entitlement_plan,
    diagnostic_mismatch:data.diagnostic.resolved_entitlement_plan!==effectivePlan(data.subscription.plan_code,data.subscription.status),
    resolved_entitlement_plan:effectivePlan(data.subscription.plan_code,data.subscription.status)}};
 }
 async activate(input: GrantInput){
  if(!['FRIEND_FAMILY','TESTER','INTERNAL','COMPENSATION','OTHER'].includes(input.reason))throw new Error(platformError(new Error('ASSISTED_SALE_NOT_SUPPORTED')));
  // Fresh harmless probe. Never retry a mutation on another signature.
  await this.list({limit:1,offset:0});
  if(this.version!=='PLATFORM01B')throw new Error(platformError(new Error('LEGACY_ACTIVATION_DISABLED')));
  const {data,error}=await this.request('platform_activate_manual_pro',{p_business_id:input.businessId,p_reason:input.reason,p_interval:input.interval,
   p_start_at:input.startAt,p_reference:input.reference??null,p_amount_minor:0,p_currency:null,p_internal_note:input.internalNote??null});
  if(error){if(isSignatureMismatch(error,'platform_activate_manual_pro'))this.version='UNKNOWN';throw new Error(platformError(error));}
  return data as {success:boolean;idempotent:boolean};
 }
}
export const platformRpcCompatibility=new PlatformRpcCompatibilityAdapter();
