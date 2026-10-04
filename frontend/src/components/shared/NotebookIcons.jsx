import React from 'react';

// Small line icons for the notebook's Photo and Sketch, drawn here so they do not depend on
// an emoji font (the camera emoji showed as an empty box on some systems). One stroke
// weight, current text color.
const Svg = ({ size = 16, className = '', children }) => (
  <svg
    width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
    className={`inline-block shrink-0 ${className}`} aria-hidden="true" focusable="false"
  >
    {children}
  </svg>
);

export const CameraIcon = (props) => (
  <Svg {...props}>
    <path d="M4 8h3l1.6-2.4A1 1 0 0 1 9.4 5h5.2a1 1 0 0 1 .8.6L17 8h3a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z" />
    <circle cx="12" cy="13" r="3.5" />
  </Svg>
);

export const PencilIcon = (props) => (
  <Svg {...props}>
    <path d="M15.5 4.5l4 4L8 20H4v-4z" />
    <path d="M13.5 6.5l4 4" />
  </Svg>
);
