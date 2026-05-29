import { useRef } from 'react'
import { motion, useInView, useScroll, useTransform } from 'framer-motion'
import { ArrowRight, Check } from 'lucide-react'

/* ─── CONSTANTS ──────────────────────────────────────────────────────────── */
const WA_LINK    = 'https://wa.me/14155238886?text=join%20sometime-certainly'
const CREAM      = '#E1E0CC'
const CREAM_DIM  = 'rgba(225,224,204,0.7)'

/* ─── ANIMATION HELPERS ──────────────────────────────────────────────────── */
const EASE_OUT = [0.16, 1, 0.3, 1]
const EASE_CARD = [0.22, 1, 0.36, 1]

/** Splits text by words, each word slides up staggered */
function WordsPullUp({ text, className = '', showAsterisk = false, delay = 0 }) {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-60px' })
  const words = text.split(' ')
  return (
    <span ref={ref} className={`inline-flex flex-wrap ${className}`}>
      {words.map((word, i) => {
        const isLast = i === words.length - 1
        return (
          <span key={i} className="overflow-hidden inline-block mr-[0.25em]">
            <motion.span
              className="inline-block"
              initial={{ y: 30, opacity: 0 }}
              animate={inView ? { y: 0, opacity: 1 } : {}}
              transition={{ duration: 0.7, ease: EASE_OUT, delay: delay + i * 0.08 }}
            >
              {word}
              {showAsterisk && isLast && (
                <sup style={{ fontSize: '0.31em', position: 'relative', top: '0.65em' }}>*</sup>
              )}
            </motion.span>
          </span>
        )
      })}
    </span>
  )
}

/** Multi-style: array of {text, className} segments, same pull-up */
function WordsPullUpMultiStyle({ segments, wrapClass = '', delay = 0 }) {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-60px' })
  const words = segments.flatMap(seg =>
    seg.text.split(' ').filter(Boolean).map(w => ({ word: w, className: seg.className }))
  )
  return (
    <span ref={ref} className={`inline-flex flex-wrap justify-center ${wrapClass}`}>
      {words.map(({ word, className }, i) => (
        <span key={i} className="overflow-hidden inline-block mr-[0.25em]">
          <motion.span
            className={`inline-block ${className}`}
            initial={{ y: 24, opacity: 0 }}
            animate={inView ? { y: 0, opacity: 1 } : {}}
            transition={{ duration: 0.7, ease: EASE_OUT, delay: delay + i * 0.08 }}
          >
            {word}
          </motion.span>
        </span>
      ))}
    </span>
  )
}

/** Character-by-character scroll-opacity reveal */
function AnimatedParagraph({ text, className = '' }) {
  const ref = useRef(null)
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start 0.85', 'end 0.25'],
  })
  const chars = text.split('')
  return (
    <p ref={ref} className={className} aria-label={text}>
      {chars.map((char, i) => {
        const progress = i / chars.length
        const opacity = useTransform(scrollYProgress, [progress - 0.1, progress + 0.05], [0.15, 1])
        return (
          <motion.span key={i} style={{ opacity, display: 'inline' }}>
            {char}
          </motion.span>
        )
      })}
    </p>
  )
}

/* ─── FEATURE CARD ───────────────────────────────────────────────────────── */
function FeatureCard({ children, index }) {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-100px' })
  return (
    <motion.div
      ref={ref}
      initial={{ scale: 0.95, opacity: 0 }}
      animate={inView ? { scale: 1, opacity: 1 } : {}}
      transition={{ duration: 0.7, ease: EASE_CARD, delay: index * 0.15 }}
      className="rounded-2xl overflow-hidden flex flex-col relative"
    >
      {children}
    </motion.div>
  )
}

