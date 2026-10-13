import { useMemo } from 'react';

// Adds WordPress-compatible ad placement hooks into article HTML so ad
// scripts (Ad Inserter, AdSense, Ad Manager, Audmetrix) can locate
// in-content positions and insert ad blocks reliably.
// Hooks are empty divs — zero visual impact unless an ad is injected.
function withAdPlacements(html) {
  if (!html) return '';
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  const body = doc.body;

  // Before-content hook
  const before = doc.createElement('div');
  before.className = 'ad-slot ad-before-content';
  before.setAttribute('data-ad', 'before-content');
  before.setAttribute('data-sticky', 'true');
  body.insertBefore(before, body.firstChild);

  // After-paragraph hooks — one per top-level <p> so the ad script
  // can target any paragraph position it's configured for
  const paragraphs = body.querySelectorAll(':scope > p');
  paragraphs.forEach((p, i) => {
    const hook = doc.createElement('div');
    hook.className = 'ad-slot ad-after-paragraph';
    hook.setAttribute('data-ad', 'after-paragraph');
    hook.setAttribute('data-paragraph', String(i + 1));
    hook.setAttribute('data-sticky', 'true');
    p.after(hook);
  });

  // After-content hook
  const after = doc.createElement('div');
  after.className = 'ad-slot ad-after-content';
  after.setAttribute('data-ad', 'after-content');
  after.setAttribute('data-sticky', 'true');
  body.appendChild(after);

  return body.innerHTML;
}

export default function ArticleContent({ content, className }) {
  const html = useMemo(() => withAdPlacements(content), [content]);
  return (
    <div
      className={`entry-content ${className || ''}`}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}