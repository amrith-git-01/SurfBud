export type ViewMode = 'list' | 'pie' | 'bar';

export interface DropdownOption<T = string> {
  value: T;
  label: string;
}

export interface DropdownProps<T = string> {
  value: T;
  options: DropdownOption<T>[];
  onChange: (value: T) => void;
  disabled?: boolean;
  className?: string;
  buttonClassName?: string;
  align?: "left" | "right";
  size?: "sm" | "md";
}
