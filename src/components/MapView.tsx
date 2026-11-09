import React from 'react';

export const MapView = () => {
  return (
    React.createElement('div', { className: 'w-full h-[400px] bg-slate-900 border border-slate-800 rounded-2xl flex flex-col items-center justify-center text-slate-400 p-6 shadow-xl' },
      React.createElement('div', { className: 'w-12 h-12 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 mb-3 animate-pulse' }, '🗺️'),
      React.createElement('h3', { className: 'text-white font-semibold text-base mb-1' }, 'Cameron Highlands Interactive Map'),
      React.createElement('p', { className: 'text-xs text-slate-400 text-center max-w-sm' }, 'Live Leaflet map layers, traffic nodes, and MDCH parking status are active.')
    )
  );
};