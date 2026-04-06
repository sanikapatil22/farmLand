'use client';

import { motion, useScroll, useTransform, useSpring } from 'framer-motion';
import { Leaf, ShieldCheck, Truck, Search, ArrowRight, MapPin } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import Logo from '@/components/ui/Logo';
import { useRef } from 'react';

// Journey Steps Data
const STEPS = [
    {
        id: 1, title: 'The Harvest', icon: Leaf,
        desc: 'Farmers log harvest data (location, time, crop type) directly onto the blockchain via mobile app.',
        img: 'https://images.unsplash.com/photo-1464226184884-fa280b87c399?q=80&w=800&auto=format&fit=crop'
    },
    {
        id: 2, title: 'Quality Check', icon: ShieldCheck,
        desc: 'Smart contracts verify if the produce meets organic certification standards automatically.',
        img: 'https://images.unsplash.com/photo-1563986768609-322da13575f3?q=80&w=800&auto=format&fit=crop'
    },
    {
        id: 3, title: 'Cold Chain', icon: Truck,
        desc: 'IoT sensors record temperature during transit. Any breach alerts the network instantly.',
        img: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?q=80&w=800&auto=format&fit=crop'
    },
    {
        id: 4, title: 'Final Destination', icon: Search,
        desc: 'You scan the QR code at the store and see the entire transparent history.',
        img: 'https://images.unsplash.com/photo-1542838132-92c53300491e?q=80&w=800&auto=format&fit=crop'
    }
];

function JourneySection() {
    const containerRef = useRef(null);
    const { scrollYProgress } = useScroll({
        target: containerRef,
        offset: ["start end", "end start"]
    });

    // The Line grows as we scroll
    const lineHeight = useTransform(scrollYProgress, [0.1, 0.8], ["0%", "100%"]);
    const smoothLine = useSpring(lineHeight, { stiffness: 60, damping: 20 });

    return (
        <section className="py-24 bg-slate-50 relative overflow-hidden" ref={containerRef}>
            <div className="max-w-4xl mx-auto px-6 relative">
                <motion.h2
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    className="text-3xl md:text-5xl font-bold text-center mb-24 text-slate-900"
                >
                    Tracking the Journey
                </motion.h2>

                {/* THE MAP LINE (Animated) */}
                <div className="absolute left-6 md:left-1/2 top-[120px] bottom-[100px] w-1 bg-slate-200 -translate-x-1/2">
                    {/* Filling the line with Green as we scroll */}
                    <motion.div
                        style={{ height: smoothLine }}
                        className="w-full bg-emerald-500 origin-top"
                    />
                </div>

                <div className="space-y-24">
                    {STEPS.map((step, index) => {
                        const isEven = index % 2 === 0;
                        return (
                            <TimelineNode
                                key={step.id}
                                step={step}
                                index={index}
                                isEven={isEven}
                            />
                        );
                    })}
                </div>
            </div>
        </section>
    );
}

function TimelineNode({ step, index, isEven }) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ margin: "-100px" }}
            transition={{ duration: 0.6 }}
            className={`relative flex items-center md:justify-between ${isEven ? 'md:flex-row' : 'md:flex-row-reverse'}`}
        >
            {/* The Dot on the Map (Center) */}
            <div className="absolute left-6 md:left-1/2 -translate-x-1/2 w-8 h-8 rounded-full border-4 border-white bg-slate-300 shadow-md z-10 flex items-center justify-center">
                {/* When in view, turn green */}
                <motion.div
                    initial={{ scale: 0 }}
                    whileInView={{ scale: 1 }}
                    className="w-4 h-4 rounded-full bg-emerald-500"
                />
            </div>

            {/* Content Card (Left or Right) */}
            <div className={`w-full md:w-[45%] pl-16 md:pl-0 ${isEven ? 'md:pr-12 md:text-right' : 'md:pl-12 md:text-left'}`}>
                <div className="bg-white p-6 rounded-2xl shadow-xl h-full border border-slate-100 hover:border-emerald-500/20 transition-all group">
                    {/* Step Number */}
                    <div className={`text-4xl font-black text-slate-100 mb-4 absolute top-4 ${isEven ? 'left-6' : 'right-6'}`}>
                        0{step.id}
                    </div>

                    <div className={`relative z-10 flex flex-col ${isEven ? 'md:items-end' : 'md:items-start'}`}>
                        <div className="p-3 bg-emerald-50 rounded-xl w-fit mb-4">
                            <step.icon className="w-6 h-6 text-emerald-600" />
                        </div>
                        <h3 className="text-2xl font-bold text-slate-900 mb-2">{step.title}</h3>
                        <p className="text-slate-600 leading-relaxed mb-4">{step.desc}</p>

                        {/* Image Preview */}
                        <div className="w-full h-48 rounded-lg overflow-hidden relative">
                            <Image src={step.img} alt={step.title} fill className="object-cover transition-transform duration-700 group-hover:scale-110" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Spacer for the other side */}
            <div className="hidden md:block w-[45%]" />
        </motion.div>
    );
}

