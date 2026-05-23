'use client';

import { signIn } from 'next-auth/react';
import { useState } from 'react';

export function LoginButton() {
  const [loading, setLoading] = useState(false);

  const handleSignIn = async () => {
    setLoading(true);
    await signIn('azure-ad', { callbackUrl: '/' });
  };

  return (
    <button
      onClick={handleSignIn}
      disabled={loading}
      className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-[#0078D4] hover:bg-[#106EBE] disabled:opacity-60 text-white font-medium rounded-lg transition-colors"
    >
      {/* Microsoft logo mark */}
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 21 21" fill="none">
        <rect x="1" y="1" width="9" height="9" fill="#F25022" />
        <rect x="11" y="1" width="9" height="9" fill="#7FBA00" />
        <rect x="1" y="11" width="9" height="9" fill="#00A4EF" />
        <rect x="11" y="11" width="9" height="9" fill="#FFB900" />
      </svg>
      {loading ? 'Signing in…' : 'Sign in with Microsoft'}
    </button>
  );
}
