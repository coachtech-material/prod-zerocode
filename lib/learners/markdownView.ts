import { mdToSafeHtml } from '@/lib/markdown';

function youtubeEmbed(url: string) {
  try {
    const u = new URL(url);
    let id = '';
    if (u.hostname.includes('youtube.com')) {
      id = u.searchParams.get('v') || '';
    } else if (u.hostname.includes('youtu.be')) {
      id = u.pathname.slice(1);
    }
    if (!id) return '';
    const src = `https://www.youtube.com/embed/${id}`;
    return `<div class="aspect-video"><iframe src="${src}" title="YouTube video" loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen class="w-full h-full"></iframe></div>`;
  } catch {
    return '';
  }
}

// Converts Markdown to sanitized HTML and expands @[youtube](url) placeholders to iframe embeds.
export async function renderMarkdownForView(md: string): Promise<string> {
  const blocks: string[] = [];
  const replaced = (md || '').replace(/@\[youtube\]\(([^)]+)\)/g, (_m, url) => {
    const idx = blocks.push(youtubeEmbed(String(url))) - 1;
    return `@@YOUTUBE_${idx}@@`;
  });
  // Convert to sanitized HTML (no iframes)
  let html = await mdToSafeHtml(replaced);
  // Restore embeds (trusted limited whitelist)
  html = html.replace(/@@YOUTUBE_(\d+)@@/g, (_m, n) => blocks[Number(n)] || '');
  // Tweak images to be lazy
  html = html.replace(/<img /g, '<img loading="lazy" ');
  return html;
}

