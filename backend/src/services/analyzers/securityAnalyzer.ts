import { PageData, SecurityResults, SecurityHeaders, SecurityVulnerability } from '../../types/analysis';
import { logger } from '../../utils/logger';
import axios from 'axios';

export class SecurityAnalyzer {
  async analyze(pages: PageData[], homePage: PageData): Promise<SecurityResults> {
    try {
      logger.info(`Starting security analysis for ${pages.length} pages`);

      const httpsUsage = this.analyzeHttpsUsage(pages);
      const mixedContent = await this.checkMixedContent(homePage.url);
      const securityHeaders = await this.analyzeSecurityHeaders(homePage.url);
      const vulnerabilities = await this.checkVulnerabilities(pages);
      
      const score = this.calculateSecurityScore(httpsUsage, mixedContent, securityHeaders, vulnerabilities);
      const suggestions = this.generateSuggestions(httpsUsage, mixedContent, securityHeaders, vulnerabilities);

      const results: SecurityResults = {
        score,
        httpsUsage,
        mixedContent,
        securityHeaders,
        vulnerabilities,
        suggestions
      };

      logger.info(`Security analysis completed with score: ${score}`);
      return results;
    } catch (error) {
      logger.error('Error in security analysis:', error);
      throw error;
    }
  }

  private analyzeHttpsUsage(pages: PageData[]): boolean {
    return pages.every(page => page.url.startsWith('https://'));
  }

  private async checkMixedContent(url: string): Promise<boolean> {
    try {
      const response = await axios.get(url, {
        timeout: 10000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; WebsiteAnalyzer/1.0)'
        }
      });

      const content = response.data;
      
      // HTTPリソースへの参照をチェック
      const httpResources = [
        /src=['"]http:\/\/[^'"]+/gi,
        /href=['"]http:\/\/[^'"]+/gi,
        /url\(['"]?http:\/\/[^'"]+/gi
      ];

      return httpResources.some(pattern => pattern.test(content));
    } catch (error) {
      logger.error(`Error checking mixed content for ${url}:`, error);
      return false;
    }
  }

  private async analyzeSecurityHeaders(url: string): Promise<SecurityHeaders> {
    try {
      const response = await axios.head(url, {
        timeout: 10000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; WebsiteAnalyzer/1.0)'
        }
      });

      const headers = response.headers;

      return {
        contentSecurityPolicy: !!headers['content-security-policy'],
        xFrameOptions: !!headers['x-frame-options'],
        xContentTypeOptions: !!headers['x-content-type-options'],
        strictTransportSecurity: !!headers['strict-transport-security'],
        referrerPolicy: !!headers['referrer-policy']
      };
    } catch (error) {
      logger.error(`Error analyzing security headers for ${url}:`, error);
      return {
        contentSecurityPolicy: false,
        xFrameOptions: false,
        xContentTypeOptions: false,
        strictTransportSecurity: false,
        referrerPolicy: false
      };
    }
  }

