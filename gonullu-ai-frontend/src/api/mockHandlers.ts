/**
 * Mock API sistemi — backend erişilemez olduğunda devreye girer.
 *
 * Çalışma mantığı:
 *   api/client.ts içindeki Axios interceptor, ağ hatası aldığında
 *   bu dosyadaki handleMockRequest fonksiyonunu çağırır.
 *   URL pattern eşleştirme ile gerçek API yanıtları simüle edilir.
 *
 * Devre dışı bırakmak için: .env içinde VITE_API_URL canlı bir
 *   backend'e işaret ettiğinde ve backend çalışırken mock devreye girmez.
 */
import {
  MOCK_EVENTS, MOCK_USERS, MOCK_LEADERBOARD, MOCK_REWARDS,
  MOCK_POINT_HISTORY, MOCK_COMMENTS, MOCK_CLUBS,
  delay, getEventById, getUserById, getUserEvents,
} from './mockData';

/**
 * Mock oturum verisinin saklandığı localStorage anahtarları.
 * AuthContext bu sabitleri import ederek logout sırasında temizler.
 */
export const MOCK_STORAGE_KEYS = {
  currentUser:  'mock_current_user',
  joinedEvents: 'mock_joined_events',
} as const;

const DEMO_USER        = MOCK_USERS.find(u => u.id === 'u-demo')!;
const LOCAL_JOINED_KEY = MOCK_STORAGE_KEYS.joinedEvents;
const LOCAL_USER_KEY   = MOCK_STORAGE_KEYS.currentUser;

const getJoined = (): string[] => {
  try { return JSON.parse(localStorage.getItem(LOCAL_JOINED_KEY) || '[]'); }
  catch { return []; }
};
const addJoined    = (id: string) => localStorage.setItem(LOCAL_JOINED_KEY, JSON.stringify([...new Set([...getJoined(), id])]));
const removeJoined = (id: string) => localStorage.setItem(LOCAL_JOINED_KEY, JSON.stringify(getJoined().filter(x => x !== id)));

