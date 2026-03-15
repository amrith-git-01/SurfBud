import { useId } from 'react';
import './OnOffToggle.css';

interface OnOffToggleProps {
  checked: boolean;
  onChange: (next: boolean) => void;
  disabled?: boolean;
  label: string;
}

export function OnOffToggle({
  checked,
  onChange,
  disabled = false,
  label,
}: OnOffToggleProps) {
  const id = useId();

  return (
    <div className={['sb-toggler', disabled ? 'is-disabled' : ''].join(' ')}>
      <input
        id={id}
        type="checkbox"
        checked={checked}
        disabled={disabled}
        aria-label={label}
        onChange={(event) => onChange(event.target.checked)}
      />
      <label htmlFor={id}>
        <svg
          className="sb-toggler-on"
          version="1.1"
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 130.2 130.2"
          aria-hidden="true"
        >
          <polyline
            className="sb-path"
            points="100.2,40.2 51.5,88.8 29.8,67.5"
          />
        </svg>
        <svg
          className="sb-toggler-off"
          version="1.1"
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 130.2 130.2"
          aria-hidden="true"
        >
          <line className="sb-path" x1="34.4" y1="34.4" x2="95.8" y2="95.8" />
          <line className="sb-path" x1="95.8" y1="34.4" x2="34.4" y2="95.8" />
        </svg>
      </label>
    </div>
  );
}
