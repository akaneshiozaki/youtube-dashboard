'use client';

import { useState } from 'react';

interface LoginPageProps {
  onSignIn: (email: string, password: string) => Promise<string | null>;
  onSignUp: (email: string, password: string) => Promise<string | null>;
}

export default function LoginPage({ onSignIn, onSignUp }: LoginPageProps) {
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setInfo('');
    setLoading(true);

    try {
      if (mode === 'login') {
        const err = await onSignIn(email, password);
        if (err) setError(translateError(err));
      } else {
        const err = await onSignUp(email, password);
        if (err) {
          setError(translateError(err));
        } else {
          setInfo('確認メールを送信しました。メールのリンクをクリックしてからログインしてください。');
          setMode('login');
        }
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* ロゴ */}
        <div className="text-center mb-8">
          <div className="w-14 h-14 bg-red-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
            <svg className="w-8 h-8 text-white" viewBox="0 0 24 24" fill="currentColor">
              <path d="M21.8 8s-.2-1.4-.8-2c-.8-.8-1.7-.8-2.1-.9C16.2 5 12 5 12 5s-4.2 0-6.9.1c-.4.1-1.3.1-2.1.9-.6.6-.8 2-.8 2S2 9.6 2 11.2v1.5c0 1.6.2 3.2.2 3.2s.2 1.4.8 2c.8.8 1.8.8 2.3.8C6.8 19 12 19 12 19s4.2 0 6.9-.2c.4-.1 1.3-.1 2.1-.9.6-.6.8-2 .8-2s.2-1.6.2-3.2v-1.5C22 9.6 21.8 8 21.8 8zM9.7 14.5V9.1l5.7 2.7-5.7 2.7z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">YouTube制作ダッシュボード</h1>
          <p className="text-sm text-gray-500 mt-1">チームで動画制作を管理</p>
        </div>

        {/* カード */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          {/* タブ */}
          <div className="flex bg-gray-100 rounded-xl p-0.5 mb-6">
            <button
              onClick={() => { setMode('login'); setError(''); setInfo(''); }}
              className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${
                mode === 'login' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500'
              }`}
            >
              ログイン
            </button>
            <button
              onClick={() => { setMode('signup'); setError(''); setInfo(''); }}
              className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${
                mode === 'signup' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500'
              }`}
            >
              新規登録
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">メールアドレス</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
                placeholder="team@example.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">パスワード</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
                placeholder="6文字以上"
              />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-100 text-red-600 text-xs rounded-xl px-4 py-3">
                {error}
              </div>
            )}
            {info && (
              <div className="bg-green-50 border border-green-100 text-green-700 text-xs rounded-xl px-4 py-3">
                {info}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-red-500 hover:bg-red-600 disabled:opacity-60 disabled:cursor-not-allowed text-white font-medium py-2.5 rounded-xl transition-colors flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
                  </svg>
                  処理中...
                </>
              ) : mode === 'login' ? 'ログイン' : 'アカウントを作成'}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-gray-400 mt-4">
          チームメンバー全員で同じアカウント情報を共有してください
        </p>
      </div>
    </div>
  );
}

function translateError(msg: string): string {
  if (msg.includes('Invalid login credentials')) return 'メールアドレスまたはパスワードが正しくありません';
  if (msg.includes('Email not confirmed')) return 'メールアドレスの確認が完了していません。確認メールをご確認ください';
  if (msg.includes('User already registered')) return 'このメールアドレスはすでに登録されています';
  if (msg.includes('Password should be at least')) return 'パスワードは6文字以上で設定してください';
  if (msg.includes('Unable to validate email')) return '有効なメールアドレスを入力してください';
  if (msg.includes('rate limit')) return 'しばらく待ってから再試行してください';
  return msg;
}
