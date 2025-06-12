import * as cheerio from 'cheerio';
import { PageData, AccessibilityResults, AccessibilityViolation } from '../../types/analysis';
import { logger } from '../../utils/logger';
import puppeteer from 'puppeteer';

export class AccessibilityAnalyzer {
  async analyze(pages: PageData[], homePage: PageData): Promise<AccessibilityResults> {
    try {
      logger.info(`Starting accessibility analysis for ${pages.length} pages`);

      // ホームページの詳細分析
      const homePageAnalysis = await this.analyzePageAccessibility(homePage.url);
      
      // 他のページの簡易分析（最大5ページ）
      const otherPagesAnalysis = await Promise.all(
        pages.slice(1, 6).map(page => this.analyzePageAccessibility(page.url))
      );

      // 全ての違反を統合
      const allViolations: AccessibilityViolation[] = [
        ...homePageAnalysis.violations,
        ...otherPagesAnalysis.flatMap(analysis => analysis.violations)
      ];

      // 重複除去
      const uniqueViolations = this.removeDuplicateViolations(allViolations);
      
      // スコアとWCAGレベルを計算
      const score = this.calculateAccessibilityScore(uniqueViolations);
      const wcagLevel = this.determineWCAGLevel(uniqueViolations);
      
      // 改善提案を生成
      const suggestions = this.generateSuggestions(uniqueViolations);

      const results: AccessibilityResults = {
        score,
        wcagLevel,
        violations: uniqueViolations.slice(0, 20), // 最大20件まで
        suggestions
      };

      logger.info(`Accessibility analysis completed with score: ${score}, WCAG level: ${wcagLevel}`);
      return results;
    } catch (error) {
      logger.error('Error in accessibility analysis:', error);
      throw error;
    }
  }

  private async analyzePageAccessibility(url: string): Promise<{
    violations: AccessibilityViolation[];
  }> {
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    try {
      const page = await browser.newPage();
      await page.goto(url, { waitUntil: 'domcontentloaded' });
      
      const content = await page.content();
      const $ = cheerio.load(content);

      const violations: AccessibilityViolation[] = [];

      // 画像のalt属性チェック
      violations.push(...this.checkImageAltText($));
      
      // フォームのラベルチェック
      violations.push(...this.checkFormLabels($));
      
      // 見出しの階層チェック
      violations.push(...this.checkHeadingHierarchy($));
      
      // カラーコントラストチェック（基本的なチェック）
      violations.push(...this.checkColorContrast($));
      
      // キーボードナビゲーションチェック
      violations.push(...this.checkKeyboardNavigation($));
      
      // ARIA属性チェック
      violations.push(...this.checkAriaAttributes($));
      
      // フォーカス管理チェック
      violations.push(...this.checkFocusManagement($));
      
      // セマンティックマークアップチェック
      violations.push(...this.checkSemanticMarkup($));

      return { violations };
    } finally {
      await browser.close();
    }
  }

  private checkImageAltText($: cheerio.CheerioAPI): AccessibilityViolation[] {
    const violations: AccessibilityViolation[] = [];
    
    $('img').each((_, img) => {
      const $img = $(img);
      const alt = $img.attr('alt');
      const src = $img.attr('src');
      
      if (!alt && src && !src.includes('data:')) {
        violations.push({
          id: 'image-alt',
          impact: 'critical',
          description: '画像にalt属性がありません',
          help: 'すべての画像には適切なalt属性を設定してください',
          helpUrl: 'https://www.w3.org/WAI/WCAG21/Understanding/non-text-content.html',
          tags: ['wcag2a', 'wcag111'],
          nodes: [{
            html: $.html($img),
            target: ['img']
          }]
        });
      } else if (alt === '') {
        // 装飾的な画像の場合は問題なし
      } else if (alt && alt.length > 125) {
        violations.push({
          id: 'image-alt-long',
          impact: 'minor',
          description: 'alt属性が長すぎます（125文字以下推奨）',
          help: 'alt属性は簡潔で説明的にしてください',
          helpUrl: 'https://www.w3.org/WAI/WCAG21/Understanding/non-text-content.html',
          tags: ['wcag2a', 'wcag111'],
          nodes: [{
            html: $.html($img),
            target: ['img']
          }]
        });
      }
    });

    return violations;
  }

