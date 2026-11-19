import { createElement as h } from 'react';

/**
 * Japanese-inspired domain icons for RikiPath Web.
 * Uniform 24x24 viewBox, rounded caps/joins, 1.85 strokeWidth, currentColor only.
 * Written without JSX so pure-Node contract tests can import appNav.js / logic.js.
 */

function makeSvg(children, strokeWidth = '1.85') {
  return function SakuraGlyph({ className = 'h-4 w-4', ...rest }) {
    return h(
      'svg',
      {
        viewBox: '0 0 24 24',
        fill: 'none',
        stroke: 'currentColor',
        strokeWidth,
        strokeLinecap: 'round',
        strokeLinejoin: 'round',
        'aria-hidden': 'true',
        className,
        ...rest,
      },
      ...children,
    );
  };
}

export const KanjiBrushIcon = makeSvg([
  h('rect', { key: 'box', x: '3.5', y: '3.5', width: '17', height: '17', rx: '3.5', strokeOpacity: '0.32', strokeDasharray: '2.5 2.5' }),
  h('path', { key: 'p1', d: 'M7 8.2h10' }),
  h('path', { key: 'p2', d: 'M12 6.2v3.6' }),
  h('path', { key: 'p3', d: 'M7.8 12.2h8.4' }),
  h('path', { key: 'p4', d: 'M12.2 12.2c0 3-1.8 5.2-5 6.4' }),
  h('path', { key: 'p5', d: 'M10.4 14.5c1.8 1.9 3.9 3.3 6.6 4.1' }),
]);

export const KanaHiraganaIcon = makeSvg([
  h('path', { key: 'p1', d: 'M6 7.5h11.5' }),
  h('path', { key: 'p2', d: 'M11.3 4.5c-.4 5.2-.2 10 .8 14.5' }),
  h('path', { key: 'p3', d: 'M15.8 10.6c-.8 4.6-4.4 8.2-7.8 8.2-2 0-3-1.3-2.6-3.1.6-2.7 4-4.7 8.1-4.7 3.2 0 5.3 1.7 5.3 4.1 0 2.3-1.6 3.9-4.1 4.4' }),
], '1.9');

export const JlptRoadmapIcon = makeSvg([
  h('path', { key: 'p1', d: 'M4 6.2q8-2.2 16 0' }),
  h('path', { key: 'p2', d: 'M5.5 9.6h13' }),
  h('path', { key: 'p3', d: 'M8.5 6.2v6.6' }),
  h('path', { key: 'p4', d: 'M15.5 6.2v4.6' }),
  h('path', { key: 'p5', d: 'M4.5 19.5c3.5-3.4 6.5-1.2 9.5-3.6 2-1.6 3.5-2.6 5.5-2.8' }),
  h('circle', { key: 'c1', cx: '19.5', cy: '13.1', r: '1.4', fill: 'currentColor', stroke: 'none' }),
]);

export const GroupClassIcon = makeSvg([
  h('circle', { key: 'c1', cx: '9', cy: '8.5', r: '2.7' }),
  h('circle', { key: 'c2', cx: '16.2', cy: '9.5', r: '2.2' }),
  h('path', { key: 'p1', d: 'M3.8 18.8c.5-2.9 2.7-4.6 5.2-4.6s4.7 1.7 5.2 4.6' }),
  h('path', { key: 'p2', d: 'M14.7 14.8c2-.1 4.1 1.3 4.6 4' }),
  h('path', { key: 'p3', d: 'M19.8 4.2v3.6M18 6h3.6' }),
]);

export const SrsLoopIcon = makeSvg([
  h('path', { key: 'p1', d: 'M17.5 7.5A6.8 6.8 0 0 0 5.6 9.8' }),
  h('path', { key: 'p2', d: 'M15.6 5l2.4 2.5-2.9 1.6' }),
  h('path', { key: 'p3', d: 'M6.5 16.5A6.8 6.8 0 0 0 18.4 14.2' }),
  h('path', { key: 'p4', d: 'M8.4 19l-2.4-2.5 2.9-1.6' }),
  h('circle', { key: 'c1', cx: '12', cy: '12', r: '1.6', fill: 'currentColor', stroke: 'none' }),
]);
