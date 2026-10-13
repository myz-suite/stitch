import type { ReactNode } from 'react';
import { useState } from 'react';

export interface SegmentedOption {
  value: string;
  label: string;
  icon?: ReactNode;
  hint?: string;
}

export function Segmented({
  value,
  options,
  onChange,
  size = 'md',
  wrap = false,
}: {
  value: string;
  options: SegmentedOption[];
  onChange: (value: string) => void;
  size?: 'sm' | 'md';
  wrap?: boolean;
}) {
  return (
    <div className={`seg ${size === 'sm' ? 'seg-sm' : ''} ${wrap ? 'seg-wrap' : ''}`} role="tablist">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          title={o.hint}
          role="tab"
          aria-selected={o.value === value}
          className={`seg-item ${o.value === value ? 'is-active' : ''}`}
          onClick={() => onChange(o.value)}
        >
          {o.icon}
          <span>{o.label}</span>
        </button>
      ))}
    </div>
  );
}

export function Field({ label, hint, children }: { label?: string; hint?: string; children: ReactNode }) {
  return (
    <label className="field">
      {label ? <span className="field-label">{label}</span> : null}
      {children}
      {hint ? <span className="field-hint">{hint}</span> : null}
    </label>
  );
}

export function Slider({
  label,
  value,
  min,
  max,
  step = 1,
  onChange,
  format,
  disabled,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (v: number) => void;
  format?: (v: number) => string;
  disabled?: boolean;
}) {
  return (
    <div className={`slider ${disabled ? 'is-disabled' : ''}`}>
      <div className="slider-head">
        <span className="slider-label">{label}</span>
        <span className="slider-value">{format ? format(value) : value}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </div>
  );
}

export function Toggle({
  label,
  checked,
  onChange,
  hint,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  hint?: string;
}) {
  return (
    <button type="button" className="toggle-row" onClick={() => onChange(!checked)}>
      <span className="toggle-text">
        <span>{label}</span>
        {hint ? <span className="field-hint">{hint}</span> : null}
      </span>
      <span className={`switch ${checked ? 'is-on' : ''}`}>
        <span className="switch-knob" />
      </span>
    </button>
  );
}

export function ColorField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="color-field">
      <span className="field-label">{label}</span>
      <span className="color-input">
        <input type="color" value={value} onChange={(e) => onChange(e.target.value)} />
        <span className="color-hex">{value.toUpperCase()}</span>
      </span>
    </div>
  );
}

export function Button({
  children,
  onClick,
  variant = 'default',
  icon,
  disabled,
  block,
  title,
  type = 'button',
}: {
  children?: ReactNode;
  onClick?: () => void;
  variant?: 'default' | 'primary' | 'ghost' | 'danger';
  icon?: ReactNode;
  disabled?: boolean;
  block?: boolean;
  title?: string;
  type?: 'button' | 'submit';
}) {
  return (
    <button
      type={type}
      title={title}
      onClick={onClick}
      disabled={disabled}
      className={`btn btn-${variant} ${block ? 'btn-block' : ''}`}
    >
      {icon}
      {children ? <span>{children}</span> : null}
    </button>
  );
}

export function Select({
  value,
  options,
  onChange,
}: {
  value: string;
  options: { value: string; label: string }[];
  onChange: (v: string) => void;
}) {
  return (
    <select className="select" value={value} onChange={(e) => onChange(e.target.value)}>
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

export function TextInput({
  label,
  value,
  placeholder,
  onChange,
}: {
  label?: string;
  value: string;
  placeholder?: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="field">
      {label ? <span className="field-label">{label}</span> : null}
      <input
        className="text-input"
        type="text"
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}

export function Panel({
  title,
  children,
  actions,
  defaultOpen = true,
}: {
  title: string;
  children: ReactNode;
  actions?: ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <section className={`panel ${open ? 'is-open' : ''}`}>
      <header className="panel-head">
        <button type="button" className="panel-title" onClick={() => setOpen((o) => !o)}>
          <span className={`panel-caret ${open ? 'is-open' : ''}`} />
          {title}
        </button>
        {actions ? <div className="panel-actions">{actions}</div> : null}
      </header>
      {open ? <div className="panel-body">{children}</div> : null}
    </section>
  );
}