const getSavedUser = () => {
  try {
    const raw = localStorage.getItem(LOCAL_USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
};

const enrichEvent = (event: typeof MOCK_EVENTS[0], userId?: string) => {
  const joined = getJoined();
  return {
    ...event,
    is_joined:    userId ? joined.includes(event.id) || event.is_joined : event.is_joined,
    participant_count: event.participant_count + (joined.includes(event.id) && !event.is_joined ? 1 : 0),
  };
};

// ─── HANDLER MAP ─────────────────────────────────────────────────────────────

type HandlerFn = (url: string, method: string, body: any) => Promise<any> | any;

const handlers: Array<{ pattern: RegExp; method?: string; fn: HandlerFn }> = [

  // AUTH /auth/me
  {
    pattern: /\/auth\/me/,
    method: 'get',
    fn: () => {
      const token = localStorage.getItem('token');
      if (!token) return null;
      return getSavedUser() || DEMO_USER;
    },
  },

  // AUTH /auth/login
  {
    pattern: /\/auth\/login/,
    method: 'post',
    fn: (_url, _method, body) => {
      const email    = body?.email    || '';
      const password = body?.password || '';
      // Demo hesabı: herhangi bir geçerli e-posta + "demo123" şifresi
      const found = MOCK_USERS.find(u => u.email === email) || (email && password === 'demo123' ? DEMO_USER : null);
      if (!found) throw { response: { status: 401, data: { detail: 'E-posta veya şifre yanlış' } } };

      const user = { ...found };
      localStorage.setItem(LOCAL_USER_KEY, JSON.stringify(user));

      return {
        access_token:  'mock-token-' + user.id,
        refresh_token: 'mock-refresh-' + user.id,
        token_type:    'bearer',
        user,
      };
    },
  },

  // AUTH /auth/register
  {
    pattern: /\/auth\/register/,
    method: 'post',
    fn: (_url, _method, body) => {
      if (!body?.email || !body?.password || !body?.full_name) {
        throw { response: { status: 400, data: { detail: 'Tüm alanları doldur' } } };
      }
      const isStudent = body.email.endsWith('.edu.tr') || body.email.endsWith('.edu');
      const newUser = {
        ...DEMO_USER,
        id:              'u-new-' + Date.now(),
        email:           body.email,
        full_name:       body.full_name,
        city:            body.city || null,
        is_student:      isStudent,
        university_name: isStudent ? body.email.split('@')[1].replace('.edu.tr','').toUpperCase() + ' Üniversitesi' : undefined,
        role:            isStudent ? 'student' : 'user',
        total_points:    30,
        earned_points:   30,
        badge:           'filiz',
        streak_days:     0,
        created_at:      new Date().toISOString(),
      };
      localStorage.setItem(LOCAL_USER_KEY, JSON.stringify(newUser));
      return {
        access_token:  'mock-token-' + newUser.id,
        refresh_token: 'mock-refresh-' + newUser.id,
        token_type:    'bearer',
        user:          newUser,
      };
    },
  },

  // AUTH /auth/refresh
  {
    pattern: /\/auth\/refresh/,
    fn: () => ({ access_token: 'mock-token-refreshed-' + Date.now() }),
  },

  // EVENTS /events/discover
  {
    pattern: /\/events\/discover/,
    method: 'get',
    fn: (_url) => {
      const url  = new URL(_url, 'http://localhost');
      const cat  = url.searchParams.get('category') || '';
      const city = url.searchParams.get('city') || '';
      const q    = url.searchParams.get('q') || '';
      const user = getSavedUser();

      let list = MOCK_EVENTS.filter(e => ['active', 'full'].includes(e.status));
      if (cat)  list = list.filter(e => e.category === cat);
      if (city) list = list.filter(e => e.city === city);
      if (q)    list = list.filter(e => e.title.toLowerCase().includes(q.toLowerCase()));

      // AI simülasyonu — kullanıcının ilgi alanlarına göre sırala
      if (user?.interests?.length) {
        list = list.sort((a, b) => {
          const aScore = user.interests.includes(a.category) ? 1 : 0;
          const bScore = user.interests.includes(b.category) ? 1 : 0;
          if (bScore !== aScore) return bScore - aScore;
          return new Date(a.event_date).getTime() - new Date(b.event_date).getTime();
        });
      }

      return list.map(e => enrichEvent(e, user?.id));
    },
  },

  // EVENTS /events (list)
  {
    pattern: /\/events(\?.*)?$/,
    method: 'get',
    fn: (_url) => {
      const url  = new URL(_url, 'http://localhost');
      const cat  = url.searchParams.get('category') || '';
      const city = url.searchParams.get('city') || '';
      const q    = url.searchParams.get('q') || '';
      const user = getSavedUser();

      let list = [...MOCK_EVENTS];
      if (cat)  list = list.filter(e => e.category === cat);
      if (city) list = list.filter(e => e.city === city);
      if (q)    list = list.filter(e => e.title.toLowerCase().includes(q.toLowerCase()));
      return list.map(e => enrichEvent(e, user?.id));
    },
  },

  // EVENTS /events/:id/join (DELETE)
  {
    pattern: /\/events\/([^/]+)\/join/,
    method: 'delete',
    fn: (_url) => {
      const id = _url.match(/\/events\/([^/]+)\/join/)?.[1] || '';
      removeJoined(id);
      return { message: 'Katılımın iptal edildi' };
    },
  },

  // EVENTS /events/:id/join (POST)
  {
    pattern: /\/events\/([^/]+)\/join/,
    method: 'post',
    fn: (_url) => {
      const id = _url.match(/\/events\/([^/]+)\/join/)?.[1] || '';
      addJoined(id);
      return { message: 'Etkinliğe kayıt oldun! Katılımını doğrulayarak 35 puan kazan. 🎯' };
    },
  },

  // EVENTS /events/:id/complete (POST)
  {
    pattern: /\/events\/([^/]+)\/complete/,
    method: 'post',
    fn: (_url) => {
      const id = _url.match(/\/events\/([^/]+)\/complete/)?.[1] || '';
      // Mock event objesini tamamlandı olarak işaretle
      const joined = getJoined();
      const verifiedCount = joined.includes(id) ? 1 : 0;
      return {
        message: 'Etkinlik tamamlandı olarak işaretlendi',
        verified_count: verifiedCount,
      };
    },
  },

  // EVENTS /events/:id/verify
  {
    pattern: /\/events\/([^/]+)\/verify/,
    method: 'post',
    fn: (_url, _method, body) => {
      const code = typeof body === 'string' ? body : body?.code || '';
      if (code !== '123456') {
        throw { response: { status: 400, data: { detail: 'Geçersiz kod. Demo için: 123456' } } };
      }
      // Mock: gerçek kullanıcıya da puan ver
      const user = getSavedUser() || DEMO_USER;
      const updated = { ...user, total_points: (user.total_points || 0) + 35, earned_points: (user.earned_points || 0) + 35 };
      localStorage.setItem('mock_current_user', JSON.stringify(updated));
      return { message: '+35 puan kazandın! Katılımın doğrulandı ✅' };
    },
  },

  // AI açıklama üretme (mock)
  {
    pattern: /\/events\/ai-generate-description/,
    method: 'post',
    fn: (_url, _method, body) => {
      const title    = body?.title    || 'Gönüllülük Etkinliği';
      const category = body?.category || 'Genel';
      const city     = body?.city     || 'İstanbul';
      return {
        short_description: `${city}'de düzenlenen ${category.toLowerCase()} temalı bu etkinlikte gönüllü olarak yer al ve fark yarat!`,
        description: `## ${title}\n\nBu etkinlikte birlikte anlamlı bir fark yaratacağız. Gönüllü olarak katıldığında hem topluma katkı sağlayacak hem de yeni beceriler kazanacaksın.\n\n**Kimler katılabilir?**\nHerkes katılabilir! Önceden deneyim gerekmez, sadece istekli olmak yeterli.\n\n**Neden bu etkinliğe katılmalısın?**\n- Gerçek bir etki yaratma fırsatı\n- Yeni insanlarla tanışma\n- ${category} alanında deneyim kazanma\n- GönüllüAI'da puan ve rozet kazanma\n\nBizi bu güzel etkinlikte görmek isteriz! 🌿`,
      };
    },
  },

  // AI yetenek eşleşme nedenleri (mock)
  {
    pattern: /\/events\/ai-skill-reasons/,
    method: 'post',
    fn: (_url, _method, body) => {
      const skills: string[] = body?.skills || [];
      const events: any[]   = body?.events  || [];
      const skillsStr = skills.length ? skills.join(' ve ') : 'gönüllülük';
      return events.map((ev: any) => ({
        event_id: ev.id,
        reason: `${skillsStr} ${skills.length ? 'yeteneğin' : 'ilgin'} "${ev.title}" etkinliğinde gerçekten işe yarar — bu fırsatı kaçırma! 🌟`,
      }));
    },
  },

  // AI karşılama mesajı (mock)
  {
    pattern: /\/events\/ai-welcome/,
    method: 'get',
    fn: () => {
      const user = getSavedUser() || DEMO_USER;
      const name = (user.full_name || 'Gönüllü').split(' ')[0];
      const msgs = [
        `Hoş geldin ${name}! Bugün harika bir etkinlikte fark yaratabilirsin. 🌿`,
        `Merhaba ${name}! Seninle eşleşen yeni etkinlikler seni bekliyor. ✨`,
        `${name}, bugün topluma katkı sağlamak için mükemmel bir gün! 🌱`,
      ];
      return { message: msgs[Math.floor(Math.random() * msgs.length)] };
    },
  },

  // EVENTS /events/:id/photos (GET)
  {
    pattern: /\/events\/([^/]+)\/photos/,
    method: 'get',
    fn: (_url) => {
      const id = _url.match(/\/events\/([^/]+)\/photos/)?.[1] || '';
      if (id === 'e9') {
        return [
          { id: 'ph1', event_id: 'e9', uploader_id: 'u-selin', photo_url: 'https://images.unsplash.com/photo-1556075798-4825dfaaf498?w=400&q=80', created_at: new Date().toISOString() },
          { id: 'ph2', event_id: 'e9', uploader_id: 'u-ali',   photo_url: 'https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?w=400&q=80', created_at: new Date().toISOString() },
          { id: 'ph3', event_id: 'e9', uploader_id: 'u-ayse',  photo_url: 'https://images.unsplash.com/photo-1618477461853-cf6ed80faba5?w=400&q=80', created_at: new Date().toISOString() },
        ];
      }
      return [];
    },
  },

  // EVENTS /events/:id/photos (POST - upload)
  {
    pattern: /\/events\/([^/]+)\/photos/,
    method: 'post',
    fn: () => ({ url: 'https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?w=400', message: '+10 puan kazandın! 📸' }),
  },

  // EVENTS /events/:id/comments (GET)
  {
    pattern: /\/events\/([^/]+)\/comments/,
    method: 'get',
    fn: (_url) => {
      const id = _url.match(/\/events\/([^/]+)\/comments/)?.[1] || '';
      return MOCK_COMMENTS.filter(c => c.event_id === id);
    },
  },

  // EVENTS /events/:id/comments (POST)
  {
    pattern: /\/events\/([^/]+)\/comments/,
    method: 'post',
    fn: (_url, _method, body) => {
      const id   = _url.match(/\/events\/([^/]+)\/comments/)?.[1] || '';
      const user = getSavedUser() || DEMO_USER;
      return {
        id:         'c-new-' + Date.now(),
        event_id:   id,
        user_id:    user.id,
        user:       { id: user.id, full_name: user.full_name, avatar_url: user.avatar_url, badge: user.badge },
        content:    body?.content || '',
        rating:     body?.rating,
        created_at: new Date().toISOString(),
      };
    },
  },

  // EVENTS /events/:id/participants
  {
    pattern: /\/events\/([^/]+)\/participants/,
    method: 'get',
    fn: () => MOCK_USERS.slice(0, 8).map(u => ({
      id: u.id, user_id: u.id, full_name: u.full_name,
      avatar_url: u.avatar_url, verified_at: null,
    })),
  },

  // EVENTS /events/:id/complete
  {
    pattern: /\/events\/([^/]+)\/complete/,
    method: 'post',
    fn: () => ({ message: 'Etkinlik tamamlandı! +25 puan kazandın 🎉' }),
  },

  // EVENTS /events/:id (GET — single event)
  {
    pattern: /\/events\/([^/]+)$/,
    method: 'get',
    fn: (_url) => {
      const id    = _url.match(/\/events\/([^/]+)$/)?.[1] || '';
      const event = getEventById(id);
      if (!event) throw { response: { status: 404, data: { detail: 'Etkinlik bulunamadı' } } };
      const user = getSavedUser();
      return enrichEvent(event, user?.id);
    },
  },

  // EVENTS /events (POST - create)
  {
    pattern: /\/events$/,
    method: 'post',
    fn: (_url, _method, body) => {
      const user = getSavedUser() || DEMO_USER;
      return {
        id:      'e-new-' + Date.now(),
        message: 'Etkinlik oluşturuldu! +50 puan kazandın 🎉',
        ...body,
        creator_id: user.id,
        status:     'active',
      };
    },
  },

  // LEADERBOARD
  {
    pattern: /\/leaderboard/,
    method: 'get',
    fn: (_url) => {
      const url  = new URL(_url, 'http://localhost');
      const city = url.searchParams.get('city') || '';
      let list   = [...MOCK_LEADERBOARD];
      if (city)  list = list.filter(e => e.user.city === city);

      // Demo kullanıcısını ekle
      const currentUser = getSavedUser();
      if (currentUser && !list.find(e => e.user.id === currentUser.id)) {
        list.push({
          rank:         list.length + 1,
          user:         { id: currentUser.id, full_name: currentUser.full_name, avatar_url: currentUser.avatar_url, badge: currentUser.badge, city: currentUser.city },
          total_points: currentUser.total_points,
          event_count:  Math.floor(currentUser.total_points / 80),
        });
      }
      return list.sort((a, b) => b.total_points - a.total_points).map((e, i) => ({ ...e, rank: i + 1 }));
    },
  },

  // REWARDS /rewards/my-unlocks
  {
    pattern: /\/rewards\/my-unlocks/,
    method: 'get',
    fn: () => {
      const user = getSavedUser() || DEMO_USER;
      return MOCK_REWARDS.filter(r => user.earned_points >= r.threshold);
    },
  },

  // REWARDS /rewards/certificate
  {
    pattern: /\/rewards\/certificate/,
    method: 'get',
    fn: () => {
      const user = getSavedUser() || DEMO_USER;
      if (user.earned_points < 500) {
        throw { response: { status: 403, data: { detail: 'Sertifika için 500 puan gerekli' } } };
      }
      // Mock PDF blob
      const text = `GönüllüAI Sertifikası\n\n${user.full_name}\n${user.earned_points} puan`;
      return new Blob([text], { type: 'application/pdf' });
    },
  },

  // REWARDS /rewards (list)
  {
    pattern: /\/rewards/,
    method: 'get',
    fn: () => MOCK_REWARDS,
  },

  // NOTIFICATIONS
  {
    pattern: /\/notifications\/unread-count/,
    fn: () => ({ count: 3 }),
  },
  {
    pattern: /\/notifications\/read-all/,
    fn: () => ({ message: 'Okundu' }),
  },
  {
    pattern: /\/notifications/,
    method: 'get',
    fn: () => [
      { id: 'n1', type: 'badge_unlocked',  message: '🎉 Aktif Gönüllü rozetini kazandın!',         is_read: false, created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString() },
      { id: 'n2', type: 'points_earned',   message: '⭐ Etkinliğe katılım için +20 puan kazandın!', is_read: false, created_at: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString() },
      { id: 'n3', type: 'event_reminder',  message: '📅 "Barınak Hayvanlarına Mama" yarın saat 10!', is_read: false, created_at: new Date(Date.now() - 10 * 60 * 60 * 1000).toISOString() },
      { id: 'n4', type: 'points_earned',   message: '📸 Fotoğraf yükleme için +10 puan!',           is_read: true,  created_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString() },
    ],
  },

  // CLUBS
  {
    pattern: /\/clubs\/([^/]+)\/join/,
    method: 'post',
    fn: () => ({ message: 'Kulübe katıldın!' }),
  },
  {
    pattern: /\/clubs\/([^/]+)\/events/,
    fn: (_url) => {
      const id = _url.match(/\/clubs\/([^/]+)\/events/)?.[1] || '';
      return MOCK_EVENTS.filter(e => e.club?.id === id);
    },
  },
  {
    pattern: /\/clubs\/([^/]+)$/,
    fn: (_url) => {
      const id = _url.match(/\/clubs\/([^/]+)$/)?.[1] || '';
      const club = MOCK_CLUBS.find(c => c.id === id);
      if (!club) throw { response: { status: 404, data: { detail: 'Kulüp bulunamadı' } } };
      return club;
    },
  },
  {
    pattern: /\/clubs/,
    method: 'get',
    fn: () => MOCK_CLUBS,
  },
  {
    pattern: /\/clubs/,
    method: 'post',
    fn: () => ({ id: 'club-new', message: 'Kulüp oluşturuldu, onay bekleniyor' }),
  },

  // USERS /users/:id/points
  {
    pattern: /\/users\/([^/]+)\/points/,
    fn: (_url) => {
      const id = _url.match(/\/users\/([^/]+)\/points/)?.[1] || '';
      return MOCK_POINT_HISTORY.filter(p => p.user_id === id || p.user_id === 'u-demo');
    },
  },

  // USERS /users/:id/events
  {
    pattern: /\/users\/([^/]+)\/events/,
    fn: (_url) => {
      const id = _url.match(/\/users\/([^/]+)\/events/)?.[1] || '';
      return getUserEvents(id);
    },
  },

  // USERS /users/me/avatar (upload — mock: localObjectURL)
  {
    pattern: /\/users\/me\/avatar/,
    method: 'post',
    fn: (_url, _method, body) => {
      const current = getSavedUser() || DEMO_USER;
      const file = (body as FormData)?.get?.('file') as File | null;
      const avatarUrl = file ? URL.createObjectURL(file) : current.avatar_url;
      const updated = { ...current, avatar_url: avatarUrl };
      localStorage.setItem(LOCAL_USER_KEY, JSON.stringify(updated));
      return { avatar_url: avatarUrl };
    },
  },

  // USERS /users/me (update)
  {
    pattern: /\/users\/me/,
    method: 'put',
    fn: (_url, _method, body) => {
      const current = getSavedUser() || DEMO_USER;
      const updated = { ...current, ...body };
      localStorage.setItem(LOCAL_USER_KEY, JSON.stringify(updated));
      return updated;
    },
  },

  // USERS /users/:id (GET)
  {
    pattern: /\/users\/([^/]+)$/,
    method: 'get',
    fn: (_url) => {
      const id   = _url.match(/\/users\/([^/]+)$/)?.[1] || '';
      const user = getUserById(id) || getSavedUser() || DEMO_USER;
      return user;
    },
  },
];

// ─── ANA DISPATCH FONKSİYONU ─────────────────────────────────────────────────

export async function handleMockRequest(url: string, method: string, body?: any): Promise<any> {
  await delay(300 + Math.random() * 200); // gerçekçi gecikme

  const m = method.toLowerCase();

  for (const handler of handlers) {
    if (!handler.pattern.test(url)) continue;
    if (handler.method && handler.method !== m) continue;

    try {
      const result = await handler.fn(url, m, body);
      return result;
    } catch (err) {
      throw err;
    }
  }

  // Eşleşen handler bulunamazsa boş dizi dön
  console.warn('[MockAPI] Handler bulunamadı:', method.toUpperCase(), url);
  return [];
}
