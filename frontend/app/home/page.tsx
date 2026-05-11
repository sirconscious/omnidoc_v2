"use client";

import React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { 
  Layers, 
  ArrowRight, 
  Search, 
  Shield, 
  Zap, 
  Database, 
  Code2, 
  Globe2 
} from "lucide-react";

export default function LandingPage() {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1, delayChildren: 0.3 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1] }
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-primary selection:text-primary-foreground selection:bg-opacity-10 selection:text-primary">
      {/* Header - Precise & Floating */}
      <header className="fixed top-0 left-0 right-0 z-50 pt-6 px-6 pointer-events-none">
        <div className="max-w-[1200px] mx-auto h-14 glass rounded-full px-6 flex items-center justify-between border border-border/40 pointer-events-auto">
          <div className="flex items-center gap-2">
            <div className="size-6 bg-primary rounded-md flex items-center justify-center shadow-lg shadow-primary/20">
              <Layers className="h-3.5 w-3.5 text-primary-foreground" />
            </div>
            <span className="font-bold tracking-tight text-sm uppercase">Omnidoc</span>
          </div>
          
          <nav className="hidden md:flex items-center gap-8 text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
            <Link href="#logic" className="hover:text-primary transition-colors">Logic</Link>
            <Link href="#specs" className="hover:text-primary transition-colors">Specifications</Link>
            <Link href="/login" className="hover:text-primary transition-colors">Access</Link>
          </nav>

          <Button size="sm" className="rounded-full h-8 px-4 font-bold text-[10px] uppercase tracking-wider" asChild>
            <Link href="/register">Initialize</Link>
          </Button>
        </div>
      </header>

      <main>
        {/* Hero - Sophisticated Asymmetry */}
        <section className="relative pt-32 pb-24 md:pt-48 md:pb-40 border-b border-border overflow-hidden">
          <div className="container mx-auto px-6 max-w-[1200px]">
            <motion.div 
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-end"
            >
              <div className="lg:col-span-8">
                <motion.div variants={itemVariants} className="inline-flex items-center gap-2 mb-10">
                  <span className="h-px w-8 bg-primary" />
                  <span className="text-[10px] font-bold uppercase tracking-[0.4em] text-primary">Protocol.01</span>
                </motion.div>
                <motion.h1 variants={itemVariants} className="text-[clamp(2.5rem,8vw,6.5rem)] font-bold tracking-tighter leading-[0.9] mb-10">
                  Semantic intelligence <br />
                  for technical <span className="text-primary/40 italic">libraries.</span>
                </motion.h1>
              </div>
              
              <div className="lg:col-span-4 lg:pb-4">
                <motion.p variants={itemVariants} className="text-lg text-muted-foreground font-medium leading-relaxed mb-10 border-l border-border pl-6">
                  Omnidoc maps semantic DNA across your entire organization. We enable high-fidelity retrieval that understands conceptual intent, not just keyword matching.
                </motion.p>
                <motion.div variants={itemVariants} className="flex flex-col gap-3">
                  <Button size="lg" className="rounded-xl h-14 font-bold text-lg shadow-2xl shadow-primary/20" asChild>
                    <Link href="/register">Get Started</Link>
                  </Button>
                  <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest px-2 text-center lg:text-left opacity-60">
                    SOC2 Compliance // AES-256 Encryption
                  </p>
                </motion.div>
              </div>
            </motion.div>
          </div>
          
          {/* Subtle Background Element */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 -z-10 w-full h-full pointer-events-none opacity-[0.03]">
             <div className="absolute inset-0 grid-background opacity-50" />
             <div className="absolute inset-0 mesh-gradient opacity-100" />
          </div>
        </section>

        {/* Feature Bento - Precise & Modern */}
        <section id="logic" className="py-32 border-b border-border bg-muted/10">
          <div className="container mx-auto px-6 max-w-[1200px]">
            <div className="mb-20 space-y-4">
              <h2 className="text-[11px] font-bold uppercase tracking-[0.4em] text-primary">Infrastructure</h2>
              <p className="text-4xl font-bold tracking-tight">Built for precision.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Feature 1 - Large */}
              <div className="md:col-span-2 group relative overflow-hidden bg-card border border-border/60 rounded-3xl p-10 hover:border-primary/30 transition-all duration-500 shadow-sm hover:shadow-2xl hover:shadow-primary/5">
                <div className="relative z-10 flex flex-col h-full justify-between gap-20">
                  <div className="size-12 bg-primary/5 rounded-2xl flex items-center justify-center text-primary border border-primary/10">
                    <Search className="size-5" />
                  </div>
                  <div className="max-w-md space-y-4">
                    <h3 className="text-2xl font-bold tracking-tight">Multi-Vector Retrieval</h3>
                    <p className="text-muted-foreground leading-relaxed font-medium">
                      Our engine breaks documents into conceptual nodes, allowing for sub-millisecond search across millions of dimensions of meaning.
                    </p>
                  </div>
                </div>
                {/* Decorative background visual */}
                <div className="absolute top-0 right-0 w-2/3 h-full pointer-events-none opacity-5 group-hover:opacity-10 transition-opacity">
                  <div className="absolute inset-0 grid grid-cols-8 gap-1 p-8">
                    {Array.from({ length: 64 }).map((_, i) => (
                      <div key={i} className="aspect-square border border-foreground/10" />
                    ))}
                  </div>
                </div>
              </div>

              {/* Feature 2 - Small */}
              <div className="bg-primary text-primary-foreground rounded-3xl p-10 flex flex-col justify-between gap-12 group hover:scale-[1.01] transition-transform duration-500 shadow-xl shadow-primary/10">
                <div className="size-12 bg-white/10 rounded-2xl flex items-center justify-center border border-white/20">
                  <Zap className="size-5" />
                </div>
                <div className="space-y-4">
                  <h3 className="text-2xl font-bold tracking-tight">Instant Sync</h3>
                  <p className="text-primary-foreground/70 leading-relaxed font-medium">
                    Upload and index 1M+ docs per hour with our sharded ingestion pipeline.
                  </p>
                </div>
              </div>

              {/* Feature 3 - Small */}
              <div className="bg-card border border-border/60 rounded-3xl p-10 flex flex-col justify-between gap-12 hover:border-primary/30 transition-all shadow-sm">
                <div className="size-12 bg-primary/5 rounded-2xl flex items-center justify-center text-primary border border-primary/10">
                  <Shield className="size-5" />
                </div>
                <div className="space-y-4">
                  <h3 className="text-2xl font-bold tracking-tight">Edge Security</h3>
                  <p className="text-muted-foreground leading-relaxed font-medium">
                    Isolated data nodes with hardware-level encryption. Your library stays private.
                  </p>
                </div>
              </div>

              {/* Feature 4 - Medium */}
              <div className="md:col-span-2 bg-card border border-border/60 rounded-3xl p-10 flex flex-col md:flex-row items-center gap-12 hover:border-primary/30 transition-all shadow-sm">
                <div className="size-12 md:size-24 bg-primary/5 rounded-3xl flex items-center justify-center text-primary shrink-0 border border-primary/10">
                  <Code2 className="size-6 md:size-10" />
                </div>
                <div className="space-y-4">
                  <h3 className="text-2xl font-bold tracking-tight">Native SDKs & API</h3>
                  <p className="text-muted-foreground leading-relaxed font-medium">
                    Integrate Omnidoc intelligence directly into your LLM pipelines with our unified REST API or native SDKs for Python and TypeScript.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Technical Specs - Dense & Clean */}
        <section id="specs" className="py-32 bg-background border-b border-border">
          <div className="container mx-auto px-6 max-w-[1200px]">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-x-12 gap-y-16">
              <SpecBox label="Latency" value="12ms" detail="Avg Retrieval" />
              <SpecBox label="Throughput" value="1.2M" detail="Docs / Hour" />
              <SpecBox label="Uptime" value="99.99%" detail="SLA Standard" />
              <SpecBox label="Vectors" value="PGVector" />
            </div>
          </div>
        </section>

        {/* Final Action - High Impact */}
        <section className="py-40 md:py-60 px-6 text-center overflow-hidden relative">
          <div className="container mx-auto max-w-[1200px] relative z-10">
            <h2 className="text-7xl md:text-[9rem] font-bold tracking-tighter leading-none mb-16 italic">
              Scale your <br /> knowledge.
            </h2>
            <div className="flex flex-col md:flex-row items-center justify-center gap-8">
              <Button size="lg" className="rounded-xl h-16 px-12 font-bold text-xl shadow-2xl shadow-primary/20 hover:scale-105 transition-transform">
                Start for Free
              </Button>
              <Link href="#" className="text-sm font-bold uppercase tracking-widest hover:text-primary transition-colors flex items-center gap-2 group">
                Request Whitepaper
                <ArrowRight className="size-4 group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>
          </div>
          <div className="absolute inset-0 bg-primary/5 -z-10 skew-y-3 translate-y-20" />
        </section>
      </main>

      {/* Footer - Professional & Detailed */}
      <footer className="py-24 border-t border-border bg-card">
        <div className="container mx-auto px-6 max-w-[1200px]">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-16 mb-24">
            <div className="md:col-span-5 space-y-8">
              <div className="flex items-center gap-2">
                <div className="size-8 bg-primary rounded-lg flex items-center justify-center">
                  <Layers className="h-4 w-4 text-primary-foreground" />
                </div>
                <span className="font-bold tracking-tight text-xl uppercase">Omnidoc</span>
              </div>
              <p className="text-muted-foreground text-sm font-medium leading-relaxed max-w-sm">
                The standard for high-performance semantic retrieval. Built for organizations that require precision and scale in their documentation infrastructure.
              </p>
            </div>
            <div className="md:col-span-7 grid grid-cols-2 sm:grid-cols-3 gap-12">
              <FooterList title="Network" links={['GitHub', 'Twitter', 'Status', 'Region Map']} />
              <FooterList title="Protocol" links={['Whitepaper', 'API Docs', 'Security', 'Privacy']} />
              <FooterList title="Company" links={['About', 'Contact', 'Pricing', 'Terms']} />
            </div>
          </div>
          <div className="pt-12 border-t border-border flex flex-col md:flex-row justify-between items-center gap-8 text-[10px] font-bold uppercase tracking-[0.3em] text-muted-foreground/60">
            <div className="flex gap-10">
              <span>© 2026 Omnidoc Systems Inc.</span>
              <span>All rights reserved</span>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-primary">Status: Operational</span>
              <span className="opacity-30">Build: d8f1a2z</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

function SpecBox({ label, value, detail }: { label: string, value: string, detail?: string }) {
  return (
    <div className="space-y-1">
      <div className="text-[10px] font-bold uppercase tracking-[0.4em] text-primary mb-2">{label}</div>
      <div className="text-4xl md:text-5xl font-bold tracking-tighter mb-1">{value}</div>
      {detail && <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{detail}</div>}
    </div>
  );
}

function FooterList({ title, links }: { title: string, links: string[] }) {
  return (
    <div className="space-y-6">
      <h5 className="text-[10px] font-bold uppercase tracking-[0.4em] text-primary">{title}</h5>
      <ul className="space-y-3">
        {links.map(link => (
          <li key={link}>
            <Link href="#" className="text-xs font-bold text-muted-foreground hover:text-primary transition-colors">
              {link}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
