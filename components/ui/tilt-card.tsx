"use client"

import { useRef, useState, useEffect, type ReactNode } from "react"
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion"

interface TiltCardProps {
  children: ReactNode
  className?: string
  tiltAmount?: number // max degrees of tilt
  perspective?: number
  scale?: number // scale on hover
  glareEnabled?: boolean
  gyroscopeEnabled?: boolean
}

export function TiltCard({
  children,
  className = "",
  tiltAmount = 15,
  perspective = 1000,
  scale = 1.02,
  glareEnabled = true,
  gyroscopeEnabled = true,
}: TiltCardProps) {
  const cardRef = useRef<HTMLDivElement>(null)
  const [isHovered, setIsHovered] = useState(false)

  // Motion values for mouse-based tilt
  const mouseX = useMotionValue(0)
  const mouseY = useMotionValue(0)

  // Motion values for gyroscope
  const gyroX = useMotionValue(0)
  const gyroY = useMotionValue(0)

  // Spring config for smooth animations
  const springConfig = { damping: 20, stiffness: 300 }

  const rotateX = useSpring(useTransform(mouseY, [-0.5, 0.5], [tiltAmount, -tiltAmount]), springConfig)
  const rotateY = useSpring(useTransform(mouseX, [-0.5, 0.5], [-tiltAmount, tiltAmount]), springConfig)

  // Gyroscope-based rotation
  const gyroRotateX = useSpring(gyroX, springConfig)
  const gyroRotateY = useSpring(gyroY, springConfig)

  // Glare position
  const glareX = useTransform(mouseX, [-0.5, 0.5], [0, 100])
  const glareY = useTransform(mouseY, [-0.5, 0.5], [0, 100])

  // Handle mouse move
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return

    const rect = cardRef.current.getBoundingClientRect()
    const x = (e.clientX - rect.left) / rect.width - 0.5
    const y = (e.clientY - rect.top) / rect.height - 0.5

    mouseX.set(x)
    mouseY.set(y)
  }

  const handleMouseLeave = () => {
    setIsHovered(false)
    mouseX.set(0)
    mouseY.set(0)
  }

  // Gyroscope support
  useEffect(() => {
    if (!gyroscopeEnabled) return

    const handleOrientation = (e: DeviceOrientationEvent) => {
      if (e.gamma === null || e.beta === null) return

      // gamma is left-right tilt (-90 to 90)
      // beta is front-back tilt (-180 to 180)
      const x = Math.max(-tiltAmount, Math.min(tiltAmount, e.gamma / 3))
      const y = Math.max(-tiltAmount, Math.min(tiltAmount, (e.beta - 45) / 3))

      gyroX.set(y)
      gyroY.set(x)
    }

    // Request permission on iOS 13+
    if (typeof DeviceOrientationEvent !== "undefined" &&
        typeof (DeviceOrientationEvent as any).requestPermission === "function") {
      // Will need user interaction to request permission
    } else {
      window.addEventListener("deviceorientation", handleOrientation)
    }

    return () => {
      window.removeEventListener("deviceorientation", handleOrientation)
    }
  }, [gyroscopeEnabled, tiltAmount, gyroX, gyroY])

  return (
    <motion.div
      ref={cardRef}
      className={`relative ${className}`}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={handleMouseLeave}
      style={{
        perspective,
        transformStyle: "preserve-3d",
      }}
    >
      <motion.div
        className="w-full h-full"
        style={{
          rotateX: isHovered ? rotateX : gyroRotateX,
          rotateY: isHovered ? rotateY : gyroRotateY,
          transformStyle: "preserve-3d",
        }}
        whileHover={{ scale }}
        transition={{ duration: 0.2 }}
      >
        {/* Card content */}
        <div className="relative w-full h-full" style={{ transformStyle: "preserve-3d" }}>
          {children}

          {/* Glare effect */}
          {glareEnabled && isHovered && (
            <motion.div
              className="absolute inset-0 pointer-events-none rounded-xl overflow-hidden"
              style={{
                background: `radial-gradient(circle at ${glareX.get()}% ${glareY.get()}%, rgba(255,255,255,0.15) 0%, transparent 50%)`,
              }}
            />
          )}
        </div>

        {/* 3D shadow */}
        <motion.div
          className="absolute inset-0 -z-10 rounded-xl"
          style={{
            transform: "translateZ(-50px)",
            background: "rgba(42, 221, 27, 0.1)",
            filter: "blur(20px)",
            opacity: isHovered ? 1 : 0,
          }}
          transition={{ duration: 0.3 }}
        />
      </motion.div>
    </motion.div>
  )
}

// Simpler version without gyroscope for basic hover tilt
export function SimpleTiltCard({
  children,
  className = "",
  tiltAmount = 10,
}: {
  children: ReactNode
  className?: string
  tiltAmount?: number
}) {
  const cardRef = useRef<HTMLDivElement>(null)

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return

    const rect = cardRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    const centerX = rect.width / 2
    const centerY = rect.height / 2

    const rotateX = ((y - centerY) / centerY) * -tiltAmount
    const rotateY = ((x - centerX) / centerX) * tiltAmount

    cardRef.current.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.02, 1.02, 1.02)`
  }

  const handleMouseLeave = () => {
    if (!cardRef.current) return
    cardRef.current.style.transform = "perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)"
  }

  return (
    <div
      ref={cardRef}
      className={`transition-transform duration-200 ease-out ${className}`}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{ transformStyle: "preserve-3d" }}
    >
      {children}
    </div>
  )
}
