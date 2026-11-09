import React, { useState } from 'react';
import { Maximize2, X, AlertCircle, ZoomIn } from 'lucide-react';

interface QuestionImageProps {
  imageUrl?: string;
  altText?: string;
  caption?: string;
  className?: string;
  maxHeightClass?: string;
  allowZoom?: boolean;
}

export const QuestionImage: React.FC<QuestionImageProps> = ({
  imageUrl,
  altText = 'Clinical question reference visual',
  caption,
  className = '',
  maxHeightClass = 'max-h-72 sm:max-h-80',
  allowZoom = true
}) => {
  const [hasError, setHasError] = useState(false);
  const [isZoomed, setIsZoomed] = useState(false);

  // If no image exists, maintain the existing text-only layout without taking space
  if (!imageUrl || imageUrl.trim() === '') {
    return null;
  }

  if (hasError) {
    return (
      <div className="my-3 p-3 bg-slate-100 rounded-2xl border border-slate-200 text-slate-500 text-xs flex items-center gap-2 max-w-md">
        <AlertCircle size={15} className="text-amber-500 shrink-0" />
        <span>Clinical reference image could not be loaded.</span>
      </div>
    );
  }

  return (
    <>
      <div className={`my-4 flex flex-col items-center justify-center ${className}`}>
        <div className="relative group max-w-full rounded-2xl overflow-hidden bg-slate-900/5 border border-slate-200/80 shadow-xs hover:shadow-md transition-all">
          <img
            src={imageUrl}
            alt={altText}
            onError={() => setHasError(true)}
            className={`w-auto object-contain mx-auto rounded-2xl transition-transform ${maxHeightClass}`}
            loading="lazy"
          />

          {allowZoom && (
            <button
              type="button"
              onClick={() => setIsZoomed(true)}
              className="absolute bottom-2.5 right-2.5 px-2.5 py-1.5 bg-slate-900/80 hover:bg-slate-900 text-white text-[11px] font-bold rounded-xl shadow-md opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1.5 backdrop-blur-xs cursor-pointer"
              title="Click to examine full-resolution image"
            >
              <ZoomIn size={13} />
              <span>Zoom</span>
            </button>
          )}
        </div>

        {caption && (
          <p className="text-[11px] text-slate-500 font-semibold mt-1.5 text-center italic">
            {caption}
          </p>
        )}
      </div>

      {/* Enlarged Lightbox Modal */}
      {isZoomed && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in"
          onClick={() => setIsZoomed(false)}
        >
          <div 
            className="relative max-w-5xl max-h-[90vh] bg-slate-900 rounded-3xl p-3 border border-slate-800 shadow-2xl flex flex-col items-center overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-full flex items-center justify-between pb-2 px-3 text-white">
              <span className="text-xs font-bold text-slate-300 truncate">{altText}</span>
              <button
                type="button"
                onClick={() => setIsZoomed(false)}
                className="p-1.5 text-slate-400 hover:text-white bg-white/10 hover:bg-white/20 rounded-xl transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 w-full flex items-center justify-center overflow-auto p-2">
              <img
                src={imageUrl}
                alt={altText}
                className="max-h-[80vh] max-w-full w-auto object-contain rounded-xl"
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default QuestionImage;
