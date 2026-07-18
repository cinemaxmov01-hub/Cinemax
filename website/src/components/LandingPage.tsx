import React from "react";
import { useApp } from "../context/AppContext";
import { tmdb, getImageUrl } from "../utils/tmdb";
import { Movie } from "../types";
import { Footer } from "./Footer";
import {
  Bookmark,
  Bot,
  MonitorSmartphone,
  ChevronDown,
  Mail,
  Lock,
  ArrowRight,
  ArrowLeft,
  Shield,
  Mic,
  Loader2,
  Code2,
  Globe2,
  MapPin,
  UserRound,
} from "lucide-react";
import { CinemaxLogo } from "./CinemaxLogo";

const REASONS = [
  {
    icon: Bot,
    title: "AI Help Desk",
    description: "All Kiki's answers questions, curates picks, and can even adjust your settings - just ask.",
    accent: "from-[#39FF14]/20 to-transparent text-[#39FF14]",
  },
  {
    icon: Mic,
    title: "Voice Search",
    description: "Use voice commands to search for movies, ask questions, and navigate the site hands-free.",
    accent: "from-sky-400/20 to-transparent text-sky-400",
  },
  {
    icon: Bookmark,
    title: "Smart Watchlist",
    description: "Favorite titles, build a watchlist, and pick up exactly where you left off.",
    accent: "from-fuchsia-400/20 to-transparent text-fuchsia-400",
  },
  {
    icon: MonitorSmartphone,
    title: "Every Device",
    description: "A responsive, installable experience that feels native on desktop, tablet, and mobile.",
    accent: "from-amber-400/20 to-transparent text-amber-400",
  },
];

const FAQS = [
  {
    q: "What makes Cinemax different from other streaming platforms?",
    a: "Cinemax isn't just another streaming site—it's your intelligent entertainment companion. Unlike traditional platforms that simply host content, Cinemax uses advanced AI to understand your unique tastes and curate personalized recommendations. Our AI assistant, All Kiki's, learns from your viewing history, preferences, and even your mood to suggest titles you'll genuinely love. Plus, with features like voice search, offline downloads, and a stunning modern interface, Cinemax transforms how you discover and enjoy movies and TV shows.",
  },
  {
    q: "Is Cinemax really free? What's the catch?",
    a: "Absolutely! Cinemax is 100% free to use with no hidden fees, subscriptions, or premium tiers. You can create an account, build unlimited watchlists, access our AI-powered recommendations, and use all core features without spending a dime. We believe great entertainment should be accessible to everyone. Our platform is supported by minimal, non-intrusive ads that help us keep the lights on while delivering you an exceptional experience. No credit card required, no trial periods—just pure entertainment freedom.",
  },
  {
    q: "How does the AI assistant (All Kiki's) enhance my experience?",
    a: "All Kiki's is like having a personal entertainment concierge available 24/7. This intelligent AI understands natural language, so you can ask questions like 'What are some mind-bending sci-fi movies similar to Inception?' or 'Show me comedies from the 90s' and get instant, accurate recommendations. It can analyze your viewing patterns to suggest hidden gems you might have missed, help you discover new genres, and even adjust your account settings when you request it. The AI always confirms before making changes, ensuring you stay in control while enjoying personalized assistance.",
  },
  {
    q: "What is Voice Search and how does it work?",
    a: "Voice Search revolutionizes how you navigate Cinemax. Instead of typing, simply click the microphone icon and speak naturally—you can search for specific titles, ask for recommendations by genre or mood, find movies featuring your favorite actors, or even request content from a particular year. Our voice recognition understands context and intent, making it feel like you're conversing with a knowledgeable friend. It's perfect for when you're relaxing on the couch, cooking, or just want a hands-free experience. Voice Search works seamlessly on both desktop and mobile devices.",
  },
  {
    q: "Can I watch content offline or download movies?",
    a: "Yes! Cinemax supports offline viewing through our download feature. You can save movies and TV shows directly to your device, allowing you to watch them anywhere—even without an internet connection. This is perfect for long flights, road trips, or areas with limited connectivity. Our smart download system optimizes storage while maintaining quality, and you can manage your downloaded library easily. Downloads are saved securely to your device and can be removed anytime to free up space. It's entertainment on your terms, wherever you go.",
  },
  {
    q: "How do I install Cinemax as an app on my device?",
    a: "Installing Cinemax as an app is incredibly simple and works on both desktop and mobile. When you visit Cinemax in your browser, you'll see an 'Install App' option—just click it, and Cinemax will be installed directly on your device like any other app. This gives you quick access from your home screen, faster loading times, and a more app-like experience with full-screen viewing. No app store downloads needed—everything happens right in your browser. It's the perfect way to make Cinemax feel like a native part of your device.",
  },
  {
    q: "How secure is my personal data on Cinemax?",
    a: "Your privacy and security are our top priorities. Cinemax uses industry-standard encryption to protect your personal information, and we never sell your data to third parties. Your viewing history, preferences, and account details are stored securely and used solely to enhance your experience. We implement robust security measures to prevent unauthorized access, and you have full control over your data—you can delete your account and all associated data anytime. We believe in transparency, so our privacy policy clearly explains how we handle your information. Trust is the foundation of our service.",
  },
  {
    q: "What devices and browsers does Cinemax support?",
    a: "Cinemax is designed to work seamlessly across virtually all modern devices and browsers. Whether you're using a desktop computer (Windows, Mac, Linux), a laptop, a tablet (iPad, Android tablets), or a smartphone (iPhone, Android), Cinemax delivers a consistent, optimized experience. We support all major browsers including Chrome, Firefox, Safari, Edge, and Opera. Our responsive design automatically adapts to your screen size, ensuring you get the best possible viewing experience whether you're on a large monitor or a small phone screen.",
  },
];

