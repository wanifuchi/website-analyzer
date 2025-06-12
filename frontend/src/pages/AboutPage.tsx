import React from 'react';
import { Link } from 'react-router-dom';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import ja from '../i18n/ja.json';

const AboutPage: React.FC = () => {
  const features = [
    {
      icon: '🔍',
      title: 'SEO分析',
      description: 'メタタグ、見出し構造、キーワード最適化、構造化データなどを詳細に分析し、検索エンジンでのパフォーマンス向上のための具体的な提案を提供します。'
    },
    {
      icon: '⚡',
      title: 'パフォーマンス測定',
      description: 'Core Web Vitals（FCP、LCP、TTI、TBT）を測定し、読み込み速度とユーザーエクスペリエンスを評価。リソースサイズの分析も含みます。'
    },
    {
      icon: '🔒',
      title: 'セキュリティ評価',
      description: 'HTTPS使用状況、セキュリティヘッダー、Mixed Content、既知の脆弱性をチェックし、ウェブサイトのセキュリティレベルを評価します。'
    },
    {
      icon: '♿',
      title: 'アクセシビリティ監査',
      description: 'WCAG 2.1ガイドラインに基づいて、色彩対比、キーボードナビゲーション、スクリーンリーダー対応などを詳細にチェックします。'
    },
    {
      icon: '📱',
      title: 'モバイル対応度',
      description: 'レスポンシブデザイン、ビューポート設定、タッチターゲットサイズ、モバイル読み込み速度を評価し、モバイルユーザビリティを向上させます。'
    },
    {
      icon: '🛠️',
      title: '技術スタック検出',
      description: 'フレームワーク、ライブラリ、CMS、アナリティクスツール、サーバー技術などの使用技術を自動検出します。'
    }
  ];

  const benefits = [
    {
      title: '包括的な分析',
      description: '6つの主要カテゴリーを同時に分析し、ウェブサイトの健全性を総合的に評価'
    },
    {
      title: '実用的な提案',
      description: '技術的な課題だけでなく、具体的な改善方法とその優先度を提示'
    },
    {
      title: '継続的なモニタリング',
      description: '定期的な分析により、改善の進捗を追跡し、新たな問題を早期発見'
    },
    {
      title: '無料で利用可能',
      description: 'アカウント登録不要で、すべての機能を無料でご利用いただけます'
    }
  ];

  const useCases = [
    {
      title: 'ウェブ開発者',
      description: '開発したサイトの品質チェックや、クライアントへの報告書作成に活用'
    },
    {
      title: 'マーケティング担当者',
      description: 'SEOパフォーマンスの監視や、競合サイトとの比較分析に利用'
    },
    {
      title: 'サイト運営者',
      description: '定期的なサイトヘルスチェックや、ユーザーエクスペリエンス向上のために'
    },
    {
      title: 'デザイナー',
      description: 'アクセシビリティやモバイル対応の検証、デザインの技術的妥当性確認'
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* ヒーローセクション */}
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
            {ja.app.title}について
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-8">
            ウェブサイトの健全性を総合的に分析し、SEO、パフォーマンス、セキュリティ、
            アクセシビリティの向上を支援するツールです。
          </p>
          <Link to="/">
            <Button size="lg">
              今すぐ分析を開始
            </Button>
          </Link>
        </div>

        {/* 機能詳細 */}
        <div className="mb-16">
          <h2 className="text-3xl font-bold text-gray-900 text-center mb-12">
            主な機能
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <Card key={index} className="h-full">
                <div className="text-center">
                  <div className="text-4xl mb-4">{feature.icon}</div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-3">
                    {feature.title}
                  </h3>
                  <p className="text-gray-600 text-sm leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              </Card>
            ))}
          </div>
        </div>

        {/* 利用のメリット */}
        <div className="mb-16">
          <h2 className="text-3xl font-bold text-gray-900 text-center mb-12">
            利用のメリット
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {benefits.map((benefit, index) => (
              <Card key={index}>
                <div className="flex items-start">
                  <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mr-4">
                    <span className="text-blue-600 font-bold">{index + 1}</span>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      {benefit.title}
                    </h3>
                    <p className="text-gray-600">
                      {benefit.description}
                    </p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>

        {/* 活用シーン */}
        <div className="mb-16">
          <h2 className="text-3xl font-bold text-gray-900 text-center mb-12">
            こんな方におすすめ
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {useCases.map((useCase, index) => (
              <Card key={index}>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {useCase.title}
                </h3>
                <p className="text-gray-600">
                  {useCase.description}
                </p>
              </Card>
            ))}
          </div>
        </div>

        {/* 技術情報 */}
        <div className="mb-16">
          <h2 className="text-3xl font-bold text-gray-900 text-center mb-12">
            技術情報
          </h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <Card title="分析項目">
              <ul className="space-y-3 text-gray-600">
                <li className="flex items-center">
                  <span className="text-green-500 mr-2">✓</span>
                  メタタグの最適化状況
                </li>
                <li className="flex items-center">
                  <span className="text-green-500 mr-2">✓</span>
                  Core Web Vitals（FCP、LCP、TTI、TBT）
                </li>
                <li className="flex items-center">
                  <span className="text-green-500 mr-2">✓</span>
                  セキュリティヘッダーの設定状況
                </li>
                <li className="flex items-center">
                  <span className="text-green-500 mr-2">✓</span>
                  WCAG 2.1アクセシビリティガイドライン
                </li>
                <li className="flex items-center">
                  <span className="text-green-500 mr-2">✓</span>
                  モバイルフレンドリー度
                </li>
                <li className="flex items-center">
                  <span className="text-green-500 mr-2">✓</span>
                  技術スタックの検出
                </li>
              </ul>
            </Card>

            <Card title="分析の流れ">
              <ol className="space-y-3 text-gray-600">
                <li className="flex items-start">
                  <span className="bg-blue-100 text-blue-600 rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold mr-3 mt-0.5">1</span>
                  <span>URLの入力と分析オプションの設定</span>
                </li>
                <li className="flex items-start">
                  <span className="bg-blue-100 text-blue-600 rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold mr-3 mt-0.5">2</span>
                  <span>ウェブサイトのクローリングとデータ収集</span>
                </li>
                <li className="flex items-start">
                  <span className="bg-blue-100 text-blue-600 rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold mr-3 mt-0.5">3</span>
                  <span>6つのカテゴリーでの詳細分析</span>
                </li>
                <li className="flex items-start">
                  <span className="bg-blue-100 text-blue-600 rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold mr-3 mt-0.5">4</span>
                  <span>結果のレポート生成と改善提案</span>
                </li>
              </ol>
            </Card>
          </div>
        </div>

        {/* よくある質問 */}
        <div className="mb-16">
          <h2 className="text-3xl font-bold text-gray-900 text-center mb-12">
            よくある質問
          </h2>
          <div className="space-y-6">
            <Card>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Q: 分析にはどのくらい時間がかかりますか？
              </h3>
              <p className="text-gray-600">
                A: サイトの規模にもよりますが、通常1-5分程度で完了します。ページ数が多い場合はより時間がかかる場合があります。
              </p>
            </Card>

            <Card>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Q: 分析結果はどのくらい保存されますか？
              </h3>
              <p className="text-gray-600">
                A: 分析結果は30日間保存されます。期間内であれば、いつでも結果を確認することができます。
              </p>
            </Card>

            <Card>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Q: プライベートなサイトも分析できますか？
              </h3>
              <p className="text-gray-600">
                A: 公開されているウェブサイトのみ分析可能です。認証が必要なページや社内システムは分析できません。
              </p>
            </Card>

            <Card>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Q: 分析データはどのように扱われますか？
              </h3>
              <p className="text-gray-600">
                A: 分析したデータは暗号化されて保存され、第三者に提供されることはありません。プライバシーを最優先に扱っています。
              </p>
            </Card>
          </div>
        </div>

        {/* CTA */}
        <div className="text-center">
          <Card className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white">
            <h2 className="text-2xl font-bold mb-4">
              今すぐウェブサイトを分析してみましょう
            </h2>
            <p className="text-blue-100 mb-6">
              無料で包括的な分析レポートを取得できます
            </p>
            <Link to="/">
              <Button variant="secondary" size="lg">
                分析を開始する
              </Button>
            </Link>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default AboutPage;