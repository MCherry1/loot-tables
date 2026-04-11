import React, { useMemo } from 'react';
import howItWorksMd from '../../../HOW-IT-WORKS.md?raw';
import { markdownToHtml } from './markdownToHtml';

const HowItWorks: React.FC = () => {
  const html = useMemo(() => markdownToHtml(howItWorksMd), []);

  return (
    <article
      className="about-page"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
};

export default HowItWorks;
