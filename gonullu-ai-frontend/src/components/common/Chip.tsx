import { cn } from '../../utils/cn';

interface ChipProps {
  label:    string;
  active:   boolean;
  onClick?: () => void;
  disabled?: boolean;
}

const Chip = ({ label, active, onClick, disabled }: ChipProps) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    className={cn(
      'px-4 py-1.5 rounded-chip border-[1.5px] text-sm font-medium transition-all duration-200 whitespace-nowrap',
      active
        ? 'bg-earth text-white border-earth'
        : 'bg-transparent text-earth border-earth-light hover:bg-primary-light',
      disabled && 'opacity-50 cursor-not-allowed'
    )}
  >
    {label}
  </button>
);

export default Chip;
