export interface Point {
  x: number;
  y: number;
}

export interface SVGParserConfig {
  density: number; // Densidade de pontos (quanto maior, mais pontos)
  scale: number;   // Escala do SVG
  offsetX: number; // Offset horizontal
  offsetY: number; // Offset vertical
}

export class SVGParser {
  private config: SVGParserConfig;

  constructor(config: SVGParserConfig) {
    this.config = config;
  }

  /**
   * Converte um elemento SVG em uma array de pontos
   */
  public parseElement(element: SVGElement): Point[] {
    const points: Point[] = [];
    
    if (element instanceof SVGPathElement) {
      return this.parsePath(element);
    } else if (element instanceof SVGCircleElement) {
      return this.parseCircle(element);
    } else if (element instanceof SVGRectElement) {
      return this.parseRect(element);
    } else if (element instanceof SVGTextElement) {
      return this.parseText(element);
    }
    
    return points;
  }

  /**
   * Converte uma string SVG em pontos
   */
  public parseSVGString(svgString: string): Point[] {
    const parser = new DOMParser();
    const doc = parser.parseFromString(svgString, 'image/svg+xml');
    const svgElement = doc.querySelector('svg');
    
    if (!svgElement) {
      console.warn('SVG inválido');
      return [];
    }
    
    const points: Point[] = [];
    const elements = svgElement.querySelectorAll('path, circle, rect, text');
    
    elements.forEach(element => {
      const elementPoints = this.parseElement(element as SVGElement);
      points.push(...elementPoints);
    });
    
    return this.transformPoints(points);
  }

  /**
   * Converte um path SVG em pontos
   */
  private parsePath(pathElement: SVGPathElement): Point[] {
    const points: Point[] = [];
    const pathData = pathElement.getAttribute('d');
    
    if (!pathData) return points;
    
    // Criar um elemento temporário para calcular os pontos
    const tempSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    const tempPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    tempPath.setAttribute('d', pathData);
    tempSvg.appendChild(tempPath);
    document.body.appendChild(tempSvg);
    
    try {
      const pathLength = tempPath.getTotalLength();
      const step = pathLength / (this.config.density * 10);
      
      for (let i = 0; i <= pathLength; i += step) {
        const point = tempPath.getPointAtLength(i);
        points.push({ x: point.x, y: point.y });
      }
    } catch (error) {
      console.warn('Erro ao processar path SVG:', error);
    } finally {
      document.body.removeChild(tempSvg);
    }
    
    return points;
  }

  /**
   * Converte um círculo SVG em pontos
   */
  private parseCircle(circleElement: SVGCircleElement): Point[] {
    const points: Point[] = [];
    const cx = parseFloat(circleElement.getAttribute('cx') || '0');
    const cy = parseFloat(circleElement.getAttribute('cy') || '0');
    const r = parseFloat(circleElement.getAttribute('r') || '0');
    
    const numPoints = Math.max(8, Math.floor(this.config.density * r / 2));
    
    for (let i = 0; i < numPoints; i++) {
      const angle = (i / numPoints) * Math.PI * 2;
      const x = cx + Math.cos(angle) * r;
      const y = cy + Math.sin(angle) * r;
      points.push({ x, y });
    }
    
    return points;
  }

  /**
   * Converte um retângulo SVG em pontos
   */
  private parseRect(rectElement: SVGRectElement): Point[] {
    const points: Point[] = [];
    const x = parseFloat(rectElement.getAttribute('x') || '0');
    const y = parseFloat(rectElement.getAttribute('y') || '0');
    const width = parseFloat(rectElement.getAttribute('width') || '0');
    const height = parseFloat(rectElement.getAttribute('height') || '0');
    
    const stepX = width / Math.max(1, Math.floor(this.config.density * width / 20));
    const stepY = height / Math.max(1, Math.floor(this.config.density * height / 20));
    
    // Borda superior
    for (let i = x; i <= x + width; i += stepX) {
      points.push({ x: i, y });
    }
    
    // Borda direita
    for (let i = y; i <= y + height; i += stepY) {
      points.push({ x: x + width, y: i });
    }
    
    // Borda inferior
    for (let i = x + width; i >= x; i -= stepX) {
      points.push({ x: i, y: y + height });
    }
    
    // Borda esquerda
    for (let i = y + height; i >= y; i -= stepY) {
      points.push({ x, y: i });
    }
    
    return points;
  }

  /**
   * Converte texto SVG em pontos (aproximação)
   */
  private parseText(textElement: SVGTextElement): Point[] {
    const points: Point[] = [];
    const x = parseFloat(textElement.getAttribute('x') || '0');
    const y = parseFloat(textElement.getAttribute('y') || '0');
    const text = textElement.textContent || '';
    
    // Aproximação simples - criar pontos baseados no tamanho do texto
    const charWidth = 12; // Largura aproximada por caractere
    const totalWidth = text.length * charWidth;
    
    const numPoints = Math.max(text.length, Math.floor(this.config.density * totalWidth / 10));
    
    for (let i = 0; i < numPoints; i++) {
      const offsetX = (i / numPoints) * totalWidth;
      points.push({ x: x + offsetX, y });
    }
    
    return points;
  }

