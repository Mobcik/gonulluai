import type { User, Event, Club, LeaderboardEntry, PointTransaction, DigitalReward } from '../types';

// ─── KULLANICILAR ────────────────────────────────────────────────────────────

export const MOCK_USERS: User[] = [
  {
    id: 'u-selin',
    email: 'selin.arslan@gonulluai.com',
    full_name: 'Selin Arslan',
    avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Selin&backgroundColor=b6e3f4',
    city: 'İstanbul',
    bio: 'Çevre ve eğitim gönüllüsüyüm. Şehirdeki yeşil alanları korumak için mücadele ediyorum. 🌿',
    interests: ['Çevre', 'Eğitim', 'Hayvan Hakları'],
    skills: ['Organizasyon', 'İletişim', 'Fotoğrafçılık'],
    total_points: 4820,
    earned_points: 4820,
    badge: 'efsane',
    role: 'student',
    is_student: true,
    university_name: 'İstanbul Teknik Üniversitesi',
    streak_days: 28,
    created_at: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'u-mehmet',
    email: 'mehmet.kaya@itu.edu.tr',
    full_name: 'Mehmet Kaya',
    avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Mehmet&backgroundColor=ffdfbf',
    city: 'Ankara',
    bio: 'Yazılım mühendisliği öğrencisiyim. Teknoloji ile sosyal sorumluluk birleşince harika şeyler oluyor!',
    interests: ['Teknoloji', 'Eğitim', 'Çocuk Gelişimi'],
    skills: ['Programlama', 'Eğitim', 'Teknoloji'],
    total_points: 3240,
    earned_points: 3240,
    badge: 'lider',
    role: 'student',
    is_student: true,
    university_name: 'ODTÜ',
    streak_days: 14,
    created_at: new Date(Date.now() - 290 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'u-zeynep',
    email: 'zeynep.celik@ege.edu.tr',
    full_name: 'Zeynep Çelik',
    avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Zeynep&backgroundColor=c0aede',
    city: 'İzmir',
    bio: 'Ege kıyılarını temiz tutmak için çalışıyorum. Denizi seviyorum! 🌊',
    interests: ['Çevre', 'Sağlık', 'Sanat & Kültür'],
    skills: ['Fiziksel Aktivite', 'İletişim', 'Organizasyon'],
    total_points: 2980,
    earned_points: 2980,
    badge: 'lider',
    role: 'student',
    is_student: true,
    university_name: 'Ege Üniversitesi',
    streak_days: 21,
    created_at: new Date(Date.now() - 250 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'u-ali',
    email: 'ali.demir@gmail.com',
    full_name: 'Ali Demir',
    avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Ali&backgroundColor=d1d4f9',
    city: 'İstanbul',
    bio: 'Yaşlı bakımı ve hayvan hakları konusunda aktif olarak çalışıyorum.',
    interests: ['Yaşlı Bakımı', 'Hayvan Hakları', 'Sağlık'],
    skills: ['Empati', 'Sağlık', 'İletişim'],
    total_points: 1840,
    earned_points: 1840,
    badge: 'deneyimli',
    role: 'user',
    is_student: false,
    streak_days: 7,
    created_at: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'u-ayse',
    email: 'ayse.oz@uludag.edu.tr',
    full_name: 'Ayşe Öz',
    avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Ayse&backgroundColor=ffd5dc',
    city: 'Bursa',
    bio: 'Çocukların gelişimine katkı sağlamak için buradayım.',
    interests: ['Çocuk Gelişimi', 'Eğitim', 'Sanat & Kültür'],
    skills: ['Eğitim', 'İletişim', 'Sanat'],
    total_points: 1620,
    earned_points: 1620,
    badge: 'deneyimli',
    role: 'student',
    is_student: true,
    university_name: 'Uludağ Üniversitesi',
    streak_days: 5,
    created_at: new Date(Date.now() - 150 * 24 * 60 * 60 * 1000).toISOString(),
  },
  // Demo kullanıcısı (giriş yaparken kullanılır)
  {
    id: 'u-demo',
    email: 'demo@gonulluai.com',
    full_name: 'Demo Kullanıcı',
    avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Demo&backgroundColor=b6e3f4',
    city: 'İstanbul',
    bio: 'GönüllüAI\'ı deneyimliyorum!',
    interests: ['Çevre', 'Eğitim'],
    skills: ['İletişim'],
    total_points: 320,
    earned_points: 320,
    badge: 'aktif',
    role: 'user',
    is_student: false,
    streak_days: 3,
    created_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
  },
];

// ─── KULÜPLER ────────────────────────────────────────────────────────────────

export const MOCK_CLUBS: Club[] = [
  {
    id: 'club-itugd',
    name: 'İTÜ Gönüllüler Derneği',
    university: 'İstanbul Teknik Üniversitesi',
    logo_url: 'https://api.dicebear.com/7.x/shapes/svg?seed=ITU&backgroundColor=3D7A4F',
    description: 'İTÜ bünyesinde faaliyet gösteren gönüllülük kulübü. Çevre, eğitim ve sosyal sorumluluk projelerinde aktifiz.',
    member_count: 284,
    event_count: 47,
    verified: true,
    organizer_id: 'u-selin',
    created_at: new Date(Date.now() - 400 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'club-odtugk',
    name: 'ODTÜ Gönüllülük Kulübü',
    university: 'Orta Doğu Teknik Üniversitesi',
    logo_url: 'https://api.dicebear.com/7.x/shapes/svg?seed=ODTU&backgroundColor=6B4F2A',
    description: 'ODTÜ öğrencileri olarak topluma katkı sağlıyoruz. Teknoloji ve eğitim odaklı projeler.',
    member_count: 192,
    event_count: 31,
    verified: true,
    organizer_id: 'u-mehmet',
    created_at: new Date(Date.now() - 350 * 24 * 60 * 60 * 1000).toISOString(),
  },
];

// ─── ETKİNLİKLER ─────────────────────────────────────────────────────────────

const NEXT = (days: number, hour = 10) =>
  new Date(Date.now() + days * 24 * 60 * 60 * 1000 + hour * 60 * 60 * 1000).toISOString();

const PAST = (days: number) =>
  new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

export const MOCK_EVENTS: Event[] = [
  {
    id: 'e1',
    creator_id: 'u-selin',
    creator: { id: 'u-selin', full_name: 'Selin Arslan', avatar_url: MOCK_USERS[0].avatar_url, badge: 'efsane' },
    club: MOCK_CLUBS[0],
    title: 'Belgrad Ormanı Ağaç Dikme Etkinliği',
    short_description: '500 fidan dikiyoruz! Doğayı kurtarmak için el ele verelim.',
    description: `Sevgili gönüllüler,

Bu etkinlikte Belgrad Ormanı'nın yeniden yeşermesi için birlikte 500 fidan dikeceğiz.

**Etkinlik Detayları:**
Sabah 9:00'da toplanarak gruplara ayrılacağız. Her grup belirlenmiş bir alanda fidan dikimi yapacak. Öğle yemeği organizasyon tarafından karşılanmaktadır.

**Neden Katılmalısın?**
İstanbul'un akciğerleri olan Belgrad Ormanı, son yıllarda ciddi tahribat gördü. Bu etkinlikle ormanımızı geri kazanmak için küçük ama anlamlı bir adım atıyoruz.

Bize katılarak hem çevreye katkı sağlayabilir, hem de İTÜ Gönüllüler ailesinin bir parçası olabilirsiniz!`,
    category: 'Çevre',
    city: 'İstanbul',
    address: 'Belgrad Ormanı Girişi, Sarıyer',
    meeting_point: 'Ana otopark girişi — büyük yeşil afiş olan yer',
    event_date: NEXT(3),
    end_time: NEXT(3, 14),
    max_participants: 80,
    participant_count: 53,
    cover_photo_url: 'https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?w=800&q=80',
    required_skills: ['Fiziksel Aktivite'],
    preparation_notes: 'Rahat kıyafet ve yürüyüş ayakkabısı giy. Su şişesi, güneş kremi ve eldiven getirmeyi unutma! Kazma ve kürek tarafımızca sağlanacak.',
    status: 'active',
    verification_method: 'code',
    is_joined: false,
    is_creator: false,
    user_verified: false,
  },
  {
    id: 'e2',
    creator_id: 'u-mehmet',
    creator: { id: 'u-mehmet', full_name: 'Mehmet Kaya', avatar_url: MOCK_USERS[1].avatar_url, badge: 'lider' },
    club: MOCK_CLUBS[1],
    title: 'İlkokul Öğrencilerine Scratch Kodlama Atölyesi',
    short_description: 'Scratch ile çocuklara programlamayı öğretiyoruz. Geleceğin yazılımcılarını yetiştirelim!',
    description: `ODTÜ Gönüllülük Kulübü olarak bu ay ilkokul öğrencilerine yönelik bir kodlama atölyesi düzenliyoruz.

**Kime yönelik?**
Etkinliğimizde Ankara'daki 4 ilkokulun 3-5. sınıf öğrencilerine Scratch ile programlama temelleri öğreteceğiz.

**Gönüllülerden beklentimiz:**
- Sabırlı ve çocuklarla iyi iletişim kurabilen
- Temel bilgisayar bilgisi yeterli (Scratch önceden bilinmesi şart değil)
- En az 2 saat katılım

Gelecek nesle ilk kod satırlarını yazdırmak heyecan verici değil mi?`,
    category: 'Eğitim',
    city: 'Ankara',
    address: 'Çankaya İlkokulu, Çankaya',
    meeting_point: 'Okul ana girişi',
    event_date: NEXT(7),
    max_participants: 20,
    participant_count: 13,
    cover_photo_url: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800&q=80',
    required_skills: ['Teknoloji', 'Eğitim', 'İletişim'],
    preparation_notes: 'Dizüstü bilgisayarınızı getirmeniz büyük avantaj sağlar. Ama şart değil.',
    status: 'active',
    verification_method: 'qr',
    is_joined: false,
    is_creator: false,
    user_verified: false,
  },
  {
    id: 'e3',
    creator_id: 'u-zeynep',
    creator: { id: 'u-zeynep', full_name: 'Zeynep Çelik', avatar_url: MOCK_USERS[2].avatar_url, badge: 'lider' },
    title: 'Kordon Sahil Temizliği — İzmir',
    short_description: 'Körfezi plastik atıklardan temizliyoruz. İzmir\'imizi koruyalım!',
    description: `İzmir Körfezi'nin kirliliğiyle mücadele etmek için her ay sahil temizliği yapıyoruz.

Bu ay Kordon boyunca yaklaşık 3 km'lik bir alanda plastik atık toplama gerçekleştireceğiz.

**Toplanan atıklar:**
Toplanan plastikler, Çevre Bakanlığı'nın geri dönüşüm noktalarına iletilecek.

**Sizi Bekleyenler:**
- Deniz havası ve güzel İzmir manzarası
- Yeni gönüllü arkadaşlar
- Anlamlı bir sabah aktivitesi
- +35 puana kadar kazanç!`,
    category: 'Çevre',
    city: 'İzmir',
    address: 'Kordon, Alsancak',
    meeting_point: 'Büyük Saat önü',
    event_date: NEXT(5),
    max_participants: 60,
    participant_count: 41,
    cover_photo_url: 'https://images.unsplash.com/photo-1618477461853-cf6ed80faba5?w=800&q=80',
    required_skills: ['Fiziksel Aktivite'],
    preparation_notes: 'Eldiven tarafımızca verilecek. Güneş kremi ve su şişesi getirmenizi öneririz.',
    status: 'active',
    verification_method: 'code',
    is_joined: false,
    is_creator: false,
    user_verified: false,
  },
  {
    id: 'e4',
    creator_id: 'u-ali',
    creator: { id: 'u-ali', full_name: 'Ali Demir', avatar_url: MOCK_USERS[3].avatar_url, badge: 'deneyimli' },
    title: 'Huzurevi Ziyareti ve El Sanatları Atölyesi',
    short_description: 'Yaşlılarımızla vakit geçirip onlara el yapımı hediyeler götürüyoruz.',
    description: `Üsküdar'daki Huzurevi'ni ziyaret edecek ve sakinlerle birlikte el sanatları atölyesi düzenleyeceğiz.

**Programımız:**
- 14:00 — Huzurevi girişi ve tanışma
- 14:30 — El sanatları atölyesi (origami, boyama)
- 15:30 — Çay saati ve sohbet
- 16:30 — Veda

Her ziyaretimizde sakinlerimizin gözlerindeki ışık bizi bir kez daha motive ediyor. Siz de bu güzel deneyime ortak olun!`,
    category: 'Yaşlı Bakımı',
    city: 'İstanbul',
    address: 'Üsküdar Huzurevi, Üsküdar',
    meeting_point: 'Huzurevi ana kapısı',
    event_date: NEXT(10),
    max_participants: 15,
    participant_count: 10,
    cover_photo_url: 'https://images.unsplash.com/photo-1573497620053-ea5300f94f21?w=800&q=80',
    required_skills: ['Empati', 'İletişim', 'Sanat'],
    preparation_notes: 'Küçük bir hediye (çiçek, meyve, el işi) getirirseniz çok sevinirler. Sakin, yumuşak bir tavır bekleniyor.',
    status: 'active',
    verification_method: 'code',
    is_joined: false,
    is_creator: false,
    user_verified: false,
  },
  {
    id: 'e5',
    creator_id: 'u-ayse',
    creator: { id: 'u-ayse', full_name: 'Ayşe Öz', avatar_url: MOCK_USERS[4].avatar_url, badge: 'deneyimli' },
    title: 'Barınak Hayvanlarına Mama Dağıtımı — Bursa',
    short_description: 'Bursa\'daki 3 barınakta kalan köpek ve kedilere mama götürüyoruz.',
    description: `Bursa Büyükşehir Belediyesi'ne bağlı 3 hayvan barınağını ziyaret edip mama ve malzeme dağıtacağız.

**Desteklenecek Barınaklar:**
1. Nilüfer Hayvan Barınağı
2. Osmangazi Hayvan Koruma Merkezi
3. Yıldırım Geçici Bakım Evi

**Nasıl Katılabilirsiniz:**
- Maddi destek: Mama, mama kabı, oyuncak getirebilirsiniz
- Manevi destek: Hayvanlarla vakit geçirmek bile büyük anlam taşıyor

Her yıl binlerce hayvan barınaklarda sahip bekliyor. Küçük bir ziyaret, bir can için çok büyük anlam ifade ediyor.`,
    category: 'Hayvan Hakları',
    city: 'Bursa',
    address: 'Nilüfer Hayvan Barınağı, Nilüfer',
    meeting_point: 'Barınak ana girişi',
    event_date: NEXT(2),
    max_participants: 25,
    participant_count: 18,
    cover_photo_url: 'https://images.unsplash.com/photo-1601758124510-52d02ddb7cbd?w=800&q=80',
    required_skills: ['Hayvan Sevgisi'],
    preparation_notes: 'Mama veya oyuncak getirebilirsiniz ama zorunlu değil. Yedek kıyafet almanızı öneririz.',
    status: 'active',
    verification_method: 'code',
    is_joined: true,
    is_creator: false,
    user_verified: false,
  },
  {
    id: 'e6',
    creator_id: 'u-selin',
    creator: { id: 'u-selin', full_name: 'Selin Arslan', avatar_url: MOCK_USERS[0].avatar_url, badge: 'efsane' },
    title: 'Topkapı Sarayı Müze Rehberlik Gönüllülüğü',
    short_description: 'Ziyaretçilere ücretsiz Türkçe ve İngilizce tur rehberliği yapıyoruz.',
    description: `Topkapı Sarayı'nda yerli ve yabancı ziyaretçilere gönüllü rehberlik yapıyoruz.

**Gereksinimler:**
- Türk tarihi hakkında temel bilgi
- En az B2 seviye İngilizce
- Samimi ve iletişime açık kişilik

Her hafta sonu düzenlenen bu etkinlikte hem tarihi öğreniyor hem de dünyadan insanlarla tanışıyoruz!`,
    category: 'Sanat & Kültür',
    city: 'İstanbul',
    address: 'Topkapı Sarayı Müzesi, Fatih',
    meeting_point: 'Müze giriş kapısı (Bab-ı Hümayun)',
    event_date: NEXT(14),
    max_participants: 10,
    participant_count: 6,
    cover_photo_url: 'https://images.unsplash.com/photo-1524231757912-21f4fe3a7200?w=800&q=80',
    required_skills: ['Tarih', 'İletişim', 'Yabancı Dil'],
    preparation_notes: 'Müze giriş kartınızı önceden almanızı öneririz. Etkinliğe özel indirimli giriş için koordinatörümüzle iletişime geçin.',
    status: 'active',
    verification_method: 'qr',
    is_joined: false,
    is_creator: false,
    user_verified: false,
  },
  {
    id: 'e7',
    creator_id: 'u-mehmet',
    creator: { id: 'u-mehmet', full_name: 'Mehmet Kaya', avatar_url: MOCK_USERS[1].avatar_url, badge: 'lider' },
    title: 'Kırsal Okullara Kitap ve Tablet Bağışı',
    short_description: 'Ankara çevresindeki 5 köy okuluna kitap ve tablet götürüyoruz.',
    description: `ODTÜ Gönüllülük Kulübü olarak köy okulları projesini sürdürüyoruz.

Bu ay 5 köy okulunu ziyaret edip öğrencilere bağış kitapları ve 20 tablet dağıtacağız.

**Toplanacak Bağışlar:**
- Çocuk kitabı (her yaş)
- Okul malzemeleri (defter, kalem)
- Tablet / eski ancak çalışır dizüstü

Teknoloji erişimi olmayan çocuklara dijital dünyayı açmak için sizin desteğinize ihtiyacımız var!`,
    category: 'Çocuk Gelişimi',
    city: 'Ankara',
    address: 'ODTÜ Kampüsü Buluşma, sonra araçla köylere',
    meeting_point: 'ODTÜ Orta Kapı',
    event_date: NEXT(6),
    max_participants: 30,
    participant_count: 30,
    cover_photo_url: 'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=800&q=80',
    required_skills: ['Eğitim', 'Organizasyon'],
    preparation_notes: 'Bağış getirmek isteyen arkadaşlar önceden bizimle iletişime geçsin. Araba olanlar öncelikli.',
    status: 'full',
    verification_method: 'code',
    is_joined: false,
    is_creator: false,
    user_verified: false,
  },
  {
    id: 'e8',
    creator_id: 'u-zeynep',
    creator: { id: 'u-zeynep', full_name: 'Zeynep Çelik', avatar_url: MOCK_USERS[2].avatar_url, badge: 'lider' },
    title: 'Gönüllü Sağlık Taraması — Konak',
    short_description: 'Gönüllü doktorlarla birlikte ücretsiz sağlık taraması yapıyoruz.',
    description: `İzmir Tabip Odası iş birliğiyle Konak ilçesinde dezavantajlı mahallelerde ücretsiz sağlık taraması düzenliyoruz.

**Sunulacak Hizmetler:**
- Kan basıncı ölçümü
- Kan şekeri testi
- Genel sağlık değerlendirmesi
- Uzman doktor konsültasyonu

Gönüllü sağlık personeli ve koordinasyon gönüllüsü arıyoruz.`,
    category: 'Sağlık',
    city: 'İzmir',
    address: 'Konak Mahallesi Muhtarlığı',
    meeting_point: 'Muhtarlık binası önü',
    event_date: NEXT(20),
    max_participants: 100,
    participant_count: 42,
    cover_photo_url: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=800&q=80',
    required_skills: ['Sağlık', 'İletişim'],
    preparation_notes: 'Tıp/sağlık öğrencileri ve gönüllü hekimler öncelikli değerlendirilecektir.',
    status: 'active',
    verification_method: 'qr',
    is_joined: false,
    is_creator: false,
    user_verified: false,
  },
  // Tamamlanmış etkinlik
  {
    id: 'e9',
    creator_id: 'u-selin',
    creator: { id: 'u-selin', full_name: 'Selin Arslan', avatar_url: MOCK_USERS[0].avatar_url, badge: 'efsane' },
    title: 'Çevre Haftası — Park Temizliği',
    short_description: 'Maslak Parkı\'nı birlikte temizledik. Harika bir gündü!',
    description: 'Geçen ay gerçekleştirdiğimiz park temizliği etkinliği büyük ilgi gördü.',
    category: 'Çevre',
    city: 'İstanbul',
    event_date: PAST(15),
    participant_count: 67,
    max_participants: 80,
    cover_photo_url: 'https://images.unsplash.com/photo-1556075798-4825dfaaf498?w=800&q=80',
    required_skills: [],
    status: 'completed',
    verification_method: 'code',
    is_joined: true,
    is_creator: false,
    user_verified: true,
  },
];

// ─── PUAN GEÇMİŞİ ────────────────────────────────────────────────────────────

export const MOCK_POINT_HISTORY: PointTransaction[] = [
  { id: 'pt1', user_id: 'u-demo', points: 30,  reason: 'profile_complete',    created_at: new Date(Date.now() - 29 * 24 * 60 * 60 * 1000).toISOString() },
  { id: 'pt2', user_id: 'u-demo', points: 20,  reason: 'event_join',          event_id: 'e3', created_at: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000).toISOString() },
  { id: 'pt3', user_id: 'u-demo', points: 15,  reason: 'attendance_verified', event_id: 'e3', created_at: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000).toISOString() },
  { id: 'pt4', user_id: 'u-demo', points: 10,  reason: 'photo_upload',        event_id: 'e3', created_at: new Date(Date.now() - 24 * 24 * 60 * 60 * 1000).toISOString() },
  { id: 'pt5', user_id: 'u-demo', points: 5,   reason: 'comment',             event_id: 'e3', created_at: new Date(Date.now() - 24 * 24 * 60 * 60 * 1000).toISOString() },
  { id: 'pt6', user_id: 'u-demo', points: 50,  reason: 'event_create',        event_id: 'e5', created_at: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString() },
  { id: 'pt7', user_id: 'u-demo', points: 40,  reason: 'streak_7',            created_at: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString() },
  { id: 'pt8', user_id: 'u-demo', points: 20,  reason: 'event_join',          event_id: 'e9', created_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString() },
  { id: 'pt9', user_id: 'u-demo', points: 15,  reason: 'attendance_verified', event_id: 'e9', created_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString() },
  { id: 'pt10',user_id: 'u-demo', points: 25,  reason: 'invite_friend',       created_at: new Date(Date.now() -  5 * 24 * 60 * 60 * 1000).toISOString() },
  { id: 'pt11',user_id: 'u-demo', points: 20,  reason: 'event_join',          event_id: 'e5', created_at: new Date(Date.now() -  3 * 24 * 60 * 60 * 1000).toISOString() },
  { id: 'pt12',user_id: 'u-demo', points: 10,  reason: 'photo_upload',        event_id: 'e5', created_at: new Date(Date.now() -  2 * 24 * 60 * 60 * 1000).toISOString() },
  { id: 'pt13',user_id: 'u-demo', points: 5,   reason: 'comment',             event_id: 'e5', created_at: new Date(Date.now() -  1 * 24 * 60 * 60 * 1000).toISOString() },
  { id: 'pt14',user_id: 'u-demo', points: -5,  reason: 'late_cancel',         created_at: new Date(Date.now() - 40 * 24 * 60 * 60 * 1000).toISOString() },
];

// ─── LİDERLİK TABLOSU ────────────────────────────────────────────────────────

export const MOCK_LEADERBOARD: LeaderboardEntry[] = MOCK_USERS
  .filter(u => u.id !== 'u-demo')
  .sort((a, b) => b.total_points - a.total_points)
  .map((u, i) => ({
    rank: i + 1,
    user: {
      id:         u.id,
      full_name:  u.full_name,
      avatar_url: u.avatar_url,
      badge:      u.badge,
      city:       u.city,
    },
    total_points: u.total_points,
    event_count:  Math.floor(u.total_points / 80),
  }));

// ─── ÖDÜLLER ─────────────────────────────────────────────────────────────────

export const MOCK_REWARDS: DigitalReward[] = [
  { id: 'r1', name: 'Filizlendi',             description: 'Gönüllülük yolculuğuna ilk adımı attın!',          threshold: 100,  icon: '🌱', type: 'badge' },
  { id: 'r2', name: 'Aktif Gönüllü Çerçevesi',description: 'Özel profil çerçevesi ve liderlik tablosu ikonu',  threshold: 300,  icon: '🏅', type: 'frame' },
  { id: 'r3', name: 'Gönüllülük Sertifikası', description: 'Resmi PDF sertifikan hazır, indirip paylaşabilirsin!', threshold: 500, icon: '📜', type: 'certificate' },
  { id: 'r4', name: 'Ağaç Dikti',             description: 'Çevreye katkın dijital rozetinle tescillendi!',    threshold: 750,  icon: '🌳', type: 'badge' },
  { id: 'r5', name: 'Gönüllü Lideri Unvanı',  description: 'Altın profil çerçevesi + Gönüllü Lideri unvanı',  threshold: 1000, icon: '⭐', type: 'title' },
  { id: 'r6', name: 'Efsane Gönüllü',         description: 'Animasyonlu özel rozet + sosyal medya paylaşım kartı', threshold: 1500, icon: '🏆', type: 'badge' },
];

// ─── YORUMLAR ─────────────────────────────────────────────────────────────────

export const MOCK_COMMENTS = [
  {
    id: 'c1',
    event_id: 'e1',
    user_id: 'u-ali',
    user: { id: 'u-ali', full_name: 'Ali Demir', avatar_url: MOCK_USERS[3].avatar_url, badge: 'deneyimli' as const },
    content: 'Geçen seneki etkinlikte de vardım, çok güzeldi! Bu sefer daha fazla fidan dikeceğiz diye çok heyecanlıyım 🌳',
    rating: undefined,
    created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'c2',
    event_id: 'e1',
    user_id: 'u-ayse',
    user: { id: 'u-ayse', full_name: 'Ayşe Öz', avatar_url: MOCK_USERS[4].avatar_url, badge: 'deneyimli' as const },
    content: 'Bursa\'dan katılmak istiyorum, araçla gelmek mümkün mü? Yanımda 3 arkadaşım var.',
    rating: undefined,
    created_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'c3',
    event_id: 'e1',
    user_id: 'u-selin',
    user: { id: 'u-selin', full_name: 'Selin Arslan', avatar_url: MOCK_USERS[0].avatar_url, badge: 'efsane' as const },
    content: 'Evet Ayşe Hanım, geniş otopark mevcut! Araçla rahatça gelebilirsiniz. Sizi bekliyoruz! 🌿',
    rating: undefined,
    created_at: new Date(Date.now() - 20 * 60 * 60 * 1000).toISOString(),
  },
];

// ─── YARDIMCI ─────────────────────────────────────────────────────────────────

export const delay = (ms = 400) => new Promise(resolve => setTimeout(resolve, ms));

export const getEventById = (id: string) => MOCK_EVENTS.find(e => e.id === id) ?? null;
export const getUserById  = (id: string) => MOCK_USERS.find(u => u.id === id) ?? null;
export const getUserEvents = (userId: string) => MOCK_EVENTS.filter(
  e => e.creator_id === userId || (userId === 'u-demo' && (e.is_joined || e.status === 'completed'))
);
