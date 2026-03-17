"use client"

import { motion, type Variants, useInView } from "framer-motion"
import { useRef } from "react"

// Animation variants for different reveal styles
const fadeUpVariants: Variants = {
    hidden: { opacity: 0, y: 30 },
    visible: { opacity: 1, y: 0 }
}

const fadeInVariants: Variants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1 }
}

const scaleUpVariants: Variants = {
    hidden: { opacity: 0, scale: 0.95 },
    visible: { opacity: 1, scale: 1 }
}

const slideInLeftVariants: Variants = {
    hidden: { opacity: 0, x: -50 },
    visible: { opacity: 1, x: 0 }
}

const slideInRightVariants: Variants = {
    hidden: { opacity: 0, x: 50 },
    visible: { opacity: 1, x: 0 }
}

type AnimationType = "fadeUp" | "fadeIn" | "scaleUp" | "slideInLeft" | "slideInRight"

const animationVariants: Record<AnimationType, Variants> = {
    fadeUp: fadeUpVariants,
    fadeIn: fadeInVariants,
    scaleUp: scaleUpVariants,
    slideInLeft: slideInLeftVariants,
    slideInRight: slideInRightVariants
}

interface AnimatedSectionProps {
    children: React.ReactNode
    className?: string
    animation?: AnimationType
    delay?: number
    duration?: number
    once?: boolean
    amount?: number
}

/**
 * AnimatedSection - Animates content when it enters the viewport
 */
export function AnimatedSection({
    children,
    className,
    animation = "fadeUp",
    delay = 0,
    duration = 0.6,
    once = true,
    amount = 0.2
}: AnimatedSectionProps) {
    const ref = useRef(null)
    const isInView = useInView(ref, { once, amount })

    return (
        <motion.div
            ref={ref}
            initial="hidden"
            animate={isInView ? "visible" : "hidden"}
            variants={animationVariants[animation]}
            transition={{
                duration,
                delay,
                ease: "easeOut"
            }}
            className={className}
        >
            {children}
        </motion.div>
    )
}

interface StaggerContainerProps {
    children: React.ReactNode
    className?: string
    staggerDelay?: number
    once?: boolean
}

/**
 * StaggerContainer - Staggers the animation of child elements
 */
export function StaggerContainer({
    children,
    className,
    staggerDelay = 0.1,
    once = true
}: StaggerContainerProps) {
    const ref = useRef(null)
    const isInView = useInView(ref, { once, amount: 0.2 })

    return (
        <motion.div
            ref={ref}
            initial="hidden"
            animate={isInView ? "visible" : "hidden"}
            variants={{
                hidden: {},
                visible: {
                    transition: {
                        staggerChildren: staggerDelay
                    }
                }
            }}
            className={className}
        >
            {children}
        </motion.div>
    )
}

interface StaggerItemProps {
    children: React.ReactNode
    className?: string
    animation?: AnimationType
    duration?: number
}

/**
 * StaggerItem - Individual items within a StaggerContainer
 */
export function StaggerItem({
    children,
    className,
    animation = "fadeUp",
    duration = 0.5
}: StaggerItemProps) {
    return (
        <motion.div
            variants={animationVariants[animation]}
            transition={{
                duration,
                ease: "easeOut"
            }}
            className={className}
        >
            {children}
        </motion.div>
    )
}

interface HoverScaleProps {
    children: React.ReactNode
    className?: string
    scale?: number
}

/**
 * HoverScale - Subtle scale animation on hover
 */
export function HoverScale({ children, className, scale = 1.02 }: HoverScaleProps) {
    return (
        <motion.div
            whileHover={{ scale }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className={className}
        >
            {children}
        </motion.div>
    )
}

interface HoverLiftProps {
    children: React.ReactNode
    className?: string
    lift?: number
}

/**
 * HoverLift - Lifts element up with shadow on hover
 */
export function HoverLift({ children, className, lift = -4 }: HoverLiftProps) {
    return (
        <motion.div
            whileHover={{
                y: lift,
                boxShadow: "0 10px 40px -15px rgba(0, 255, 0, 0.15)"
            }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className={className}
        >
            {children}
        </motion.div>
    )
}

/**
 * AnimatedText - Animates text with fade-up
 */
export function AnimatedText({
    children,
    className,
    delay = 0,
    as: Component = "p"
}: {
    children: React.ReactNode
    className?: string
    delay?: number
    as?: "h1" | "h2" | "h3" | "h4" | "h5" | "h6" | "p" | "span"
}) {
    const MotionComponent = motion.create(Component)
    const ref = useRef(null)
    const isInView = useInView(ref, { once: true, amount: 0.5 })

    return (
        <MotionComponent
            ref={ref}
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
            transition={{ duration: 0.5, delay, ease: "easeOut" }}
            className={className}
        >
            {children}
        </MotionComponent>
    )
}
