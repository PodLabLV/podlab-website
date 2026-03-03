'use client';

import Image from 'next/image';
import { useState, useEffect, useRef } from 'react';

interface ImageWithHoverProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  className?: string;
  priority?: boolean;
}

export default function ImageWithHover({
  src,
  alt,
  width = 800,
  height = 600,
  className = '',
  priority = false,
}: ImageWithHoverProps) {
  const [isHovered, setIsHovered] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Check if we're inside a parent with class="group"
  // If so, watch for group-hover state
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    
    const parentGroup = container.closest('.group');
    if (!parentGroup) return;
    
    const handleMouseEnter = () => setIsHovered(true);
    const handleMouseLeave = () => setIsHovered(false);
    
    parentGroup.addEventListener('mouseenter', handleMouseEnter);
    parentGroup.addEventListener('mouseleave', handleMouseLeave);
    
    return () => {
      parentGroup.removeEventListener('mouseenter', handleMouseEnter);
      parentGroup.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, []);
  
  // Generate B&W and color paths - handles multiple naming patterns
  let bwSrc: string;
  let colorSrc: string;

  if (src.includes('-color.')) {
    // Pattern: name-color.ext → name-bw.ext (studio photos)
    bwSrc = src.replace('-color.', '-bw.');
    colorSrc = src;
  } else {
    // Pattern: name.ext → name-B&W.ext and name.ext (team photos)
    // Check if we're using the color version or base version
    const extension = src.substring(src.lastIndexOf('.'));
    const basePath = src.substring(0, src.lastIndexOf('.'));
    
    bwSrc = `${basePath}-B&W${extension}`;
    colorSrc = src;
  }

  return (
    <div 
      ref={containerRef}
      className={`relative overflow-hidden ${className}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* B&W Image (base layer) */}
      <Image
        src={bwSrc}
        alt={alt}
        width={width}
        height={height}
        className="w-full h-full object-cover"
        priority={priority}
      />
      
      {/* Color Image (reveal on hover) - PREMIUM TRANSITION */}
      <Image
        src={colorSrc}
        alt={alt}
        width={width}
        height={height}
        className="absolute inset-0 w-full h-full object-cover transition-opacity duration-[350ms] ease-out"
        style={{ opacity: isHovered ? 1 : 0 }}
        priority={priority}
      />
    </div>
  );
}
