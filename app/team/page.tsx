"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";

// Types
interface TeamMember {
  id: number;
  name: string;
  role: string;
  title: string;
  image: string;
  description?: string;
  social?: {
    linkedin?: string;
    twitter?: string;
    email?: string;
  };
}

// Team Members Data
const teamMembers: TeamMember[] = [
  {
    id: 1,
    name: "Dr. Abugu Nnadozie Livinus",
    role: "Founder & CEO",
    title: "MD",
    image: "/uploads/team/dozie.jpeg",
    description: "Founder of Acemedix Group and CEO of Acemedix Academy. A visionary leader dedicated to revolutionizing medical education in Nigeria. With years of experience in medical education and a passion for helping doctors succeed, Dr. Livinus has built a platform that has transformed countless medical careers.",
    social: {
      linkedin: "#",
      twitter: "#",
      email: "dr.livinus@acemedix.com"
    }
  },
  {
    id: 2,
    name: "Mrs. Mavis Akwaeke",
    role: "Administrative Officer",
    title: "Bsc Business Admin",
    image: "/uploads/team/marvis.jpeg",
    description: "Administrative Officer and Manager, ensuring smooth operations and excellent student experience. With her organizational skills and dedication, she ensures that every student receives the support they need throughout their preparation journey.",
    social: {
      linkedin: "#",
      email: "mavis@acemedix.com"
    }
  },
  {
    id: 3,
    name: "Dr. Popoola Bilqis Bukola",
    role: "Senior Tutor",
    title: "Resident Doctor, Dept of Obstetrics and Gynecology",
    image: "/uploads/team/popoola.jpeg",
    description: "Specializes in Bullet Point and Masterclass sessions, helping students master complex concepts with ease. Her expertise in Obstetrics and Gynecology brings real-world clinical experience to the classroom.",
    social: {
      linkedin: "#",
      email: "dr.bukola@acemedix.com"
    }
  },
  {
    id: 4,
    name: "Dr. Buhari Abdullahi Kaoje",
    role: "Senior Tutor",
    title: "MBBS, Senior Registrar, General surgery, UDUTH",
    image: "/uploads/team/buhari.jpeg",
    description: "Expert in Keypoint Lectures, Masterclass, and Bullet Point sessions, bringing surgical precision to teaching. His deep understanding of surgical principles helps students grasp complex surgical concepts with ease.",
    social: {
      linkedin: "#",
      email: "dr.buhari@acemedix.com"
    }
  },
  {
    id: 5,
    name: "Dr. Fahad Lawal",
    role: "Senior Tutor",
    title: "Senior Registrar Cardiology Unit, UDUTH",
    image: "/uploads/team/fahad.jpeg",
    description: "Specializes in Keypoint Lectures, Masterclass, and Bulletpoint sessions, sharing expertise in cardiology. His passion for cardiology and teaching makes complex cardiac concepts accessible to all students.",
    social: {
      linkedin: "#",
      email: "dr.fahad@acemedix.com"
    }
  },
  {
    id: 6,
    name: "Dr. Ugwueze Kingsley",
    role: "Tutor",
    title: "MBBS, Medical Officer",
    image: "/uploads/team/ugwueze.jpeg",
    description: "Dedicated tutor for Private & Group Sessions, providing personalized guidance to students. His patient-centered approach ensures that every student receives individual attention and support.",
    social: {
      linkedin: "#",
      email: "dr.kingsley@acemedix.com"
    }
  },
  {
    id: 7,
    name: "Dr. Victor Nehemiah Adasi",
    role: "Coordinator & Tutor",
    title: "Medical Officer",
    image: "/uploads/team/victor.jpeg",
    description: "Coordinates programs and tutors students, ensuring effective learning outcomes. His organizational skills and teaching expertise create a seamless learning experience for all students.",
    social: {
      linkedin: "#",
      email: "dr.victor@acemedix.com"
    }
  },
  {
    id: 8,
    name: "Dr. Samuel Cyprain",
    role: "Coordinator & Tutor",
    title: "MBBS",
    image: "/uploads/team/samuel.jpeg",
    description: "Coordinates and tutors students, bringing enthusiasm and expertise to every session. His energetic teaching style and deep knowledge make learning engaging and effective.",
    social: {
      linkedin: "#",
      email: "dr.samuel@acemedix.com"
    }
  },
  {
    id: 9,
    name: "Dr. Ngwobia Kelechi Mike",
    role: "Tutor (PLAB 1)",
    title: "MBBS, GP registrar (UK)",
    image: "/uploads/team/ngwabia.jpeg",
    description: "Specializes in PLAB 1 preparation, helping students pursue international medical careers. With UK clinical experience, he provides invaluable insights into the PLAB examination format.",
    social: {
      linkedin: "#",
      email: "dr.ngwobia@acemedix.com"
    }
  },
  {
    id: 10,
    name: "Dr. Johnson Israel",
    role: "Tutor (PLAB 1)",
    title: "Medical Officer",
    image: "/uploads/team/johnson.jpeg",
    description: "Expert tutor for PLAB 1 preparation, guiding students toward UK medical licensing. His focused approach helps students master the PLAB curriculum efficiently.",
    social: {
      linkedin: "#",
      email: "dr.johnson@acemedix.com"
    }
  },
  {
    id: 11,
    name: "Dr. Samuel Ejumudo",
    role: "General Class Tutor",
    title: "Medical Officer",
    image: "/uploads/team/eju.jpeg",
    description: "Versatile tutor covering a wide range of medical topics in general classes. His broad knowledge base and teaching experience make him an invaluable resource for students.",
    social: {
      linkedin: "#",
      email: "dr.ejumudo@acemedix.com"
    }
  }
];

