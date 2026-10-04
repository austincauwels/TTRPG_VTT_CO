import React from 'react';

// A photo mount, as on an album page: a recessed window of older paper with four black
// paper corners to slip a photograph into (.photo-mount in index.css). Empty, it shows the
// faint printed outline of a sitter, so it reads at once as the place for a portrait; with
// a photo, the corners hold it. Children sit on top (a label, a caption).
const Sitter = () => (
  <svg aria-hidden="true" focusable="false" viewBox="0 0 100 125" preserveAspectRatio="xMidYMax meet" className="photo-mount-sitter">
    <ellipse cx="50" cy="44" rx="18" ry="22" />
    <path d="M14 125c0-24 14-40 36-40s36 16 36 40Z" />
  </svg>
);

export const PhotoMount = ({ src, alt = '', className = '', imgClassName = '', children }) => (
  <span className={`photo-mount ${className}`}>
    {src
      ? <img src={src} alt={alt} className={`absolute inset-0 w-full h-full object-cover ${imgClassName}`} />
      : <Sitter />}
    <span aria-hidden="true" className="photo-corner photo-corner-tl" />
    <span aria-hidden="true" className="photo-corner photo-corner-tr" />
    <span aria-hidden="true" className="photo-corner photo-corner-bl" />
    <span aria-hidden="true" className="photo-corner photo-corner-br" />
    {children}
  </span>
);
