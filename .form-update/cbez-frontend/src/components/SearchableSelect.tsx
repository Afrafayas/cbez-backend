import React, { useEffect, useId, useState } from 'react';

type Props = Omit<React.InputHTMLAttributes<HTMLInputElement>, 'children'> & {
  children?: React.ReactNode;
  options?: string[];
  allowCustomValue?: boolean;
};

function choicesFromChildren(children: React.ReactNode): { value: string; label: string; disabled: boolean }[] {
  return React.Children.toArray(children).flatMap(child => {
    if (!React.isValidElement<{ value?: string; children?: React.ReactNode; disabled?: boolean }>(child)) return [];
    if (child.type === 'option') {
      const label = React.Children.toArray(child.props.children).join('');
      return [{ value: String(child.props.value ?? label), label, disabled: !!child.props.disabled }];
    }
    return choicesFromChildren(child.props.children);
  });
}

/** Searchable choices with optional custom values, preserving existing form handlers. */
export function SearchableSelect({ children, options = [], allowCustomValue = true, value, onChange, onBlur, onFocus, style, ...props }: Props) {
  const id = useId();
  const choices = [...choicesFromChildren(children), ...options.map(option => ({ value: option, label: option, disabled: false }))]
    .filter((option, index, all) => all.findIndex(other => other.value === option.value) === index);
  const selected = choices.find(option => option.value === String(value ?? ''));
  const [query, setQuery] = useState(selected?.label ?? String(value ?? ''));
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  useEffect(() => { setQuery(selected?.label ?? String(value ?? '')); }, [value, selected?.label]);
  const visible = choices.filter(option => option.value && !option.disabled && option.label.toLowerCase().includes(query.toLowerCase()));
  const commit = (next: string) => {
    onChange?.({ target: { value: next }, currentTarget: { value: next } } as React.ChangeEvent<HTMLInputElement>);
    setQuery(choices.find(option => option.value === next)?.label ?? next);
    setOpen(false);
    setActive(-1);
  };
  return <div style={{ position: 'relative', width: '100%' }}>
    <input {...props} type="text" value={query} style={style} role="combobox" autoComplete="off"
      aria-label={props['aria-label'] || props.placeholder || 'Search options'}
      aria-expanded={open} aria-controls={id} aria-autocomplete="list"
      aria-activedescendant={open && active >= 0 ? `${id}-${active}` : undefined}
      onFocus={event => { setOpen(true); setQuery(''); setActive(-1); onFocus?.(event); }}
      onChange={event => { setQuery(event.target.value); setOpen(true); setActive(-1); if (allowCustomValue) onChange?.(event); }}
      onBlur={event => { setOpen(false); setQuery(selected?.label ?? String(value ?? '')); onBlur?.(event); }}
      onKeyDown={event => {
        if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
          event.preventDefault(); setOpen(true);
          setActive(index => visible.length ? Math.max(0, Math.min(visible.length - 1, index + (event.key === 'ArrowDown' ? 1 : -1))) : -1);
        } else if (event.key === 'Enter' && open) {
          event.preventDefault();
          if (active >= 0 && visible[active]) commit(visible[active].value);
          else if (allowCustomValue) commit(query);
          else if (visible.length === 1) commit(visible[0].value);
        } else if (event.key === 'Escape') {
          event.preventDefault(); event.stopPropagation(); setOpen(false); setQuery(selected?.label ?? String(value ?? ''));
        } else if (event.key === 'Tab') setOpen(false);
      }} />
    {open && <div id={id} role="listbox" style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 80, maxHeight: 220, overflowY: 'auto', background: '#fff', color: '#0f172a', border: '1px solid #94a3b8', borderRadius: 8, boxShadow: '0 8px 24px #0003' }}>
      {!props.required && <button type="button" onMouseDown={event => event.preventDefault()} onClick={() => commit('')} style={{ display: 'block', width: '100%', padding: '8px 12px', textAlign: 'left', cursor: 'pointer', border: 0, background: '#fff', color: '#64748b' }}>Clear selection</button>}
      {visible.map((option, index) => <button key={option.value} id={`${id}-${index}`} type="button" role="option" aria-selected={String(value) === option.value}
        onMouseDown={event => event.preventDefault()} onClick={() => commit(option.value)}
        onMouseEnter={() => setActive(index)}
        style={{ display: 'block', width: '100%', padding: '8px 12px', textAlign: 'left', cursor: 'pointer', border: 0, background: active === index ? '#e2e8f0' : '#fff', color: '#0f172a' }}>{option.label}</button>)}
      {!visible.length && <div style={{ padding: '8px 12px', fontSize: 12 }}>{allowCustomValue ? 'Type a custom value or search for another option.' : 'No matching options'}</div>}
    </div>}
  </div>;
}
