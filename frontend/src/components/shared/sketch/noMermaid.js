// Stands in for @excalidraw/mermaid-to-excalidraw (vite.config.js aliases it here).
// Excalidraw loads it only for its text-to-diagram dialog, which the sketch sheet never
// shows; the real package brings all of Mermaid, which more than fills the build
// machine's memory. Anything that still reaches it gets a plain refusal.
const unavailable = async () => {
  throw new Error('Diagrams from text are not part of the sketch sheet.');
};

export const parseMermaidToExcalidraw = unavailable;
export default { parseMermaidToExcalidraw: unavailable };
