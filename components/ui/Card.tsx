
import React, { ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
  className?: string;
}

const Card: React.FC<CardProps> = ({ children, className = '' }) => {
  return (
    <div
      className={`bg-white/40 backdrop-blur-lg border border-white/20 rounded-2xl shadow-lg p-6 ${className}`}
    >
      {children}
    </div>
  );
};

export default Card;
