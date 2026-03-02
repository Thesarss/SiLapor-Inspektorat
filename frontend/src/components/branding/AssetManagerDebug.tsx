import React from 'react';

interface AssetManagerDebugProps {
  show?: boolean;
}

export const AssetManagerDebug: React.FC<AssetManagerDebugProps> = ({ show = false }) => {
  if (!show) return null;

  return (
    <div className="asset-manager-debug">
      <p>Asset Manager Debug Info</p>
    </div>
  );
};