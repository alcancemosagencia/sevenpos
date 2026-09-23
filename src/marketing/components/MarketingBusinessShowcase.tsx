import { useState } from 'react';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { marketingBusinesses } from '../config/marketingAssets';
import { marketingLinks } from '../config/marketingLinks';

export function MarketingBusinessShowcase() {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const selected = marketingBusinesses[selectedIndex];
  const selectRelative = (step: number) => setSelectedIndex((index) => (index + step + marketingBusinesses.length) % marketingBusinesses.length);

  return (
    <section id="negocios" className="business-story" aria-labelledby="business-heading">
      <div className="business-showcase">
        <div className="business-showcase__copy">
          <p className="section-kicker">Hecho para tu negocio</p>
          <h2 id="business-heading">Negocios reales.<br />Control real.</h2>
          <p className="business-showcase__intro">Desde un minimarket hasta un restaurante.<br />SevenPOS se adapta a tu forma de trabajar.</p>
          <div className="business-showcase__controls">
            <div className="business-showcase__selector" role="group" aria-label="Tipo de negocio">
              {marketingBusinesses.map((business, index) => (
                <button key={business.id} type="button" className={index === selectedIndex ? 'is-selected' : ''} aria-pressed={index === selectedIndex} onClick={() => setSelectedIndex(index)}>{business.label}</button>
              ))}
            </div>
            <div className="business-showcase__bottom">
              <div className="business-showcase__arrows">
                <button type="button" aria-label="Negocio anterior" onClick={() => selectRelative(-1)}><ArrowLeft size={18} /></button>
                <button type="button" aria-label="Negocio siguiente" onClick={() => selectRelative(1)}><ArrowRight size={18} /></button>
              </div>
              <a href={marketingLinks.marketingBusinesses}>Ver negocios <ArrowRight size={16} /></a>
            </div>
          </div>
        </div>
        <div className="business-showcase__visual">
          <div className="business-showcase__photo" key={selected.id}>
            <img className={selected.composite ? 'business-showcase__composite' : ''} src={selected.image} alt={selected.alt} loading="lazy" />
          </div>
          {!selected.composite && (
            <div className="business-showcase__descriptor" aria-live="polite">
              <span>{selected.title}</span>
              <p>{selected.description}</p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
