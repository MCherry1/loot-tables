import React, { useMemo } from 'react';
import ddesignMd from '../../../DDESIGN.md?raw';
import { markdownToHtml } from './markdownToHtml';

const DDesign: React.FC = () => {
  const html = useMemo(() => markdownToHtml(ddesignMd), []);

  return (
    <article
      className="about-page"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
};

export default DDesign;
