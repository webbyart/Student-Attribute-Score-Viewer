
import React from 'react';

interface FileChipProps {
  filename: string;
  onRemove?: () => void;
  className?: string;
}

const getFileIcon = (filename: string) => {
  const ext = filename.split('.').pop()?.toLowerCase();
  
  if (['doc', 'docx'].includes(ext || '')) {
    return (
      <div className="p-1.5 bg-blue-100 rounded-md text-blue-600 shrink-0">
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zm-1 2l5 5h-5V4zM6 20V4h5v7h7v9H6z"/>
            <path d="M14 11.5h-2.5V14H14v2h-2.5v2.5H14v2h-4V11h4z"/> 
        </svg>
      </div>
    );
  }
  if (['xls', 'xlsx', 'csv'].includes(ext || '')) {
    return (
      <div className="p-1.5 bg-green-100 rounded-md text-green-600 shrink-0">
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zm-1 2l5 5h-5V4zM6 20V4h5v7h7v9H6z"/>
            <path d="M10 10h1v5h-1zm2 0h1v5h-1zm2 0h1v5h-1z"/>
        </svg>
      </div>
    );
  }
  if (['ppt', 'pptx'].includes(ext || '')) {
    return (
      <div className="p-1.5 bg-orange-100 rounded-md text-orange-600 shrink-0">
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zm-1 2l5 5h-5V4zM6 20V4h5v7h7v9H6z"/>
            <path d="M10 12h3a1 1 0 0 0 0-2h-3v5h1v-3z"/>
        </svg>
      </div>
    );
  }
  if (['pdf'].includes(ext || '')) {
    return (
      <div className="p-1.5 bg-red-100 rounded-md text-red-600 shrink-0">
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M20 2H8c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-8.5 7.5c0 .83-.67 1.5-1.5 1.5H9v2H7.5V7H10c.83 0 1.5.67 1.5 1.5v1zm5 2c0 .83-.67 1.5-1.5 1.5h-2.5V7H15c.83 0 1.5.67 1.5 1.5v3zm4-3H19v1h1.5v1.5H19v2h-1.5V7h2V8.5zM9 9.5h1v-1H9v1zM4 6H2v14c0 1.1.9 2 2 2h14v-2H4V6zm10 5.5h1v-3h-1v3z"/>
        </svg>
      </div>
    );
  }
  if (['jpg', 'jpeg', 'png', 'gif'].includes(ext || '')) {
    return (
      <div className="p-1.5 bg-purple-100 rounded-md text-purple-600 shrink-0">
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/>
        </svg>
      </div>
    );
  }
  return (
    <div className="p-1.5 bg-slate-100 rounded-md text-slate-500 shrink-0">
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zm-1 2l5 5h-5V4zM6 20V4h5v7h7v9H6z"/>
        </svg>
    </div>
  );
};

const FileChip: React.FC<FileChipProps> = ({ filename, onRemove, className = '' }) => {
  const isUrl = filename.startsWith('http');
  const displayName = isUrl ? filename.split('/').pop()?.split('?')[0] : filename;
  
  return (
    <div className={`flex items-center gap-3 bg-white border border-slate-200 pl-2 pr-3 py-2 rounded-xl text-sm font-medium text-slate-700 shadow-sm transition hover:shadow-md group ${className}`}>
      {getFileIcon(filename)}
      
      <div className="flex flex-col min-w-0 flex-1">
         <a 
            href={isUrl ? filename : '#'} 
            target="_blank" 
            rel="noopener noreferrer"
            className="truncate max-w-[140px] hover:text-purple-600 hover:underline cursor-pointer font-medium leading-tight" 
            title={displayName}
        >
            {displayName}
        </a>
        <span className="text-[10px] text-slate-400 flex items-center gap-1">
            {isUrl ? (
                <>
                <span>ดาวน์โหลด</span>
                {/* Mock file size since we can't easily get it without headers */}
                <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                <span>File</span>
                </>
            ) : 'พร้อมอัพโหลด'}
        </span>
      </div>

      {isUrl && (
         <a 
            href={filename} 
            target="_blank" 
            rel="noopener noreferrer" 
            className="ml-2 p-1.5 rounded-full bg-purple-50 text-purple-600 hover:bg-purple-600 hover:text-white transition-colors"
            title="ดาวน์โหลดไฟล์"
        >
             <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
             </svg>
         </a>
      )}

      {onRemove && (
        <button 
          type="button"
          onClick={onRemove}
          className="ml-2 p-1.5 rounded-full text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </div>
  );
};

export default FileChip;
