import React from 'react';
import { SafeIcon } from '../shared/SafeIcon';

export const GMSidebar = ({ activeTab, setActiveTab }) => {
  const navItems = [
    { id: 'roster', label: 'Roster', icon: 'GiFiles' },
    { id: 'circle', label: 'Assets', icon: 'GiBriefcase' },
    { id: 'archives', label: 'Archives', icon: 'GiScroll' },
    { id: 'map', label: 'Map', icon: 'GiCompass' }
  ];

  return (
    <div className="flex flex-col gap-4 w-full pt-4">
      {navItems.map((item, index) => (
        <button
          key={item.id}
          onClick={() => setActiveTab(item.id)}
          // Removed centering, full width ensures the slips dominate the column
          className={`relative group transition-all duration-500 ease-out w-full
            ${activeTab === item.id ? 'z-20 scale-[1.02]' : 'hover:scale-[1.02]'}
            ${index % 2 === 0 ? '-rotate-1' : 'rotate-1'}`}
        >
          {/* Burnt, Ripped, Full-Width Slip */}
          <div 
            className="w-full px-6 py-5 bg-[#e8dcc4] text-[#2c2420] shadow-[5px_5px_15px_rgba(0,0,0,0.6)]"
            style={{
              // Jagged, uneven edges that span the full width
              clipPath: 'polygon(0% 2%, 99% 0%, 100% 98%, 2% 100%)',
              // Singed gradient
              background: 'linear-gradient(135deg, #e8dcc4 60%, #c4b59d 90%, #5e4a3a 100%)',
              borderLeft: '2px solid #7a6a5a',
              borderRight: '1px solid #7a6a5a',
            }}
          >
            <div className="flex items-center gap-4">
              <SafeIcon name={item.icon} size={18} className="opacity-70" />
              <span className="font-serif font-bold uppercase tracking-[0.2em] text-sm">
                {item.label}
              </span>
            </div>
          </div>
        </button>
      ))}
    </div>
  );
};