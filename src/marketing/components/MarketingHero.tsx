import React, { useState } from 'react';
import { ArrowUpRight, Check, Menu, X } from 'lucide-react';
import { marketingAssets } from '../config/marketingAssets';
import { marketingLinks } from '../config/marketingLinks';

interface MarketingHeroProps { onRegisterClick?: () => void }

const navItems = [
  ['Producto', '#producto'], ['Funciones', '#funciones'], ['Negocios', '#negocios'], ['Planes', '#precios'],
] as const;

export const MarketingHero: React.FC<MarketingHeroProps> = ({ onRegisterClick }) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const register = (event: React.MouseEvent) => {
    event.preventDefault();
    if (onRegisterClick) onRegisterClick();
    else window.location.href = marketingLinks.appRegister;
  };

  return (
    <section id="top" className="marketing-hero-shell" aria-labelledby="hero-title">
      <div className="marketing-hero">
        <img className="marketing-hero__image" src={marketingAssets.hero.terminal} alt="Terminal SevenPOS operando en la caja de una cafetería" fetchPriority="high" />
        <div className="marketing-hero__shade" />
        <div className="marketing-hero__content">
          <nav className="marketing-nav" aria-label="Navegación principal">
            <a className="marketing-wordmark" href="#top" aria-label="SevenPOS, inicio"><span className="marketing-wordmark__mark">7</span><span>SevenPOS</span></a>
            <div className="marketing-nav__links">{navItems.map(([label, href]) => <a href={href} key={label}>{label}</a>)}</div>
            <div className="marketing-nav__actions">
              <a className="marketing-nav__login" href={marketingLinks.appLogin}>Iniciar sesión</a>
              <a className="marketing-nav-cta" href={marketingLinks.appRegister} onClick={register}>Empieza gratis <span><ArrowUpRight size={16} /></span></a>
            </div>
            <button className="marketing-nav__menu" type="button" aria-label="Abrir menú" onClick={() => setMenuOpen(!menuOpen)}>{menuOpen ? <X size={20} /> : <Menu size={20} />}</button>
          </nav>
          {menuOpen && <div className="marketing-mobile-menu">{navItems.map(([label, href]) => <a href={href} key={label} onClick={() => setMenuOpen(false)}>{label}</a>)}<a href={marketingLinks.appLogin}>Iniciar sesión</a></div>}
          <div className="marketing-hero__copy">
            <p className="marketing-eyebrow">Punto de venta para negocios reales</p>
            <h1 id="hero-title">Vende mejor.<br />Controla todo.</h1>
            <p>SevenPOS conecta tus ventas, inventario, caja y negocio en un solo lugar.</p>
            <div className="marketing-hero__actions">
              <a className="marketing-button marketing-button--primary" href={marketingLinks.appRegister} onClick={register}>Empieza gratis <ArrowUpRight size={18} /></a>
              <a className="marketing-button marketing-button--glass" href="#como-funciona">Ver cómo funciona</a>
            </div>
          </div>
          <div className="marketing-hero__bottom"><p>Hecho para el ritmo de tu negocio.</p><ul>{['Venta rápida', 'Inventario al día', 'Control total'].map((item) => <li key={item}><Check size={13} strokeWidth={2.5} />{item}</li>)}</ul></div>
        </div>
      </div>
    </section>
  );
};
