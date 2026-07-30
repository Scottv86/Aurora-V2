import React from 'react';
import { Navigate } from 'react-router-dom';

export const BuilderChoice: React.FC = () => {
  return <Navigate to="/workspace/settings/platform-modules?newModule=true" replace />;
};
