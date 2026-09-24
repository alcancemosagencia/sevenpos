import React from 'react';
import { marketingAssets } from '../config/marketingAssets';
import { marketingLinks } from '../config/marketingLinks';

export const MarketingFooter: React.FC = () => {
  return (
    <footer className="bg-[#0B0D13] text-white font-sans border-t border-white/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 sm:py-16 space-y-10">

        {/* Main Footer Links */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8">

          {/* Col 1: Brand & Bio */}
          <div className="col-span-2 space-y-3.5">
            <a href="#" className="flex items-center gap-2 focus:outline-none">
              <img src={marketingAssets.hero.logo} alt="SevenPOS" className="h-6 w-auto object-contain" />
            </a>
            <p className="text-xs sm:text-sm font-normal text-white/60 max-w-sm leading-relaxed">
              El software de punto de venta, inventario y gestión para negocios que quieren crecer con orden y control en Latinoamérica.
            </p>
          </div>

          {/* Col 2: Producto */}
          <div className="space-y-3">
            <div className="text-xs font-medium text-white uppercase tracking-wider">
              Producto
            </div>
            <ul className="space-y-2 text-xs sm:text-sm font-normal text-white/60">
              <li><a href="#funciones" className="hover:text-white transition-colors">Funciones</a></li>
              <li><a href="#como-funciona" className="hover:text-white transition-colors">Cómo funciona</a></li>
              <li><a href="#precios" className="hover:text-white transition-colors">Planes y Precios</a></li>
              <li><a href={marketingLinks.marketingDownload} className="hover:text-white transition-colors">Descargar App</a></li>
            </ul>
          </div>

          {/* Col 3: Soluciones */}
          <div className="space-y-3">
            <div className="text-xs font-medium text-white uppercase tracking-wider">
              Soluciones
            </div>
            <ul className="space-y-2 text-xs sm:text-sm font-normal text-white/60">
              <li><a href="/negocios/minimarket" className="hover:text-white transition-colors">Minimarkets</a></li>
              <li><a href="/negocios/ferreteria" className="hover:text-white transition-colors">Ferreterías</a></li>
              <li><a href="/negocios/panaderia" className="hover:text-white transition-colors">Panaderías</a></li>
              <li><a href="/negocios/mascotas" className="hover:text-white transition-colors">Pet Shops</a></li>
            </ul>
          </div>

          {/* Col 4: Recursos & Cuenta */}
          <div className="space-y-3">
            <div className="text-xs font-medium text-white uppercase tracking-wider">
              Acceso
            </div>
            <ul className="space-y-2 text-xs sm:text-sm font-normal text-white/60">
              <li><a href={marketingLinks.appLogin} className="hover:text-white transition-colors">Iniciar sesión</a></li>
              <li><a href={marketingLinks.appRegister} className="hover:text-white transition-colors">Crear cuenta</a></li>
              <li><a href="/soporte" className="hover:text-white transition-colors">Centro de Ayuda</a></li>
              <li><a href="https://platform.sevenpos.pro" target="_blank" rel="noreferrer" className="hover:text-white transition-colors">Platform Admin</a></li>
            </ul>
          </div>

        </div>

        {/* Bottom Legal & Copyright Bar */}
        <div className="pt-6 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs font-normal text-white/50">
          <div>
            SevenPOS es un producto desarrollado por Alcancemos Media SpA.
          </div>
          <div>
            &copy; 2026 SevenPOS. Todos los derechos reservados.
          </div>
        </div>

      </div>
    </footer>
  );
};
