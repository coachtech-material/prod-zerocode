// Lightweight, dependency-free Markdown to safe HTML renderer for basic formatting.
// It escapes all HTML first, then applies a limited set of markdown transforms.
function escapeHtml(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export async function mdToSafeHtml(md: string): Promise<string> {
  // Root-cause fix: use a real Markdown pipeline (remark/rehype) with dynamic imports
  try {
    const [
      { unified },
      remarkParseMod,
      remarkRehypeMod,
      rehypeSanitizeMod,
      rehypeStringifyMod,
      remarkGfmMod,
    ] = await Promise.all([
      import('unified'),
      import('remark-parse'),
      import('remark-rehype'),
      import('rehype-sanitize'),
      import('rehype-stringify'),
      import('remark-gfm'),
    ]);
    const remarkParse = (remarkParseMod as any).default || remarkParseMod;
    const remarkGfm = (remarkGfmMod as any).default || remarkGfmMod;
    const remarkRehype = (remarkRehypeMod as any).default || remarkRehypeMod;
    const rehypeSanitize = (rehypeSanitizeMod as any).default || rehypeSanitizeMod;
    const defaultSchema = (rehypeSanitizeMod as any).defaultSchema;
    const rehypeStringify = (rehypeStringifyMod as any).default || rehypeStringifyMod;

    const schema = defaultSchema ? { ...defaultSchema } : undefined;
    // Allow className on code/pre so we can style inline code safely
    if (schema) {
      (schema as any).attributes = { ...((schema as any).attributes || {}) };
      (schema as any).attributes.code = [
        ...(((schema as any).attributes.code) || []),
        ['className'],
      ];
      (schema as any).attributes.pre = [
        ...(((schema as any).attributes.pre) || []),
        ['className'],
      ];
      // Allow video/source tags and attributes for safe embeds
      (schema as any).tagNames = [
        ...new Set([
          ...(((schema as any).tagNames) || []),
          'video',
          'source',
          'table',
          'thead',
          'tbody',
          'tr',
          'th',
          'td',
          'input',
          'del',
        ])
      ];
      (schema as any).attributes.video = [
        ...(((schema as any).attributes.video) || []),
        ['controls'], ['playsinline'], ['preload'], ['className']
      ];
      (schema as any).attributes.source = [
        ...(((schema as any).attributes.source) || []),
        ['src'], ['type']
      ];
      // Tables
      (schema as any).attributes.table = [
        ...(((schema as any).attributes.table) || []),
        ['className']
      ];
      (schema as any).attributes.thead = [ ...(((schema as any).attributes.thead) || []), ['className'] ];
      (schema as any).attributes.tbody = [ ...(((schema as any).attributes.tbody) || []), ['className'] ];
      (schema as any).attributes.tr = [ ...(((schema as any).attributes.tr) || []), ['className'] ];
      (schema as any).attributes.th = [
        ...(((schema as any).attributes.th) || []),
        ['className'], ['align'], ['colspan'], ['rowspan']
      ];
      (schema as any).attributes.td = [
        ...(((schema as any).attributes.td) || []),
        ['className'], ['align'], ['colspan'], ['rowspan']
      ];
      (schema as any).attributes.input = [
        ...(((schema as any).attributes.input) || []),
        ['type'], ['disabled'], ['checked']
      ];
      (schema as any).attributes.ul = [
        ...(((schema as any).attributes.ul) || []),
        ['className']
      ];
      (schema as any).attributes.ol = [
        ...(((schema as any).attributes.ol) || []),
        ['className']
      ];
      (schema as any).attributes.li = [
        ...(((schema as any).attributes.li) || []),
        ['className']
      ];
    }

    // Add gray bg + orange text for inline code (not in pre)
    function rehypeInlineCodeClass() {
      return (tree: any) => {
        const walk = (node: any, parent: any) => {
          if (!node || typeof node !== 'object') return;
          if (node.type === 'element') {
            if (node.tagName === 'code' && (!parent || parent.tagName !== 'pre')) {
              const cls = (node.properties && node.properties.className) || [];
              node.properties = node.properties || {};
              node.properties.className = Array.from(new Set([
                ...cls,
                'font-mono',
                'bg-neutral-800',
                'text-orange-300',
                'border', 'border-brand-sky/20', 'px-1', 'py-0.5', 'rounded', 'text-[0.9em]'
              ]));
            }
          }
          const kids = (node.children || []) as any[];
          for (const k of kids) walk(k, node);
        };
        walk(tree, null);
      };
    }

    // Transform anchor links to mp4/webm into responsive <video> embeds
    function rehypeVideoLinks() {
      return (tree: any) => {
        const walk = (node: any, parent: any) => {
          if (!node || typeof node !== 'object') return;
          if (node.type === 'element' && node.tagName === 'a') {
            const href: string | undefined = node.properties?.href as any;
            if (typeof href === 'string' && /\.(mp4|webm)(?:$|[?#])/i.test(href)) {
              const type = href.toLowerCase().includes('.webm') ? 'video/webm' : 'video/mp4';
              // Replace this anchor node with <video><source/></video>
              node.tagName = 'video';
              node.properties = { className: ['w-full','rounded-lg'], controls: true, playsinline: true, preload: 'metadata' } as any;
              node.children = [{
                type: 'element',
                tagName: 'source',
                properties: { src: href, type },
                children: [],
              }];
            }
          }
          const kids = (node.children || []) as any[];
          for (const k of kids) walk(k, node);
        };
        walk(tree, null);
      };
    }

    // Highlight {{…}} placeholders (only {{ 問<数字> }}) outside code/pre blocks
    function rehypeMarkBlanks() {
      return (tree: any) => {
        const visit = (node: any, parent: any) => {
          if (!node || typeof node !== 'object') return;
          if (node.type === 'element') {
            if (node.tagName === 'code' || node.tagName === 'pre') return; // skip code contexts
            const children = node.children || [];
            const nextChildren: any[] = [];
            for (const ch of children) {
              if (ch.type === 'text' && typeof ch.value === 'string') {
                const parts = String(ch.value).split(/(\{\{\s*問\s*\d+\s*\}\})/gu);
                if (parts.length > 1) {
                  for (let i = 0; i < parts.length; i++) {
                    const seg = parts[i];
                    if (!seg) continue;
                    const m = seg.match(/^\{\{\s*問\s*(\d+)\s*\}\}$/u);
                    if (m) {
                      const key = `問${(m[1]||'').trim()}`;
                      nextChildren.push({
                        type: 'element',
                        tagName: 'span',
                        properties: {
                          className: [
                            'inline-block','align-baseline','mx-0.5','font-medium',
                            'bg-fuchsia-500/20','text-fuchsia-100','border','border-fuchsia-400/40','rounded','px-1','py-0.5','text-[0.9em]'
                          ],
                          title: `{{${key}}}`,
                        },
                        children: [{ type: 'text', value: `{{${key}}}` }],
                      });
                    } else {
                      nextChildren.push({ type: 'text', value: seg });
                    }
                  }
                } else {
                  nextChildren.push(ch);
                }
              } else {
                nextChildren.push(ch);
              }
            }
            node.children = nextChildren;
          }
          const kids = (node.children || []) as any[];
          for (const k of kids) visit(k, node);
        };
        visit(tree, null);
      };
    }

    // Add default classes to tables for readability
    function rehypeTableClass() {
      return (tree: any) => {
        const walk = (node: any) => {
          if (!node || typeof node !== 'object') return;
          if (node.type === 'element' && node.tagName === 'table') {
            const cls = (node.properties && node.properties.className) || [];
            node.properties = node.properties || {};
            node.properties.className = Array.from(new Set([
              ...cls,
              'w-full','border-collapse','my-2','table-auto'
            ]));
          }
          if (node.type === 'element' && (node.tagName === 'th' || node.tagName === 'td')) {
            const cls = (node.properties && node.properties.className) || [];
            node.properties = node.properties || {};
            node.properties.className = Array.from(new Set([
              ...cls,
              'border','border-brand-sky/20','px-2','py-1','align-top'
            ]));
          }
          const kids = (node.children || []) as any[];
          for (const k of kids) walk(k);
        };
        walk(tree);
      };
    }

    let processor = (unified as any)()
      .use(remarkParse);
    if (remarkGfm) processor = processor.use(remarkGfm);
    const file = await processor
      .use(remarkRehype, { allowDangerousHtml: false })
      .use(rehypeSanitize as any, schema)
      .use(rehypeInlineCodeClass)
      .use(rehypeTableClass)
      .use(rehypeMarkBlanks)
      .use(rehypeVideoLinks)
      .use(rehypeStringify)
      .process(md || '');
    return String(file);
  } catch {
    // Fallback to lightweight renderer if dynamic imports fail
  }

  let text = md ?? '';

  // Normalize newlines
  text = text.replace(/\r\n?/g, '\n');

  // Extract fenced code blocks first to avoid running other rules inside them
  const codeBlocks: string[] = [];
  const fenceRe = /```([A-Za-z0-9_+\-]*)[ \t]*\n([\s\S]*?)\n?```/g;
  text = text.replace(fenceRe, (_m, langRaw, code) => {
    const lang = String(langRaw || '').trim() || undefined;
    const highlighted = codeHighlightSync(code.trim(), lang);
    const idx = codeBlocks.push(highlighted) - 1;
    return `@@CODE_BLOCK_${idx}@@`;
  });

  // Extract inline code spans without lookbehind (Safari-safe)
  const codeSpans: string[] = [];
  // First handle double backticks: capture preceding char or start
  text = text.replace(/(^|[^`])``([^`\n]*?)``(?!`)/g, (_m, pre, inner) => {
    const idx = codeSpans.push(String(inner)) - 1;
    return pre + `@@CODE_SPAN_${idx}@@`;
  });
  // Then handle single backticks
  text = text.replace(/(^|[^`])`([^`\n]+?)`(?!`)/g, (_m, pre, inner) => {
    const idx = codeSpans.push(String(inner)) - 1;
    return pre + `@@CODE_SPAN_${idx}@@`;
  });

  // Extract {{ 問<数字> }} placeholders before escaping (skip code spans already extracted)
  const blanks: string[] = [];
  text = text.replace(/\{\{\s*問\s*(\d+)\s*\}\}/gu, (_m, num) => {
    const idx = blanks.push(String(num).trim()) - 1;
    return `@@BLANK_${idx}@@`;
  });

  // Escape all remaining HTML to avoid XSS; subsequent injects build safe tags
  text = escapeHtml(text);

  // Custom video embed syntax: [video](https://...mp4|webm)
  text = text.replace(/\[video\]\(\s*(https?:\/\/[^\s)]+\.(?:mp4|webm))\s*\)/gi, (_m, url) => {
    const safe = escapeHtml(url);
    const type = url.toLowerCase().endsWith('.webm') ? 'video/webm' : 'video/mp4';
    return `<video controls playsinline preload="metadata" class="w-full rounded-lg"><source src="${safe}" type="${type}" /></video>`;
  });

  // Video via markdown link label: [any](https://...mp4|webm)
  text = text.replace(/\[[^\]]*\]\(\s*(https?:\/\/[^\s)]+\.(?:mp4|webm))\s*\)/gi, (_m, url) => {
    const safe = escapeHtml(url);
    const type = url.toLowerCase().endsWith('.webm') ? 'video/webm' : 'video/mp4';
    return `<video controls playsinline preload="metadata" class="w-full rounded-lg"><source src="${safe}" type="${type}" /></video>`;
  });

  // Video autolink: <https://...mp4|webm>
  text = text.replace(/<\s*(https?:\/\/[^\s>]+\.(?:mp4|webm))\s*>/gi, (_m, url) => {
    const safe = escapeHtml(url);
    const type = url.toLowerCase().endsWith('.webm') ? 'video/webm' : 'video/mp4';
    return `<video controls playsinline preload="metadata" class="w-full rounded-lg"><source src="${safe}" type="${type}" /></video>`;
  });

  // Bare URL video on its own line
  text = text.replace(/^\s*(https?:\/\/[^\s]+\.(?:mp4|webm))\s*$/gmi, (_m, url) => {
    const safe = escapeHtml(url);
    const type = url.toLowerCase().endsWith('.webm') ? 'video/webm' : 'video/mp4';
    return `<video controls playsinline preload="metadata" class="w-full rounded-lg"><source src="${safe}" type="${type}" /></video>`;
  });

  // Images: allow optional title and spaces inside parentheses
  // Examples: ![alt](https://...)
  //           ![alt](https://... "title")
  text = text.replace(/!\[([^\]]*)\]\(\s*(https?:\/\/[^\s)]+?)(?:\s+"([^"]*)")?\s*\)/g, (_m, alt, url, title) => {
    const t = title ? ` title="${escapeHtml(title)}"` : '';
    return `<img alt="${escapeHtml(alt)}" src="${escapeHtml(url)}"${t} />`;
  });

  // Links: allow optional title
  text = text.replace(/\[([^\]]+)\]\(\s*(https?:\/\/[^\s)]+?)(?:\s+"([^"]*)")?\s*\)/g, (_m, label, url) => {
    return `<a href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(label)}</a>`;
  });

  // Headings # to ######
  for (let i = 6; i >= 1; i--) {
    const re = new RegExp(`^${'#'.repeat(i)}\\s+(.+)$`, 'gm');
    text = text.replace(re, (_m, content) => `<h${i}>${escapeHtml(String(content).trim())}</h${i}>`);
  }

  // Horizontal rules
  text = text.replace(/^\s*(?:-{3,}|\*{3,})\s*$/gm, '<hr />');

  // Blockquotes
  text = text.replace(/^>\s+(.+)$/gm, (_m, q) => `<blockquote>${escapeHtml(q)}</blockquote>`);

  // Bold and italic (basic, non-nested)
  text = text.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  text = text.replace(/\*([^*]+)\*/g, '<em>$1</em>');

  // Simple unordered lists: group consecutive lines starting with - or *
  text = text.replace(/(?:^(?:[-*])\s.+\n?)+/gm, (block) => {
    const items = block
      .trim()
      .split(/\n/)
      .map((line) => line.replace(/^(?:[-*])\s+/, ''))
      .map((c) => `<li>${escapeHtml(c)}</li>`) // items are escaped
      .join('');
    return `<ul>${items}</ul>`;
  });

  // Ordered lists: lines starting with number. or number)
  text = text.replace(/(?:^(?:\d+[\.)])\s.+\n?)+/gm, (block) => {
    const items = block
      .trim()
      .split(/\n/)
      .map((line) => line.replace(/^\d+[\.)]\s+/, ''))
      .map((c) => `<li>${escapeHtml(c)}</li>`)
      .join('');
    return `<ol>${items}</ol>`;
  });

  // Paragraphs: wrap remaining lines separated by blank lines
  // Do not wrap code block placeholders as paragraphs
  const parts = text.split(/\n{2,}/).map((seg) => seg.trim()).filter(Boolean);
  const withBreaks = (s: string) => s.replace(/\n/g, '<br />');
  text = parts
    .map((seg) => {
      if (/^@@CODE_BLOCK_\d+@@$/.test(seg)) return seg; // keep as-is
      return seg.startsWith('<') ? seg : `<p>${withBreaks(seg)}</p>`;
    })
    .join('\n');

  // Restore code blocks
  text = text.replace(/@@CODE_BLOCK_(\d+)@@/g, (_m, idx) => codeBlocks[Number(idx)] || '');

  // Restore inline code spans (escaped) with gray bg + orange text styling
  text = text.replace(/@@CODE_SPAN_(\d+)@@/g, (_m, idx) => {
    const body = escapeHtml(codeSpans[Number(idx)] || '');
    return `<code class="font-mono bg-neutral-800 text-orange-300 border border-brand-sky/20 px-1 py-0.5 rounded text-[0.9em]">${body}</code>`;
  });

  // Restore {{ 問<数字> }} placeholders as visible blank chips (bright purple)
  text = text.replace(/@@BLANK_(\d+)@@/g, (_m, idx) => {
    const num = escapeHtml(blanks[Number(idx)] || '');
    const label = `問${num}`;
    return `<span class="inline-block align-baseline mx-0.5 font-medium bg-fuchsia-500/20 text-fuchsia-100 border border-fuchsia-400/40 rounded px-1 py-0.5 text-[0.9em]" title="{{${label}}}">{{${label}}}</span>`;
  });

  // Final safety: convert any remaining inline backtick runs to <code> to avoid raw backticks in output
  // 1) double backticks first
  text = text.replace(/(^|[^`])``([^`\n]*?)``(?!`)/g, (_m, pre, inner) => {
    const body = escapeHtml(String(inner));
    return pre + `<code class="font-mono bg-neutral-800 text-orange-300 border border-brand-sky/20 px-1 py-0.5 rounded text-[0.9em]">${body}</code>`;
  });
  // 2) then single backticks
  text = text.replace(/(^|[^`])`([^`\n]+?)`(?!`)/g, (_m, pre, inner) => {
    const body = escapeHtml(String(inner));
    return pre + `<code class="font-mono bg-neutral-800 text-orange-300 border border-brand-sky/20 px-1 py-0.5 rounded text-[0.9em]">${body}</code>`;
  });

  return text;
}

// Minimal code highlighter using lowlight at runtime.
function renderHast(nodes: any[]): string {
  let html = '';
  for (const n of nodes || []) {
    if (!n) continue;
    if (n.type === 'text') {
      html += escapeHtml(String(n.value || ''));
    } else if (n.type === 'element') {
      const tag = n.tagName || 'span';
      const props = n.properties || {};
      const cls = Array.isArray(props.className) ? props.className.join(' ') : (props.className || '');
      const open = cls ? `<${tag} class="${escapeHtml(cls)}">` : `<${tag}>`;
      html += open + renderHast(n.children || []) + `</${tag}>`;
    }
  }
  return html;
}

function codeHighlightSync(code: string, lang?: string) {
  const cls = lang ? `language-${lang}` : '';
  return `<pre><code class="${cls}">${escapeHtml(code)}</code></pre>`;
}
