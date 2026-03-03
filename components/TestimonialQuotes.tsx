'use client';

import FadeIn from './FadeIn';
import Image from 'next/image';

const testimonials = [
  {
    quote: "Hiram duplicated me in 4K. Now my best sales conversation works 24/7 while I sleep.",
    author: "Austin Martinez",
    title: "$3.2M Agency Owner",
    image: "/case-studies/austin.png"
  },
  {
    quote: "We cut our sales calls in half and closed more deals. The videos do the heavy lifting.",
    author: "Client Name",
    title: "$5M Service Business",
    image: null
  },
  {
    quote: "Finally broke through the founder bottleneck. My team can close deals without me.",
    author: "Client Name",
    title: "$2.8M Consulting Firm",
    image: null
  }
];

export default function TestimonialQuotes() {
  return (
    <section className="py-32 px-6 bg-gradient-to-b from-bg-secondary via-black to-bg-secondary">
      <div className="max-w-7xl mx-auto">
        <FadeIn>
          <h2 className="text-5xl md:text-6xl font-black text-center mb-4">
            What <span className="text-accent drop-shadow-[0_0_25px_rgba(57,255,20,0.5)]">Founders Say</span>
          </h2>
          <p className="text-xl text-text-secondary text-center mb-16 max-w-2xl mx-auto">
            Real results from founders who duplicated themselves with PodLab.
          </p>
        </FadeIn>

        <div className="grid md:grid-cols-3 gap-8">
          {testimonials.map((testimonial, index) => (
            <FadeIn key={index} delay={index * 0.15} direction="up">
              <div className="bg-gradient-to-br from-bg-tertiary to-bg-secondary border-2 border-border rounded-2xl p-8 hover:border-accent hover:-translate-y-2 hover:shadow-[0_20px_60px_rgba(57,255,20,0.2)] transition-all duration-350">
                <div className="mb-6">
                  <svg className="w-12 h-12 text-accent opacity-20" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z" />
                  </svg>
                </div>
                
                <p className="text-lg text-text-primary mb-6 italic leading-relaxed">
                  "{testimonial.quote}"
                </p>
                
                <div className="flex items-center gap-4">
                  {testimonial.image && (
                    <Image
                      src={testimonial.image}
                      alt={testimonial.author}
                      width={48}
                      height={48}
                      className="rounded-full border-2 border-accent"
                    />
                  )}
                  <div>
                    <div className="font-bold text-text-primary">{testimonial.author}</div>
                    <div className="text-sm text-text-secondary">{testimonial.title}</div>
                  </div>
                </div>
              </div>
            </FadeIn>
          ))}
        </div>
      </div>
    </section>
  );
}
