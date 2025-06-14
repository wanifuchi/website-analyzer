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
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 relative overflow-hidden">
      {/* 近未来的背景装飾 */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(6,182,212,0.1),transparent_50%)] -z-10" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(168,85,247,0.1),transparent_50%)] -z-10" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_80%,rgba(34,197,94,0.1),transparent_50%)] -z-10" />
      
      {/* アニメーション背景要素 */}
      <div className="absolute top-20 right-20 w-2 h-2 bg-cyan-400 rounded-full animate-pulse" />
      <div className="absolute top-40 left-20 w-1 h-1 bg-purple-400 rounded-full animate-ping" />
      <div className="absolute bottom-40 right-40 w-1.5 h-1.5 bg-blue-400 rounded-full animate-pulse" />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 relative">
        {/* ヒーローセクション */}
        <div className="text-center mb-20">
          <div className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-cyan-500/20 to-purple-500/20 backdrop-blur-sm border border-cyan-400/30 rounded-2xl text-sm font-medium mb-10">
            <div className="w-2 h-2 bg-gradient-to-r from-cyan-400 to-purple-400 rounded-full mr-3 animate-ping"></div>
            <span className="bg-gradient-to-r from-cyan-300 to-purple-300 bg-clip-text text-transparent font-semibold">
              次世代ウェブ解析プラットフォーム
            </span>
          </div>
          
          <h1 className="text-5xl md:text-7xl font-bold mb-8 leading-none tracking-tight">
            <span className="bg-gradient-to-r from-cyan-300 via-blue-400 to-purple-400 bg-clip-text text-transparent">
              Toneya
            </span>
            <br />
            <span className="bg-gradient-to-r from-slate-200 via-slate-300 to-slate-400 bg-clip-text text-transparent">
              Website Analyzer
            </span>
          </h1>
          
          <p className="text-xl text-slate-300 max-w-4xl mx-auto mb-8 leading-relaxed">
            AI技術と量子計算を駆使したウェブサイト総合分析システム。
            SEO、パフォーマンス、セキュリティ、アクセシビリティを統合的に評価し、
            デジタル体験の新たな次元を切り開きます。
          </p>
          
          <Link to="/">
            <Button 
              size="lg" 
              className="h-14 px-8 bg-gradient-to-r from-cyan-500 to-purple-600 hover:from-cyan-400 hover:to-purple-500 border-0 shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300"
            >
              <span className="mr-3">⚡</span>
              今すぐ分析を開始
            </Button>
          </Link>
        </div>

        {/* 機能詳細 */}
        <div className="mb-20">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold bg-gradient-to-r from-slate-200 to-slate-400 bg-clip-text text-transparent mb-4">
              革新的分析機能
            </h2>
            <p className="text-slate-400 max-w-2xl mx-auto">
              最先端のAI技術が可能にする、従来の枠を超えたウェブサイト解析
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <div key={index} className="relative group">
                <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/20 via-blue-500/20 to-purple-500/20 rounded-3xl blur-xl opacity-30 group-hover:opacity-60 transition-opacity duration-500" />
                <Card 
                  variant="elevated" 
                  hoverable 
                  className="relative h-full backdrop-blur-xl bg-slate-800/40 border border-slate-700/50 group-hover:bg-slate-800/60 transition-all duration-500"
                >
                  <div className="text-center space-y-6">
                    <div className="relative">
                      <div className="w-20 h-20 bg-gradient-to-br from-cyan-400 to-purple-500 rounded-3xl flex items-center justify-center mx-auto text-3xl transition-all duration-500 group-hover:scale-110 group-hover:rotate-3">
                        <div className="absolute inset-0 bg-white/10 rounded-3xl backdrop-blur-sm"></div>
                        <span className="relative z-10">{feature.icon}</span>
                      </div>
                      {/* ホログラフィック効果 */}
                      <div className="absolute -inset-2 bg-gradient-to-r from-cyan-400 to-purple-500 opacity-0 rounded-3xl blur-md transition-opacity duration-500 group-hover:opacity-20" />
                    </div>
                    <h3 className="text-xl font-bold text-slate-200 group-hover:text-white transition-colors duration-300">
                      {feature.title}
                    </h3>
                    <p className="text-slate-400 leading-relaxed group-hover:text-slate-300 transition-colors duration-300">
                      {feature.description}
                    </p>
                  </div>
                </Card>
              </div>
            ))}
          </div>
        </div>

        {/* 利用のメリット */}
        <div className="mb-20">
          <h2 className="text-4xl font-bold bg-gradient-to-r from-slate-200 to-slate-400 bg-clip-text text-transparent text-center mb-12">
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
        <div className="mb-20">
          <h2 className="text-4xl font-bold bg-gradient-to-r from-slate-200 to-slate-400 bg-clip-text text-transparent text-center mb-12">
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
        <div className="mb-20">
          <h2 className="text-4xl font-bold bg-gradient-to-r from-slate-200 to-slate-400 bg-clip-text text-transparent text-center mb-12">
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
        <div className="mb-20">
          <h2 className="text-4xl font-bold bg-gradient-to-r from-slate-200 to-slate-400 bg-clip-text text-transparent text-center mb-12">
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
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/30 via-blue-500/30 to-purple-500/30 rounded-3xl blur-2xl"></div>
            <Card 
              variant="elevated" 
              className="relative backdrop-blur-xl bg-slate-800/60 border border-slate-700/50 shadow-2xl"
            >
              <div className="text-center space-y-6">
                <h2 className="text-3xl font-bold bg-gradient-to-r from-cyan-300 to-purple-300 bg-clip-text text-transparent">
                  未来のウェブ解析を今すぐ体験
                </h2>
                <p className="text-slate-300 max-w-2xl mx-auto leading-relaxed">
                  Toneya Website Analyzerで、あなたのウェブサイトの真の可能性を発見してください。
                  AI駆動の包括的分析が、新たなデジタル体験の扉を開きます。
                </p>
                <div className="flex justify-center space-x-4 pt-4">
                  <Link to="/">
                    <Button 
                      size="lg" 
                      className="h-14 px-8 bg-gradient-to-r from-cyan-500 to-purple-600 hover:from-cyan-400 hover:to-purple-500 border-0 shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300"
                    >
                      <span className="mr-3">🚀</span>
                      分析を開始する
                    </Button>
                  </Link>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AboutPage;