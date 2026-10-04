// The sketch sheet's drawing code (Excalidraw) is fetched only when a sketch is opened, so
// it stays out of the main bundle. Excalidraw reads where its fonts are before it loads
// them: the build copies them to excalidraw/fonts (vite.config.js), served by this site,
// so it never reaches for a CDN.
export const loadSketchPad = () => {
  if (typeof window !== 'undefined') {
    window.EXCALIDRAW_ASSET_PATH = `${import.meta.env.BASE_URL}excalidraw/`;
  }
  return import('./SketchPad.jsx');
};
