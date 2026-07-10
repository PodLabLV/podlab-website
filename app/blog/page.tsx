import Navigation from '@/components/Navigation';
import HomePageWrapper from '@/components/HomePageWrapper';
import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Blog | Founder Duplication Insights',
  description: 'Insights on founder duplication, content systems, and building businesses that do not depend on you. Practical strategies for $1M-$8M service founders.',
  openGraph: {
    title: 'Blog — Founder Duplication Insights',
    description: 'Insights on founder duplication, content systems, and building businesses that do not depend on you.',
    url: 'https://podlablv.com/blog',
    images: [{ url: 'https://podlablv.com/podlab-og.png', width: 1366, height: 768, alt: 'PodLab' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Blog — Founder Duplication Insights',
    description: 'Insights on founder duplication, content systems, and building businesses that do not depend on you.',
    images: ['https://podlablv.com/podlab-og.png'],
  },
};

const posts = [
  {
    slug: "one-million-is-the-starting-line",
    title: "$1M Is the Starting Line. EssentialsLab Is the On-Ramp.",
    excerpt: "A million isn't the finish line — it's the starting line. Under $1M is the grind. EssentialsLab is the on-ramp: a lite version of the Business Growth System that cuts the fluff and builds a vehicle to get you there.",
    date: "June 1, 2026",
    readTime: "5 min read",
    image: "/blog/essentialslab.jpg",
    category: "Strategy",
  },
  {
    slug: "you-dont-need-more-content",
    title: "You Don't Need More Content — You Need Better Assets",
    excerpt: "Most founders are on a content treadmill. Posting daily, showing up everywhere, burning time they don't have — and wondering why it's not moving the needle.",
    date: "March 3, 2026",
    readTime: "8 min read",
    image: "/blog/pen-syringe.png",
    category: "Strategy",
  },
  {
    slug: "record-once-sell-forever",
    title: "The Record Once, Sell Forever Framework",
    excerpt: "Most founders treat content like a treadmill. Record, post, repeat. Every week, starting from zero. There's a better model.",
    date: "March 10, 2026",
    readTime: "10 min read",
    image: "/blog/beakers.png",
    category: "Framework",
  },
  {
    slug: "what-happens-in-a-studio-day",
    title: "What Happens in a PodLab Studio Day",
    excerpt: "You've got one day. No second chances. No 'we'll fix it in post.' That sounds intense. It is — by design.",
    date: "March 17, 2026",
    readTime: "5 min read",
    image: "/studio/bigboss-color.png",
    category: "Behind the Scenes",
  },
  {
    slug: "why-your-website-isnt-closing",
    title: "Why Your Website Isn't Closing — And What Will",
    excerpt: "Your website looks good. It says the right things. It even gets traffic. But it's not closing. Not the way you close.",
    date: "March 24, 2026",
    readTime: "5 min read",
    image: "/blog/flask-icon.png",
    category: "Sales",
  },
  {
    slug: "how-one-founder-cut-sales-calls-in-half",
    title: "How One Founder Cut Sales Calls in Half — Same Revenue",
    excerpt: "He was on 40 sales calls a month. Closing well. Growing steadily. And completely stuck.",
    date: "March 31, 2026",
    readTime: "4 min read",
    image: "/blog/hiram-hero.png",
    category: "Case Study",
  },
];

export default function BlogPage() {
  return (
    <HomePageWrapper><div className="min-h-screen">
      <Navigation />
      
      {/* Hero */}
      <section className="pt-32 pb-16 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-2xl sm:text-3xl md:text-5xl lg:text-7xl font-bold mb-6 leading-[0.95] tracking-tight">
            The <span className="text-accent">Blog</span>
          </h1>
          <p className="text-xl text-text-secondary font-light leading-relaxed max-w-2xl mx-auto">
            Insights on founder duplication, content systems, and building businesses that don't depend on you.
          </p>
        </div>
      </section>

      {/* Featured Post */}
      <section className="px-6 pb-12">
        <div className="max-w-5xl mx-auto">
          <Link href={`/blog/${posts[0].slug}`} className="block group">
            <article className="glass-card overflow-hidden grid md:grid-cols-2 gap-0">
              <div className="aspect-[16/10] md:aspect-auto relative overflow-hidden">
                <img 
                  src={posts[0].image} 
                  alt={posts[0].title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                />
                <div className="absolute inset-0 bg-gradient-to-r from-transparent to-[#0a0a0a]/60 md:block hidden" />
              </div>
              <div className="p-8 md:p-10 flex flex-col justify-center">
                <div className="flex items-center gap-3 mb-4">
                  <span className="text-xs text-accent font-semibold uppercase tracking-wider px-2 py-1 border border-accent/30 rounded">{posts[0].category}</span>
                  <span className="text-xs text-text-secondary">{posts[0].date}</span>
                  <span className="text-xs text-text-secondary">· {posts[0].readTime}</span>
                </div>
                <h2 className="text-3xl md:text-4xl font-bold mb-4 group-hover:text-accent transition-colors leading-tight">
                  {posts[0].title}
                </h2>
                <p className="text-text-secondary leading-relaxed mb-6">
                  {posts[0].excerpt}
                </p>
                <span className="text-accent font-semibold group-hover:gap-3 inline-flex items-center gap-2 transition-all">
                  Read Article <span className="group-hover:translate-x-1 transition-transform">→</span>
                </span>
              </div>
            </article>
          </Link>
        </div>
      </section>

      {/* Post Grid */}
      <section className="pb-24 px-6">
        <div className="max-w-5xl mx-auto grid md:grid-cols-2 gap-8">
          {posts.slice(1).map((post) => (
            <Link 
              key={post.slug} 
              href={`/blog/${post.slug}`}
              className="block group"
            >
              <article className="glass-card overflow-hidden h-full flex flex-col">
                <div className="aspect-[16/9] relative overflow-hidden">
                  <img 
                    src={post.image} 
                    alt={post.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a]/80 to-transparent" />
                  <span className="absolute top-4 left-4 text-xs text-accent font-semibold uppercase tracking-wider px-2 py-1 bg-black/60 backdrop-blur-sm border border-accent/30 rounded">{post.category}</span>
                </div>
                <div className="p-6 flex flex-col flex-grow">
                  <div className="flex items-center gap-3 mb-3 text-xs text-text-secondary">
                    <span>{post.date}</span>
                    <span>· {post.readTime}</span>
                  </div>
                  <h2 className="text-xl font-bold mb-3 group-hover:text-accent transition-colors leading-tight flex-grow">
                    {post.title}
                  </h2>
                  <p className="text-sm text-text-secondary leading-relaxed mb-4">
                    {post.excerpt}
                  </p>
                  <span className="text-accent font-semibold text-sm inline-flex items-center gap-2">
                    Read More <span className="group-hover:translate-x-1 transition-transform">→</span>
                  </span>
                </div>
              </article>
            </Link>
          ))}
        </div>
      </section>
    </div>
    </HomePageWrapper>
  );
}
