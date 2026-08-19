import { useEffect, useRef, useState, type CSSProperties } from 'react';

import { cn } from '@/lib/utils';

interface TruncatedTextProps {
  text: string;
  maxLines?: number;
  className?: string;
  buttonClassName?: string;
  expandText?: string;
  collapseText?: string;
}

export function TruncatedText({
  text,
  maxLines = 3,
  className,
  buttonClassName,
  expandText = 'Ver mais',
  collapseText = 'Ver menos',
}: TruncatedTextProps) {
  const textRef = useRef<HTMLParagraphElement>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [showButton, setShowButton] = useState(false);

  useEffect(() => {
    const el = textRef.current;
    if (!el) return;

    const checkOverflow = () => {
      if (isExpanded) return;
      setShowButton(el.scrollHeight > el.clientHeight + 1);
    };

    checkOverflow();
    const observer = new ResizeObserver(checkOverflow);
    observer.observe(el);
    return () => observer.disconnect();
  }, [text, isExpanded]);

  const lineClampStyle: CSSProperties = isExpanded
    ? {}
    : {
        display: '-webkit-box',
        WebkitLineClamp: maxLines,
        WebkitBoxOrient: 'vertical',
        overflow: 'hidden',
      };

  return (
    <div className='flex flex-col gap-2'>
      <p ref={textRef} className={cn(className)} style={lineClampStyle}>
        {text}
      </p>
      {showButton && (
        <button
          type='button'
          onClick={() => setIsExpanded((v) => !v)}
          className={cn(
            'w-fit text-[13px] font-semibold transition-opacity',
            buttonClassName,
          )}
        >
          {isExpanded ? collapseText : expandText}
        </button>
      )}
    </div>
  );
}