export default function TeamPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null);

  const handleLogout = async () => {
    await signOut({ callbackUrl: '/' });
  };

  const getUserDisplayName = () => {
    if (session?.user?.name) {
      return session.user.name;
    }
    if (session?.user?.email) {
      return session.user.email.split('@')[0];
    }
    return 'User';
  };

  // Mobile menu items (same as main page)
  const mobileMenuItems = [
    { label: 'Home', icon: 'fa-home', color: 'bg-gradient-to-r from-blue-500 to-blue-600', action: () => {
      setIsMobileMenuOpen(false);
      router.push('/');
    }},
    { label: 'About', icon: 'fa-info-circle', color: 'bg-gradient-to-r from-teal-500 to-emerald-600', action: () => {
      setIsMobileMenuOpen(false);
      router.push('/#about');
    }},
    { label: 'Features', icon: 'fa-star', color: 'bg-gradient-to-r from-amber-500 to-orange-600', action: () => {
      setIsMobileMenuOpen(false);
      router.push('/#features');
    }},
    { label: 'Pricing', icon: 'fa-tag', color: 'bg-gradient-to-r from-indigo-500 to-purple-600', action: () => {
      setIsMobileMenuOpen(false);
      router.push('/#pricing');
    }},
    { label: 'Team', icon: 'fa-users', color: 'bg-gradient-to-r from-blue-600 to-indigo-600', action: () => {
      setIsMobileMenuOpen(false);
      router.push('/team');
    }},
    { label: 'Testimonials', icon: 'fa-star', color: 'bg-gradient-to-r from-blue-600 to-indigo-600', action: () => {
      setIsMobileMenuOpen(false);
      router.push('/testimonials');
    }},
    { label: 'Contact', icon: 'fa-phone', color: 'bg-gradient-to-r from-slate-600 to-slate-700', action: () => {
      setIsMobileMenuOpen(false);
      router.push('/#contact');
    }},
    ...(status !== 'authenticated' ? [{ label: 'Sign In', icon: 'fa-sign-in-alt', color: 'bg-gradient-to-r from-green-500 to-emerald-600', action: () => {
      setIsMobileMenuOpen(false);
      router.push('/login');
    }}] : [])
  ];

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
              <Link href="/" className="font-medium text-slate-700 hover:text-blue-600 transition-colors px-3 xl:px-4 py-2 rounded-lg hover:bg-blue-50 flex items-center text-sm xl:text-base hand-cursor whitespace-nowrap">
                <i className="fas fa-home mr-2 text-blue-500 text-xs xl:text-sm"></i>Home
              </Link>
              <Link href="/#about" className="font-medium text-slate-700 hover:text-teal-600 transition-colors px-3 xl:px-4 py-2 rounded-lg hover:bg-teal-50 flex items-center text-sm xl:text-base hand-cursor whitespace-nowrap">
                <i className="fas fa-info-circle mr-2 text-teal-500 text-xs xl:text-sm"></i>About
              </Link>
              <Link href="/#features" className="font-medium text-slate-700 hover:text-emerald-600 transition-colors px-3 xl:px-4 py-2 rounded-lg hover:bg-emerald-50 flex items-center text-sm xl:text-base hand-cursor whitespace-nowrap">
                <i className="fas fa-star mr-2 text-emerald-500 text-xs xl:text-sm"></i>Features
              </Link>
              <Link href="/#pricing" className="font-medium text-slate-700 hover:text-amber-600 transition-colors px-3 xl:px-4 py-2 rounded-lg hover:bg-amber-50 flex items-center text-sm xl:text-base hand-cursor whitespace-nowrap">
                <i className="fas fa-tag mr-2 text-amber-500 text-xs xl:text-sm"></i>Pricing
              </Link>
              <Link
                href="/team"
                className="font-medium text-blue-600 transition-colors px-3 xl:px-4 py-2 rounded-lg bg-blue-50 flex items-center text-sm xl:text-base hand-cursor whitespace-nowrap"
              >
                <i className="fas fa-users mr-2 text-blue-500 text-xs xl:text-sm"></i>Team
              </Link>
              <Link
                href="/testimonials"
                className="font-medium text-slate-700 hover:text-blue-600 transition-colors px-3 xl:px-4 py-2 rounded-lg hover:bg-blue-50 flex items-center text-sm xl:text-base hand-cursor whitespace-nowrap"
              >
                <i className="fas fa-star mr-2 text-blue-500 text-xs xl:text-sm"></i>Testimonials
              </Link>
              <Link href="/#contact" className="font-medium text-slate-700 hover:text-slate-800 transition-colors px-3 xl:px-4 py-2 rounded-lg hover:bg-slate-100 flex items-center text-sm xl:text-base hand-cursor whitespace-nowrap">
                <i className="fas fa-phone mr-2 text-slate-500 text-xs xl:text-sm"></i>Contact
              </Link>
             
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
                  <Link
                    href="/register"
                    className="px-3 md:px-5 py-2 md:py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg font-semibold hover:shadow-md hover:scale-[1.02] transition-all duration-300 shadow-sm flex items-center text-xs md:text-base hand-cursor whitespace-nowrap"
                  >
                    <i className="fas fa-rocket mr-1 md:mr-3 text-xs md:text-sm"></i>
                    <span className="hidden sm:inline">Get Started</span>
                    <span className="sm:hidden">Start</span>
                  </Link>
                </div>
              )}
            </nav>

            {/* Tablet Navigation */}
            <div className="hidden md:flex lg:hidden items-center space-x-2 flex-wrap justify-end">
              <Link href="/" className="font-medium text-slate-700 hover:text-blue-600 transition-colors px-2 py-2 rounded-lg hover:bg-blue-50 text-sm hand-cursor">
                Home
              </Link>
              <Link href="/team" className="font-medium text-blue-600 transition-colors px-2 py-2 rounded-lg bg-blue-50 text-sm hand-cursor">
                Team
              </Link>
              <Link href="/testimonials" className="font-medium text-slate-700 hover:text-blue-600 transition-colors px-2 py-2 rounded-lg hover:bg-blue-50 text-sm hand-cursor">
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
                  <Link
                    href="/register"
                    className="px-3 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg font-semibold text-sm hand-cursor whitespace-nowrap"
                  >
                    Get Started
                  </Link>
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

      {/* Mobile Floating Menu - Same as main page with grid layout */}
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
                
                {/* Grid of navigation items - Same as main page */}
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
        {/* Hero Section */}
        <section className="relative pt-20 pb-16 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-600/10 to-indigo-600/10" />
          <div className="container mx-auto px-4 relative">
            <div className="text-center max-w-4xl mx-auto">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
              >
                <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-2xl mb-6 shadow-lg">
                  <i className="fas fa-users text-white text-3xl"></i>
                </div>
                <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-slate-800 mb-4">
                  Meet Our <span className="text-gradient-blue">Team</span>
                </h1>
                <p className="text-lg md:text-xl text-slate-600 max-w-3xl mx-auto">
                  Dedicated professionals committed to your success in medical education
                </p>
                <div className="mt-6 flex items-center justify-center gap-2">
                  <div className="flex items-center">
                    {[...Array(5)].map((_, i) => (
                      <i key={i} className="fas fa-star text-amber-400 text-sm ml-1 first:ml-0"></i>
                    ))}
                  </div>
                  <span className="text-slate-600 text-sm">Passionate educators with years of experience</span>
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        {/* Team Grid Section */}
        <section className="py-16 bg-gradient-to-br from-slate-50 to-blue-50/30">
          <div className="container mx-auto px-4">
            <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
              {teamMembers.map((member, index) => (
                <motion.div
                  key={member.id}
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="group relative bg-white rounded-2xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-500 cursor-pointer"
                  onClick={() => setSelectedMember(member)}
                >
                  {/* Decorative top bar */}
                  <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-500 origin-left"></div>
                  
                  {/* Image Container */}
                  <div className="relative h-64 overflow-hidden bg-gradient-to-br from-blue-100 to-indigo-100">
                    <Image
                      src={member.image}
                      alt={member.name}
                      fill
                      className="object-cover object-top group-hover:scale-110 transition-transform duration-500"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                        const parent = target.parentElement;
                        if (parent) {
                          parent.classList.add('flex', 'items-center', 'justify-center', 'bg-gradient-to-br', 'from-blue-500', 'to-indigo-600');
                          const fallbackDiv = document.createElement('div');
                          fallbackDiv.className = 'text-center text-white p-4';
                          fallbackDiv.innerHTML = `
                            <i class="fas fa-user-md text-5xl mb-2"></i>
                            <p class="text-sm">${member.name.split(' ')[0]}</p>
                          `;
                          parent.appendChild(fallbackDiv);
                        }
                      }}
                    />
                  </div>
                  
                  <div className="p-6">
                    <h3 className="font-bold text-slate-800 text-xl group-hover:text-blue-600 transition-colors">
                      {member.name}
                    </h3>
                    <p className="text-blue-600 font-medium text-sm mt-1">{member.role}</p>
                    <p className="text-slate-500 text-xs mt-1 line-clamp-2">{member.title}</p>
                    <p className="text-slate-600 text-sm mt-3 line-clamp-3">
                      {member.description}
                    </p>
                    <div className="mt-4 flex items-center text-blue-600 text-sm font-medium opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-y-2 group-hover:translate-y-0">
                      <span>View Profile</span>
                      <i className="fas fa-arrow-right ml-2 text-xs group-hover:translate-x-1 transition-transform"></i>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>
      </main>

      {/* Team Member Modal */}
      <AnimatePresence>
        {selectedMember && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
            onClick={() => setSelectedMember(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl max-w-2xl w-full max-h-[85vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="relative h-64 bg-gradient-to-r from-blue-500 to-indigo-600">
                <div className="absolute inset-0 bg-black/20"></div>
                <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/60 to-transparent">
                  <h3 className="text-white text-2xl font-bold">{selectedMember.name}</h3>
                  <p className="text-white/90 text-lg">{selectedMember.role}</p>
                </div>
                <button
                  onClick={() => setSelectedMember(null)}
                  className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors"
                >
                  <i className="fas fa-times text-white text-lg"></i>
                </button>
              </div>
              
              <div className="p-6">
                <div className="mb-6">
                  <h4 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-2">Credentials</h4>
                  <p className="text-slate-700">{selectedMember.title}</p>
                </div>
                
                <div className="mb-6">
                  <h4 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-2">About</h4>
                  <p className="text-slate-600 leading-relaxed">{selectedMember.description}</p>
                </div>
                
                {selectedMember.social && (
                  <div>
                    <h4 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3">Connect</h4>
                    <div className="flex space-x-4">
                      {selectedMember.social.email && (
                        <a
                          href={`mailto:${selectedMember.social.email}`}
                          className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center hover:bg-blue-200 transition-colors"
                        >
                          <i className="fas fa-envelope"></i>
                        </a>
                      )}
                      {selectedMember.social.linkedin && (
                        <a
                          href={selectedMember.social.linkedin}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center hover:bg-blue-200 transition-colors"
                        >
                          <i className="fab fa-linkedin-in"></i>
                        </a>
                      )}
                      {selectedMember.social.twitter && (
                        <a
                          href={selectedMember.social.twitter}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center hover:bg-blue-200 transition-colors"
                        >
                          <i className="fab fa-twitter"></i>
                        </a>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Footer */}
      <footer className="bg-gradient-to-br from-slate-800 to-slate-900 text-white py-12 md:py-16">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-8 md:gap-12 mb-8 md:mb-12">
            <div className="col-span-2 md:col-span-1">
              <div className="flex items-center space-x-3 md:space-x-4 mb-6 md:mb-8">
                <div className="w-12 h-12 md:w-14 md:h-14 rounded-xl overflow-hidden shadow-md bg-white flex items-center justify-center">
                  <Image src="/uploads/acelogo.png" alt="Acemedix Academy Logo" width={56} height={56} className="object-contain" />
                </div>
                <div>
                  <h2 className="text-xl md:text-2xl font-bold">Acemedix Academy</h2>
                  <p className="text-slate-300 text-sm md:text-base">Medical Education Platform</p>
                </div>
              </div>
              <p className="text-slate-300 text-base md:text-lg">Revolutionizing medical education through AI-powered learning and assessment.</p>
            </div>
           
            <div>
              <h3 className="text-lg md:text-xl font-bold mb-4 md:mb-6">Quick Links</h3>
              <ul className="space-y-2 md:space-y-4">
                <li><Link href="/" className="text-slate-300 hover:text-white transition-colors text-base md:text-lg">Home</Link></li>
                <li><Link href="/team" className="text-white transition-colors text-base md:text-lg">Our Team</Link></li>
                <li><Link href="/testimonials" className="text-slate-300 hover:text-white transition-colors text-base md:text-lg">Testimonials</Link></li>
                <li><Link href="/#contact" className="text-slate-300 hover:text-white transition-colors text-base md:text-lg">Contact</Link></li>
              </ul>
            </div>
           
            <div>
              <h3 className="text-lg md:text-xl font-bold mb-4 md:mb-6">Connect With Us</h3>
              <div className="flex space-x-3 md:space-x-4 mb-6 md:mb-8">
                <a href="#" className="w-10 h-10 md:w-14 md:h-14 bg-slate-700 rounded-xl flex items-center justify-center hover:bg-blue-600 transition-colors shadow-md"><i className="fab fa-facebook-f text-sm md:text-lg"></i></a>
                <a href="#" className="w-10 h-10 md:w-14 md:h-14 bg-slate-700 rounded-xl flex items-center justify-center hover:bg-blue-400 transition-colors shadow-md"><i className="fab fa-twitter text-sm md:text-lg"></i></a>
                <a href="#" className="w-10 h-10 md:w-14 md:h-14 bg-slate-700 rounded-xl flex items-center justify-center hover:bg-blue-600 transition-colors shadow-md"><i className="fab fa-linkedin-in text-sm md:text-lg"></i></a>
                <a href="#" className="w-10 h-10 md:w-14 md:h-14 bg-slate-700 rounded-xl flex items-center justify-center hover:bg-green-500 transition-colors shadow-md"><i className="fab fa-whatsapp text-sm md:text-lg"></i></a>
              </div>
            </div>
           
            <div className="col-span-2 md:col-span-1 lg:col-span-1">
              <h3 className="text-lg md:text-xl font-bold mb-4 md:mb-6">Newsletter</h3>
              <p className="text-slate-300 text-sm mb-4">Get the latest updates and medical education tips</p>
              <div className="flex">
                <input type="email" placeholder="Your email" className="flex-1 px-4 py-2 rounded-l-lg bg-slate-700 text-white placeholder-slate-400 border-none focus:outline-none focus:ring-2 focus:ring-blue-500" />
                <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-r-lg transition-colors"><i className="fas fa-paper-plane"></i></button>
              </div>
              <div className="mt-6 text-slate-400 text-sm">© {new Date().getFullYear()} Acemedix Academy. All rights reserved.</div>
            </div>
          </div>
         
          <div className="border-t border-slate-700 pt-8 md:pt-12 text-center text-slate-400 text-base md:text-lg">
            <p>MDCN is a registered trademark of the Medical and Dental Council of Nigeria.</p>
            <p className="mt-2 md:mt-4">Acemedix Academy is not affiliated with MDCN but provides preparatory materials.</p>
          </div>
        </div>
      </footer>

      {/* Font Awesome */}
      <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css" />

      <style jsx global>{`
        .line-clamp-2 {
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
        .line-clamp-3 {
          display: -webkit-box;
          -webkit-line-clamp: 3;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
        .text-gradient-blue {
          background: linear-gradient(135deg, #2563eb, #1e40af);
          background-clip: text;
          -webkit-background-clip: text;
          color: transparent;
        }
      `}</style>
    </div>
  );
}