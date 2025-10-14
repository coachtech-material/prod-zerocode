"use client";
import { useEffect, useMemo, useState } from 'react';
import { mdToSafeHtml } from '@/lib/markdown';
import CodeEditor from '@/components/ui/CodeEditor';

type Mode = 'fill_blank' | 'semantic_fill' | 'fix' | 'reorder';

function tryParseSpec(specYaml?: string | null): any {
  if (!specYaml) return {};
  try { return JSON.parse(specYaml); } catch {}
  return {}; // YAML未対応の簡易版（必要ならyamlパーサを導入）
}

export default function StudentTestPreview({ mode, initialSpec, onScored }: { mode: Mode; initialSpec?: string | null; onScored?: (ok: boolean) => void }) {
  const [specYaml, setSpecYaml] = useState<string>(initialSpec || '');
  // Listen for live updates from editor
  useEffect(() => {
    const handler = (e: any) => {
      const y = e?.detail?.specYaml as string | undefined;
      if (typeof y === 'string') setSpecYaml(y);
    };
    window.addEventListener('app:test:spec-updated', handler as any);
    return () => window.removeEventListener('app:test:spec-updated', handler as any);
  }, []);
  const spec = useMemo(() => tryParseSpec(specYaml || initialSpec), [specYaml, initialSpec]);
  const content = (spec?.content_md || spec?.problem_md || '') as string;
  const explanation = (spec?.explanation_md || '') as string;
  const files = ((spec?.files || []) as Array<{ name: string; code: string; display?: boolean }>).filter((f) => f.display);
  const [activeIdx, setActiveIdx] = useState(0);
  const [html, setHtml] = useState('');
  const [selectedBlanks, setSelectedBlanks] = useState<Record<string, string>>({});
  const [selectedFixIdx, setSelectedFixIdx] = useState<number | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [blankResults, setBlankResults] = useState<Record<string, boolean>>({});
  const [fixResult, setFixResult] = useState<null | { correct: boolean; correctIdx: number | null }>(null);
  const [expHtml, setExpHtml] = useState('');
  const [orderSelection, setOrderSelection] = useState<string[]>([]);

  const notifyScore = (ok: boolean) => {
    try { onScored?.(ok); } catch {}
    try { if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('app:test:scored', { detail: { ok } })); } catch {}
  };

  const ResultCard = ({ ok }: { ok: boolean }) => (
    <div
      className={[
        'mt-3 rounded-2xl border p-4 shadow-lg',
        ok
          ? 'border-emerald-400/40 bg-gradient-to-br from-emerald-600/30 via-emerald-500/20 to-emerald-400/20'
          : 'border-rose-400/40 bg-gradient-to-br from-rose-600/30 via-rose-500/20 to-rose-400/20'
      ].join(' ')}
    >
      <div className="flex items-center gap-3">
        <div
          className={[
            'flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full text-2xl',
            ok ? 'bg-emerald-500/30 text-emerald-700' : 'bg-rose-500/30 text-rose-700'
          ].join(' ')}
          aria-hidden
        >
          {ok ? '🎉' : '💡'}
        </div>
        <div className="min-w-0">
          <div className={['font-bold leading-tight', ok ? 'text-emerald-700' : 'text-rose-600', 'text-xl sm:text-2xl'].join(' ')}>
            {ok ? '正解！' : '不正解'}
          </div>
          <div className="mt-1 text-sm text-slate-700/90">
            {ok ? 'よくできました！' : 'もう一度チャレンジしましょう'}
          </div>
        </div>
      </div>
    </div>
  );

  // Local reset is handled by parent via remount in runner. Keep helper if needed internally.
  const resetAttempt = () => {
    setSubmitted(false);
    setBlankResults({});
    setFixResult(null);
    setSelectedFixIdx(null);
    setSelectedBlanks({});
    setOrderSelection([]);
  };

  useEffect(() => {
    (async () => {
      try { setHtml(await mdToSafeHtml(content || '')); } catch { setHtml(''); }
    })();
  }, [content]);
  useEffect(() => {
    (async () => {
      try { setExpHtml(await mdToSafeHtml(explanation || '')); } catch { setExpHtml(''); }
    })();
  }, [explanation]);

  // Mode-specific spec
  const blanks = (spec?.blanks || []) as Array<any>;
  const template = (spec?.explanation_template || '') as string;
  const choices = (spec?.choices || []) as Array<any>;
  const items = (spec?.items || []) as Array<any>;
  const correctOrder = (spec?.correct_order || []) as Array<string>;
  const displayOrder = (spec?.display_order || []) as Array<string>;

  // Choices are rendered as plain text (per previous spec)

  return (
    <div className="flex min-h-[420px] gap-3">
      {/* 左: 問題文 */}
      <section className="flex-[1] min-w-0 rounded-xl border border-brand-sky/20 bg-white p-3 overflow-auto">
        <div className="text-xs text-slate-500 mb-2">問題文</div>
        <div className="prose max-w-none" dangerouslySetInnerHTML={{ __html: html }} />
      </section>

      {/* 中央: リソース */}
      <section className="flex-[2] min-w-0 rounded-xl border border-brand-sky/20 bg-white p-3">
        <div className="text-xs text-slate-500 mb-2">リソース</div>
        {files.length === 0 ? (
          <div className="text-sm text-slate-500">表示設定されたファイルがありません。</div>
        ) : (
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-1 overflow-x-auto">
              {files.map((f, idx) => (
                <button
                  type="button"
                  key={`${f.name}_${idx}`}
                  className={[ 'rounded-md px-3 py-1.5 text-xs border', idx === activeIdx ? 'bg-brand-sky/20 border-brand-sky/30 text-slate-800' : 'bg-white border-brand-sky/20 text-slate-600 hover:bg-brand-sky/10' ].join(' ')}
                  onClick={() => setActiveIdx(idx)}
                >
                  {f.name || `file_${idx+1}`}
                </button>
              ))}
            </div>
            <div className="rounded-xl border border-brand-sky/20 bg-white p-2">
              <CodeEditor path={files[activeIdx]?.name} value={files[activeIdx]?.code || ''} onChange={()=>{}} readOnly showLineNumbers autoHeight />
            </div>
            {mode === 'semantic_fill' && (
              <CodeReading template={template} />
            )}
          </div>
        )}
      </section>

      {/* 右: 回答欄 */}
      <section className="flex-[1] min-w-0 rounded-xl border border-brand-sky/20 bg-white p-3 overflow-auto">
        <div className="text-xs text-slate-500 mb-2">回答欄（プレビュー）</div>

        {mode === 'fill_blank' && (
          <div className="space-y-3">
            {blanks.length === 0 && <div className="text-sm text-slate-500">BLANKが未設定です。</div>}
            {blanks.map((b, i) => (
              <div key={i} className="grid gap-2">
                <div className="text-sm text-slate-700">{b.prompt || b.key}</div>
                {b.choices?.length ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {b.choices.map((c: string, ci: number) => {
                      const sel = selectedBlanks[b.key] === c;
                      return (
                        <button
                          type="button"
                          key={ci}
                          onClick={() => setSelectedBlanks((v) => ({ ...v, [b.key]: c }))}
                          className={[
                            'text-left rounded-xl border px-3 py-2 text-sm',
                            sel
                              ? 'border-violet-500/40 bg-violet-500/20 text-violet-100'
                              : 'border-brand-sky/20 bg-white text-slate-600 hover:bg-brand-sky/10'
                          ].join(' ')}
                        >
                          {c}
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <input
                    className="rounded-lg bg-brand-sky/10 px-2 py-1 text-sm"
                    placeholder="回答を入力"
                    value={selectedBlanks[b.key] || ''}
                    onChange={(e)=> setSelectedBlanks((v)=> ({ ...v, [b.key]: e.target.value }))}
                  />
                )}
                {submitted && (
                  <div className="text-xs">
                    {blankResults[b.key] ? (
                      <span className="text-emerald-300">正解</span>
                    ) : (
                      <span className="text-red-600">不正解</span>
                    )}
                    {!blankResults[b.key] && (b.correct != null && String(b.correct).length > 0) && (
                      <span className="ml-2 text-slate-600">正解: <code className="text-slate-800">{String(b.correct)}</code></span>
                    )}
                  </div>
                )}
              </div>
            ))}
            {!submitted && (
              <div className="pt-3 text-right">
                <button
                  type="button"
                  className="rounded-xl bg-brand-yellow px-4 py-2 text-brand focus-ring"
                  onClick={() => {
                    const res: Record<string, boolean> = {};
                    for (const b of blanks) {
                      const ans = (selectedBlanks[b.key] || '').trim();
                      const corr = String(b.correct ?? '').trim();
                      res[b.key] = !!corr && ans.length > 0 ? ans === corr : false;
                    }
                    setBlankResults(res);
                    if (choices.length) {
                      const correctIdx = choices.findIndex((x:any)=> !!x.is_correct);
                      const ok = typeof selectedFixIdx === 'number' && selectedFixIdx === correctIdx;
                      setFixResult({ correct: correctIdx >= 0 && !!ok, correctIdx: correctIdx >= 0 ? correctIdx : null });
                      notifyScore(!!ok && correctIdx >= 0 && Object.values(res).every(Boolean));
                    } else {
                      setFixResult(null);
                      const ok = Object.values(res).every(Boolean);
                      notifyScore(ok);
                    }
                    setSubmitted(true);
                  }}
                >採点</button>
              </div>
            )}
            {submitted && (
              <ResultCard ok={blanks.length > 0 && (blanks || []).every((b:any) => !!blankResults[b.key])} />
            )}
          </div>
        )}

        {mode === 'semantic_fill' && (
          <div className="space-y-3">
            {blanks.length === 0 && <div className="text-sm text-slate-500">BLANKが未設定です。</div>}
            {blanks.map((b, i) => (
              <div key={i} className="grid gap-2">
                <div className="text-sm text-slate-700">{b.key}</div>
                {b.choices?.length ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {b.choices.map((c: string, ci: number) => {
                      const sel = selectedBlanks[b.key] === c;
                      return (
                        <button
                          type="button"
                          key={ci}
                          onClick={() => setSelectedBlanks((v) => ({ ...v, [b.key]: c }))}
                          className={[
                            'text-left rounded-xl border px-3 py-2 text-sm',
                            sel
                              ? 'border-violet-500/40 bg-violet-500/20 text-violet-100'
                              : 'border-brand-sky/20 bg-white text-slate-600 hover:bg-brand-sky/10'
                          ].join(' ')}
                        >
                          {c}
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <input
                    className="rounded-lg bg-brand-sky/10 px-2 py-1 text-sm"
                    placeholder="回答を入力"
                    value={selectedBlanks[b.key] || ''}
                    onChange={(e)=> setSelectedBlanks((v)=> ({ ...v, [b.key]: e.target.value }))}
                  />
                )}
                {submitted && (
                  <div className="text-xs">
                    {blankResults[b.key] ? (
                      <span className="text-emerald-300">正解</span>
                    ) : (
                      <span className="text-red-600">不正解</span>
                    )}
                    {!blankResults[b.key] && (b.correct != null && String(b.correct).length > 0) && (
                      <span className="ml-2 text-slate-600">正解: <code className="text-slate-800">{String(b.correct)}</code></span>
                    )}
                  </div>
                )}
              </div>
            ))}
            {!submitted && (
              <div className="pt-3 text-right">
                <button
                  type="button"
                  className="rounded-xl bg-brand-yellow px-4 py-2 text-brand focus-ring"
                  onClick={() => {
                    const res: Record<string, boolean> = {};
                    for (const b of blanks) {
                      const ans = (selectedBlanks[b.key] || '').trim();
                      const corr = String(b.correct ?? '').trim();
                      res[b.key] = !!corr && ans.length > 0 ? ans === corr : false;
                    }
                    setBlankResults(res);
                    if (choices.length) {
                      const correctIdx = choices.findIndex((x:any)=> !!x.is_correct);
                      const ok = typeof selectedFixIdx === 'number' && selectedFixIdx === correctIdx;
                      setFixResult({ correct: correctIdx >= 0 && !!ok, correctIdx: correctIdx >= 0 ? correctIdx : null });
                      notifyScore(!!ok && correctIdx >= 0 && Object.values(res).every(Boolean));
                    } else {
                      setFixResult(null);
                      const ok = Object.values(res).every(Boolean);
                      notifyScore(ok);
                    }
                    setSubmitted(true);
                  }}
                >採点</button>
              </div>
            )}
            {submitted && (
              <ResultCard ok={blanks.length > 0 && (blanks || []).every((b:any) => !!blankResults[b.key])} />
            )}
          </div>
        )}

        {mode === 'fix' && (
          <div className="space-y-2">
            {choices.length === 0 && <div className="text-sm text-slate-500">選択肢が未設定です。</div>}
            <div className="grid grid-cols-1 gap-2">
              {choices.map((c, i) => {
                const sel = selectedFixIdx === i;
                return (
                  <button
                    type="button"
                    key={i}
                    onClick={() => setSelectedFixIdx(i)}
                    className={[
                      'text-left rounded-xl border px-3 py-2 text-sm',
                      sel ? 'border-violet-500/40 bg-violet-500/20 text-violet-100' : 'border-brand-sky/20 bg-white text-slate-600 hover:bg-brand-sky/10'
                    ].join(' ')}
                  >
                    <div className="flex flex-col items-start gap-1 text-left">
                      <span className="inline-flex h-6 w-6 items-center justify-center rounded bg-brand-sky/10 text-slate-800">
                        {Number(c.id) || i+1}
                      </span>
                      <div className="whitespace-pre-wrap break-words text-slate-800/90">
                        {c.body || `選択肢${i+1}`}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
            {!submitted && (
              <div className="pt-3 text-right">
                <button
                  type="button"
                  className="rounded-xl bg-brand-yellow px-4 py-2 text-brand focus-ring"
                  onClick={() => {
                    const res: Record<string, boolean> = {};
                    for (const b of blanks) {
                      const ans = (selectedBlanks[b.key] || '').trim();
                      const corr = String(b.correct ?? '').trim();
                      res[b.key] = !!corr && ans.length > 0 ? ans === corr : false;
                    }
                    setBlankResults(res);
                    if (choices.length) {
                      const correctIdx = choices.findIndex((x:any)=> !!x.is_correct);
                      const ok = typeof selectedFixIdx === 'number' && selectedFixIdx === correctIdx;
                      setFixResult({ correct: correctIdx >= 0 && !!ok, correctIdx: correctIdx >= 0 ? correctIdx : null });
                      notifyScore(!!ok && correctIdx >= 0 && Object.values(res).every(Boolean));
                    } else {
                      setFixResult(null);
                      const ok = Object.values(res).every(Boolean);
                      notifyScore(ok);
                    }
                    setSubmitted(true);
                  }}
                >採点</button>
              </div>
            )}
            {submitted && (
              <ResultCard ok={!!fixResult?.correct} />
            )}
          </div>
        )}

        {/* 採点ボタンは各モードセクション直下に配置 */}

        {/* 解説（reorder 以外は従来位置に表示） */}
        {submitted && mode !== 'reorder' && (
          <div className="mt-8">
            <div className="text-xs text-slate-500 mb-2">💡 解説</div>
            {expHtml ? (
              <div className="prose max-w-none" dangerouslySetInnerHTML={{ __html: expHtml }} />
            ) : (
              <div className="text-sm text-slate-500">解説は設定されていません。</div>
            )}
          </div>
        )}

        {mode === 'reorder' && (
          <div className="space-y-2">
            {items.length === 0 && <div className="text-sm text-slate-500">対象項目が未設定です。</div>}
            {(() => {
              const keys = items.map((it)=>it.key);
              const base = (displayOrder || []).filter((k)=> keys.includes(k));
              const missing = keys.filter((k)=> !base.includes(k));
              const orderedKeys = [...base, ...missing];
              return orderedKeys.map((k, i) => {
                const it = items.find((x)=>x.key===k)!;
              const selectedIdx = orderSelection.indexOf(it.key);
              const selected = selectedIdx >= 0;
              return (
                <button
                  type="button"
                  key={k}
                  onClick={() => setOrderSelection((prev) => prev.includes(it.key) ? prev.filter((k) => k !== it.key) : [...prev, it.key])}
                  className={[
                    'w-full text-left flex items-center gap-2 text-sm rounded-xl border px-3 py-2',
                    selected
                      ? 'border-violet-500/40 bg-violet-500/20 text-violet-100'
                      : 'border-brand-sky/20 bg-white text-slate-600 hover:bg-brand-sky/10'
                  ].join(' ')}
                >
                  <span className="inline-flex h-6 w-6 items-center justify-center rounded bg-brand-sky/10 text-slate-700">{i+1}</span>
                  <span className="flex-1">{it.label || it.key || `項目${i+1}`}</span>
                  {selected && (
                    <span className="ml-auto inline-flex h-6 min-w-6 items-center justify-center rounded bg-brand-sky/10 px-2 text-xs text-violet-100">
                      {selectedIdx + 1}
                    </span>
                  )}
                </button>
              );
              });
            })()}
            {/* コードプレビュー（正解順プレビュー風の表示、区切り記号なし） */}
            {(() => {
              const rows = (orderSelection || []).map((k) => {
                const it = items.find((x) => x.key === k);
                return (it?.label ?? '').toString().trim() || '（未設定）';
              });
              return (
                <div className="rounded-xl border border-brand-sky/25 bg-[color:var(--color-code-bg)] p-3 text-xs font-mono text-brand-sky/90">
                  {rows.length === 0 ? (
                    <div>// 選択順プレビュー: 選択肢をクリックするとここに順に表示されます</div>
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
            {/* 結果表示（コードプレビューと解説の間に配置） */}
            {submitted && (
              <>
                <ResultCard ok={orderSelection.length === correctOrder.length && orderSelection.every((k, i) => k === correctOrder[i])} />
                {/* 答え（正解順）: コードプレビューのみ */}
                <div className="mt-3 grid gap-2">
                  <div className="text-xs text-slate-500 mb-1">答え</div>
                  {(() => {
                    const rows = (correctOrder || []).map((k) => {
                      const it = items.find((x) => x.key === k);
                      return (it?.label ?? '').toString().trim() || '（未設定）';
                    });
                    return (
                      <div className="rounded-xl border border-brand-sky/25 bg-[color:var(--color-code-bg)] p-3 text-xs font-mono text-brand-sky/90">
                        {rows.length === 0 ? (
                          <div>// 正解順は設定されていません</div>
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
              </>
            )}
            {submitted && (
              <div className="mt-3">
                <div className="text-xs text-slate-500 mb-1">💡 解説</div>
                {expHtml ? (
                  <div className="prose max-w-none" dangerouslySetInnerHTML={{ __html: expHtml }} />
                ) : (
                  <div className="text-sm text-slate-500">解説は設定されていません。</div>
                )}
              </div>
            )}
            {!submitted && (
              <div className="pt-2 text-right">
                <button
                  type="button"
                  className="rounded-xl bg-brand-yellow px-4 py-2 text-brand focus-ring"
                  onClick={() => {
                    const res: Record<string, boolean> = {};
                    for (const b of blanks) {
                      const ans = (selectedBlanks[b.key] || '').trim();
                      const corr = String(b.correct ?? '').trim();
                      res[b.key] = !!corr && ans.length > 0 ? ans === corr : false;
                    }
                    setBlankResults(res);
                    if (choices.length) {
                      const correctIdx = choices.findIndex((x:any)=> !!x.is_correct);
                      const ok = typeof selectedFixIdx === 'number' && selectedFixIdx === correctIdx;
                      setFixResult({ correct: correctIdx >= 0 && !!ok, correctIdx: correctIdx >= 0 ? correctIdx : null });
                    } else {
                      setFixResult(null);
                    }
                    const ok = orderSelection.length === correctOrder.length && orderSelection.every((k, i) => k === correctOrder[i]);
                    notifyScore(ok);
                    setSubmitted(true);
                  }}
                >採点</button>
              </div>
            )}
            {/* 正解順テキスト表示は非表示に変更（答えセクションで提供） */}
          </div>
        )}
      </section>
    </div>
  );
}

function CodeReading({ template }: { template: string }) {
  const [html, setHtml] = useState('');
  useEffect(() => {
    (async () => {
      try { setHtml(await mdToSafeHtml(template || '')); } catch { setHtml(''); }
    })();
  }, [template]);
  return (
    <div className="mt-8">
      <div className="text-xs text-slate-500 mb-2">コードリーディング</div>
      {html ? (
        <div className="prose max-w-none" dangerouslySetInnerHTML={{ __html: html }} />
      ) : (
        <div className="text-sm text-slate-500">コードリーディングは設定されていません。</div>
      )}
    </div>
  );
}