  /**
   * Aplica transformações aos pontos (escala, offset)
   */
  private transformPoints(points: Point[]): Point[] {
    return points.map(point => ({
      x: (point.x * this.config.scale) + this.config.offsetX,
      y: (point.y * this.config.scale) + this.config.offsetY
    }));
  }

  /**
   * Cria pontos para formar texto simples
   */
  public createTextPoints(text: string, x: number, y: number, fontSize: number = 48): Point[] {
    const points: Point[] = [];
    const charWidth = fontSize * 0.6;
    const totalWidth = text.length * charWidth;
    
    // Centralizar o texto
    const startX = x - (totalWidth / 2);
    
    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      if (char === ' ') continue;
      
      const charX = startX + (i * charWidth);
      const charPoints = this.createCharacterPoints(char, charX, y, fontSize);
      points.push(...charPoints);
    }
    
    return points;
  }

  /**
   * Cria pontos para um caractere específico (aproximação)
   */
  private createCharacterPoints(char: string, x: number, y: number, fontSize: number): Point[] {
    const points: Point[] = [];
    const density = Math.max(5, Math.floor(this.config.density * fontSize / 10));
    
    // Aproximação simples - criar uma grade de pontos para cada caractere
    const width = fontSize * 0.6;
    const height = fontSize;
    
    for (let i = 0; i < density; i++) {
      for (let j = 0; j < density; j++) {
        const px = x + (i / density) * width;
        const py = y + (j / density) * height;
        
        // Adicionar alguma variação baseada no caractere
        if (this.shouldIncludePoint(char, i / density, j / density)) {
          points.push({ x: px, y: py });
        }
      }
    }
    
    return points;
  }

  /**
   * Determina se um ponto deve ser incluído baseado no caractere
   */
  private shouldIncludePoint(char: string, normalizedX: number, normalizedY: number): boolean {
    // Lógica simples para diferentes caracteres
    const charCode = char.charCodeAt(0);
    const hash = (charCode * normalizedX * normalizedY * 1000) % 1;
    
    // Densidade baseada no caractere
    const threshold = 0.3 + (charCode % 10) * 0.05;
    
    return hash > threshold;
  }

  /**
   * Atualiza a configuração do parser
   */
  public updateConfig(newConfig: Partial<SVGParserConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  createBrainLogo(): Point[] {
    const points: Point[] = [];
    const centerX = 400; // Default center
    const centerY = 300; // Default center
    const scale = 100; // Default scale
    
    // Create brain shape with two hemispheres
    // Left hemisphere
    const leftCenterX = centerX - scale * 0.3;
    const leftCenterY = centerY;
    
    // Right hemisphere
    const rightCenterX = centerX + scale * 0.3;
    const rightCenterY = centerY;
    
    // Generate points for left hemisphere (more organic shape)
    for (let angle = 0; angle < Math.PI * 2; angle += 0.1) {
      const radius = scale * (0.8 + 0.3 * Math.sin(angle * 3) + 0.2 * Math.cos(angle * 5));
      const x = leftCenterX + Math.cos(angle) * radius * 0.7;
      const y = leftCenterY + Math.sin(angle) * radius * 0.9;
      points.push({ x, y });
    }
    
    // Generate points for right hemisphere
    for (let angle = 0; angle < Math.PI * 2; angle += 0.1) {
      const radius = scale * (0.8 + 0.3 * Math.sin(angle * 3) + 0.2 * Math.cos(angle * 5));
      const x = rightCenterX + Math.cos(angle) * radius * 0.7;
      const y = rightCenterY + Math.sin(angle) * radius * 0.9;
      points.push({ x, y });
    }
    
    // Add brain stem
    const stemPoints = 15;
    for (let i = 0; i < stemPoints; i++) {
      const t = i / (stemPoints - 1);
      const x = centerX + (Math.random() - 0.5) * scale * 0.2;
      const y = centerY + scale * 0.8 + t * scale * 0.4;
      points.push({ x, y });
    }
    
    // Add circuit-like connections (additional scattered points)
    const circuitPoints = 30;
    for (let i = 0; i < circuitPoints; i++) {
      const angle = Math.random() * Math.PI * 2;
      const radius = scale * (0.4 + Math.random() * 0.6);
      const x = centerX + Math.cos(angle) * radius;
      const y = centerY + Math.sin(angle) * radius * 0.8;
      points.push({ x, y });
    }
    
    return points;
  }
}