  private checkFormLabels($: cheerio.CheerioAPI): AccessibilityViolation[] {
    const violations: AccessibilityViolation[] = [];
    
    $('input[type="text"], input[type="email"], input[type="password"], input[type="tel"], input[type="url"], textarea, select').each((_, element) => {
      const $element = $(element);
      const id = $element.attr('id');
      const ariaLabel = $element.attr('aria-label');
      const ariaLabelledby = $element.attr('aria-labelledby');
      
      let hasLabel = false;
      
      if (id) {
        const label = $(`label[for="${id}"]`);
        if (label.length > 0) {
          hasLabel = true;
        }
      }
      
      if (ariaLabel || ariaLabelledby) {
        hasLabel = true;
      }
      
      if (!hasLabel) {
        violations.push({
          id: 'form-field-label',
          impact: 'critical',
          description: 'フォーム要素にラベルが関連付けられていません',
          help: 'すべてのフォーム要素には適切なラベルを設定してください',
          helpUrl: 'https://www.w3.org/WAI/WCAG21/Understanding/labels-or-instructions.html',
          tags: ['wcag2a', 'wcag332'],
          nodes: [{
            html: $.html($element),
            target: [element.tagName.toLowerCase()]
          }]
        });
      }
    });

    return violations;
  }

  private checkHeadingHierarchy($: cheerio.CheerioAPI): AccessibilityViolation[] {
    const violations: AccessibilityViolation[] = [];
    
    const headings = $('h1, h2, h3, h4, h5, h6').map((_, el) => {
      return {
        level: parseInt($(el).prop('tagName').substring(1)),
        element: el
      };
    }).get();

    if (headings.length === 0) {
      violations.push({
        id: 'no-headings',
        impact: 'moderate',
        description: 'ページに見出しがありません',
        help: 'ページ構造を明確にするため見出しを使用してください',
        helpUrl: 'https://www.w3.org/WAI/WCAG21/Understanding/headings-and-labels.html',
        tags: ['wcag2aa', 'wcag246'],
        nodes: []
      });
    }

    // H1の数をチェック
    const h1Count = headings.filter(h => h.level === 1).length;
    if (h1Count === 0) {
      violations.push({
        id: 'no-h1',
        impact: 'moderate',
        description: 'ページにH1見出しがありません',
        help: 'ページには1つのH1見出しを設定してください',
        helpUrl: 'https://www.w3.org/WAI/WCAG21/Understanding/headings-and-labels.html',
        tags: ['wcag2aa', 'wcag246'],
        nodes: []
      });
    } else if (h1Count > 1) {
      violations.push({
        id: 'multiple-h1',
        impact: 'moderate',
        description: 'ページに複数のH1見出しがあります',
        help: 'ページには1つのH1見出しのみを使用してください',
        helpUrl: 'https://www.w3.org/WAI/WCAG21/Understanding/headings-and-labels.html',
        tags: ['wcag2aa', 'wcag246'],
        nodes: []
      });
    }

    // 見出しの階層をチェック
    for (let i = 1; i < headings.length; i++) {
      const current = headings[i].level;
      const previous = headings[i - 1].level;
      
      if (current > previous + 1) {
        violations.push({
          id: 'heading-skip',
          impact: 'moderate',
          description: `見出しレベルが飛んでいます (H${previous} → H${current})`,
          help: '見出しは順序立てて使用してください',
          helpUrl: 'https://www.w3.org/WAI/WCAG21/Understanding/headings-and-labels.html',
          tags: ['wcag2aa', 'wcag246'],
          nodes: [{
            html: $.html($(headings[i].element)),
            target: [`h${current}`]
          }]
        });
      }
    }

    return violations;
  }

