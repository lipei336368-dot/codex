type SegmentedOption = {
  label: string;
  value: string;
};

type SegmentedControlProps = {
  ariaLabel: string;
  value: string;
  options: SegmentedOption[];
  onChange: (value: string) => void;
};

export function SegmentedControl({ ariaLabel, value, options, onChange }: SegmentedControlProps) {
  return (
    <div className="segmented-control" aria-label={ariaLabel} role="group">
      {options.map((option) => (
        <button
          aria-pressed={option.value === value}
          className={option.value === value ? "segment segment-active" : "segment"}
          key={option.value}
          onClick={() => onChange(option.value)}
          type="button"
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

