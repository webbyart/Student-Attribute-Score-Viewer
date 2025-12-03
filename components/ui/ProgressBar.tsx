
import React from 'react';

interface ProgressBarProps {
  value: number;
  max: number;
  color?: string;
  className?: string;
  showLabel?: boolean;
}

const ProgressBar: React.FC<ProgressBarProps> = ({ 
  value, 
  max, 
  color = 'bg-green-500', 
  className = '',
  showLabel = true
}) => {
  const percentage = max > 0 ? Math.min(100, Math.max(0, Math.round((value / max) * 100))) : 0;

  return (
    <div className={`w-full ${className}`}>
      <div className="flex justify-between items-end mb-1">
        {showLabel && (
            <span className="text-[10px] font-bold text-slate-500">
                {value}/{max} ({percentage}%)
            </span>
        )}
      </div>
      <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
        <div 
          className={`h-full rounded-full transition-all duration-500 ease-out ${color}`} 
          style={{ width: `${percentage}%` }}
        ></div>
      </div>
    </div>
  );
};

export default ProgressBar;
