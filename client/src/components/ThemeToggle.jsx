import React from 'react';
import { Sun, Moon, Monitor } from 'lucide-react';

export default function ThemeToggle({ theme, setTheme, resolvedTheme }) {
  const options = [
    { key: 'light', icon: Sun, label: 'Light' },
    { key: 'system', icon: Monitor, label: 'System' },
    { key: 'dark', icon: Moon, label: 'Dark' },
  ];

  return (
    <div className="segmented" role="radiogroup" aria-label="Theme">
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
            className={`segmented-item w-8 h-8 px-0 ${active ? 'segmented-item-active' : ''}`}
          >
            <Icon className="h-3.5 w-3.5" />
          </button>
        );
      })}
    </div>
  );
}
