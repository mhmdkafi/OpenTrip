export interface SplitResult {
  name: string;
  isAmbiguous: boolean;
  warnings: string[];
}

export interface SplitNameResult {
  names: SplitResult[];
  hasAmbiguous: boolean;
  totalWarnings: number;
}

const DEGREE_PATTERNS = /\b(S\.T\.|S\.Kom\.|S\.E\.|S\.H\.|M\.T\.|M\.Kom\.|M\.E\.|M\.H\.|Dr\.|Prof\.)/i;

export function splitName(rawName: string): SplitNameResult {
  const warnings: string[] = [];
  const names: SplitResult[] = [];

  if (!rawName || rawName.trim().length === 0) {
    return {
      names: [],
      hasAmbiguous: false,
      totalWarnings: 0,
    };
  }

  let tokens = rawName.split(/[\+\n]/);
  
  const processedTokens: string[] = [];
  
  for (const token of tokens) {
    if (token.includes(',')) {
      if (DEGREE_PATTERNS.test(token)) {
        processedTokens.push(token);
      } else {
        const commaSplit = token.split(',');
        processedTokens.push(...commaSplit);
      }
    } else {
      processedTokens.push(token);
    }
  }

  const trimmedTokens = processedTokens.map(t => t.trim()).filter(t => t.length > 0);

  if (trimmedTokens.length !== processedTokens.map(t => t.trim()).length) {
    warnings.push("Token kosong ditemukan dan dibuang");
  }

  const emptyCount = rawName.split(/[\+\n,]/).filter(t => t.trim().length === 0).length;
  if (emptyCount > 1) {
    warnings.push(`${emptyCount} token kosong ditemukan`);
  }

  let hasAmbiguous = false;

  for (const token of trimmedTokens) {
    const result: SplitResult = {
      name: token,
      isAmbiguous: false,
      warnings: [],
    };

    if (token.includes(',') && !DEGREE_PATTERNS.test(token)) {
      result.isAmbiguous = true;
      result.warnings.push("Koma ambigu terdeteksi - mohon review");
      hasAmbiguous = true;
    }

    if (token.trim() !== token) {
      result.warnings.push("Spasi ekstra ditemukan");
    }

    names.push(result);
  }

  return {
    names,
    hasAmbiguous,
    totalWarnings: warnings.length + names.reduce((sum, n) => sum + n.warnings.length, 0),
  };
}

export function detectAmbiguousCommas(text: string): boolean {
  if (!text.includes(',')) return false;
  if (DEGREE_PATTERNS.test(text)) return false;
  return true;
}

export function normalizeNameForComparison(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, ' ');
}
