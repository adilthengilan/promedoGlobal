import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { Trophy } from 'lucide-react';
import { db } from '../lib/firebase';
import { collection, getDocs, query, where } from 'firebase/firestore';

const DEFAULT_POSTERS = [
  "./dr1.jpeg",
  "./dr2.jpeg",
  "./dr3.jpeg",
  "./dr4.jpeg",
  "./dr5.jpeg",
  "./dr6.jpeg",
  "./dr7.jpeg",
  "./dr8.jpeg",
  "./dr9.jpeg",
  "./dr10.jpeg",
  "./dr11.jpeg",
  "./dr12.jpeg",
  "./dr13.jpeg",
  "./dr14.jpeg",
  "./dr15.jpeg",
  "./dr16.jpeg",
  "./dr17.jpeg",
  "./dr18.jpeg",
  "./dr19.jpeg",
  "./dr20.jpeg"
];

const Faculty = () => {
  const [posters, setPosters] = useState<string[]>(DEFAULT_POSTERS);

  const fetchPosters = async () => {
    try {
      const fetched: string[] = [];

      // Fetch from halloffame collection
      try {
        const hofSnap = await getDocs(collection(db, 'halloffame'));
        hofSnap.docs.forEach(d => {
          const url = d.data().posterUrl || d.data().image;
          if (url) fetched.push(url);
        });
      } catch (e) {
        console.warn("Hall of fame collection check:", e);
      }

      // Fetch approved reviews with posterUrls
      try {
        const reviewsSnap = await getDocs(query(collection(db, 'reviews'), where('status', '==', 'approved')));
        reviewsSnap.docs.forEach(d => {
          const url = d.data().posterUrl;
          if (url && !fetched.includes(url)) fetched.push(url);
        });
      } catch (e) {
        console.warn("Reviews collection check:", e);
      }

      if (fetched.length > 0) {
        setPosters([...fetched, ...DEFAULT_POSTERS]);
      }
    } catch (err) {
      console.warn("Error fetching hall of fame posters:", err);
    }
  };

  useEffect(() => {
    fetchPosters();
  }, []);

  const marqueePosters = [...posters, ...posters, ...posters, ...posters];

  return (
    <section id="faculty" className="py-16 bg-[#FAFBFD] overflow-hidden relative">
      {/* Side Gradient Shadows for smooth edge fade */}
      <div className="absolute top-0 bottom-0 left-0 w-16 sm:w-32 bg-gradient-to-r from-[#FAFBFD] to-transparent z-20 pointer-events-none" />
      <div className="absolute top-0 bottom-0 right-0 w-16 sm:w-32 bg-gradient-to-l from-[#FAFBFD] to-transparent z-20 pointer-events-none" />

      {/* Header Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center mb-8 relative z-10">
        <span className="inline-flex items-center gap-1.5 px-3.5 py-1 bg-brand-periwinkle text-brand-blue text-xs font-black rounded-full mb-3">
          <Trophy size={14} />
          <span>Hall of Fame & Success Stories</span>
        </span>
        <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black font-display text-brand-dark tracking-tight mb-3">
          Congratulations to Our Achievers
        </h2>
        <p className="max-w-2xl mx-auto text-gray-500 text-xs sm:text-sm leading-relaxed">
          Celebrating medical professionals who successfully cleared their DHA, DOH/HAAD, MOH, and SMLE licensing exams with top scores.
        </p>
      </div>

      <div>
        {/* Scrolling Row */}
        <div className="relative w-full overflow-hidden">
          <motion.div
            className="flex gap-5 w-max"
            animate={{ x: ["-50%", "0%"] }}
            transition={{
              ease: "linear",
              duration: 65,
              repeat: Infinity
            }}
          >
            {marqueePosters.map((imgUrl, idx) => (
              <div 
                key={`poster-${idx}`} 
                className="group relative w-[220px] sm:w-[260px] shrink-0 aspect-[3/4] rounded-2xl overflow-hidden bg-gray-100 shadow-md hover:shadow-2xl hover:scale-105 transition-all duration-300 border border-gray-100 hover:border-brand-blue/30 cursor-pointer"
              >
                <img 
                  src={imgUrl} 
                  alt="Success Poster" 
                  className="w-full h-full object-cover transition-all duration-500 group-hover:scale-110 group-hover:brightness-105"
                  referrerPolicy="no-referrer"
                />
                {/* Subtle Hover Glow Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-brand-dark/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              </div>
            ))}
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default Faculty;


