import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  BarChart2, Users, Camera, Star, MapPin, GraduationCap,
  TrendingUp, Download, ArrowLeft, Calendar,
} from 'lucide-react';
import api from '../api/client';
import { useAuth } from '../contexts/AuthContext';
import { cn } from '../utils/cn';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';

interface AnalyticsData {
  event_id:         string;
  event_title:      string;
  event_date:       string;
  event_category:   string;
  max_participants: number;
  participant_count: number;
  capacity_pct:     number;
  student_count:    number;
  student_pct:      number;
  photo_count:      number;
  comment_count:    number;
  avg_rating:       number | null;
  city_distribution: { label: string; count: number }[];
  university_distribution: { label: string; count: number }[];
  total_points_awarded: number;
}

const BarRow = ({ label, count, total, color = 'bg-primary' }: {
  label: string; count: number; total: number; color?: string;
}) => {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-text-soft w-28 truncate flex-shrink-0">{label}</span>
      <div className="flex-1 h-5 bg-earth-lighter rounded-full overflow-hidden">
        <div
          className={cn('h-full rounded-full transition-all duration-700', color)}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-xs font-bold text-text w-6 text-right flex-shrink-0">{count}</span>
    </div>
  );
};

const StatCard = ({ icon, value, label, sub, color = 'text-primary', bg = 'bg-primary-light' }: {
  icon: React.ReactNode; value: string | number; label: string; sub?: string;
  color?: string; bg?: string;
}) => (
  <div className="bg-white rounded-2xl p-5 shadow-card">
    <div className={cn('w-11 h-11 rounded-xl flex items-center justify-center mb-3', bg)}>
      <span className={color}>{icon}</span>
    </div>
    <div className="text-2xl font-bold text-text">{value}</div>
    <div className="text-sm text-text-muted">{label}</div>
    {sub && <div className="text-xs text-text-muted mt-0.5 opacity-70">{sub}</div>}
  </div>
);

