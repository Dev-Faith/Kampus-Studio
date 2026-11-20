import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const size = { width: 180, height: 180 };
export const contentType = 'image/png';

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(140deg, #F2614B 0%, #E8503A 55%, #C43824 100%)',
          borderRadius: 40,
        }}
      >
        <svg width="118" height="118" viewBox="0 0 36 36" fill="none">
          <rect x="8.5" y="7" width="4.8" height="22" rx="1.8" fill="#FFFFFF" />
          <path
            d="M26.5 7.4C27.2 6.8 28.4 7.3 28.4 8.3V10.5C28.4 11 28.2 11.4 27.8 11.8L20.4 18.8L28 25.8C28.3 26.1 28.5 26.5 28.5 26.9V27C28.5 27.8 27.6 28.3 26.9 27.8L16.2 18.4C15.7 18 15.7 17.2 16.2 16.7L26.5 7.4Z"
            fill="#FFFFFF"
          />
          <rect x="14.4" y="15.8" width="3.8" height="3.8" rx="1.1" fill="#FFE0B8" />
        </svg>
      </div>
    ),
    { ...size },
  );
}
