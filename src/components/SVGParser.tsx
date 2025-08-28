import React, { useState, useEffect } from 'react';
import { cn } from '../utils/cn';

interface SVGParserProps {
  svgString?: string;
  url?: string;
  className?: string;
  width?: number | string;
  height?: number | string;
  fill?: string;
  stroke?: string;
  onLoad?: () => void;
  onError?: (error: Error) => void;
  fallback?: React.ReactNode;
}

interface ParsedSVG {
  content: string;
  viewBox?: string;
  width?: string;
  height?: string;
}

export const SVGParser: React.FC<SVGParserProps> = ({
  svgString,
  url,
  className,
  width,
  height,
  fill,
  stroke,
  onLoad,
  onError,
  fallback
}) => {
  const [parsedSVG, setParsedSVG] = useState<ParsedSVG | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Parse SVG string
  const parseSVGString = (svg: string): ParsedSVG | null => {
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(svg, 'image/svg+xml');
      const svgElement = doc.querySelector('svg');
      
      if (!svgElement) {
        throw new Error('Invalid SVG: No SVG element found');
      }

      // Check for parsing errors
      const parserError = doc.querySelector('parsererror');
      if (parserError) {
        throw new Error('SVG parsing error: ' + parserError.textContent);
      }

      return {
        content: svgElement.innerHTML,
        viewBox: svgElement.getAttribute('viewBox') || undefined,
        width: svgElement.getAttribute('width') || undefined,
        height: svgElement.getAttribute('height') || undefined
      };
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown parsing error');
      setError(error);
      onError?.(error);
      return null;
    }
  };

  // Load SVG from URL
  const loadSVGFromURL = async (svgUrl: string): Promise<void> => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(svgUrl);
      if (!response.ok) {
        throw new Error(`Failed to fetch SVG: ${response.status} ${response.statusText}`);
      }
      
      const svgText = await response.text();
      const parsed = parseSVGString(svgText);
      
      if (parsed) {
        setParsedSVG(parsed);
        onLoad?.();
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown fetch error');
      setError(error);
      onError?.(error);
    } finally {
      setLoading(false);
    }
  };

  // Effect to handle SVG loading
  useEffect(() => {
    if (svgString) {
      const parsed = parseSVGString(svgString);
      if (parsed) {
        setParsedSVG(parsed);
        onLoad?.();
      }
    } else if (url) {
      loadSVGFromURL(url);
    }
  }, [svgString, url]);

  // Loading state
  if (loading) {
    return (
      <div className={cn('flex items-center justify-center', className)}>
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500" />
      </div>
    );
  }

  // Error state
  if (error) {
    if (fallback) {
      return <>{fallback}</>;
    }
    
    return (
      <div className={cn('flex items-center justify-center text-red-500', className)}>
        <span className="text-sm">Failed to load SVG</span>
      </div>
    );
  }

  // No SVG loaded
  if (!parsedSVG) {
    if (fallback) {
      return <>{fallback}</>;
    }
    
    return (
      <div className={cn('flex items-center justify-center text-gray-400', className)}>
        <span className="text-sm">No SVG provided</span>
      </div>
    );
  }

  // Render parsed SVG
  return (
    <svg
      className={className}
      width={width || parsedSVG.width}
      height={height || parsedSVG.height}
      viewBox={parsedSVG.viewBox}
      fill={fill || 'currentColor'}
      stroke={stroke}
      xmlns="http://www.w3.org/2000/svg"
      dangerouslySetInnerHTML={{ __html: parsedSVG.content }}
    />
  );
};

// Hook for parsing SVG strings
export const useSVGParser = () => {
  const [cache] = useState(new Map<string, ParsedSVG>());

  const parseSVG = (svgString: string): ParsedSVG | null => {
    // Check cache first
    if (cache.has(svgString)) {
      return cache.get(svgString)!;
    }

    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(svgString, 'image/svg+xml');
      const svgElement = doc.querySelector('svg');
      
      if (!svgElement) {
        throw new Error('Invalid SVG: No SVG element found');
      }

      const parserError = doc.querySelector('parsererror');
      if (parserError) {
        throw new Error('SVG parsing error: ' + parserError.textContent);
      }

      const parsed: ParsedSVG = {
        content: svgElement.innerHTML,
        viewBox: svgElement.getAttribute('viewBox') || undefined,
        width: svgElement.getAttribute('width') || undefined,
        height: svgElement.getAttribute('height') || undefined
      };

      // Cache the result
      cache.set(svgString, parsed);
      return parsed;
    } catch (error) {
      console.error('SVG parsing error:', error);
      return null;
    }
  };

  const clearCache = () => {
    cache.clear();
  };

  return {
    parseSVG,
    clearCache,
    cacheSize: cache.size
  };
};

export default SVGParser;