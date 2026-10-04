import React from 'react';
import { PEN_FONTS } from './penFonts';

export const UnaffiliatedCharacterRow = ({ char, form, setJoinForms, handleJoinForChar }) => (
    <div key={char.id} style={{ border: '1px solid rgba(90,58,40,0.12)', background: 'rgba(255,255,255,0.015)' }}>
      <button
        onClick={() => setJoinForms(f => ({ ...f, [char.id]: { ...f[char.id], expanded: !form.expanded } }))}
        className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-[#5a3a28]/06 transition-colors text-left"
      >
        <span className="text-[#5a3a28]/40 text-xl shrink-0">○</span>
        <p className="font-garamond font-bold text-xl text-[#2b1a0e]/50 flex-1 truncate">{char.name}</p>
        <span className="font-mono-data text-base text-[#5a3a28]/40">{form.expanded ? '▲' : '▼ Join'}</span>
      </button>
      {form.expanded && (
        <div className="px-3 pb-3 space-y-2 border-t" style={{ borderColor: 'rgba(90,58,40,0.1)' }}>
          <input
            type="text"
            value={form.code || ''}
            onChange={e => setJoinForms(f => ({ ...f, [char.id]: { ...f[char.id], code: e.target.value } }))}
            placeholder="Campaign Cipher…"
            className="w-full bg-white/60 border border-[#5a3a28]/30 px-2 py-1.5 font-garamond text-xl lg:text-[28px] text-[#2b1a0e] placeholder-[#5a3a28]/30 outline-none focus:border-[#8b1a1a]/50 mt-2"
          />
          <div>
            <button
              type="button"
              onClick={() => setJoinForms(f => ({ ...f, [char.id]: { ...f[char.id], dropdownOpen: !form.dropdownOpen } }))}
              className="w-full bg-white/60 border border-[#5a3a28]/30 px-3 py-2 flex items-center justify-between hover:bg-white/80 transition-colors"
              style={{ borderColor: form.dropdownOpen ? 'rgba(139,26,26,0.5)' : undefined }}
            >
              <span className="text-xl lg:text-[28px] text-[#2b1a0e]" style={{ fontFamily: form.pen || 'Caveat' }}>
                {form.pen || 'Caveat'}
              </span>
              <span className="text-base text-[#5a3a28]/50 ml-2 shrink-0">{form.dropdownOpen ? '▲' : '▼'}</span>
            </button>
            {form.dropdownOpen && (
              <div className="border border-[#5a3a28]/30 border-t-0 max-h-52 overflow-y-auto"
                style={{ background: '#f7f0de' }}>
                {PEN_FONTS.map(font => (
                  <button
                    key={font}
                    type="button"
                    onClick={() => setJoinForms(f => ({ ...f, [char.id]: { ...f[char.id], pen: font, dropdownOpen: false } }))}
                    className="w-full px-3 py-2 text-left hover:bg-[#5a3a28]/12 transition-colors"
                    style={{
                      fontFamily: font,
                      fontSize: '22px',
                      color: '#2b1a0e',
                      background: (form.pen || 'Caveat') === font ? 'rgba(90,58,40,0.12)' : undefined,
                      borderBottom: '1px solid rgba(90,58,40,0.08)',
                    }}
                  >
                    {font}
                  </button>
                ))}
              </div>
            )}
          </div>
          {form.error && <p className="font-mono-data text-[18px] text-red-700">{form.error}</p>}
          <button
            onClick={() => handleJoinForChar(char.id)}
            disabled={form.loading || !form.code?.trim()}
            className="w-full bg-[#8b1a1a] text-[#fdf8f0] font-cinzel text-[18px] font-bold tracking-widest uppercase px-3 py-1.5 hover:bg-[#a82222] transition-colors disabled:opacity-40"
          >
            {form.loading ? 'Joining…' : 'Join Circle'}
          </button>
        </div>
      )}
    </div>
);
