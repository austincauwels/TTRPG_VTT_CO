import React from 'react';
import * as Gi from "react-icons/gi";

export const SafeIcon = ({ name, size = 18, className = "" }) => {
  if (!name || !Gi[name]) return null;
  return React.createElement(Gi[name], { size, className });
};