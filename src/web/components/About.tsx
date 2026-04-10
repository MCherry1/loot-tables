import React, { useMemo } from 'react';
import aboutMd from '../../../ABOUT.md?raw';

/** Minimal markdown → HTML for trusted content (headings, bold, italic, code, tables, paragraphs). */
function markdownToHtml(md: string): string {
  const lines = md.split('\n');
  const out: string[] = [];
  let inTable = false;
  let inThead = false;
  let paragraphLines: string[] = [];

  const flushParagraph = () => {
    if (paragraphLines.length > 0) {
      out.push(`<p>${inlineFormat(paragraphLines.join(' '))}</p>`);
      paragraphLines = [];
    }
  };

  function inlineFormat(text: string): string {
    return text
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/`(.+?)`/g, '<code>$1</code>');
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Headings
    if (line.startsWith('# ')) {
      flushParagraph();
      out.push(`<h1>${inlineFormat(line.slice(2))}</h1>`);
      continue;
    }
    if (line.startsWith('## ')) {
      flushParagraph();
      out.push(`<h2>${inlineFormat(line.slice(3))}</h2>`);
      continue;
    }

    // Table rows
    if (line.startsWith('|')) {
      flushParagraph();
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

    // Blank line ends a paragraph
    if (line.trim() === '') {
      flushParagraph();
      continue;
    }

    // Accumulate paragraph text
    paragraphLines.push(line);
  }

  flushParagraph();
  if (inTable) {
    if (!inThead) out.push('</tbody>');
    out.push('</table>');
  }

  return out.join('\n');
}

const About: React.FC = () => {
  const html = useMemo(() => markdownToHtml(aboutMd), []);

  return (
    <article
      className="about-page"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
};

export default About;
