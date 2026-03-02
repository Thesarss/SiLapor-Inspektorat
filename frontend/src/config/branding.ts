import { BrandConfig } from '../types/branding';

// Default branding configuration for Tanjungpinang
export const defaultBrandConfig: BrandConfig = {
  assets: {
    logoFull: {
      variant: 'full',
      formats: {
        svg: '/src/assets/branding/logo-full.svg',
        webp: '/src/assets/branding/logo-horizontal.webp',
        png: '/src/assets/branding/logo-horizontal.png'
      },
      dimensions: {
        width: 200,
        height: 80
      }
    },
    logoIcon: {
      variant: 'icon',
      formats: {
        svg: '/src/assets/branding/logo-icon.svg',
        webp: '/src/assets/branding/logo-icon.webp'
      },
      dimensions: {
        width: 40,
        height: 40
      }
    },
    logoHorizontal: {
      variant: 'horizontal',
      formats: {
        webp: '/src/assets/branding/logo-horizontal.webp',
        png: '/src/assets/branding/logo-horizontal.png'
      },
      dimensions: {
        width: 300,
        height: 100
      }
    },
    logoVertical: {
      variant: 'vertical',
      formats: {
        webp: '/src/assets/branding/logo-vertical.webp',
        png: '/src/assets/branding/logo-vertical.png'
      },
      dimensions: {
        width: 150,
        height: 200
      }
    }
  },
  colors: {
    primary: '#1e40af', // Blue - representing authority and trust
    secondary: '#fbbf24', // Gold - representing prosperity and excellence
    accent: '#059669' // Green - representing growth and progress
  },
  typography: {
    fontFamily: 'Inter, system-ui, Avenir, Helvetica, Arial, sans-serif',
    officialName: 'Pemerintah Kota Tanjungpinang'
  }
};