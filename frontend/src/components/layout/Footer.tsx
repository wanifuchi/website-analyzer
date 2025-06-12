import React from 'react';
import { Link } from 'react-router-dom';
import ja from '../../i18n/ja.json';

const Footer: React.FC = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-gray-50 border-t border-gray-200">
      <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* サービス情報 */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900 tracking-wider uppercase">
              {ja.app.title}
            </h3>
            <p className="mt-4 text-base text-gray-500">
              {ja.app.description}
            </p>
          </div>

          {/* ナビゲーションリンク */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900 tracking-wider uppercase">
              ナビゲーション
            </h3>
            <ul className="mt-4 space-y-2">
              <li>
                <Link
                  to="/"
                  className="text-base text-gray-500 hover:text-gray-900 transition-colors"
                >
                  {ja.navigation.home}
                </Link>
              </li>
              <li>
                <Link
                  to="/dashboard"
                  className="text-base text-gray-500 hover:text-gray-900 transition-colors"
                >
                  {ja.navigation.dashboard}
                </Link>
              </li>
              <li>
                <Link
                  to="/history"
                  className="text-base text-gray-500 hover:text-gray-900 transition-colors"
                >
                  {ja.navigation.history}
                </Link>
              </li>
              <li>
                <Link
                  to="/about"
                  className="text-base text-gray-500 hover:text-gray-900 transition-colors"
                >
                  {ja.navigation.about}
                </Link>
              </li>
            </ul>
          </div>

          {/* 機能リンク */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900 tracking-wider uppercase">
              機能
            </h3>
            <ul className="mt-4 space-y-2">
              <li>
                <span className="text-base text-gray-500">SEO分析</span>
              </li>
              <li>
                <span className="text-base text-gray-500">パフォーマンス測定</span>
              </li>
              <li>
                <span className="text-base text-gray-500">セキュリティチェック</span>
              </li>
              <li>
                <span className="text-base text-gray-500">アクセシビリティ評価</span>
              </li>
              <li>
                <span className="text-base text-gray-500">モバイル対応度</span>
              </li>
            </ul>
          </div>
        </div>

        {/* 区切り線とコピーライト */}
        <div className="mt-8 border-t border-gray-200 pt-8">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500">
              © {currentYear} {ja.app.title}. All rights reserved.
            </p>
            <div className="flex items-center space-x-6">
              <span className="text-sm text-gray-500">
                高速・正確・無料
              </span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;