const HERO_ROTATE_MS = 6500;

export const LandingPage: React.FC = () => {
  const { enterAsGuest, signIn, openAuthModal, openForgotPasswordModal, authError } = useApp();

  const [openFaq, setOpenFaq] = React.useState<number | null>(0);

  // --- Hero carousel state -------------------------------------------------
  const [heroMovies, setHeroMovies] = React.useState<Movie[]>([]);
  const [heroIndex, setHeroIndex] = React.useState(0);

  React.useEffect(() => {
    tmdb.getTrendingMovies().then((movies) => {
      setHeroMovies(movies.filter((m) => m.backdrop_path).slice(0, 8));
    }).catch(() => setHeroMovies([]));
  }, []);

  // Auto-rotate the featured movie
  React.useEffect(() => {
    if (heroMovies.length < 2) return;
    const rotateTimer = setInterval(() => {
      setHeroIndex((i: number) => (i + 1) % heroMovies.length);
    }, 5000);
    return () => clearInterval(rotateTimer);
  }, [heroMovies.length]);

  const featuredMovie = heroMovies[heroIndex];

  // --- Email to password sign-in flow ---------------------------------------
  const [step, setStep] = React.useState<"email" | "password">("email");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [signInError, setSignInError] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);

  const handleEmailSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setSignInError("Please enter a valid email address.");
      return;
    }
    setSignInError(null);
    setStep("password");
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) {
      setSignInError("Please enter your password.");
      return;
    }
    setSignInError(null);
    setSubmitting(true);
    const result = await signIn(email, password);
    setSubmitting(false);
    if (!result.ok) {
      setSignInError(result.error || "Couldn't sign you in - check your email and password.");
    }
    // If successful, the main App component will handle the transition
  };

  return (
    <div id="landing-page" className="min-h-screen bg-[#0a0a0a] text-white overflow-x-hidden on-dark-bg">
      {/* HERO */}
      <section className="relative min-h-screen flex flex-col">
        {/* Sliding image-only carousel. No trailer or movie autoplay on the first page. */}
        <div className="absolute inset-0 overflow-hidden bg-[#0a0a0a]">
          {heroMovies.map((movie: Movie, idx: number) => (
            <div
              key={movie.id}
              className="absolute inset-0 transition-transform duration-1000 ease-in-out"
              style={{ transform: `translateX(${(idx - heroIndex) * 100}%)` }}
            >
              <img
                src={getImageUrl(movie.backdrop_path, "original")}
                alt=""
                className="h-full w-full object-cover"
                referrerPolicy="no-referrer"
              />
              <div className="absolute bottom-8 left-4 right-4 hidden sm:block">
                <p className="max-w-xl truncate text-xs font-black uppercase tracking-[0.35em] text-white/45">
                  {movie.title || movie.name}
                </p>
              </div>
            </div>
          ))}
        </div>
        <div className="absolute inset-0 bg-gradient-to-b from-black/85 via-black/75 to-[#050505]" />
        <div className="absolute inset-0 bg-gradient-radial-overlay" />

        {/* Header */}
        <header className="relative z-10 flex items-center justify-between px-4 sm:px-12 py-4 sm:py-6">
          <div className="flex items-center gap-2">
            <CinemaxLogo compact className="scale-[0.9]" />
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              id="landing-signup-btn"
              onClick={() => openAuthModal("signup")}
              className="neon-btn text-xs sm:text-sm font-extrabold px-4 sm:px-6 py-2.5 sm:py-3 rounded-xl transition-all cursor-pointer"
            >
              Sign Up
            </button>
            <button
              id="landing-header-signin-btn"
              onClick={() => openAuthModal("signin")}
              className="hidden sm:inline-flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-xl border border-white/10 bg-white/5 text-neutral-200 hover:bg-white/8 transition-colors cursor-pointer"
            >
              Sign In
            </button>
          </div>
        </header>

        {/* Hero content */}
        <div className="relative z-10 flex-1 flex flex-col items-center justify-center text-center px-4 sm:px-6 max-w-3xl mx-auto py-8 sm:py-0">
          <div className="mb-6 flex items-center justify-center">
            <CinemaxLogo className="scale-[1.05] sm:scale-[1.2]" />
          </div>

          {/* Tagline */}
          <p className="text-neutral-300 text-base sm:text-lg font-semibold max-w-xl mb-2">
            Welcome to Cinemax! Enjoy new trend movies and TV shows.
          </p>
          {featuredMovie && (
            <p className="text-[11px] text-neutral-500 font-semibold uppercase tracking-widest mb-6">
              Now Featuring - {featuredMovie.title || featuredMovie.name}
            </p>
          )}

          {/* Email to Password Sign-In flow */}
          <div className="w-full max-w-lg">
            {step === "email" ? (
              <form id="landing-email-form" onSubmit={handleEmailSubmit} className="w-full flex flex-col sm:flex-row gap-2.5 sm:gap-3">
                <div className="relative flex-1">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-500" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
                    placeholder="Email address"
                    aria-label="Email address"
                    className="w-full surface-input rounded-xl pl-11 pr-4 py-2.5 sm:py-3.5 text-sm placeholder:text-neutral-500 transition-colors focus:outline-none"
                  />
                </div>
                <button
                  id="landing-continue-btn"
                  type="submit"
                  className="neon-btn flex items-center justify-center gap-2 font-extrabold px-4 sm:px-6 py-2.5 sm:py-3.5 rounded-xl text-sm uppercase tracking-wide transition-all cursor-pointer whitespace-nowrap"
                >
                  Continue
                  <ArrowRight className="h-4 w-4" />
                </button>
              </form>
            ) : (
              <form id="landing-password-form" onSubmit={handlePasswordSubmit} className="w-full flex flex-col sm:flex-row gap-2.5 sm:gap-3 animate-fade-in">
                <div className="relative flex-1">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-500" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
                    placeholder={`Password for ${email}`}
                    aria-label="Password"
                    autoFocus
                    className="w-full surface-input rounded-xl pl-11 pr-4 py-2.5 sm:py-3.5 text-sm placeholder:text-neutral-500 transition-colors focus:outline-none"
                  />
                </div>
                <button
                  id="landing-signin-submit-btn"
                  type="submit"
                  disabled={submitting}
                  className="neon-btn flex items-center justify-center gap-2 font-extrabold px-4 sm:px-6 py-2.5 sm:py-3.5 rounded-xl text-sm uppercase tracking-wide transition-all cursor-pointer whitespace-nowrap disabled:opacity-60"
                >
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <>Sign In <ArrowRight className="h-4 w-4" /></>}
                </button>
              </form>
            )}

            {step === "email" && (
              <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-center">
                <button
                  type="button"
                  onClick={() => openForgotPasswordModal()}
                  className="w-full sm:w-auto btn-forgot px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wide cursor-pointer"
                >
                  Forgot Password
                </button>
                <button
                  type="button"
                  onClick={() => openAuthModal("signin")}
                  className="w-full sm:w-auto rounded-xl border border-white/15 bg-white/5 px-4 py-2.5 text-xs font-bold uppercase tracking-wide text-neutral-200 transition hover:bg-white/10 cursor-pointer"
                >
                  Sign In
                </button>
              </div>
            )}

            {step === "password" && (
              <div className="mt-3 flex flex-col items-center gap-2">
                <button
                  type="button"
                  onClick={() => { setStep("email"); setSignInError(null); }}
                  className="flex items-center gap-1 text-[11px] text-neutral-500 hover:text-white transition-colors cursor-pointer"
                >
                  <ArrowLeft className="h-3 w-3" />
                  Use a different email
                </button>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <button
                    type="button"
                    onClick={() => openForgotPasswordModal()}
                    className="btn-forgot px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wide cursor-pointer"
                  >
                    Forgot Password
                  </button>
                  <button
                    type="button"
                    onClick={() => openAuthModal("signin")}
                    className="rounded-xl border border-white/15 bg-white/5 px-4 py-2.5 text-xs font-bold uppercase tracking-wide text-neutral-200 transition hover:bg-white/10 cursor-pointer"
                  >
                    Sign In
                  </button>
                </div>
              </div>
            )}

            {(signInError || authError) && (
              <p className="text-xs text-rose-400 font-semibold mt-3">{signInError || authError}</p>
            )}

            <p className="text-[11px] text-neutral-600 mt-4">
              New to Cinemax?{" "}
              <button type="button" onClick={() => openAuthModal("signup")} className="text-[#39FF14] hover:underline font-bold cursor-pointer">
                Create an account
              </button>
            </p>
          </div>

          <p className="flex items-center gap-1.5 text-[11px] text-neutral-600 mt-5">
            <Shield className="h-3.5 w-3.5" />
            No credit card required. Cancel anytime.
          </p>
        </div>

        {/* Carousel dot indicators */}
        {heroMovies.length > 1 && (
          <div className="relative z-10 flex justify-center gap-1.5 pb-6">
            {heroMovies.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setHeroIndex(idx)}
                aria-label={`Show featured title ${idx + 1}`}
                className={`h-1.5 rounded-full transition-all cursor-pointer ${
                  idx === heroIndex ? "w-6 bg-[#39FF14]" : "w-1.5 bg-white/25 hover:bg-white/50"
                }`}
              />
            ))}
          </div>
        )}

        <div className="relative z-10 flex justify-center pb-6">
          <ChevronDown className="h-5 w-5 text-neutral-600 animate-bounce" />
        </div>
      </section>

      {/* MORE REASONS TO JOIN */}
      <section className="relative z-10 px-6 sm:px-12 py-20 max-w-6xl mx-auto">
        <h2 className="font-sans text-2xl sm:text-3xl font-black mb-10">More Reasons to Join</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {REASONS.map((r) => {
            const Icon = r.icon;
            return (
              <div
                key={r.title}
                className={`relative rounded-3xl p-6 glass-card overflow-hidden group hover:-translate-y-1 transition-transform duration-300`}
              >
                <div className={`absolute inset-0 bg-gradient-to-br ${r.accent} opacity-40 group-hover:opacity-60 transition-opacity`} />
                <div className="relative z-10">
                  <div className={`h-11 w-11 rounded-2xl bg-white/10 border border-white/10 flex items-center justify-center mb-6 ${r.accent.split(" ").pop()}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="font-sans font-bold text-lg text-white mb-2">{r.title}</h3>
                  <p className="text-xs text-neutral-400 leading-relaxed">{r.description}</p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* FAQ */}
      <section className="relative z-10 px-6 sm:px-12 pb-24 max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="font-sans text-3xl sm:text-4xl font-black text-white mb-3">
            Frequently Asked Questions
          </h2>
          <p className="text-sm text-neutral-400 max-w-xl mx-auto">
            Everything you need to know about Cinemax. Can't find what you're looking for? 
            <span className="text-[#39FF14]"> Ask our AI assistant</span>.
          </p>
        </div>
        
        <div className="space-y-4">
          {FAQS.map((faq, idx) => {
            const isOpen = openFaq === idx;
            return (
              <div 
                key={idx} 
                className={`group rounded-2xl overflow-hidden transition-all duration-300 ${
                  isOpen 
                    ? "bg-gradient-to-br from-[#39FF14]/10 to-transparent border-[#39FF14]/30 shadow-[0_0_30px_rgba(57,255,20,0.15)]" 
                    : "bg-white/5 border-white/10 hover:border-white/20 hover:bg-white/8"
                } border`}
              >
                <button
                  onClick={() => setOpenFaq(isOpen ? null : idx)}
                  className="w-full flex items-center justify-between gap-4 px-6 py-5 text-left cursor-pointer"
                  aria-expanded={isOpen}
                >
                  <div className="flex items-center gap-4 flex-1">
                    <div className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-300 ${
                      isOpen 
                        ? "bg-[#39FF14] text-black" 
                        : "bg-white/10 text-neutral-400 group-hover:bg-white/15"
                    }`}>
                      <span className="font-bold text-sm">{idx + 1}</span>
                    </div>
                    <span className={`font-semibold text-sm sm:text-base transition-colors ${
                      isOpen ? "text-[#39FF14]" : "text-white"
                    }`}>
                      {faq.q}
                    </span>
                  </div>
                  <ChevronDown 
                    className={`h-5 w-5 flex-shrink-0 transition-all duration-300 ${
                      isOpen 
                        ? "rotate-180 text-[#39FF14]" 
                        : "text-neutral-500 group-hover:text-neutral-300"
                    }`} 
                  />
                </button>
                <div
                  className="grid transition-all duration-300 ease-out"
                  style={{ gridTemplateRows: isOpen ? "1fr" : "0fr" }}
                >
                  <div className="overflow-hidden">
                    <div className="px-6 pb-5 pt-2">
                      <p className="text-sm text-neutral-300 leading-relaxed pl-12">
                        {faq.a}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-12 text-center">
          <div className="inline-flex items-center gap-3 px-6 py-3 rounded-full bg-gradient-to-r from-[#39FF14]/10 to-transparent border border-[#39FF14]/30">
            <Shield className="h-5 w-5 text-[#39FF14]" />
            <span className="text-sm text-neutral-300">
              Still have questions? <span className="text-[#39FF14] font-semibold">Contact our support team</span>
            </span>
          </div>
        </div>
      </section>

      {/* Developer Credit */}
      <section className="relative z-10 px-4 sm:px-12 pb-24 max-w-4xl mx-auto">
        <div
          id="developer-credit-card"
          className="relative overflow-hidden rounded-[1.5rem] border border-[#39FF14]/25 bg-[#030806] p-4 shadow-2xl sm:rounded-[2rem] sm:p-6"
        >
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_20%,rgba(57,255,20,0.18),transparent_34%),linear-gradient(90deg,rgba(255,255,255,0.04),transparent_40%,rgba(57,255,20,0.08))]" />
          <div className="absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-[#39FF14]/80 to-transparent" />

          <div className="relative grid items-center gap-6 lg:grid-cols-[1fr_0.8fr]">
            <div className="mx-auto w-full max-w-sm">
              <div className="mb-6 flex justify-center">
                <div className="relative">
                  <svg
                    viewBox="0 0 900 600"
                    className="h-16 w-16 rounded-full border-2 border-[#39FF14]/40 shadow-[0_0_20px_rgba(57,255,20,0.22)]"
                    role="img"
                    aria-label="Flag of Rwanda"
                    style={{ clipPath: 'circle(50% at 50% 50%)' }}
                  >
                    <rect width="900" height="600" fill="#20603D" />
                    <rect width="900" height="400" fill="#00A1DE" />
                    <rect width="900" height="100" y="400" fill="#FAD201" />
                    <g transform="translate(700,150)">
                      <circle r="65" fill="#E5BE01" />
                      {Array.from({ length: 24 }).map((_, i: number) => (
                        <rect
                          key={i}
                          x="-4"
                          y="-115"
                          width="8"
                          height="45"
                          fill="#E5BE01"
                          transform={`rotate(${(i * 360) / 24})`}
                        />
                      ))}
                    </g>
                  </svg>
                </div>
              </div>

              <div className="mb-6 flex items-center justify-center gap-4 text-[#39FF14]">
                <span className="h-px w-16 bg-[#39FF14]/70" />
                <Code2 className="h-6 w-6 drop-shadow-[0_0_10px_rgba(57,255,20,0.75)]" />
                <span className="h-px w-16 bg-[#39FF14]/70" />
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-[3.5rem_1fr] items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-[#39FF14]/70 text-[#39FF14] shadow-[0_0_14px_rgba(57,255,20,0.16)]">
                    <UserRound className="h-6 w-6" />
                  </div>
                  <div className="border-b border-white/20 pb-3">
                    <p className="text-xs font-medium uppercase text-neutral-400">CEO</p>
                    <p className="text-2xl font-black text-[#39FF14] sm:text-3xl">SHEMA lucin</p>
                  </div>
                </div>

                <div className="grid grid-cols-[3.5rem_1fr] items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-[#39FF14]/70 text-[#39FF14] shadow-[0_0_14px_rgba(57,255,20,0.16)]">
                    <MapPin className="h-6 w-6" />
                  </div>
                  <div className="border-b border-white/20 pb-3">
                    <p className="text-xs font-medium uppercase text-neutral-400">Location</p>
                    <p className="text-2xl font-black text-[#39FF14] sm:text-3xl">Rwanda</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="relative mx-auto aspect-[3/4] w-full max-w-[72px] overflow-hidden rounded-lg border border-[#39FF14] bg-[#0a0a0a] shadow-[0_0_18px_rgba(57,255,20,0.22)] sm:max-w-[88px]">
              <img
                src="/branding/developer-profile.jpg"
                alt="shemalucin"
                className="h-full w-full object-cover"
              />
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};


