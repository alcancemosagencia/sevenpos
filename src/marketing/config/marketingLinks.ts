import { getCustomerAppUrl } from '../../app/customerAppUrls';

export const marketingLinks = {
  appLogin: getCustomerAppUrl('/login'),
  appRegister: getCustomerAppUrl('/register'),
  appSubscription: getCustomerAppUrl('/subscription'),
  marketingFunctions: '/funciones',
  marketingPlans: '/planes',
  marketingBusinesses: '/negocios',
  marketingDownload: '/descargar',
} as const;
