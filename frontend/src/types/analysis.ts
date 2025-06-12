export interface AnalysisRequest {
  url: string;
  options?: {
    maxDepth?: number;
    maxPages?: number;
    skipImages?: boolean;
    skipCSS?: boolean;
    skipJS?: boolean;
  };
}

export interface Analysis {
  id: string;
  url: string;
  status: AnalysisStatus;
  startedAt: string;
  completedAt?: string;
  totalPages: number;
  crawledPages: number;
  errorCount: number;
  results?: AnalysisResults;
  options: AnalysisOptions;
}

export type AnalysisStatus = 'pending' | 'processing' | 'completed' | 'failed';

export interface AnalysisOptions {
  maxDepth: number;
  maxPages: number;
  skipImages: boolean;
  skipCSS: boolean;
  skipJS: boolean;
}

export interface AnalysisResults {
  seo: SEOResults;
  performance: PerformanceResults;
  accessibility: AccessibilityResults;
  security: SecurityResults;
  mobile: MobileResults;
  technology: TechnologyResults;
  overall: OverallResults;
}

export interface SEOResults {
  score: number;
  issues: SEOIssue[];
  suggestions: string[];
  metaTags: MetaTagAnalysis;
  headingStructure: HeadingStructure;
  keywords: KeywordAnalysis;
  structuredData: StructuredDataAnalysis;
}

export interface SEOIssue {
  type: 'error' | 'warning' | 'info';
  category: string;
  message: string;
  url?: string;
  element?: string;
}

export interface MetaTagAnalysis {
  title: {
    present: boolean;
    length: number;
    content?: string;
    optimal: boolean;
  };
  description: {
    present: boolean;
    length: number;
    content?: string;
    optimal: boolean;
  };
  keywords?: {
    present: boolean;
    content?: string;
  };
  canonical?: {
    present: boolean;
    url?: string;
  };
  robots?: {
    present: boolean;
    content?: string;
  };
}

export interface HeadingStructure {
  h1Count: number;
  h2Count: number;
  h3Count: number;
  h4Count: number;
  h5Count: number;
  h6Count: number;
  hasProperHierarchy: boolean;
  issues: string[];
}

export interface KeywordAnalysis {
  topKeywords: { keyword: string; count: number; density: number }[];
  titleKeywords: string[];
  headingKeywords: string[];
}

export interface StructuredDataAnalysis {
  hasStructuredData: boolean;
  types: string[];
  count: number;
  errors: string[];
}

export interface PerformanceResults {
  score: number;
  loadTime: number;
  firstContentfulPaint: number;
  largestContentfulPaint: number;
  timeToInteractive: number;
  totalBlockingTime: number;
  resourceSizes: ResourceSizes;
  suggestions: string[];
}

export interface ResourceSizes {
  html: number;
  css: number;
  javascript: number;
  images: number;
  fonts: number;
  other: number;
  total: number;
}

export interface AccessibilityResults {
  score: number;
  wcagLevel: 'A' | 'AA' | 'AAA';
  violations: AccessibilityViolation[];
  suggestions: string[];
}

export interface AccessibilityViolation {
  id: string;
  impact: 'minor' | 'moderate' | 'serious' | 'critical';
  description: string;
  help: string;
  helpUrl: string;
  tags: string[];
  nodes: {
    html: string;
    target: string[];
  }[];
}

export interface SecurityResults {
  score: number;
  httpsUsage: boolean;
  mixedContent: boolean;
  securityHeaders: SecurityHeaders;
  vulnerabilities: SecurityVulnerability[];
  suggestions: string[];
}

export interface SecurityHeaders {
  contentSecurityPolicy: boolean;
  xFrameOptions: boolean;
  xContentTypeOptions: boolean;
  strictTransportSecurity: boolean;
  referrerPolicy: boolean;
}

export interface SecurityVulnerability {
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  recommendation: string;
}

export interface MobileResults {
  score: number;
  hasViewportMeta: boolean;
  isResponsive: boolean;
  touchTargetSize: boolean;
  textSize: boolean;
  loadTime: number;
  suggestions: string[];
}

export interface TechnologyResults {
  frameworks: TechnologyItem[];
  libraries: TechnologyItem[];
  cms: TechnologyItem[];
  servers: TechnologyItem[];
  analytics: TechnologyItem[];
}

export interface TechnologyItem {
  name: string;
  version?: string;
  confidence: number;
  category: string;
}

export interface OverallResults {
  score: number;
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  summary: string;
  prioritySuggestions: string[];
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}