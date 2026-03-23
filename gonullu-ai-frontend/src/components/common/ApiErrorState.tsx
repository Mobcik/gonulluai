import { RefreshCw, WifiOff } from 'lucide-react';
import { cn } from '../../utils/cn';
import Button from './Button';

interface ApiErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  className?: string;
  compact?: boolean;
}

const ApiErrorState = ({
  title = 'Bağlantı sorunu',
  message = 'Sunucuya ulaşılamadı. İnternetini ve backend\'in çalıştığını kontrol et (VITE_API_URL).',
  onRetry,
  className,
  compact,
}: ApiErrorStateProps) => (
  <div
    className={cn(
      'text-center rounded-2xl bg-white border border-earth-lighter shadow-card',
      compact ? 'py-8 px-4' : 'py-12 px-4',
      className
    )}
    role="alert"
    aria-live="assertive"
  >
    <WifiOff className={cn('mx-auto text-earth-light mb-3', compact ? 'w-10 h-10' : 'w-12 h-12')} aria-hidden />
    <h3 className="font-semibold text-text mb-1">{title}</h3>
    <p className="text-sm text-text-muted max-w-md mx-auto mb-5">{message}</p>
    {onRetry && (
      <Button type="button" variant="primary" size="sm" onClick={onRetry} className="inline-flex">
        <RefreshCw size={16} aria-hidden />
        Yeniden dene
      </Button>
    )}
  </div>
);

export default ApiErrorState;
