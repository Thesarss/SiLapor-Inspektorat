import React, { useState } from 'react';

// Import logo assets
import logoFull from '../../assets/branding/logo-full.png';
import logoIcon from '../../assets/branding/logo-full.png';
import logoHorizontal from '../../assets/branding/logo-full.png';
import logoVertical from '../../assets/branding/logo-full.png';

interface LogoProps {
  variant?: 'full' | 'icon' | 'horizontal' | 'vertical';
  size?: 'small' | 'medium' | 'large' | 'auto';
  className?: string;
  alt?: string;
  onClick?: () => void;
}

export const LogoComponent: React.FC<LogoProps> = ({
  variant = 'full',
  size = 'medium',
  className = '',
  alt = 'Logo Pemerintah Kota Tanjungpinang',
  onClick
}) => {
  const [imageError, setImageError] = useState(false);
  const [imageLoading, setImageLoading] = useState(true);

  const handleClick = () => {
    if (onClick) {
      onClick();
    }
  };

  const handleImageError = () => {
    setImageError(true);
    setImageLoading(false);
  };

  const handleImageLoad = () => {
    setImageLoading(false);
  };

  const getSizeClass = () => {
    switch (size) {
      case 'small': return 'size-small';
      case 'medium': return 'size-medium';
      case 'large': return 'size-large';
      case 'auto': return 'size-auto';
      default: return 'size-medium';
    }
  };

  const getLogoSrc = () => {
    switch (variant) {
      case 'icon': return logoIcon;
      case 'horizontal': return logoHorizontal;
      case 'vertical': return logoVertical;
      case 'full':
      default: return logoFull;
    }
  };

  const getFallbackText = () => {
    switch (variant) {
      case 'icon': return 'TJP';
      case 'horizontal': return 'SILAPOR - Tanjungpinang';
      case 'vertical': return 'SILAPOR\nTanjungpinang';
      case 'full':
      default: return 'SILAPOR';
    }
  };

  const logoClasses = [
    'logo-component',
    getSizeClass(),
    className,
    onClick ? 'clickable' : '',
    imageLoading ? 'loading' : '',
    imageError ? 'error' : ''
  ].filter(Boolean).join(' ');

  const fallbackClasses = [
    'logo-fallback',
    getSizeClass()
  ].filter(Boolean).join(' ');

  return (
    <div
      className={logoClasses}
      onClick={handleClick}
      role={onClick ? 'button' : 'img'}
      aria-label={alt}
      tabIndex={onClick ? 0 : undefined}
    >
      {!imageError ? (
        <img
          src={getLogoSrc()}
          alt={alt}
          onError={handleImageError}
          onLoad={handleImageLoad}
          style={{ 
            width: '100%', 
            height: '100%', 
            objectFit: 'contain',
            display: imageLoading ? 'none' : 'block'
          }}
        />
      ) : (
        <div className={fallbackClasses}>
          {getFallbackText()}
        </div>
      )}
      
      {imageLoading && !imageError && (
        <div className={fallbackClasses}>
          {getFallbackText()}
        </div>
      )}
    </div>
  );
};