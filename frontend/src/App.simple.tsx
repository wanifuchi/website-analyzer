import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import HomePage from './pages/HomePage.simple';
import AnalysisPage from './pages/AnalysisPage.simple';
import HistoryPage from './pages/HistoryPage.simple';
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
                <Link to="/" className="flex items-center space-x-3 group">
                  <div className="relative w-10 h-10 bg-gradient-to-br from-cyan-500 via-blue-600 to-purple-600 rounded-xl flex items-center justify-center text-white font-bold text-sm group-hover:scale-110 transition-all duration-300 shadow-lg group-hover:shadow-xl">
                    <div className="absolute inset-0 bg-gradient-to-br from-cyan-400 to-purple-500 rounded-xl opacity-0 group-hover:opacity-20 transition-opacity duration-300"></div>
                    <span className="relative z-10">T</span>
                  </div>
                  <h1 className="text-xl font-bold bg-gradient-to-r from-slate-800 via-blue-600 to-purple-600 bg-clip-text text-transparent tracking-tight">
                    Toneya Website Analyzer
                  </h1>
                </Link>
              </div>
              <div className="hidden md:flex space-x-2">
                <Link to="/" className="relative px-4 py-2 text-slate-700 hover:text-cyan-600 font-medium transition-all duration-300 rounded-xl group overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-r from-cyan-50 to-blue-50 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                  <span className="relative">ホーム</span>
                </Link>
                <Link to="/history" className="relative px-4 py-2 text-slate-700 hover:text-blue-600 font-medium transition-all duration-300 rounded-xl group overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-50 to-indigo-50 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                  <span className="relative">履歴</span>
                </Link>
                <Link to="/about" className="relative px-4 py-2 text-slate-700 hover:text-purple-600 font-medium transition-all duration-300 rounded-xl group overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-r from-purple-50 to-pink-50 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                  <span className="relative">このツールについて</span>
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
        <footer className="bg-slate-900/95 backdrop-blur-xl border-t border-slate-700/50 mt-auto">
          <div className="container mx-auto px-4 py-12">
            <div className="text-center">
              <div className="flex justify-center items-center space-x-4 mb-6">
                <div className="relative w-8 h-8 bg-gradient-to-br from-cyan-500 via-blue-600 to-purple-600 rounded-lg flex items-center justify-center text-white font-bold text-sm shadow-lg">
                  <div className="absolute inset-0 bg-gradient-to-br from-cyan-400 to-purple-500 rounded-lg opacity-20"></div>
                  <span className="relative z-10">T</span>
                </div>
                <span className="font-semibold text-lg bg-gradient-to-r from-slate-200 to-slate-400 bg-clip-text text-transparent">
                  Toneya Website Analyzer
                </span>
              </div>
              <p className="text-slate-400 mb-4 max-w-md mx-auto leading-relaxed">
                次世代のウェブサイト分析プラットフォーム
              </p>
              <div className="w-16 h-px bg-gradient-to-r from-transparent via-cyan-500 to-transparent mx-auto"></div>
            </div>
          </div>
        </footer>
      </div>
    </Router>
  );
}

export default App;