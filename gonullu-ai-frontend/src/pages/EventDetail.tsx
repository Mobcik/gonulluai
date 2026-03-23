import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  Calendar, MapPin, Users, Clock, Share2, Heart, CheckCircle,
  ChevronLeft, Camera, MessageSquare, Shield, Star, Copy, X, Upload, Loader2,
  FileSpreadsheet, FileText, QrCode,
} from 'lucide-react';
import { eventsApi } from '../api/events';
import { BASE_URL, API_ORIGIN } from '../api/client';
import type { Event, Comment, PhotoItem } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { formatEventDate, daysUntilEvent } from '../utils/formatDate';
import { categoryEmoji } from '../utils/formatPoints';
import Avatar from '../components/common/Avatar';
import Button from '../components/common/Button';
import { cn } from '../utils/cn';
import { resolveMediaUrl } from '../utils/resolveMediaUrl';
import toast from 'react-hot-toast';

const EventDetail = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate   = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // is_creator backend'den gelmese de frontend'de kontrol et
  const isCreator = (ev: Event | null) =>
    ev ? (ev.is_creator || (user != null && ev.creator_id === user.id)) : false;

  const [event,         setEvent]         = useState<Event | null>(null);
  const [comments,      setComments]       = useState<Comment[]>([]);
  const [photos,        setPhotos]         = useState<PhotoItem[]>([]);
  const [loading,       setLoading]        = useState(true);
  const [joining,       setJoining]        = useState(false);
  const [verifyCode,    setVerifyCode]     = useState('');
  const [verifying,     setVerifying]      = useState(false);
  const [verified,      setVerified]       = useState(false);
  const [newComment,    setNewComment]     = useState('');
  const [rating,        setRating]         = useState(0);
  const [lightbox,      setLightbox]       = useState<number | null>(null);
  const [uploading,     setUploading]      = useState(false);
  const [completing,    setCompleting]     = useState(false);
  const [exportingCsv,  setExportingCsv]   = useState(false);
  const [exportingPdf,  setExportingPdf]   = useState(false);
  const [exportingPoster, setExportingPoster] = useState(false);

  useEffect(() => {
    if (!id) return;
    Promise.all([
      eventsApi.get(id).then(r => setEvent(r.data)).catch(() => setEvent(null)),
      eventsApi.getComments(id).then(r => setComments(r.data)).catch(() => {}),
      eventsApi.getPhotos(id).then(r => setPhotos(r.data)).catch(() => {}),
    ]).finally(() => setLoading(false));
  }, [id]);

  const handleJoin = async () => {
    if (!user) { navigate('/login', { state: { from: `/events/${id}` } }); return; }
    setJoining(true);
    try {
      if (event?.is_joined) {
        await eventsApi.leave(id!);
        setEvent(prev => prev ? { ...prev, is_joined: false, participant_count: prev.participant_count - 1 } : prev);
        toast.success('Katılımın iptal edildi');
      } else {
        const { data } = await eventsApi.join(id!);
        setEvent(prev => prev ? { ...prev, is_joined: true, participant_count: prev.participant_count + 1 } : prev);
        toast.success('Etkinliğe kayıt oldun! Katılımını doğrulayarak 35 puan kazan. 🎯');
        if (data.schedule_warning) {
          toast(data.schedule_warning, { icon: '⚠️', duration: 6500 });
        }
      }
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'İşlem başarısız');
    } finally {
      setJoining(false);
    }
  };

  const handleVerify = async () => {
    if (verifyCode.length !== 6) { toast.error('6 haneli kodu gir'); return; }
    setVerifying(true);
    try {
      const { data } = await eventsApi.verify(id!, verifyCode);
      setVerified(true);
      toast.success(data.message);
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Geçersiz kod');
    } finally {
      setVerifying(false);
    }
  };

  const triggerBlobDownload = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportCsv = async () => {
    if (!id) return;
    setExportingCsv(true);
    try {
      const { data } = await eventsApi.exportParticipantsCsv(id);
      triggerBlobDownload(data, `katilimcilar_${id.slice(0, 8)}.csv`);
      toast.success('CSV indirildi');
    } catch {
      toast.error('CSV indirilemedi (organizatör olmalısın)');
    } finally {
      setExportingCsv(false);
    }
  };

  const handleExportPdf = async () => {
    if (!id) return;
    setExportingPdf(true);
    try {
      const { data } = await eventsApi.exportImpactPdf(id);
      triggerBlobDownload(data, `etki_raporu_${id.slice(0, 8)}.pdf`);
      toast.success('PDF indirildi');
    } catch {
      toast.error('PDF indirilemedi (organizatör olmalısın)');
    } finally {
      setExportingPdf(false);
    }
  };

  const handleExportPoster = async () => {
    if (!id) return;
    setExportingPoster(true);
    try {
      const { data } = await eventsApi.downloadPoster(id);
      triggerBlobDownload(data, `etkinlik_afisi_${id.slice(0, 8)}.png`);
      toast.success('Afiş indirildi');
    } catch {
      toast.error('Afiş indirilemedi (organizatör olmalısın)');
    } finally {
      setExportingPoster(false);
    }
  };

  const handleComplete = async () => {
    if (!window.confirm('Etkinliği tamamlandı olarak işaretlemek istiyor musun? Doğrulanmış katılımcılara +25 bonus puan verilecek.')) return;
    setCompleting(true);
    try {
      const { data } = await eventsApi.complete(id!);
      setEvent(prev => prev ? { ...prev, status: 'completed' } : prev);
      toast.success(`Etkinlik tamamlandı! ${data.verified_count} katılımcıya bonus puan verildi 🏁`);
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'İşlem başarısız');
    } finally {
      setCompleting(false);
    }
  };

  const handleComment = async () => {
    if (!newComment.trim()) return;
    try {
      const { data } = await eventsApi.addComment(id!, newComment, rating || undefined);
      setComments(prev => [data, ...prev]);
      setNewComment('');
      setRating(0);
      toast.success('+5 puan kazandın!');
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Yorum eklenemedi');
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Ön kontrol
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      toast.error('Sadece JPEG, PNG veya WebP yükleyebilirsin');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Dosya boyutu 5MB\'dan küçük olmalı');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setUploading(true);

    // Önce yerel önizleme (optimistic) göster
    const localUrl = URL.createObjectURL(file);
    const tempPhoto: PhotoItem = {
      id:          `temp-${Date.now()}`,
      event_id:    id!,
      uploader_id: user!.id,
      photo_url:   localUrl,
      uploader:    { id: user!.id, full_name: user!.full_name, avatar_url: user?.avatar_url },
      created_at:  new Date().toISOString(),
    };
    setPhotos(prev => [tempPhoto, ...prev]);

    try {
      const { data } = await eventsApi.uploadPhoto(id!, file);

      // Geçici fotoğrafı backend URL'i ile değiştir
      setPhotos(prev =>
        prev.map(p => p.id === tempPhoto.id
          ? { ...p, id: Date.now().toString(), photo_url: data.url }
          : p
        )
      );
      // Kapak fotoğrafı yoksa bu fotoğrafı göster
      setEvent(prev => prev && !prev.cover_photo_url ? { ...prev, cover_photo_url: data.url } : prev);
      toast.success(data.message || '+10 puan kazandın! 📸');

      // Backend'den güncel listeyi de al (birkaç saniye sonra)
      setTimeout(() => {
        eventsApi.getPhotos(id!).then(r => setPhotos(r.data)).catch(() => {});
      }, 1000);

    } catch (err: any) {
      // Başarısız → geçici fotoğrafı kaldır
      setPhotos(prev => prev.filter(p => p.id !== tempPhoto.id));
      URL.revokeObjectURL(localUrl);

      const detail = err.response?.data?.detail;
      if (typeof detail === 'object' && detail?.message) {
        toast.error(detail.message);
      } else {
        toast.error(typeof detail === 'string' ? detail : 'Fotoğraf yüklenemedi');
      }
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen pt-16 flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen pt-16 flex flex-col items-center justify-center gap-4">
        <div className="text-5xl">😔</div>
        <h2 className="font-semibold text-xl text-text">Etkinlik bulunamadı</h2>
        <Link to="/discover" className="btn-primary">Etkinliklere Dön</Link>
      </div>
    );
  }

  const participantCount = event.participant_count ?? 0;
  const pct      = event.max_participants ? Math.round((participantCount / event.max_participants) * 100) : 0;
  const daysLeft = daysUntilEvent(event.event_date);
  const isToday  = daysLeft === 0;

  const fillBarColor = pct < 70 ? 'bg-primary' : pct < 90 ? 'bg-amber-400' : 'bg-orange-500';

  return (
    <div className="min-h-screen pt-16 pb-24 md:pb-8">
      {/* Back button */}
      <div className="max-w-7xl mx-auto px-4 pt-4 pb-2">
        <button onClick={() => navigate(-1)} className="flex items-center gap-1.5 text-sm text-text-soft hover:text-text transition-colors">
          <ChevronLeft size={18} />
          Geri Dön
        </button>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="lg:grid lg:grid-cols-3 lg:gap-8">
          {/* Main content */}
          <div className="lg:col-span-2 space-y-6">

            {/* SECTION 1 — Cover */}
            <div className="relative h-72 md:h-96 rounded-card overflow-hidden bg-gradient-to-br from-primary-light to-earth-lighter">
              {event.cover_photo_url ? (
                <img src={resolveMediaUrl(event.cover_photo_url) || event.cover_photo_url} alt={event.title} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-8xl">
                  {categoryEmoji[event.category]}
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

              {/* Top row */}
              <div className="absolute top-4 left-4 right-4 flex items-center justify-between">
                <span className="bg-white/90 text-text text-xs font-semibold px-3 py-1.5 rounded-chip">
                  {categoryEmoji[event.category]} {event.category}
                </span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    title="Sosyal medya önizlemesi için paylaşım linki"
                    className="bg-white/90 p-2 rounded-full text-text-soft hover:text-text transition-colors"
                    onClick={() => {
                      const shareUrl = `${API_ORIGIN}/share/events/${event.id}`;
                      void navigator.clipboard.writeText(shareUrl);
                      toast.success('Paylaşım linki kopyalandı (WhatsApp / sosyal önizleme)');
                    }}
                  >
                    <Share2 size={16} />
                  </button>
                  <button className="bg-white/90 p-2 rounded-full text-text-soft hover:text-red-500 transition-colors">
                    <Heart size={16} />
                  </button>
                </div>
              </div>

              {/* Bottom overlay */}
              <div className="absolute bottom-0 left-0 right-0 p-6">
                <h1 className="font-display text-2xl md:text-3xl font-bold text-white mb-3 leading-snug">
                  {event.title}
                </h1>
                <div className="flex items-center gap-3">
                  <Avatar src={event.creator?.avatar_url} name={event.creator?.full_name ?? '?'} size="sm" />
                  <div>
                    <p className="text-white/80 text-xs">Organizatör</p>
                    <p className="text-white font-semibold text-sm">{event.creator?.full_name ?? 'Bilinmiyor'}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* SECTION 2 — Quick info bar */}
            <div className="card">
              <a
                href={`${BASE_URL}/events/${event.id}/calendar.ics`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:text-primary-dark mb-4"
              >
                <Calendar size={16} />
                Takvime ekle (.ics)
              </a>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                {[
                  { icon: <Calendar size={16} className="text-primary" />, label: 'Tarih', value: formatEventDate(event.event_date) },
                  { icon: <MapPin size={16} className="text-primary" />,    label: 'Şehir', value: event.city },
                  { icon: <Users size={16} className="text-primary" />,     label: 'Katılımcı', value: `${participantCount}${event.max_participants ? `/${event.max_participants}` : ''}` },
                  { icon: <Clock size={16} className="text-primary" />,     label: 'Kalan', value: daysLeft < 0 ? 'Geçti' : daysLeft === 0 ? 'Bugün!' : `${daysLeft} gün` },
                ].map((item, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <div className="mt-0.5">{item.icon}</div>
                    <div>
                      <p className="text-xs text-text-muted">{item.label}</p>
                      <p className="text-sm font-semibold text-text">{item.value}</p>
                    </div>
                  </div>
                ))}
              </div>

              {event.max_participants && (
                <div>
                  <div className="flex justify-between text-xs text-text-muted mb-1">
                    <span>Doluluk</span>
                    <span className={cn('font-medium', pct >= 90 ? 'text-orange-500' : pct >= 70 ? 'text-amber-500' : 'text-primary')}>
                      {pct}%
                    </span>
                  </div>
                  <div className="w-full h-2 bg-earth-lighter rounded-full overflow-hidden">
                    <div className={cn('h-full rounded-full', fillBarColor)} style={{ width: `${Math.min(pct, 100)}%` }} />
                  </div>
                </div>
              )}
            </div>

            {/* SECTION 4 — Description */}
            <div className="card">
              <h2 className="font-semibold text-lg text-text mb-4">Etkinlik Hakkında</h2>
              <p className="text-text-soft leading-relaxed whitespace-pre-line break-words">{event.description}</p>

              {event.preparation_notes && (
                <div className="mt-4 p-4 bg-primary-light rounded-xl">
                  <h3 className="font-semibold text-primary text-sm mb-1">📋 Ne Getirmeli?</h3>
                  <p className="text-text-soft text-sm break-words">{event.preparation_notes}</p>
                </div>
              )}

              {(event.required_skills ?? []).length > 0 && (
                <div className="mt-4">
                  <h3 className="text-sm font-semibold text-text mb-2">Gerekli Yetenekler</h3>
                  <div className="flex flex-wrap gap-2">
                    {(event.required_skills ?? []).map(skill => (
                      <span key={skill} className="chip chip-inactive text-xs">{skill}</span>
                    ))}
                  </div>
                </div>
              )}

              {event.address && (
                <div className="mt-4 flex items-start gap-2 text-sm text-text-soft">
                  <MapPin size={15} className="text-primary mt-0.5 flex-shrink-0" />
                  <div>
                    <span className="font-medium text-text break-words">{event.address}</span>
                    {event.meeting_point && <p className="text-xs mt-0.5 break-words">Buluşma noktası: {event.meeting_point}</p>}
                  </div>
                </div>
              )}
            </div>

            {/* SECTION 7 — Verification (event day only) */}
            {event.is_joined && !event.user_verified && (
              <div className="card border-2 border-primary/20">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-primary-light rounded-xl flex items-center justify-center">
                    <Shield size={20} className="text-primary" />
                  </div>
                  <div>
                    <h2 className="font-semibold text-base text-text">Katılım Doğrulama</h2>
                    <p className="text-xs text-text-muted">{isToday ? 'Organizatörden kodu al ve gir' : `Etkinlik günü aktif olacak (${daysLeft} gün kaldı)`}</p>
                  </div>
                </div>

                {verified ? (
                  <div className="text-center py-4">
                    <div className="text-4xl mb-2 animate-confetti">🎉</div>
                    <p className="font-semibold text-primary">Katılımın doğrulandı! +35 puan kazandın! ✅</p>
                  </div>
                ) : (
                  <div>
                  <div className="mb-2 text-xs text-text-muted bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
                    🧪 Demo kodu: <strong className="text-amber-700">123456</strong>
                  </div>
                  <div className="flex gap-3">
                    <input
                      type="text"
                      maxLength={6}
                      value={verifyCode}
                      onChange={e => setVerifyCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      placeholder="6 haneli kod"
                      className="input text-center text-lg tracking-[0.5em] font-bold flex-1"
                    />
                    <Button onClick={handleVerify} loading={verifying} disabled={verifyCode.length !== 6}>
                      Doğrula
                    </Button>
                  </div>
                  </div>
                )}
              </div>
            )}

            {/* Organizer panel */}
            {isCreator(event) && (
              <div className="card border-2 border-earth-light">
                <h2 className="font-semibold text-base text-text mb-4">⚙️ Organizatör Paneli</h2>
                <div className="grid grid-cols-2 gap-3">
                  {/* Etkinliği Düzenle */}
                  <Link
                    to={`/events/${event.id}/edit`}
                    className="col-span-2 flex items-center justify-center gap-2 p-3 bg-amber-50 rounded-xl text-amber-700 text-sm font-medium hover:bg-amber-100 transition-colors border border-amber-200"
                  >
                    <span>✏️</span> Etkinliği Düzenle
                  </Link>
                  <button className="flex items-center gap-2 p-3 bg-primary-light rounded-xl text-primary text-sm font-medium hover:bg-primary hover:text-white transition-colors">
                    <Copy size={15} />
                    Doğrulama Kodunu Göster
                  </button>
                  <button
                    onClick={handleComplete}
                    disabled={completing || event.status === 'completed'}
                    className="flex items-center gap-2 p-3 bg-earth-lighter rounded-xl text-earth text-sm font-medium hover:bg-earth hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {completing
                      ? <Loader2 size={15} className="animate-spin" />
                      : <CheckCircle size={15} />
                    }
                    {event.status === 'completed' ? 'Tamamlandı ✓' : 'Tamamlandı İşaretle'}
                  </button>
                  <Link
                    to={`/events/${event.id}/analytics`}
                    className="col-span-2 flex items-center justify-center gap-2 p-3 bg-blue-50 rounded-xl text-blue-600 text-sm font-medium hover:bg-blue-100 transition-colors"
                  >
                    <span>📊</span> Analitikleri Gör
                  </Link>
                  <button
                    type="button"
                    onClick={() => void handleExportCsv()}
                    disabled={exportingCsv}
                    className="flex items-center justify-center gap-2 p-3 bg-emerald-50 rounded-xl text-emerald-700 text-sm font-medium hover:bg-emerald-100 transition-colors disabled:opacity-50"
                  >
                    {exportingCsv ? <Loader2 size={15} className="animate-spin" /> : <FileSpreadsheet size={15} />}
                    Katılımcı CSV
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleExportPdf()}
                    disabled={exportingPdf}
                    className="flex items-center justify-center gap-2 p-3 bg-slate-50 rounded-xl text-slate-700 text-sm font-medium hover:bg-slate-100 transition-colors disabled:opacity-50"
                  >
                    {exportingPdf ? <Loader2 size={15} className="animate-spin" /> : <FileText size={15} />}
                    Etki PDF
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleExportPoster()}
                    disabled={exportingPoster}
                    className="col-span-2 flex items-center justify-center gap-2 p-3 bg-violet-50 rounded-xl text-violet-800 text-sm font-medium hover:bg-violet-100 transition-colors disabled:opacity-50 border border-violet-100"
                  >
                    {exportingPoster ? <Loader2 size={15} className="animate-spin" /> : <QrCode size={15} />}
                    Afiş indir (PNG + QR)
                  </button>
                </div>
              </div>
            )}

            {/* SECTION 6 — Photos */}
            <div className="card">
              {/* Gizli file input — her zaman render edilsin */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={handlePhotoUpload}
              />
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold text-lg text-text">Fotoğraflar ({photos.length})</h2>
                {(event.is_joined || isCreator(event)) && user && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                  >
                    {uploading ? (
                      <><Loader2 size={14} className="animate-spin" /> Yükleniyor...</>
                    ) : (
                      <><Camera size={14} /> Fotoğraf Ekle</>
                    )}
                  </Button>
                )}
              </div>
              {photos.length > 0 ? (
                <div className="grid grid-cols-3 gap-2">
                  {photos.slice(0, 9).map((photo, i) => (
                    <div
                      key={photo.id}
                      className="relative aspect-square cursor-pointer group rounded-xl overflow-hidden bg-earth-lighter"
                      onClick={() => setLightbox(i)}
                    >
                      <img
                        src={photo.photo_url}
                        alt=""
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        onError={e => {
                          (e.target as HTMLImageElement).style.display = 'none';
                          const parent = (e.target as HTMLImageElement).parentElement;
                          if (parent && !parent.querySelector('.img-fallback')) {
                            const fb = document.createElement('div');
                            fb.className = 'img-fallback w-full h-full flex items-center justify-center text-3xl bg-earth-lighter';
                            fb.textContent = '🖼️';
                            parent.appendChild(fb);
                          }
                        }}
                      />
                      {i === 8 && photos.length > 9 && (
                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center text-white font-bold text-lg">
                          +{photos.length - 9}
                        </div>
                      )}
                      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <p className="text-white text-xs truncate">{photo.uploader?.full_name}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div
                  className={cn(
                    "text-center py-12 text-text-muted rounded-xl border-2 border-dashed border-earth-light transition-colors",
                    (event.is_joined || isCreator(event)) && user && "cursor-pointer hover:border-primary hover:bg-primary-light/20"
                  )}
                  onClick={() => (event.is_joined || isCreator(event)) && user && fileInputRef.current?.click()}
                >
                  <Upload size={32} className="mx-auto mb-3 opacity-40" />
                  <p className="text-sm font-medium">Henüz fotoğraf yok</p>
                  {(event.is_joined || isCreator(event)) && user && (
                    <p className="text-xs mt-1 text-primary">Tıkla ve ilk fotoğrafı ekle! +10 puan</p>
                  )}
                </div>
              )}
            </div>

            {/* SECTION 8 — Comments */}
            <div className="card">
              <h2 className="font-semibold text-lg text-text mb-4">
                Yorumlar ve Sorular ({comments.length})
              </h2>

              {user ? (
                <div className="mb-6">
                  {event.status === 'completed' && (
                    <div className="flex gap-1 mb-3">
                      {[1, 2, 3, 4, 5].map(s => (
                        <button key={s} onClick={() => setRating(s)}>
                          <Star size={20} className={s <= rating ? 'text-amber-400 fill-amber-400' : 'text-earth-light'} />
                        </button>
                      ))}
                    </div>
                  )}
                  <div className="flex gap-3">
                    <Avatar src={user.avatar_url} name={user.full_name} size="sm" />
                    <div className="flex-1">
                      <textarea
                        value={newComment}
                        onChange={e => setNewComment(e.target.value)}
                        placeholder="Soru sor veya yorum yap..."
                        rows={2}
                        className="input resize-none"
                      />
                      <div className="flex justify-end mt-2">
                        <Button size="sm" onClick={handleComment} disabled={!newComment.trim()}>
                          Gönder
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="mb-4 p-3 bg-earth-lighter rounded-xl text-sm text-text-soft">
                  Yorum yapmak için <Link to="/login" className="text-primary font-semibold">giriş yap</Link>
                </div>
              )}

              <div className="space-y-4">
                {comments.map(comment => (
                  <div key={comment.id} className="flex gap-3">
                    <Avatar src={comment.user.avatar_url} name={comment.user.full_name} size="sm" />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-sm text-text">{comment.user.full_name}</span>
                        {comment.rating && (
                          <div className="flex">
                            {Array.from({ length: comment.rating }).map((_, i) => (
                              <Star key={i} size={12} className="text-amber-400 fill-amber-400" />
                            ))}
                          </div>
                        )}
                      </div>
                      <p className="text-sm text-text-soft">{comment.content}</p>
                    </div>
                  </div>
                ))}
                {comments.length === 0 && (
                  <div className="text-center py-6 text-text-muted text-sm">
                    <MessageSquare size={28} className="mx-auto mb-2 opacity-30" />
                    Henüz yorum yok. İlk yorumu sen yap!
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* STICKY SIDEBAR */}
          <div className="hidden lg:block">
            <div className="sticky top-24">
              <div className="card shadow-card-hover">
                <div className="mb-4">
                  <div className="text-2xl font-bold text-primary">
                    {daysLeft < 0 ? 'Sona Erdi' : daysLeft === 0 ? 'Bugün!' : `${daysLeft} gün kaldı`}
                  </div>
                  {event.max_participants && (
                    <p className="text-sm text-text-muted mt-1">
                      {event.max_participants - participantCount > 0
                        ? `${event.max_participants - participantCount} yer kaldı`
                        : 'Etkinlik dolu'
                      }
                    </p>
                  )}
                </div>

                {event.status === 'active' && daysLeft >= 0 && (
                  <Button
                    onClick={handleJoin}
                    loading={joining}
                    variant={event.is_joined ? 'outline' : 'primary'}
                    className="w-full"
                    size="lg"
                  >
                    {event.is_joined ? '✓ Katıldın — İptal Et' : 'Katıl'}
                  </Button>
                )}

                {event.status === 'full' && !event.is_joined && (
                  <Button variant="outline" className="w-full" size="lg" disabled>
                    Etkinlik Dolu
                  </Button>
                )}

                <div className="mt-4 pt-4 border-t border-earth-lighter space-y-2 text-sm text-text-soft">
                  <div className="flex items-center gap-2">
                    <Calendar size={14} className="text-primary" />
                    {formatEventDate(event.event_date)}
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin size={14} className="text-primary" />
                    {event.city}
                  </div>
                  <div className="flex items-center gap-2">
                    <Shield size={14} className="text-primary" />
                    {event.verification_method === 'qr' ? 'QR Kod Doğrulama' : event.verification_method === 'code' ? '6 Haneli Kod' : 'Doğrulama Yok'}
                  </div>
                </div>

                <div className="mt-4 p-3 bg-primary-light rounded-xl">
                  <p className="text-xs font-semibold text-primary mb-1">Kazanabileceklerin:</p>
                  <div className="space-y-1 text-xs text-text-soft">
                    <div className="flex justify-between"><span>Katılım doğrulama</span><span className="font-semibold text-primary">+35 puan</span></div>
                    <div className="flex justify-between"><span>Etkinlik tamamlama bonusu</span><span className="font-semibold text-primary">+25 puan</span></div>
                    <div className="flex justify-between"><span>Fotoğraf yükleme</span><span className="font-semibold text-primary">+10 puan</span></div>
                    <div className="flex justify-between"><span>Yorum yapma</span><span className="font-semibold text-primary">+5 puan</span></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile sticky bar */}
      {event.status === 'active' && daysLeft >= 0 && (
        <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-earth-lighter p-4 shadow-card-hover">
          <div className="flex items-center gap-4 max-w-2xl mx-auto">
            <div className="flex-1">
              <p className="text-xs text-text-muted">{daysLeft === 0 ? 'Bugün!' : `${daysLeft} gün kaldı`}</p>
              <p className="text-sm font-semibold text-text">+35 puana kadar kazan</p>
            </div>
            <Button onClick={handleJoin} loading={joining} variant={event.is_joined ? 'outline' : 'primary'} size="md">
              {event.is_joined ? 'İptal Et' : 'Katıl'}
            </Button>
          </div>
        </div>
      )}

      {/* Lightbox */}
      {lightbox !== null && (
        <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4" onClick={() => setLightbox(null)}>
          <button className="absolute top-4 right-4 text-white hover:text-gray-300 bg-white/10 rounded-full p-2">
            <X size={24} />
          </button>
          {/* Önceki / sonraki oklar */}
          {lightbox > 0 && (
            <button
              className="absolute left-4 text-white bg-white/10 rounded-full p-3 hover:bg-white/20"
              onClick={e => { e.stopPropagation(); setLightbox(lightbox - 1); }}
            >
              ‹
            </button>
          )}
          {lightbox < photos.length - 1 && (
            <button
              className="absolute right-4 text-white bg-white/10 rounded-full p-3 hover:bg-white/20"
              onClick={e => { e.stopPropagation(); setLightbox(lightbox + 1); }}
            >
              ›
            </button>
          )}
          <div className="flex flex-col items-center gap-3" onClick={e => e.stopPropagation()}>
            <img
              src={photos[lightbox]?.photo_url}
              alt=""
              className="max-h-[80vh] max-w-[85vw] object-contain rounded-xl shadow-2xl"
            />
            {photos[lightbox]?.uploader && (
              <p className="text-white/70 text-sm">
                {photos[lightbox].uploader.full_name} · {lightbox + 1}/{photos.length}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default EventDetail;
