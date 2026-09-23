import React from 'react';
import { ArrowRight, Check, ChevronRight } from 'lucide-react';
import { MarketingBusinessShowcase } from './MarketingBusinessShowcase';
import { marketingAssets } from '../config/marketingAssets';
import { marketingLinks } from '../config/marketingLinks';

interface Props { onRegisterClick?: () => void }

const ButtonLink = ({ href, children, light = false, onClick }: { href: string; children: React.ReactNode; light?: boolean; onClick?: (e: React.MouseEvent) => void }) => (
  <a className={`editorial-link ${light ? 'editorial-link--light' : ''}`} href={href} onClick={onClick}>{children}<ArrowRight size={17} /></a>
);

export const MarketingExperience: React.FC<Props> = ({ onRegisterClick }) => {
  const register = (event: React.MouseEvent) => {
    event.preventDefault();
    if (onRegisterClick) onRegisterClick();
    else window.location.href = marketingLinks.appRegister;
  };

  return <>
    <section id="producto" className="marketing-section product-story">
      <div className="section-heading section-heading--split">
        <p className="section-kicker">Más que un POS</p>
        <h2>Todo lo que necesitas,<br />en un solo lugar.</h2>
        <p>Vende, controla y entiende tu negocio sin saltar entre herramientas.</p>
      </div>
      <div className="product-editorial" id="funciones">
        <article className="product-feature product-feature--large">
          <div className="product-feature__copy"><span>01 · Punto de venta</span><h3>Una venta simple.<br />Incluso en hora punta.</h3><p>Busca, cobra y emite tu comprobante desde un flujo rápido y claro.</p></div>
          <img src={marketingAssets.product.terminal} alt="Punto de venta SevenPOS en una cafetería" loading="lazy" />
        </article>
        <article className="product-feature">
          <div className="product-feature__copy"><span>02 · Inventario</span><h3>Stock que se mueve contigo.</h3><p>Cada venta actualiza las existencias para que sepas qué hay disponible.</p></div>
          <img src={marketingAssets.product.inventory} alt="Inventario SevenPOS actualizado en tiempo real" loading="lazy" />
        </article>
        <article className="product-feature product-feature--dark">
          <div className="product-feature__copy"><span>03 · Reportes</span><h3>Decisiones con datos reales.</h3><p>Ventas, productos y medios de pago, ordenados para entender el día.</p></div>
          <img src={marketingAssets.product.reports} alt="Reportes de SevenPOS mostrados en un terminal" loading="lazy" />
        </article>
      </div>
      <nav className="product-secondary" aria-label="Funciones de SevenPOS">{['Punto de Venta','Productos','Inventario','Caja','Clientes','Compras','Reportes','Auditoría'].map((item) => <a href="#producto" key={item}>{item}</a>)}</nav>
    </section>

    <section className="marketing-section intent-story">
      <div className="section-heading section-heading--center"><p className="section-kicker">Elige tu prioridad</p><h2>¿Qué quieres hacer hoy?</h2></div>
      <div className="intent-layout">
        <article className="intent-panel intent-panel--primary"><img src={marketingAssets.priorities.selling} alt="SevenPOS en computador y teléfono" loading="lazy" /><div><span>Vender más rápido</span><p>Cobra sin fricción, incluso en hora punta.</p><a href="#como-funciona">Explorar punto de venta <ChevronRight size={16}/></a></div></article>
        <article className="intent-panel"><img src={marketingAssets.priorities.management} alt="Gestión de equipo y permisos en SevenPOS" loading="lazy" /><div><span>Controlar mi negocio</span><p>Ordena inventario, caja y equipo desde un lugar.</p><a href="#producto">Explorar gestión <ChevronRight size={16}/></a></div></article>
        <article className="intent-panel"><img src={marketingAssets.priorities.reports} alt="Resultados de negocio en SevenPOS" loading="lazy" /><div><span>Entender mis resultados</span><p>Convierte cada jornada en decisiones más claras.</p><a href="#precios">Explorar reportes <ChevronRight size={16}/></a></div></article>
      </div>
    </section>

    <section id="como-funciona" className="marketing-section workflow-story">
      <div className="workflow-copy"><p className="section-kicker">Así de simple</p><h2>De la venta<br />al control.</h2><ol>{[['01','Escanea o busca','Encuentra el producto por nombre o código.'],['02','Cobra','Registra el medio de pago en segundos.'],['03','El stock se actualiza','Cada unidad vendida descuenta existencias.'],['04','Revisa tus resultados','Cierra el día con ventas y caja claras.']].map(([n,t,d]) => <li key={n}><span>{n}</span><div><strong>{t}</strong><p>{d}</p></div></li>)}</ol></div>
      <div className="workflow-visual"><img src={marketingAssets.workflow.receipt} alt="Boleta emitida por SevenPOS después de una venta" loading="lazy" /></div>
    </section>

    <MarketingBusinessShowcase />

    <section id="precios" className="marketing-section pricing-story">
      <div className="section-heading section-heading--center"><p className="section-kicker">Planes claros</p><h2>Empieza gratis.<br />Pasa a Pro cuando lo necesites.</h2></div>
      <div className="pricing-layout">
        <article><div><p>Free</p><h3>$0</h3><span>Todo lo necesario para empezar.</span></div><ul>{['Ventas ilimitadas','100 productos y 50 clientes','1 usuario operativo','Reportes y auditoría reciente','Exportación CSV/XLSX'].map(x=><li key={x}><Check size={15}/>{x}</li>)}</ul><ButtonLink href={marketingLinks.appRegister} onClick={register}>Empieza gratis</ButtonLink></article>
        <article className="pricing-pro"><div><p>Pro</p><h3>$9.990 <small>+ IVA / mes</small></h3><span>Precio Fundadores durante 12 meses.<br/>Luego $19.990 + IVA / mes.</span></div><ul>{['Ventas ilimitadas','Productos y clientes sin límites comerciales','Hasta 5 usuarios','Historial completo','Analítica, auditoría y reportes avanzados'].map(x=><li key={x}><Check size={15}/>{x}</li>)}</ul><ButtonLink href={marketingLinks.appRegister} light onClick={register}>Elegir Pro</ButtonLink></article>
      </div>
    </section>

    <section className="marketing-final">
      <img src={marketingAssets.finalCta.devices} alt="SevenPOS disponible en computador y móvil" loading="lazy"/>
      <div><p className="section-kicker">Empieza hoy</p><h2>Tu negocio, más simple.<br />Más bajo control.</h2><p>Activa SevenPOS y empieza a vender con orden desde el primer día.</p><div className="marketing-final__actions"><ButtonLink href={marketingLinks.appRegister} light onClick={register}>Empieza gratis</ButtonLink><a href="mailto:ventas@sevenpos.pro">Hablar con ventas</a></div></div>
    </section>
  </>;
};
