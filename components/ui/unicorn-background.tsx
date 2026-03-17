"use client"

interface UnicornBackgroundProps {
  projectId?: string
  className?: string
}

export function UnicornBackground({
  projectId = "GUfyMQB5CKHPivFz7drf",
  className = "",
}: UnicornBackgroundProps) {
  return (
    <div style={{ position: "absolute", top: 0, left: 0, width: "100vw", height: "100vh", overflow: "hidden" }}>
      <iframe
        src={`https://www.unicorn.studio/embed/${projectId}?scale=1&dpi=1.5&fps=60`}
        className={`border-0 ${className}`}
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100vw",
          height: "100vh",
          border: "none",
          pointerEvents: "none",
          background: "#000000",
        }}
        loading="eager"
        title="Background animation"
        allow="autoplay"
      />
      {/* Cover watermark — bottom-right */}
      <div style={{ position: "absolute", bottom: 0, right: 0, width: "200px", height: "50px", background: "#000000", zIndex: 2 }} />
      {/* Cover watermark — bottom-left (in case) */}
      <div style={{ position: "absolute", bottom: 0, left: 0, width: "200px", height: "50px", background: "#000000", zIndex: 2 }} />
    </div>
  )
}
