import React from 'react';
// The icons the app draws, not the whole set (gameIcons.js)
import * as Gi from "./gameIcons";

export const SafeIcon = ({ name, size = 18, className = "" }) => {
  if (!name || !Gi[name]) return null;
  return React.createElement(Gi[name], { size, className });
};