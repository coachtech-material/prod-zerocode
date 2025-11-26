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
  const [lastResultOk, setLastResultOk] = useState<boolean | null>(null);

  const notifyScore = (ok: boolean) => {
    try { onScored?.(ok); } catch {}
    try { if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('app:test:scored', { detail: { ok } })); } catch {}
  };
  const reportScore = (ok: boolean) => {
    setLastResultOk(ok);
    notifyScore(ok);
  };

  const ResultCard = ({ ok }: { ok: boolean }) => (
    <div
      className={[
        'mt-3 rounded-2xl border p-4 shadow-lg text-white',
        ok
          ? 'border-emerald-200/60 bg-gradient-to-br from-emerald-500/80 via-emerald-500/60 to-emerald-400/50'
          : 'border-rose-200/60 bg-gradient-to-br from-rose-500/80 via-rose-500/60 to-rose-400/50'
      ].join(' ')}
    >
      <div className="flex items-center gap-3">
        <div
          className={[
            'flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full text-2xl text-white',
            ok ? 'bg-emerald-400/60' : 'bg-rose-400/60'
          ].join(' ')}
          aria-hidden
        >
          {ok ? '🎉' : '💡'}
        </div>
        <div className="min-w-0">
          <div className="text-xl font-bold leading-tight sm:text-2xl">
            {ok ? '正解！' : '不正解'}
          </div>
          <div className="mt-1 text-sm text-white">
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
    setLastResultOk(null);
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
  const ExplanationBlock = () => (
    <div className="mt-3 rounded-xl border border-white/15 bg-white/5 p-3 text-white">
      <div className="mb-2 text-xs font-semibold text-white">💡 解説</div>
      {expHtml ? (
        <div
          className="prose max-w-none"
          style={{
            '--tw-prose-headings': '#f8fafc',
            '--tw-prose-links': '#93c5fd',
            '--tw-prose-bold': '#f8fafc',
          } as React.CSSProperties}
          dangerouslySetInnerHTML={{ __html: expHtml }}
        />
      ) : (
        <div className="text-sm text-white">解説は設定されていません。</div>
      )}
    </div>
  );

  // Choices are rendered as plain text (per previous spec)

  return (
    <div className="grid min-h-[420px] gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,0.9fr)]">
      <div className="space-y-4">
        <section className="min-w-0 rounded-2xl border border-white/10 bg-[color:var(--surface-1)]/80 p-5 text-[color:var(--text)] shadow-[0_18px_40px_rgba(0,0,0,0.35)]">
          <div className="flex items-center justify-between text-xs uppercase tracking-wide text-[color:var(--muted)]">
            <span>問題文</span>
            <span className="rounded-full bg-white/10 px-3 py-0.5 text-[11px] font-semibold text-[color:var(--text)]">
              {modeLabel(mode)}
            </span>
          </div>
          <div
            className="prose mt-4 max-w-none text-[color:var(--text)]"
            style={{
              '--tw-prose-headings': 'var(--text)',
              '--tw-prose-links': '#58A6FF',
              '--tw-prose-bold': 'var(--text)',
            } as React.CSSProperties}
            dangerouslySetInnerHTML={{ __html: html }}
          />
        </section>

        <section className="min-w-0 rounded-2xl border border-white/10 bg-white/10 p-4 text-[color:var(--text)] shadow-[0_18px_40px_rgba(0,0,0,0.25)]">
          <div className="text-xs text-[color:var(--muted)] mb-2">参照リソース</div>
          {files.length === 0 ? (
            <div className="text-sm text-[color:var(--muted)]">表示設定されたファイルがありません。</div>
          ) : (
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-1 overflow-x-auto pb-1">
                {files.map((f, idx) => (
                  <button
                    type="button"
                    key={`${f.name}_${idx}`}
                    className={[
                      'rounded-xl border px-3 py-1.5 text-xs transition',
                      idx === activeIdx
                        ? 'border-brand text-brand bg-brand/10'
                        : 'border-white/15 text-[color:var(--muted)] hover:border-brand/40 hover:text-brand',
                    ].join(' ')}
                    onClick={() => setActiveIdx(idx)}
                  >
                    {f.name || `file_${idx + 1}`}
                  </button>
                ))}
              </div>
              <div className="rounded-2xl border border-white/15 bg-[color:var(--surface-1)]/70 p-2">
                <CodeEditor
                  path={files[activeIdx]?.name}
                  value={files[activeIdx]?.code || ''}
                  onChange={() => {}}
                  readOnly
                  showLineNumbers
                  autoHeight
                />
              </div>
              {mode === 'semantic_fill' && <CodeReading template={template} />}
            </div>
          )}
        </section>

      </div>

      <section className="min-w-0 rounded-2xl border border-white/10 bg-white p-4 text-slate-900 shadow-[0_18px_40px_rgba(0,0,0,0.25)]">
        <div className="mb-2 text-xs font-semibold text-slate-800">回答欄（プレビュー）</div>

        {mode === 'fill_blank' && (
          <div className="space-y-3">
            {blanks.length === 0 && <div className="text-sm text-slate-800">BLANKが未設定です。</div>}
            {blanks.map((b, i) => (
              <div key={i} className="grid gap-2 rounded-xl border border-slate-200/60 bg-slate-50 p-3">
                <div className="text-sm font-semibold text-slate-800">{b.prompt || b.key}</div>
                {b.choices?.length ? (
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {b.choices.map((c: string, ci: number) => {
                      const sel = selectedBlanks[b.key] === c;
                      return (
                        <button
                          type="button"
                          key={ci}
                          onClick={() => setSelectedBlanks((v) => ({ ...v, [b.key]: c }))}
                          className={[
                            'text-left rounded-xl border px-3 py-2 text-sm transition',
                            sel
                              ? 'border-violet-500/40 bg-violet-500/15 text-violet-900'
                              : 'border-slate-200 bg-white text-slate-800 hover:border-brand hover:text-brand',
                          ].join(' ')}
                        >
                          {c}
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <input
                    className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
                    placeholder="回答を入力"
                    value={selectedBlanks[b.key] || ''}
                    onChange={(e) => setSelectedBlanks((v) => ({ ...v, [b.key]: e.target.value }))}
                  />
                )}
                {submitted && (
                  <div className="text-xs">
                    {blankResults[b.key] ? (
                      <span className="text-emerald-500">正解</span>
                    ) : (
                      <span className="text-rose-500">不正解</span>
                    )}
                    {!blankResults[b.key] && b.correct && (
                      <span className="ml-2 text-slate-800">
                        正解: <code className="text-slate-800">{String(b.correct)}</code>
                      </span>
                    )}
                  </div>
                )}
              </div>
            ))}
            <div className="pt-4 flex justify-end gap-2">
              {submitted && (
                <button
                  type="button"
                  className="rounded-xl border border-slate-300 px-4 py-2 text-sm text-slate-800 hover:border-brand hover:text-brand"
                  onClick={resetAttempt}
                >
                  再チャレンジ
                </button>
              )}
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
                  const blanksOk = Object.values(res).every(Boolean);
                  if (choices.length) {
                    const correctIdx = choices.findIndex((x: any) => !!x.is_correct);
                    const choiceOk = typeof selectedFixIdx === 'number' && selectedFixIdx === correctIdx;
                    setFixResult({
                      correct: correctIdx >= 0 && !!choiceOk,
                      correctIdx: correctIdx >= 0 ? correctIdx : null,
                    });
                    const overallOk = correctIdx >= 0 && !!choiceOk && blanksOk;
                    reportScore(overallOk);
                  } else {
                    setFixResult(null);
                    reportScore(blanksOk);
                  }
                  setSubmitted(true);
                }}
              >
                採点
              </button>
            </div>
            {submitted && (
              <>
                <ResultCard ok={blanks.length > 0 && (blanks || []).every((b: any) => !!blankResults[b.key])} />
                {lastResultOk === false && <ExplanationBlock />}
              </>
            )}
          </div>
        )}

        {mode === 'semantic_fill' && (
          <div className="space-y-3">
            {blanks.length === 0 && <div className="text-sm text-slate-800">BLANKが未設定です。</div>}
            {blanks.map((b, i) => (
              <div key={i} className="grid gap-2">
                <div className="text-sm text-slate-800">{b.key}</div>
                {b.choices?.length ? (
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {b.choices.map((c: string, ci: number) => {
                      const sel = selectedBlanks[b.key] === c;
                      return (
                        <button
                          type="button"
                          key={ci}
                          onClick={() => setSelectedBlanks((v) => ({ ...v, [b.key]: c }))}
                          className={[
                            'text-left rounded-2xl border px-4 py-3 text-sm shadow-sm transition',
                            sel
                              ? 'border-brand-yellow bg-brand-yellow/90 text-brand'
                              : 'border-white/15 bg-white/10 text-white hover:border-brand-yellow/60 hover:bg-brand-yellow/10',
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
                      <span className="text-emerald-500">正解</span>
                    ) : (
                      <span className="text-red-500">不正解</span>
                    )}
                    {!blankResults[b.key] && (b.correct != null && String(b.correct).length > 0) && (
                      <span className="ml-2 text-slate-800">正解: <code className="text-slate-800">{String(b.correct)}</code></span>
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
                    const blanksOk = Object.values(res).every(Boolean);
                    if (choices.length) {
                      const correctIdx = choices.findIndex((x:any)=> !!x.is_correct);
                      const choiceOk = typeof selectedFixIdx === 'number' && selectedFixIdx === correctIdx;
                      setFixResult({ correct: correctIdx >= 0 && !!choiceOk, correctIdx: correctIdx >= 0 ? correctIdx : null });
                      const overallOk = correctIdx >= 0 && !!choiceOk && blanksOk;
                      reportScore(overallOk);
                    } else {
                      setFixResult(null);
                      reportScore(blanksOk);
                    }
                    setSubmitted(true);
                  }}
                >採点</button>
              </div>
            )}
            {submitted && (
              <>
                <ResultCard ok={blanks.length > 0 && (blanks || []).every((b:any) => !!blankResults[b.key])} />
                {lastResultOk === false && <ExplanationBlock />}
              </>
            )}
          </div>
        )}

        {mode === 'fix' && (
          <div className="space-y-2">
            {choices.length === 0 && <div className="text-sm text-slate-800">選択肢が未設定です。</div>}
            <div className="grid grid-cols-1 gap-2">
              {choices.map((c, i) => {
                const sel = selectedFixIdx === i;
                return (
                  <button
                    type="button"
                    key={i}
                    onClick={() => setSelectedFixIdx(i)}
                    className={[
                      'text-left rounded-2xl border px-4 py-3 text-sm shadow-sm transition',
                      sel
                        ? 'border-brand-yellow bg-brand-yellow/90 text-brand'
                        : 'border-white/15 bg-white/10 text-white hover:border-brand-yellow/60 hover:bg-brand-yellow/10'
                    ].join(' ')}
                  >
                    <div className="flex flex-col items-start gap-1 text-left">
                      <span
                        className={[
                          'inline-flex h-6 w-6 items-center justify-center rounded text-xs font-semibold',
                          sel ? 'bg-white/40 text-brand' : 'bg-white/20 text-white',
                        ].join(' ')}
                      >
                        {Number(c.id) || i+1}
                      </span>
                      <div className="whitespace-pre-wrap break-words text-white">
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
                    const blanksOk = Object.values(res).every(Boolean);
                    if (choices.length) {
                      const correctIdx = choices.findIndex((x:any)=> !!x.is_correct);
                      const choiceOk = typeof selectedFixIdx === 'number' && selectedFixIdx === correctIdx;
                      setFixResult({ correct: correctIdx >= 0 && !!choiceOk, correctIdx: correctIdx >= 0 ? correctIdx : null });
                      const overallOk = correctIdx >= 0 && !!choiceOk && blanksOk;
                      reportScore(overallOk);
                    } else {
                      setFixResult(null);
                      reportScore(blanksOk);
                    }
                    setSubmitted(true);
                  }}
                >採点</button>
              </div>
            )}
            {submitted && (
              <>
                <ResultCard ok={!!fixResult?.correct} />
                {lastResultOk === false && <ExplanationBlock />}
              </>
            )}
          </div>
        )}

        {mode === 'reorder' && (
          <div className="space-y-2">
            {items.length === 0 && <div className="text-sm text-slate-800">対象項目が未設定です。</div>}
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
                  onClick={() =>
                    setOrderSelection((prev) =>
                      prev.includes(it.key) ? prev.filter((x) => x !== it.key) : [...prev, it.key]
                    )
                  }
                  className={[
                    'w-full text-left flex items-center gap-2 text-sm rounded-2xl border px-4 py-3 shadow-sm transition',
                    selected
                      ? 'border-brand-yellow bg-brand-yellow/90 text-brand'
                      : 'border-white/15 bg-white/10 text-white hover:border-brand-yellow/60 hover:bg-brand-yellow/10',
                  ].join(' ')}
                >
                  <span
                    className={[
                      'inline-flex h-6 w-6 items-center justify-center rounded text-xs font-semibold',
                      selected ? 'bg-white/40 text-brand' : 'bg-white/15 text-white',
                    ].join(' ')}
                  >
                    {i + 1}
                  </span>
                  <span className="flex-1 text-white">{it.label || it.key || `項目${i + 1}`}</span>
                  {selected && (
                    <span className="ml-auto inline-flex h-6 min-w-6 items-center justify-center rounded bg-white/25 px-2 text-xs font-semibold text-brand">
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
                {lastResultOk === false && <ExplanationBlock />}
                {/* 答え（正解順）: コードプレビューのみ */}
                <div className="mt-3 grid gap-2">
                  <div className="text-xs text-slate-800 mb-1">答え</div>
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
                    reportScore(ok);
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
      <div className="text-xs text-slate-800 mb-2">コードリーディング</div>
      {html ? (
        <div className="prose max-w-none" dangerouslySetInnerHTML={{ __html: html }} />
      ) : (
        <div className="text-sm text-slate-800">コードリーディングは設定されていません。</div>
      )}
    </div>
  );
}

function modeLabel(mode: Mode) {
  switch (mode) {
    case 'fill_blank':
      return '穴埋め';
    case 'semantic_fill':
      return '言語化穴埋め';
    case 'fix':
      return '修正';
    case 'reorder':
      return '並べ替え';
    default:
      return 'プレビュー';
  }
}
