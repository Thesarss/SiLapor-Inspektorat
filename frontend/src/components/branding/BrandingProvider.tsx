import React, { createContext, useContext, ReactNode } from 'react';

interface BrandingContextType {
  // Simple context for now
  isLoaded: boolean;
}

const BrandingContext = createContext<BrandingContextType>({
  isLoaded: true
});

export const useBranding = (): BrandingContextType => {
  return useContext(BrandingContext);
};

interface BrandingProviderProps {
  children: ReactNode;
}

export const BrandingProvider: React.FC<BrandingProviderProps> = ({ children }) => {
  const contextValue: BrandingContextType = {
    isLoaded: true
  };

  return (
    <BrandingContext.Provider value={contextValue}>
      {children}
    </BrandingContext.Provider>
  );
};