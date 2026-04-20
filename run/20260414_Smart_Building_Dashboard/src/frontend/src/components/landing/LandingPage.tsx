'use client';

import Link from 'next/link';
import {
  Building2,
  ChevronRight,
  PlayCircle,
  Leaf,
  Wrench,
  Lightbulb,
  ShieldCheck,
  Server,
  Briefcase,
  Hotel,
  TrendingUp,
  Activity,
  Cpu,
  KeyRound,
  CalendarCheck,
  Car,
  AlertTriangle,
  CheckCircle2,
  Sparkles,
  Users,
  Phone,
  Mail,
  MapPin,
  ArrowRight,
} from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white text-slate-900">
      <Navbar />
      <Hero />
      <Challenges />
      <Solution />
      <Verticals />
      <Features />
      <OperationalExcellence />
      <WhyIntegra />
      <Testimonials />
      <Cta />
      <Footer />
    </div>
  );
}

/* ---------------------------------------------------------------- Navbar */
function Navbar() {
  return (
    <header className="sticky top-0 z-40 bg-white/80 backdrop-blur border-b border-slate-100">
      <div className="max-w-7xl mx-auto flex items-center justify-between px-4 sm:px-6 py-4">
        <Link href="/" className="flex items-center gap-2">
          <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-blue-600 to-cyan-500 flex items-center justify-center text-white">
            <Building2 className="h-5 w-5" />
          </div>
          <div className="leading-tight">
            <p className="font-bold text-slate-900">INTEGRA</p>
            <p className="text-[10px] tracking-widest text-slate-500">SMART BUILDING</p>
          </div>
        </Link>
        <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-slate-700">
          <a href="#solusi" className="hover:text-blue-600">Solusi</a>
          <a href="#fitur" className="hover:text-blue-600">Fitur</a>
          <a href="#keunggulan" className="hover:text-blue-600">Keunggulan</a>
          <a href="#testimoni" className="hover:text-blue-600">Klien</a>
          <a href="#kontak" className="hover:text-blue-600">Kontak</a>
        </nav>
        <div className="flex items-center gap-2">
          <Link
            href="/login"
            className="hidden sm:inline-flex items-center gap-1.5 text-sm font-semibold text-blue-700 px-3 py-2 rounded-lg hover:bg-blue-50"
          >
            Masuk
          </Link>
          <a
            href="#kontak"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg shadow-sm"
          >
            Kontak
          </a>
        </div>
      </div>
    </header>
  );
}

/* ----------------------------------------------------------------- Hero */
function Hero() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-sky-50 via-white to-emerald-50">
      {/* Decorative blobs */}
      <div className="absolute -left-24 top-20 h-72 w-72 rounded-full bg-emerald-200/40 blur-3xl" />
      <div className="absolute right-0 bottom-0 h-96 w-96 rounded-full bg-sky-200/40 blur-3xl" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 py-16 lg:py-24 grid lg:grid-cols-2 gap-12 items-center">
        <div>
          <p className="text-xs font-bold tracking-widest text-blue-700 mb-4">
            INTEGRA SMART BUILDING PLATFORM
          </p>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-slate-900 leading-[1.1]">
            Transformasi Gedung Anda Menjadi <span className="text-blue-600">Pintar</span>,{' '}
            <span className="text-emerald-600">Efisien</span> & Modern
          </h1>
          <p className="mt-5 text-lg text-slate-600 max-w-xl">
            Platform Operasional Terintegrasi untuk Data Center, Perkantoran, dan Hospitality.
            Capai keunggulan operasional total dengan IoT, Digital Twin, dan AI Predictive Maintenance.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <a
              href="#kontak"
              className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold px-5 py-3 rounded-xl shadow-md shadow-blue-600/20"
            >
              Minta Demo Gratis <ChevronRight className="h-4 w-4" />
            </a>
            <a
              href="#fitur"
              className="inline-flex items-center gap-2 text-slate-700 hover:text-blue-600 font-semibold px-5 py-3 rounded-xl border border-slate-200 bg-white"
            >
              <PlayCircle className="h-5 w-5" /> Pelajari Lebih Lanjut
            </a>
          </div>
          <div className="mt-10 flex items-center gap-6 text-xs text-slate-500">
            <span className="flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-emerald-500" /> OWASP Compliant</span>
            <span className="flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-emerald-500" /> NIST Aligned</span>
            <span className="flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-emerald-500" /> Zero-Knowledge</span>
          </div>
        </div>

        {/* Isometric building illustration (CSS art) */}
        <div className="relative">
          <div className="aspect-square max-w-[520px] mx-auto relative">
            <div className="absolute inset-6 rounded-[3rem] bg-gradient-to-tr from-emerald-100 to-sky-100" />
            <BuildingIllustration />
          </div>
        </div>
      </div>
    </section>
  );
}

