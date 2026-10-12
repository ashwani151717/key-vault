import { useEffect, useId, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '../lib/utils';
import { Label } from './ui/label';

export function SearchableSelect({ label, value, options, onChange, placeholder, disabled }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const rootRef = useRef(null);
  const listId = useId();
  const selected = options.find((option) => option.value === value);
  const filtered = options.filter((option) =>
    `${option.label} ${option.hint ?? ''}`.toLowerCase().includes(query.trim().toLowerCase()),
  );

  useEffect(() => {
    function onPointerDown(event) {
      if (!rootRef.current?.contains(event.target)) setOpen(false);
    }
    document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
  }, []);

  return (
    <div ref={rootRef} className="relative">
      <Label>{label}</Label>
      <button
        type="button"
        disabled={disabled}
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => setOpen((current) => !current)}
        className="flex h-11 w-full items-center justify-between rounded-xl border border-slate-200 bg-white px-3 text-left text-sm shadow-sm transition hover:border-slate-300 disabled:bg-slate-100 disabled:text-slate-400"
      >
        <span className={cn('truncate', selected ? 'font-medium text-slate-900' : 'text-slate-400')}>
          {selected ? selected.label : placeholder}
        </span>
        <ChevronDown className={cn('h-4 w-4 shrink-0 text-slate-400 transition', open && 'rotate-180')} />
      </button>
      {open && !disabled && (
        <div className="absolute z-30 mt-2 w-full overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl shadow-slate-900/10">
          <div className="border-b border-slate-100 p-2">
            <input
              autoFocus
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search"
              className="h-9 w-full rounded-lg border border-slate-200 px-2.5 text-sm outline-none focus:border-teal-700"
            />
          </div>
          <ul id={listId} className="max-h-64 overflow-auto py-1">
            {filtered.length === 0 && <li className="px-3 py-2 text-sm text-slate-500">No matches</li>}
            {filtered.map((option) => (
              <li key={option.value}>
                <button
                  type="button"
                  className={cn(
                    'flex w-full flex-col px-3 py-2 text-left text-sm hover:bg-teal-50',
                    option.value === value && 'bg-teal-50 text-teal-950',
                  )}
                  onClick={() => {
                    onChange(option.value);
                    setOpen(false);
                    setQuery('');
                  }}
                >
                  <span className="font-medium">{option.label}</span>
                  {option.hint && <span className="text-xs text-slate-500">{option.hint}</span>}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
