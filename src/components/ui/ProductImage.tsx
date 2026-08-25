import React, { useState, useEffect } from 'react';
import { Package } from 'lucide-react';
import { productImageStorage } from '../../infrastructure/storage/ProductImageStorage';

export interface ProductImageProps {
  src?: string | null;
  alt: string;
  className?: string;
  fallbackIconSize?: number;
}

export const ProductImage: React.FC<ProductImageProps> = ({
  src,
  alt,
  className = 'w-full h-full object-cover',
  fallbackIconSize = 32,
}) => {
  const [prevSrc, setPrevSrc] = useState(src);
  const [resolvedUrl, setResolvedUrl] = useState<string | null>(() => {
    if (!src) return null;
    if (src.startsWith('blob:') || src.startsWith('data:') || src.startsWith('http')) {
      return src;
    }
    return null;
  });
  const [hasError, setHasError] = useState(false);

  if (src !== prevSrc) {
    setPrevSrc(src);
    setHasError(false);
    if (!src) {
      setResolvedUrl(null);
    } else if (src.startsWith('blob:') || src.startsWith('data:') || src.startsWith('http')) {
      setResolvedUrl(src);
    } else {
      setResolvedUrl(null);
    }
  }

  useEffect(() => {
    let isMounted = true;

    if (!src || src.startsWith('blob:') || src.startsWith('data:') || src.startsWith('http')) {
      return;
    }

    productImageStorage
      .resolveImageUrl(src)
      .then((url) => {
        if (isMounted) {
          setResolvedUrl(url);
          if (!url) setHasError(true);
        }
      })
      .catch(() => {
        if (isMounted) setHasError(true);
      });

    return () => {
      isMounted = false;
    };
  }, [src]);

  if (!src || hasError || !resolvedUrl) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-surface-secondary/70">
        <Package
          size={fallbackIconSize}
          className="text-text-tertiary group-hover:text-brand-primary transition-colors"
        />
      </div>
    );
  }

  return (
    <img
      src={resolvedUrl}
      alt={alt}
      onError={() => setHasError(true)}
      className={className}
      loading="lazy"
    />
  );
};