function BuildingIllustration() {
  return (
    <svg
      viewBox="0 0 400 400"
      className="absolute inset-0 w-full h-full drop-shadow-xl"
      aria-hidden
    >
      <defs>
        <linearGradient id="bldg" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#1e3a8a" />
          <stop offset="1" stopColor="#0e7490" />
        </linearGradient>
        <linearGradient id="glow" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0" stopColor="#22d3ee" />
          <stop offset="1" stopColor="#3b82f6" />
        </linearGradient>
      </defs>
      {/* Ground */}
      <ellipse cx="200" cy="340" rx="180" ry="22" fill="#86efac" opacity="0.5" />
      {/* Building base (isometric tower) */}
      <polygon points="120,120 200,80 280,120 280,300 200,340 120,300" fill="url(#bldg)" />
      <polygon points="120,120 200,80 280,120 200,160" fill="#0c4a6e" />
      <polygon points="200,160 280,120 280,300 200,340" fill="#155e75" />
      {/* Windows grid (left face) */}
      {[0, 1, 2, 3, 4, 5].map((row) =>
        [0, 1, 2].map((col) => (
          <rect
            key={`l-${row}-${col}`}
            x={132 + col * 22}
            y={170 + row * 24}
            width="14"
            height="14"
            fill="url(#glow)"
            opacity={Math.random() > 0.4 ? 1 : 0.35}
            rx="1"
          />
        ))
      )}
      {/* Windows grid (right face) */}
      {[0, 1, 2, 3, 4, 5].map((row) =>
        [0, 1, 2].map((col) => (
          <rect
            key={`r-${row}-${col}`}
            x={212 + col * 22}
            y={170 + row * 24}
            width="14"
            height="14"
            fill="#67e8f9"
            opacity={Math.random() > 0.4 ? 0.9 : 0.3}
            rx="1"
          />
        ))
      )}
      {/* Antenna / sensor */}
      <line x1="200" y1="80" x2="200" y2="40" stroke="#22d3ee" strokeWidth="3" />
      <circle cx="200" cy="38" r="6" fill="#22d3ee" />
      <circle cx="200" cy="38" r="14" fill="#22d3ee" opacity="0.2" />
      {/* IoT sensor pings */}
      <circle cx="80" cy="140" r="6" fill="#fbbf24" />
      <circle cx="80" cy="140" r="14" fill="#fbbf24" opacity="0.25" />
      <circle cx="320" cy="180" r="6" fill="#34d399" />
      <circle cx="320" cy="180" r="14" fill="#34d399" opacity="0.25" />
    </svg>
  );
}

