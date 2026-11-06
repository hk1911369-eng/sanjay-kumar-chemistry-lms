export type Provider='bkash'|'nagad'|'rocket';
export function providerReady(p:Provider){
  if(p==='bkash') return Boolean(process.env.BKASH_APP_KEY&&process.env.BKASH_APP_SECRET&&process.env.BKASH_USERNAME&&process.env.BKASH_PASSWORD&&process.env.BKASH_BASE_URL);
  if(p==='nagad') return Boolean(process.env.NAGAD_MERCHANT_ID&&process.env.NAGAD_PRIVATE_KEY&&process.env.NAGAD_PUBLIC_KEY&&process.env.NAGAD_BASE_URL);
  return Boolean(process.env.ROCKET_MERCHANT_ID&&process.env.ROCKET_API_BASE_URL&&process.env.ROCKET_CLIENT_ID&&process.env.ROCKET_CLIENT_SECRET);
}
/** Fail closed until provider-specific contracts, credentials and webhook verification are configured. */
export async function createProviderCheckout(_provider:Provider,_input:{orderId:string;amount:number;callbackUrl:string}){
  throw new Error('PAYMENT_PROVIDER_NOT_CONFIGURED: provider adapter must be implemented and sandbox-tested against the merchant-issued API documentation before live payments are enabled.');
}
