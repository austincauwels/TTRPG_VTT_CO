import React from 'react';
import { SafeIcon } from '../shared/SafeIcon';

// Desktop: the four torn paper slips stacked in the left rail. Below lg: the same slips
// as a compact strip that stays at the top of the screen, not rotated, with the active
// slip lit and underlined in oxblood.
export const GMSidebar = ({ activeTab, setActiveTab }) => {
  const navItems = [
    { id: 'roster', label: 'Roster', icon: 'GiFiles' },
    { id: 'circle', label: 'Circle View', icon: 'GiEyeShield' },
    { id: 'archives', label: 'Archives', icon: 'GiScroll' },
    { id: 'map', label: 'Map', icon: 'GiCompass' }
  ];

  return (
    <nav
      aria-label="Desk sections"
      className="sticky top-0 z-40 -mx-4 px-3 py-2 bg-[#020617] shadow-[0_6px_12px_rgba(0,0,0,0.6)] flex gap-1.5
                 lg:static lg:z-auto lg:mx-0 lg:px-0 lg:py-0 lg:bg-transparent lg:shadow-none lg:flex-col lg:gap-4 lg:w-full lg:pt-4"
    >
      {navItems.map((item, index) => {
        const active = activeTab === item.id;
        return (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            aria-current={active ? 'page' : undefined}
            className={`relative group flex-auto min-w-0 lg:flex-none transition-all duration-500 ease-out lg:w-full
              ${active ? 'z-20 lg:scale-[1.02]' : 'lg:hover:scale-[1.02]'}
              ${index % 2 === 0 ? 'lg:-rotate-1' : 'lg:rotate-1'}`}
          >
            {/* Phones: a small flat slip */}
            <div
              className={`lg:hidden min-h-[44px] h-full px-2 py-2 flex items-center justify-center text-center rounded-sm text-[#2c2420] ${
                active
                  ? 'bg-[#e8dcc4] shadow-[inset_0_-3px_0_#721c15,2px_3px_6px_rgba(0,0,0,0.5)]'
                  : 'bg-[#c4b59d] shadow-[2px_3px_6px_rgba(0,0,0,0.5)]'}`}
            >
              <span className={`font-serif uppercase tracking-[0.08em] text-xs leading-tight ${active ? 'font-black text-[#721c15]' : 'font-bold'}`}>
                {item.label}
              </span>
            </div>

            {/* Burnt, Ripped, Full-Width Slip */}
            <div
              className="hidden lg:block w-full px-6 py-5 bg-[#e8dcc4] text-[#2c2420] shadow-[5px_5px_15px_rgba(0,0,0,0.6)]"
              style={{
                clipPath: 'polygon(0% 2%, 99% 0%, 100% 98%, 2% 100%)',
                background: 'linear-gradient(135deg, #e8dcc4 60%, #c4b59d 90%, #5e4a3a 100%)',
                borderLeft: '2px solid #7a6a5a',
                borderRight: '1px solid #7a6a5a',
              }}
            >
              <div className={`flex items-center gap-4 ${active ? 'text-[#721c15]' : ''}`}>
                <SafeIcon name={item.icon} size={18} className="opacity-70" />
                <span className={`font-serif uppercase tracking-[0.2em] text-sm ${active ? 'font-black' : 'font-bold'}`}>
                  {item.label}
                </span>
              </div>
            </div>
          </button>
        );
      })}
    </nav>
  );
};
