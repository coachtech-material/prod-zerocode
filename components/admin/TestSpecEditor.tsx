"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import MarkdownEditor from '@/components/ui/MarkdownEditor';
import CodeEditor from '@/components/ui/CodeEditor';

type Mode = 'fill_blank' | 'semantic_fill' | 'fix' | 'reorder';

function tryParseSpec(specYaml?: string | null): any {
  if (!specYaml) return {};
  try {
    // try JSON first
    return JSON.parse(specYaml);
  } catch {}
  // fallback: return raw string wrapped
  return { content_md: '', raw: specYaml };
}

export default function TestSpecEditor({ testId, mode, initialSpec }: { testId: string; mode: Mode; initialSpec?: string | null }) {
  const init = useMemo(() => tryParseSpec(initialSpec), [initialSpec]);
  const [saving, setSaving] = useState(false);
  const [content, setContent] = useState<string>(init?.content_md || init?.problem_md || '');
  const [explanationMd, setExplanationMd] = useState<string>(init?.explanation_md || '');
  const modeLabel = useMemo(() => (
    mode === 'fill_blank'
      ? '穴埋め'
      : mode === 'semantic_fill'
        ? '言語化穴埋め'
        : mode === 'fix'
          ? '修正'
          : mode === 'reorder'
            ? '並べ替え'
            : '未設定'
  ), [mode]);

  // Mode-specific state
  const [blanks, setBlanks] = useState<Array<any>>(init?.blanks || []);
  const [template, setTemplate] = useState<string>(init?.explanation_template || '');
  const [choices, setChoices] = useState<Array<any>>(init?.choices || []); // for fix
  const [items, setItems] = useState<Array<any>>(init?.items || []); // for reorder
  const [correctOrder, setCorrectOrder] = useState<Array<string>>(init?.correct_order || []);
  const [displayOrder, setDisplayOrder] = useState<Array<string>>(
    (init?.display_order as string[] | undefined) || (Array.isArray(init?.items) ? (init!.items as any[]).map((it:any)=>it.key) : [])
  );
  const [highlights, setHighlights] = useState<Array<any>>(init?.highlights || []);
  const [files, setFiles] = useState<Array<{ name: string; code: string; display?: boolean }>>(init?.files || []);
  const [resTab, setResTab] = useState<'edit'|'preview'>('edit');
  const [resPreviewIdx, setResPreviewIdx] = useState<number>(0);
  useEffect(() => {
    const shown = (files || []).filter(f => f.display);
    if (!shown.length) {
      if (resPreviewIdx !== 0) setResPreviewIdx(0);
      return;
    }
    if (resPreviewIdx >= shown.length) setResPreviewIdx(0);
  }, [files, resPreviewIdx]);
  const [savingFileIdx, setSavingFileIdx] = useState<number | null>(null);

  // Track last-saved snapshot to detect unsaved changes per section
  const makeSnapshot = useCallback(() => ({
    content,
    explanationMd,
    files,
    blanks,
    template,
    choices,
    items,
    displayOrder,
    correctOrder,
    highlights,
  }), [content, explanationMd, files, blanks, template, choices, items, displayOrder, correctOrder, highlights]);
  const savedRef = useRef<ReturnType<typeof makeSnapshot>>(makeSnapshot());
  useEffect(() => {
    // Initialize baseline from initial spec
    savedRef.current = makeSnapshot();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const eq = (a: any, b: any) => {
    try { return JSON.stringify(a) === JSON.stringify(b); } catch { return a === b; }
  };
  const dirtyContent = content !== savedRef.current.content;
  const dirtyResources = !eq(files, savedRef.current.files);
  const dirtyExplanation = explanationMd !== savedRef.current.explanationMd;
  const dirtyOptions = useMemo(() => {
    if (mode === 'fill_blank') return !eq(blanks, savedRef.current.blanks);
    if (mode === 'semantic_fill') return !eq({ blanks, template }, { blanks: savedRef.current.blanks, template: savedRef.current.template });
    if (mode === 'fix') return !eq({ highlights, choices }, { highlights: savedRef.current.highlights, choices: savedRef.current.choices });
    if (mode === 'reorder') return !eq({ items, displayOrder, correctOrder }, { items: savedRef.current.items, displayOrder: (savedRef.current as any).displayOrder, correctOrder: savedRef.current.correctOrder });
    return false;
  }, [mode, blanks, template, choices, items, displayOrder, correctOrder, highlights]);

  const onAddBlank = () => setBlanks((v) => {
    const nums = v
      .map((b: any) => {
        const m = String(b?.key || '').match(/^問\s*(\d+)$/);
        return m ? Number(m[1]) : null;
      })
      .filter((n): n is number => n != null);
    const next = nums.length ? Math.max(...nums) + 1 : v.length + 1;
    const key = `問${next}`;
    return [...v, { key, prompt: '', correct: '', choices: [] }];
  });
  const onAddChoiceToBlank = (i: number) => setBlanks((v) => v.map((b, idx) => idx === i ? { ...b, choices: [...(b.choices||[]), ''] } : b));
  const onDelBlank = (i: number) => setBlanks((v) => v.filter((_, idx) => idx !== i));

  const onAddFixChoice = () => setChoices((v) => {
    const nums = v
      .map((c: any) => {
        const n = Number(c?.id);
        return Number.isFinite(n) ? n : null;
      })
      .filter((n): n is number => n != null);
    const next = nums.length ? Math.max(...nums) + 1 : v.length + 1;
    return [...v, { id: next, body: '', is_correct: false }];
  });
  const onDelFixChoice = (i: number) => setChoices((v) => v.filter((_, idx) => idx !== i));

  const onAddItem = () => setItems((v) => {
    const unique = `STEP_${Date.now()}_${v.length + 1}`;
    return [...v, { key: unique, label: '' }];
  });
  const onDelItem = (i: number) => setItems((v) => v.filter((_, idx) => idx !== i));
  const onShuffleItems = () => setDisplayOrder((prev) => {
    const keys = items.map((it) => it.key);
    const base = (prev || []).filter((k) => keys.includes(k));
    const full = base.concat(keys.filter((k) => !base.includes(k)));
    const arr = full.slice();
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  });

  // 正解順は items の順序に同期（表示順シャッフルでは items は不変のため正解順は変わらない）
  useEffect(() => {
    setCorrectOrder(items.map((it) => it.key));
  }, [items]);

  // 表示順は items のキー集合に追従しつつ既存の順序を維持
  useEffect(() => {
    setDisplayOrder((prev) => {
      const keys = items.map((it) => it.key);
      const filtered = (prev || []).filter((k) => keys.includes(k));
      const missing = keys.filter((k) => !filtered.includes(k));
      return [...filtered, ...missing];
    });
  }, [items]);

  const toast = (msg: string, type: 'success'|'error'|'info'='info') => {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('app:toast', { detail: { message: msg, type } }));
    }
  };

  const onSave = async () => {
    setSaving(true);
    try {
      let payload: any = { content_md: content };
      if (explanationMd) payload.explanation_md = explanationMd;
      if (mode === 'fill_blank') {
        payload.blanks = blanks;
      } else if (mode === 'semantic_fill') {
        payload.explanation_template = template;
        payload.blanks = blanks;
      } else if (mode === 'fix') {
        payload.highlights = highlights;
        payload.choices = choices;
      } else if (mode === 'reorder') {
        payload.items = items;
        payload.correct_order = items.map((it:any)=>it.key);
        if (displayOrder && displayOrder.length) payload.display_order = displayOrder;
      }
      if (files && files.length) payload.files = files;
      const res = await fetch(`/api/tests/${testId}/spec`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ spec: payload }),
      });
      const j = await res.json();
      if (!res.ok || !j?.ok) throw new Error(j?.error || '保存に失敗しました');
      // Update baseline after successful save
      savedRef.current = makeSnapshot();
      // Broadcast updated spec to live preview (JSON string)
      try {
        const specYaml = JSON.stringify(payload);
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('app:test:spec-updated', { detail: { specYaml } }));
        }
      } catch {}
      toast('変更を保存しました', 'success');
    } catch (e: any) {
      toast(e?.message || '保存に失敗しました', 'error');
    } finally {
      setSaving(false);
    }
  };

  const onSaveFile = async (index: number) => {
    setSavingFileIdx(index);
    try {
      let payload: any = { content_md: content };
      if (explanationMd) payload.explanation_md = explanationMd;
      if (mode === 'fill_blank') payload.blanks = blanks;
      else if (mode === 'semantic_fill') { payload.explanation_template = template; payload.blanks = blanks; }
      else if (mode === 'fix') { payload.highlights = highlights; payload.choices = choices; }
      else if (mode === 'reorder') { payload.items = items; payload.correct_order = items.map((it:any)=>it.key); if (displayOrder && displayOrder.length) payload.display_order = displayOrder; }
      if (files && files.length) payload.files = files;
      const res = await fetch(`/api/tests/${testId}/spec`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ spec: payload }),
      });
      const j = await res.json();
      if (!res.ok || !j?.ok) throw new Error(j?.error || '保存に失敗しました');
      // Update baseline after successful save
      savedRef.current = makeSnapshot();
      // Broadcast updated spec to live preview (JSON string)
      try {
        const specYaml = JSON.stringify(payload);
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('app:test:spec-updated', { detail: { specYaml } }));
        }
      } catch {}
      toast('変更を保存しました', 'success');
    } catch (e: any) {
      toast(e?.message || '保存に失敗しました', 'error');
    } finally {
      setSavingFileIdx(null);
    }
  };

  return (
    <div className="space-y-4">
      {/* テスト形態 */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-slate-500">テスト形態</span>
        <span
          className={[
            'inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] leading-4',
            'border-indigo-500/30 bg-indigo-500/15 text-indigo-700',
          ].join(' ')}
        >
          {modeLabel}
        </span>
      </div>

      {/* 統合: テスト説明＋問題文（Markdown） */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs">
          <span className="text-slate-500">問題文</span>
          {dirtyContent && <span className="text-red-600">未保存の変更があります</span>}
        </div>
        <button
          type="button"
          onClick={onSave}
          disabled={saving}
          className="rounded-lg bg-brand-yellow px-3 py-1.5 text-xs text-brand focus-ring disabled:opacity-60"
        >
          {saving ? '保存中…' : '保存'}
        </button>
      </div>
      <section className="rounded-2xl border border-brand-sky/20 bg-white p-3">
        <MarkdownEditor value={content} onChange={setContent} placeholder="この欄にテスト説明＋問題文をMarkdownで入力します。" rows={14} />
      </section>

      {/* リソース（表示するファイルとコード） */}
      <div className="flex items-center gap-2 text-xs">
        <span className="text-slate-500">リソース</span>
        {dirtyResources && <span className="text-red-600">未保存の変更があります</span>}
      </div>
      <section className="rounded-2xl border border-brand-sky/20 bg-white p-3 space-y-3">
        <div className="flex items-center justify-between">
          <div className="inline-flex rounded-lg bg-brand-sky/10 p-0.5 text-sm">
            <button type="button" onClick={()=>setResTab('edit')} className={[ 'px-3 py-1.5 rounded-md', resTab==='edit' ? 'bg-brand-yellow text-brand' : 'text-slate-700' ].join(' ')}>編集</button>
            <button type="button" onClick={()=>setResTab('preview')} className={[ 'px-3 py-1.5 rounded-md', resTab==='preview' ? 'bg-brand-yellow text-brand' : 'text-slate-700' ].join(' ')}>プレビュー</button>
          </div>
          {resTab==='edit' && (
            <button
              type="button"
              className="rounded-lg bg-brand-sky/10 px-3 py-1.5 text-xs focus-ring"
              onClick={() => setFiles(v => [...v, { name: `file_${v.length + 1}.txt`, code: '', display: true }])}
            >追加</button>
          )}
        </div>
        {resTab==='edit' ? (
          <>
            {!files.length && (
              <div className="text-sm text-slate-500">ファイルがありません。「追加」から作成してください。</div>
            )}
            <div className="space-y-3">
              {files.map((f, i) => (
                <div key={i} className="rounded-xl border border-brand-sky/20 bg-white p-3 space-y-2">
                  <div className="flex items-center gap-2">
                    <input
                      value={f.name}
                      onChange={(e)=> setFiles(v=> v.map((x,idx)=> idx===i ? { ...x, name: e.target.value } : x))}
                      className="w-64 rounded-lg bg-brand-sky/10 px-2 py-1 text-xs focus-ring"
                    />
                    <label className="inline-flex items-center gap-2 text-xs text-slate-600">
                      <input type="checkbox" checked={!!f.display} onChange={(e)=> setFiles(v=> v.map((x,idx)=> idx===i ? { ...x, display: e.target.checked } : x))} />
                      表示する
                    </label>
                    <div className="ml-auto flex items-center gap-2">
                      <button
                        type="button"
                        onClick={()=> onSaveFile(i)}
                        disabled={savingFileIdx === i}
                        className="rounded-lg bg-brand-yellow px-2 py-1 text-xs text-brand disabled:opacity-60"
                      >{savingFileIdx === i ? '保存中…' : '保存'}</button>
                      <button type="button" onClick={()=> setFiles(v=> v.filter((_,idx)=> idx!==i))} className="rounded-lg bg-brand-sky/10 px-2 py-1 text-xs">削除</button>
                    </div>
                  </div>
                  <CodeEditor path={f.name} value={f.code || ''} onChange={(val)=> setFiles(v=> v.map((x,idx)=> idx===i ? { ...x, code: val } : x))} />
                </div>
              ))}
            </div>
          </>
        ) : (
          <>
            {files.filter(f=>f.display).length === 0 ? (
              <div className="text-sm text-slate-500">表示設定されたファイルがありません。</div>
            ) : (
              (() => {
                const shown = files.filter(f=>f.display);
                const active = shown[Math.min(resPreviewIdx, shown.length-1)];
                return (
                  <div className="space-y-2">
                    {/* タブバー */}
                    <div className="flex items-center gap-1 overflow-x-auto">
                      {shown.map((f, idx) => (
                        <button
                          type="button"
                          key={`${f.name}_${idx}`}
                          className={[
                            'rounded-md px-3 py-1.5 text-xs border',
                            idx === Math.min(resPreviewIdx, shown.length-1)
                              ? 'bg-brand-sky/20 border-brand-sky/30 text-slate-800'
                              : 'bg-white border-brand-sky/20 text-slate-600 hover:bg-brand-sky/10'
                          ].join(' ')}
                          onClick={() => setResPreviewIdx(idx)}
                        >
                          {f.name || `file_${idx+1}`}
                        </button>
                      ))}
                    </div>
                    {/* アクティブファイル */}
                    <div className="rounded-xl border border-brand-sky/20 bg-white p-3">
                      <CodeEditor path={active?.name} value={active?.code || ''} onChange={()=>{}} readOnly showLineNumbers />
                    </div>
                  </div>
                );
              })()
            )}
          </>
        )}
      </section>

      {/* 形態別 */}
      {mode === 'fill_blank' && (
        <>
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <div className="text-sm text-slate-600">プレースホルダ（BLANK）</div>
                {dirtyOptions && <span className="text-xs text-red-600">未保存の変更があります</span>}
              </div>
              <p className="mt-1 text-xs text-slate-500">本文中のプレースホルダは <code className="font-mono bg-neutral-800 text-orange-300 border border-brand-sky/20 px-1 py-0.5 rounded text-[0.9em]">{'{{ 問1 }}'}</code> のように日本語「問」+連番の形式のみ認識。例: {'{{ 問1 }}'}, {'{{ 問2 }}'}。任意の {'{{ ... }}'} は対象外です。</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onSave}
                disabled={saving}
                className="rounded-lg bg-brand-yellow px-3 py-1.5 text-xs text-brand focus-ring disabled:opacity-60"
              >
                {saving ? '保存中…' : '保存'}
              </button>
              <button type="button" onClick={onAddBlank} className="rounded-lg bg-brand-sky/10 px-3 py-1.5 text-xs focus-ring">追加</button>
            </div>
          </div>
          <div className="space-y-2">
            {blanks.map((b, i) => (
              <div key={i} className="rounded-xl border border-brand-sky/20 bg-white p-3 space-y-2">
                <div className="flex items-center gap-2">
                  <input value={b.key} onChange={(e)=>setBlanks(v=>v.map((x,idx)=>idx===i?{...x,key:e.target.value}:x))} className="w-36 rounded-lg bg-brand-sky/10 px-2 py-1 text-xs focus-ring" />
                  <input value={b.prompt||''} placeholder="プロンプト（任意）" onChange={(e)=>setBlanks(v=>v.map((x,idx)=>idx===i?{...x,prompt:e.target.value}:x))} className="flex-1 rounded-lg bg-brand-sky/10 px-2 py-1 text-xs focus-ring" />
                  <button type="button" onClick={()=>onDelBlank(i)} className="rounded-lg bg-brand-sky/10 px-2 py-1 text-xs">削除</button>
                </div>
                <div className="grid gap-1">
                  <span className="text-xs text-slate-500">正答</span>
                  <input value={b.correct||''} onChange={(e)=>setBlanks(v=>v.map((x,idx)=>idx===i?{...x,correct:e.target.value}:x))} className="rounded-lg bg-brand-sky/10 px-2 py-1 text-xs focus-ring" />
                </div>
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-500">選択肢</span>
                    <button type="button" onClick={()=>onAddChoiceToBlank(i)} className="rounded-lg bg-brand-sky/10 px-2 py-1 text-xs">追加</button>
                  </div>
                  {(b.choices||[]).map((c:string, ci:number)=>(
                    <input key={ci} value={c} onChange={(e)=>setBlanks(v=>v.map((x,idx)=>idx===i?{...x,choices:(x.choices||[]).map((cc:string,cj:number)=>cj===ci?e.target.value:cc)}:x))} className="w-full rounded-lg bg-brand-sky/10 px-2 py-1 text-xs focus-ring" />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
        {/* 解説（Markdown） */}
        <div className="flex items-center justify-between mt-4">
          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-500">解説</span>
            {dirtyExplanation && <span className="text-red-600">未保存の変更があります</span>}
          </div>
          <button type="button" onClick={onSave} disabled={saving} className="rounded-lg bg-brand-sky/10 px-3 py-1.5 text-xs focus-ring">保存</button>
        </div>
        <section className="rounded-2xl border border-brand-sky/20 bg-white p-3">
          <MarkdownEditor value={explanationMd} onChange={setExplanationMd} placeholder="学習者向けの解説をMarkdownで入力します" rows={8} />
        </section>
        </>
      )}

      {mode === 'semantic_fill' && (
        <>
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs">
              <span className="text-slate-500">コードリーディング（Markdown）</span>
              {dirtyOptions && <span className="text-red-600">未保存の変更があります</span>}
            </div>
            <button type="button" onClick={onSave} disabled={saving} className="rounded-lg bg-brand-yellow px-3 py-1.5 text-xs text-brand focus-ring disabled:opacity-60">{saving ? '保存中…' : '保存'}</button>
          </div>
          <section className="rounded-2xl border border-brand-sky/20 bg-white p-3">
            <MarkdownEditor value={template} onChange={setTemplate} placeholder={"学習者に見せるコードリーディング文面をMarkdownで入力します（必要に応じて {{ 問1 }} のように空欄も表現できます）"} rows={8} />
          </section>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-slate-600">BLANK 定義</div>
              <p className="mt-1 text-xs text-slate-500">本文中のプレースホルダは <code className="font-mono bg-neutral-800 text-orange-300 border border-brand-sky/20 px-1 py-0.5 rounded text-[0.9em]">{'{{ 問1 }}'}</code> のように日本語「問」+連番の形式のみ認識されます。例: {'{{ 問1 }}'}, {'{{ 問2 }}'}。任意の {'{{ ... }}'} はプレースホルダとして扱われません。</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onSave}
                disabled={saving}
                className="rounded-lg bg-brand-yellow px-3 py-1.5 text-xs text-brand focus-ring disabled:opacity-60"
              >
                {saving ? '保存中…' : '保存'}
              </button>
              <button type="button" onClick={onAddBlank} className="rounded-lg bg-brand-sky/10 px-3 py-1.5 text-xs focus-ring">追加</button>
            </div>
          </div>
          <div className="space-y-2">
            {blanks.map((b, i) => (
              <div key={i} className="rounded-xl border border-brand-sky/20 bg-white p-3 space-y-2">
                <div className="flex items-center gap-2">
                  <input value={b.key} onChange={(e)=>setBlanks(v=>v.map((x,idx)=>idx===i?{...x,key:e.target.value}:x))} className="w-36 rounded-lg bg-brand-sky/10 px-2 py-1 text-xs focus-ring" />
                  <button type="button" onClick={()=>onDelBlank(i)} className="rounded-lg bg-brand-sky/10 px-2 py-1 text-xs">削除</button>
                </div>
                <div className="grid gap-1">
                  <span className="text-xs text-slate-500">正答</span>
                  <input value={b.correct||''} onChange={(e)=>setBlanks(v=>v.map((x,idx)=>idx===i?{...x,correct:e.target.value}:x))} className="rounded-lg bg-brand-sky/10 px-2 py-1 text-xs focus-ring" />
                </div>
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-500">選択肢</span>
                    <button type="button" onClick={()=>onAddChoiceToBlank(i)} className="rounded-lg bg-brand-sky/10 px-2 py-1 text-xs">追加</button>
                  </div>
                  {(b.choices||[]).map((c:string, ci:number)=>(
                    <input key={ci} value={c} onChange={(e)=>setBlanks(v=>v.map((x,idx)=>idx===i?{...x,choices:(x.choices||[]).map((cc:string,cj:number)=>cj===ci?e.target.value:cc)}:x))} className="w-full rounded-lg bg-brand-sky/10 px-2 py-1 text-xs focus-ring" />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
        {/* 解説（Markdown） */}
        <div className="flex items-center justify-between mt-4">
          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-500">解説</span>
            {dirtyExplanation && <span className="text-red-600">未保存の変更があります</span>}
          </div>
          <button type="button" onClick={onSave} disabled={saving} className="rounded-lg bg-brand-sky/10 px-3 py-1.5 text-xs focus-ring">保存</button>
        </div>
        <section className="rounded-2xl border border-brand-sky/20 bg-white p-3">
          <MarkdownEditor value={explanationMd} onChange={setExplanationMd} placeholder="学習者向けの解説をMarkdownで入力します" rows={8} />
        </section>
        </>
      )}

      {mode === 'fix' && (
        <>
          <section className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="text-sm text-slate-600">選択肢</div>
              {dirtyOptions && <span className="text-xs text-red-600">未保存の変更があります</span>}
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onSave}
                disabled={saving}
                className="rounded-lg bg-brand-yellow px-3 py-1.5 text-xs text-brand focus-ring disabled:opacity-60"
              >
                {saving ? '保存中…' : '保存'}
              </button>
              <button type="button" onClick={onAddFixChoice} className="rounded-lg bg-brand-sky/10 px-3 py-1.5 text-xs focus-ring">追加</button>
            </div>
          </div>
          <div className="space-y-2">
            {choices.map((c, i) => (
              <div key={i} className="rounded-xl border border-brand-sky/20 bg-white p-3 grid gap-2">
                <div className="flex items-center gap-2 text-xs text-slate-600">
                  <span className="inline-flex h-6 w-6 items-center justify-center rounded bg-brand-sky/10 text-slate-800">{Number(c.id) || i+1}</span>
                  <span>選択肢ID</span>
                </div>
                <input value={c.body} onChange={(e)=>setChoices(v=>v.map((x,idx)=>idx===i?{...x,body:e.target.value}:x))} placeholder="選択肢（テキスト or コード）" className="rounded-lg bg-brand-sky/10 px-2 py-1 text-xs focus-ring" />
                <label className="inline-flex items-center gap-2 text-xs text-slate-600">
                  <input type="checkbox" checked={!!c.is_correct} onChange={(e)=>setChoices(v=>v.map((x,idx)=>idx===i?{...x,is_correct:e.target.checked}:x))} /> 正解
                </label>
                <div className="text-right">
                  <button type="button" onClick={()=>onDelFixChoice(i)} className="rounded-lg bg-brand-sky/10 px-2 py-1 text-xs">削除</button>
                </div>
              </div>
            ))}
          </div>
          </section>

          {/* 解説（Markdown） */}
          <div className="flex items-center justify-between mt-4">
            <div className="flex items-center gap-2 text-xs">
              <span className="text-slate-500">解説</span>
              {dirtyExplanation && <span className="text-red-600">未保存の変更があります</span>}
            </div>
            <button
              type="button"
              onClick={onSave}
              disabled={saving}
              className="rounded-lg bg-brand-sky/10 px-3 py-1.5 text-xs focus-ring"
            >保存</button>
          </div>
          <section className="rounded-2xl border border-brand-sky/20 bg-white p-3">
            <MarkdownEditor
              value={explanationMd}
              onChange={setExplanationMd}
              placeholder="学習者向けの解説をMarkdownで入力します"
              rows={8}
            />
          </section>
        </>
      )}

      {mode === 'reorder' && (
        <>
          <section className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="text-sm text-slate-600">並べ替え選択肢</div>
              {dirtyOptions && <span className="text-xs text-red-600">未保存の変更があります</span>}
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onSave}
                disabled={saving}
                className="rounded-lg bg-brand-yellow px-3 py-1.5 text-xs text-brand focus-ring disabled:opacity-60"
              >
                {saving ? '保存中…' : '保存'}
              </button>
              <button type="button" onClick={onAddItem} className="rounded-lg bg-brand-sky/10 px-3 py-1.5 text-xs focus-ring">追加</button>
              <button type="button" onClick={onShuffleItems} className="rounded-lg bg-brand-sky/10 px-3 py-1.5 text-xs focus-ring">表示順シャッフル</button>
            </div>
          </div>
          <div className="space-y-2">
            {items.map((it, i) => (
              <div key={i} className="rounded-xl border border-brand-sky/20 bg-white p-3 grid gap-2">
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-slate-500">ID</span>
                  <span className="text-slate-700 select-none">{i + 1}</span>
                </div>
                <div className="grid gap-1">
                  <span className="text-xs text-slate-500">選択肢の内容</span>
                  <input
                    value={it.label}
                    onChange={(e)=>setItems(v=>v.map((x,idx)=>idx===i?{...x,label:e.target.value}:x))}
                    placeholder="選択肢の内容"
                    className="rounded-lg bg-brand-sky/10 px-2 py-1 text-xs focus-ring"
                  />
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-slate-500">表示順</span>
                  <span className="text-slate-700 select-none">{(() => { const p = displayOrder.indexOf(it.key); return p >= 0 ? p + 1 : 0; })()}</span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-slate-500">正解順</span>
                  <span className="text-slate-700 select-none">{i + 1}</span>
                </div>
                <div className="text-right">
                  <button type="button" onClick={()=>onDelItem(i)} className="rounded-lg bg-brand-sky/10 px-2 py-1 text-xs">削除</button>
                </div>
              </div>
            ))}
          </div>
          <div className="grid gap-1">
            <span className="text-xs text-slate-500">選択肢表示のプレビュー（生徒側と同UI）</span>
            {(() => {
              const keys = items.map((it)=>it.key);
              const base = (displayOrder || []).filter((k)=> keys.includes(k));
              const missing = keys.filter((k)=> !base.includes(k));
              const orderedKeys = [...base, ...missing];
              if (orderedKeys.length === 0) {
                return (
                  <div className="rounded-xl border border-brand-sky/20 bg-white p-3 text-xs text-slate-500">// 未設定: 表示順が設定されるとここに並びます</div>
                );
              }
              return (
                <div className="space-y-2">
                  {orderedKeys.map((k, i) => {
                    const it = items.find((x)=>x.key===k);
                    const label = (it?.label ?? '').toString().trim() || `項目${i+1}`;
                    return (
                      <div key={k} className="w-full text-left flex items-center gap-2 text-sm rounded-xl border px-3 py-2 border-brand-sky/20 bg-white text-slate-600">
                        <span className="inline-flex h-6 w-6 items-center justify-center rounded bg-brand-sky/10 text-slate-700">{i+1}</span>
                        <span className="flex-1 whitespace-pre-wrap break-words">{label}</span>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </div>
          <div className="grid gap-1">
            <span className="text-xs text-slate-500">正解順プレビュー</span>
            {(() => {
              const rows = correctOrder.map((k) => {
                const it = items.find((x) => x.key === k);
                const label = (it?.label ?? '').toString().trim();
                return label || '（未設定）';
              });
              return (
                <div className="rounded-xl border border-brand-sky/25 bg-[color:var(--color-code-bg)] p-3 text-xs font-mono text-brand-sky/90">
                  {rows.length === 0 ? (
                    <div>// 未設定: 並べ替え項目を追加するとここに順序が表示されます</div>
                  ) : (
                    <div className="flex flex-wrap items-center gap-1">
                      {rows.map((label, idx) => (
                        <span key={idx} className="whitespace-pre">{label}</span>
                      ))}
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
          </section>
        </>
      )}

      {(mode === 'fill_blank' || mode === 'semantic_fill') && null}

      {/* 一番下: 問題の解説（問題文と同UI） */}
      <div className="flex items-center justify-between mt-4">
        <div className="flex items-center gap-2 text-xs">
          <span className="text-slate-500">解説</span>
          {dirtyExplanation && <span className="text-red-600">未保存の変更があります</span>}
        </div>
        <button
          type="button"
          onClick={onSave}
          disabled={saving}
          className="rounded-lg bg-brand-yellow px-3 py-1.5 text-xs text-brand focus-ring disabled:opacity-60"
        >
          {saving ? '保存中…' : '保存'}
        </button>
      </div>
      <section className="rounded-2xl border border-brand-sky/20 bg-white p-3">
        <MarkdownEditor
          value={explanationMd}
          onChange={setExplanationMd}
          placeholder="学習者向けの解説をMarkdownで入力します"
          rows={8}
        />
      </section>

      <div className="pt-2">
        <button type="button" onClick={onSave} disabled={saving} className="rounded-xl bg-brand-yellow px-4 py-2 text-brand focus-ring disabled:opacity-60">
          {saving ? '保存中…' : '保存'}
        </button>
      </div>
    </div>
  );
}
