import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import {
    ArrowUpRight,
    AudioLines,
    FileText,
    Github,
    History,
    Languages,
    Linkedin,
    Lock,
    Search,
} from "lucide-react";
import MadeWithLove from "@/components/about/MadeWithLove";

export const metadata: Metadata = {
    title: "About · Lumora",
    description: "Lumora turns your books into voice conversations. Meet the team behind it.",
};

const FEATURES = [
    {
        Icon: FileText,
        title: "Upload & understand",
        description: "Drop in a PDF. Lumora reads every page and breaks the book into searchable passages.",
    },
    {
        Icon: AudioLines,
        title: "Talk, don't type",
        description: "Real-time voice conversations with an AI companion that listens, thinks and answers out loud.",
    },
    {
        Icon: Languages,
        title: "Speaks your language",
        description: "Chat in English, Hindi or Hinglish, with natural Indian voices like सागर and नैना.",
    },
    {
        Icon: Search,
        title: "Answers from the book",
        description: "Every answer is grounded in your book: Lumora searches the pages before it speaks.",
    },
    {
        Icon: Lock,
        title: "Your library, your rules",
        description: "Keep a book private to yourself, or share it with everyone in the public library.",
    },
    {
        Icon: History,
        title: "Never lose a thought",
        description: "Revisit past conversations any time with your full conversation history.",
    },
];

const TECH_STACK = [
    "Next.js",
    "React",
    "TypeScript",
    "Tailwind CSS",
    "Three.js",
    "Vapi",
    "ElevenLabs",
    "Deepgram",
    "MongoDB Atlas",
    "Clerk",
    "Vercel",
];

const TEAM = [
    {
        name: "Tanishak Singhal",
        role: "Full-Stack Developer",
        photo: "/assets/team/tanishak.jpg",
        bio: "Final-year Computer Science student from Delhi who believes “writing code is an art”. Builds full-stack products with React, Next.js and Node, usually with an LLM wired in somewhere.",
        highlights: ["Product Management Intern · Awign", "DS & ML Apprentice · IBM", "DSA Teaching Assistant · Apna College"],
        portfolio: "https://tanishak-singhal.vercel.app",
        github: "https://github.com/TanisqSinghal",
        linkedin: "https://www.linkedin.com/in/tanishak-singhal-31462a275/",
    },
    {
        name: "Rahul Sharma",
        role: "Software & AI Engineer",
        photo: "/assets/team/rahul.jpg",
        bio: "B.Tech Computer Science student at GGSIPU who builds reliable software and practical AI products, from legal document analysers to computer-vision pipelines.",
        highlights: ["Software Intern · Appolo Computers", "DS & ML Intern · IBM", "Technical Team · GDGC"],
        portfolio: "https://portfolio-rahul-sharma-projects.vercel.app/",
        github: "https://github.com/RAHUL20049711",
        linkedin: "https://www.linkedin.com/in/rahul-sharma-78142119b",
    },
];

const page = () => (
    <main className="wrapper container about-page">
        {/* Intro */}
        <section className="about-hero">
            <div className="about-hero-copy">
                <p className="about-eyebrow">
                    <span className="hero3d-agent-dot" aria-hidden="true" />
                    About Lumora
                </p>
                <h1 className="about-title">
                    <span className="hero3d-shine">Books that</span>{" "}
                    <span className="about-title-accent">talk back.</span>
                </h1>
                <p className="about-lead">
                    Lumora turns any PDF into a living conversation. Upload a book, pick a voice, and talk it
                    through in English, Hindi or Hinglish. Every answer comes straight from the pages you uploaded.
                </p>
                <div className="about-actions">
                    <Link href="/books/new" className="hero3d-cta">Add your first book</Link>
                    <Link href="/" className="about-btn-ghost">Explore the library</Link>
                </div>
            </div>

            <div className="about-mascot" aria-hidden="true">
                <span className="about-mascot-ring" />
                <span className="about-mascot-ring about-mascot-ring-inner" />
                <Image src="/assets/lumora-mark.png" alt="" width={220} height={220} className="about-mascot-image" priority />
            </div>
        </section>

        {/* What it does */}
        <section className="about-section">
            <h2 className="about-section-title">
                <span className="hero3d-shine">How Lumora works</span>
            </h2>
            <ul className="about-features">
                {FEATURES.map(({ Icon, title, description }) => (
                    <li key={title} className="about-feature">
                        <span className="about-feature-icon">
                            <Icon className="size-5" aria-hidden="true" />
                        </span>
                        <h3 className="about-feature-title">{title}</h3>
                        <p className="about-feature-description">{description}</p>
                    </li>
                ))}
            </ul>
        </section>

        {/* Built with */}
        <section className="about-section">
            <h2 className="about-section-title">
                <span className="hero3d-shine">Built with</span>
            </h2>
            <ul className="about-stack">
                {TECH_STACK.map((tech) => (
                    <li key={tech} className="about-stack-chip">{tech}</li>
                ))}
            </ul>
        </section>

        {/* Team */}
        <section className="about-section">
            <h2 className="about-section-title">
                <span className="hero3d-shine">Meet the builders</span>
            </h2>
            <div className="about-team">
                {TEAM.map((member) => (
                    <article key={member.name} className="about-member">
                        <div className="about-member-photo-wrap">
                            <span className="about-member-ring" aria-hidden="true" />
                            <Image
                                src={member.photo}
                                alt={`Photo of ${member.name}`}
                                width={160}
                                height={160}
                                className="about-member-photo"
                            />
                        </div>
                        <h3 className="about-member-name hero3d-shine">{member.name}</h3>
                        <p className="about-member-role">{member.role}</p>
                        <p className="about-member-bio">{member.bio}</p>
                        <ul className="about-member-highlights">
                            {member.highlights.map((item) => (
                                <li key={item}>{item}</li>
                            ))}
                        </ul>
                        <div className="about-member-links">
                            <a href={member.portfolio} target="_blank" rel="noopener noreferrer" className="about-member-portfolio">
                                View portfolio
                                <ArrowUpRight className="size-4" aria-hidden="true" />
                            </a>
                            <a href={member.github} target="_blank" rel="noopener noreferrer" className="about-member-icon" aria-label={`${member.name} on GitHub`}>
                                <Github className="size-4" aria-hidden="true" />
                            </a>
                            <a href={member.linkedin} target="_blank" rel="noopener noreferrer" className="about-member-icon" aria-label={`${member.name} on LinkedIn`}>
                                <Linkedin className="size-4" aria-hidden="true" />
                            </a>
                        </div>
                    </article>
                ))}
            </div>
        </section>

        <MadeWithLove />
    </main>
);

export default page;