const Section = ({ title, children, className = "" }) => (
    <section className={`py-16 px-6 ${className}`}>
        <div className="max-w-6xl mx-auto">
            {title && (
                <motion.h2 className="text-3xl md:text-4xl font-bold text-center mb-16 tracking-tight text-slate-900">
                    {title}
                </motion.h2>
            )}
            {children}
        </div>
    </section>
);

export default function AboutPage() {
    return (
        <main className="min-h-screen bg-slate-50 font-sans">
            {/* Hero Header (Unchanged) */}
            <div className="relative h-[50vh] flex items-center justify-center overflow-hidden">
                <Image
                    src="https://images.unsplash.com/photo-1542838132-92c53300491e?q=80&w=3000&auto=format&fit=crop"
                    alt="Market"
                    fill
                    className="object-cover opacity-90"
                />
                <div className="absolute inset-0 bg-slate-900/60" />

                <div className="relative z-10 text-center px-6">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.5 }}
                    >
                        <Logo size="large" color="white" />
                    </motion.div>

                    <motion.h1
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="text-4xl md:text-5xl font-bold text-white mt-6 mb-4"
                    >
                        Transparency from <span className="text-emerald-400">Ground to Gut</span>
                    </motion.h1>

                    <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.4 }}
                        className="text-lg text-slate-200 max-w-2xl mx-auto"
                    >
                        We are fixing the broken food supply chain with immutable blockchain technology.
                    </motion.p>
                </div>
            </div>

            {/* The Problem Section */}
            <Section className="bg-white">
                <div className="grid md:grid-cols-2 gap-12 items-center">
                    <motion.div
                        initial={{ opacity: 0, x: -30 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        className="relative h-64 md:h-80 rounded-2xl overflow-hidden shadow-xl"
                    >
                        <Image
                            src="https://images.unsplash.com/photo-1610832958506-aa56368176cf?q=80&w=2000&auto=format&fit=crop"
                            alt="Fresh Produce Supply"
                            fill
                            className="object-cover"
                        />
                    </motion.div>
                    <motion.div
                        initial={{ opacity: 0, x: 30 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                    >
                        <span className="text-red-500 font-bold tracking-wider uppercase text-sm mb-2 block">The Challenge</span>
                        <h3 className="text-3xl font-bold text-slate-900 mb-4">Why do we need this?</h3>
                        <p className="text-slate-600 leading-relaxed mb-6">
                            Food fraud costs the global economy $40 billion annually. Consumers simply don&apos;t know where their food comes from, and honest farmers aren&apos;t getting paid what they deserve.
                        </p>
                        <ul className="space-y-3">
                            {['Counterfeit Organic Labels', 'Supply Chain Opaque', 'Unfair Farmer Pay'].map((item, i) => (
                                <li key={i} className="flex items-center gap-3 text-slate-700 font-medium">
                                    <div className="w-2 h-2 rounded-full bg-red-400" />
                                    {item}
                                </li>
                            ))}
                        </ul>
                    </motion.div>
                </div>
            </Section>

            {/* ANIMATED JOURNEY MAP */}
            <JourneySection />
        </main>
    );
}
