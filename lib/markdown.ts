// Lightweight markdown → HTML renderer for LLM output.
// Handles: headings, bold, italic, inline code, code blocks, lists, links.
export function renderMarkdown(text: string): string {
  // Extract code blocks before any other processing
  const codeBlocks: string[] = [];
  const withPlaceholders = text.replace(/```(\w*)\n?([\s\S]*?)```/g, (_, lang, code) => {
    const escaped = code
      .trimEnd()
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
    const cls = lang ? ` class="language-${escapeAttr(lang)}"` : '';
    codeBlocks.push(`<pre class="md-pre"><code${cls}>${escaped}</code></pre>`);
    return `\x00CB${codeBlocks.length - 1}\x00`;
  });

  const lines = withPlaceholders.split('\n');
  const out: string[] = [];
  let ulOpen = false;
  let olOpen = false;

  const closeList = () => {
    if (ulOpen) { out.push('</ul>'); ulOpen = false; }
    if (olOpen) { out.push('</ol>'); olOpen = false; }
  };

  for (const line of lines) {
    // Code block placeholder
    const cbMatch = line.trim().match(/^\x00CB(\d+)\x00$/);
    if (cbMatch) {
      closeList();
      out.push(codeBlocks[Number(cbMatch[1])]);
      continue;
    }

    // Headings
    const h = line.match(/^(#{1,3}) (.+)/);
    if (h) {
      closeList();
      const tag = `h${h[1].length}`;
      out.push(`<${tag} class="md-${tag}">${inline(h[2])}</${tag}>`);
      continue;
    }

    // Unordered list
    const ul = line.match(/^[ \t]*[-*] (.+)/);
    if (ul) {
      if (olOpen) { out.push('</ol>'); olOpen = false; }
      if (!ulOpen) { out.push('<ul class="md-ul">'); ulOpen = true; }
      out.push(`<li>${inline(ul[1])}</li>`);
      continue;
    }

    // Ordered list
    const ol = line.match(/^[ \t]*\d+\. (.+)/);
    if (ol) {
      if (ulOpen) { out.push('</ul>'); ulOpen = false; }
      if (!olOpen) { out.push('<ol class="md-ol">'); olOpen = true; }
      out.push(`<li>${inline(ol[1])}</li>`);
      continue;
    }

    // Horizontal rule
    if (/^[-*_]{3,}$/.test(line.trim())) {
      closeList();
      out.push('<hr class="md-hr" />');
      continue;
    }

    // Blank line
    if (line.trim() === '') {
      closeList();
      out.push('<div class="md-gap"></div>');
      continue;
    }

    // Regular paragraph
    closeList();
    out.push(`<p class="md-p">${inline(line)}</p>`);
  }

  closeList();
  return out.join('');
}

function inline(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/`([^`]+)`/g, '<code class="md-code">$1</code>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/__(.+?)__/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/_(.+?)_/g, '<em>$1</em>')
    .replace(
      /\[([^\]]+)\]\(([^)]+)\)/g,
      '<a href="$2" target="_blank" rel="noopener noreferrer" class="md-link">$1</a>'
    );
}

function escapeAttr(s: string): string {
  return s.replace(/['"<>&]/g, (c) => ({ '"': '&quot;', "'": '&#39;', '<': '&lt;', '>': '&gt;', '&': '&amp;' }[c] ?? c));
}
