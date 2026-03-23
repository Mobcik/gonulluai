import LegalLayout from './LegalLayout';

const LegalPrivacy = () => (
  <LegalLayout title="Gizlilik Politikası">
    <p>
      GönüllüAI olarak kişisel verilerine saygı duyuyoruz. Bu metin, hangi verileri neden işlediğimizi özetler; kesin
      hukuki metin için kurumunuzun gereksinimlerine göre güncellenmelidir.
    </p>

    <h2>Toplanan veriler</h2>
    <p>
      Hesap oluştururken ad, e-posta, şehir ve tercihen profil bilgileri (ilgi alanları, yetenekler vb.) saklanabilir.
      Etkinlik katılımı, puanlar ve bildirimler hizmetin işleyişi için kaydedilir.
    </p>

    <h2>Kullanım amaçları</h2>
    <p>
      Veriler; oturum açma, etkinlik önerileri, puan ve rozet sistemi, güvenlik ve yasal yükümlülüklerin yerine
      getirilmesi amacıyla işlenir. Yapay zeka özellikleri açık olduğunda, öneri üretmek için profil ve etkinlik
      verileri ilgili servislere gönderilebilir.
    </p>

    <h2>Çerezler ve yerel depolama</h2>
    <p>
      Oturumun için tarayıcıda token (ör. JWT) saklanabilir. Üçüncü taraf analitik kullanılıyorsa ayrıca bilgilendirme
      yapılmalıdır.
    </p>

    <h2>Hakların</h2>
    <p>
      KVKK ve GDPR kapsamında erişim, düzeltme, silme ve itiraz hakların olabilir. Taleplerin için uygulama içi destek
      veya belirlenen iletişim adresini kullan.
    </p>

    <h2>İletişim</h2>
    <p>
      Gizlilik ile ilgili soruların için platform yöneticisi ile iletişime geçebilirsin.
    </p>
  </LegalLayout>
);

export default LegalPrivacy;