  private async checkVulnerabilities(pages: PageData[]): Promise<SecurityVulnerability[]> {
    const vulnerabilities: SecurityVulnerability[] = [];

    for (const page of pages.slice(0, 5)) { // 最大5ページまでチェック
      try {
        const response = await axios.get(page.url, {
          timeout: 10000,
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; WebsiteAnalyzer/1.0)'
          }
        });

        const content = response.data;
        const headers = response.headers;

        // クロスサイトスクリプティング (XSS) の兆候をチェック
        if (this.checkXSSVulnerability(content, page.url)) {
          vulnerabilities.push({
            type: 'XSS',
            severity: 'high',
            description: '潜在的なクロスサイトスクリプティング脆弱性が検出されました',
            recommendation: 'ユーザー入力の適切なサニタイゼーションとエスケープを実装してください'
          });
        }

        // SQLインジェクションの兆候をチェック
        if (this.checkSQLInjectionVulnerability(page.url)) {
          vulnerabilities.push({
            type: 'SQL Injection',
            severity: 'critical',
            description: '潜在的なSQLインジェクション脆弱性が検出されました',
            recommendation: 'パラメータ化クエリとプリペアドステートメントを使用してください'
          });
        }

        // 情報漏洩のチェック
        if (this.checkInformationDisclosure(content, headers)) {
          vulnerabilities.push({
            type: 'Information Disclosure',
            severity: 'medium',
            description: '機密情報の漏洩が検出されました',
            recommendation: 'サーバー情報やエラーメッセージの表示を制限してください'
          });
        }

        // 脆弱なライブラリのチェック
        const libraryVulns = this.checkVulnerableLibraries(content);
        vulnerabilities.push(...libraryVulns);

      } catch (error) {
        logger.error(`Error checking vulnerabilities for ${page.url}:`, error);
      }
    }

    // 重複除去
    return this.removeDuplicateVulnerabilities(vulnerabilities);
  }

  private checkXSSVulnerability(content: string, url: string): boolean {
    // 基本的なXSS兆候をチェック
    const xssPatterns = [
      /<script[^>]*>.*?<\/script>/gi,
      /javascript:/gi,
      /on\w+\s*=/gi,
      /eval\s*\(/gi,
      /document\.write/gi
    ];

    // URLパラメータが直接出力されているかチェック
    const urlParams = new URL(url).searchParams;
    for (const [key, value] of urlParams) {
      if (content.includes(value) && !this.isSanitized(value)) {
        return true;
      }
    }

    return xssPatterns.some(pattern => pattern.test(content));
  }

  private checkSQLInjectionVulnerability(url: string): boolean {
    const urlParams = new URL(url).searchParams;
    
    // SQLインジェクションの典型的なパターンをチェック
    const sqlPatterns = [
      /['"].*?['"].*?[=<>]/,
      /\bunion\b.*?\bselect\b/i,
      /\bor\b.*?[=<>].*?['"].*?['"].*?[=<>]/i,
      /\band\b.*?[=<>].*?['"].*?['"].*?[=<>]/i,
      /['"].*?;.*?drop\b/i,
      /['"].*?;.*?update\b/i,
      /['"].*?;.*?delete\b/i
    ];

    for (const [key, value] of urlParams) {
      if (sqlPatterns.some(pattern => pattern.test(value))) {
        return true;
      }
    }

    return false;
  }

  private checkInformationDisclosure(content: string, headers: any): boolean {
    // サーバー情報の漏洩チェック
    const serverInfo = headers['server'];
    if (serverInfo && this.isDetailedServerInfo(serverInfo)) {
      return true;
    }

    // エラーメッセージの漏洩チェック
    const errorPatterns = [
      /Fatal error:/gi,
      /Warning:.*?in.*?on line/gi,
      /MySQL.*?error/gi,
      /PostgreSQL.*?error/gi,
      /ORA-\d+/gi,
      /Microsoft.*?ODBC.*?error/gi,
      /stack trace:/gi
    ];

    return errorPatterns.some(pattern => pattern.test(content));
  }

  private checkVulnerableLibraries(content: string): SecurityVulnerability[] {
    const vulnerabilities: SecurityVulnerability[] = [];

    // 既知の脆弱なライブラリバージョンをチェック
    const vulnerableLibraries = [
      {
        pattern: /jquery[\/\-]([0-9]+\.[0-9]+\.[0-9]+)/gi,
        name: 'jQuery',
        vulnerableVersions: ['1.6.0', '1.7.0', '1.8.0', '1.9.0', '2.0.0', '2.1.0', '2.2.0'],
        severity: 'medium' as const
      },
      {
        pattern: /bootstrap[\/\-]([0-9]+\.[0-9]+\.[0-9]+)/gi,
        name: 'Bootstrap',
        vulnerableVersions: ['3.0.0', '3.1.0', '3.2.0', '3.3.0'],
        severity: 'low' as const
      }
    ];

    for (const lib of vulnerableLibraries) {
      const matches = content.match(lib.pattern);
      if (matches) {
        const version = matches[1];
        if (lib.vulnerableVersions.includes(version)) {
          vulnerabilities.push({
            type: 'Vulnerable Library',
            severity: lib.severity,
            description: `脆弱な${lib.name}バージョン ${version} が検出されました`,
            recommendation: `${lib.name}を最新バージョンにアップデートしてください`
          });
        }
      }
    }

    return vulnerabilities;
  }

  private isSanitized(value: string): boolean {
    // 基本的なサニタイゼーションチェック
    const dangerousChars = ['<', '>', '"', "'", '&'];
    const encodedChars = ['&lt;', '&gt;', '&quot;', '&#x27;', '&amp;'];
    
    for (let i = 0; i < dangerousChars.length; i++) {
      if (value.includes(dangerousChars[i]) && !value.includes(encodedChars[i])) {
        return false;
      }
    }
    
    return true;
  }

  private isDetailedServerInfo(serverInfo: string): boolean {
    // 詳細なサーバー情報が含まれているかチェック
    const detailedPatterns = [
      /apache\/[0-9]+\.[0-9]+\.[0-9]+/i,
      /nginx\/[0-9]+\.[0-9]+\.[0-9]+/i,
      /iis\/[0-9]+\.[0-9]+/i,
      /php\/[0-9]+\.[0-9]+\.[0-9]+/i
    ];

    return detailedPatterns.some(pattern => pattern.test(serverInfo));
  }

  private removeDuplicateVulnerabilities(vulnerabilities: SecurityVulnerability[]): SecurityVulnerability[] {
    const seen = new Set<string>();
    return vulnerabilities.filter(vuln => {
      const key = `${vuln.type}-${vuln.description}`;
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }

  private calculateSecurityScore(
    httpsUsage: boolean,
    mixedContent: boolean,
    securityHeaders: SecurityHeaders,
    vulnerabilities: SecurityVulnerability[]
  ): number {
    let score = 100;

    // HTTPS使用状況
    if (!httpsUsage) score -= 30;

    // Mixed Content
    if (mixedContent) score -= 15;

    // セキュリティヘッダー
    const headerScore = Object.values(securityHeaders).filter(Boolean).length;
    score -= (5 - headerScore) * 4; // 各ヘッダーにつき4点減点

    // 脆弱性
    vulnerabilities.forEach(vuln => {
      switch (vuln.severity) {
        case 'critical':
          score -= 20;
          break;
        case 'high':
          score -= 15;
          break;
        case 'medium':
          score -= 8;
          break;
        case 'low':
          score -= 3;
          break;
      }
    });

    return Math.max(0, Math.round(score));
  }

  private generateSuggestions(
    httpsUsage: boolean,
    mixedContent: boolean,
    securityHeaders: SecurityHeaders,
    vulnerabilities: SecurityVulnerability[]
  ): string[] {
    const suggestions: string[] = [];

    if (!httpsUsage) {
      suggestions.push('すべてのページでHTTPSを使用してください。SSL証明書を取得し、HTTPからHTTPSへのリダイレクトを設定してください。');
    }

    if (mixedContent) {
      suggestions.push('Mixed Contentを解消してください。すべてのリソース（画像、CSS、JavaScript）をHTTPS経由で読み込むようにしてください。');
    }

    if (!securityHeaders.contentSecurityPolicy) {
      suggestions.push('Content-Security-Policy (CSP) ヘッダーを設定してXSS攻撃を防いでください。');
    }

    if (!securityHeaders.xFrameOptions) {
      suggestions.push('X-Frame-Options ヘッダーを設定してクリックジャッキング攻撃を防いでください。');
    }

    if (!securityHeaders.xContentTypeOptions) {
      suggestions.push('X-Content-Type-Options ヘッダーを設定してMIMEタイプスニッフィングを防いでください。');
    }

    if (!securityHeaders.strictTransportSecurity) {
      suggestions.push('Strict-Transport-Security (HSTS) ヘッダーを設定してHTTPS接続を強制してください。');
    }

    if (!securityHeaders.referrerPolicy) {
      suggestions.push('Referrer-Policy ヘッダーを設定してリファラー情報の漏洩を制御してください。');
    }

    // 脆弱性に基づく提案
    const criticalVulns = vulnerabilities.filter(v => v.severity === 'critical');
    if (criticalVulns.length > 0) {
      suggestions.push('重大な脆弱性が検出されました。直ちに修正してください。');
    }

    const highVulns = vulnerabilities.filter(v => v.severity === 'high');
    if (highVulns.length > 0) {
      suggestions.push('高リスクの脆弱性が検出されました。優先的に修正してください。');
    }

    // 一般的なセキュリティ推奨事項
    suggestions.push('定期的なセキュリティ監査と脆弱性スキャンを実施してください。');
    suggestions.push('使用しているライブラリやフレームワークを最新バージョンに保ってください。');

    return suggestions.slice(0, 8); // 最大8つの提案
  }
}