"use client";
import { useState } from 'react';

export default function TestDetailTabs({
  initialTab,
  canDetails,
  basic,
  details,
  preview,
  canPreview,
}: {
  initialTab: 'basic' | 'details' | 'preview';
  canDetails: boolean;
  basic: React.ReactNode;
  details: React.ReactNode;
  preview?: React.ReactNode;
  canPreview?: boolean;
}) {
  const [tab, setTab] = useState<'basic' | 'details' | 'preview'>(initialTab);

  return (
    <div className="space-y-4">
      <div className="inline-flex rounded-lg bg-brand-sky/10 p-1 text-sm">
        <button
          type="button"
          onClick={() => setTab('basic')}
          className={[ 'px-3 py-1.5 rounded-md', tab==='basic' ? 'bg-brand-yellow text-brand' : 'text-slate-700' ].join(' ')}
        >
          テスト基本情報
        </button>
        <button
          type="button"
          onClick={() => setTab('details')}
          className={[ 'px-3 py-1.5 rounded-md', tab==='details' ? 'bg-brand-yellow text-brand' : 'text-slate-700' ].join(' ')}
        >
          テスト詳細情報
        </button>
        {preview && (
          <button
            type="button"
            onClick={() => setTab('preview')}
            className={[ 'px-3 py-1.5 rounded-md', tab==='preview' ? 'bg-brand-yellow text-brand' : 'text-slate-700' ].join(' ')}
          >
            生徒側プレビュー
          </button>
        )}
      </div>

      <div className={tab === 'basic' ? '' : 'hidden'}>
        {basic}
      </div>

      <div className={tab === 'details' ? '' : 'hidden'}>
        {!canDetails ? (
          <div className="rounded-2xl border border-brand-sky/20 bg-white p-4">
            <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">基本情報でテスト形態を保存してください。</div>
          </div>
        ) : (
          details
        )}
      </div>

      {preview && (
        <div className={tab === 'preview' ? '' : 'hidden'}>
          {!(canPreview ?? canDetails) ? (
            <div className="rounded-2xl border border-brand-sky/20 bg-white p-4">
              <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">基本情報でテスト形態を保存してください。</div>
            </div>
          ) : (
            preview
          )}
        </div>
      )}
    </div>
  );
}
