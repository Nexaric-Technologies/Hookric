// Tiny, dependency-free icon set. Each icon is a hand-tuned SVG path
// drawn in a Phosphor-style stroke (~1.6 weight, rounded caps). All
// icons inherit `currentColor`, accept a className and size.

import React from 'react';

const make = (paths, viewBox = '0 0 24 24') =>
  function Icon({ className = '', size = 16, strokeWidth = 1.6, ...rest }) {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox={viewBox}
        width={size}
        height={size}
        fill="none"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className}
        aria-hidden="true"
        {...rest}
      >
        {paths.map((d, i) =>
          Array.isArray(d) ? (
            <path key={i} {...d} />
          ) : (
            <path key={i} d={d} />
          )
        )}
      </svg>
    );
};

export const IconWebhook = make([
  'M8.5 14.5A2.5 2.5 0 0 1 11 12a2.5 2.5 0 0 1 2.5 2.5',
  'M14.5 9.5A2.5 2.5 0 0 0 12 7a2.5 2.5 0 0 0-2.5 2.5',
  'M11 12a2.5 2.5 0 0 0-2.5-2.5',
  'M12 7a2.5 2.5 0 0 1 2.5 2.5',
  'M11 12a3.8 3.8 0 0 0-3.8 3.8c0 1.5 1.3 3.2 3.8 4.7 2.5-1.5 3.8-3.2 3.8-4.7A3.8 3.8 0 0 0 11 12z',
]);
export const IconSearch  = make(['M10.5 17a6.5 6.5 0 1 1 0-13 6.5 6.5 0 0 1 0 13z', 'M21 21l-5.2-5.2']);
export const IconCopy    = make([
  'M9 9h10v10H9z',
  'M5 15V5h10',
]);
export const IconCheck   = make(['M5 12l5 5L20 7']);
export const IconRotate  = make([
  'M21 12a9 9 0 1 1-3-6.7',
  'M21 4v5h-5',
]);
export const IconQR      = make([
  'M3 3h7v7H3z',
  'M14 3h7v7h-7z',
  'M3 14h7v7H3z',
  'M14 14h3v3h-3z',
  'M18 18h3v3h-3z',
  'M14 18h2',
  'M18 14v2',
]);
export const IconClose   = make(['M6 6l12 12', 'M18 6l-12 12']);
export const IconSun     = make([
  'M12 17a5 5 0 1 1 0-10 5 5 0 0 1 0 10z',
  'M12 2v2', 'M12 20v2', 'M4.9 4.9l1.4 1.4', 'M17.7 17.7l1.4 1.4', 'M2 12h2', 'M20 12h2', 'M4.9 19.1l1.4-1.4', 'M17.7 6.3l1.4-1.4',
]);
export const IconMoon    = make(['M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z']);
export const IconMonitor = make([
  'M3 5h18v12H3z',
  'M9 21h6',
  'M12 17v4',
]);
export const IconBell    = make([
  'M6 8a6 6 0 0 1 12 0c0 5 2 6 2 6H4s2-1 2-6z',
  'M10 19a2 2 0 0 0 4 0',
]);
export const IconBellOff = make([
  'M6 8a6 6 0 0 1 11.5-2.5',
  'M22 22L2 2',
  'M18 14c0-5 2-6 2-6H8.5',
  'M10 19a2 2 0 0 0 4 0',
]);
export const IconActivity = make(['M3 12h4l3-9 4 18 3-9h4']);
export const IconBody    = make(['M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z', 'M14 2v6h6', 'M8 13h8', 'M8 17h6']);
export const IconHeaders = make([
  'M4 6h16',
  'M4 12h10',
  'M4 18h7',
  'M19 14l3 3-3 3',
]);
export const IconQuery   = make([
  'M14 14.76V17a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-3.24a2 2 0 0 1 .59-1.41l7-7a2 2 0 0 1 2.82 0l1.59 1.59a2 2 0 0 1 0 2.82l-7 7a2 2 0 0 1-2.82 0',
]);
export const IconCookie  = make([
  'M12 2a10 10 0 1 0 10 10 4 4 0 0 1-4-4 4 4 0 0 1-4-4 4 4 0 0 1-2-2z',
  'M8 9h.01', 'M8 14h.01', 'M13 16h.01',
]);
export const IconFile    = make([
  'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z',
  'M14 2v6h6',
]);
export const IconReplay  = make(['M3 12a9 9 0 1 0 3-6.7', 'M3 4v5h5']);
export const IconCode    = make([
  'M9 8l-5 4 5 4',
  'M15 8l5 4-5 4',
]);
export const IconTrash   = make([
  'M3 6h18',
  'M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6',
  'M10 11v6', 'M14 11v6',
  'M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2',
]);
export const IconList    = make(['M8 6h13', 'M8 12h13', 'M8 18h13', 'M3 6h.01', 'M3 12h.01', 'M3 18h.01']);
export const IconGrid    = make([
  'M3 3h7v7H3z', 'M14 3h7v7h-7z',
  'M3 14h7v7H3z', 'M14 14h7v7h-7z',
]);
export const IconSettings = make([
  'M12 15a3 3 0 1 1 0-6 3 3 0 0 1 0 6z',
  'M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3h.1a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8v.1a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z',
]);
export const IconHelp    = make([
  'M12 22a10 10 0 1 1 0-20 10 10 0 0 1 0 20z',
  'M9.1 9a3 3 0 0 1 5.8 1c0 2-3 3-3 3',
  'M12 17h.01',
]);
export const IconSend    = make(['M22 2L11 13', 'M22 2l-7 20-4-9-9-4z']);
export const IconDownload = make([
  'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4',
  'M7 10l5 5 5-5',
  'M12 15V3',
]);
export const IconPlay    = make(['M6 3l14 9-14 9z']);
export const IconEye     = make([
  'M1 12s4-8 11-8 11 8 11 8-4 8-11 8S1 12 1 12z',
  'M12 15a3 3 0 1 1 0-6 3 3 0 0 1 0 6z',
]);
export const IconClock   = make([
  'M12 22a10 10 0 1 1 0-20 10 10 0 0 1 0 20z',
  'M12 6v6l4 2',
]);
export const IconServer  = make([
  'M3 4h18v6H3z',
  'M3 14h18v6H3z',
  'M7 7h.01', 'M7 17h.01',
]);
export const IconDatabase = make([
  'M4 6c0-1.7 3.6-3 8-3s8 1.3 8 3-3.6 3-8 3-8-1.3-8-3z',
  'M4 6v6c0 1.7 3.6 3 8 3s8-1.3 8-3V6',
  'M4 12v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6',
]);
export const IconShield  = make(['M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z']);
export const IconKey     = make([
  'M21 2l-9.6 9.6',
  'M14 8l4 4',
  'M15 9l-2.5 2.5a4 4 0 1 1-3 3L7 12',
]);
export const IconHash    = make(['M4 9h16', 'M4 15h16', 'M10 3L8 21', 'M16 3l-2 18']);
export const IconMap     = make([
  'M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 1 1 18 0z',
  'M12 13a3 3 0 1 1 0-6 3 3 0 0 1 0 6z',
]);
export const IconBrowser = make([
  'M3 5h18a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2z',
  'M3 9h18',
  'M8 5v16',
]);
export const IconSparkle = make([
  'M12 3l1.7 4.3L18 9l-4.3 1.7L12 15l-1.7-4.3L6 9l4.3-1.7z',
  'M19 16l.6 1.4L21 18l-1.4.6L19 20l-.6-1.4L17 18l1.4-.6z',
]);
export const IconLayers  = make([
  'M12 2L2 7l10 5 10-5-10-5z',
  'M2 17l10 5 10-5',
  'M2 12l10 5 10-5',
]);
export const IconLink    = make([
  'M10 13a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1',
  'M14 11a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1',
]);
export const IconExternal = make([
  'M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6',
  'M15 3h6v6',
  'M10 14L21 3',
]);
export const IconArrowRight = make(['M5 12h14', 'M13 5l7 7-7 7']);
export const IconChevron = make(['M6 9l6 6 6-6']);
export const IconBook = make([
  'M4 4a2 2 0 0 1 2-2h14v18H6a2 2 0 0 0-2 2z',
  'M4 4v18',
]);
export const IconPlus = make(['M12 5v14', 'M5 12h14']);
export const IconMinus = make(['M5 12h14']);
export const IconImage = make([
  'M3 5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z',
  'M8.5 11a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3z',
  'M21 16l-5-5-9 9',
]);
export const IconFileText = make([
  'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z',
  'M14 2v6h6',
  'M8 13h8', 'M8 17h6', 'M16 17h.01',
]);
export const IconMapPin = make([
  'M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 1 1 18 0z',
  'M12 13a3 3 0 1 1 0-6 3 3 0 0 1 0 6z',
]);
export const IconCalendar = make([
  'M3 6a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z',
  'M3 10h18',
  'M8 2v4', 'M16 2v4',
]);
export const IconFileCode = make([
  'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z',
  'M14 2v6h6',
  'M9 18l-3-3 3-3',
  'M15 12l3 3-3 3',
]);