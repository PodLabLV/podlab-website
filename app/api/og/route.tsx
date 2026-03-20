import { ImageResponse } from 'next/og'
import { NextRequest } from 'next/server'

export const runtime = 'edge'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const title = searchParams.get('title') || 'PodLab'
  const subtitle = searchParams.get('subtitle') || 'Record Once. Sell Forever.'

  return new ImageResponse(
    (
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#0a0a0a',
          position: 'relative',
        }}
      >
        {/* Green glow */}
        <div
          style={{
            position: 'absolute',
            top: '-20%',
            left: '50%',
            width: '600px',
            height: '600px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(42,221,27,0.15) 0%, transparent 70%)',
            transform: 'translateX(-50%)',
          }}
        />

        {/* Border line */}
        <div
          style={{
            position: 'absolute',
            top: '24px',
            left: '24px',
            right: '24px',
            bottom: '24px',
            border: '2px solid rgba(42,221,27,0.2)',
            borderRadius: '16px',
          }}
        />

        {/* Content */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '60px',
            textAlign: 'center',
          }}
        >
          {/* PodLab text logo */}
          <div
            style={{
              fontSize: '28px',
              fontWeight: 700,
              color: '#2ADD1B',
              letterSpacing: '6px',
              textTransform: 'uppercase' as const,
              marginBottom: '40px',
            }}
          >
            PODLAB
          </div>

          {/* Title */}
          <div
            style={{
              fontSize: title.length > 30 ? '48px' : '64px',
              fontWeight: 900,
              color: '#fafafa',
              lineHeight: 1.1,
              maxWidth: '900px',
              marginBottom: '24px',
            }}
          >
            {title}
          </div>

          {/* Subtitle */}
          <div
            style={{
              fontSize: '28px',
              color: '#c0c0c0',
              maxWidth: '700px',
            }}
          >
            {subtitle}
          </div>

          {/* Bottom bar */}
          <div
            style={{
              position: 'absolute',
              bottom: '48px',
              display: 'flex',
              alignItems: 'center',
              gap: '16px',
            }}
          >
            <div
              style={{
                width: '40px',
                height: '3px',
                backgroundColor: '#2ADD1B',
              }}
            />
            <div
              style={{
                fontSize: '16px',
                color: '#666',
                letterSpacing: '3px',
                textTransform: 'uppercase' as const,
              }}
            >
              podlablv.com
            </div>
            <div
              style={{
                width: '40px',
                height: '3px',
                backgroundColor: '#2ADD1B',
              }}
            />
          </div>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    },
  )
}
