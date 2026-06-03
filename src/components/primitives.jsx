import { typeColors } from '../lib/utils.js';

export const Card = ({ children, className = '', ...props }) => (
  <div
    {...props}
    className={`border border-bone/[0.06] bg-bone/[0.015] backdrop-blur-xl ${className}`}
  >
    {children}
  </div>
);

export const SectionTitle = ({ eyebrow, title, desc }) => (
  <div className="mb-6">
    {eyebrow && (
      <div className="font-display italic text-gold text-base mb-2">
        {eyebrow}
      </div>
    )}
    <h2 className="font-display text-4xl md:text-5xl tracking-tight text-bone leading-none">
      {title}
    </h2>
    {desc && <p className="mt-3 text-sm text-stone leading-relaxed max-w-xl">{desc}</p>}
  </div>
);

export const NumInput = ({ value, onChange, placeholder, suffix, className = '' }) => (
  <div className={`relative ${className}`}>
    <input
      type="number"
      inputMode="decimal"
      value={value ?? ''}
      onChange={(e) => onChange(e.target.value === '' ? '' : Number(e.target.value))}
      placeholder={placeholder}
      className="w-full bg-ink/60 border border-bone/[0.08] px-4 py-3 text-bone text-base font-mono tabular-nums focus:border-gold/60 focus:outline-none placeholder:text-bone/20"
    />
    {suffix && (
      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-stone font-mono pointer-events-none">
        {suffix}
      </span>
    )}
  </div>
);

export const Pill = ({ type }) => (
  <span
    className={`inline-flex items-center px-1.5 py-0.5 text-[9px] font-mono uppercase tracking-[0.22em] border ${
      typeColors[type] || 'text-bone/60 bg-bone/5 border-bone/10'
    }`}
  >
    {type}
  </span>
);
