/** Minimal markdown → HTML for trusted content (headings, bold, italic, code, code blocks, tables, lists, paragraphs). */
export function markdownToHtml(md: string): string {
  const lines = md.split('\n');
  const out: string[] = [];
  let inTable = false;
  let inThead = false;
  let inCodeBlock = false;
  let codeLines: string[] = [];
  let inList = false;
  let paragraphLines: string[] = [];

  const flushParagraph = () => {
    if (paragraphLines.length > 0) {
      out.push(`<p>${inlineFormat(paragraphLines.join(' '))}</p>`);
      paragraphLines = [];
    }
  };

  const flushList = () => {
    if (inList) {
      out.push('</ul>');
      inList = false;
    }
  };

  function inlineFormat(text: string): string {
    return text
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/`(.+?)`/g, '<code>$1</code>');
  }

  function escapeHtml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Code block fences
    if (line.startsWith('```')) {
      if (inCodeBlock) {
        out.push(`<pre><code>${escapeHtml(codeLines.join('\n'))}</code></pre>`);
        codeLines = [];
        inCodeBlock = false;
      } else {
        flushParagraph();
        flushList();
        inCodeBlock = true;
      }
      continue;
    }
    if (inCodeBlock) {
      codeLines.push(line);
      continue;
    }

    // Headings
    if (line.startsWith('### ')) {
      flushParagraph();
      flushList();
      out.push(`<h3>${inlineFormat(line.slice(4))}</h3>`);
      continue;
    }
    if (line.startsWith('## ')) {
      flushParagraph();
      flushList();
      out.push(`<h2>${inlineFormat(line.slice(3))}</h2>`);
      continue;
    }
    if (line.startsWith('# ')) {
      flushParagraph();
      flushList();
      out.push(`<h1>${inlineFormat(line.slice(2))}</h1>`);
      continue;
    }

    // Table rows
    if (line.startsWith('|')) {
      flushParagraph();
      flushList();
      // Skip separator rows like |---|---|
      if (/^\|[\s-:|]+\|$/.test(line)) {
        if (inThead) {
          out.push('</thead><tbody>');
          inThead = false;
        }
        continue;
      }
      const cells = line.split('|').slice(1, -1).map((c) => c.trim());
      if (!inTable) {
        out.push('<table class="about-table">');
        out.push('<thead>');
        inTable = true;
        inThead = true;
        out.push('<tr>' + cells.map((c) => `<th>${inlineFormat(c)}</th>`).join('') + '</tr>');
      } else {
        out.push('<tr>' + cells.map((c) => `<td>${inlineFormat(c)}</td>`).join('') + '</tr>');
      }
      continue;
    }

    // End table if we hit a non-table line
    if (inTable) {
      if (!inThead) out.push('</tbody>');
      out.push('</table>');
      inTable = false;
      inThead = false;
    }

    // Bullet list items
    if (/^- /.test(line)) {
      flushParagraph();
      if (!inList) {
        out.push('<ul>');
        inList = true;
      }
      out.push(`<li>${inlineFormat(line.slice(2))}</li>`);
      continue;
    }

    // Non-list line ends a list
    if (inList && !/^  /.test(line)) {
      flushList();
    }

    // Blank line ends a paragraph
    if (line.trim() === '') {
      flushParagraph();
      continue;
    }

    // Accumulate paragraph text
    paragraphLines.push(line);
  }

  flushParagraph();
  flushList();
  if (inTable) {
    if (!inThead) out.push('</tbody>');
    out.push('</table>');
  }

  return out.join('\n');
}
