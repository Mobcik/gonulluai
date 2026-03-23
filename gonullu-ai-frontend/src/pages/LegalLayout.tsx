import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

interface LegalLayoutProps {
  title: string;
  children: ReactNode;
}

/** Yasal metinler için ortak üst bilgi ve okunabilir gövde */
const LegalLayout = ({ title, children }: LegalLayoutProps) => (
  <div className="min-h-screen pt-20 pb-16 bg-earth-lighter/50">
    <div className="max-w-2xl mx-auto px-4">
      <div className="flex flex-wrap gap-4 mb-8">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-sm text-text-soft font-medium hover:text-primary hover:underline"
        >
          <ArrowLeft size={16} aria-hidden />
          Ana sayfa
        </Link>
        <Link
          to="/register"
          className="inline-flex items-center gap-2 text-sm text-primary font-medium hover:underline"
        >
          Kayıt sayfası
        </Link>
      </div>

      <article className="bg-white rounded-2xl shadow-card border border-earth-lighter p-8 sm:p-10">
        <h1 className="font-display text-3xl font-bold text-text mb-2">{title}</h1>
        <p className="text-xs text-text-muted mb-8 pb-6 border-b border-earth-lighter">
          Son güncelleme: örnek metin — hukuki danışmanlık yerine geçmez.
        </p>
        <div className="prose prose-sm max-w-none text-text-soft space-y-4 [&_h2]:font-display [&_h2]:text-lg [&_h2]:text-text [&_h2]:mt-8 [&_h2]:mb-2">
          {children}
        </div>
      </article>
    </div>
  </div>
);

export default LegalLayout;