/* ─── MAIN COMPONENT ─────────────────────────────────────────────────────── */
export default function LandingPage({ onUpload }) {
  return (
    <div className="bg-black min-h-screen">

      {/* ══ SECTION 1: HERO ═══════════════════════════════════════════════════ */}
      <section className="h-screen p-4 md:p-6">
        <div className="relative w-full h-full rounded-2xl md:rounded-[2rem] overflow-hidden">

          {/* Background video */}
          <video
            autoPlay loop muted playsInline
            className="absolute inset-0 w-full h-full object-cover"
            src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260405_170732_8a9ccda6-5cff-4628-b164-059c500a2b41.mp4"
          />

          {/* Noise overlay */}
          <div className="noise-overlay absolute inset-0 opacity-[0.7] mix-blend-overlay pointer-events-none" />

          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/60 pointer-events-none" />

          {/* ── Navbar ── */}
          <div className="absolute top-0 left-0 right-0 flex justify-center z-20 pointer-events-none">
            <nav className="bg-black rounded-b-2xl md:rounded-b-3xl px-4 py-2 md:px-8 pointer-events-auto">
              <div className="flex items-center gap-3 sm:gap-6 md:gap-12 lg:gap-14">
                {/* Logo */}
                <img src="/logo.svg" alt="NetWorkIQ" className="h-7 md:h-8 opacity-90" />
                {/* Divider */}
                <div className="w-px h-4 bg-white/10" />
                {[
                  { label: 'Our story',  href: '#about' },
                  { label: 'Features',   href: '#features' },
                  { label: 'Connect',    href: WA_LINK, external: true },
                  { label: 'Commands',   href: '#features' },
                  { label: 'Inquiries',  href: WA_LINK, external: true },
                ].map(({ label, href, external }) => (
                  <a
                    key={label}
                    href={href}
                    target={external ? '_blank' : undefined}
                    rel={external ? 'noopener noreferrer' : undefined}
                    className="text-[10px] sm:text-xs md:text-sm transition-colors duration-200 whitespace-nowrap"
                    style={{ color: CREAM_DIM }}
                    onMouseEnter={e => e.currentTarget.style.color = CREAM}
                    onMouseLeave={e => e.currentTarget.style.color = CREAM_DIM}
                  >
                    {label}
                  </a>
                ))}
              </div>
            </nav>
          </div>

          {/* ── Hero Content (bottom-aligned) ── */}
          <div className="absolute bottom-0 left-0 right-0 p-4 md:p-8 z-10">
            <div className="grid grid-cols-12 items-end gap-4">

              {/* Giant heading — left 8 cols */}
              <div className="col-span-12 lg:col-span-8">
                <h1
                  className="font-medium leading-[0.85] tracking-[-0.07em] text-[26vw] sm:text-[24vw] md:text-[22vw] lg:text-[20vw] xl:text-[19vw] 2xl:text-[20vw]"
                  style={{ color: CREAM }}
                >
                  <WordsPullUp text="NetWork" delay={0} />
                  <WordsPullUp text="IQ" showAsterisk delay={0.12} />
                </h1>
              </div>

              {/* Right col — description + CTA */}
              <div className="col-span-12 lg:col-span-4 pb-2 flex flex-col gap-5">
                <motion.p
                  className="text-primary/70 text-xs sm:text-sm md:text-base"
                  style={{ lineHeight: 1.2 }}
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.5, duration: 0.8, ease: EASE_OUT }}
                >
                  NetWorkIQ is a worldwide intelligence layer for your LinkedIn network — find anyone, enrich anyone, and prospect globally, all from WhatsApp.
                </motion.p>

                <motion.div
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.7, duration: 0.8, ease: EASE_OUT }}
                >
                  <a
                    href={WA_LINK}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group inline-flex items-center gap-2 hover:gap-3 bg-primary rounded-full pl-5 pr-1 py-1 transition-all duration-300"
                  >
                    <span className="text-black font-medium text-sm sm:text-base">Scan &amp; Connect</span>
                    <span className="bg-black rounded-full w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                      <ArrowRight size={16} style={{ color: CREAM }} />
                    </span>
                  </a>
                </motion.div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ══ SECTION 2: ABOUT ══════════════════════════════════════════════════ */}
      <section id="about" className="bg-black py-20 sm:py-28 md:py-36 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto">
          <div className="bg-[#101010] rounded-2xl md:rounded-3xl p-8 sm:p-12 md:p-16 text-center">

            <p className="text-primary text-[10px] sm:text-xs uppercase tracking-widest mb-6 sm:mb-8">
              AI-Powered Network Intelligence
            </p>

            <div className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl max-w-3xl mx-auto leading-[0.95] sm:leading-[0.9] mb-10 sm:mb-14">
              <WordsPullUpMultiStyle
                segments={[
                  { text: 'Your LinkedIn network,', className: 'font-normal text-primary' },
                  { text: 'queryable from WhatsApp.', className: 'italic font-serif text-primary' },
                  { text: 'Find people, enrich leads, and prospect globally.', className: 'font-normal text-primary' },
                ]}
                wrapClass="gap-x-[0.25em]"
                delay={0}
              />
            </div>

            <AnimatedParagraph
              text="Over the past few years we have quietly built a WhatsApp AI bot that sits on top of your LinkedIn connections export. Ask it anything — show me senior engineers at Google, find Priya Sharma's email, what are my top companies — and it responds in seconds. Powered by PDL, Hunter.io, Apollo and Explorium, with 500M+ prospects in reach."
              className="text-[#DEDBC8] text-xs sm:text-sm md:text-base max-w-3xl mx-auto leading-relaxed"
            />
          </div>
        </div>
      </section>

      {/* ══ SECTION 3: FEATURES ═══════════════════════════════════════════════ */}
      <section id="features" className="min-h-screen bg-black relative px-4 sm:px-6 py-20 sm:py-28">
        {/* Noise bg */}
        <div className="bg-noise absolute inset-0 opacity-[0.15] pointer-events-none" />

        <div className="relative max-w-7xl mx-auto">

          {/* Header */}
          <div className="mb-10 sm:mb-14 max-w-4xl">
            <div className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-normal leading-tight">
              <WordsPullUpMultiStyle
                segments={[
                  { text: 'Network intelligence for ambitious people.', className: 'text-primary' },
                ]}
              />
            </div>
            <div className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-normal mt-2">
              <WordsPullUpMultiStyle
                segments={[
                  { text: 'Built for connection. Powered by AI.', className: 'text-gray-500' },
                ]}
                delay={0.2}
              />
            </div>
          </div>

          {/* 4-col card grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-2 md:gap-1 lg:h-[520px]">

            {/* Card 1 — Video */}
            <FeatureCard index={0}>
              <div className="relative w-full h-[300px] lg:h-full">
                <video
                  autoPlay loop muted playsInline
                  className="absolute inset-0 w-full h-full object-cover"
                  src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260406_133058_0504132a-0cf3-4450-a370-8ea3b05c95d4.mp4"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-5">
                  <p className="text-base font-medium" style={{ color: CREAM }}>Your intelligence canvas.</p>
                </div>
              </div>
            </FeatureCard>

            {/* Card 2 — Smart Search */}
            <FeatureCard index={1}>
              <div className="bg-[#212121] h-full p-5 flex flex-col gap-4">
                <img
                  src="https://images.higgs.ai/?default=1&output=webp&url=https%3A%2F%2Fd8j0ntlcm91z4.cloudfront.net%2Fuser_38xzZboKViGWJOttwIXH07lWA1P%2Fhf_20260405_171918_4a5edc79-d78f-4637-ac8b-53c43c220606.png&w=1280&q=85"
                  alt="Smart Search"
                  className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg object-cover"
                />
                <div className="flex-1">
                  <div className="flex items-start justify-between mb-3">
                    <h3 className="text-primary font-medium text-base sm:text-lg leading-tight">Smart Search.</h3>
                    <span className="text-gray-600 text-xs font-mono mt-1">01</span>
                  </div>
                  <ul className="space-y-2.5">
                    {[
                      'Natural-language queries over your network',
                      'Filter by role, company, location, seniority',
                      'Fuzzy name matching & smart disambiguation',
                      'Results ranked by relevance & recency',
                    ].map(item => (
                      <li key={item} className="flex items-start gap-2">
                        <Check size={13} className="text-primary mt-0.5 flex-shrink-0" />
                        <span className="text-gray-400 text-xs leading-relaxed">{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <a href={WA_LINK} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-primary text-xs hover:gap-2.5 transition-all duration-200 group">
                  <span>Try it</span>
                  <ArrowRight size={12} className="rotate-[-45deg]" />
                </a>
              </div>
            </FeatureCard>

            {/* Card 3 — Email Finder */}
            <FeatureCard index={2}>
              <div className="bg-[#212121] h-full p-5 flex flex-col gap-4">
                <img
                  src="https://images.higgs.ai/?default=1&output=webp&url=https%3A%2F%2Fd8j0ntlcm91z4.cloudfront.net%2Fuser_38xzZboKViGWJOttwIXH07lWA1P%2Fhf_20260405_171741_ed9845ab-f5b2-4018-8ce7-07cc01823522.png&w=1280&q=85"
                  alt="Email Finder"
                  className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg object-cover"
                />
                <div className="flex-1">
                  <div className="flex items-start justify-between mb-3">
                    <h3 className="text-primary font-medium text-base sm:text-lg leading-tight">Email Finder.</h3>
                    <span className="text-gray-600 text-xs font-mono mt-1">02</span>
                  </div>
                  <ul className="space-y-2.5">
                    {[
                      'Waterfall search: Hunter → Apollo → Snov',
                      'PDL enrichment for complete profiles',
                      'Phone, GitHub, Twitter — full contact card',
                    ].map(item => (
                      <li key={item} className="flex items-start gap-2">
                        <Check size={13} className="text-primary mt-0.5 flex-shrink-0" />
                        <span className="text-gray-400 text-xs leading-relaxed">{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <a href={WA_LINK} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-primary text-xs hover:gap-2.5 transition-all duration-200">
                  <span>Try it</span>
                  <ArrowRight size={12} className="rotate-[-45deg]" />
                </a>
              </div>
            </FeatureCard>

            {/* Card 4 — Vibe Prospecting */}
            <FeatureCard index={3}>
              <div className="bg-[#212121] h-full p-5 flex flex-col gap-4">
                <img
                  src="https://images.higgs.ai/?default=1&output=webp&url=https%3A%2F%2Fd8j0ntlcm91z4.cloudfront.net%2Fuser_38xzZboKViGWJOttwIXH07lWA1P%2Fhf_20260405_171809_f56666dc-c099-4778-ad82-9ad4f209567b.png&w=1280&q=85"
                  alt="Vibe Prospecting"
                  className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg object-cover"
                />
                <div className="flex-1">
                  <div className="flex items-start justify-between mb-3">
                    <h3 className="text-primary font-medium text-base sm:text-lg leading-tight">Vibe Prospecting.</h3>
                    <span className="text-gray-600 text-xs font-mono mt-1">03</span>
                  </div>
                  <ul className="space-y-2.5">
                    {[
                      '500M+ cold leads beyond your network',
                      'Filter by title, industry & company size',
                      'Sync schedules & set prospect reminders',
                    ].map(item => (
                      <li key={item} className="flex items-start gap-2">
                        <Check size={13} className="text-primary mt-0.5 flex-shrink-0" />
                        <span className="text-gray-400 text-xs leading-relaxed">{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <a href={WA_LINK} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-primary text-xs hover:gap-2.5 transition-all duration-200">
                  <span>Try it</span>
                  <ArrowRight size={12} className="rotate-[-45deg]" />
                </a>
              </div>
            </FeatureCard>
          </div>

          {/* Upload CTA at bottom */}
          <div className="mt-16 text-center">
            <p className="text-gray-500 text-sm mb-6">Upload your LinkedIn data once — query forever</p>
            <button
              onClick={() => onUpload && onUpload()}
              className="group inline-flex items-center gap-2 hover:gap-3 bg-primary rounded-full pl-6 pr-2 py-2 transition-all duration-300"
            >
              <span className="text-black font-medium text-sm sm:text-base">Upload your data</span>
              <span className="bg-black rounded-full w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                <ArrowRight size={16} style={{ color: CREAM }} />
              </span>
            </button>
          </div>
        </div>
      </section>

      {/* ══ FOOTER ════════════════════════════════════════════════════════════ */}
      <footer className="bg-black border-t border-white/[0.06] py-8 px-6 text-center">
        <img src="/logo.svg" alt="NetWorkIQ" className="h-7 mx-auto mb-4 opacity-60" />
        <p className="text-gray-600 text-xs">
          Built by{' '}
          <a href="https://www.linkedin.com/in/vedant-shinde-hello/" target="_blank" rel="noopener noreferrer" className="text-primary/60 hover:text-primary transition-colors">
            Vedant Shinde ↗
          </a>
          {' '} · Powered by PDL · Hunter.io · Apollo · Explorium
        </p>
        <p className="text-gray-700 text-[10px] mt-2">
          Data sourced from third-party databases. Not always 100% accurate. Verify before outreach.
        </p>
      </footer>
    </div>
  )
}
