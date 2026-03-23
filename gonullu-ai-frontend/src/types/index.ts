export type UserRole    = 'user' | 'student' | 'club_organizer' | 'admin';
export type UserBadge   = 'filiz' | 'genc' | 'aktif' | 'deneyimli' | 'lider' | 'efsane';
export type EventStatus = 'draft' | 'pending' | 'active' | 'full' | 'ongoing' | 'completed' | 'cancelled';
export type EventCategory =
  | 'Çevre' | 'Eğitim' | 'Sağlık' | 'Hayvan Hakları'
  | 'Yaşlı Bakımı' | 'Çocuk Gelişimi' | 'Teknoloji' | 'Sanat & Kültür';

export type NotificationType =
  | 'event_join'
  | 'attendance_verified'
  | 'event_complete'
  | 'badge_unlocked'
  | 'reward_unlocked'
  | 'event_reminder'
  | 'late_cancel'
  | 'photo_upload'
  | 'comment';

export type VerificationMethod = 'qr' | 'code' | 'none';
export type RewardType         = 'badge' | 'frame' | 'certificate' | 'title';

export interface User {
  id:               string;
  email:            string;
  full_name:        string;
  avatar_url?:      string;
  city?:            string;
  bio?:             string;
  interests:        string[];
  skills:           string[];
  total_points:     number;
  earned_points:    number;
  badge:            UserBadge;
  role:             UserRole;
  is_student:       boolean;
  university_name?: string;
  club_id?:         string;
  streak_days:      number;
  /** Etkinlik hatırlatıcı e-postaları (24s / 1s önce). Varsayılan açık. */
  email_event_reminders?: boolean;
  email_weekly_digest?: boolean;
  created_at:       string;
}

export interface Event {
  id:                  string;
  creator_id:          string;
  creator:             Pick<User, 'id' | 'full_name' | 'avatar_url' | 'badge'>;
  club?:               Club;
  title:               string;
  short_description:   string;
  description:         string;
  category:            EventCategory;
  city:                string;
  address?:            string;
  meeting_point?:      string;
  event_date:          string;
  end_time?:           string;
  max_participants?:   number;
  participant_count:   number;
  cover_photo_url?:    string;
  required_skills:     string[];
  preparation_notes?:  string;
  contact_info?:       string;
  status:              EventStatus;
  verification_method: VerificationMethod;
  is_joined?:          boolean;
  is_creator?:         boolean;
  user_verified?:      boolean;
}

export interface Club {
  id:            string;
  name:          string;
  university:    string;
  logo_url?:     string;
  description?:  string;
  announcement?: string | null;
  member_count:  number;
  event_count:   number;
  verified:      boolean;
  organizer_id:  string;
  created_at:    string;
}

export interface PointTransaction {
  id:         string;
  user_id:    string;
  points:     number;
  reason:     string;
  event_id?:  string;
  created_at: string;
}

export interface Notification {
  id:         string;
  user_id:    string;
  type:       NotificationType;
  message:    string;
  is_read:    boolean;
  created_at: string;
}

export interface LeaderboardEntry {
  rank:         number;
  user:         Pick<User, 'id' | 'full_name' | 'avatar_url' | 'badge' | 'city'>;
  total_points: number;
  event_count:  number;
}

export interface DigitalReward {
  id:          string;
  name:        string;
  description: string;
  threshold:   number;
  icon:        string;
  type:        RewardType;
}

export interface PhotoItem {
  id:          string;
  event_id:    string;
  uploader_id: string;
  photo_url:   string;
  created_at:  string;
  uploader?:   Pick<User, 'id' | 'full_name' | 'avatar_url'>;
}

export interface Comment {
  id:         string;
  event_id:   string;
  user_id:    string;
  user:       Pick<User, 'id' | 'full_name' | 'avatar_url' | 'badge'>;
  content:    string;
  rating?:    number;
  created_at: string;
}
