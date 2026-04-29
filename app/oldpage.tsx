'use client';
import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useSession, signIn, signOut } from 'next-auth/react';
import { motion, AnimatePresence } from 'framer-motion';
import Splide from '@splidejs/splide';
import '@splidejs/splide/css';
import Image from 'next/image';

// Types
type Testimonial = {
  id: number;
  name: string;
  content: string;
  rating: number;
  role: string;
  date: string;
};
type TokenPackage = {
  id: string;
  name: string;
  description: string;
  tokenAmount: number;
  price: number;
  currency: string;
  isActive: boolean;
  popular?: boolean;
  features?: string[];
};
type UsageRate = {
  id: string;
  service: string;
  rate: number;
  unit: string;
  description: string;
  isActive: boolean;
};
type Review = {
  id: number;
  name: string;
  role: string;
  rating: number;
  comment: string;
  date: string;
  avatarColor: string;
  likes?: number;
};

// ----- DYNAMIC REVIEWS ARRAY (from provided list) -----
const allStudentReviews: Review[] = [
  {
    id: 1,
    name: 'Ogor Osemeke',
    role: 'Local Guide · 21 reviews · 8 photos',
    rating: 5,
    comment: 'I joined Acemedix 7 weeks late because I made the decision to write the exam only a few days before the registration deadline. I didn\'t know if I would be able to finish studying on time but with the help of the Acemedix tutors (online and in my physical center) and with the amazing website, I was able to study well for the exam. Thank you Acemedix!',
    date: 'a year ago',
    avatarColor: 'bg-blue-100',
    likes: 1
  },
  {
    id: 2,
    name: 'Amaka A.',
    role: '7 reviews · 1 photo',
    rating: 5,
    comment: 'I have no words to describe my gratitude to Ace medix. The teachers are very patient and willing to teach. They will help you with clerking and counselling that you would be doing it in your sleep, no jokes. Even after class you can practice with the teachers, I mean... Thank you Ace medix, you made me Ace this exam😘',
    date: 'a year ago',
    avatarColor: 'bg-teal-100',
    likes: 2
  },
  {
    id: 3,
    name: 'Adedoyin Goodness Sotonwa',
    role: 'Local Guide · 16 reviews · 1 photo',
    rating: 5,
    comment: 'While there\'s no perfect way to prepare for the MDCN exam, I strongly believe that ACEMEDIX is the next best thing to perfection. Beyond the materials and passionate tutors, you have the gift of like-minded people—and that alone helps you thrive. Look no further and take this right step. I can\'t but laud the efficiency of the online mode, I did 9 out of the total 11 weeks online; hence, I can vouch for it. Mixing/Having study sessions with other candidates from their differents centres goes a long way in solidifying things too, as no one is an island. Dear candidate, this dream of yours is attainable! Dare to do it and do it right with ACEMEDIX!',
    date: 'a year ago',
    avatarColor: 'bg-indigo-100',
    likes: 1
  },
  {
    id: 4,
    name: 'Na Leo Tarbunde',
    role: 'Local Guide · 11 reviews',
    rating: 5,
    comment: 'If I had known about Acemedix Tutorials as soon as I was done with Medical school I would have signed up sooner. Upstanding and diligent in their work. Grateful to them for the hard work they have done in moulding me into a better doctor. 10/10 would recommend to future MDCN applicants',
    date: '6 years ago',
    avatarColor: 'bg-blue-50',
    likes: 0
  },
  {
    id: 5,
    name: 'Oladapo Anthonia',
    role: '1 review',
    rating: 5,
    comment: 'I highly recommend Acemedix to anyone willing to ace the exam at one sitting,especially if you v been out of school for a while and NEVER miss Dr Fahad\'s class no matter how long it is cos you snooze you miss. Everything you need to excel in the exam is available, I bet you If you listen and go by all you are asked to do you won\'t have a problem on that day. They have excellent tutors who are passionate to see you succeed and are always available if you are not clear on anything. Like all you need is there no caps. Special thanks to Dr Livinus. Dr Zack, Dr Fahad(he\'s ur secret weapon,always attend the lectures,be attentive e get why) and our very own Dr Lee and all the amazing tutors. Thanks for making our dream a reality. Dr Livinus we are all here because of you,thanks for this vision behind this academy,we are your testimonies that you are doing great, thank you. Dr. Tonia',
    date: 'a year ago',
    avatarColor: 'bg-blue-100',
    likes: 0
  },
  {
    id: 6,
    name: 'Chimgozirim Ihejirika',
    role: '1 review',
    rating: 5,
    comment: 'It was a pleasant experience learning under this platform. They were very sincere and dedicated to see us pass. Thank you Acemedix for your unwavering dedication. I passed my licensure exam in one sitting.',
    date: 'a year ago',
    avatarColor: 'bg-green-100',
    likes: 1
  },
  {
    id: 7,
    name: 'Khadıjah',
    role: '5 reviews',
    rating: 5,
    comment: '… , but I subscribed to the acemedix website and also attended the new bullet point class, which really helped me to ace the exams. A big thanks to Dr dozie himself, Dr fahad & Dr buhari for giving their all in tutoring us.',
    date: 'a year ago',
    avatarColor: 'bg-amber-100',
    likes: 0
  },
  {
    id: 8,
    name: 'Iyinoluwa Ayedegbe',
    role: '2 reviews · 1 photo',
    rating: 5,
    comment: '… Academy really moved mountains for us. The doctors who lectured took their time to grill us and prepare us for all aspects of the exam from the CBT to the OSCE. They were available 24/7 for any enquiry and I passed my exam',
    date: 'a year ago',
    avatarColor: 'bg-purple-100',
    likes: 1
  },
  {
    id: 9,
    name: 'Dr Cherry Osigwe',
    role: 'Local Guide · 10 reviews · 15 photos',
    rating: 5,
    comment: '… I keep referring people to them because they will build up your confidence and make sure you are very prepared for the exam. They have very flexible timetable of morning or afternoon or online section and best of it all is that …',
    date: '6 years ago',
    avatarColor: 'bg-rose-100',
    likes: 2
  },
  {
    id: 10,
    name: 'Bisola Fakorede',
    role: '2 reviews',
    rating: 5,
    comment: 'Acemedix was quite invaluable during my preparation for the MDCN examination. I appreciate the efforts of the tutors. They were very much interested in our success. It didn’t seem like just a job to them. I’m grateful to you all.',
    date: '5 years ago',
    avatarColor: 'bg-cyan-100',
    likes: 1
  },
  {
    id: 11,
    name: 'Isa Andamin Bobbo',
    role: '2 reviews',
    rating: 5,
    comment: '… learning and study with their extraordinary team doctors. Their main focus is to prepare you very well for MDCN assessment examination and beyond, which they always succeed with the pass rate of more than 90%. Acemedix academy is …',
    date: '6 years ago',
    avatarColor: 'bg-emerald-100',
    likes: 1
  },
  {
    id: 12,
    name: 'Imo Udoidiok',
    role: '1 review',
    rating: 5,
    comment: 'If you’re looking to pass this MDCN exam once and for all, Acemedix is the place for you. You get loads of guidance down to how to make your own personal timetable! It is absolutely focused. You’re not lost in the crowd as we were …',
    date: '6 years ago',
    avatarColor: 'bg-slate-100',
    likes: 2
  },
  {
    id: 13,
    name: 'Ella Ray',
    role: '3 reviews',
    rating: 5,
    comment: 'I personally want to thank them for the help during the exams I didn’t join their tutorials put I had access to their website for free and it was really helpful . God bless you Dr Livinus thank you for the push , encouragement and …',
    date: 'a year ago',
    avatarColor: 'bg-fuchsia-100',
    likes: 1
  },
  {
    id: 14,
    name: 'Evangeline Obichere',
    role: '3 reviews',
    rating: 5,
    comment: '… , Dr. Abdul, just to mention a few) did an excellent job and stopped at nothing to ensure our success on the MDCN exams. The amount of effort and time they put in to prepare us was unbelievable. Please don’t hesitate to give them a …',
    date: '5 years ago',
    avatarColor: 'bg-lime-100',
    likes: 2
  },
  {
    id: 15,
    name: 'Taram Iruo',
    role: '2 reviews',
    rating: 5,
    comment: 'They are the best tutorial out there for MDCN exams. They teach you what you NEED to pass the exams, and they reinforce this knowledge repeatedly through out the period of study. They are always there for you academically, …',
    date: '5 years ago',
    avatarColor: 'bg-orange-100',
    likes: 0
  },
  {
    id: 16,
    name: 'John Tobi Ojajune',
    role: '1 review',
    rating: 5,
    comment: 'To God be the glory. Anyone preparing for the MDCN exam should get in touch with Acemedix Academy. Dr Dozie knows his stuff very well.',
    date: 'a year ago',
    avatarColor: 'bg-pink-100',
    likes: 1
  },
  {
    id: 17,
    name: 'Etomchi Igwe',
    role: '5 reviews · 2 photos',
    rating: 5,
    comment: 'Acemedix as the name depicts, will help you ACE your MDCN exams. I am a living witness of their top notch tutorial services, they\'re simply the BEST! Register for their tutorials today and you\'d never regret it.',
    date: '6 years ago',
    avatarColor: 'bg-sky-100',
    likes: 1
  },
  {
    id: 18,
    name: 'Eggy Morhirhi',
    role: '2 reviews',
    rating: 5,
    comment: '… I had in Acemedix. The environment was friendly and the tutors were awesome people.. I started the tutorial with so many fears but as at the time it was over, I had so much confidence in passing the exam. Thank you so much ACEMEDIX.',
    date: '6 years ago',
    avatarColor: 'bg-violet-100',
    likes: 1
  },
  {
    id: 19,
    name: 'CHIOMA ONU',
    role: '2 reviews',
    rating: 5,
    comment: 'Acemedix is a great tutorial to use for MDCN preparation. It helps you focus on the important materials and topics of the examination but most importantly it aids in your confidence and approach for the exam which cannot be …',
    date: '6 years ago',
    avatarColor: 'bg-indigo-100',
    likes: 1
  },
  {
    id: 20,
    name: 'Morakins',
    role: '2 reviews',
    rating: 5,
    comment: 'ACEMEDIX just like the name implies helped me ACE the MDCN exam at first sitting. Acemedix team organized and simplified all I needed to know for the exam and most importantly they don’t stop until everyone understands. If you …',
    date: '5 years ago',
    avatarColor: 'bg-teal-100',
    likes: 0
  },
  {
    id: 21,
    name: 'Dr Juwairah',
    role: '1 review',
    rating: 5,
    comment: 'Acemedix is really the place to be when preparing for MDCN exams, before I joined I couldn’t even clerk or council and i had 0 confidence . Honestly, I didn’t just gain knowledge for mdcn but i also learned things that will help for …',
    date: '6 years ago',
    avatarColor: 'bg-amber-100',
    likes: 0
  },
  {
    id: 22,
    name: 'Adedoyin Adedapo',
    role: '4 reviews',
    rating: 5,
    comment: '… one to stay with in Abuja . The classes were highly interactive and focused on everything we needed to know for mdcn exam. The mocks also helped to access our level of preparedness. I highly recommend acemedix tutorial to …',
    date: '6 years ago',
    avatarColor: 'bg-blue-50',
    likes: 1
  },
  {
    id: 23,
    name: 'Ameera Yakubu',
    role: '5 reviews',
    rating: 5,
    comment: 'I joined Acemdix because I needed guide on areas to focus on for my mdcn exam and it went beyond what I expected. I was guided and was given emotional support. I was encouraged and my confidence level went high. I thank the almighty …',
    date: '6 years ago',
    avatarColor: 'bg-green-100',
    likes: 0
  },
  {
    id: 24,
    name: 'Hakeem Saadu',
    role: '3 reviews',
    rating: 5,
    comment: '… helpful, will help you with any questions you may have and guide you on what is exactly needed to pass the MDCN EXAM! So if you want someone to understand and point out your strengths and weaknesses and work with you to improve …',
    date: '6 years ago',
    avatarColor: 'bg-rose-100',
    likes: 2
  },
  {
    id: 25,
    name: 'Margaret Ayosiora',
    role: '1 review',
    rating: 5,
    comment: '… . I also want to say thank to doctor Dozie. The mcqs are good but you have to do it with the mindset of understanding the reason for correct and wrong answers. This will help in the exam when you likely see a similar question.',
    date: 'a year ago',
    avatarColor: 'bg-cyan-100',
    likes: 1
  },
  {
    id: 26,
    name: 'both oforibika',
    role: '1 review',
    rating: 5,
    comment: 'I\'m super glad to be part of this great Acemedix Academy Family. They built great confidence in me. I\'m so grateful. Highly Recommended to ACE MDCN Exam.',
    date: '5 years ago',
    avatarColor: 'bg-emerald-100',
    likes: 1
  },
  {
    id: 27,
    name: 'Balogun Olutola',
    role: '4 reviews · 1 photo',
    rating: 5,
    comment: 'I can\'t thank God enough for making me pass through acemedix in preparation for my mdcn exam. Dr Livinus and co are great and awesome. Very insightful, concerned, caring and encouraging. With God and acemedix your success is …',
    date: '5 years ago',
    avatarColor: 'bg-slate-100',
    likes: 1
  },
  {
    id: 28,
    name: 'Fatima Salau',
    role: 'Local Guide · 20 reviews · 3 photos',
    rating: 5,
    comment: '… confidence and helped me get through the stage of writing the MDCN and I’m very confident that joining them was the best decision I made towards this exam ... thank you so much doctor livinus for the whole journey',
    date: '5 years ago',
    avatarColor: 'bg-fuchsia-100',
    likes: 0
  },
  {
    id: 29,
    name: 'Mariam Oronna',
    role: '1 review',
    rating: 5,
    comment: 'Acedmix is one of the most amazing things that as ever happened to me. I aced my MDCN exam in just one sitting. All thanks to Acemedix Acedemy and Almighty Allah.',
    date: '6 years ago',
    avatarColor: 'bg-lime-100',
    likes: 1
  },
  {
    id: 30,
    name: 'George Okechukwu',
    role: '1 review',
    rating: 5,
    comment: 'I did not know where to start from in preparation for the MDCN just 7 wks to the exam, honestly Dr Livinius and all the tutors where instrumental in helping me pass thank you so much and for those planning on writing I can recommend …',
    date: '5 years ago',
    avatarColor: 'bg-orange-100',
    likes: 0
  },
  {
    id: 31,
    name: 'Gt J',
    role: 'Local Guide · 163 reviews · 42 photos',
    rating: 5,
    comment: 'Great tutorial. Good leadership, well organised, informative, prepares you well for the MDCN assessment examination. You can\'t go wrong with AceMedix.',
    date: '6 years ago',
    avatarColor: 'bg-pink-100',
    likes: 0
  },
  {
    id: 32,
    name: 'sonia uzuegbu',
    role: '3 reviews',
    rating: 5,
    comment: 'I’m really glad I had Acemedix to help prepare me for the exam. They really do everything and more to guide you to success!',
    date: '6 years ago',
    avatarColor: 'bg-sky-100',
    likes: 1
  },
  {
    id: 33,
    name: 'tiwaloluwa michael',
    role: '3 reviews',
    rating: 5,
    comment: 'When it comes to preparation for Licensing exam especially MDCN, look no further than Acemedix academy.',
    date: 'a year ago',
    avatarColor: 'bg-violet-100',
    likes: 2
  },
  {
    id: 34,
    name: 'Abimbola Adegun',
    role: '3 reviews',
    rating: 5,
    comment: 'Acemedix is your best bet if you want to pass the mdcn exam. Give it a trial. Trust me, you wouldn\'t regret it. Acemedix forever!!!!',
    date: '5 years ago',
    avatarColor: 'bg-indigo-100',
    likes: 1
  },
  {
    id: 35,
    name: 'Saadatu Lawal',
    role: '1 review',
    rating: 5,
    comment: 'Acemedix website is the best material for MDCN exams🥳🔥….MDCN RECALL 🔥…Thank you Dr Livinus',
    date: 'a year ago',
    avatarColor: 'bg-teal-100',
    likes: 1
  },
  {
    id: 36,
    name: 'Bob Okoi',
    role: '1 review',
    rating: 5,
    comment: 'Acemedix is like a map that guides the explorer i.e Foreign Doctor, toward the success of the MDCN exams i.e Treasure.',
    date: '6 years ago',
    avatarColor: 'bg-amber-100',
    likes: 3
  },
  {
    id: 37,
    name: 'Nnenne Omeje',
    role: '1 review',
    rating: 5,
    comment: 'I\'ll recommend Acemedix any day, any time to anyone who wants to ace the MDCN exam.',
    date: '5 years ago',
    avatarColor: 'bg-blue-100',
    likes: 0
  },
  {
    id: 38,
    name: 'Joy Damkor',
    role: '1 review',
    rating: 5,
    comment: 'The mock test were worth it. It made the main exam alot easier. All thanks to Acemedix Family.',
    date: '6 years ago',
    avatarColor: 'bg-green-100',
    likes: 1
  },
  {
    id: 39,
    name: 'Babas',
    role: 'Local Guide · 7 reviews',
    rating: 5,
    comment: 'Acemedix will always be part of my success story ... y\'all made passing the MDCN exams a reality',
    date: '5 years ago',
    avatarColor: 'bg-rose-100',
    likes: 1
  },
  {
    id: 40,
    name: 'tawo ntor',
    role: '1 review',
    rating: 5,
    comment: 'If you want a detailed, focused and precised guide to prepare for the MDCN examination, Acemedix is the place to be.',
    date: '6 years ago',
    avatarColor: 'bg-cyan-100',
    likes: 0
  },
  {
    id: 41,
    name: 'Ripei Oshaka',
    role: '4 reviews',
    rating: 5,
    comment: 'Best for preparing for MDCN Exams. After failing the exams, I joined acemedix family and I passed',
    date: '6 years ago',
    avatarColor: 'bg-emerald-100',
    likes: 0
  },
  {
    id: 42,
    name: 'cynthia nwandiko',
    role: '7 reviews',
    rating: 5,
    comment: 'You can\'t get a better, ideal, preparation for MDCN exam from anywhere else. Tried and trusted.',
    date: '5 years ago',
    avatarColor: 'bg-slate-100',
    likes: 2
  },
  {
    id: 43,
    name: 'Kingzo “DrKingzo” Official',
    role: '3 reviews · 2 photos',
    rating: 5,
    comment: 'An amazing platform for training and prepping doctors for the licensing exam',
    date: '6 years ago',
    avatarColor: 'bg-fuchsia-100',
    likes: 2
  },
  {
    id: 44,
    name: 'Ray Rick',
    role: '4 reviews',
    rating: 5,
    comment: 'Best place to prepare for mdcn examination.',
    date: '6 years ago',
    avatarColor: 'bg-lime-100',
    likes: 0
  }
];

