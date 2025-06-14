import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import HomePage from './pages/HomePage.simple';
import AnalysisPage from './pages/AnalysisPage.simple';
import HistoryPage from './pages/HistoryPage';
import AboutPage from './pages/AboutPage';

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-gray-50">
        {/* ヘッダー */}
        <nav className="bg-white/80 backdrop-blur-md shadow-sm border-b border-gray-200/50 sticky top-0 z-50">
          <div className="container mx-auto px-4">
            <div className="flex justify-between items-center h-16">
              <div className="flex items-center">
                <Link to="/" className="flex items-center space-x-2 group">
                  <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center text-white font-bold text-sm group-hover:scale-105 transition-transform duration-200">
                    WA
                  </div>
                  <h1 className="text-xl font-bold bg-gradient-to-r from-gray-900 to-blue-600 bg-clip-text text-transparent">
                    Website Analyzer
                  </h1>
                </Link>
              </div>
              <div className="hidden md:flex space-x-1">
                <Link to="/" className="px-4 py-2 text-gray-700 hover:text-blue-600 hover:bg-blue-50 font-medium transition-all duration-200 rounded-lg">
                  ホーム
                </Link>
                <Link to="/history" className="px-4 py-2 text-gray-700 hover:text-blue-600 hover:bg-blue-50 font-medium transition-all duration-200 rounded-lg">
                  履歴
                </Link>
                <Link to="/about" className="px-4 py-2 text-gray-700 hover:text-blue-600 hover:bg-blue-50 font-medium transition-all duration-200 rounded-lg">
                  このツールについて
                </Link>
              </div>
            </div>
          </div>
        </nav>

        {/* メインコンテンツ */}
        <main>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/analysis/:id" element={<AnalysisPage />} />
            <Route path="/history" element={<HistoryPage />} />
            <Route path="/about" element={<AboutPage />} />
            <Route path="*" element={
              <div className="container mx-auto px-4 py-16 text-center">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">ページが見つかりません</h2>
                <p className="text-gray-600 mb-8">お探しのページは存在しないか、移動された可能性があります。</p>
                <Link to="/" className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 transition-colors">
                  ホームに戻る
                </Link>
              </div>
            } />
          </Routes>
        </main>

        {/* フッター */}
        <footer className="bg-white/50 backdrop-blur-md border-t border-gray-200/50 mt-auto">
          <div className="container mx-auto px-4 py-8">
            <div className="text-center text-gray-600">
              <div className="flex justify-center items-center space-x-4 mb-4">
                <div className="w-6 h-6 bg-gradient-to-br from-blue-600 to-indigo-600 rounded flex items-center justify-center text-white font-bold text-xs">
                  WA
                </div>
                <span className="font-medium">Website Analyzer</span>
              </div>
              <p className="text-sm text-gray-500">
                ウェブサイトの健全性を総合的に分析するツール
              </p>
              <p className="text-xs text-gray-400 mt-2">
                🤖 Claude Code で開発されました
              </p>
            </div>
          </div>
        </footer>
      </div>
    </Router>
  );
}

export default App;