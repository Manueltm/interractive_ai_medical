// C:\Users\User\Desktop\Cloned\hume-voice-simulator\app\dashboard\tokens\page.tsx
'use client';
import { FC, useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import TokenBalance from "../components/TokenBalance";
import Link from "next/link";
import { cn } from "@/utils";
import { motion, AnimatePresence } from 'framer-motion';

// Only 2 navigation items needed
const navItems = [
  { 
    title: "Back to Dashboard", 
    href: "/dashboard", 
    target: "dashboard", 
    icon: "fa-arrow-left",
    color: "text-blue-400"
  },
  { 
    title: "Logout", 
    href: "/api/auth/signout", 
    target: "logout", 
    icon: "fa-sign-out-alt",
    color: "text-rose-400"
  },
];

const getIconColor = (index: number) => {
  const colors = [
    'text-blue-400',    // Back to Dashboard
    'text-rose-400',    // Logout
  ];
  return colors[index % colors.length];
};

interface TokenPackage {
  id: string;
  name: string;
  description: string;
  tokenAmount: number;
  price: number;
  currency: string;
  popular?: boolean;
}

interface Payment {
  id: string;
  amount: number;
  tokenAmount: number;
  status: string;
  reference: string;
  paystackReference: string | null;
  createdAt: string;
  tokenPrice: {
    name: string;
    description: string;
  } | null;
}

interface Transaction {
  id: string;
  type: string;
  amount: number;
  description: string;
  reference: string;
  metadata: any;
  createdAt: string;
}

type TabType = 'buy' | 'history' | 'usage';

// Filter types
interface PaymentFilter {
  status: string;
  startDate: string;
  endDate: string;
  minAmount: string;
  maxAmount: string;
  search: string;
}

interface TransactionFilter {
  type: string;
  startDate: string;
  endDate: string;
  minAmount: string;
  maxAmount: string;
  search: string;
}

const TokensPage: FC = () => {
  const { data: session } = useSession();
  const router = useRouter();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isEdgeHovering, setIsEdgeHovering] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('buy');
  const [packages, setPackages] = useState<TokenPackage[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const [showLoadingPopup, setShowLoadingPopup] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState("");
  
  // Pagination states
  const [paymentCurrentPage, setPaymentCurrentPage] = useState(1);
  const [transactionCurrentPage, setTransactionCurrentPage] = useState(1);
  const [paymentTotalPages, setPaymentTotalPages] = useState(1);
  const [transactionTotalPages, setTransactionTotalPages] = useState(1);
  const [paymentTotalItems, setPaymentTotalItems] = useState(0);
  const [transactionTotalItems, setTransactionTotalItems] = useState(0);
  const itemsPerPage = 10;
  
  // Filter states
  const [paymentFilter, setPaymentFilter] = useState<PaymentFilter>({
    status: 'all',
    startDate: '',
    endDate: '',
    minAmount: '',
    maxAmount: '',
    search: ''
  });
  
  const [transactionFilter, setTransactionFilter] = useState<TransactionFilter>({
    type: 'all',
    startDate: '',
    endDate: '',
    minAmount: '',
    maxAmount: '',
    search: ''
  });
  
  const [showPaymentFilters, setShowPaymentFilters] = useState(false);
  const [showTransactionFilters, setShowTransactionFilters] = useState(false);

  // Slider states for mobile
  const [currentPackageIndex, setCurrentPackageIndex] = useState(0);
  const [currentInfoIndex, setCurrentInfoIndex] = useState(0);
  const packagesContainerRef = useRef<HTMLDivElement>(null);
  const infoContainerRef = useRef<HTMLDivElement>(null);

  // Mobile menu state
  const [isMobileTrayOpen, setIsMobileTrayOpen] = useState(false);

  // Sidebar edge hover
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (e.clientX <= 20 && !isSidebarOpen) {
        setIsEdgeHovering(true);
      } else if (e.clientX > 250 && isEdgeHovering) {
        setIsEdgeHovering(false);
      }
    };

    const handleMouseLeave = () => setIsEdgeHovering(false);

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, [isSidebarOpen, isEdgeHovering]);

  useEffect(() => {
    if (isEdgeHovering && !isSidebarOpen) {
      setIsSidebarOpen(true);
      setIsEdgeHovering(false);
    }
  }, [isEdgeHovering, isSidebarOpen]);

  // Desktop auto-open
  useEffect(() => {
    const mql = window.matchMedia('(min-width: 768px)');
    setIsSidebarOpen(mql.matches);
    const listener = (e: MediaQueryListEvent) => setIsSidebarOpen(e.matches);
    mql.addEventListener('change', listener);
    return () => mql.removeEventListener('change', listener);
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute('data-sidebar-open', String(isSidebarOpen));
  }, [isSidebarOpen]);

  useEffect(() => {
    fetchPackages();
    if (activeTab === 'history') fetchPayments();
    if (activeTab === 'usage') fetchTransactions();
  }, [activeTab, paymentCurrentPage, transactionCurrentPage]);

  // Payment verification
  useEffect(() => {
    const verifyPayment = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const reference = urlParams.get('reference');
      const success = urlParams.get('success');

      if (reference && success) {
        setProcessing('verifying');
        setShowLoadingPopup(true);
        setLoadingMessage('Verifying your payment...');

        try {
          const res = await fetch(`/api/payments/verify?reference=${reference}`);
          const data = await res.json();

          if (res.ok && data.status === 'completed') {
            toast.success(`Payment successful! ${data.tokenAmount} tokens added.`);
            window.dispatchEvent(new Event('refreshTokenBalance'));
            window.history.replaceState({}, '', '/dashboard/tokens');
          } else {
            toast.error(data.error || 'Payment verification failed');
          }
        } catch (error) {
          toast.error('Error verifying payment');
        } finally {
          setProcessing(null);
          setShowLoadingPopup(false);
        }
      }
    };

    if (session?.user?.id) {
      verifyPayment();
    }
  }, [session]);

  const fetchPackages = async () => {
    try {
      setLoading(true);
      setShowLoadingPopup(true);
      setLoadingMessage('Loading token packages...');
      const res = await fetch('/api/tokens/packages');
      if (res.ok) {
        const data = await res.json();
        const enhanced = data.packages.map((pkg: TokenPackage, i: number) => ({
          ...pkg,
          popular: i === 1 || i === 2
        }));
        setPackages(enhanced);
      } else {
        toast.error('Failed to load packages');
      }
    } catch {
      toast.error('Failed to load packages');
    } finally {
      setLoading(false);
      setShowLoadingPopup(false);
    }
  };

  const fetchPayments = async () => {
    try {
      setLoading(true);
      setShowLoadingPopup(true);
      setLoadingMessage('Loading payment history...');
      
      const params = new URLSearchParams({
        page: paymentCurrentPage.toString(),
        limit: itemsPerPage.toString(),
        ...(paymentFilter.status !== 'all' && { status: paymentFilter.status }),
        ...(paymentFilter.startDate && { startDate: paymentFilter.startDate }),
        ...(paymentFilter.endDate && { endDate: paymentFilter.endDate }),
        ...(paymentFilter.minAmount && { minAmount: paymentFilter.minAmount }),
        ...(paymentFilter.maxAmount && { maxAmount: paymentFilter.maxAmount }),
        ...(paymentFilter.search && { search: paymentFilter.search })
      });
      
      const res = await fetch(`/api/tokens/payments?${params}`);
      if (res.ok) {
        const data = await res.json();
        setPayments(data.payments);
        setPaymentTotalPages(data.totalPages);
        setPaymentTotalItems(data.total);
      }
    } catch {
      toast.error('Failed to load payment history');
    } finally {
      setLoading(false);
      setShowLoadingPopup(false);
    }
  };

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      setShowLoadingPopup(true);
      setLoadingMessage('Loading usage history...');
      
      const params = new URLSearchParams({
        page: transactionCurrentPage.toString(),
        limit: itemsPerPage.toString(),
        ...(transactionFilter.type !== 'all' && { type: transactionFilter.type }),
        ...(transactionFilter.startDate && { startDate: transactionFilter.startDate }),
        ...(transactionFilter.endDate && { endDate: transactionFilter.endDate }),
        ...(transactionFilter.minAmount && { minAmount: transactionFilter.minAmount }),
        ...(transactionFilter.maxAmount && { maxAmount: transactionFilter.maxAmount }),
        ...(transactionFilter.search && { search: transactionFilter.search })
      });
      
      const res = await fetch(`/api/tokens/transactions?${params}`);
      if (res.ok) {
        const data = await res.json();
        setTransactions(data.transactions);
        setTransactionTotalPages(data.totalPages);
        setTransactionTotalItems(data.total);
      }
    } catch {
      toast.error('Failed to load usage history');
    } finally {
      setLoading(false);
      setShowLoadingPopup(false);
    }
  };

  const handlePurchase = async (tokenPriceId: string) => {
    const pkgName = packages.find(p => p.id === tokenPriceId)?.name || 'Package';
    setProcessing(tokenPriceId);
    setShowLoadingPopup(true);
    setLoadingMessage('Processing payment...');

    try {
      const res = await fetch('/api/payments/initialize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tokenPriceId }),
      });

      const data = await res.json();
      if (res.ok) {
        window.location.href = data.authorizationUrl;
      } else {
        toast.error(data.error || 'Failed to initialize payment');
        setShowLoadingPopup(false);
      }
    } catch {
      toast.error('Failed to initialize payment');
      setShowLoadingPopup(false);
    } finally {
      setProcessing(null);
    }
  };

  const formatPrice = (price: number) => {
    return `₦${(price / 100).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`;
  };

  const formatDate = (dateString: string) => new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
  });

  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed': return 'bg-gradient-to-r from-emerald-100 to-green-100 text-emerald-800 border-emerald-300';
      case 'pending': return 'bg-gradient-to-r from-amber-100 to-yellow-100 text-amber-800 border-amber-300';
      case 'failed': return 'bg-gradient-to-r from-rose-100 to-red-100 text-rose-800 border-rose-300';
      default: return 'bg-gradient-to-r from-slate-100 to-gray-100 text-slate-800 border-slate-300';
    }
  };

  const getAmountColor = (amount: number) => amount < 0
    ? 'text-rose-600 bg-gradient-to-r from-rose-50/50 to-red-50/50 border-rose-200'
    : 'text-emerald-600 bg-gradient-to-r from-emerald-50/50 to-green-50/50 border-emerald-200';

  const getTransactionIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case 'purchase': return 'fas fa-shopping-cart text-blue-500';
      case 'usage': return 'fas fa-play-circle text-purple-500';
      case 'refund': return 'fas fa-undo text-amber-500';
      default: return 'fas fa-exchange-alt text-slate-500';
    }
  };

  // Pagination functions
  const handlePaymentPageChange = (page: number) => {
    setPaymentCurrentPage(page);
  };

  const handleTransactionPageChange = (page: number) => {
    setTransactionCurrentPage(page);
  };

  // Filter functions
  const handlePaymentFilterChange = (key: keyof PaymentFilter, value: string) => {
    setPaymentFilter(prev => ({ ...prev, [key]: value }));
  };

  const handleTransactionFilterChange = (key: keyof TransactionFilter, value: string) => {
    setTransactionFilter(prev => ({ ...prev, [key]: value }));
  };

  const applyPaymentFilters = () => {
    setPaymentCurrentPage(1);
    fetchPayments();
    setShowPaymentFilters(false);
  };

  const applyTransactionFilters = () => {
    setTransactionCurrentPage(1);
    fetchTransactions();
    setShowTransactionFilters(false);
  };

  const clearPaymentFilters = () => {
    setPaymentFilter({
      status: 'all',
      startDate: '',
      endDate: '',
      minAmount: '',
      maxAmount: '',
      search: ''
    });
    setPaymentCurrentPage(1);
    fetchPayments();
    setShowPaymentFilters(false);
  };

  const clearTransactionFilters = () => {
    setTransactionFilter({
      type: 'all',
      startDate: '',
      endDate: '',
      minAmount: '',
      maxAmount: '',
      search: ''
    });
    setTransactionCurrentPage(1);
    fetchTransactions();
    setShowTransactionFilters(false);
  };

  // Package slider functions for mobile
  const nextPackage = () => {
    if (currentPackageIndex < packages.length - 1) {
      setCurrentPackageIndex(prev => prev + 1);
      if (packagesContainerRef.current) {
        packagesContainerRef.current.scrollLeft += packagesContainerRef.current.clientWidth;
      }
    }
  };

  const prevPackage = () => {
    if (currentPackageIndex > 0) {
      setCurrentPackageIndex(prev => prev - 1);
      if (packagesContainerRef.current) {
        packagesContainerRef.current.scrollLeft -= packagesContainerRef.current.clientWidth;
      }
    }
  };

  // Info slider functions for mobile
  const nextInfo = () => {
    if (currentInfoIndex < 2) {
      setCurrentInfoIndex(prev => prev + 1);
    } else {
      setCurrentInfoIndex(0);
    }
  };

  const prevInfo = () => {
    if (currentInfoIndex > 0) {
      setCurrentInfoIndex(prev => prev - 1);
    } else {
      setCurrentInfoIndex(2);
    }
  };

  const infoItems = [
    {
      icon: 'fas fa-shopping-cart',
      title: 'Purchase Tokens',
      desc: 'Buy token packages using secure payment methods',
      gradient: 'from-blue-500 to-indigo-600'
    },
    {
      icon: 'fas fa-bolt',
      title: 'Use Tokens',
      desc: 'Tokens are automatically deducted for premium features',
      gradient: 'from-purple-500 to-pink-600'
    },
    {
      icon: 'fas fa-chart-line',
      title: 'Track Usage',
      desc: 'Monitor your token balance and usage history',
      gradient: 'from-emerald-500 to-green-600'
    }
  ];

  // Generate pagination range
  const getPaginationRange = (currentPage: number, totalPages: number) => {
    const delta = 2;
    const range = [];
    const rangeWithDots = [];
    let l;

    for (let i = 1; i <= totalPages; i++) {
      if (i === 1 || i === totalPages || (i >= currentPage - delta && i <= currentPage + delta)) {
        range.push(i);
      }
    }

    for (let i of range) {
      if (l) {
        if (i - l === 2) {
          rangeWithDots.push(l + 1);
        } else if (i - l !== 1) {
          rangeWithDots.push('...');
        }
      }
      rangeWithDots.push(i);
      l = i;
    }

    return rangeWithDots;
  };

  // Handle navigation clicks
  const handleNavClick = (href: string) => {
    if (href === '/api/auth/signout') {
      // Logout will be handled by the form
      return;
    }
    router.push(href);
    setIsMobileTrayOpen(false);
  };

  return (
    <>
      <div className="flex min-h-screen bg-background">
        {/* SIDEBAR - SIMPLIFIED WITH ONLY 2 OPTIONS */}
        <aside className={cn(
          "fixed md:sticky top-0 h-screen z-50 shadow-lg overflow-y-auto transition-all duration-300 ease-in-out",
          isSidebarOpen ? "w-64" : "w-0 md:w-0",
          "bg-gradient-to-b from-slate-800 via-blue-900 to-indigo-900 flex flex-col"
        )}>
          <div className="p-6 border-b border-blue-700 flex items-center justify-between flex-shrink-0">
            <Link href="/dashboard" className="text-xl font-bold text-white hover:text-blue-200 transition-colors">
              <img src="/logo.png" alt="Acemedix Academy" className="h-8" />
            </Link>
            <button className="md:hidden text-white hover:text-blue-200" onClick={() => setIsSidebarOpen(false)}>
              <i className="fas fa-times" />
            </button>
            <button className="hidden md:block text-white hover:text-blue-200" onClick={() => setIsSidebarOpen(!isSidebarOpen)}>
              <i className={`fas fa-${isSidebarOpen ? 'chevron-left' : 'chevron-right'}`} />
            </button>
          </div>

          <nav className="flex-1 overflow-y-auto px-4 py-6 space-y-2">
            {navItems.map((item, index) => (
              <div key={item.title} className="border-b border-blue-700/50 last:border-b-0">
                {item.href === '/api/auth/signout' ? (
                  <form action={item.href} method="post" className="w-full">
                    <button
                      type="submit"
                      className={cn(
                        "block w-full text-left rounded-xl px-4 py-3 text-white hover:bg-blue-700/30 flex items-center group"
                      )}
                    >
                      <i className={`fas ${item.icon} mr-3 text-lg ${getIconColor(index)} group-hover:scale-110 transition-transform`} />
                      {item.title}
                    </button>
                  </form>
                ) : (
                  <button
                    onClick={() => handleNavClick(item.href!)}
                    className={cn(
                      "block w-full text-left rounded-xl px-4 py-3 text-white hover:bg-blue-700/30 flex items-center group"
                    )}
                  >
                    <i className={`fas ${item.icon} mr-3 text-lg ${getIconColor(index)} group-hover:scale-110 transition-transform`} />
                    {item.title}
                  </button>
                )}
              </div>
            ))}
          </nav>
        </aside>

        {/* MAIN CONTENT */}
        <main className="flex-1 flex flex-col min-h-screen overflow-y-auto w-full">
          {/* Top Bar */}
          <header className="flex items-center justify-between bg-white shadow-sm px-4 md:px-6 py-4 border-b border-blue-50 dark:bg-gray-900 dark:border-gray-800">
            <div className="flex items-center space-x-2 md:space-x-4">
              <button
                className="text-foreground hover:text-primary p-2 rounded-lg hover:bg-primary/10"
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              >
                <i className="fas fa-bars text-lg"></i>
              </button>
              <h2 className="text-lg md:text-xl font-semibold">Token Management</h2>
            </div>
            <div className="flex items-center space-x-2 md:space-x-4">
              <div className="hidden sm:block">
                <TokenBalance />
              </div>
              <img
                src={`https://ui-avatars.com/api/?name= ${encodeURIComponent(session?.user?.name || session?.user?.email || 'User')}&background=3b82f6&color=ffffff`}
                alt="avatar"
                className="h-8 w-8 rounded-full border-2 border-primary/20"
              />
              <button
                onClick={() => document.documentElement.classList.toggle('dark')}
                className="p-2 rounded-lg hover:bg-primary/10"
              >
                <i className="fas fa-moon"></i>
              </button>
            </div>
          </header>

          {/* Mobile Token Balance */}
          <div className="sm:hidden mx-4 mt-4">
            <TokenBalance />
          </div>

          {/* Breadcrumbs */}
          <nav className="bg-gradient-to-r from-blue-50/80 to-indigo-100/60 rounded-xl p-4 mb-6 shadow-inner border border-blue-200/50 mx-4 md:mx-6 mt-4">
            <div className="flex items-center gap-2 md:gap-3 text-sm">
              <button
                onClick={() => router.push('/dashboard')}
                className="text-blue-600 hover:text-blue-800 font-medium flex items-center"
              >
                <i className="fas fa-home mr-1 md:mr-2"></i>
                <span className="hidden sm:inline">Dashboard</span>
              </button>
              <i className="fas fa-chevron-right text-blue-600/60 text-xs"></i>
              <span className="text-blue-800 font-semibold flex items-center">
                <i className="fas fa-coins mr-1 md:mr-2"></i>
                Tokens
              </span>
            </div>
          </nav>

          {/* Page Content */}
          <div className="flex-1 p-4 md:p-6 overflow-y-auto bg-card/95 pb-20">
            {/* Header Section */}
            <div className="bg-gradient-to-br from-white/95 to-blue-50/95 rounded-2xl shadow-lg p-6 md:p-8 border border-blue-300 backdrop-blur-sm mb-8">
              <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
                <div className="flex-1">
                  <h2 className="text-2xl md:text-3xl font-bold flex items-center justify-center lg:justify-start text-slate-800">
                    <i className="fas fa-coins mr-3 md:mr-4 text-amber-500"></i>
                    Token Management
                  </h2>
                  <p className="text-slate-600 mt-2 md:mt-3 text-base md:text-lg text-center lg:text-left">
                    Purchase tokens to unlock premium CBT features and exams
                  </p>
                </div>
                <div className="bg-gradient-to-r from-emerald-500 to-green-600 rounded-2xl p-5 md:p-6 shadow-lg w-full lg:w-auto">
                  <div className="text-center">
                    <div className="text-sm text-emerald-100 mb-2 flex items-center justify-center">
                      <i className="fas fa-wallet mr-2"></i>
                      Current Balance
                    </div>
                    <div className="text-2xl md:text-3xl font-bold text-white">
                      <TokenBalance compact={false} />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Tabs Section */}
            <div className="w-full mb-8">
              <div className="flex border-b border-slate-300 overflow-x-auto">
                {(['buy', 'history', 'usage'] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={cn(
                      "flex-1 min-w-[120px] px-4 md:px-6 py-3 md:py-4 text-sm md:text-base font-bold transition-all duration-300 flex items-center justify-center border-b-2",
                      activeTab === tab
                        ? 'border-blue-500 text-blue-600 bg-blue-50/50'
                        : 'border-transparent text-slate-600 hover:text-blue-500 hover:bg-slate-50/50'
                    )}
                  >
                    <i className={`fas fa-${tab === 'buy' ? 'shopping-cart' : tab === 'history' ? 'history' : 'chart-line'} mr-2 md:mr-3`}></i>
                    {tab === 'buy' ? 'Buy Tokens' : tab === 'history' ? 'Payment History' : 'Usage History'}
                  </button>
                ))}
              </div>
            </div>

            {/* Main Tab Content */}
            <div className="bg-gradient-to-br from-white/95 to-blue-50/95 rounded-2xl shadow-lg p-5 md:p-8 border border-blue-300 backdrop-blur-sm">
              {/* BUY TAB */}
              {activeTab === 'buy' && (
                <div className="w-full">
                  {/* Title - Centered */}
                  <div className="text-center mb-8 md:mb-12">
                    <h3 className="text-xl md:text-2xl lg:text-3xl font-bold text-slate-800 mb-4 flex items-center justify-center">
                      <i className="fas fa-gem mr-3 md:mr-4 text-purple-500"></i>
                      Available Token Packages
                    </h3>
                    <p className="text-slate-600 text-base md:text-lg max-w-2xl mx-auto">
                      Choose the perfect package for your learning needs. All packages include instant delivery.
                    </p>
                  </div>

                  {/* Processing Indicator - Centered */}
                  {processing === 'verifying' && (
                    <div className="flex justify-center mb-8">
                      <div className="px-4 md:px-6 py-2 md:py-3 bg-gradient-to-r from-blue-100/80 to-indigo-100/80 rounded-xl border border-blue-300 inline-flex items-center">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2 md:mr-3"></div>
                        <span className="text-blue-700 font-semibold text-sm md:text-base">Verifying payment...</span>
                      </div>
                    </div>
                  )}

                  {/* Packages Container */}
                  {packages.length === 0 ? (
                    <div className="text-center py-12 md:py-16 bg-gradient-to-br from-slate-50/80 to-blue-50/80 rounded-2xl border-2 border-dashed border-slate-400 backdrop-blur-sm max-w-2xl mx-auto">
                      <i className="fas fa-coins text-4xl md:text-5xl text-slate-400 mb-4 md:mb-6"></i>
                      <p className="text-slate-500 text-lg md:text-xl mb-3 md:mb-4 font-semibold">No token packages available</p>
                      <p className="text-slate-400 text-base md:text-lg">Please check back later.</p>
                    </div>
                  ) : (
                    <>
                      {/* Desktop View - Grid Layout */}
                      <div className="hidden md:flex flex-col items-center">
                        <div className="flex flex-wrap justify-center gap-6 md:gap-8 lg:gap-10 w-full max-w-7xl mx-auto">
                          {packages.map((pkg) => (
                            <div
                              key={pkg.id}
                              className={cn(
                                "relative border-2 rounded-2xl p-6 md:p-8 transition-all duration-300 hover:shadow-2xl hover:scale-105 backdrop-blur-sm w-full",
                                "max-w-sm md:max-w-md lg:max-w-sm xl:max-w-md",
                                pkg.popular
                                  ? 'border-purple-500 bg-gradient-to-br from-purple-50/80 to-pink-50/80 shadow-xl transform -translate-y-2'
                                  : 'border-slate-300 bg-gradient-to-br from-white/80 to-blue-50/80 hover:border-blue-400'
                              )}
                              style={{
                                flex: '0 1 auto',
                              }}
                            >
                              {pkg.popular && (
                                <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-10">
                                  <span className="bg-gradient-to-r from-purple-500 to-pink-600 text-white px-4 py-2 rounded-full text-sm font-bold shadow-lg whitespace-nowrap">
                                    <i className="fas fa-crown mr-2"></i>
                                    MOST POPULAR
                                  </span>
                                </div>
                              )}

                              <div className="text-center w-full">
                                {/* Token Amount - Centered */}
                                <div className="mb-6 md:mb-8">
                                  <div className="text-3xl md:text-4xl font-bold text-slate-800 mb-2 flex items-center justify-center">
                                    <i className="fas fa-coins text-amber-500 mr-3"></i>
                                    {pkg.tokenAmount.toLocaleString()}
                                    <span className="text-lg md:text-xl text-slate-600 ml-2">tokens</span>
                                  </div>
                                  
                                  <h3 className="text-lg md:text-xl font-bold text-slate-800 mb-3">{pkg.name}</h3>
                                  <p className="text-slate-600 mb-4 md:mb-6 text-sm md:text-base px-2 md:px-4">{pkg.description}</p>
                                </div>
                                
                                {/* Price - Centered */}
                                <div className="mb-6 md:mb-8 bg-gradient-to-br from-slate-50 to-blue-50/50 rounded-2xl p-4 md:p-6 mx-2">
                                  <div className="text-2xl md:text-3xl lg:text-4xl font-bold text-slate-800 mb-1 flex items-center justify-center">
                                    <i className="fas fa-tag mr-3 text-blue-500"></i>
                                    {formatPrice(pkg.price)}
                                  </div>
                                  <div className="text-sm text-slate-500 flex items-center justify-center mt-2">
                                    <i className="fas fa-calculator mr-2"></i>
                                    ≈ ₦{Math.round(pkg.price / pkg.tokenAmount / 100)} per token
                                  </div>
                                </div>

                                {/* Purchase Button - Centered */}
                                <div className="mb-6 md:mb-8 px-2">
                                  <button
                                    onClick={() => handlePurchase(pkg.id)}
                                    disabled={processing === pkg.id || processing === 'verifying'}
                                    className={cn(
                                      "w-full py-3 md:py-4 px-4 md:px-6 rounded-xl font-bold transition-all duration-300 flex items-center justify-center shadow-lg hover:shadow-xl transform hover:scale-105",
                                      pkg.popular
                                        ? 'bg-gradient-to-r from-purple-500 to-pink-600 text-white hover:from-purple-600 hover:to-pink-700'
                                        : 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white hover:from-blue-600 hover:to-indigo-700',
                                      processing === pkg.id && 'opacity-80 cursor-not-allowed'
                                    )}
                                  >
                                    {processing === pkg.id ? (
                                      <>
                                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3"></div>
                                        Processing...
                                      </>
                                    ) : (
                                      <>
                                        <i className="fas fa-bolt mr-3"></i>
                                        Purchase Now
                                      </>
                                    )}
                                  </button>
                                </div>

                                {/* Features - Centered */}
                                <div className="mt-6 pt-6 border-t border-slate-300/50 space-y-3 md:space-y-4">
                                  <div className="text-sm md:text-base text-slate-600 flex items-center justify-center">
                                    <i className="fas fa-bolt text-amber-500 mr-2 md:mr-3 text-lg"></i>
                                    <span>Instant delivery</span>
                                  </div>
                                  <div className="text-sm md:text-base text-slate-600 flex items-center justify-center">
                                    <i className="fas fa-shield-alt text-emerald-500 mr-2 md:mr-3 text-lg"></i>
                                    <span>Secure payment</span>
                                  </div>
                                  <div className="text-sm md:text-base text-slate-600 flex items-center justify-center">
                                    <i className="fas fa-unlock text-blue-500 mr-2 md:mr-3 text-lg"></i>
                                    <span>Access all premium features</span>
                                  </div>
                                  <div className="text-sm md:text-base text-slate-600 flex items-center justify-center">
                                    <i className="fas fa-headset text-indigo-500 mr-2 md:mr-3 text-lg"></i>
                                    <span>24/7 customer support</span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                        
                        {/* Package Count Indicator - Centered */}
                        <div className="mt-8 md:mt-12 text-center">
                          <div className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-slate-100/80 to-blue-100/80 rounded-xl border border-slate-300">
                            <i className="fas fa-boxes mr-2 text-blue-500"></i>
                            <span className="text-slate-700 font-semibold">
                              {packages.length} package{packages.length !== 1 ? 's' : ''} available
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Mobile View - Slider Layout */}
                      <div className="md:hidden">
                        <div className="relative">
                          {/* Slider Container */}
                          <div 
                            ref={packagesContainerRef}
                            className="flex overflow-x-auto snap-x snap-mandatory scrollbar-hide scroll-smooth"
                            style={{ scrollBehavior: 'smooth' }}
                          >
                            {packages.map((pkg, index) => (
                              <div
                                key={pkg.id}
                                className={cn(
                                  "relative border-2 rounded-2xl p-6 transition-all duration-300 backdrop-blur-sm w-full flex-shrink-0 snap-center",
                                  pkg.popular
                                    ? 'border-purple-500 bg-gradient-to-br from-purple-50/80 to-pink-50/80 shadow-xl'
                                    : 'border-slate-300 bg-gradient-to-br from-white/80 to-blue-50/80'
                                )}
                              >
                                {pkg.popular && (
                                  <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-10">
                                    <span className="bg-gradient-to-r from-purple-500 to-pink-600 text-white px-4 py-2 rounded-full text-sm font-bold shadow-lg whitespace-nowrap">
                                      <i className="fas fa-crown mr-2"></i>
                                      MOST POPULAR
                                    </span>
                                  </div>
                                )}

                                <div className="text-center w-full">
                                  {/* Token Amount - Centered */}
                                  <div className="mb-6">
                                    <div className="text-3xl font-bold text-slate-800 mb-2 flex items-center justify-center">
                                      <i className="fas fa-coins text-amber-500 mr-3"></i>
                                      {pkg.tokenAmount.toLocaleString()}
                                      <span className="text-lg text-slate-600 ml-2">tokens</span>
                                    </div>
                                    
                                    <h3 className="text-lg font-bold text-slate-800 mb-3">{pkg.name}</h3>
                                    <p className="text-slate-600 mb-4 text-sm px-2">{pkg.description}</p>
                                  </div>
                                  
                                  {/* Price - Centered */}
                                  <div className="mb-6 bg-gradient-to-br from-slate-50 to-blue-50/50 rounded-2xl p-4 mx-2">
                                    <div className="text-2xl font-bold text-slate-800 mb-1 flex items-center justify-center">
                                      <i className="fas fa-tag mr-3 text-blue-500"></i>
                                      {formatPrice(pkg.price)}
                                    </div>
                                    <div className="text-sm text-slate-500 flex items-center justify-center mt-2">
                                      <i className="fas fa-calculator mr-2"></i>
                                      ≈ ₦{Math.round(pkg.price / pkg.tokenAmount / 100)} per token
                                    </div>
                                  </div>

                                  {/* Purchase Button - Centered */}
                                  <div className="mb-6 px-2">
                                    <button
                                      onClick={() => handlePurchase(pkg.id)}
                                      disabled={processing === pkg.id || processing === 'verifying'}
                                      className={cn(
                                        "w-full py-3 px-4 rounded-xl font-bold transition-all duration-300 flex items-center justify-center shadow-lg",
                                        pkg.popular
                                          ? 'bg-gradient-to-r from-purple-500 to-pink-600 text-white'
                                          : 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white',
                                        processing === pkg.id && 'opacity-80 cursor-not-allowed'
                                      )}
                                    >
                                      {processing === pkg.id ? (
                                        <>
                                          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3"></div>
                                          Processing...
                                        </>
                                      ) : (
                                        <>
                                          <i className="fas fa-bolt mr-3"></i>
                                          Purchase Now
                                        </>
                                      )}
                                    </button>
                                  </div>

                                  {/* Features - Centered */}
                                  <div className="mt-6 pt-6 border-t border-slate-300/50 space-y-3">
                                    <div className="text-sm text-slate-600 flex items-center justify-center">
                                      <i className="fas fa-bolt text-amber-500 mr-2 text-lg"></i>
                                      <span>Instant delivery</span>
                                    </div>
                                    <div className="text-sm text-slate-600 flex items-center justify-center">
                                      <i className="fas fa-shield-alt text-emerald-500 mr-2 text-lg"></i>
                                      <span>Secure payment</span>
                                    </div>
                                    <div className="text-sm text-slate-600 flex items-center justify-center">
                                      <i className="fas fa-unlock text-blue-500 mr-2 text-lg"></i>
                                      <span>Access all premium features</span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>

                          {/* Slider Navigation Buttons */}
                          {packages.length > 1 && (
                            <>
                              <button
                                onClick={prevPackage}
                                disabled={currentPackageIndex === 0}
                                className="absolute left-2 top-1/2 transform -translate-y-1/2 bg-white/80 backdrop-blur-sm border border-slate-300 rounded-full w-10 h-10 flex items-center justify-center shadow-lg disabled:opacity-50 disabled:cursor-not-allowed z-10"
                              >
                                <i className="fas fa-chevron-left text-slate-700"></i>
                              </button>
                              <button
                                onClick={nextPackage}
                                disabled={currentPackageIndex === packages.length - 1}
                                className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-white/80 backdrop-blur-sm border border-slate-300 rounded-full w-10 h-10 flex items-center justify-center shadow-lg disabled:opacity-50 disabled:cursor-not-allowed z-10"
                              >
                                <i className="fas fa-chevron-right text-slate-700"></i>
                              </button>
                            </>
                          )}

                          {/* Slider Dots Indicator */}
                          {packages.length > 1 && (
                            <div className="flex justify-center space-x-2 mt-6">
                              {packages.map((_, index) => (
                                <button
                                  key={index}
                                  onClick={() => {
                                    setCurrentPackageIndex(index);
                                    if (packagesContainerRef.current) {
                                      packagesContainerRef.current.scrollLeft = index * packagesContainerRef.current.clientWidth;
                                    }
                                  }}
                                  className={`w-2 h-2 rounded-full transition-all duration-300 ${
                                    currentPackageIndex === index 
                                      ? 'bg-blue-500 w-4' 
                                      : 'bg-slate-300'
                                  }`}
                                  aria-label={`Go to package ${index + 1}`}
                                />
                              ))}
                            </div>
                          )}

                          {/* Package Count Indicator */}
                          <div className="mt-6 text-center">
                            <div className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-slate-100/80 to-blue-100/80 rounded-xl border border-slate-300">
                              <i className="fas fa-boxes mr-2 text-blue-500"></i>
                              <span className="text-slate-700 font-semibold text-sm">
                                {currentPackageIndex + 1} of {packages.length}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* PAYMENT HISTORY TAB */}
              {activeTab === 'history' && (
                <div>
                  <div className="text-center mb-6 md:mb-8">
                    <h3 className="text-xl md:text-2xl font-bold text-slate-800 mb-2 flex items-center justify-center">
                      <i className="fas fa-receipt mr-3 md:mr-4 text-green-500"></i>
                      Payment History
                    </h3>
                    <p className="text-slate-600 text-base md:text-lg">Track all your token purchases and payments</p>
                  </div>

                  {/* Filters Section */}
                  <div className="mb-6">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
                      <div className="flex flex-col md:flex-row gap-3 w-full md:w-auto">
                        {/* Search Bar */}
                        <div className="relative w-full md:w-64">
                          <input
                            type="text"
                            placeholder="Search by reference or package..."
                            value={paymentFilter.search}
                            onChange={(e) => handlePaymentFilterChange('search', e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && applyPaymentFilters()}
                            className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-xl bg-white/80 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                          <i className="fas fa-search absolute left-3 top-3 text-slate-400"></i>
                        </div>

                        {/* Filter Toggle Button */}
                        <button
                          onClick={() => setShowPaymentFilters(!showPaymentFilters)}
                          className="px-4 py-2 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl font-bold hover:shadow-xl transform hover:scale-105 transition-all duration-300 flex items-center justify-center"
                        >
                          <i className="fas fa-filter mr-2"></i>
                          Filters {showPaymentFilters ? '▲' : '▼'}
                        </button>
                      </div>

                      {/* Results Count */}
                      <div className="text-sm text-slate-600 font-medium">
                        Showing {(paymentCurrentPage - 1) * itemsPerPage + 1} to {Math.min(paymentCurrentPage * itemsPerPage, paymentTotalItems)} of {paymentTotalItems} payments
                      </div>
                    </div>

                    {/* Advanced Filters (Collapsible) */}
                    {showPaymentFilters && (
                      <div className="bg-gradient-to-r from-blue-50/80 to-indigo-100/80 rounded-2xl p-4 md:p-6 mb-6 border border-blue-200/50 backdrop-blur-sm">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {/* Status Filter */}
                          <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">
                              <i className="fas fa-info-circle mr-2"></i>
                              Status
                            </label>
                            <select
                              value={paymentFilter.status}
                              onChange={(e) => handlePaymentFilterChange('status', e.target.value)}
                              className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white/80 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            >
                              <option value="all">All Status</option>
                              <option value="completed">Completed</option>
                              <option value="pending">Pending</option>
                              <option value="failed">Failed</option>
                            </select>
                          </div>

                          {/* Date Range */}
                          <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">
                              <i className="fas fa-calendar mr-2"></i>
                              Start Date
                            </label>
                            <input
                              type="date"
                              value={paymentFilter.startDate}
                              onChange={(e) => handlePaymentFilterChange('startDate', e.target.value)}
                              className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white/80 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">
                              <i className="fas fa-calendar mr-2"></i>
                              End Date
                            </label>
                            <input
                              type="date"
                              value={paymentFilter.endDate}
                              onChange={(e) => handlePaymentFilterChange('endDate', e.target.value)}
                              className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white/80 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                          </div>

                          {/* Amount Range */}
                          <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">
                              <i className="fas fa-money-bill-wave mr-2"></i>
                              Min Amount (₦)
                            </label>
                            <input
                              type="number"
                              min="0"
                              step="100"
                              value={paymentFilter.minAmount}
                              onChange={(e) => handlePaymentFilterChange('minAmount', e.target.value)}
                              placeholder="Minimum amount"
                              className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white/80 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">
                              <i className="fas fa-money-bill-wave mr-2"></i>
                              Max Amount (₦)
                            </label>
                            <input
                              type="number"
                              min="0"
                              step="100"
                              value={paymentFilter.maxAmount}
                              onChange={(e) => handlePaymentFilterChange('maxAmount', e.target.value)}
                              placeholder="Maximum amount"
                              className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white/80 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                          </div>
                        </div>

                        {/* Filter Actions */}
                        <div className="flex flex-col sm:flex-row gap-3 mt-6">
                          <button
                            onClick={applyPaymentFilters}
                            className="flex-1 px-6 py-3 bg-gradient-to-r from-emerald-500 to-green-600 text-white rounded-xl font-bold hover:shadow-xl transform hover:scale-105 transition-all duration-300 flex items-center justify-center"
                          >
                            <i className="fas fa-check mr-2"></i>
                            Apply Filters
                          </button>
                          <button
                            onClick={clearPaymentFilters}
                            className="flex-1 px-6 py-3 bg-gradient-to-r from-rose-500 to-pink-600 text-white rounded-xl font-bold hover:shadow-xl transform hover:scale-105 transition-all duration-300 flex items-center justify-center"
                          >
                            <i className="fas fa-times mr-2"></i>
                            Clear Filters
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {payments.length === 0 ? (
                    <div className="text-center py-12 md:py-16 bg-gradient-to-br from-slate-50/80 to-blue-50/80 rounded-2xl border-2 border-dashed border-slate-400 backdrop-blur-sm max-w-2xl mx-auto">
                      <i className="fas fa-file-invoice-dollar text-4xl md:text-5xl text-slate-400 mb-4 md:mb-6"></i>
                      <p className="text-slate-500 text-lg md:text-xl mb-3 md:mb-4 font-semibold">No payment history found</p>
                      <p className="text-slate-400 text-base md:text-lg">Start by purchasing your first token package!</p>
                      <button
                        onClick={() => setActiveTab('buy')}
                        className="mt-6 px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl font-bold hover:shadow-xl transform hover:scale-105 transition-all duration-300"
                      >
                        <i className="fas fa-shopping-cart mr-2"></i>
                        Browse Packages
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="overflow-x-auto rounded-2xl border border-slate-300 mb-6">
                        <div className="min-w-full">
                          <div className="bg-gradient-to-r from-slate-100/80 to-blue-100/80 rounded-t-2xl p-4 md:p-0">
                            <div className="hidden md:grid md:grid-cols-5 gap-4 py-5 px-6">
                              <div className="font-bold text-slate-700 flex items-center justify-center">
                                <i className="fas fa-calendar mr-3"></i>
                                Date & Time
                              </div>
                              <div className="font-bold text-slate-700 flex items-center justify-center">
                                <i className="fas fa-box mr-3"></i>
                                Package
                              </div>
                              <div className="font-bold text-slate-700 flex items-center justify-center">
                                <i className="fas fa-money-bill-wave mr-3"></i>
                                Amount
                              </div>
                              <div className="font-bold text-slate-700 flex items-center justify-center">
                                <i className="fas fa-coins mr-3"></i>
                                Tokens
                              </div>
                              <div className="font-bold text-slate-700 flex items-center justify-center">
                                <i className="fas fa-info-circle mr-3"></i>
                                Status
                              </div>
                            </div>
                          </div>
                          
                          <div className="divide-y divide-slate-200">
                            {payments.map((payment, index) => (
                              <div
                                key={payment.id}
                                className={`transition-all duration-300 hover:bg-gradient-to-r hover:from-blue-50/50 hover:to-indigo-50/50 p-4 md:p-0 ${
                                  index % 2 === 0 ? 'bg-gradient-to-r from-white/80 to-slate-50/80' : 'bg-gradient-to-r from-white/80 to-blue-50/80'
                                }`}
                              >
                                {/* Mobile View */}
                                <div className="md:hidden space-y-4 p-4">
                                  <div className="flex justify-between items-center">
                                    <div className="flex items-center">
                                      <i className="fas fa-calendar text-blue-500 mr-2"></i>
                                      <span className="font-semibold text-slate-800">
                                        {new Date(payment.createdAt).toLocaleDateString()}
                                      </span>
                                    </div>
                                    <span className={`px-3 py-1 rounded-xl text-xs font-semibold border ${getStatusBadge(payment.status)}`}>
                                      {payment.status.charAt(0).toUpperCase() + payment.status.slice(1)}
                                    </span>
                                  </div>
                                  
                                  <div>
                                    <div className="text-sm text-slate-600 mb-1">Package</div>
                                    <div className="font-semibold text-slate-800">
                                      {payment.tokenPrice?.name || 'Custom Package'}
                                    </div>
                                    <div className="text-xs text-slate-500 mt-1">
                                      {payment.tokenPrice?.description || 'N/A'}
                                    </div>
                                  </div>
                                  
                                  <div className="grid grid-cols-2 gap-4">
                                    <div>
                                      <div className="text-sm text-slate-600 mb-1">Amount</div>
                                      <div className="font-bold text-lg text-slate-800">
                                        {formatPrice(payment.amount)}
                                      </div>
                                    </div>
                                    <div>
                                      <div className="text-sm text-slate-600 mb-1">Tokens</div>
                                      <div className="flex items-center">
                                        <span className="font-bold text-xl text-amber-600 mr-2">
                                          {payment.tokenAmount.toLocaleString()}
                                        </span>
                                        <span className="text-slate-500 text-sm">tokens</span>
                                      </div>
                                    </div>
                                  </div>
                                  
                                  <div className="text-xs text-slate-500 font-mono truncate">
                                    <i className="fas fa-hashtag mr-1"></i>
                                    {payment.reference}
                                  </div>
                                </div>
                                
                                {/* Desktop View */}
                                <div className="hidden md:grid md:grid-cols-5 gap-4 py-5 px-6">
                                  <div className="text-center">
                                    <div className="text-slate-800 font-semibold">
                                      {new Date(payment.createdAt).toLocaleDateString()}
                                    </div>
                                    <div className="text-sm text-slate-500">
                                      {new Date(payment.createdAt).toLocaleTimeString()}
                                    </div>
                                  </div>
                                  <div className="text-center">
                                    <div className="font-semibold text-slate-800">
                                      {payment.tokenPrice?.name || 'Custom Package'}
                                    </div>
                                    <div className="text-sm text-slate-500 mt-1">
                                      {payment.tokenPrice?.description || 'N/A'}
                                    </div>
                                  </div>
                                  <div className="text-center">
                                    <div className="font-bold text-lg text-slate-800">
                                      {formatPrice(payment.amount)}
                                    </div>
                                  </div>
                                  <div className="text-center">
                                    <div className="flex items-center justify-center">
                                      <span className="font-bold text-xl text-amber-600 mr-3">
                                        {payment.tokenAmount.toLocaleString()}
                                      </span>
                                      <span className="text-slate-500 font-semibold">tokens</span>
                                    </div>
                                  </div>
                                  <div className="text-center">
                                    <span className={`px-4 py-2 rounded-xl text-sm font-semibold border backdrop-blur-sm ${getStatusBadge(payment.status)}`}>
                                      <i className="fas fa-circle mr-2 text-xs"></i>
                                      {payment.status.charAt(0).toUpperCase() + payment.status.slice(1)}
                                    </span>
                                    <div className="text-xs text-slate-500 font-mono mt-2 truncate max-w-xs mx-auto">
                                      {payment.reference}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Pagination */}
                      {paymentTotalPages > 1 && (
                        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mt-6">
                          <div className="text-sm text-slate-600">
                            Page {paymentCurrentPage} of {paymentTotalPages}
                          </div>
                          <div className="flex items-center space-x-2">
                            {/* Previous Button */}
                            <button
                              onClick={() => handlePaymentPageChange(paymentCurrentPage - 1)}
                              disabled={paymentCurrentPage === 1}
                              className={`px-4 py-2 rounded-xl font-medium flex items-center ${
                                paymentCurrentPage === 1
                                  ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                                  : 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white hover:shadow-xl transform hover:scale-105 transition-all duration-300'
                              }`}
                            >
                              <i className="fas fa-chevron-left mr-2"></i>
                              Previous
                            </button>

                            {/* Page Numbers */}
                            <div className="hidden sm:flex items-center space-x-2">
                              {getPaginationRange(paymentCurrentPage, paymentTotalPages).map((page, index) => (
                                <button
                                  key={index}
                                  onClick={() => typeof page === 'number' ? handlePaymentPageChange(page) : null}
                                  className={`w-10 h-10 flex items-center justify-center rounded-xl font-medium ${
                                    page === paymentCurrentPage
                                      ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-lg'
                                      : typeof page === 'number'
                                      ? 'bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors'
                                      : 'text-slate-400 cursor-default'
                                  }`}
                                  disabled={typeof page !== 'number'}
                                >
                                  {page}
                                </button>
                              ))}
                            </div>

                            {/* Mobile Page Indicator */}
                            <div className="sm:hidden text-sm text-slate-700 font-medium">
                              {paymentCurrentPage} / {paymentTotalPages}
                            </div>

                            {/* Next Button */}
                            <button
                              onClick={() => handlePaymentPageChange(paymentCurrentPage + 1)}
                              disabled={paymentCurrentPage === paymentTotalPages}
                              className={`px-4 py-2 rounded-xl font-medium flex items-center ${
                                paymentCurrentPage === paymentTotalPages
                                  ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                                  : 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white hover:shadow-xl transform hover:scale-105 transition-all duration-300'
                              }`}
                            >
                              Next
                              <i className="fas fa-chevron-right ml-2"></i>
                            </button>
                          </div>

                          {/* Items Per Page Selector */}
                          <div className="text-sm text-slate-600">
                            {itemsPerPage} items per page
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}

              {/* USAGE HISTORY TAB */}
              {activeTab === 'usage' && (
                <div>
                  <div className="text-center mb-6 md:mb-8">
                    <h3 className="text-xl md:text-2xl font-bold text-slate-800 mb-2 flex items-center justify-center">
                      <i className="fas fa-chart-pie mr-3 md:mr-4 text-purple-500"></i>
                      Token Usage History
                    </h3>
                    <p className="text-slate-600 text-base md:text-lg">Monitor how you're spending your tokens</p>
                  </div>

                  {/* Filters Section */}
                  <div className="mb-6">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
                      <div className="flex flex-col md:flex-row gap-3 w-full md:w-auto">
                        {/* Search Bar */}
                        <div className="relative w-full md:w-64">
                          <input
                            type="text"
                            placeholder="Search by description or reference..."
                            value={transactionFilter.search}
                            onChange={(e) => handleTransactionFilterChange('search', e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && applyTransactionFilters()}
                            className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-xl bg-white/80 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                          <i className="fas fa-search absolute left-3 top-3 text-slate-400"></i>
                        </div>

                        {/* Filter Toggle Button */}
                        <button
                          onClick={() => setShowTransactionFilters(!showTransactionFilters)}
                          className="px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-600 text-white rounded-xl font-bold hover:shadow-xl transform hover:scale-105 transition-all duration-300 flex items-center justify-center"
                        >
                          <i className="fas fa-filter mr-2"></i>
                          Filters {showTransactionFilters ? '▲' : '▼'}
                        </button>
                      </div>

                      {/* Results Count */}
                      <div className="text-sm text-slate-600 font-medium">
                        Showing {(transactionCurrentPage - 1) * itemsPerPage + 1} to {Math.min(transactionCurrentPage * itemsPerPage, transactionTotalItems)} of {transactionTotalItems} transactions
                      </div>
                    </div>

                    {/* Advanced Filters (Collapsible) */}
                    {showTransactionFilters && (
                      <div className="bg-gradient-to-r from-purple-50/80 to-pink-100/80 rounded-2xl p-4 md:p-6 mb-6 border border-purple-200/50 backdrop-blur-sm">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {/* Type Filter */}
                          <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">
                              <i className="fas fa-exchange-alt mr-2"></i>
                              Transaction Type
                            </label>
                            <select
                              value={transactionFilter.type}
                              onChange={(e) => handleTransactionFilterChange('type', e.target.value)}
                              className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white/80 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            >
                              <option value="all">All Types</option>
                              <option value="purchase">Purchase</option>
                              <option value="usage">Usage</option>
                              <option value="refund">Refund</option>
                            </select>
                          </div>

                          {/* Date Range */}
                          <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">
                              <i className="fas fa-calendar mr-2"></i>
                              Start Date
                            </label>
                            <input
                              type="date"
                              value={transactionFilter.startDate}
                              onChange={(e) => handleTransactionFilterChange('startDate', e.target.value)}
                              className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white/80 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">
                              <i className="fas fa-calendar mr-2"></i>
                              End Date
                            </label>
                            <input
                              type="date"
                              value={transactionFilter.endDate}
                              onChange={(e) => handleTransactionFilterChange('endDate', e.target.value)}
                              className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white/80 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                          </div>

                          {/* Amount Range */}
                          <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">
                              <i className="fas fa-coins mr-2"></i>
                              Min Tokens
                            </label>
                            <input
                              type="number"
                              min="0"
                              value={transactionFilter.minAmount}
                              onChange={(e) => handleTransactionFilterChange('minAmount', e.target.value)}
                              placeholder="Minimum tokens"
                              className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white/80 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">
                              <i className="fas fa-coins mr-2"></i>
                              Max Tokens
                            </label>
                            <input
                              type="number"
                              min="0"
                              value={transactionFilter.maxAmount}
                              onChange={(e) => handleTransactionFilterChange('maxAmount', e.target.value)}
                              placeholder="Maximum tokens"
                              className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white/80 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                          </div>
                        </div>

                        {/* Filter Actions */}
                        <div className="flex flex-col sm:flex-row gap-3 mt-6">
                          <button
                            onClick={applyTransactionFilters}
                            className="flex-1 px-6 py-3 bg-gradient-to-r from-emerald-500 to-green-600 text-white rounded-xl font-bold hover:shadow-xl transform hover:scale-105 transition-all duration-300 flex items-center justify-center"
                          >
                            <i className="fas fa-check mr-2"></i>
                            Apply Filters
                          </button>
                          <button
                            onClick={clearTransactionFilters}
                            className="flex-1 px-6 py-3 bg-gradient-to-r from-rose-500 to-pink-600 text-white rounded-xl font-bold hover:shadow-xl transform hover:scale-105 transition-all duration-300 flex items-center justify-center"
                          >
                            <i className="fas fa-times mr-2"></i>
                            Clear Filters
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {transactions.length === 0 ? (
                    <div className="text-center py-12 md:py-16 bg-gradient-to-br from-slate-50/80 to-blue-50/80 rounded-2xl border-2 border-dashed border-slate-400 backdrop-blur-sm max-w-2xl mx-auto">
                      <i className="fas fa-chart-line text-4xl md:text-5xl text-slate-400 mb-4 md:mb-6"></i>
                      <p className="text-slate-500 text-lg md:text-xl mb-3 md:mb-4 font-semibold">No usage history found</p>
                      <p className="text-slate-400 text-base md:text-lg">Start using tokens to see your history here.</p>
                    </div>
                  ) : (
                    <>
                      <div className="space-y-4 md:space-y-6 max-w-4xl mx-auto">
                        {transactions.map((transaction, index) => (
                          <div
                            key={transaction.id}
                            className={`border-2 border-slate-300 rounded-2xl p-4 md:p-6 transition-all duration-300 hover:shadow-xl hover:border-blue-400 backdrop-blur-sm ${
                              index % 2 === 0 ? 'bg-gradient-to-br from-white/80 to-blue-50/80' : 'bg-gradient-to-br from-white/80 to-slate-50/80'
                            }`}
                          >
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 md:gap-6">
                              <div className="flex items-start space-x-3 md:space-x-4 flex-1">
                                <div className={`p-3 md:p-4 rounded-2xl ${getAmountColor(transaction.amount)}`}>
                                  <i className={`${getTransactionIcon(transaction.type)} text-xl md:text-2xl`}></i>
                                </div>
                                <div className="flex-1">
                                  <h4 className="font-bold text-base md:text-lg text-slate-800 mb-1 md:mb-2">
                                    {transaction.description}
                                  </h4>
                                  <div className="flex flex-col md:flex-row md:flex-wrap gap-2 md:gap-3">
                                    <span className="text-xs md:text-sm text-slate-600 flex items-center">
                                      <i className="far fa-clock mr-1 md:mr-2"></i>
                                      {formatDate(transaction.createdAt)}
                                    </span>
                                    <span className="text-xs md:text-sm text-slate-600 flex items-center">
                                      <i className="fas fa-hashtag mr-1 md:mr-2"></i>
                                      {transaction.reference}
                                    </span>
                                  </div>
                                </div>
                              </div>
                              <div className="text-center md:text-right">
                                <div className={`text-lg md:text-2xl font-bold px-3 md:px-4 py-1 md:py-2 rounded-xl border backdrop-blur-sm ${
                                  transaction.amount < 0
                                    ? 'text-rose-600 bg-gradient-to-r from-rose-100/50 to-red-100/50 border-rose-300'
                                    : 'text-emerald-600 bg-gradient-to-r from-emerald-100/50 to-green-100/50 border-emerald-300'
                                }`}>
                                  {transaction.amount > 0 ? '+' : ''}{transaction.amount} tokens
                                </div>
                                <div className="text-xs md:text-sm text-slate-500 mt-1 md:mt-2 capitalize">
                                  {transaction.type.replace('_', ' ')}
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Pagination */}
                      {transactionTotalPages > 1 && (
                        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mt-8">
                          <div className="text-sm text-slate-600">
                            Page {transactionCurrentPage} of {transactionTotalPages}
                          </div>
                          <div className="flex items-center space-x-2">
                            {/* Previous Button */}
                            <button
                              onClick={() => handleTransactionPageChange(transactionCurrentPage - 1)}
                              disabled={transactionCurrentPage === 1}
                              className={`px-4 py-2 rounded-xl font-medium flex items-center ${
                                transactionCurrentPage === 1
                                  ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                                  : 'bg-gradient-to-r from-purple-500 to-pink-600 text-white hover:shadow-xl transform hover:scale-105 transition-all duration-300'
                              }`}
                            >
                              <i className="fas fa-chevron-left mr-2"></i>
                              Previous
                            </button>

                            {/* Page Numbers */}
                            <div className="hidden sm:flex items-center space-x-2">
                              {getPaginationRange(transactionCurrentPage, transactionTotalPages).map((page, index) => (
                                <button
                                  key={index}
                                  onClick={() => typeof page === 'number' ? handleTransactionPageChange(page) : null}
                                  className={`w-10 h-10 flex items-center justify-center rounded-xl font-medium ${
                                    page === transactionCurrentPage
                                      ? 'bg-gradient-to-r from-purple-500 to-pink-600 text-white shadow-lg'
                                      : typeof page === 'number'
                                      ? 'bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors'
                                      : 'text-slate-400 cursor-default'
                                  }`}
                                  disabled={typeof page !== 'number'}
                                >
                                  {page}
                                </button>
                              ))}
                            </div>

                            {/* Mobile Page Indicator */}
                            <div className="sm:hidden text-sm text-slate-700 font-medium">
                              {transactionCurrentPage} / {transactionTotalPages}
                            </div>

                            {/* Next Button */}
                            <button
                              onClick={() => handleTransactionPageChange(transactionCurrentPage + 1)}
                              disabled={transactionCurrentPage === transactionTotalPages}
                              className={`px-4 py-2 rounded-xl font-medium flex items-center ${
                                transactionCurrentPage === transactionTotalPages
                                  ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                                  : 'bg-gradient-to-r from-purple-500 to-pink-600 text-white hover:shadow-xl transform hover:scale-105 transition-all duration-300'
                              }`}
                            >
                              Next
                              <i className="fas fa-chevron-right ml-2"></i>
                            </button>
                          </div>

                          {/* Items Per Page Selector */}
                          <div className="text-sm text-slate-600">
                            {itemsPerPage} items per page
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>

            {/* INFO SECTION */}
            <div className="bg-gradient-to-br from-emerald-50/80 to-green-50/80 rounded-2xl p-6 md:p-8 mt-6 md:mt-8 border border-emerald-300 backdrop-blur-sm">
              <div className="text-center mb-6 md:mb-8">
                <h3 className="text-lg md:text-xl font-bold text-slate-800 mb-2 flex items-center justify-center">
                  <i className="fas fa-info-circle mr-2 md:mr-3 text-emerald-500"></i>
                  How Tokens Work
                </h3>
                <p className="text-slate-600 text-base md:text-lg max-w-2xl mx-auto">
                  Your tokens are your key to unlocking premium medical education features
                </p>
              </div>
              
              {/* Desktop View - Grid Layout */}
              <div className="hidden md:grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 max-w-5xl mx-auto">
                {infoItems.map((item, idx) => (
                  <div key={idx} className="text-center p-4 md:p-6 bg-white/50 rounded-2xl border border-slate-200/50 hover:shadow-lg transition-all duration-300">
                    <div className={`w-14 h-14 md:w-16 md:h-16 bg-gradient-to-r ${item.gradient} rounded-2xl flex items-center justify-center mx-auto mb-3 md:mb-4`}>
                      <i className={`${item.icon} text-xl md:text-2xl text-white`}></i>
                    </div>
                    <h4 className="font-bold text-slate-800 mb-2 text-sm md:text-base">{item.title}</h4>
                    <p className="text-xs md:text-sm text-slate-600">{item.desc}</p>
                  </div>
                ))}
              </div>
              
              {/* Mobile View - Slider Layout */}
              <div className="md:hidden">
                <div className="relative">
                  {/* Slider Container */}
                  <div className="overflow-hidden">
                    <div 
                      className="flex transition-transform duration-300 ease-in-out"
                      style={{ transform: `translateX(-${currentInfoIndex * 100}%)` }}
                    >
                      {infoItems.map((item, idx) => (
                        <div
                          key={idx}
                          className="w-full flex-shrink-0 px-2"
                        >
                          <div className="text-center p-6 bg-white/50 rounded-2xl border border-slate-200/50">
                            <div className={`w-16 h-16 bg-gradient-to-r ${item.gradient} rounded-2xl flex items-center justify-center mx-auto mb-4`}>
                              <i className={`${item.icon} text-2xl text-white`}></i>
                            </div>
                            <h4 className="font-bold text-slate-800 mb-2 text-base">{item.title}</h4>
                            <p className="text-sm text-slate-600">{item.desc}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  {/* Slider Navigation Buttons */}
                  <button
                    onClick={prevInfo}
                    className="absolute left-0 top-1/2 transform -translate-y-1/2 bg-white/80 backdrop-blur-sm border border-slate-300 rounded-full w-10 h-10 flex items-center justify-center shadow-lg z-10"
                  >
                    <i className="fas fa-chevron-left text-slate-700"></i>
                  </button>
                  <button
                    onClick={nextInfo}
                    className="absolute right-0 top-1/2 transform -translate-y-1/2 bg-white/80 backdrop-blur-sm border border-slate-300 rounded-full w-10 h-10 flex items-center justify-center shadow-lg z-10"
                  >
                    <i className="fas fa-chevron-right text-slate-700"></i>
                  </button>
                  
                  {/* Slider Dots Indicator */}
                  <div className="flex justify-center space-x-2 mt-6">
                    {infoItems.map((_, index) => (
                      <button
                        key={index}
                        onClick={() => setCurrentInfoIndex(index)}
                        className={`w-2 h-2 rounded-full transition-all duration-300 ${
                          currentInfoIndex === index 
                            ? 'bg-emerald-500 w-4' 
                            : 'bg-slate-300'
                        }`}
                        aria-label={`Go to step ${index + 1}`}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* Floating Button for Mobile Menu */}
      <div className="md:hidden fixed bottom-6 right-6 z-40">
        <button
          onClick={() => setIsMobileTrayOpen(!isMobileTrayOpen)}
          className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 text-white rounded-2xl shadow-2xl font-bold flex items-center justify-center hover:from-blue-600 hover:to-indigo-700 hover:scale-110 transition-all duration-300 backdrop-blur-sm border border-white/20"
        >
          <i className={`fas ${isMobileTrayOpen ? 'fa-times' : 'fa-bars'} text-lg`}></i>
        </button>
      </div>

      {/* Mobile Menu Tray */}
      <AnimatePresence>
        {isMobileTrayOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 md:hidden"
          >
            {/* Backdrop with gradient */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-gradient-to-t from-gray-900/95 via-gray-900/80 to-transparent backdrop-blur-sm"
              onClick={() => setIsMobileTrayOpen(false)}
            />
            
            {/* Tray from Bottom */}
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="absolute bottom-0 left-0 right-0 bg-gradient-to-b from-slate-800 via-slate-900 to-gray-900 rounded-t-3xl shadow-2xl border-t border-slate-700/50"
            >
              {/* Drag Handle */}
              <div className="flex justify-center pt-4 pb-3">
                <div className="w-16 h-1.5 bg-slate-600/70 rounded-full"></div>
              </div>
              
              {/* Menu Content */}
              <div className="px-4 pb-8 h-[50vh] overflow-y-auto">
                {/* Section Title */}
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl">
                      <i className="fas fa-bars text-white text-lg"></i>
                    </div>
                    <h3 className="text-white text-lg font-bold">Token Menu</h3>
                  </div>
                  
                  {/* Close Button */}
                  <button 
                    onClick={() => setIsMobileTrayOpen(false)}
                    className="p-2 rounded-lg hover:bg-slate-700/50 transition-colors"
                  >
                    <i className="fas fa-times text-white text-sm"></i>
                  </button>
                </div>
                
                {/* Navigation Items */}
                <div className="space-y-3">
                  {navItems.map((item, index) => (
                    item.href === '/api/auth/signout' ? (
                      <form key={item.title} action={item.href} method="post" className="w-full">
                        <button
                          type="submit"
                          className="w-full p-4 rounded-2xl bg-gradient-to-b from-slate-700/60 to-slate-800/40 hover:from-slate-700 hover:to-slate-800 border border-slate-700/40 transition-all duration-300 hover:scale-[1.02] active:scale-95 flex items-center justify-between group"
                        >
                          <div className="flex items-center">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center mr-3 ${item.color} bg-white/10 border border-white/20`}>
                              <i className={`fas ${item.icon} text-white`}></i>
                            </div>
                            <span className="text-white font-medium text-sm">{item.title}</span>
                          </div>
                          <i className="fas fa-chevron-right text-white/40 group-hover:text-white/70 text-xs"></i>
                        </button>
                      </form>
                    ) : (
                      <button
                        key={item.title}
                        onClick={() => {
                          handleNavClick(item.href!);
                          setIsMobileTrayOpen(false);
                        }}
                        className="w-full p-4 rounded-2xl bg-gradient-to-b from-slate-700/60 to-slate-800/40 hover:from-slate-700 hover:to-slate-800 border border-slate-700/40 transition-all duration-300 hover:scale-[1.02] active:scale-95 flex items-center justify-between group"
                      >
                        <div className="flex items-center">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center mr-3 ${item.color} bg-white/10 border border-white/20`}>
                            <i className={`fas ${item.icon} text-white`}></i>
                          </div>
                          <span className="text-white font-medium text-sm">{item.title}</span>
                        </div>
                        <i className="fas fa-chevron-right text-white/40 group-hover:text-white/70 text-xs"></i>
                      </button>
                    )
                  ))}
                </div>

                {/* Token Balance in Mobile Menu */}
                <div className="mt-6 p-4 rounded-2xl bg-gradient-to-r from-amber-900/40 to-amber-800/30 border border-amber-800/40">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-amber-900/60 rounded-lg">
                      <i className="fas fa-coins text-amber-300 text-base"></i>
                    </div>
                    <div className="flex-1">
                      <p className="text-xs text-slate-300">Token Balance</p>
                      <p className="text-white font-semibold text-sm">
                        <TokenBalance compact />
                      </p>
                    </div>
                  </div>
                </div>

                {/* Close Button */}
                <button 
                  onClick={() => setIsMobileTrayOpen(false)}
                  className="w-full mt-4 bg-gradient-to-r from-slate-700 to-slate-800 text-white py-3.5 rounded-xl font-semibold flex items-center justify-center space-x-2 hover:from-slate-600 hover:to-slate-700 transition-all duration-300 border border-slate-600/50 active:scale-95"
                >
                  <i className="fas fa-times text-sm"></i>
                  <span>Close Menu</span>
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Footer */}
      <footer className="fixed bottom-0 left-0 right-0 z-10 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-gray-900 dark:to-gray-800 border-t border-blue-100 dark:border-gray-700 py-4 md:py-6">
        <div className="max-w-7xl mx-auto px-4 md:px-6 text-center text-xs md:text-sm text-muted-foreground">
          © 2025 Acemedix Academy. All rights reserved.
        </div>
      </footer>
    </>
  );
};

export default TokensPage;