// Featured testimonials for slider (5 only)
const featuredTestimonials: Testimonial[] = [
  {
    id: 1,
    name: 'Dr. Muritala Oluwaseun Grace',
    role: 'MDCN Candidate 2024',
    content: 'Three things were involved in this exam: God, preparation, and belief in myself. The God factor was definitely at work here, and the help of Acemedix with the preparation sealed it. I was an online candidate, so I had to work extra hard to stay motivated and get enough practice. The website, the classes, the mocks, the ISS, the encouragement, and the sacrifices are all worthy of recognition and applause.',
    rating: 5,
    date: 'December 2024'
  },
  {
    id: 2,
    name: 'Dr. Abiade Odeleye',
    role: 'MDCN Candidate',
    content: 'Passing the MDCN exam has been one of the most fulfilling milestones of my medical journey. I would like to extend my appreciation to the entire team at Acemedix academy. Their structured curriculum, highly knowledgeable tutors and deeply supportive learning environment provided us with the clarity and direction we needed throughout our preparation.',
    rating: 5,
    date: 'November 2024'
  },
  {
    id: 3,
    name: 'Dr. Hart Elett',
    role: 'MDCN Candidate',
    content: 'Writing the MDCN exam is no small feat. One of the best decisions I made was joining Acemedix Academy. From day one, Acemedix did not just teach us how to pass the MDCN exam, they equipped us with solid, life-saving clinical knowledge that I will carry with me throughout my career.',
    rating: 5,
    date: 'October 2024'
  },
  {
    id: 4,
    name: 'Dr. Zara',
    role: 'MDCN Candidate',
    content: 'Dear Doc Dozie, I have passed, Alhamdulillah! This would not have happened without you. Words cannot describe how grateful I am. You are my angel, my godfather, my superhero. Thank you soooooo much for always being patient with me and for always believing in me.',
    rating: 5,
    date: 'September 2024'
  },
  {
    id: 5,
    name: 'Dr. Kingsley Ogbonna O.',
    role: 'MDCN Candidate',
    content: 'Acemedix Academy is a lifesaver for foreign-trained doctors. The tutors are exceptional, with deep expertise and invaluable guidance throughout the preparations. The Acemedix website is user-friendly and well-organized, offering a wealth of resources, including several recalled past questions.',
    rating: 5,
    date: 'August 2024'
  }
];

