import { Link } from 'react-router-dom';
import { useState } from 'react';
import { Calendar, MapPin, Users, CheckCircle } from 'lucide-react';
import type { Event } from '../../types';
import { categoryEmoji } from '../../utils/formatPoints';
import { formatEventDate, daysUntilEvent } from '../../utils/formatDate';
import { cn } from '../../utils/cn';
import Avatar from '../common/Avatar';

interface EventCardProps {
  event:        Event;
  aiScore?:     number;
  aiReason?:    string;
  className?:   string;
  style?:       React.CSSProperties;
}

const fillPercent = (count: number, max?: number) => {
  if (!max) return 0;
  return Math.round((count / max) * 100);
};

const fillColor = (pct: number) => {
  if (pct < 70) return 'bg-primary';
  if (pct < 90) return 'bg-amber-400';
  return 'bg-orange-500';
};

const getCategoryGradient = (category?: string) => {
  const map: Record<string, string> = {
    cevre:   'from-green-100 to-emerald-200',
    egitim:  'from-blue-100 to-indigo-200',
    hayvan:  'from-amber-100 to-orange-200',
    sosyal:  'from-purple-100 to-violet-200',
    spor:    'from-red-100 to-pink-200',
    sanat:   'from-rose-100 to-fuchsia-200',
    saglik:  'from-teal-100 to-cyan-200',
    teknoloji: 'from-sky-100 to-blue-200',
  };
  return map[category?.toLowerCase() ?? ''] ?? 'from-primary-light to-earth-lighter';
};

const statusLabel: Record<string, { label: string; color: string }> = {
  active:    { label: 'Aktif',       color: 'bg-primary-light text-primary' },
  full:      { label: 'Dolu',        color: 'bg-orange-50 text-orange-600' },
  pending:   { label: 'İnceleniyor', color: 'bg-yellow-50 text-yellow-700' },
  completed: { label: 'Tamamlandı',  color: 'bg-gray-100 text-gray-500' },
  cancelled: { label: 'İptal',       color: 'bg-red-50 text-red-500' },
  draft:     { label: 'Taslak',      color: 'bg-gray-100 text-gray-500' },
  ongoing:   { label: 'Devam Ediyor',color: 'bg-blue-50 text-blue-600' },
};

const EventCard = ({ event, aiScore, aiReason, className, style }: EventCardProps) => {
  const pct      = fillPercent(event.participant_count, event.max_participants);
  const daysLeft = daysUntilEvent(event.event_date);
  const status   = statusLabel[event.status] ?? statusLabel.active;
  const [imgError, setImgError] = useState(false);
  const [imgLoaded, setImgLoaded] = useState(false);

  const showImage = event.cover_photo_url && !imgError;

  return (
    <Link to={`/events/${event.id}`} className={cn('block group', className)} style={style}>
      <div className="bg-white rounded-card shadow-card hover:shadow-card-hover transition-all duration-300 group-hover:-translate-y-1 overflow-hidden">
        {/* Cover image */}
        <div className="relative h-44 overflow-hidden">
          {/* Gradient arka plan — her zaman görünür */}
          <div className={cn(
            'absolute inset-0 bg-gradient-to-br transition-opacity duration-300',
            getCategoryGradient(event.category),
            showImage && imgLoaded ? 'opacity-0' : 'opacity-100'
          )}>
            {!showImage && (
              <div className="w-full h-full flex items-center justify-center text-6xl opacity-60">
                {categoryEmoji[event.category] || '🌿'}
              </div>
            )}
          </div>

          {/* Gerçek fotoğraf */}
          {showImage && (
            <img
              src={event.cover_photo_url!}
              alt={event.title}
              className={cn(
                'absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-all duration-500',
                imgLoaded ? 'opacity-100' : 'opacity-0'
              )}
              onLoad={() => setImgLoaded(true)}
              onError={() => setImgError(true)}
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />

          {/* Top badges */}
          <div className="absolute top-3 left-3 right-3 flex items-start justify-between">
            <span className="text-xs font-semibold bg-white/90 text-text rounded-chip px-2.5 py-1 flex items-center gap-1">
              {categoryEmoji[event.category]} {event.category}
            </span>
            <span className={cn('text-xs font-semibold rounded-chip px-2.5 py-1', status.color)}>
              {status.label}
            </span>
          </div>

          {/* AI score */}
          {aiScore !== undefined && (
            <div className="absolute bottom-3 right-3 bg-primary text-white text-xs font-bold px-2.5 py-1 rounded-chip flex items-center gap-1">
              ✨ {aiScore}% uyum
            </div>
          )}

          {/* Days left */}
          {daysLeft >= 0 && daysLeft <= 7 && event.status === 'active' && (
            <div className="absolute bottom-3 left-3 bg-amber-500 text-white text-xs font-bold px-2.5 py-1 rounded-chip">
              {daysLeft === 0 ? 'Bugün!' : `${daysLeft} gün kaldı`}
            </div>
          )}
        </div>

        {/* Content */}
        <div className="p-4">
          {/* Club */}
          {event.club && (
            <div className="flex items-center gap-1.5 mb-2">
              <Avatar src={event.club.logo_url} name={event.club.name} size="xs" />
              <span className="text-xs text-text-muted font-medium">{event.club.name}</span>
              {event.club.verified && <CheckCircle size={11} className="text-primary" />}
            </div>
          )}

          {/* Title */}
          <h3 className="font-display font-semibold text-text text-base leading-snug mb-2 line-clamp-2 group-hover:text-primary transition-colors">
            {event.title}
          </h3>

          {/* Short desc */}
          <p className="text-xs text-text-soft line-clamp-2 mb-3">{event.short_description}</p>

          {/* Meta */}
          <div className="space-y-1.5 mb-3">
            <div className="flex items-center gap-1.5 text-xs text-text-muted">
              <Calendar size={12} className="text-primary flex-shrink-0" />
              {formatEventDate(event.event_date)}
            </div>
            <div className="flex items-center gap-1.5 text-xs text-text-muted">
              <MapPin size={12} className="text-primary flex-shrink-0" />
              {event.city}
              {event.address && <span className="text-text-muted/60 truncate">· {event.address}</span>}
            </div>
          </div>

          {/* Participant bar */}
          {event.max_participants && (
            <div className="mb-3">
              <div className="flex items-center justify-between text-xs text-text-muted mb-1">
                <div className="flex items-center gap-1">
                  <Users size={11} />
                  {event.participant_count}/{event.max_participants} katılımcı
                </div>
                <span className={cn('font-medium', pct >= 90 ? 'text-orange-500' : pct >= 70 ? 'text-amber-500' : 'text-primary')}>
                  {pct}%
                </span>
              </div>
              <div className="w-full h-1.5 bg-earth-lighter rounded-full overflow-hidden">
                <div
                  className={cn('h-full rounded-full transition-all', fillColor(pct))}
                  style={{ width: `${Math.min(pct, 100)}%` }}
                />
              </div>
            </div>
          )}

          {/* Creator + joined */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Avatar src={event.creator.avatar_url} name={event.creator.full_name} size="xs" />
              <span className="text-xs text-text-muted">{event.creator.full_name}</span>
            </div>
            {event.is_joined && (
              <span className="text-xs text-primary font-semibold flex items-center gap-0.5">
                <CheckCircle size={12} /> Katıldın
              </span>
            )}
          </div>

          {/* AI reason */}
          {aiReason && (
            <div className="mt-3 pt-3 border-t border-earth-lighter text-xs text-text-soft italic">
              ✨ {aiReason}
            </div>
          )}
        </div>
      </div>
    </Link>
  );
};

export default EventCard;
