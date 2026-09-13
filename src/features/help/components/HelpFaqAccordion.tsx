import React, { useState } from 'react';
import { ChevronDown, HelpCircle } from 'lucide-react';
import { FaqItem } from '../types';

export interface HelpFaqAccordionProps {
  faqs: FaqItem[];
}

export const HelpFaqAccordion: React.FC<HelpFaqAccordionProps> = ({ faqs }) => {
  const [openIds, setOpenIds] = useState<Record<string, boolean>>({});

  const toggleFaq = (id: string) => {
    setOpenIds((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  return (
    <div className="space-y-2.5">
      {faqs.map((faq) => {
        const isOpen = Boolean(openIds[faq.id]);
        return (
          <div
            key={faq.id}
            className="bg-surface rounded-2xl border border-border-default overflow-hidden transition-colors shadow-xs"
          >
            <button
              type="button"
              onClick={() => toggleFaq(faq.id)}
              aria-expanded={isOpen}
              className="w-full px-4 sm:px-5 py-4 flex items-center justify-between gap-3 text-left cursor-pointer hover:bg-surface-hover/50 transition-colors"
            >
              <div className="flex items-center gap-3 min-w-0">
                <HelpCircle size={17} className="text-brand-primary shrink-0" />
                <span className="text-xs sm:text-sm font-bold text-text-primary leading-snug">
                  {faq.question}
                </span>
              </div>
              <ChevronDown
                size={17}
                className={`text-text-tertiary shrink-0 transition-transform duration-200 ${
                  isOpen ? 'rotate-180 text-brand-primary' : ''
                }`}
              />
            </button>

            {isOpen && (
              <div className="px-4 sm:px-5 pb-4 pt-1 text-xs sm:text-sm text-text-secondary leading-relaxed border-t border-border-subtle bg-surface-secondary/20 animate-in fade-in-0 duration-150">
                {faq.answer}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
