import React from 'react';
import { IconSun, IconMoon, IconMonitor } from './Icon.jsx';

export default function ThemeToggle({ theme, setTheme }) {
  const options = [
    { key: 'light', icon: IconSun, label: 'Light' },
    { key: 'system', icon: IconMonitor, label: 'System' },
    { key: 'dark', icon: IconMoon, label: 'Dark' },
  ];

  return (
    <div
      className="flex items-center gap-0.5 p-0.5 rounded-md bg-[var(--surface-2)] border border-[var(--line)]"
      role="radiogroup"
      aria-label="Theme"
    >
      {options.map(({ key, icon: Icon, label }) => {
        const active = theme === key;
        return (
          <button
            key={key}
            role="radio"
            aria-checked={active}
            aria-label={label}
            title={label}
            onClick={() => setTheme(key)}
            className={`btn btn-sm btn-icon ${active ? 'btn-primary' : 'btn-ghost'}`}
          >
            <Icon size={13} />
          </button>
        );
      })}
    </div>
  );
}