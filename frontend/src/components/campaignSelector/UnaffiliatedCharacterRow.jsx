import React from 'react';
import { PEN_FONTS } from './penFonts';

export const UnaffiliatedCharacterRow = ({ char, form, setJoinForms, handleJoinForChar }) => (
    <div key={char.id} style={{ border: '1px solid rgb(var(--c-sepia) / 0.15)' }}>
      <button
        onClick={() => setJoinForms(f => ({ ...f, [char.id]: { ...f[char.id], expanded: !form.expanded } }))}
        className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-sepia/10 transition-colors text-left"
      >
        <span className="text-sepia/70 text-lg shrink-0">○</span>
        <p className="font-serif font-bold text-xl text-ink/75 flex-1 truncate">{char.name}</p>
        <span className="font-sans font-bold text-xs uppercase tracking-widest text-sepia">{form.expanded ? '▲' : '▼ Join'}</span>
      </button>
      {form.expanded && (
        <div className="px-3 pb-3 space-y-2 border-t" style={{ borderColor: 'rgb(var(--c-sepia) / 0.12)' }}>
          <input
            type="text"
            value={form.code || ''}
            onChange={e => setJoinForms(f => ({ ...f, [char.id]: { ...f[char.id], code: e.target.value } }))}
            placeholder="Campaign Cipher…"
            className="w-full bg-cream/60 border border-sepia/30 px-2 py-1.5 font-serif text-xl text-ink placeholder-sepia/60 outline-none focus:border-oxblood mt-2"
          />
          <div>
            <button
              type="button"
              onClick={() => setJoinForms(f => ({ ...f, [char.id]: { ...f[char.id], dropdownOpen: !form.dropdownOpen } }))}
              className="w-full bg-cream/60 border border-sepia/30 px-3 py-2 flex items-center justify-between hover:bg-cream/80 transition-colors"
              style={{ borderColor: form.dropdownOpen ? 'rgb(var(--c-oxblood) / 0.5)' : undefined }}
            >
              <span className="text-xl lg:text-[28px] text-ink" style={{ fontFamily: form.pen || 'Caveat' }}>
                {form.pen || 'Caveat'}
              </span>
              <span className="text-base text-sepia ml-2 shrink-0">{form.dropdownOpen ? '▲' : '▼'}</span>
            </button>
            {form.dropdownOpen && (
              <div className="border border-sepia/30 border-t-0 max-h-52 overflow-y-auto bg-cream">
                {PEN_FONTS.map(font => (
                  <button
                    key={font}
                    type="button"
                    onClick={() => setJoinForms(f => ({ ...f, [char.id]: { ...f[char.id], pen: font, dropdownOpen: false } }))}
                    className="w-full px-3 py-2 text-left hover:bg-sepia/10 transition-colors"
                    style={{
                      fontFamily: font,
                      fontSize: '22px',
                      color: 'rgb(var(--c-ink))',
                      background: (form.pen || 'Caveat') === font ? 'rgb(var(--c-sepia) / 0.12)' : undefined,
                      borderBottom: '1px solid rgb(var(--c-sepia) / 0.08)',
                    }}
                  >
                    {font}
                  </button>
                ))}
              </div>
            )}
          </div>
          {form.error && <p className="font-serif text-base text-oxblood">{form.error}</p>}
          <button
            onClick={() => handleJoinForChar(char.id)}
            disabled={form.loading || !form.code?.trim()}
            className="w-full bg-oxblood text-cream font-sans font-black text-sm tracking-widest uppercase px-3 py-2.5 rounded hover:brightness-125 transition disabled:opacity-40"
          >
            {form.loading ? 'Joining…' : 'Join Circle'}
          </button>
        </div>
      )}
    </div>
);
