import { useState, useEffect, useCallback } from 'react';
import { Download, Lock, CheckCircle } from 'lucide-react';
import { rewardsApi } from '../api/rewards';
import type { DigitalReward } from '../types';
import { useAuth } from '../contexts/AuthContext';
import Button from '../components/common/Button';
import { formatPoints, badgeInfo } from '../utils/formatPoints';
import { cn } from '../utils/cn';
import toast from 'react-hot-toast';
import ApiErrorState from '../components/common/ApiErrorState';

const Rewards = () => {
  const { user } = useAuth();
  const [rewards,   setRewards]   = useState<DigitalReward[]>([]);
  const [unlocked,  setUnlocked]  = useState<string[]>([]);
  const [certLoading, setCertLoading] = useState(false);
  const [rewardsError, setRewardsError] = useState(false);

  const loadRewards = useCallback(async () => {
    setRewardsError(false);
    try {
      const { data } = await rewardsApi.list();
      setRewards(data);
    } catch {
      setRewards([]);
      setRewardsError(true);
    }
    if (user) {
      try {
        const { data } = await rewardsApi.myUnlocks();
        setUnlocked(data.map(d => d.id));
      } catch {
        setUnlocked([]);
      }
    } else {
      setUnlocked([]);
    }
  }, [user]);

  useEffect(() => { loadRewards(); }, [loadRewards]);

  const handleDownloadCert = async () => {
    if (!user || user.earned_points < 500) {
      toast.error('Sertifika için 500 puan gerekli');
      return;
    }
    setCertLoading(true);
    try {
      await rewardsApi.downloadCertificate();
      toast.success('Sertifikan indiriliyor! 📜');
    } catch {
      toast.error('Sertifika indirilemedi. Sonra tekrar dene.');
    } finally {
      setCertLoading(false);
    }
  };

  const pts = user?.earned_points || 0;

  return (
    <div className="min-h-screen pt-20 pb-16">
      {/* Header */}
      <div className="bg-gradient-to-br from-amber-50 to-primary-light/30 border-b border-amber-100">
        <div className="max-w-4xl mx-auto px-4 py-10 text-center">
          <div className="text-5xl mb-3">🏅</div>
          <h1 className="font-display text-4xl font-bold text-text">Dijital Ödüller</h1>
          <p className="text-text-soft mt-2 mb-6">Puan kazan, rozet topla, sertifika indir</p>

          {user ? (
            <div className="inline-flex items-center gap-4 bg-white rounded-card px-6 py-4 shadow-card">
              <div>
                <p className="text-xs text-text-muted">Toplam Puan</p>
                <p className="font-display font-bold text-2xl text-primary">{formatPoints(pts)}</p>
              </div>
              <div className="w-px h-10 bg-earth-lighter" />
              <div>
                <p className="text-xs text-text-muted">Kazanılan Ödül</p>
                <p className="font-display font-bold text-2xl text-earth">{unlocked.length}</p>
              </div>
              <div className="w-px h-10 bg-earth-lighter" />
              <div>
                <p className="text-xs text-text-muted">Rozet</p>
                <p className="font-display font-bold text-2xl">{badgeInfo[user.badge].emoji}</p>
              </div>
            </div>
          ) : (
            <div className="inline-flex items-center gap-2 bg-earth-lighter text-text-muted text-sm px-6 py-3 rounded-chip">
              <Lock size={15} />
              Ödülleri görmek için giriş yap
            </div>
          )}
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-10">
        {rewardsError && (
          <div className="mb-8">
            <ApiErrorState title="Ödül listesi yüklenemedi" onRetry={loadRewards} className="max-w-lg mx-auto" />
          </div>
        )}

        {/* Progress bar to next reward */}
        {user && rewards.length > 0 && (() => {
          const sorted = [...rewards].sort((a, b) => a.threshold - b.threshold);
          const next = sorted.find(r => pts < r.threshold);
          if (!next) return null;
          const earned = sorted.filter(r => pts >= r.threshold);
          const prev = earned.length ? earned[earned.length - 1] : undefined;
          const from = prev?.threshold ?? 0;
          const pct  = Math.min(100, Math.round(((pts - from) / (next.threshold - from)) * 100));
          return (
            <div className="card mb-8">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-semibold text-text">Sonraki Ödüle Yol</p>
                <p className="text-sm font-bold text-primary">{next.icon} {next.name}</p>
              </div>
              <div className="w-full h-3 bg-earth-lighter rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-primary to-earth rounded-full transition-all duration-700" style={{ width: `${pct}%` }} />
              </div>
              <div className="flex justify-between mt-1.5 text-xs text-text-muted">
                <span>{formatPoints(pts)} puan</span>
                <span>{next.threshold - pts} puan kaldı</span>
              </div>
            </div>
          );
        })()}

        {/* Reward grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {!rewardsError && rewards.length === 0 && (
            <p className="col-span-full text-center text-sm text-text-muted py-8">
              Ödül tanımları yüklenemedi veya henüz liste boş.
            </p>
          )}
          {rewards.map(reward => {
            const isUnlocked = !user ? false : pts >= reward.threshold;
            const isOwned    = unlocked.includes(reward.id);

            return (
              <div
                key={reward.id}
                className={cn(
                  'card border-2 transition-all',
                  isUnlocked
                    ? 'border-primary/20 shadow-card-hover'
                    : 'border-transparent opacity-60 grayscale'
                )}
              >
                <div className="text-center">
                  <div className={cn(
                    'text-5xl mb-3 transition-transform',
                    isUnlocked && 'animate-float'
                  )}>
                    {reward.icon}
                  </div>
                  <h3 className="font-semibold text-base text-text mb-1">{reward.name}</h3>
                  <p className="text-xs text-text-soft mb-3">{reward.description}</p>

                  <div className={cn(
                    'inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-chip mb-4',
                    isUnlocked ? 'bg-primary-light text-primary' : 'bg-earth-lighter text-text-muted'
                  )}>
                    {isUnlocked ? <CheckCircle size={12} /> : <Lock size={12} />}
                    {reward.threshold} puan
                  </div>

                  {isOwned && reward.type === 'certificate' && (
                    <div className="mt-2">
                      <Button
                        size="sm"
                        onClick={handleDownloadCert}
                        loading={certLoading}
                        className="w-full"
                      >
                        <Download size={14} />
                        Sertifikayı İndir
                      </Button>
                    </div>
                  )}

                  {isOwned && reward.type !== 'certificate' && (
                    <div className="flex items-center justify-center gap-1.5 text-xs text-primary font-semibold">
                      <CheckCircle size={13} />
                      Kazanıldı!
                    </div>
                  )}

                  {!isUnlocked && user && (
                    <div className="text-xs text-text-muted">
                      {reward.threshold - pts} puan daha kazan
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Badge progression */}
        <div className="mt-12">
          <h2 className="font-display text-2xl font-bold text-text mb-6 text-center">Rozet Yolculuğu</h2>
          <div className="flex flex-col gap-3">
            {(Object.entries(badgeInfo) as [string, typeof badgeInfo[keyof typeof badgeInfo]][]).map(([key, info]) => {
              const thresholds = { filiz: 0, genc: 100, aktif: 300, deneyimli: 700, lider: 1500, efsane: 3000 };
              const threshold  = thresholds[key as keyof typeof thresholds];
              const isEarned   = pts >= threshold;
              const isCurrent  = user?.badge === key;

              return (
                <div
                  key={key}
                  className={cn(
                    'flex items-center gap-4 p-4 rounded-xl border-2 transition-all',
                    isCurrent  ? 'border-primary bg-primary-light shadow-card' :
                    isEarned   ? 'border-earth-light bg-white' :
                                 'border-transparent bg-white/50 opacity-50'
                  )}
                >
                  <span className="text-3xl">{info.emoji}</span>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-text">{info.label}</span>
                      {isCurrent && <span className="text-xs bg-primary text-white px-2 py-0.5 rounded-chip">Mevcut</span>}
                    </div>
                    <span className="text-xs text-text-muted">{threshold}+ puan</span>
                  </div>
                  {isEarned ? (
                    <CheckCircle size={18} className="text-primary" />
                  ) : (
                    <Lock size={18} className="text-earth-light" />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Rewards;
