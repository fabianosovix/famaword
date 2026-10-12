// Scripts inserted via innerHTML do not execute — the browser parses the
// <script> tag as a DOM node but never runs it. This helper parses the HTML
// string and recreates each element (especially <script>) by appending real
// nodes to the live DOM, which the browser then executes.
// Injected elements are tagged so they can be removed and re-injected cleanly.

const MARKER = 'data-veloccms-script';

function injectHtml(container, html) {
  // Remove previously injected elements so settings changes don't duplicate
  container.querySelectorAll(`[${MARKER}]`).forEach((el) => el.remove());
  if (!html || !html.trim()) return;

  const template = document.createElement('template');
  template.innerHTML = html;

  template.content.childNodes.forEach((node) => {
    if (node.nodeType !== Node.ELEMENT_NODE) return;

    if (node.tagName === 'SCRIPT') {
      // Recreate the script element so the browser executes it
      const script = document.createElement('script');
      for (const attr of node.attributes) {
        script.setAttribute(attr.name, attr.value);
      }
      script.textContent = node.textContent;
      script.setAttribute(MARKER, '');
      container.appendChild(script);
    } else {
      const clone = node.cloneNode(true);
      clone.setAttribute(MARKER, '');
      container.appendChild(clone);
    }
  });
}

export function injectHeaderScripts(html) {
  injectHtml(document.head, html);
}

export function injectFooterScripts(html) {
  injectHtml(document.body, html);
}