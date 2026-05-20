import React from 'react';
import { SafeIcon } from './SafeIcon';

export const ArchivesView = () => {
  return (
    <div className="bg-[#2a1a13] p-4 sm:p-6 rounded-sm shadow-[0_25px_55px_rgba(0,0,0,0.95)] border-[14px] border-[#1c110c] relative min-h-[850px] animate-fadeIn bg-[url('https://www.transparenttextures.com/patterns/dark-leather.png')]">
      
      {/* Inside Double Page Grid Layout Layout */}
      <div className="w-full h-full grid grid-cols-1 lg:grid-cols-2 bg-[#fdfaf2] text-black relative shadow-inner border border-black/30 overflow-hidden min-h-[800px] rounded-sm">
        <div className="absolute inset-0 opacity-20 pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/cream-paper.png')]" />
        
        {/* --- LEFT PAGE: BUREAU REGISTRY INDEX MATRIX --- */}
        <div className="p-8 lg:pr-12 relative flex flex-col justify-between border-b lg:border-b-0 lg:border-r border-black/20">
          <div className="absolute top-3 left-3 font-mono text-[7px] text-black/30 tracking-widest uppercase">Section I // Dossier Index Slip</div>
          
          <div>
            <header className="border-b-2 border-black/80 pb-4 mb-6">
              <h2 className="text-3xl font-serif font-black tracking-tight text-black uppercase">Collective Campaign Archive</h2>
              <p className="text-[10px] font-mono uppercase tracking-widest text-[#721c15] font-black mt-1">Classified Phenomenon Investigation Manifest</p>
            </header>

            {/* Dynamic Interactive Case Logs */}
            <div className="space-y-4">
              <span className="block font-sans text-[9px] font-black text-black/40 uppercase tracking-widest border-b border-black/5 pb-1">Unresolved Investigation Files</span>
              
              {[
                { id: "CASE-001", title: "The Redfield Library Leak", status: "CONTAINED", date: "MAR 2026" },
                { id: "CASE-002", title: "The Bridged Bleed Anomaly", status: "ACTIVE INQUIRY", date: "APR 2026" },
                { id: "CASE-003", title: "Autopsy Vector Tissue Degradation", status: "REDACTED", date: "MAY 2026" }
              ].map((item, idx) => (
                <div key={idx} className="bg-black/[0.02] border border-black/10 p-3 rounded-sm flex items-center justify-between shadow-sm transition-all hover:bg-black/[0.04] cursor-pointer">
                  <div className="font-mono">
                    <span className="text-[9px] text-[#721c15] font-black tracking-tighter block">{item.id}</span>
                    <span className="text-sm font-serif font-bold text-black/90">{item.title}</span>
                  </div>
                  <div className="text-right font-mono text-[9px]">
                    <span className={`inline-block px-1.5 py-0.5 rounded-sm font-black text-white ${item.status === 'CONTAINED' ? 'bg-emerald-800' : item.status === 'REDACTED' ? 'bg-gray-800' : 'bg-[#721c15]'}`}>{item.status}</span>
                    <span className="block text-black/40 mt-1 font-bold">{item.date}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Bottom Page Branding Footer */}
          <div className="mt-8 pt-4 border-t border-black/10 flex justify-between items-center font-mono text-[9px] text-black/40">
            <span>© ORDER MATRIX RECORD ARCHIVE</span>
            <span className="font-bold">PAGE 142</span>
          </div>
        </div>

        {/* --- NOTEBOOK REINFORCED SPINE SHADOW GUTTER SEPARATION --- */}
        <div className="hidden lg:block absolute top-0 bottom-0 left-1/2 -translate-x-1/2 w-8 bg-gradient-to-r from-black/15 via-black/35 to-black/15 pointer-events-none border-l border-r border-black/5 z-20" />

        {/* --- RIGHT PAGE: REDACTED intelligence INTEL FIELD RECORDS --- */}
        <div className="p-8 lg:pl-12 relative flex flex-col justify-between bg-[#faf5e8]">
          <div className="absolute top-3 right-3 font-mono text-[7px] text-black/30 tracking-widest uppercase">Section II // Field Operations Matrix</div>

          <div>
            <header className="border-b-2 border-black/80 pb-4 mb-6 flex justify-between items-end">
              <div>
                <h3 className="text-lg font-serif font-black tracking-tight text-black uppercase">Active Operation Field Notes</h3>
                <p className="text-[9px] font-mono uppercase tracking-wider text-black/40 mt-0.5">Subject Mutation & Extraction Matrix Logs</p>
              </div>
              <span className="font-mono text-xs bg-black text-[#faf5e8] px-2 py-0.5 font-bold rounded-sm tracking-tighter">SECURED INDEX</span>
            </header>

            <div className="space-y-4">
              {/* Lined Paper Transcription Sheet Area */}
              <div className="border border-black/10 p-4 bg-white/40 shadow-inner rounded-sm relative">
                <div className="absolute top-2 right-2 text-black/10 pointer-events-none"><SafeIcon name="GiPaperClip" size={20} /></div>
                
                <p className="font-serif text-sm leading-relaxed text-black/80 mb-3 italic">
                  "Anomalous contamination traces discovered during investigation routines must be cataloged immediately. Physical contact vectors carry extreme cell degradation risks unless treated through targeted Stitch procedures before secondary permanent trauma structures harden into place permanently..."
                </p>
                
                <div className="space-y-2 pt-3 border-t border-dashed border-black/20 font-mono text-[11px] text-black/70">
                  <p><span className="font-black text-[#721c15] mr-1">[!] FIELD ALERT:</span> Faction parameters identified outside normal operational thresholds.</p>
                  <p><span className="font-black text-black mr-1">[✓] EXTRACTION:</span> Artifact retrieval verified through deep sub-vault network extraction channels.</p>
                </div>
              </div>

              {/* Threat Anomaly Analysis Box Matrix */}
              <div className="bg-[#721c15]/5 border border-[#721c15]/20 p-3.5 rounded-sm">
                <span className="block font-mono text-[9px] font-black text-[#721c15] uppercase tracking-widest mb-2 border-b border-[#721c15]/10 pb-1">Toxicity Bleed Parameter Warnings</span>
                <p className="font-serif text-xs leading-normal text-black/70">
                  Active structural anomalies maintain a constant radiation emission rhythm. Operative units deployed in nearby perimeters are instructed to cycle active protection relays to minimize long-term psychological scarring.
                </p>
              </div>
            </div>
          </div>

          {/* Bottom Page Branding Footer */}
          <div className="mt-8 pt-4 border-t border-black/10 flex justify-between items-center font-mono text-[9px] text-black/40">
            <span className="font-bold">CLASSIFIED OUTPOST REGISTER</span>
            <span className="font-bold">PAGE 143</span>
          </div>
        </div>

      </div>
    </div>
  );
};