import Navigation from '@/components/Navigation';
import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Blog | Founder Duplication Insights | PodLab',
  description: 'Insights on founder duplication, content systems, and building businesses that do not depend on you. Practical strategies for $1M-$8M service founders.',
  openGraph: {
    title: 'Blog | Founder Duplication Insights | PodLab',
    description: 'Insights on founder duplication, content systems, and building businesses that do not depend on you.',
    url: 'https://podlablv.com/blog',
  },
  twitter: {
    title: 'Blog | Founder Duplication Insights | PodLab',
    description: 'Insights on founder duplication and content systems.',
  },
};

export default function BlogPage() {
  return (
    <div className="min-h-screen">
      <Navigation />
      
      {/* Hero */}
      <section className="relative pt-32 pb-24 px-6 overflow-hidden bg-gradient-to-b from-black to-bg-secondary">
        {/* Animated Background (MP4 for performance) */}
        <div className="absolute inset-0 flex items-center justify-center opacity-20">
          <video
            autoPlay
            loop
            muted
            playsInline
            className="w-full h-full object-cover"
          >
            <source src="/podlab-logo-live-action.mp4" type="video/mp4" />
          </video>
          <div className="absolute inset-0 bg-black/50"></div>
        </div>
        
        <div className="relative z-10 max-w-6xl mx-auto text-center">
          <h1 className="text-7xl md:text-8xl font-black mb-8 leading-[0.95] tracking-tight">
            The <span className="bg-gradient-to-r from-white via-accent to-white bg-clip-text text-transparent bg-[length:200%_100%] animate-[gradient_4s_ease-in-out_infinite]">Blog</span>
          </h1>
          <p className="text-2xl md:text-3xl text-text-secondary font-light leading-relaxed max-w-4xl mx-auto">
            Insights on <span className="text-white font-semibold">founder duplication</span>, content systems, and building businesses that <span className="text-accent font-bold">don't depend on you</span>.
          </p>
        </div>
      </section>

      {/* Posts */}
      <section className="pb-24 px-6">
        <div className="max-w-5xl mx-auto space-y-12">
          {posts.map((post) => (
            <Link 
              key={post.slug} 
              href={`/blog/${post.slug}`}
              className="block group"
            >
              <article className="p-8 bg-bg-tertiary border border-border rounded-xl hover:border-accent transition-all">
                <div className="text-sm text-accent mb-3">{post.date}</div>
                <h2 className="text-3xl font-bold mb-4 group-hover:text-accent transition">
                  {post.title}
                </h2>
                <p className="text-lg text-text-secondary mb-6 leading-relaxed">
                  {post.excerpt}
                </p>
                <div className="text-accent font-semibold">
                  Read More →
                </div>
              </article>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}

const posts = [
  {
    slug: "you-dont-need-more-content",
    title: "You Don't Need More Content — You Need Better Assets",
    excerpt: "Most founders are on a content treadmill. Posting daily, showing up everywhere, burning time they don't have — and wondering why it's not moving the needle.",
    date: "Week 1",
  },
  {
    slug: "record-once-sell-forever",
    title: "The Record Once, Sell Forever Framework",
    excerpt: "Most founders treat content like a treadmill. Record, post, repeat. Every week, starting from zero. There's a better model.",
    date: "Week 2",
  },
  {
    slug: "what-happens-in-a-studio-day",
    title: "What Happens in a Podlab Studio Day",
    excerpt: "You've got one day. No second chances. No we'll fix it in post. That sounds intense. It is — by design.",
    date: "Week 3",
  },
  {
    slug: "why-your-website-isnt-closing",
    title: "Why Your Website Isn't Closing — And What Will",
    excerpt: "Your website looks good. It says the right things. It even gets traffic. But it's not closing. Not the way you close.",
    date: "Week 4",
  },
  {
    slug: "how-one-founder-cut-sales-calls-in-half",
    title: "How One Founder Cut Sales Calls in Half — Same Revenue",
    excerpt: "He was on 40 sales calls a month. Closing well. Growing steadily. And completely stuck.",
    date: "Week 5",
  },
];
