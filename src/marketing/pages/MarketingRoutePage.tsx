import { MarketingHomePage } from './MarketingHomePage';
import { MarketingFooter } from '../components/MarketingFooter';
import { isPublicMarketingPath } from '../../app/hostRouting';

const pageNames: Record<string, string> = {
  '/funciones': 'Funciones',
  '/planes': 'Planes',
  '/negocios': 'Negocios',
  '/negocios/minimarkets': 'Minimarkets',
  '/negocios/restaurantes': 'Restaurantes',
  '/negocios/cafeterias': 'Cafeterías',
  '/negocios/retail': 'Retail',
  '/negocios/servicios': 'Servicios',
  '/descargar': 'Descargar SevenPOS',
  '/contacto': 'Contacto',
  '/soporte': 'Soporte',
  '/privacidad': 'Privacidad',
  '/terminos': 'Términos',
};

export function MarketingRoutePage() {
  const path = window.location.pathname.toLowerCase().replace(/\/$/, '') || '/';
  if (path === '/' || path === '/landing' || path === '/marketing') return <MarketingHomePage />;
  const title = pageNames[path] ?? (path.startsWith('/negocios/') ? 'Soluciones para negocios' : path.startsWith('/legal/') ? 'Información legal' : 'Página no encontrada');
  const known = isPublicMarketingPath(path);
  return (
    <div className="min-h-screen bg-white text-[#111111] font-sans">
      <main className="mx-auto flex min-h-[65vh] max-w-5xl flex-col justify-center px-6 py-24">
        <p className="text-xs uppercase tracking-[0.18em] text-neutral-500">SevenPOS</p>
        <h1 className="mt-5 text-5xl font-semibold">{title}</h1>
        <p className="mt-5 max-w-xl text-neutral-600">{known ? 'Estamos preparando esta página para ayudarte a conocer SevenPOS.' : 'Esta página no está disponible.'}</p>
        <a className="mt-8 text-blue-600 underline" href="/">Volver al inicio</a>
      </main>
      <MarketingFooter />
    </div>
  );
}
