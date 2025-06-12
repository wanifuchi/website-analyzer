import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import HomePage from './pages/HomePage.simple';
import AnalysisPage from './pages/AnalysisPage.simple';
import HistoryPage from './pages/HistoryPage';

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-gray-50">
        {/* ヘッダー */}
        <nav className="bg-white shadow-sm border-b">
          <div className="container mx-auto px-4">
            <div className="flex justify-between items-center h-16">
              <div className="flex items-center">
                <h1 className="text-xl font-bold text-gray-900">
                  Toneya Analysis V1
                </h1>
              </div>
              <div className="hidden md:flex space-x-8">
                <a href="/" className="text-gray-700 hover:text-blue-600 font-medium">
                  ホーム
                </a>
                <a href="/history" className="text-gray-700 hover:text-blue-600 font-medium">
                  履歴
                </a>
                <a href="#" className="text-gray-400 cursor-not-allowed">
                  このツールについて（開発中）
                </a>
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
            <Route path="*" element={
              <div className="container mx-auto px-4 py-16 text-center">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">ページが見つかりません</h2>
                <p className="text-gray-600 mb-8">お探しのページは存在しないか、開発中です。</p>
                <a href="/" className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700">
                  ホームに戻る
                </a>
              </div>
            } />
          </Routes>
        </main>

        {/* フッター */}
        <footer className="bg-white border-t mt-auto">
          <div className="container mx-auto px-4 py-8">
            <div className="text-center text-gray-600">
              {/* <p>&copy; 2024 Toneya Analysis V1. All rights reserved.</p> */}
              {/* <p className="text-sm mt-2">
                Claude Code で開発されました
              </p> */}
            </div>
          </div>
        </footer>
      </div>
    </Router>
  );
}

export default App;