const EventAnalytics = () => {
  const { id }              = useParams<{ id: string }>();
  const { user }            = useAuth();
  const [data, setData]     = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState('');

  useEffect(() => {
    if (!id) return;
    api.get<AnalyticsData>(`/analytics/events/${id}`)
      .then(r => setData(r.data))
      .catch(err => setError(err.response?.data?.detail || 'Yüklenemedi'))
      .finally(() => setLoading(false));
  }, [id]);

  const exportCSV = () => {
    if (!data) return;
    const rows = [
      ['Etkinlik', data.event_title],
      ['Tarih', data.event_date ? format(new Date(data.event_date), 'd MMMM yyyy HH:mm', { locale: tr }) : ''],
      ['Katılımcı', data.participant_count],
      ['Kapasite %', data.capacity_pct],
      ['Öğrenci', data.student_count],
      ['Fotoğraf', data.photo_count],
      ['Yorum', data.comment_count],
      ['Ort. Puan', data.avg_rating ?? '-'],
      ['Toplam Puan', data.total_points_awarded],
      [],
      ['Şehir Dağılımı'],
      ...data.city_distribution.map(c => [c.label, c.count]),
    ];
    const csv  = rows.map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const a    = document.createElement('a');
    a.href     = URL.createObjectURL(blob);
    a.download = `analitik-${id}.csv`;
    a.click();
  };

  if (loading) return (
    <div className="min-h-screen pt-16 flex items-center justify-center">
      <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (error) return (
    <div className="min-h-screen pt-16 flex flex-col items-center justify-center gap-4">
      <BarChart2 size={48} className="text-earth opacity-30" />
      <p className="text-text-muted">{error}</p>
      <Link to={`/events/${id}`} className="text-primary hover:underline text-sm flex items-center gap-1">
        <ArrowLeft size={14} /> Etkinliğe dön
      </Link>
    </div>
  );

  if (!data) return null;

  const maxCity  = data.city_distribution[0]?.count  || 1;
  const maxUniv  = data.university_distribution[0]?.count || 1;

  return (
    <div className="min-h-screen pt-16 pb-16 bg-earth-lighter/40">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <Link
              to={`/events/${id}`}
              className="p-2 rounded-xl hover:bg-white hover:shadow-card transition-all text-text-soft"
            >
              <ArrowLeft size={20} />
            </Link>
            <div>
              <h1 className="font-display text-xl font-bold text-text flex items-center gap-2">
                <BarChart2 size={20} className="text-primary" /> Etkinlik Analitikleri
              </h1>
              <p className="text-sm text-text-muted mt-0.5 flex items-center gap-2">
                <Calendar size={12} />
                {data.event_title}
                {data.event_date && (
                  <span>· {format(new Date(data.event_date), 'd MMM yyyy', { locale: tr })}</span>
                )}
              </p>
            </div>
          </div>
          <button
            onClick={exportCSV}
            className="flex items-center gap-2 bg-white shadow-card px-4 py-2.5 rounded-xl text-sm font-semibold text-text hover:shadow-card-hover transition-all"
          >
            <Download size={15} className="text-primary" /> CSV İndir
          </button>
        </div>

        {/* Özet istatistikler */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <StatCard
            icon={<Users size={20} />}
            value={data.participant_count}
            label="Katılımcı"
            sub={data.max_participants ? `${data.capacity_pct}% dolu` : 'Sınırsız'}
            bg="bg-blue-50" color="text-blue-500"
          />
          <StatCard
            icon={<Camera size={20} />}
            value={data.photo_count}
            label="Fotoğraf"
            bg="bg-purple-50" color="text-purple-500"
          />
          <StatCard
            icon={<Star size={20} />}
            value={data.avg_rating ? `${data.avg_rating}/5` : '-'}
            label="Ortalama Puan"
            sub={`${data.comment_count} değerlendirme`}
            bg="bg-yellow-50" color="text-yellow-500"
          />
          <StatCard
            icon={<TrendingUp size={20} />}
            value={data.total_points_awarded}
            label="Dağıtılan Puan"
            bg="bg-primary-light" color="text-primary"
          />
        </div>

        {/* Kapasite göstergesi */}
        {data.max_participants && (
          <div className="bg-white rounded-2xl p-6 shadow-card">
            <h2 className="font-semibold text-text mb-4 flex items-center gap-2">
              <Users size={16} className="text-primary" /> Kapasite Doluluk Oranı
            </h2>
            <div className="flex items-center gap-4">
              <div className="flex-1 h-6 bg-earth-lighter rounded-full overflow-hidden">
                <div
                  className={cn(
                    'h-full rounded-full transition-all duration-1000',
                    data.capacity_pct >= 90 ? 'bg-red-500' :
                    data.capacity_pct >= 70 ? 'bg-amber-500' : 'bg-primary'
                  )}
                  style={{ width: `${data.capacity_pct}%` }}
                />
              </div>
              <span className="font-bold text-text text-lg w-14 text-right">
                {data.capacity_pct}%
              </span>
            </div>
            <div className="flex justify-between text-xs text-text-muted mt-2">
              <span>{data.participant_count} katılımcı</span>
              <span>{data.max_participants} max kapasite</span>
            </div>
          </div>
        )}

        <div className="grid md:grid-cols-2 gap-6">
          {/* Şehir dağılımı */}
          {data.city_distribution.length > 0 && (
            <div className="bg-white rounded-2xl p-6 shadow-card">
              <h2 className="font-semibold text-text mb-4 flex items-center gap-2">
                <MapPin size={16} className="text-primary" /> Şehir Dağılımı
              </h2>
              <div className="space-y-3">
                {data.city_distribution.map(c => (
                  <BarRow key={c.label} label={c.label} count={c.count} total={maxCity} color="bg-primary" />
                ))}
              </div>
            </div>
          )}

          {/* Öğrenci / mezun dağılımı */}
          <div className="bg-white rounded-2xl p-6 shadow-card">
            <h2 className="font-semibold text-text mb-4 flex items-center gap-2">
              <GraduationCap size={16} className="text-primary" /> Katılımcı Profili
            </h2>
            <div className="space-y-5">
              {/* Öğrenci oranı */}
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="font-medium text-text">Öğrenci oranı</span>
                  <span className="font-bold text-primary">{data.student_pct}%</span>
                </div>
                <div className="h-3 bg-earth-lighter rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-500 rounded-full transition-all duration-700"
                    style={{ width: `${data.student_pct}%` }}
                  />
                </div>
              </div>

              {/* Üniversite dağılımı */}
              {data.university_distribution.length > 0 && (
                <div className="space-y-2.5 mt-2">
                  <p className="text-xs font-semibold text-text-muted uppercase tracking-wide">
                    Üniversiteler
                  </p>
                  {data.university_distribution.map(u => (
                    <BarRow key={u.label} label={u.label} count={u.count} total={maxUniv} color="bg-blue-500" />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Teşekkür notu */}
        <div className="bg-primary-light rounded-2xl p-5 text-center">
          <p className="text-sm font-semibold text-primary">
            🎉 Bu etkinliğe {data.participant_count} gönüllü katıldı, toplam {data.total_points_awarded} puan kazanıldı!
          </p>
        </div>
      </div>
    </div>
  );
};

export default EventAnalytics;