/* --------------------------------------------------------- Challenges */
function Challenges() {
  const items = [
    {
      icon: TrendingUp,
      title: 'Biaya Energi Tinggi',
      desc: 'Pengeluaran energi gedung tradisional membengkak tanpa visibilitas konsumsi real-time.',
      color: 'text-emerald-600 bg-emerald-50',
    },
    {
      icon: Wrench,
      title: 'Pemeliharaan Reaktif',
      desc: 'Kerusakan aset baru ditangani saat sudah berdampak ke tenant — bukan dicegah.',
      color: 'text-amber-600 bg-amber-50',
    },
    {
      icon: Cpu,
      title: 'Sistem Terfragmentasi',
      desc: 'HVAC, security, akses, dan billing berjalan terpisah tanpa data terkonsolidasi.',
      color: 'text-blue-600 bg-blue-50',
    },
  ];
  return (
    <section className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold text-slate-900">
            Tantangan Pengelolaan Gedung Modern
          </h2>
          <p className="mt-3 text-slate-600">
            Operator gedung saat ini menghadapi tekanan efisiensi, regulasi ESG,
            dan tuntutan pengalaman pengguna kelas atas.
          </p>
        </div>
        <div className="grid md:grid-cols-3 gap-6">
          {items.map((it) => (
            <div
              key={it.title}
              className="rounded-2xl border border-slate-100 p-6 hover:shadow-lg hover:-translate-y-1 transition"
            >
              <div className={`h-12 w-12 rounded-xl flex items-center justify-center ${it.color}`}>
                <it.icon className="h-6 w-6" />
              </div>
              <h3 className="mt-4 text-lg font-semibold text-slate-900">{it.title}</h3>
              <p className="mt-2 text-sm text-slate-600 leading-relaxed">{it.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------------------------------------------------------- Solution */
function Solution() {
  return (
    <section id="solusi" className="py-20 bg-gradient-to-br from-emerald-50 to-sky-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 grid lg:grid-cols-2 gap-12 items-center">
        <div>
          <h2 className="text-3xl sm:text-4xl font-bold text-slate-900">
            Solusi Platform <span className="text-blue-600">Smart Building</span> Kami
          </h2>
          <p className="mt-4 text-slate-600 leading-relaxed">
            INTEGRA mengonsolidasikan IoT sensor, sistem akses, billing energi, dan
            analytics ke dalam satu Command Center berbasis Digital Twin. Data
            real-time dari Modbus/BACnet langsung tersinkron ke dashboard CFO, CEO,
            hingga teknisi lapangan.
          </p>
          <ul className="mt-6 space-y-3">
            {[
              'Microservices architecture untuk skalabilitas tanpa downtime',
              'Zero-Knowledge Encryption pada data tenant sensitif',
              'IAM dengan biometrik, BLE, dan NFC untuk akses gedung',
              'IoT Gateway low-latency dengan ingest protokol industri',
            ].map((s) => (
              <li key={s} className="flex items-start gap-2">
                <CheckCircle2 className="h-5 w-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                <span className="text-slate-700 text-sm">{s}</span>
              </li>
            ))}
          </ul>
          <a
            href="#kontak"
            className="mt-8 inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold px-5 py-3 rounded-xl"
          >
            Pelajari Demo Gratis <ArrowRight className="h-4 w-4" />
          </a>
        </div>
        <DashboardMockup theme="light" />
      </div>
    </section>
  );
}

/* --------------------------------------------------------- Verticals */
function Verticals() {
  const verticals = [
    {
      icon: Server,
      title: 'Data Center Building Management',
      desc: 'PUE monitoring, rack-level power, cooling redundancy, dan biometric security untuk fasilitas mission-critical.',
      kpis: ['PUE 1.32', 'Uptime 99.99%', 'Anomaly < 30s'],
      color: 'from-blue-600 to-cyan-500',
      href: '/dashboard?vertical=data_center',
    },
    {
      icon: Briefcase,
      title: 'Office Building Management',
      desc: 'Booking ruang rapat, HVAC otomatis, smart parking, helpdesk tenant, dan tenant satisfaction tracking.',
      kpis: ['Energy −28% YoY', 'Booking 4K/mo', 'NPS 72'],
      color: 'from-emerald-600 to-teal-500',
      href: '/dashboard?vertical=office',
    },
    {
      icon: Hotel,
      title: 'Hospitality Management',
      desc: 'Hotel & apartment: room status, mobile key, housekeeping workflow, guest services, hingga F&B integration.',
      kpis: ['Occupancy 86%', 'RevPAR +12%', 'MTTR 18m'],
      color: 'from-amber-500 to-rose-500',
      href: '/dashboard?vertical=hospitality',
    },
  ];
  return (
    <section className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <p className="text-xs font-bold tracking-widest text-blue-700">3 VERTIKAL UTAMA</p>
          <h2 className="mt-2 text-3xl sm:text-4xl font-bold text-slate-900">
            Satu Platform, Tiga Industri
          </h2>
          <p className="mt-3 text-slate-600">
            INTEGRA disesuaikan untuk kebutuhan operasional setiap tipe gedung.
          </p>
        </div>
        <div className="grid md:grid-cols-3 gap-6">
          {verticals.map((v) => (
            <Link
              key={v.title}
              href={v.href}
              className="group rounded-2xl border border-slate-100 p-6 hover:border-blue-200 hover:shadow-xl transition"
            >
              <div className={`h-14 w-14 rounded-xl bg-gradient-to-br ${v.color} flex items-center justify-center text-white shadow-lg`}>
                <v.icon className="h-7 w-7" />
              </div>
              <h3 className="mt-5 text-xl font-bold text-slate-900">{v.title}</h3>
              <p className="mt-2 text-sm text-slate-600 leading-relaxed">{v.desc}</p>
              <div className="mt-5 flex flex-wrap gap-2">
                {v.kpis.map((k) => (
                  <span key={k} className="text-[11px] font-semibold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-full">
                    {k}
                  </span>
                ))}
              </div>
              <div className="mt-5 inline-flex items-center gap-1 text-blue-600 font-semibold text-sm group-hover:gap-2 transition-all">
                Lihat Dashboard <ArrowRight className="h-4 w-4" />
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ----------------------------------------------------------- Features */
function Features() {
  const items = [
    { icon: Leaf, title: 'Optimasi Energi Cerdas', desc: 'AI mengatur HVAC & lighting berdasarkan okupansi real-time.', metric: 'Hingga −28% biaya' },
    { icon: Wrench, title: 'Pemeliharaan Prediktif', desc: 'ML memantau getaran chiller & beban transformer.', metric: 'MTTR turun 45%' },
    { icon: Lightbulb, title: 'Manajemen HVAC & Pencahayaan', desc: 'Booking otomatis sinkron dengan suhu & lampu.', metric: 'Efisiensi +35%' },
    { icon: ShieldCheck, title: 'Keamanan Terintegrasi', desc: 'Biometric, BLE, NFC dengan immutable audit log.', metric: 'OWASP & NIST' },
    { icon: KeyRound, title: 'Digital Key & Akses', desc: 'Akses nirsentuh ke pintu, lift, dan ruangan via smartphone.', metric: '< 200ms unlock' },
    { icon: CalendarCheck, title: 'Booking Engine', desc: 'Reservasi ruang rapat & fasilitas terintegrasi HVAC.', metric: '4K+ booking/bln' },
    { icon: Car, title: 'Smart Parking & EV', desc: 'Reservasi slot ANPR dan pembayaran EV charging.', metric: 'ANPR 99.5%' },
    { icon: Activity, title: 'Automated Ticketing', desc: 'Laporan tenant otomatis menjadi work order ber-SLA.', metric: 'SLA tracked 24/7' },
  ];
  return (
    <section id="fitur" className="py-20 bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold text-slate-900">
            Fitur Utama untuk Efisiensi & Keunggulan
          </h2>
          <p className="mt-3 text-slate-600">
            Setiap modul berkolaborasi melalui Digital Twin untuk pengalaman terpadu.
          </p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {items.map((it) => (
            <div
              key={it.title}
              className="bg-white rounded-2xl p-5 border border-slate-100 hover:shadow-lg hover:border-blue-100 transition"
            >
              <div className="h-11 w-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <it.icon className="h-5 w-5" />
              </div>
              <h3 className="mt-4 font-semibold text-slate-900">{it.title}</h3>
              <p className="mt-1.5 text-xs text-slate-600 leading-relaxed">{it.desc}</p>
              <p className="mt-3 text-[11px] font-bold tracking-wide text-blue-700">
                {it.metric}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------------------------------------------- Operational Excellence */
function OperationalExcellence() {
  return (
    <section id="keunggulan" className="py-20 bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 relative overflow-hidden">
      {/* Schematic grid */}
      <div
        className="absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage:
            'linear-gradient(#22d3ee 1px, transparent 1px), linear-gradient(90deg, #22d3ee 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }}
      />
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 grid lg:grid-cols-2 gap-12 items-center">
        <div>
          <p className="text-xs font-bold tracking-widest text-cyan-400">EXECUTIVE COMMAND CENTER</p>
          <h2 className="mt-3 text-3xl sm:text-4xl font-bold text-white leading-tight">
            Mencapai <span className="text-cyan-400">Operational Excellence</span> Tanpa Kompromi
          </h2>
          <p className="mt-4 text-slate-300 leading-relaxed">
            Tiga dashboard eksekutif memastikan visibilitas penuh: ESG &amp; Sustainability,
            Financial Optimization, dan Operational Excellence — siap untuk kebutuhan
            CEO, CFO, dan Building Operator Anda.
          </p>
          <div className="mt-8 grid sm:grid-cols-3 gap-4">
            {[
              { label: 'Energy Saved', value: '28%', tone: 'text-emerald-400' },
              { label: 'OPEX Reduction', value: '−45%', tone: 'text-cyan-400' },
              { label: 'Tenant Satisfaction', value: '94%', tone: 'text-blue-400' },
            ].map((s) => (
              <div key={s.label} className="rounded-xl border border-cyan-500/20 bg-white/5 p-4">
                <p className={`text-2xl font-extrabold ${s.tone}`}>{s.value}</p>
                <p className="mt-1 text-xs text-slate-400">{s.label}</p>
              </div>
            ))}
          </div>
          <Link
            href="/login"
            className="mt-8 inline-flex items-center gap-2 bg-cyan-500 hover:bg-cyan-400 text-slate-900 font-bold px-5 py-3 rounded-xl shadow-lg shadow-cyan-500/20"
          >
            Coba Dashboard Live <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        <DashboardMockup theme="dark" />
      </div>
    </section>
  );
}

/* ------------------------------------------------------- Why Integra */
function WhyIntegra() {
  const items = [
    { icon: Sparkles, title: 'Skalabilitas Microservices', desc: 'Tambah modul baru tanpa downtime atau refaktor besar.' },
    { icon: Activity, title: 'Antarmuka Intuitif', desc: 'Dirancang untuk eksekutif, teknisi lapangan, dan tenant.' },
    { icon: Users, title: 'Dukungan Ahli 24/7', desc: 'Tim engineer siap pendampingan onboarding & operasi.' },
  ];
  return (
    <section className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 text-center">
        <h2 className="text-3xl sm:text-4xl font-bold text-slate-900">Mengapa Memilih INTEGRA?</h2>
        <div className="mt-12 grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {items.map((it) => (
            <div key={it.title}>
              <div className="h-14 w-14 rounded-full bg-emerald-50 text-emerald-600 mx-auto flex items-center justify-center">
                <it.icon className="h-7 w-7" />
              </div>
              <h3 className="mt-4 font-semibold text-slate-900">{it.title}</h3>
              <p className="mt-2 text-sm text-slate-600 leading-relaxed max-w-xs mx-auto">{it.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------ Testimonials */
function Testimonials() {
  const items = [
    {
      logo: 'Properti Jaya',
      role: 'Property Manager',
      name: 'Pranoto',
      quote:
        'Sejak migrasi ke INTEGRA, biaya energi gedung HQ kami turun 24% dalam 6 bulan dan tiket teknisi tertangani 3× lebih cepat.',
    },
    {
      logo: 'Perkantoran Maju',
      role: 'Finance Manager',
      name: 'Rahmania',
      quote:
        'Dashboard CFO membantu kami mendeteksi revenue leakage parkir senilai ratusan juta per tahun yang sebelumnya tidak terlihat.',
    },
    {
      logo: 'Hotel Damai',
      role: 'GM, Hospitality',
      name: 'Wahono',
      quote:
        'Mobile key dan housekeeping workflow INTEGRA meningkatkan kepuasan tamu kami secara signifikan — RevPAR naik 12%.',
    },
  ];
  return (
    <section id="testimoni" className="py-20 bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 text-center">
          Testimoni & Klien Kami
        </h2>
        <div className="mt-12 grid md:grid-cols-3 gap-6">
          {items.map((t) => (
            <div key={t.logo} className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
              <div className="flex items-center gap-2 text-blue-700 font-bold">
                <Building2 className="h-5 w-5" /> {t.logo}
              </div>
              <p className="mt-4 text-sm text-slate-700 leading-relaxed">"{t.quote}"</p>
              <div className="mt-5 flex items-center gap-3 pt-4 border-t border-slate-100">
                <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center text-white text-sm font-bold">
                  {t.name.charAt(0)}
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-900">{t.name}</p>
                  <p className="text-xs text-slate-500">{t.role}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------- CTA */
function Cta() {
  return (
    <section id="kontak" className="py-20 bg-gradient-to-br from-blue-700 via-blue-800 to-slate-900 relative overflow-hidden">
      <div className="absolute inset-0 opacity-10" style={{
        backgroundImage: 'radial-gradient(#22d3ee 1px, transparent 1px)',
        backgroundSize: '24px 24px',
      }} />
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 grid lg:grid-cols-2 gap-12 items-center">
        <div>
          <h2 className="text-3xl sm:text-4xl font-bold text-white leading-tight">
            Siap Memodernisasi Gedung Anda?
          </h2>
          <p className="mt-4 text-blue-100 text-lg">Hubungi Kami & Jadwalkan Demo</p>
          <p className="mt-3 text-sm text-blue-200 max-w-md">
            Tim solution architect kami akan memandu Anda menyusun roadmap
            digitalisasi gedung yang sesuai kebutuhan industri Anda.
          </p>
          <div className="mt-6 space-y-2 text-sm text-blue-100">
            <p className="flex items-center gap-2"><Phone className="h-4 w-4" /> +62 21 1234 5678</p>
            <p className="flex items-center gap-2"><Mail className="h-4 w-4" /> hello@integra-smartbuilding.com</p>
            <p className="flex items-center gap-2"><MapPin className="h-4 w-4" /> Jakarta · Singapore · Kuala Lumpur</p>
          </div>
        </div>
        <ContactForm />
      </div>
    </section>
  );
}

function ContactForm() {
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        alert('Terima kasih! Tim kami akan menghubungi Anda dalam 1x24 jam.');
      }}
      className="bg-white/10 backdrop-blur border border-cyan-400/20 rounded-2xl p-6 space-y-3"
    >
      {[
        { label: 'Nama', name: 'name' },
        { label: 'Email', name: 'email', type: 'email' },
        { label: 'Perusahaan', name: 'company' },
      ].map((f) => (
        <div key={f.name}>
          <label className="block text-xs font-semibold text-blue-100 mb-1">{f.label}</label>
          <input
            type={f.type ?? 'text'}
            required
            name={f.name}
            className="w-full bg-white/90 text-slate-900 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-400"
          />
        </div>
      ))}
      <div>
        <label className="block text-xs font-semibold text-blue-100 mb-1">Pesan</label>
        <textarea
          required
          rows={3}
          className="w-full bg-white/90 text-slate-900 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-400"
        />
      </div>
      <button
        type="submit"
        className="w-full bg-gradient-to-r from-cyan-400 to-emerald-400 text-slate-900 font-bold py-3 rounded-lg hover:opacity-90 transition"
      >
        Dapatkan Demo Sekarang
      </button>
    </form>
  );
}

/* --------------------------------------------------------- Footer */
function Footer() {
  return (
    <footer className="bg-slate-950 text-slate-400 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 grid md:grid-cols-4 gap-8 text-sm">
        <div>
          <div className="flex items-center gap-2 text-white font-bold mb-3">
            <Building2 className="h-5 w-5 text-cyan-400" /> INTEGRA
          </div>
          <p className="text-xs leading-relaxed">
            Smart Building Super App — Efficiency, Modernity, Operational Excellence.
          </p>
        </div>
        <div>
          <p className="text-white font-semibold mb-3">Solusi</p>
          <ul className="space-y-1.5 text-xs">
            <li>Data Center</li>
            <li>Office Building</li>
            <li>Hospitality</li>
          </ul>
        </div>
        <div>
          <p className="text-white font-semibold mb-3">Sumber Daya</p>
          <ul className="space-y-1.5 text-xs">
            <li>Dokumentasi</li>
            <li>API Reference</li>
            <li>Status Sistem</li>
          </ul>
        </div>
        <div>
          <p className="text-white font-semibold mb-3">Kontak</p>
          <ul className="space-y-1.5 text-xs">
            <li>hello@integra-smartbuilding.com</li>
            <li>+62 21 1234 5678</li>
            <li>Jakarta, Indonesia</li>
          </ul>
        </div>
      </div>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 mt-10 pt-6 border-t border-slate-800 flex flex-wrap items-center justify-between text-xs">
        <p>© {new Date().getFullYear()} INTEGRA Smart Building. All rights reserved.</p>
        <p className="opacity-70">OWASP · NIST · ISO 27001 Aligned</p>
      </div>
    </footer>
  );
}

/* ----------------------------------------------- Dashboard Mockup */
function DashboardMockup({ theme }: { theme: 'light' | 'dark' }) {
  const dark = theme === 'dark';
  const surface = dark ? 'bg-slate-900 border-cyan-500/20' : 'bg-white border-slate-200';
  const cardBg = dark ? 'bg-slate-800/70' : 'bg-slate-50';
  const text = dark ? 'text-slate-100' : 'text-slate-900';
  const muted = dark ? 'text-slate-400' : 'text-slate-500';
  const accent = dark ? 'text-cyan-400' : 'text-blue-600';

  const bars = [40, 65, 50, 80, 55, 90, 70, 85, 60, 75, 45, 88];

  return (
    <div className={`relative rounded-2xl border ${surface} shadow-2xl p-4 sm:p-6 max-w-xl mx-auto w-full`}>
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className={`text-xs ${muted}`}>INTEGRA · Command Center</p>
          <p className={`font-bold ${text}`}>Building Health Overview</p>
        </div>
        <div className={`text-[10px] px-2 py-1 rounded-full ${dark ? 'bg-emerald-500/15 text-emerald-400' : 'bg-emerald-50 text-emerald-700'}`}>
          ● Live
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-4">
        {[
          { label: 'Energy Saved', value: '28%', tone: 'emerald' },
          { label: 'OPEX', value: '−45%', tone: 'cyan' },
          { label: 'Satisfaction', value: '94%', tone: 'blue' },
        ].map((s) => (
          <div key={s.label} className={`rounded-xl p-3 ${cardBg}`}>
            <p className={`text-xs ${muted}`}>{s.label}</p>
            <p className={`mt-1 text-xl font-extrabold ${accent}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Sparkline */}
      <div className={`rounded-xl p-3 ${cardBg} mb-3`}>
        <p className={`text-xs ${muted} mb-2`}>Energy Intensity (kWh/m²)</p>
        <svg viewBox="0 0 200 60" className="w-full h-16">
          <polyline
            fill="none"
            stroke={dark ? '#22d3ee' : '#2563eb'}
            strokeWidth="2"
            points="0,40 20,30 40,38 60,22 80,28 100,15 120,20 140,10 160,18 180,8 200,12"
          />
          <polyline
            fill={dark ? 'rgba(34,211,238,0.15)' : 'rgba(37,99,235,0.1)'}
            stroke="none"
            points="0,40 20,30 40,38 60,22 80,28 100,15 120,20 140,10 160,18 180,8 200,12 200,60 0,60"
          />
        </svg>
      </div>

      {/* Bar chart */}
      <div className={`rounded-xl p-3 ${cardBg}`}>
        <p className={`text-xs ${muted} mb-2`}>Monthly Insights</p>
        <div className="flex items-end gap-1.5 h-20">
          {bars.map((h, i) => (
            <div
              key={i}
              style={{ height: `${h}%` }}
              className={`flex-1 rounded-sm ${
                dark
                  ? i % 3 === 0
                    ? 'bg-cyan-400'
                    : 'bg-cyan-700'
                  : i % 3 === 0
                  ? 'bg-blue-500'
                  : 'bg-emerald-400'
              }`}
            />
          ))}
        </div>
      </div>

      {/* Floating alert */}
      <div className={`absolute -bottom-3 -right-3 hidden sm:flex items-center gap-2 ${dark ? 'bg-amber-500/90' : 'bg-amber-400'} text-slate-900 rounded-xl px-3 py-2 shadow-lg`}>
        <AlertTriangle className="h-4 w-4" />
        <span className="text-xs font-bold">Chiller-02 anomaly</span>
      </div>
    </div>
  );
}
