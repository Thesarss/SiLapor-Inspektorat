// Branding system types for Tanjungpinang identity

export interface BrandAsset {
  variant: string;
  formats: {
    svg?: string;
    png?: string;
    webp?: string;
  };
  dimensions: {
    width: number;
    height: number;
  };
}

export interface BrandConfig {
  assets: {
    logoFull: BrandAsset;
    logoIcon: BrandAsset;
    logoHorizontal: BrandAsset;
    logoVertical: BrandAsset;
  };
  colors: {
    primary: string;
    secondary: string;
    accent: string;
  };
  typography: {
    fontFamily: string;
    officialName: string;
  };
}

export interface AssetLoadingState {
  isLoading: boolean;
  isLoaded: boolean;
  error: string | null;
  loadedAssets: Set<string>;
}

export interface LogoProps {
  variant: 'full' | 'icon' | 'horizontal' | 'vertical';
  size: 'small' | 'medium' | 'large' | 'auto';
  className?: string;
  alt?: string;
  onClick?: () => void;
}

export interface BrandingContextType {
  assets: BrandAsset[];
  getAsset: (variant: string, format?: string) => string | null;
  isLoaded: boolean;
  error: string | null;
  // Enhanced AssetManager capabilities
  preloadAsset?: (variant: string) => Promise<any>;
  getCacheStats?: () => any;
  getAssetMetadata?: (variant: string) => any;
  clearCache?: () => void;
}

export interface BrandingErrorBoundaryState {
  hasError: boolean;
  errorMessage: string;
  fallbackMode: 'text' | 'placeholder' | 'hidden';
}