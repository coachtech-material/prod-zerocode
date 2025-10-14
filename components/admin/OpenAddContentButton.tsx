"use client";

export default function OpenAddContentButton() {
  return (
    <button
      className="rounded-xl bg-brand-yellow px-3 py-2 text-brand focus-ring text-sm"
      onClick={() => window.dispatchEvent(new Event('add-content:open'))}
    >
      コンテンツを追加
    </button>
  );
}

