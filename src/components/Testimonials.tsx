import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { Star, CheckCircle2, Award, MessageSquarePlus } from 'lucide-react';
import { fetchApprovedTestimonials, Testimonial } from '../lib/testimonials';
import { SubmitTestimonialModal } from './SubmitTestimonialModal';
import { ShimmerCardGrid } from './ShimmerLoader';

const Testimonials: React.FC = () => {
  const [reviewsList, setReviewsList] = useState<Testimonial[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);

  const loadApprovedReviews = async () => {
    try {
      const data = await fetchApprovedTestimonials();
      setReviewsList(data);
    } catch (e) {
      console.warn("Error fetching approved testimonials:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadApprovedReviews();
    const handleUpdate = () => loadApprovedReviews();
    window.addEventListener('promedo_testimonials_updated', handleUpdate);
    return () => window.removeEventListener('promedo_testimonials_updated', handleUpdate);
  }, []);

  return (
    <section className="py-20 bg-white relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Centered Heading */}
        <div className="text-center max-w-2xl mx-auto mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-100 text-brand-blue text-xs font-bold mb-3">
            <Award size={14} />
            <span>Verified Doctor & Student Reviews</span>
          </div>

          <h2 className="text-4xl sm:text-5xl font-black font-display text-brand-dark tracking-tight leading-tight mb-4">
            You’re Not Alone, Hear From <br className="hidden sm:inline" />
            Our Community
          </h2>
          <p className="text-gray-500 text-xs sm:text-sm font-normal leading-relaxed mb-6">
            Real feedback and verified ratings from doctors and healthcare professionals who prepared with Promedo and cleared their licensing exams.
          </p>

          <button
            type="button"
            onClick={() => setIsSubmitModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-50 hover:bg-blue-100 text-brand-blue text-xs font-extrabold transition-all border border-blue-200/60 shadow-2xs cursor-pointer"
          >
            <MessageSquarePlus size={15} />
            <span>Enrolled Candidate? Share Your Review</span>
          </button>
        </div>

        {/* Card Grid */}
        {loading && reviewsList.length === 0 ? (
          <ShimmerCardGrid count={3} variant="subject" />
        ) : reviewsList.length === 0 ? (
          <div className="text-center py-12 px-6 rounded-3xl bg-blue-50/40 border border-blue-100 max-w-lg mx-auto">
            <div className="w-12 h-12 rounded-full bg-blue-100 text-brand-blue mx-auto flex items-center justify-center mb-3 shadow-2xs">
              <Award size={22} />
            </div>
            <h3 className="text-base font-bold text-brand-dark mb-1">
              Verified Candidate Success Stories
            </h3>
            <p className="text-xs text-gray-500 leading-relaxed">
              New doctor testimonials and exam reviews curated by the Promedo administration will appear here.
            </p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {reviewsList.map((item, idx) => (
              <motion.div
                key={item.id || idx}
                initial={{ opacity: 0, y: 15 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: Math.min(idx * 0.05, 0.4), duration: 0.4 }}
                className="bg-[#F8F9FE] hover:bg-white rounded-[24px] p-6 border border-gray-100 hover:border-brand-blue/20 hover:shadow-lg transition-all duration-300 flex flex-col justify-between"
              >
                <div>
                  {/* Author Info Header */}
                  <div className="flex items-center gap-3.5 mb-4">
                    <div className="w-12 h-12 rounded-full overflow-hidden bg-blue-50 shrink-0 border-2 border-white shadow-2xs flex items-center justify-center">
                      <img
                        src={item.avatar || `https://picsum.photos/seed/${item.id}/100/100`}
                        alt={item.name}
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1.5">
                        <h4 className="text-xs sm:text-sm font-bold text-brand-dark leading-tight truncate">{item.name}</h4>
                        {item.studentId && (
                          <span
                            className="text-[9px] font-extrabold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded-md border border-blue-100/80 shrink-0 flex items-center gap-0.5"
                            title={`Verified Student ID: ${item.studentId}`}
                          >
                            <CheckCircle2 size={10} className="text-brand-blue" />
                            Verified
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-gray-400 font-medium truncate mt-0.5">{item.role}</p>
                    </div>
                  </div>

                  {/* Quote Text */}
                  <p className="text-gray-600 text-xs sm:text-[13px] leading-relaxed font-normal mb-6">
                    "{item.text}"
                  </p>
                </div>

                {/* 5 Rating Stars */}
                <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                  <div className="flex items-center gap-1 text-amber-400">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star
                        key={s}
                        size={14}
                        fill={s <= (item.rating || 5) ? 'currentColor' : 'none'}
                        className={s <= (item.rating || 5) ? 'text-amber-400' : 'text-gray-200'}
                      />
                    ))}
                  </div>
                  {item.exam && (
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                      {item.exam}
                    </span>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {/* Candidate Submission Modal */}
        <SubmitTestimonialModal
          isOpen={isSubmitModalOpen}
          onClose={() => setIsSubmitModalOpen(false)}
          onSuccess={() => {
            loadApprovedReviews();
          }}
        />

      </div>
    </section>
  );
};

export default Testimonials;
