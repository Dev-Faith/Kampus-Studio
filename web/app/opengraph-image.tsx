import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'Kampus Studio — Interactive NestJS, Prisma, Mongoose & Testing IDE';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function OpenGraphImage() {
  const stages = [
    { num: '01', name: 'Middleware', active: false },
    { num: '02', name: 'Guards', active: false },
    { num: '03', name: 'Interceptors', active: false },
    { num: '04', name: 'Pipes', active: true },
    { num: '05', name: 'Handler', active: false },
    { num: '06', name: 'Filters', active: false },
  ];

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          backgroundColor: '#0B0B0D',
          backgroundImage:
            'radial-gradient(rgba(255,255,255,0.08) 1px, transparent 1px)',
          backgroundSize: '28px 28px',
          padding: '56px 64px',
          fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, sans-serif',
          color: '#F4F4F5',
          position: 'relative',
        }}
      >
        {/* Top Accent Architectural Hairline */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: 4,
            background: '#E8503A',
          }}
        />

        {/* Brand Lockup Row */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
            <div
              style={{
                width: 58,
                height: 58,
                borderRadius: 15,
                background: 'linear-gradient(140deg, #F2614B 0%, #E8503A 55%, #C43824 100%)',
                border: '1.5px solid rgba(255,255,255,0.28)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 12px 32px rgba(232, 80, 58, 0.35)',
              }}
            >
              <svg width="34" height="34" viewBox="0 0 36 36" fill="none">
                <rect x="8.5" y="7" width="4.8" height="22" rx="1.8" fill="#FFFFFF" />
                <path
                  d="M26.5 7.4C27.2 6.8 28.4 7.3 28.4 8.3V10.5C28.4 11 28.2 11.4 27.8 11.8L20.4 18.8L28 25.8C28.3 26.1 28.5 26.5 28.5 26.9V27C28.5 27.8 27.6 28.3 26.9 27.8L16.2 18.4C15.7 18 15.7 17.2 16.2 16.7L26.5 7.4Z"
                  fill="#FFFFFF"
                />
                <rect x="14.4" y="15.8" width="3.8" height="3.8" rx="1.1" fill="#FFE0B8" />
              </svg>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <span style={{ fontSize: 30, fontWeight: 800, letterSpacing: '-0.03em' }}>
                Kampus Studio
              </span>
              <span
                style={{
                  fontSize: 14,
                  fontWeight: 600,
                  letterSpacing: '0.12em',
                  color: '#A1A1AA',
                  textTransform: 'uppercase',
                }}
              >
                NESTJS · PRISMA · MONGOOSE · TESTING
              </span>
            </div>
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '10px 18px',
              borderRadius: 999,
              backgroundColor: '#141418',
              border: '1px solid rgba(255,255,255,0.12)',
              fontSize: 15,
              fontWeight: 600,
              color: '#4ADE97',
            }}
          >
            <div
              style={{
                width: 9,
                height: 9,
                borderRadius: 999,
                backgroundColor: '#2CC27B',
              }}
            />
            Interactive In-Browser TypeScript IDE
          </div>
        </div>

        {/* Hero Statement */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18, maxWidth: 960 }}>
          <div
            style={{
              fontSize: 58,
              fontWeight: 800,
              lineHeight: 1.08,
              letterSpacing: '-0.035em',
              color: '#F4F4F5',
            }}
          >
            Master Backend Architecture by Building a Real PropTech Platform.
          </div>
          <div style={{ fontSize: 22, color: '#A1A1AA', lineHeight: 1.45 }}>
            14 modules, 32 multi-file exercises, live HTTP pipeline tracing, Prisma &amp; Mongoose
            mastery, Unit/E2E testing, and a context-aware Gemini AI mentor.
          </div>
        </div>

        {/* Bottom 6-Stage Request Lifecycle Bar */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            padding: '16px 20px',
            borderRadius: 14,
            backgroundColor: '#121216',
            border: '1px solid rgba(255,255,255,0.1)',
          }}
        >
          {stages.map((st) => (
            <div
              key={st.num}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '10px 16px',
                borderRadius: 9,
                backgroundColor: st.active ? 'rgba(232, 80, 58, 0.16)' : '#1A1A20',
                border: st.active
                  ? '1px solid rgba(232, 80, 58, 0.45)'
                  : '1px solid rgba(255,255,255,0.07)',
                color: st.active ? '#FF8570' : '#A1A1AA',
                fontSize: 16,
                fontWeight: 700,
              }}
            >
              <span style={{ fontSize: 13, opacity: 0.65 }}>{st.num}</span>
              <span>{st.name}</span>
            </div>
          ))}
        </div>
      </div>
    ),
    { ...size },
  );
}