  private checkColorContrast($: cheerio.CheerioAPI): AccessibilityViolation[] {
    const violations: AccessibilityViolation[] = [];
    
    // 基本的なカラーコントラストチェック（簡易版）
    $('*').each((_, element) => {
      const $element = $(element);
      const style = $element.attr('style');
      
      if (style) {
        const colorMatch = style.match(/color\s*:\s*(#[0-9a-fA-F]{3,6}|rgb\([^)]+\))/);
        const backgroundMatch = style.match(/background-color\s*:\s*(#[0-9a-fA-F]{3,6}|rgb\([^)]+\))/);
        
        if (colorMatch && backgroundMatch) {
          // 簡易的なコントラストチェック（実際の計算は複雑）
          const textColor = colorMatch[1];
          const backgroundColor = backgroundMatch[1];
          
          if (this.isLowContrast(textColor, backgroundColor)) {
            violations.push({
              id: 'color-contrast',
              impact: 'serious',
              description: 'テキストの色と背景色のコントラストが不十分です',
              help: 'WCAG AAレベルでは4.5:1以上のコントラスト比が必要です',
              helpUrl: 'https://www.w3.org/WAI/WCAG21/Understanding/contrast-minimum.html',
              tags: ['wcag2aa', 'wcag143'],
              nodes: [{
                html: $.html($element),
                target: [element.tagName.toLowerCase()]
              }]
            });
          }
        }
      }
    });

    return violations;
  }

  private checkKeyboardNavigation($: cheerio.CheerioAPI): AccessibilityViolation[] {
    const violations: AccessibilityViolation[] = [];
    
    // フォーカス可能な要素のチェック
    $('a, button, input, select, textarea, [tabindex]').each((_, element) => {
      const $element = $(element);
      const tabindex = $element.attr('tabindex');
      
      if (tabindex && parseInt(tabindex) > 0) {
        violations.push({
          id: 'positive-tabindex',
          impact: 'serious',
          description: '正の値のtabindexが使用されています',
          help: 'tabindexには0または-1のみを使用してください',
          helpUrl: 'https://www.w3.org/WAI/WCAG21/Understanding/focus-order.html',
          tags: ['wcag2a', 'wcag241'],
          nodes: [{
            html: $.html($element),
            target: [element.tagName.toLowerCase()]
          }]
        });
      }
    });

    return violations;
  }

  private checkAriaAttributes($: cheerio.CheerioAPI): AccessibilityViolation[] {
    const violations: AccessibilityViolation[] = [];
    
    $('[aria-labelledby]').each((_, element) => {
      const $element = $(element);
      const labelledby = $element.attr('aria-labelledby');
      
      if (labelledby) {
        const ids = labelledby.split(/\s+/);
        for (const id of ids) {
          if (!$(`#${id}`).length) {
            violations.push({
              id: 'aria-labelledby-invalid',
              impact: 'serious',
              description: `aria-labelledbyで参照されているID "${id}" が存在しません`,
              help: 'aria-labelledbyは存在するIDを参照してください',
              helpUrl: 'https://www.w3.org/WAI/WCAG21/Understanding/name-role-value.html',
              tags: ['wcag2a', 'wcag412'],
              nodes: [{
                html: $.html($element),
                target: [element.tagName.toLowerCase()]
              }]
            });
          }
        }
      }
    });

    return violations;
  }

  private checkFocusManagement($: cheerio.CheerioAPI): AccessibilityViolation[] {
    const violations: AccessibilityViolation[] = [];
    
    // アウトラインが削除されているかチェック
    $('[style*="outline"], [style*="outline-width"]').each((_, element) => {
      const $element = $(element);
      const style = $element.attr('style') || '';
      
      if (style.includes('outline: none') || style.includes('outline: 0')) {
        violations.push({
          id: 'focus-outline-removed',
          impact: 'serious',
          description: 'フォーカスアウトラインが削除されています',
          help: 'キーボードナビゲーションのためフォーカス表示を保持してください',
          helpUrl: 'https://www.w3.org/WAI/WCAG21/Understanding/focus-visible.html',
          tags: ['wcag2aa', 'wcag247'],
          nodes: [{
            html: $.html($element),
            target: [element.tagName.toLowerCase()]
          }]
        });
      }
    });

    return violations;
  }

  private checkSemanticMarkup($: cheerio.CheerioAPI): AccessibilityViolation[] {
    const violations: AccessibilityViolation[] = [];
    
    // セマンティック要素の使用チェック
    const hasMain = $('main').length > 0;
    const hasNav = $('nav').length > 0;
    const hasHeader = $('header').length > 0;
    const hasFooter = $('footer').length > 0;
    
    if (!hasMain) {
      violations.push({
        id: 'no-main-landmark',
        impact: 'moderate',
        description: 'メインコンテンツを示すmain要素がありません',
        help: 'メインコンテンツはmain要素でマークアップしてください',
        helpUrl: 'https://www.w3.org/WAI/WCAG21/Understanding/info-and-relationships.html',
        tags: ['wcag2a', 'wcag131'],
        nodes: []
      });
    }

    return violations;
  }

  private isLowContrast(textColor: string, backgroundColor: string): boolean {
    // 簡易的なコントラストチェック（実際の計算はより複雑）
    const textLuminance = this.getLuminance(textColor);
    const backgroundLuminance = this.getLuminance(backgroundColor);
    
    const contrast = (Math.max(textLuminance, backgroundLuminance) + 0.05) / 
                    (Math.min(textLuminance, backgroundLuminance) + 0.05);
    
    return contrast < 4.5; // WCAG AA基準
  }

  private getLuminance(color: string): number {
    // 簡易的な輝度計算（実際の計算はより複雑）
    if (color.startsWith('#')) {
      const hex = color.substring(1);
      const r = parseInt(hex.substring(0, 2), 16) / 255;
      const g = parseInt(hex.substring(2, 4), 16) / 255;
      const b = parseInt(hex.substring(4, 6), 16) / 255;
      
      return 0.299 * r + 0.587 * g + 0.114 * b;
    }
    
    return 0.5; // デフォルト値
  }

  private removeDuplicateViolations(violations: AccessibilityViolation[]): AccessibilityViolation[] {
    const seen = new Set<string>();
    return violations.filter(violation => {
      const key = `${violation.id}-${violation.description}`;
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }

  private calculateAccessibilityScore(violations: AccessibilityViolation[]): number {
    let score = 100;
    
    violations.forEach(violation => {
      switch (violation.impact) {
        case 'critical':
          score -= 10;
          break;
        case 'serious':
          score -= 7;
          break;
        case 'moderate':
          score -= 4;
          break;
        case 'minor':
          score -= 2;
          break;
      }
    });

    return Math.max(0, Math.round(score));
  }

  private determineWCAGLevel(violations: AccessibilityViolation[]): 'A' | 'AA' | 'AAA' {
    const aaViolations = violations.filter(v => 
      v.tags.some(tag => tag.includes('wcag2aa'))
    );
    
    const aViolations = violations.filter(v => 
      v.tags.some(tag => tag.includes('wcag2a'))
    );

    if (aViolations.length > 0) {
      return 'A';
    } else if (aaViolations.length > 0) {
      return 'AA';
    } else {
      return 'AAA';
    }
  }

  private generateSuggestions(violations: AccessibilityViolation[]): string[] {
    const suggestions: string[] = [];
    
    const criticalViolations = violations.filter(v => v.impact === 'critical');
    if (criticalViolations.length > 0) {
      suggestions.push('重大なアクセシビリティ問題があります。画像のalt属性やフォームラベルを確認してください。');
    }

    const seriousViolations = violations.filter(v => v.impact === 'serious');
    if (seriousViolations.length > 0) {
      suggestions.push('深刻なアクセシビリティ問題があります。カラーコントラストやキーボードナビゲーションを改善してください。');
    }

    if (violations.some(v => v.id === 'image-alt')) {
      suggestions.push('すべての画像に意味のあるalt属性を設定してください。');
    }

    if (violations.some(v => v.id === 'form-field-label')) {
      suggestions.push('すべてのフォーム要素に適切なラベルを関連付けてください。');
    }

    if (violations.some(v => v.id.includes('heading'))) {
      suggestions.push('見出しを適切な階層構造で使用してください。');
    }

    if (violations.some(v => v.id === 'color-contrast')) {
      suggestions.push('テキストと背景のコントラスト比を4.5:1以上にしてください。');
    }

    if (violations.some(v => v.id.includes('aria'))) {
      suggestions.push('ARIA属性を正しく使用してください。');
    }

    if (violations.some(v => v.id.includes('focus'))) {
      suggestions.push('キーボードフォーカスが見えるようにしてください。');
    }

    // 一般的な推奨事項
    suggestions.push('スクリーンリーダーでのテストを実施してください。');
    suggestions.push('キーボードのみでのナビゲーションをテストしてください。');

    return Array.from(new Set(suggestions)).slice(0, 8);
  }
}