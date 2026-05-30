
import React, { useState, useEffect, useLayoutEffect } from 'react';
import { X, ChevronRight, ChevronLeft, Sparkles } from 'lucide-react';

export interface TourStep {
  target: string;
  title: string;
  content: string;
  placement?: 'top' | 'bottom' | 'left' | 'right' | 'center';
}

interface OnboardingTourProps {
  steps: TourStep[];
  storageKey: string;
  onComplete?: () => void;
}

const OnboardingTour: React.FC<OnboardingTourProps> = ({ steps, storageKey, onComplete }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [isActive, setIsActive] = useState(false);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const [isCalculating, setIsCalculating] = useState(true);

  useEffect(() => {
    const hasSeen = localStorage.getItem(storageKey);
    if (!hasSeen) {
      // Small delay to ensure DOM is ready
      const timer = setTimeout(() => setIsActive(true), 800);
      return () => clearTimeout(timer);
    }
  }, [storageKey]);

  const handleFinish = () => {
    setIsActive(false);
    localStorage.setItem(storageKey, 'true');
    if (onComplete) onComplete();
  };

  const handleSkip = (e: React.MouseEvent) => {
    e.stopPropagation();
    handleFinish();
  };

  const currentStepData = steps[currentStep];

  useLayoutEffect(() => {
    if (!isActive || !currentStepData) return;

    const updatePosition = () => {
      const targetSelector = currentStepData.target;
      if (targetSelector === 'center') {
        setRect(null);
        setIsCalculating(false);
        return;
      }

      const el = document.querySelector(targetSelector);
      if (el) {
        // Calculate visibility
        const r = el.getBoundingClientRect();
        const isVisible = (
          r.top >= 0 &&
          r.left >= 0 &&
          r.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
          r.right <= (window.innerWidth || document.documentElement.clientWidth)
        );

        // Only scroll if strictly necessary to avoid layout shifts (white background bleed)
        if (!isVisible) {
             el.scrollIntoView({ behavior: 'auto', block: 'nearest', inline: 'nearest' });
        }
        
        // Re-measure after potential scroll
        const rUpdated = el.getBoundingClientRect();
        
        // Add padding to highlight box
        setRect({
          ...rUpdated,
          top: rUpdated.top - 8,
          left: rUpdated.left - 8,
          width: rUpdated.width + 16,
          height: rUpdated.height + 16,
          bottom: rUpdated.bottom + 8,
          right: rUpdated.right + 8,
          x: rUpdated.x - 8,
          y: rUpdated.y - 8,
          toJSON: () => {}
        });
      } else {
        // Fallback if element not found, just center it
        setRect(null);
      }
      setIsCalculating(false);
    };

    // Delay slightly to ensure layout is stable
    const timer = setTimeout(updatePosition, 100);
    window.addEventListener('resize', updatePosition);
    return () => {
        window.removeEventListener('resize', updatePosition);
        clearTimeout(timer);
    };
  }, [currentStep, isActive, currentStepData]);

  if (!isActive) return null;

  const isGlobalCenter = !rect || currentStepData.target === 'center';
  
  // Prevent flash of center content while calculating position for non-center targets
  if (isCalculating && currentStepData.target !== 'center') {
      return null;
  }

  // --- Safe Positioning Logic ---
  let tooltipStyle: React.CSSProperties = {};

  if (isGlobalCenter || currentStepData.placement === 'center') {
    tooltipStyle = {
      position: 'fixed',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      zIndex: 10000
    };
  } else if (rect) {
    const placement = currentStepData.placement || 'bottom';
    const gap = 16;
    const tooltipWidth = 320; 
    const estTooltipHeight = 280; 
    const padding = 20; 

    let top: number | undefined;
    let left: number | undefined;
    let bottom: number | undefined;

    switch (placement) {
      case 'right':
        top = rect.top;
        left = rect.right + gap;
        break;
      case 'left':
        top = rect.top;
        left = rect.left - tooltipWidth - gap;
        break;
      case 'bottom':
        top = rect.bottom + gap;
        left = rect.left + (rect.width / 2) - (tooltipWidth / 2);
        break;
      case 'top':
        bottom = window.innerHeight - rect.top + gap;
        left = rect.left + (rect.width / 2) - (tooltipWidth / 2);
        break;
    }

    // Boundary Protection
    if (left !== undefined) {
       if (left < padding) left = padding;
       if (left + tooltipWidth > window.innerWidth - padding) {
           left = window.innerWidth - tooltipWidth - padding;
       }
    }

    if (top !== undefined) {
        // Check vertical overflow
        if (top < padding) top = padding;
        const projectedBottom = top + estTooltipHeight;
        if (projectedBottom > window.innerHeight - padding) {
            top = Math.max(padding, window.innerHeight - estTooltipHeight - padding);
        }
    }

    tooltipStyle = {
        position: 'fixed', // Use fixed to avoid scroll issues
        left: left,
        top: top,
        bottom: bottom,
        width: tooltipWidth,
        zIndex: 10000
    };
  }

  return (
    <div className="fixed inset-0 z-[9999] overflow-hidden pointer-events-none">
      <div className="absolute inset-0 pointer-events-auto">
        {isGlobalCenter ? (
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-all duration-500" />
        ) : (
            <div className="absolute inset-0">
                <svg className="w-full h-full text-black/60 fill-current backdrop-blur-[1px]">
                    <path d={`
                        M0,0 H${window.innerWidth} V${window.innerHeight} H0 Z
                        M${rect!.left},${rect!.top} 
                        h${rect!.width} 
                        v${rect!.height} 
                        h-${rect!.width} 
                        Z
                    `} fillRule="evenodd" />
                </svg>
                <div 
                    className="absolute border-2 border-amber-500 rounded-xl shadow-[0_0_30px_rgba(245,158,11,0.6)] animate-pulse"
                    style={{
                        top: rect!.top,
                        left: rect!.left,
                        width: rect!.width,
                        height: rect!.height
                    }}
                />
            </div>
        )}
      </div>

      <div 
        className="bg-white rounded-2xl shadow-2xl p-6 border border-amber-100 flex flex-col pointer-events-auto"
        style={tooltipStyle}
      >
        <div className="flex justify-between items-start mb-4">
            <h3 className="text-lg font-black text-gray-800 flex items-center">
                {currentStep === 0 && <Sparkles className="text-amber-500 mr-2" size={20} />}
                {currentStepData.title}
            </h3>
            <button onClick={handleSkip} className="text-gray-400 hover:text-gray-600 p-1 pointer-events-auto cursor-pointer">
                <X size={16} />
            </button>
        </div>
        
        <p className="text-sm text-gray-600 leading-relaxed mb-6">
            {currentStepData.content}
        </p>

        <div className="flex items-center justify-between mt-auto">
            <div className="flex space-x-1">
                {steps.map((_, idx) => (
                    <div 
                        key={idx} 
                        className={`w-1.5 h-1.5 rounded-full transition-colors ${idx === currentStep ? 'bg-amber-500' : 'bg-gray-200'}`}
                    />
                ))}
            </div>
            
            <div className="flex space-x-2">
                {currentStep > 0 && (
                    <button 
                        onClick={() => {
                            setIsCalculating(true);
                            setCurrentStep(prev => prev - 1);
                        }}
                        className="px-3 py-1.5 text-xs font-bold text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                        上一步
                    </button>
                )}
                <button 
                    onClick={() => {
                        if (currentStep < steps.length - 1) {
                            setIsCalculating(true);
                            setCurrentStep(prev => prev + 1);
                        } else {
                            handleFinish();
                        }
                    }}
                    className="px-4 py-1.5 bg-gray-900 text-white text-xs font-bold rounded-lg hover:bg-black transition-all shadow-lg flex items-center"
                >
                    {currentStep < steps.length - 1 ? '下一步' : '开始创作'}
                    {currentStep < steps.length - 1 && <ChevronRight size={14} className="ml-1" />}
                </button>
            </div>
        </div>
      </div>
    </div>
  );
};

export default OnboardingTour;