export default function HomePage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [activeHeroSlide, setActiveHeroSlide] = useState(0);
  const [activeFeatureSlide, setActiveFeatureSlide] = useState(0);
  const [activeTestimonialSlide, setActiveTestimonialSlide] = useState(0);
  const [activePricingSlide, setActivePricingSlide] = useState(0);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showLoginForm, setShowLoginForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    remember: false
  });
  const [calculatorFeature, setCalculatorFeature] = useState('cbt');
  const [calculatorSessions, setCalculatorSessions] = useState(10);

  // Data states
  const [tokenPackages, setTokenPackages] = useState<TokenPackage[]>([]);
  const [usageRates, setUsageRates] = useState<UsageRate[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  // Refs for scroll sections
  const aboutRef = useRef<HTMLDivElement>(null);
  const featuresRef = useRef<HTMLDivElement>(null);
  const pricingRef = useRef<HTMLDivElement>(null);
  const testimonialsRef = useRef<HTMLDivElement>(null);
  const contactRef = useRef<HTMLDivElement>(null);

  // Splide refs
  const testimonialsSplideRef = useRef<Splide | null>(null);
  const pricingSplideRef = useRef<Splide | null>(null);
  const reviewsSplideRef = useRef<Splide | null>(null); // new for dynamic reviews

  // Hero slides
  const heroSlides = [
    {
      title: 'Unlock Your MDCN Success',
      icon: 'fa-graduation-cap',
      subtitle: 'Your AI-Powered Exam Prep Companion',
      description: 'Harnessing AI to deliver smart, personalized learning for MDCN candidates — from OSCE to CBT.',
      type: 'hero-1',
      color: 'from-blue-50 via-white to-blue-50/30',
      textColor: 'text-slate-800',
      iconColor: 'text-blue-600',
      buttonPrimary: {
        bg: 'bg-gradient-to-r from-blue-500 to-blue-600',
        text: 'text-white',
        hover: 'hover:from-blue-600 hover:to-blue-700',
        icon: 'fa-rocket'
      },
      buttonOutline: {
        border: 'border-blue-500',
        text: 'text-blue-600',
        hover: 'hover:bg-blue-50',
        icon: 'fa-info-circle'
      }
    },
    {
      title: 'AI-Driven Medical Training',
      icon: 'fa-brain',
      subtitle: 'Smart Learning for Future Doctors',
      description: 'Adaptive algorithms, realistic simulations, and personalized feedback for optimal exam preparation.',
      type: 'hero-2',
      color: 'from-teal-50 via-white to-emerald-50/30',
      textColor: 'text-slate-800',
      iconColor: 'text-teal-600',
      buttonPrimary: {
        bg: 'bg-gradient-to-r from-teal-500 to-emerald-600',
        text: 'text-white',
        hover: 'hover:from-teal-600 hover:to-emerald-700',
        icon: 'fa-search'
      },
      buttonOutline: {
        border: 'border-teal-500',
        text: 'text-teal-600',
        hover: 'hover:bg-teal-50',
        icon: 'fa-eye'
      }
    },
    {
      title: 'Token-Based Premium Access',
      icon: 'fa-coins',
      subtitle: 'Pay Only for What You Use',
      description: 'Flexible token system gives you access to premium features without expensive subscriptions.',
      type: 'hero-3',
      color: 'from-amber-50 via-white to-orange-50/30',
      textColor: 'text-slate-800',
      iconColor: 'text-amber-600',
      buttonPrimary: {
        bg: 'bg-gradient-to-r from-amber-500 to-orange-600',
        text: 'text-white',
        hover: 'hover:from-amber-600 hover:to-orange-700',
        icon: 'fa-shopping-cart'
      },
      buttonOutline: {
        border: 'border-amber-500',
        text: 'text-amber-600',
        hover: 'hover:bg-amber-50',
        icon: 'fa-calculator'
      }
    }
  ];

  // Features with enhanced modules
  const [features, setFeatures] = useState([
    {
      id: 'cbt',
      title: 'CBT Examination',
      icon: 'fa-laptop-medical',
      description: 'Comprehensive MDCN/MBBS question banks with adaptive learning and detailed explanations.',
      tokenInfo: 'Flexible token-based access • Per session usage • No subscription fees',
      modules: ['MDCN Recall', 'MBBS Modules', 'Smart Question Generator', 'Topic-wise Tests', 'Past Questions', 'Mock Exams'],
      color: 'from-blue-50 to-blue-100',
      iconColor: 'text-blue-600',
      buttonColor: 'bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700'
    },
    {
      id: 'osce',
      title: 'OSCE Practice',
      icon: 'fa-user-md',
      description: 'Realistic patient simulations for clerking, counseling, and physical examination stations.',
      tokenInfo: 'Pay-per-simulation model • Detailed AI feedback included • Variable complexity levels',
      modules: ['Clerking', 'Counseling', 'Physical Examination', 'Surgical Scenarios', 'Emergency Cases', 'Patient Communication'],
      color: 'from-teal-50 to-teal-100',
      iconColor: 'text-teal-600',
      buttonColor: 'bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-600 hover:to-emerald-700'
    },
    {
      id: 'flashcards',
      title: 'AI Flashcard Generator',
      icon: 'fa-layer-group',
      description: 'Generate personalized flashcards from your study materials with spaced repetition.',
      tokenInfo: 'Token-based generation • Unlimited revisions • Cross-platform sync',
      modules: ['Auto-Summary', 'Image Recognition', 'Spaced Repetition', 'Smart Tagging', 'Voice Notes', 'Share Decks'],
      color: 'from-amber-50 to-amber-100',
      iconColor: 'text-amber-600',
      buttonColor: 'bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700'
    },
    {
      id: 'clinchers',
      title: 'Clinchers',
      icon: 'fa-stethoscope',
      description: 'High-yield clinical pearls and must-know facts for exam success.',
      tokenInfo: 'Quick revision • Exam-focused content • Evidence-based',
      modules: ['Clinical Pearls', 'High-Yield Facts', 'Mnemonics', 'Clinical Scenarios', 'Differential Diagnosis', 'Treatment Algorithms'],
      color: 'from-purple-50 to-purple-100',
      iconColor: 'text-purple-600',
      buttonColor: 'bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700'
    },
    {
      id: 'mocks',
      title: 'Mock Exams',
      icon: 'fa-file-alt',
      description: 'Full-length simulated exams with real-time performance analytics.',
      tokenInfo: 'Timed exams • Detailed solutions • Performance tracking',
      modules: ['Full-Length Tests', 'Timed Sessions', 'Performance Analytics', 'Weakness Analysis', 'Progress Reports', 'Comparison Stats'],
      color: 'from-pink-50 to-pink-100',
      iconColor: 'text-pink-600',
      buttonColor: 'bg-gradient-to-r from-pink-500 to-pink-600 hover:from-pink-600 hover:to-pink-700'
    },
    {
      id: 'quiz',
      title: 'Quick Quizzes',
      icon: 'fa-question-circle',
      description: 'Bite-sized assessments for rapid knowledge reinforcement.',
      tokenInfo: 'Quick sessions • Instant feedback • Topic-specific',
      modules: ['Rapid Fire', 'Topic Quizzes', 'Daily Challenges', 'Leaderboards', 'Achievement Badges', 'Streak Tracking'],
      color: 'from-indigo-50 to-indigo-100',
      iconColor: 'text-indigo-600',
      buttonColor: 'bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700'
    },
    {
      id: 'qtopics',
      title: 'Q-Topics',
      icon: 'fa-book-open',
      description: 'Comprehensive coverage of medical topics with integrated questions.',
      tokenInfo: 'Topic-based learning • Integrated Q&A • Progress tracking',
      modules: ['Systems-Based', 'Integrated Learning', 'Interactive Diagrams', 'Video Explanations', 'Downloadable Notes', 'Topic Reviews'],
      color: 'from-cyan-50 to-cyan-100',
      iconColor: 'text-cyan-600',
      buttonColor: 'bg-gradient-to-r from-cyan-500 to-cyan-600 hover:from-cyan-600 hover:to-cyan-700'
    },
    {
      id: 'analysis',
      title: 'AI Analysis & Feedback',
      icon: 'fa-chart-line',
      description: 'Deep performance analysis with actionable insights and improvement recommendations.',
      tokenInfo: 'Comprehensive analytics • Personalized insights • Progress tracking',
      modules: ['Performance Analytics', 'Weakness Identification', 'Personalized Recommendations', 'Study Plan Generator', 'Predictive Scoring', 'Peer Comparison'],
      color: 'from-blue-50 to-blue-100',
      iconColor: 'text-blue-600',
      buttonColor: 'bg-gradient-to-r from-blue-400 to-blue-500 hover:from-blue-500 hover:to-blue-600'
    }
  ]);

  // Fetch data on component mount
  useEffect(() => {
    fetchTokenPackages();
    fetchUsageRates();
  }, []);

  // Auto-rotate hero slider
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveHeroSlide((prev) => (prev + 1) % heroSlides.length);
    }, 6000);
    return () => clearInterval(interval);
  }, []);

  // Initialize Splide
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const initSliders = () => {
        // Initialize testimonials slider
        if (testimonialsSplideRef.current === null) {
          const testimonialsElement = document.querySelector('#testimonials-slider');
          if (testimonialsElement) {
            testimonialsSplideRef.current = new Splide('#testimonials-slider', {
              type: 'slide',
              perPage: 3,
              perMove: 1,
              gap: '1rem',
              padding: { right: '3rem', left: '3rem' },
              pagination: true,
              arrows: true,
              autoplay: true,
              interval: 5000,
              breakpoints: {
                1024: {
                  perPage: 2,
                  padding: { right: '2rem', left: '2rem' }
                },
                768: {
                  perPage: 1,
                  gap: '0.5rem',
                  padding: { right: '1rem', left: '1rem' },
                  arrows: false
                }
              }
            }).mount();
            
            const style = document.createElement('style');
            style.textContent = `
              @media (max-width: 768px) {
                .testimonial-slider .splide__arrows {
                  display: none;
                }
                .testimonial-slider .splide__pagination {
                  bottom: -2rem;
                }
              }
              .splide__pagination__page {
                background: rgba(255, 255, 255, 0.3);
                width: 8px;
                height: 8px;
                margin: 0 4px;
              }
              .splide__pagination__page.is-active {
                background: #ffffff;
                transform: scale(1.2);
              }
            `;
            document.head.appendChild(style);
          }
        }

        // Initialize dynamic reviews slider
        if (reviewsSplideRef.current === null) {
          const reviewsElement = document.querySelector('#reviews-slider');
          if (reviewsElement) {
            reviewsSplideRef.current = new Splide('#reviews-slider', {
              type: 'slide',
              perPage: 3,
              perMove: 1,
              gap: '1.5rem',
              padding: { left: '1rem', right: '1rem' },
              pagination: true,
              arrows: true,
              autoplay: true,
              interval: 6000,
              breakpoints: {
                1024: {
                  perPage: 2,
                  gap: '1rem'
                },
                768: {
                  perPage: 1,
                  gap: '1rem',
                  arrows: false
                }
              }
            }).mount();
          }
        }
        
        // Initialize pricing slider
        if (pricingSplideRef.current === null && tokenPackages.length > 0) {
          const pricingElement = document.querySelector('#pricing-slider');
          if (pricingElement) {
            const perPage = Math.min(3, tokenPackages.length);
            pricingSplideRef.current = new Splide('#pricing-slider', {
              type: 'slide',
              perPage: perPage,
              perMove: 1,
              gap: '2rem',
              padding: { left: '1rem', right: '1rem' },
              pagination: true,
              arrows: true,
              breakpoints: {
                1024: {
                  perPage: Math.min(2, tokenPackages.length),
                  gap: '1.5rem',
                },
                768: {
                  perPage: 1,
                  gap: '1rem',
                  padding: { left: '1rem', right: '1rem' },
                  arrows: false,
                }
              }
            }).mount();
          }
        }
      };

      const timer = setTimeout(initSliders, 100);
      
      const handleResize = () => {
        if (pricingSplideRef.current) {
          pricingSplideRef.current.destroy();
          pricingSplideRef.current = null;
        }
        if (testimonialsSplideRef.current) {
          testimonialsSplideRef.current.destroy();
          testimonialsSplideRef.current = null;
        }
        if (reviewsSplideRef.current) {
          reviewsSplideRef.current.destroy();
          reviewsSplideRef.current = null;
        }
        initSliders();
      };

      window.addEventListener('resize', handleResize);
     
      return () => {
        clearTimeout(timer);
        window.removeEventListener('resize', handleResize);
        if (pricingSplideRef.current) {
          pricingSplideRef.current.destroy();
          pricingSplideRef.current = null;
        }
        if (testimonialsSplideRef.current) {
          testimonialsSplideRef.current.destroy();
          testimonialsSplideRef.current = null;
        }
        if (reviewsSplideRef.current) {
          reviewsSplideRef.current.destroy();
          reviewsSplideRef.current = null;
        }
      };
    }
  }, [tokenPackages]);

  const fetchTokenPackages = async () => {
    try {
      const res = await fetch('/api/public/token-packages');
      if (res.ok) {
        const data = await res.json();
        const packages = data.packages || [];
       
        const processedPackages = packages.map((pkg: TokenPackage, index: number) => ({
          ...pkg,
          popular: packages.length === 3 && index === 1
        }));
       
        setTokenPackages(processedPackages);
      } else {
        setTokenPackages([
          {
            id: 'starter',
            name: 'Starter Pack',
            description: 'Perfect for trying out',
            tokenAmount: 100,
            price: 5000,
            currency: 'NGN',
            isActive: true,
            features: ['100 Tokens', 'CBT Access', 'Basic Flashcards', 'Limited OSCE', 'Email Support']
          },
          {
            id: 'professional',
            name: 'Professional',
            description: 'Most popular choice',
            tokenAmount: 500,
            price: 20000,
            currency: 'NGN',
            isActive: true,
            popular: true,
            features: ['500 Tokens', 'Unlimited CBT', 'Advanced OSCE', 'AI Analysis', 'Mock Exams', 'Clinchers', 'Priority Support']
          },
          {
            id: 'premium',
            name: 'Premium',
            description: 'Maximum value',
            tokenAmount: 1000,
            price: 35000,
            currency: 'NGN',
            isActive: true,
            features: ['1000 Tokens', 'Everything in Professional', 'Bonus Tokens', '1-on-1 Consultation', 'Early Access', 'Custom Study Plans']
          }
        ]);
      }
    } catch (error) {
      console.error('Error fetching token packages:', error);
      setTokenPackages([
        {
          id: 'starter',
          name: 'Starter Pack',
          description: 'Perfect for trying out',
          tokenAmount: 100,
          price: 5000,
          currency: 'NGN',
          isActive: true,
          features: ['100 Tokens', 'CBT Access', 'Basic Flashcards', 'Limited OSCE']
        },
        {
          id: 'professional',
          name: 'Professional',
          description: 'Most popular choice',
          tokenAmount: 500,
          price: 20000,
          currency: 'NGN',
          isActive: true,
          popular: true,
          features: ['500 Tokens', 'Unlimited CBT', 'Advanced OSCE', 'AI Analysis', 'Priority Support']
        },
        {
          id: 'premium',
          name: 'Premium',
          description: 'Maximum value',
          tokenAmount: 1000,
          price: 35000,
          currency: 'NGN',
          isActive: true,
          features: ['1000 Tokens', 'Everything in Professional', 'Bonus Tokens', '1-on-1 Consultation']
        }
      ]);
    }
  };

  const fetchUsageRates = async () => {
    try {
      const res = await fetch('/api/public/usage-rates');
      if (res.ok) {
        const data = await res.json();
        const rates = data.rates || [];
        setUsageRates(rates);
      }
    } catch (error) {
      console.error('Error fetching usage rates:', error);
    } finally {
      setLoadingData(false);
    }
  };

  const scrollToSection = (section: string) => {
    setIsMobileMenuOpen(false);
    const sections: { [key: string]: React.RefObject<HTMLDivElement> } = {
      home: { current: document.querySelector('main') } as React.RefObject<HTMLDivElement>,
      about: aboutRef,
      features: featuresRef,
      pricing: pricingRef,
      testimonials: testimonialsRef,
      contact: contactRef
    };
    if (sections[section]?.current) {
      sections[section]!.current!.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
      });
    }
  };

  const formatPrice = (price: number) => {
    return `₦${(price / 100).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`;
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const result = await signIn("credentials", {
        redirect: false,
        email: formData.email,
        password: formData.password,
      });

      if (result?.error) {
        setError("Invalid email or password");
      } else {
        router.push("/dashboard");
        router.refresh();
      }
    } catch (err) {
      setError("An error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    await signIn("google", { callbackUrl: "/dashboard" });
  };

  const handleLogout = async () => {
    await signOut({ callbackUrl: '/' });
  };

  // Mobile menu items with Team and Sign In link
  const mobileMenuItems = [
    { label: 'Home', icon: 'fa-home', color: 'bg-gradient-to-r from-blue-500 to-blue-600', action: () => scrollToSection('home') },
    { label: 'About', icon: 'fa-info-circle', color: 'bg-gradient-to-r from-teal-500 to-emerald-600', action: () => scrollToSection('about') },
    { label: 'Features', icon: 'fa-star', color: 'bg-gradient-to-r from-amber-500 to-orange-600', action: () => scrollToSection('features') },
    { label: 'Pricing', icon: 'fa-tag', color: 'bg-gradient-to-r from-indigo-500 to-purple-600', action: () => scrollToSection('pricing') },
    { label: 'Team', icon: 'fa-users', color: 'bg-gradient-to-r from-blue-600 to-indigo-600', action: () => {
      setIsMobileMenuOpen(false);
      router.push('/team');
    }},
    { label: 'Testimonials', icon: 'fa-star', color: 'bg-gradient-to-r from-blue-600 to-indigo-600', action: () => {
      setIsMobileMenuOpen(false);
      router.push('/testimonials');
    }},
    { label: 'Contact', icon: 'fa-phone', color: 'bg-gradient-to-r from-slate-600 to-slate-700', action: () => scrollToSection('contact') },
    ...(status !== 'authenticated' ? [{ label: 'Sign In', icon: 'fa-sign-in-alt', color: 'bg-gradient-to-r from-green-500 to-emerald-600', action: () => {
      setIsMobileMenuOpen(false);
      router.push('/login');
    }}] : [])
  ];

  const handleHeroButtonClick = (slideType: string, buttonType: string) => {
    if (slideType === 'hero-1') {
      if (buttonType === 'primary') {
        if (status === 'authenticated') {
          router.push('/dashboard');
        } else {
          const loginSection = document.querySelector('#login-section');
          if (loginSection) {
            loginSection.scrollIntoView({ behavior: 'smooth' });
          }
        }
      } else {
        // Outline button: About Us - scroll to about section
        scrollToSection('about');
      }
    } else if (slideType === 'hero-2') {
      if (buttonType === 'primary') scrollToSection('features');
      else scrollToSection('pricing');
    } else if (slideType === 'hero-3') {
      if (buttonType === 'primary') scrollToSection('pricing');
    }
  };

  // Calculate token usage
  const getTokenRate = () => {
    const rates: { [key: string]: number } = {
      cbt: 5,
      osce: 10,
      flashcards: 3,
      clinchers: 4,
      mocks: 8,
      quiz: 2,
      qtopics: 6,
      analysis: 7
    };
    return rates[calculatorFeature] || 5;
  };

  const calculatedTokens = calculatorSessions * getTokenRate();

  // Get user's display name
  const getUserDisplayName = () => {
    if (session?.user?.name) {
      return session.user.name;
    }
    if (session?.user?.email) {
      return session.user.email.split('@')[0];
    }
    return 'User';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/10 font-sans">
     
      {/* Enhanced Sticky Header */}
      <header className="fixed top-0 z-50 w-full bg-white/98 backdrop-blur-lg border-b border-slate-200/60 shadow-lg">
        <div className="container mx-auto px-4 py-3 md:py-5">
          <div className="flex items-center justify-between flex-wrap gap-3">
            {/* Logo with Image */}
            <Link href="/" className="flex items-center space-x-2 md:space-x-3 group flex-shrink-0">
              <div className="w-10 h-10 md:w-14 md:h-14 rounded-xl overflow-hidden shadow-md bg-white flex items-center justify-center transition-all group-hover:scale-110 border border-blue-100">
                <Image
                  src="/uploads/acelogo.png"
                  alt="Acemedix Academy Logo"
                  width={56}
                  height={56}
                  className="object-contain w-full h-full"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                    const parent = target.parentElement;
                    if (parent) {
                      parent.classList.add('bg-gradient-to-r', 'from-blue-500', 'to-blue-600');
                      const icon = document.createElement('i');
                      icon.className = 'fas fa-stethoscope text-white text-xl md:text-2xl';
                      parent.appendChild(icon);
                    }
                  }}
                />
              </div>
              <div className="hidden sm:block">
                <h1 className="text-lg md:text-2xl font-bold bg-gradient-to-r from-blue-600 to-blue-700 bg-clip-text text-transparent">
                  Acemedix Academy
                </h1>
                <p className="text-xs md:text-sm text-slate-600 font-medium hidden sm:block">Medical Education Platform</p>
              </div>
              <div className="sm:hidden">
                <h1 className="text-base font-bold bg-gradient-to-r from-blue-600 to-blue-700 bg-clip-text text-transparent">
                  Acemedix
                </h1>
                <p className="text-[10px] text-slate-600">Medical Platform</p>
              </div>
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden lg:flex items-center space-x-1 xl:space-x-2 flex-wrap">
              <button
                onClick={() => scrollToSection('home')}
                className="font-medium text-slate-700 hover:text-blue-600 transition-colors px-3 xl:px-4 py-2 rounded-lg hover:bg-blue-50 flex items-center text-sm xl:text-base hand-cursor whitespace-nowrap"
              >
                <i className="fas fa-home mr-2 text-blue-500 text-xs xl:text-sm"></i>Home
              </button>
              <button
                onClick={() => scrollToSection('about')}
                className="font-medium text-slate-700 hover:text-teal-600 transition-colors px-3 xl:px-4 py-2 rounded-lg hover:bg-teal-50 flex items-center text-sm xl:text-base hand-cursor whitespace-nowrap"
              >
                <i className="fas fa-info-circle mr-2 text-teal-500 text-xs xl:text-sm"></i>About
              </button>
              <button
                onClick={() => scrollToSection('features')}
                className="font-medium text-slate-700 hover:text-emerald-600 transition-colors px-3 xl:px-4 py-2 rounded-lg hover:bg-emerald-50 flex items-center text-sm xl:text-base hand-cursor whitespace-nowrap"
              >
                <i className="fas fa-star mr-2 text-emerald-500 text-xs xl:text-sm"></i>Features
              </button>
              <button
                onClick={() => scrollToSection('pricing')}
                className="font-medium text-slate-700 hover:text-amber-600 transition-colors px-3 xl:px-4 py-2 rounded-lg hover:bg-amber-50 flex items-center text-sm xl:text-base hand-cursor whitespace-nowrap"
              >
                <i className="fas fa-tag mr-2 text-amber-500 text-xs xl:text-sm"></i>Pricing
              </button>
              <Link
                href="/team"
                className="font-medium text-slate-700 hover:text-blue-600 transition-colors px-3 xl:px-4 py-2 rounded-lg hover:bg-blue-50 flex items-center text-sm xl:text-base hand-cursor whitespace-nowrap"
              >
                <i className="fas fa-users mr-2 text-blue-500 text-xs xl:text-sm"></i>Team
              </Link>
              <Link
                href="/testimonials"
                className="font-medium text-slate-700 hover:text-blue-600 transition-colors px-3 xl:px-4 py-2 rounded-lg hover:bg-blue-50 flex items-center text-sm xl:text-base hand-cursor whitespace-nowrap"
              >
                <i className="fas fa-star mr-2 text-blue-500 text-xs xl:text-sm"></i>Testimonials
              </Link>
              <button
                onClick={() => scrollToSection('contact')}
                className="font-medium text-slate-700 hover:text-slate-800 transition-colors px-3 xl:px-4 py-2 rounded-lg hover:bg-slate-100 flex items-center text-sm xl:text-base hand-cursor whitespace-nowrap"
              >
                <i className="fas fa-phone mr-2 text-slate-500 text-xs xl:text-sm"></i>Contact
              </button>
             
              {status === 'authenticated' ? (
                <div className="flex items-center space-x-2 ml-2">
                  <div className="flex items-center space-x-2 px-2 py-1 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-100">
                    <div className="w-6 h-6 md:w-8 md:h-8 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full flex items-center justify-center">
                      <i className="fas fa-user text-white text-xs md:text-sm"></i>
                    </div>
                    <span className="text-slate-700 font-medium text-xs md:text-sm hidden sm:inline-block">
                      {getUserDisplayName()}
                    </span>
                  </div>
                  <Link
                    href="/dashboard"
                    className="px-3 md:px-5 py-2 md:py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg font-semibold hover:shadow-md hover:scale-[1.02] transition-all duration-300 shadow-sm flex items-center text-xs md:text-base hand-cursor whitespace-nowrap"
                  >
                    <i className="fas fa-tachometer-alt mr-1 md:mr-3 text-xs md:text-sm"></i>
                    <span className="hidden sm:inline">Dashboard</span>
                    <span className="sm:hidden">Dash</span>
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="px-3 md:px-5 py-2 md:py-3 border border-red-300 text-red-600 rounded-lg font-medium hover:bg-red-50 transition-all duration-300 flex items-center text-xs md:text-base hand-cursor whitespace-nowrap"
                  >
                    <i className="fas fa-sign-out-alt mr-1 md:mr-3 text-xs md:text-sm"></i>
                    <span className="hidden sm:inline">Sign Out</span>
                    <span className="sm:hidden">Logout</span>
                  </button>
                </div>
              ) : (
                <div className="flex items-center space-x-2 ml-2">
                  <Link
                    href="/login"
                    className="px-3 md:px-5 py-2 md:py-3 border border-slate-300 text-slate-700 rounded-lg font-medium hover:bg-slate-50 transition-all duration-300 flex items-center text-xs md:text-base hand-cursor whitespace-nowrap"
                  >
                    <i className="fas fa-sign-in-alt mr-1 md:mr-3 text-xs md:text-sm"></i>
                    <span className="hidden sm:inline">Sign In</span>
                    <span className="sm:hidden">Login</span>
                  </Link>
                  <button
                    onClick={() => {
                      const loginSection = document.querySelector('#login-section');
                      if (loginSection) {
                        loginSection.scrollIntoView({ behavior: 'smooth' });
                      }
                    }}
                    className="px-3 md:px-5 py-2 md:py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg font-semibold hover:shadow-md hover:scale-[1.02] transition-all duration-300 shadow-sm flex items-center text-xs md:text-base hand-cursor whitespace-nowrap"
                  >
                    <i className="fas fa-rocket mr-1 md:mr-3 text-xs md:text-sm"></i>
                    <span className="hidden sm:inline">Get Started</span>
                    <span className="sm:hidden">Start</span>
                  </button>
                </div>
              )}
            </nav>

            {/* Tablet Navigation */}
            <div className="hidden md:flex lg:hidden items-center space-x-2 flex-wrap justify-end">
              <button
                onClick={() => scrollToSection('home')}
                className="font-medium text-slate-700 hover:text-blue-600 transition-colors px-2 py-2 rounded-lg hover:bg-blue-50 text-sm hand-cursor"
              >
                Home
              </button>
              <button
                onClick={() => scrollToSection('features')}
                className="font-medium text-slate-700 hover:text-emerald-600 transition-colors px-2 py-2 rounded-lg hover:bg-emerald-50 text-sm hand-cursor"
              >
                Features
              </button>
              <button
                onClick={() => scrollToSection('pricing')}
                className="font-medium text-slate-700 hover:text-amber-600 transition-colors px-2 py-2 rounded-lg hover:bg-amber-50 text-sm hand-cursor"
              >
                Pricing
              </button>
              <Link
                href="/team"
                className="font-medium text-slate-700 hover:text-blue-600 transition-colors px-2 py-2 rounded-lg hover:bg-blue-50 text-sm hand-cursor"
              >
                Team
              </Link>
              <Link
                href="/testimonials"
                className="font-medium text-blue-600 transition-colors px-2 py-2 rounded-lg bg-blue-50 text-sm hand-cursor"
              >
                Testimonials
              </Link>
              {status === 'authenticated' ? (
                <>
                  <Link
                    href="/dashboard"
                    className="px-3 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg font-semibold text-sm hand-cursor whitespace-nowrap"
                  >
                    Dashboard
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="px-3 py-2 border border-red-300 text-red-600 rounded-lg font-medium text-sm hand-cursor whitespace-nowrap"
                  >
                    Logout
                  </button>
                </>
              ) : (
                <>
                  <Link
                    href="/login"
                    className="px-3 py-2 border border-slate-300 text-slate-700 rounded-lg font-medium text-sm hand-cursor whitespace-nowrap"
                  >
                    Sign In
                  </Link>
                  <button
                    onClick={() => {
                      const loginSection = document.querySelector('#login-section');
                      if (loginSection) {
                        loginSection.scrollIntoView({ behavior: 'smooth' });
                      }
                    }}
                    className="px-3 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg font-semibold text-sm hand-cursor whitespace-nowrap"
                  >
                    Get Started
                  </button>
                </>
              )}
            </div>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden p-2 rounded-xl hover:bg-slate-100 transition-colors hand-cursor flex-shrink-0"
            >
              <i className={`fas ${isMobileMenuOpen ? 'fa-times' : 'fa-bars'} text-xl text-slate-700`}></i>
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Floating Menu */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 lg:hidden"
          >
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-gradient-to-t from-gray-900/95 via-gray-900/80 to-transparent backdrop-blur-sm"
              onClick={() => setIsMobileMenuOpen(false)}
            />
            
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="absolute bottom-0 left-0 right-0 bg-gradient-to-b from-slate-800 via-slate-900 to-gray-900 rounded-t-3xl shadow-2xl border-t border-slate-700/50"
            >
              <div className="flex justify-center pt-4 pb-3">
                <div className="w-16 h-1.5 bg-slate-600/70 rounded-full"></div>
              </div>
              
              <div className="px-4 pb-8">
                <div className="flex items-center justify-center space-x-3 mb-6">
                  <div className="p-2 bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl">
                    <i className="fas fa-bars text-white text-lg"></i>
                  </div>
                  <h3 className="text-white text-lg font-bold">Quick Navigation</h3>
                </div>
                
                <div className="grid grid-cols-3 gap-3 mb-6">
                  {mobileMenuItems.map((item) => (
                    <button
                      key={item.label}
                      onClick={item.action}
                      className="flex flex-col items-center justify-center p-4 rounded-2xl bg-gradient-to-b from-slate-700/60 to-slate-800/40 hover:from-slate-700 hover:to-slate-800 border border-slate-700/40 transition-all duration-300 hover:scale-105 hover:shadow-lg group active:scale-95"
                    >
                      <div className={`w-12 h-12 ${item.color} rounded-full flex items-center justify-center mb-2 group-hover:scale-110 transition-transform duration-300 border-2 border-white/20`}>
                        <i className={`fas ${item.icon} text-white text-lg`}></i>
                      </div>
                      <span className="text-white text-xs font-medium text-center">
                        {item.label}
                      </span>
                    </button>
                  ))}
                </div>

                <div className="space-y-3 mb-6">
                  {status === 'authenticated' ? (
                    <>
                      <div className="flex items-center justify-between p-4 rounded-2xl bg-gradient-to-r from-blue-900/40 to-indigo-900/40 border border-blue-800/50">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full flex items-center justify-center">
                            <i className="fas fa-user text-white"></i>
                          </div>
                          <div>
                            <p className="text-white text-sm font-semibold">{getUserDisplayName()}</p>
                            <p className="text-slate-300 text-xs">{session?.user?.email}</p>
                          </div>
                        </div>
                      </div>
                      <Link
                        href="/dashboard"
                        className="flex items-center justify-center p-4 rounded-2xl bg-gradient-to-r from-blue-500/90 to-blue-600/90 hover:from-blue-500 hover:to-blue-600 border border-blue-500/50 transition-all duration-300 shadow-lg group"
                        onClick={() => setIsMobileMenuOpen(false)}
                      >
                        <div className="p-2 bg-white/20 rounded-lg mr-3">
                          <i className="fas fa-tachometer-alt text-white text-lg"></i>
                        </div>
                        <div className="flex-1 text-left">
                          <p className="text-xs text-slate-200">Go to</p>
                          <p className="text-white font-semibold text-sm">Dashboard</p>
                        </div>
                        <i className="fas fa-chevron-right text-white/70 text-sm"></i>
                      </Link>
                      <button
                        onClick={() => {
                          handleLogout();
                          setIsMobileMenuOpen(false);
                        }}
                        className="w-full bg-gradient-to-r from-red-600/80 to-red-700/80 text-white py-3.5 rounded-xl font-semibold flex items-center justify-center space-x-2 hover:from-red-600 hover:to-red-700 transition-all duration-300 border border-red-500/50 active:scale-95"
                      >
                        <i className="fas fa-sign-out-alt text-sm"></i>
                        <span>Sign Out</span>
                      </button>
                    </>
                  ) : (
                    <>
                      
                    </>
                  )}

                  <div className="flex items-center space-x-3 p-3 rounded-2xl bg-gradient-to-r from-teal-900/40 to-teal-800/30 border border-teal-800/40">
                    <div className="p-2 bg-teal-900/60 rounded-lg">
                      <i className="fas fa-phone text-teal-300 text-base"></i>
                    </div>
                    <div>
                      <p className="text-xs text-slate-300">Need Help?</p>
                      <a href="tel:+2347087018175" className="text-white font-semibold text-sm">
                        +234 708 701 8175
                      </a>
                    </div>
                  </div>
                </div>

                <button 
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="w-full bg-gradient-to-r from-slate-700 to-slate-800 text-white py-3.5 rounded-xl font-semibold flex items-center justify-center space-x-2 hover:from-slate-600 hover:to-slate-700 transition-all duration-300 border border-slate-600/50 active:scale-95"
                >
                  <i className="fas fa-times text-sm"></i>
                  <span>Close Menu</span>
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

 
      {/* Main Content */}
      <main className="flex-1 pt-[60px]">
        {/* Hero Section with Conditional Content */}
        <section id="login-section" className="relative py-12 md:py-20">
          <div className="container mx-auto px-4">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              {/* Hero Slider */}
              <div className="relative">
                <div className="relative h-[500px] rounded-3xl overflow-hidden shadow-2xl border border-slate-200/50">
                  {heroSlides.map((slide, index) => (
                    <div
                      key={index}
                      className={`absolute inset-0 transition-all duration-1000 ease-in-out ${
                        index === activeHeroSlide ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-full'
                      }`}
                    >
                      <div className={`h-full p-8 md:p-12 bg-gradient-to-br ${slide.color} flex flex-col justify-center`}>
                        <div className={`${slide.textColor} max-w-lg`}>
                          <div className="flex flex-col md:flex-row items-start md:items-center mb-6 md:mb-8">
                            <div className="w-16 h-16 md:w-20 md:h-20 bg-white rounded-2xl flex items-center justify-center mb-4 md:mb-0 md:mr-8 shadow-lg border border-slate-200 flex-shrink-0">
                              <i className={`fas ${slide.icon} ${slide.iconColor} text-2xl md:text-3xl`}></i>
                            </div>
                            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold font-['Poppins']">
                              {slide.title}
                            </h1>
                          </div>
                          <h2 className="text-2xl md:text-3xl lg:text-4xl font-semibold mb-4 md:mb-6">
                            {slide.subtitle}
                          </h2>
                         
                          <p className="text-slate-600 mb-6 md:mb-10 text-base md:text-lg leading-relaxed">
                            {slide.description}
                          </p>
                         
                          <div className="flex flex-col sm:flex-row gap-4 md:gap-5">
                            <button
                              onClick={() => handleHeroButtonClick(slide.type, 'primary')}
                              className={`px-6 md:px-8 py-3 md:py-4 rounded-xl font-semibold transition-all duration-300 flex items-center justify-center ${slide.buttonPrimary.bg} ${slide.buttonPrimary.text} ${slide.buttonPrimary.hover} shadow-md hand-cursor text-sm md:text-base`}
                            >
                              <i className={`fas ${slide.buttonPrimary.icon} mr-2 md:mr-3 text-sm md:text-lg`}></i>
                              {slide.type === 'hero-1' 
                                ? (status === 'authenticated' ? 'Go to Dashboard' : 'Get Started Free')
                                : slide.type === 'hero-2' ? 'Explore Features' : 'Buy Tokens'}
                            </button>
                            <button
                              onClick={() => handleHeroButtonClick(slide.type, 'outline')}
                              className={`px-6 md:px-8 py-3 md:py-4 rounded-xl font-medium transition-all duration-300 flex items-center justify-center border-2 ${slide.buttonOutline.border} ${slide.buttonOutline.text} ${slide.buttonOutline.hover} hand-cursor text-sm md:text-base`}
                            >
                              <i className={`fas ${slide.buttonOutline.icon} mr-2 md:mr-3 text-sm md:text-lg`}></i>
                              {slide.type === 'hero-1' ? 'About Us' :
                               slide.type === 'hero-2' ? 'See Pricing' : 'Token Calculator'}
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                
                {/* Stats Banner */}
                <div className="mt-8 md:mt-10 grid grid-cols-3 gap-4 md:gap-6">
                  <div className="bg-white rounded-2xl p-4 md:p-6 shadow-lg border border-slate-200 hover:shadow-xl transition-shadow">
                    <div className="text-2xl md:text-3xl font-bold text-blue-600">7000+</div>
                    <div className="text-sm md:text-base text-slate-600 font-medium">CBT Questions</div>
                  </div>
                  <div className="bg-white rounded-2xl p-4 md:p-6 shadow-lg border border-slate-200 hover:shadow-xl transition-shadow">
                    <div className="text-2xl md:text-3xl font-bold text-emerald-600">500+</div>
                    <div className="text-sm md:text-base text-slate-600 font-medium">OSCE Stations</div>
                  </div>
                  <div className="bg-white rounded-2xl p-4 md:p-6 shadow-lg border border-slate-200 hover:shadow-xl transition-shadow">
                    <div className="text-2xl md:text-3xl font-bold text-amber-600">98%</div>
                    <div className="text-sm md:text-base text-slate-600 font-medium">Success Rate</div>
                  </div>
                </div>
              </div>

              {/* Conditional Content: Login Form or Welcome Card */}
              {status === 'authenticated' ? (
                // Welcome Card for Authenticated Users
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-3xl shadow-2xl p-6 md:p-8 lg:p-10 border border-blue-200/50">
                  <div className="text-center mb-6 md:mb-8">
                    <div className="w-20 h-20 md:w-24 md:h-24 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full flex items-center justify-center mx-auto mb-4 md:mb-6 shadow-lg">
                      <i className="fas fa-check-circle text-white text-3xl md:text-4xl"></i>
                    </div>
                    <h2 className="text-2xl md:text-3xl font-bold text-slate-800 mb-2 md:mb-3 font-['Poppins']">
                      Welcome Back!
                    </h2>
                    <p className="text-slate-600 text-base md:text-lg">
                      You're already signed in as
                    </p>
                    <p className="text-blue-600 font-semibold text-lg md:text-xl mt-2">
                      {getUserDisplayName()}
                    </p>
                    {session?.user?.email && (
                      <p className="text-slate-500 text-sm mt-1">
                        {session.user.email}
                      </p>
                    )}
                  </div>
                  
                  <div className="space-y-4">
                    <Link
                      href="/dashboard"
                      className="w-full py-3 md:py-4 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl font-semibold hover:shadow-lg hover:scale-[1.02] transition-all duration-300 shadow-md flex items-center justify-center text-base md:text-lg hand-cursor"
                    >
                      <i className="fas fa-tachometer-alt mr-2 md:mr-3"></i>
                      Go to Dashboard
                    </Link>
                    
                    <button
                      onClick={handleLogout}
                      className="w-full py-3 md:py-4 border-2 border-red-300 text-red-600 rounded-xl font-semibold hover:bg-red-50 hover:scale-[1.02] transition-all duration-300 flex items-center justify-center text-base md:text-lg hand-cursor"
                    >
                      <i className="fas fa-sign-out-alt mr-2 md:mr-3"></i>
                      Sign Out
                    </button>
                  </div>
                  
                  <div className="mt-6 md:mt-8 pt-6 md:pt-8 border-t border-blue-200">
                    <div className="flex items-center justify-center space-x-2 text-slate-500 text-sm">
                      <i className="fas fa-shield-alt text-green-500"></i>
                      <span>Your account is secure</span>
                    </div>
                  </div>
                </div>
              ) : (
                // Login Form for Unauthenticated Users
                <div className="bg-white rounded-3xl shadow-2xl p-6 md:p-8 lg:p-10 border border-slate-200/50">
                  <div className="text-center mb-6 md:mb-10">
                    <h2 className="text-2xl md:text-3xl font-bold text-slate-800 mb-2 md:mb-3 font-['Poppins']">
                      Start Your Journey
                    </h2>
                    <p className="text-slate-600 text-base md:text-lg">
                      Access premium medical education features
                    </p>
                  </div>
                  <form onSubmit={handleLogin} className="space-y-6 md:space-y-8">
                    {error && (
                      <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">
                        <i className="fas fa-exclamation-circle mr-2"></i>
                        {error}
                      </div>
                    )}
                    <div>
                      <label className="block text-base font-medium text-slate-700 mb-2 md:mb-3">
                        Email Address
                      </label>
                      <input
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({...formData, email: e.target.value})}
                        className="w-full px-4 md:px-5 py-3 md:py-4 border border-slate-300 rounded-xl focus:ring-3 focus:ring-blue-500 focus:border-blue-500 transition-all text-base hand-cursor"
                        placeholder="student@example.com"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-base font-medium text-slate-700 mb-2 md:mb-3">
                        Password
                      </label>
                      <input
                        type="password"
                        value={formData.password}
                        onChange={(e) => setFormData({...formData, password: e.target.value})}
                        className="w-full px-4 md:px-5 py-3 md:py-4 border border-slate-300 rounded-xl focus:ring-3 focus:ring-blue-500 focus:border-blue-500 transition-all text-base hand-cursor"
                        placeholder="Enter your password"
                        required
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <label className="flex items-center hand-cursor">
                        <input
                          type="checkbox"
                          checked={formData.remember}
                          onChange={(e) => setFormData({...formData, remember: e.target.checked})}
                          className="rounded text-blue-600 focus:ring-blue-500 hand-cursor"
                        />
                        <span className="ml-2 md:ml-3 text-sm md:text-base text-slate-600">Remember me</span>
                      </label>
                      <a href="#" className="text-sm md:text-base text-blue-600 hover:text-blue-700 font-medium hand-cursor">
                        Forgot password?
                      </a>
                    </div>
                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full py-3 md:py-4 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl font-semibold hover:shadow-lg hover:scale-[1.02] transition-all duration-300 shadow-md flex items-center justify-center text-base md:text-lg hand-cursor disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {loading ? (
                        <>
                          <i className="fas fa-spinner fa-spin mr-2 md:mr-3"></i>
                          <span>Signing in...</span>
                        </>
                      ) : (
                        <>
                          <i className="fas fa-sign-in-alt mr-2 md:mr-3 text-base md:text-lg"></i>
                          <span>Sign In</span>
                        </>
                      )}
                    </button>
                    <div className="relative flex items-center justify-center my-6 md:my-8">
                      <div className="flex-grow border-t border-slate-300"></div>
                      <span className="mx-4 md:mx-6 text-sm md:text-base text-slate-500 font-medium">Or continue with</span>
                      <div className="flex-grow border-t border-slate-300"></div>
                    </div>
                    <button
                      type="button"
                      onClick={handleGoogleSignIn}
                      disabled={loading}
                      className="w-full flex items-center justify-center py-3 md:py-4 border border-slate-300 rounded-xl hover:bg-slate-50 transition-colors font-medium text-slate-700 hand-cursor text-sm md:text-base disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <i className="fab fa-google text-[#DB4437] mr-2 md:mr-3 text-base md:text-lg"></i>
                      <span>Continue with Google</span>
                    </button>
                    <div className="text-center mt-6 md:mt-8">
                      <p className="text-slate-600 text-sm md:text-base">
                        Don't have an account?{' '}
                        <button
                          type="button"
                          onClick={() => {
                            window.location.href = '/register';
                          }}
                          className="text-blue-600 font-semibold hover:text-blue-700 hand-cursor"
                        >
                          Sign up free
                        </button>
                      </p>
                    </div>
                  </form>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* About Section with Background Image - UPDATED CONTENT */}
        <section ref={aboutRef} className="relative py-12 md:py-20 overflow-hidden">
          <div className="absolute inset-0 z-0">
            <img
              src="https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2070&q=80"
              alt="Medical Education Background"
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-blue-900/70 via-indigo-900/60 to-purple-900/70 backdrop-blur-[2px]"></div>
          </div>
          
          <div className="container mx-auto px-4 relative z-10">
            <div className="text-center mb-12 md:mb-20">
              <h2 className="text-3xl md:text-5xl lg:text-6xl font-bold text-white mb-6 md:mb-8 font-['Poppins']">
                Revolutionizing Medical Education
              </h2>
              <p className="text-lg md:text-xl lg:text-2xl text-slate-100 max-w-4xl mx-auto">
                Welcome to Acemedix Academy! Founded in February 2018 in Abuja, we've been preparing candidates for the MDCN exam with great success. With over 5000 students trained and a success rate averaging 91%, we have a proven track record of excellence. Our secret? A team of expert tutors who truly understand the MDCN exam and are dedicated to guiding you to success. We're here to see you ACE the exam in one sitting. Join us at Acemedix Academy and take the first step towards a bright future in medicine.
              </p>
            </div>
            <div className="grid md:grid-cols-3 gap-6 md:gap-10">
              <div className="bg-white/15 backdrop-blur-sm rounded-3xl p-6 md:p-10 shadow-xl border border-white/30 hover:shadow-2xl transition-shadow hover:bg-white/25">
                <div className="w-16 h-16 md:w-20 md:h-20 bg-gradient-to-r from-blue-400 to-blue-500 rounded-2xl flex items-center justify-center mb-6 md:mb-8 shadow-lg">
                  <i className="fas fa-robot text-white text-2xl md:text-3xl"></i>
                </div>
                <h3 className="text-xl md:text-2xl font-bold text-white mb-4 md:mb-6">AI-Powered Learning</h3>
                <p className="text-slate-100 text-base md:text-lg leading-relaxed">
                  Adaptive algorithms that personalize your study path based on performance and learning style.
                </p>
              </div>
              <div className="bg-white/15 backdrop-blur-sm rounded-3xl p-6 md:p-10 shadow-xl border border-white/30 hover:shadow-2xl transition-shadow hover:bg-white/25">
                <div className="w-16 h-16 md:w-20 md:h-20 bg-gradient-to-r from-emerald-400 to-emerald-500 rounded-2xl flex items-center justify-center mb-6 md:mb-8 shadow-lg">
                  <i className="fas fa-user-md text-white text-2xl md:text-3xl"></i>
                </div>
                <h3 className="text-xl md:text-2xl font-bold text-white mb-4 md:mb-6">Expert-Designed Content</h3>
                <p className="text-slate-100 text-base md:text-lg leading-relaxed">
                  All materials created and validated by experienced medical educators and practitioners.
                </p>
              </div>
              <div className="bg-white/15 backdrop-blur-sm rounded-3xl p-6 md:p-10 shadow-xl border border-white/30 hover:shadow-2xl transition-shadow hover:bg-white/25">
                <div className="w-16 h-16 md:w-20 md:h-20 bg-gradient-to-r from-amber-400 to-amber-500 rounded-2xl flex items-center justify-center mb-6 md:mb-8 shadow-lg">
                  <i className="fas fa-chart-line text-white text-2xl md:text-3xl"></i>
                </div>
                <h3 className="text-xl md:text-2xl font-bold text-white mb-4 md:mb-6">Real-Time Analytics</h3>
                <p className="text-slate-100 text-base md:text-lg leading-relaxed">
                  Track progress, identify weaknesses, and receive actionable insights to improve faster.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section ref={featuresRef} className="py-12 md:py-20 bg-white">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12 md:mb-20">
              <h2 className="text-3xl md:text-5xl lg:text-6xl font-bold text-slate-800 mb-6 md:mb-8 font-['Poppins']">
                Premium Features
              </h2>
              <p className="text-lg md:text-xl lg:text-2xl text-slate-600 max-w-4xl mx-auto">
                All features use our flexible token system. Pay only for what you need.
              </p>
            </div>
            
            {/* Mobile Accordion View */}
            <div className="lg:hidden space-y-4 md:space-y-6">
              {features.map((feature, index) => (
                <div key={feature.id} className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-xl">
                  <button
                    onClick={() => setActiveFeatureSlide(activeFeatureSlide === index ? -1 : index)}
                    className="w-full p-6 md:p-8 text-left flex items-center justify-between hover:bg-slate-50 transition-colors hand-cursor"
                  >
                    <div className="flex items-center">
                      <div className={`w-12 h-12 md:w-16 md:h-16 rounded-2xl bg-gradient-to-r ${feature.color} flex items-center justify-center mr-4 md:mr-6 border border-slate-200`}>
                        <i className={`fas ${feature.icon} ${feature.iconColor} text-xl md:text-2xl`}></i>
                      </div>
                      <div>
                        <h3 className="text-lg md:text-xl font-bold text-slate-800">{feature.title}</h3>
                        <div className="text-xs md:text-sm text-slate-500 mt-1 md:mt-2">{feature.tokenInfo}</div>
                      </div>
                    </div>
                    <i className={`fas fa-chevron-${activeFeatureSlide === index ? 'up' : 'down'} text-slate-400 text-lg md:text-xl`}></i>
                  </button>
                  {activeFeatureSlide === index && (
                    <div className="p-6 md:p-8 pt-0 border-t border-slate-200">
                      <p className="text-slate-600 text-base md:text-lg mb-4 md:mb-6">{feature.description}</p>
                      <div className="space-y-2 md:space-y-3 mb-6 md:mb-8 max-h-64 overflow-y-auto pr-2">
                        {feature.modules.map((module, idx) => (
                          <div key={idx} className="flex items-center">
                            <i className="fas fa-check-circle text-emerald-500 mr-3 md:mr-4 text-base md:text-lg flex-shrink-0"></i>
                            <span className="text-slate-700 text-base md:text-lg">{module}</span>
                          </div>
                        ))}
                      </div>
                      <button
                        onClick={() => {
                          if (status === 'authenticated') {
                            router.push('/dashboard');
                          } else {
                            const loginSection = document.querySelector('#login-section');
                            if (loginSection) {
                              loginSection.scrollIntoView({ behavior: 'smooth' });
                            }
                          }
                        }}
                        className={`w-full py-3 md:py-4 text-white rounded-xl font-semibold hover:shadow-lg transition-all duration-300 ${feature.buttonColor} text-base md:text-lg hand-cursor`}
                      >
                        <i className="fas fa-play-circle mr-2 md:mr-3"></i>
                        {status === 'authenticated' ? 'Go to Dashboard' : 'Try Now'}
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
            
            {/* Desktop Grid View */}
            <div className="hidden lg:grid lg:grid-cols-2 gap-12">
              <div className="space-y-8">
                <div className={`bg-gradient-to-br ${features[activeFeatureSlide].color} rounded-3xl p-12 shadow-xl border border-slate-200`}>
                  <div className="flex items-center mb-10">
                    <div className={`w-20 h-20 rounded-3xl bg-white flex items-center justify-center mr-8 border border-slate-200`}>
                      <i className={`fas ${features[activeFeatureSlide].icon} ${features[activeFeatureSlide].iconColor} text-3xl`}></i>
                    </div>
                    <div>
                      <h3 className="text-3xl font-bold text-slate-800">
                        {features[activeFeatureSlide].title}
                      </h3>
                      <div className="text-base text-slate-500 mt-2">
                        {features[activeFeatureSlide].tokenInfo}
                      </div>
                    </div>
                  </div>
                 
                  <p className="text-slate-600 text-lg mb-10 leading-relaxed">
                    {features[activeFeatureSlide].description}
                  </p>
                 
                  <div className="space-y-4 mb-12 max-h-80 overflow-y-auto pr-4">
                    {features[activeFeatureSlide].modules.map((module, idx) => (
                      <div key={idx} className="flex items-center">
                        <i className="fas fa-check-circle text-emerald-500 mr-5 text-xl flex-shrink-0"></i>
                        <span className="text-slate-700 text-lg">{module}</span>
                      </div>
                    ))}
                  </div>
                </div>
               
                <div className="flex space-x-6">
                  <button
                    onClick={() => {
                      if (status === 'authenticated') {
                        router.push('/dashboard');
                      } else {
                        const loginSection = document.querySelector('#login-section');
                        if (loginSection) {
                          loginSection.scrollIntoView({ behavior: 'smooth' });
                        }
                      }
                    }}
                    className={`flex-1 py-4 text-white rounded-xl font-semibold hover:shadow-lg hover:scale-[1.02] transition-all duration-300 shadow-md flex items-center justify-center ${features[activeFeatureSlide].buttonColor} text-lg hand-cursor`}
                  >
                    <i className="fas fa-play-circle mr-3"></i>
                    {status === 'authenticated' ? 'Go to Dashboard' : 'Try Now'}
                  </button>
                  <button
                    onClick={() => scrollToSection('pricing')}
                    className="flex-1 py-4 border-2 border-slate-300 text-slate-700 rounded-xl font-semibold hover:bg-slate-50 hover:scale-[1.02] transition-all duration-300 flex items-center justify-center text-lg hand-cursor"
                  >
                    <i className="fas fa-tag mr-3"></i>
                    View Pricing
                  </button>
                </div>
              </div>
              
              <div className="space-y-6 max-h-[600px] overflow-y-auto pr-4">
                {features.map((feature, index) => (
                  <button
                    key={feature.id}
                    onClick={() => setActiveFeatureSlide(index)}
                    className={`w-full p-8 rounded-2xl text-left transition-all duration-300 flex items-center hand-cursor ${
                      activeFeatureSlide === index
                        ? 'bg-gradient-to-r from-white to-slate-50 border-2 border-slate-300 shadow-lg'
                        : 'bg-white border border-slate-200 hover:border-slate-300 hover:shadow-lg'
                    }`}
                  >
                    <div className={`w-16 h-16 rounded-2xl bg-gradient-to-r ${feature.color} flex items-center justify-center mr-8 border border-slate-200 flex-shrink-0`}>
                      <i className={`fas ${feature.icon} ${feature.iconColor} text-2xl`}></i>
                    </div>
                    <div className="flex-1 text-left">
                      <h4 className="text-xl font-semibold text-slate-800">{feature.title}</h4>
                      <div className="text-base text-slate-500 mt-2">{feature.tokenInfo}</div>
                    </div>
                    <i className={`fas fa-chevron-right text-2xl ${activeFeatureSlide === index ? 'text-blue-600' : 'text-slate-400'}`}></i>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Pricing Section */}
        <section ref={pricingRef} className="relative py-12 md:py-20 overflow-hidden">
          {/* Animated Resonance Background */}
          <div className="absolute inset-0 z-0">
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-950 via-purple-950 to-slate-950"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="relative w-full h-full max-w-6xl mx-auto">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[120%] rounded-full border border-cyan-400/20 animate-ping-slow"></div>
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[100%] h-[100%] rounded-full border border-blue-400/30 animate-pulse-slow"></div>
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80%] h-[80%] rounded-full border border-purple-400/40 animate-ping-slower"></div>
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[60%] h-[60%] rounded-full border border-cyan-300/50 animate-pulse-slower"></div>
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[40%] h-[40%] rounded-full bg-gradient-to-r from-cyan-500/20 via-blue-500/20 to-purple-500/20 blur-3xl animate-glow"></div>
              </div>
            </div>
            <div className="absolute inset-0 overflow-hidden">
              {[...Array(50)].map((_, i) => (
                <div
                  key={i}
                  className="absolute rounded-full bg-white/20 animate-float"
                  style={{
                    width: `${Math.random() * 4 + 2}px`,
                    height: `${Math.random() * 4 + 2}px`,
                    top: `${Math.random() * 100}%`,
                    left: `${Math.random() * 100}%`,
                    animationDelay: `${Math.random() * 10}s`,
                    animationDuration: `${Math.random() * 10 + 10}s`,
                  }}
                ></div>
              ))}
            </div>
            <div className="absolute inset-0 bg-gradient-to-t from-indigo-950/80 via-purple-950/50 to-transparent"></div>
          </div>
          
          <div className="container mx-auto px-4 relative z-10">
            <div className="text-center mb-12 md:mb-16">
              <h2 className="text-3xl md:text-5xl lg:text-6xl font-bold text-white mb-6 md:mb-8 font-['Poppins'] drop-shadow-lg">
                Flexible Token Packages
              </h2>
              <p className="text-lg md:text-xl lg:text-2xl text-slate-200 max-w-4xl mx-auto drop-shadow">
                Choose the package that fits your study needs. All tokens never expire.
              </p>
            </div>
            
            <div className="relative">
              {tokenPackages.length > 0 ? (
                <div id="pricing-slider" className="splide">
                  <div className="splide__track">
                    <div className="splide__list">
                      {tokenPackages.map((pkg) => (
                        <div key={pkg.id} className="splide__slide flex justify-center">
                          <div className={`w-full max-w-sm relative rounded-2xl transition-all duration-300 mt-6 ${
                            pkg.popular
                              ? 'bg-gradient-to-b from-white/95 to-slate-50/95 border-2 border-amber-300 shadow-2xl ring-2 ring-amber-200/50 backdrop-blur-sm'
                              : 'bg-white/90 backdrop-blur-sm border border-white/30 shadow-xl hover:shadow-2xl'
                          }`}>
                            {pkg.popular && (
                              <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 z-20">
                                <span className="px-6 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-full text-sm font-bold shadow-lg whitespace-nowrap flex items-center gap-2">
                                  <i className="fas fa-crown text-xs"></i>
                                  MOST POPULAR
                                </span>
                              </div>
                            )}
                            
                            <div className={`p-6 flex flex-col h-full ${pkg.popular ? 'pt-8' : ''}`}>
                              <div className="text-center mb-5">
                                <h3 className="text-2xl font-bold text-slate-800 mb-1">{pkg.name}</h3>
                                <p className="text-slate-500 text-sm">{pkg.description}</p>
                              </div>
                              
                              <div className="text-center mb-5">
                                <div className="text-4xl font-bold text-slate-800 mb-1">
                                  {formatPrice(pkg.price)}
                                </div>
                                <div className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-blue-700 bg-clip-text text-transparent mb-1">
                                  {pkg.tokenAmount.toLocaleString()} Tokens
                                </div>
                                <div className="text-xs text-slate-500">
                                  ≈ ₦{(pkg.price / pkg.tokenAmount / 100).toFixed(2)} per token
                                </div>
                              </div>
                              
                              <div className="flex-grow mb-5">
                                <div className="space-y-2">
                                  {pkg.features?.slice(0, 5).map((feature, idx) => (
                                    <div key={idx} className="flex items-start gap-2">
                                      <i className="fas fa-check-circle text-emerald-500 text-sm mt-0.5 flex-shrink-0"></i>
                                      <span className="text-slate-600 text-sm">{feature}</span>
                                    </div>
                                  ))}
                                  {pkg.features && pkg.features.length > 5 && (
                                    <div className="text-slate-400 text-xs italic mt-2">
                                      +{pkg.features.length - 5} more features
                                    </div>
                                  )}
                                </div>
                              </div>
                              
                              <button
                                onClick={() => {
                                  if (status === 'authenticated') {
                                    router.push('/dashboard');
                                  } else {
                                    const loginSection = document.querySelector('#login-section');
                                    if (loginSection) {
                                      loginSection.scrollIntoView({ behavior: 'smooth' });
                                    }
                                  }
                                }}
                                className={`w-full py-3 rounded-xl font-semibold transition-all duration-300 text-sm flex items-center justify-center gap-2 ${
                                  pkg.popular
                                    ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white hover:shadow-lg shadow-md hover:scale-[1.02]'
                                    : 'bg-gradient-to-r from-blue-500 to-blue-600 text-white hover:shadow-lg shadow-md hover:scale-[1.02]'
                                }`}
                              >
                                <i className={`fas ${pkg.popular ? 'fa-crown' : 'fa-shopping-cart'} text-sm`}></i>
                                {status === 'authenticated' 
                                  ? 'Go to Dashboard' 
                                  : (pkg.popular ? 'Get Professional' : 'Get Started')}
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  <div className="splide__arrows hidden md:block">
                    <button className="splide__arrow splide__arrow--prev !bg-white/90 !shadow-lg !border !border-white/30 hover:!bg-white !w-12 !h-12 !rounded-full !-left-6 backdrop-blur-sm transition-all duration-300">
                      <i className="fas fa-chevron-left text-slate-600 text-lg"></i>
                    </button>
                    <button className="splide__arrow splide__arrow--next !bg-white/90 !shadow-lg !border !border-white/30 hover:!bg-white !w-12 !h-12 !rounded-full !-right-6 backdrop-blur-sm transition-all duration-300">
                      <i className="fas fa-chevron-right text-slate-600 text-lg"></i>
                    </button>
                  </div>
                  
                  <div className="splide__pagination mt-8 md:hidden !relative !bottom-0"></div>
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-4 border-b-4 border-cyan-400 mb-4"></div>
                  <p className="text-white">Loading packages...</p>
                </div>
              )}
            </div>
            
            <div className="mt-16 max-w-4xl mx-auto">
              <div className="bg-gradient-to-br from-white/10 via-white/5 to-transparent backdrop-blur-lg rounded-3xl p-6 md:p-8 shadow-2xl border border-white/30">
                <h3 className="text-2xl md:text-3xl font-bold text-white mb-6 text-center drop-shadow">
                  Token Usage Calculator
                </h3>
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-5">
                    <div>
                      <label className="block text-base font-medium text-white mb-2">
                        Select Feature
                      </label>
                      <select
                        value={calculatorFeature}
                        onChange={(e) => setCalculatorFeature(e.target.value)}
                        className="w-full px-4 py-3 bg-white/20 backdrop-blur-sm border-2 border-white/40 rounded-xl focus:ring-2 focus:ring-cyan-400 focus:border-cyan-400 text-white text-sm cursor-pointer transition-all duration-300"
                      >
                        <option value="cbt" className="text-slate-900">CBT Examination (5 tokens/session)</option>
                        <option value="osce" className="text-slate-900">OSCE Practice (10 tokens/session)</option>
                        <option value="flashcards" className="text-slate-900">AI Flashcard Generator (3 tokens/session)</option>
                        <option value="clinchers" className="text-slate-900">Clinchers (4 tokens/session)</option>
                        <option value="mocks" className="text-slate-900">Mock Exams (8 tokens/session)</option>
                        <option value="quiz" className="text-slate-900">Quick Quizzes (2 tokens/session)</option>
                        <option value="qtopics" className="text-slate-900">Q-Topics (6 tokens/session)</option>
                        <option value="analysis" className="text-slate-900">AI Analysis (7 tokens/session)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-base font-medium text-white mb-2">
                        Sessions per Month: {calculatorSessions}
                      </label>
                      <input
                        type="range"
                        min="1"
                        max="50"
                        value={calculatorSessions}
                        onChange={(e) => setCalculatorSessions(parseInt(e.target.value))}
                        className="w-full h-2 bg-white/30 rounded-full appearance-none cursor-pointer accent-cyan-400"
                      />
                      <div className="flex justify-between text-white/70 text-xs mt-1">
                        <span>1</span>
                        <span>25</span>
                        <span>50</span>
                      </div>
                    </div>
                  </div>
                  <div className="bg-white/20 backdrop-blur-sm rounded-xl p-5 flex flex-col justify-center border border-white/30">
                    <div className="text-center">
                      <div className="text-4xl font-bold text-white mb-2">{calculatedTokens} Tokens</div>
                      <div className="text-base text-white mb-3 font-semibold">Monthly Estimate</div>
                      <div className="text-white/90 text-sm">
                        Based on {calculatorSessions} {calculatorSessions === 1 ? 'session' : 'sessions'} of {features.find(f => f.id === calculatorFeature)?.title || 'selected feature'}
                      </div>
                      <div className="mt-4 pt-4 border-t border-white/30">
                        <div className="text-xs text-white/80">
                          Rate: {getTokenRate()} tokens per session
                        </div>
                        <div className="text-xs text-white/80 mt-1">
                          Approximate cost: ~₦{(getTokenRate() * 80).toLocaleString()} per session
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Testimonials Section - Updated with 5 testimonials and See All button */}
        <section ref={testimonialsRef} className="py-12 md:py-20 bg-gradient-to-br from-slate-800 to-slate-900">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12 md:mb-16">
              <h2 className="text-3xl md:text-5xl lg:text-6xl font-bold text-white mb-6 md:mb-8 font-['Poppins']">
                Trusted by Medical Professionals
              </h2>
              <p className="text-lg md:text-xl lg:text-2xl text-slate-300 max-w-4xl mx-auto">
                Join thousands of successful candidates who passed their exams with Acemedix Academy
              </p>
            </div>
            
            {/* Testimonial Slider - 5 featured testimonials */}
            <div className="relative testimonial-slider mb-12">
              <div id="testimonials-slider" className="splide">
                <div className="splide__track">
                  <div className="splide__list">
                    {featuredTestimonials.map((testimonial) => (
                      <div key={testimonial.id} className="splide__slide">
                        <div className="flex justify-center px-3">
                          <div className="bg-white/10 backdrop-blur-sm rounded-3xl p-6 md:p-8 border border-white/20 h-full flex flex-col w-full max-w-md">
                            <div className="flex text-amber-400 mb-4 md:mb-6">
                              {[...Array(5)].map((_, i) => (
                                <i
                                  key={i}
                                  className="fas fa-star text-amber-400 text-base mr-1"
                                ></i>
                              ))}
                            </div>
                            <p className="text-white text-base md:text-lg mb-6 md:mb-8 leading-relaxed flex-grow line-clamp-6">
                              "{testimonial.content}"
                            </p>
                            <div className="flex items-center pt-4 md:pt-6 border-t border-white/20">
                              <div className="w-10 h-10 md:w-12 md:h-12 bg-gradient-to-r from-blue-400 to-blue-500 rounded-full flex items-center justify-center mr-3 md:mr-4 shadow-md">
                                <i className="fas fa-user-md text-white text-sm md:text-base"></i>
                              </div>
                              <div className="flex-1">
                                <div className="font-bold text-white text-lg md:text-xl">{testimonial.name}</div>
                                <div className="text-slate-300 text-xs md:text-sm">{testimonial.role}</div>
                              </div>
                              {testimonial.date && (
                                <div className="text-slate-400 text-xs">{testimonial.date}</div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                
                <div className="splide__arrows hidden md:block">
                  <button className="splide__arrow splide__arrow--prev" style={{ left: '-3rem' }}>
                    <i className="fas fa-chevron-left text-white text-2xl"></i>
                  </button>
                  <button className="splide__arrow splide__arrow--next" style={{ right: '-3rem' }}>
                    <i className="fas fa-chevron-right text-white text-2xl"></i>
                  </button>
                </div>
                
                <div className="splide__pagination mt-8 md:mt-12 !relative !bottom-0"></div>
              </div>
            </div>
            
            {/* See All Testimonials Button */}
            <div className="text-center">
              <Link
                href="/testimonials"
                className="inline-flex items-center gap-3 px-8 py-4 bg-white/10 hover:bg-white/20 backdrop-blur-sm text-white rounded-xl font-semibold transition-all duration-300 border border-white/30 hover:scale-105 group"
              >
                <i className="fas fa-star text-amber-400"></i>
                <span>See All Testimonials</span>
                <i className="fas fa-arrow-right text-sm group-hover:translate-x-1 transition-transform"></i>
              </Link>
            </div>
          </div>
        </section>

        {/* Updated Student Reviews Section with Dynamic Carousel */}
        <section className="py-12 md:py-20 bg-white">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12 md:mb-16">
              <div className="flex flex-col items-center justify-center gap-4 mb-4">
                <h2 className="text-3xl md:text-5xl lg:text-6xl font-bold text-slate-800 mb-2 font-['Poppins']">
                  Student's Reviews & Ratings
                </h2>
                {/* Badge for Google Reviews */}
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-50 border border-green-200 rounded-full shadow-sm">
                  <i className="fab fa-google text-green-600 text-sm"></i>
                  <span className="text-sm font-semibold text-green-700">Top Google Reviews</span>
                  <span className="text-xs text-green-600 bg-green-100 px-2 py-0.5 rounded-full">150+ total reviews</span>
                </div>
              </div>
              <div className="flex flex-col md:flex-row items-center justify-center space-y-8 md:space-y-0 md:space-x-16 mt-6">
                <div className="text-center">
                  <div className="text-4xl md:text-5xl lg:text-6xl font-bold text-amber-500">5.0</div>
                  <div className="flex text-amber-400 text-xl md:text-2xl justify-center my-3 md:my-4">
                    {[...Array(5)].map((_, i) => (
                      <i key={i} className="fas fa-star mx-1"></i>
                    ))}
                  </div>
                  <div className="text-lg md:text-xl text-slate-600 font-semibold">Average Rating</div>
                </div>
                <div className="text-left">
                  <div className="flex items-center mb-3 md:mb-4">
                    <span className="text-slate-600 w-16 md:w-20 text-base md:text-lg">5 stars</span>
                    <div className="w-32 md:w-48 h-3 bg-slate-200 rounded-xl overflow-hidden">
                      <div className="h-full bg-amber-500 w-full"></div>
                    </div>
                    <span className="text-slate-700 font-semibold ml-4 md:ml-6 text-base md:text-lg">100%</span>
                  </div>
                  <div className="flex items-center">
                    <span className="text-slate-600 w-16 md:w-20 text-base md:text-lg">4 stars</span>
                    <div className="w-32 md:w-48 h-3 bg-slate-200 rounded-xl overflow-hidden">
                      <div className="h-full bg-amber-400 w-0"></div>
                    </div>
                    <span className="text-slate-700 font-semibold ml-4 md:ml-6 text-base md:text-lg">0%</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Dynamic Reviews Carousel */}
            <div className="relative reviews-slider">
              <div id="reviews-slider" className="splide">
                <div className="splide__track">
                  <div className="splide__list">
                    {allStudentReviews.map((review) => (
                      <div key={review.id} className="splide__slide">
                        <div className="flex justify-center px-2">
                          <div className="bg-white rounded-2xl p-6 md:p-8 shadow-xl border border-slate-200 hover:shadow-2xl transition-shadow flex flex-col h-full w-full max-w-md">
                            <div className="flex items-start justify-between mb-4 md:mb-6">
                              <div className="flex items-center">
                                <div className={`w-10 h-10 md:w-12 md:h-12 ${review.avatarColor} rounded-full flex items-center justify-center mr-3 md:mr-4 border border-slate-200`}>
                                  <span className="text-slate-700 font-semibold text-sm md:text-base">
                                    {review.name.split(' ').map((n: string) => n[0]).join('')}
                                  </span>
                                </div>
                                <div>
                                  <div className="font-bold text-slate-800 text-base md:text-lg">{review.name}</div>
                                  <div className="text-slate-600 text-sm md:text-base">{review.role}</div>
                                </div>
                              </div>
                              <div className="text-amber-500 font-bold text-lg md:text-xl">{review.rating.toFixed(1)}</div>
                            </div>
                            <p className="text-slate-700 text-base md:text-lg mb-4 md:mb-6 leading-relaxed flex-grow line-clamp-6">
                              "{review.comment}"
                            </p>
                            <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100">
                              <div className="text-slate-500 text-sm md:text-base">{review.date}</div>
                              {review.likes && review.likes > 0 && (
                                <div className="flex items-center text-rose-500 text-sm">
                                  <i className="fas fa-heart mr-1"></i> {review.likes}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                
                <div className="splide__arrows hidden md:block">
                  <button className="splide__arrow splide__arrow--prev !bg-white !shadow-md !border !border-slate-200 hover:!bg-slate-50 !w-10 !h-10 !rounded-full !-left-5 transition-all duration-300">
                    <i className="fas fa-chevron-left text-slate-600 text-base"></i>
                  </button>
                  <button className="splide__arrow splide__arrow--next !bg-white !shadow-md !border !border-slate-200 hover:!bg-slate-50 !w-10 !h-10 !rounded-full !-right-5 transition-all duration-300">
                    <i className="fas fa-chevron-right text-slate-600 text-base"></i>
                  </button>
                </div>
                
                <div className="splide__pagination mt-8 md:mt-12 !relative !bottom-0"></div>
              </div>
            </div>
          </div>
        </section>

        {/* Contact Section */}
        <section ref={contactRef} className="py-12 md:py-20 bg-gradient-to-br from-slate-50 to-blue-50/30">
          <div className="container mx-auto px-4">
            <div className="grid lg:grid-cols-2 gap-12 md:gap-16">
              <div>
                <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-slate-800 mb-6 md:mb-8 font-['Poppins']">
                  Get in Touch
                </h2>
                <p className="text-slate-600 text-lg md:text-xl mb-8 md:mb-12">
                  Have questions about our platform or token system? Our team is here to help you succeed.
                </p>
               
                <div className="space-y-6 md:space-y-8">
                  <div className="flex items-center">
                    <div className="w-12 h-12 md:w-16 md:h-16 bg-gradient-to-r from-blue-100 to-blue-200 rounded-2xl flex items-center justify-center mr-4 md:mr-6 border border-blue-100">
                      <i className="fas fa-map-marker-alt text-blue-600 text-lg md:text-xl"></i>
                    </div>
                    <div>
                      <div className="font-bold text-slate-800 text-lg md:text-xl">Our Office</div>
                      <div className="text-slate-600 text-base md:text-lg">Peace Plaza, Opposite Rogel Brooks Hotel, Utako, Abuja</div>
                    </div>
                  </div>
                 
                  <div className="flex items-center">
                    <div className="w-12 h-12 md:w-16 md:h-16 bg-gradient-to-r from-emerald-100 to-emerald-200 rounded-2xl flex items-center justify-center mr-4 md:mr-6 border border-emerald-100">
                      <i className="fas fa-phone text-emerald-600 text-lg md:text-xl"></i>
                    </div>
                    <div>
                      <div className="font-bold text-slate-800 text-lg md:text-xl">Phone Number</div>
                      <div className="text-slate-600 text-base md:text-lg">+2347087018175</div>
                    </div>
                  </div>
                 
                  <div className="flex items-center">
                    <div className="w-12 h-12 md:w-16 md:h-16 bg-gradient-to-r from-amber-100 to-amber-200 rounded-2xl flex items-center justify-center mr-4 md:mr-6 border border-amber-100">
                      <i className="fas fa-envelope text-amber-600 text-lg md:text-xl"></i>
                    </div>
                    <div>
                      <div className="font-bold text-slate-800 text-lg md:text-xl">Email Address</div>
                      <div className="text-slate-600 text-base md:text-lg">support@acemedai.com</div>
                    </div>
                  </div>
                </div>
                
                <div className="mt-12 md:mt-16">
                  <h3 className="text-xl md:text-2xl font-bold text-slate-800 mb-4 md:mb-6">Find Us</h3>
                  <div className="rounded-2xl overflow-hidden shadow-2xl border border-slate-200">
                    <iframe
                      src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3939.946332840884!2d7.437524211019801!3d9.068653988328554!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x104e7536b897978b%3A0x501ae55b18d3c145!2sAcemedix%20Academy!5e0!3m2!1sen!2sng!4v1765002157583!5m2!1sen!2sng"
                      width="100%"
                      height="300"
                      style={{ border: 0 }}
                      allowFullScreen
                      loading="lazy"
                      referrerPolicy="no-referrer-when-downgrade"
                      className="w-full"
                      title="Acemedix Academy Location Map"
                    ></iframe>
                  </div>
                </div>
              </div>
             
              <div className="bg-white rounded-3xl p-6 md:p-8 lg:p-12 shadow-xl border border-slate-200">
                <h3 className="text-xl md:text-2xl font-bold text-slate-800 mb-6 md:mb-10">Send us a message</h3>
                <form className="space-y-6 md:space-y-8">
                  <div className="grid md:grid-cols-2 gap-6 md:gap-8">
                    <div>
                      <label className="block text-base md:text-lg font-medium text-slate-700 mb-3 md:mb-4">
                        First Name
                      </label>
                      <input
                        type="text"
                        className="w-full px-4 md:px-5 py-3 md:py-4 border border-slate-300 rounded-xl focus:ring-3 focus:ring-blue-500 focus:border-blue-500 text-base hand-cursor"
                        placeholder="John"
                      />
                    </div>
                    <div>
                      <label className="block text-base md:text-lg font-medium text-slate-700 mb-3 md:mb-4">
                        Last Name
                      </label>
                      <input
                        type="text"
                        className="w-full px-4 md:px-5 py-3 md:py-4 border border-slate-300 rounded-xl focus:ring-3 focus:ring-blue-500 focus:border-blue-500 text-base hand-cursor"
                        placeholder="Doe"
                      />
                    </div>
                  </div>
                 
                  <div>
                    <label className="block text-base md:text-lg font-medium text-slate-700 mb-3 md:mb-4">
                      Email
                    </label>
                    <input
                      type="email"
                      className="w-full px-4 md:px-5 py-3 md:py-4 border border-slate-300 rounded-xl focus:ring-3 focus:ring-blue-500 focus:border-blue-500 text-base hand-cursor"
                      placeholder="john@example.com"
                    />
                  </div>
                 
                  <div>
                    <label className="block text-base md:text-lg font-medium text-slate-700 mb-3 md:mb-4">
                      Message
                    </label>
                    <textarea
                      rows={4}
                      className="w-full px-4 md:px-5 py-3 md:py-4 border border-slate-300 rounded-xl focus:ring-3 focus:ring-blue-500 focus:border-blue-500 text-base hand-cursor"
                      placeholder="Your message..."
                    ></textarea>
                  </div>
                 
                  <button
                    type="submit"
                    className="w-full py-4 md:py-5 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl font-semibold hover:shadow-lg hover:scale-[1.02] transition-all duration-300 shadow-md flex items-center justify-center text-lg md:text-xl mt-8 md:mt-12 hand-cursor"
                  >
                    <i className="fas fa-paper-plane mr-3 md:mr-4 text-lg md:text-xl"></i>
                    Send Message
                  </button>
                </form>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-gradient-to-br from-slate-800 to-slate-900 text-white py-12 md:py-16">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-8 md:gap-12 mb-8 md:mb-12">
            <div className="col-span-2 md:col-span-1">
              <div className="flex items-center space-x-3 md:space-x-4 mb-6 md:mb-8">
                <div className="w-12 h-12 md:w-14 md:h-14 rounded-xl overflow-hidden shadow-md bg-white flex items-center justify-center">
                  <Image
                    src="/uploads/acelogo.png"
                    alt="Acemedix Academy Logo"
                    width={56}
                    height={56}
                    className="object-contain"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.style.display = 'none';
                      const parent = target.parentElement;
                      if (parent) {
                        parent.classList.add('bg-gradient-to-r', 'from-blue-500', 'to-blue-600');
                        const icon = document.createElement('i');
                        icon.className = 'fas fa-stethoscope text-white text-xl md:text-2xl';
                        parent.appendChild(icon);
                      }
                    }}
                  />
                </div>
                <div>
                  <h2 className="text-xl md:text-2xl font-bold">Acemedix Academy</h2>
                  <p className="text-slate-300 text-sm md:text-base">Medical Education Platform</p>
                </div>
              </div>
              <p className="text-slate-300 text-base md:text-lg">
                Revolutionizing medical education through AI-powered learning and assessment.
              </p>
            </div>
           
            <div>
              <h3 className="text-lg md:text-xl font-bold mb-4 md:mb-6">Quick Links</h3>
              <ul className="space-y-2 md:space-y-4">
                {['Home', 'Features', 'Pricing', 'Testimonials', 'Contact'].map((item) => (
                  <li key={item}>
                    {item === 'Testimonials' ? (
                      <Link
                        href="/testimonials"
                        className="text-slate-300 hover:text-white transition-colors text-base md:text-lg hand-cursor"
                      >
                        {item}
                      </Link>
                    ) : (
                      <button
                        onClick={() => scrollToSection(item.toLowerCase())}
                        className="text-slate-300 hover:text-white transition-colors text-base md:text-lg hand-cursor"
                      >
                        {item}
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            </div>
           
            <div>
              <h3 className="text-lg md:text-xl font-bold mb-4 md:mb-6">Features</h3>
              <ul className="space-y-2 md:space-y-4">
                {features.slice(0, 5).map((feature) => (
                  <li key={feature.id}>
                    <button
                      onClick={() => scrollToSection('features')}
                      className="text-slate-300 hover:text-white transition-colors text-base md:text-lg hand-cursor"
                    >
                      {feature.title}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
           
            <div className="col-span-2 md:col-span-1 lg:col-span-1">
              <h3 className="text-lg md:text-xl font-bold mb-4 md:mb-6">Connect With Us</h3>
              <div className="flex space-x-3 md:space-x-4 mb-6 md:mb-8">
                <a href="#" className="w-10 h-10 md:w-14 md:h-14 bg-slate-700 rounded-xl flex items-center justify-center hover:bg-blue-600 transition-colors shadow-md hand-cursor">
                  <i className="fab fa-facebook-f text-sm md:text-lg"></i>
                </a>
                <a href="#" className="w-10 h-10 md:w-14 md:h-14 bg-slate-700 rounded-xl flex items-center justify-center hover:bg-blue-400 transition-colors shadow-md hand-cursor">
                  <i className="fab fa-twitter text-sm md:text-lg"></i>
                </a>
                <a href="#" className="w-10 h-10 md:w-14 md:h-14 bg-slate-700 rounded-xl flex items-center justify-center hover:bg-blue-600 transition-colors shadow-md hand-cursor">
                  <i className="fab fa-linkedin-in text-sm md:text-lg"></i>
                </a>
                <a href="#" className="w-10 h-10 md:w-14 md:h-14 bg-slate-700 rounded-xl flex items-center justify-center hover:bg-green-500 transition-colors shadow-md hand-cursor">
                  <i className="fab fa-whatsapp text-sm md:text-lg"></i>
                </a>
              </div>
              <div className="text-slate-400 text-base md:text-lg">
                © {new Date().getFullYear()} Acemedix Academy. All rights reserved.
              </div>
            </div>
          </div>
         
          <div className="border-t border-slate-700 pt-8 md:pt-12 text-center text-slate-400 text-base md:text-lg">
            <p>MDCN is a registered trademark of the Medical and Dental Council of Nigeria.</p>
            <p className="mt-2 md:mt-4">Acemedix Academy is not affiliated with MDCN but provides preparatory materials.</p>
          </div>
        </div>
      </footer>

      {/* Font Awesome */}
      <link
        rel="stylesheet"
        href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css"
      />
      {/* Splide JS */}
      <script src="https://cdn.jsdelivr.net/npm/@splidejs/splide@4.1.4/dist/js/splide.min.js"></script>
    </div>
  );
}