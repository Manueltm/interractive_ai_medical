// app/dashboard/admin/tokens/page.tsx
'use client';
import { FC, useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { toast } from 'sonner';
import TokenBalance from '../../components/TokenBalance';
import Link from 'next/link';
import { cn } from '@/utils';

const navItems = [
  {
    title: 'Token Management',
    icon: 'fa-coins',
    children: [
      { title: 'Token Packages', href: '/dashboard/admin/tokens', target: 'packages', icon: 'fa-box' },
      { title: 'Usage Rates', href: '/dashboard/admin/tokens', target: 'rates', icon: 'fa-tachometer-alt' },
      { title: 'Assign Tokens', href: '/dashboard/admin/tokens', target: 'assign', icon: 'fa-user-plus' },
      { title: 'Analytics', href: '/dashboard/admin/tokens', target: 'analytics', icon: 'fa-chart-pie' },
    ]
  },
  {
    title: 'User Management',
    icon: 'fa-users-cog',
    children: [
      { title: 'All Users', href: '/dashboard/admin/users', target: 'users', icon: 'fa-users' },
      { title: 'User Roles', href: '/dashboard/admin/roles', target: 'roles', icon: 'fa-user-shield' },
      { title: 'Activity Log', href: '/dashboard/admin/activity', target: 'activity', icon: 'fa-history' },
    ]
  },
  {
    title: 'Content Management',
    icon: 'fa-cogs',
    children: [
      { title: 'CBT Questions', href: '/dashboard/admin/questions', target: 'questions', icon: 'fa-question-circle' },
      { title: 'OSCE Cases', href: '/dashboard/admin/cases', target: 'cases', icon: 'fa-briefcase-medical' },
      { title: 'Flashcards', href: '/dashboard/admin/flashcards', target: 'flashcards', icon: 'fa-book-open' },
      { title: 'Discussion Posts', href: '/dashboard/admin/posts', target: 'posts', icon: 'fa-comments' },
    ]
  },
  {
    title: 'Payment Management',
    icon: 'fa-credit-card',
    children: [
      { title: 'Transactions', href: '/dashboard/admin/transactions', target: 'transactions', icon: 'fa-exchange-alt' },
      { title: 'Refunds', href: '/dashboard/admin/refunds', target: 'refunds', icon: 'fa-undo' },
      { title: 'Payment Settings', href: '/dashboard/admin/payment-settings', target: 'payment-settings', icon: 'fa-cog' },
    ]
  },
  { title: 'System Settings', href: '/dashboard/admin/settings', target: 'settings', icon: 'fa-sliders-h' },
  { title: 'Reports', href: '/dashboard/admin/reports', target: 'reports', icon: 'fa-file-chart-line' },
  { title: 'Back to User Dashboard', href: '/dashboard', target: 'dashboard', icon: 'fa-arrow-left' },
];

const getIconColor = (index: number) => {
  const colors = [
    'text-purple-400',
    'text-indigo-400',
    'text-violet-400',
    'text-fuchsia-400',
    'text-lavender-400',
    'text-mauve-400',
    'text-periwinkle-400',
  ];
  return colors[index % colors.length];
};

const getChildIconColor = (index: number) => {
  const colors = [
    'text-purple-300',
    'text-indigo-300',
    'text-violet-300',
    'text-fuchsia-300',
    'text-lavender-300',
    'text-mauve-300',
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
  isActive: boolean;
  createdAt: string;
}

interface UsageRate {
  id: string;
  service: string;
  rate: number;
  unit: string;
  description: string;
  isActive: boolean;
  createdAt: string;
}

interface User {
  id: string;
  email: string;
  name: string;
  tokenBalance: number;
  role: string;
  lastActive: string;
}

interface AssignTokensForm {
  userId: string;
  amount: number;
  reason: string;
}

interface Analytics {
  totalTokensSold: number;
  totalRevenue: number;
  activePackages: number;
  totalUsers: number;
}

type AdminTabType = 'packages' | 'rates' | 'assign' | 'analytics';

const AdminTokensPage: FC = () => {
  const { data: session } = useSession();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isEdgeHovering, setIsEdgeHovering] = useState(false);
  const [openMenus, setOpenMenus] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<AdminTabType>('packages');
  const [packages, setPackages] = useState<TokenPackage[]>([]);
  const [usageRates, setUsageRates] = useState<UsageRate[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const [showLoadingPopup, setShowLoadingPopup] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  
  // Pagination states
  const [currentPackagePage, setCurrentPackagePage] = useState(1);
  const [currentRatePage, setCurrentRatePage] = useState(1);
  const [currentUserPage, setCurrentUserPage] = useState(1);
  const [itemsPerPage] = useState(10);
  
  // Search states
  const [packageSearch, setPackageSearch] = useState('');
  const [rateSearch, setRateSearch] = useState('');
  const [userSearch, setUserSearch] = useState('');
  
  // Form states
  const [editingPackage, setEditingPackage] = useState<TokenPackage | null>(null);
  const [editingRate, setEditingRate] = useState<UsageRate | null>(null);
  const [assignForm, setAssignForm] = useState<AssignTokensForm>({
    userId: '',
    amount: 100,
    reason: ''
  });

  const [newPackage, setNewPackage] = useState({
    name: '',
    description: '',
    tokenAmount: 100,
    price: 1000,
    currency: 'NGN'
  });

  const [newRate, setNewRate] = useState({
    service: '',
    rate: 1.5,
    unit: 'question',
    description: ''
  });

  const [analytics, setAnalytics] = useState<Analytics>({
    totalTokensSold: 0,
    totalRevenue: 0,
    activePackages: 0,
    totalUsers: 0,
  });

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

  const toggleMenu = (title: string) => {
    setOpenMenus(prev => prev.includes(title) ? [] : [title]);
  };

  useEffect(() => {
  if (session?.user?.role === 'admin') {
    fetchData();
    // Add a specific check for the rates tab
    if (activeTab === 'rates') {
      fetchUsageRates();
    }
  }
}, [session, activeTab]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setShowLoadingPopup(true);
      setLoadingMessage('Loading admin data...');
      
      if (activeTab === 'packages') {
        await fetchPackages();
      } else if (activeTab === 'rates') {
        await fetchUsageRates();
      } else if (activeTab === 'assign') {
        await fetchUsers();
      } else if (activeTab === 'analytics') {
        await fetchAnalytics();
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
      setShowLoadingPopup(false);
    }
  };

  const fetchPackages = async () => {
    try {
      const res = await fetch('/api/admin/token-packages');
      if (res.ok) {
        const data = await res.json();
        setPackages(data.packages);
      } else {
        toast.error('Failed to load token packages');
      }
    } catch (error) {
      console.error('Error fetching packages:', error);
      toast.error('Failed to load token packages');
    }
  };

  const fetchUsageRates = async () => {
  try {
    const res = await fetch('/api/admin/usage-rates');
    if (res.ok) {
      const data = await res.json();
      setUsageRates(data.rates);
      console.log('📊 Usage rates loaded:', data.rates); // Debug log
    } else {
      toast.error('Failed to load usage rates');
    }
  } catch (error) {
    console.error('Error fetching usage rates:', error);
    toast.error('Failed to load usage rates');
  }
};

  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/admin/users');
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users);
      } else {
        toast.error('Failed to load users');
      }
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error('Failed to load users');
    }
  };

  const fetchAnalytics = async () => {
    try {
      const res = await fetch('/api/admin/token-analytics');
      if (res.ok) {
        const data = await res.json();
        setAnalytics(data);
      } else {
        toast.error('Failed to load analytics');
      }
    } catch (error) {
      console.error('Error fetching analytics:', error);
      toast.error('Failed to load analytics');
    }
  };

  const handleCreatePackage = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setShowLoadingPopup(true);
      setLoadingMessage('Creating token package...');
      
      const res = await fetch('/api/admin/token-packages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newPackage)
      });

      if (res.ok) {
        toast.success('Token package created successfully');
        setNewPackage({
          name: '',
          description: '',
          tokenAmount: 100,
          price: 1000,
          currency: 'NGN'
        });
        fetchPackages();
      } else {
        const error = await res.json();
        toast.error(error.error || 'Failed to create package');
      }
    } catch (error) {
      console.error('Error creating package:', error);
      toast.error('Failed to create package');
    } finally {
      setShowLoadingPopup(false);
    }
  };

  const handleUpdatePackage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPackage) return;

    try {
      setShowLoadingPopup(true);
      setLoadingMessage('Updating token package...');
      
      const res = await fetch(`/api/admin/token-packages/${editingPackage.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingPackage)
      });

      if (res.ok) {
        toast.success('Token package updated successfully');
        setEditingPackage(null);
        fetchPackages();
      } else {
        const error = await res.json();
        toast.error(error.error || 'Failed to update package');
      }
    } catch (error) {
      console.error('Error updating package:', error);
      toast.error('Failed to update package');
    } finally {
      setShowLoadingPopup(false);
    }
  };

  const handleTogglePackage = async (pkg: TokenPackage) => {
    try {
      setShowLoadingPopup(true);
      setLoadingMessage(`${pkg.isActive ? 'Deactivating' : 'Activating'} package...`);
      
      const res = await fetch(`/api/admin/token-packages/${pkg.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !pkg.isActive })
      });

      if (res.ok) {
        toast.success(`Package ${!pkg.isActive ? 'activated' : 'deactivated'} successfully`);
        fetchPackages();
      } else {
        const error = await res.json();
        toast.error(error.error || 'Failed to update package');
      }
    } catch (error) {
      console.error('Error toggling package:', error);
      toast.error('Failed to update package');
    } finally {
      setShowLoadingPopup(false);
    }
  };

  const handleDeletePackage = async (pkg: TokenPackage) => {
    if (!confirm(`Are you sure you want to delete "${pkg.name}"?`)) return;
    
    try {
      setShowLoadingPopup(true);
      setLoadingMessage('Deleting package...');
      
      const res = await fetch(`/api/admin/token-packages/${pkg.id}`, {
        method: 'DELETE'
      });

      if (res.ok) {
        toast.success('Package deleted successfully');
        fetchPackages();
      } else {
        const error = await res.json();
        toast.error(error.error || 'Failed to delete package');
      }
    } catch (error) {
      console.error('Error deleting package:', error);
      toast.error('Failed to delete package');
    } finally {
      setShowLoadingPopup(false);
    }
  };

  const handleCreateRate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setShowLoadingPopup(true);
      setLoadingMessage('Creating usage rate...');
      
      const res = await fetch('/api/admin/usage-rates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newRate)
      });

      if (res.ok) {
        toast.success('Usage rate created successfully');
        setNewRate({
          service: '',
          rate: 1.5,
          unit: 'question',
          description: ''
        });
        fetchUsageRates();
      } else {
        const error = await res.json();
        toast.error(error.error || 'Failed to create usage rate');
      }
    } catch (error) {
      console.error('Error creating usage rate:', error);
      toast.error('Failed to create usage rate');
    } finally {
      setShowLoadingPopup(false);
    }
  };

  const handleUpdateRate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRate) return;

    try {
      setShowLoadingPopup(true);
      setLoadingMessage('Updating usage rate...');
      
      const res = await fetch(`/api/admin/usage-rates/${editingRate.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingRate)
      });

      if (res.ok) {
        toast.success('Usage rate updated successfully');
        setEditingRate(null);
        fetchUsageRates();
      } else {
        const error = await res.json();
        toast.error(error.error || 'Failed to update usage rate');
      }
    } catch (error) {
      console.error('Error updating usage rate:', error);
      toast.error('Failed to update usage rate');
    } finally {
      setShowLoadingPopup(false);
    }
  };

  const handleToggleRate = async (rate: UsageRate) => {
    try {
      setShowLoadingPopup(true);
      setLoadingMessage(`${rate.isActive ? 'Deactivating' : 'Activating'} usage rate...`);
      
      const res = await fetch(`/api/admin/usage-rates/${rate.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !rate.isActive })
      });

      if (res.ok) {
        toast.success(`Usage rate ${!rate.isActive ? 'activated' : 'deactivated'} successfully`);
        fetchUsageRates();
      } else {
        const error = await res.json();
        toast.error(error.error || 'Failed to update usage rate');
      }
    } catch (error) {
      console.error('Error toggling usage rate:', error);
      toast.error('Failed to update usage rate');
    } finally {
      setShowLoadingPopup(false);
    }
  };

  const handleAssignTokens = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setShowLoadingPopup(true);
      setLoadingMessage('Assigning tokens...');
      
      const res = await fetch('/api/admin/assign-tokens', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(assignForm)
      });

      if (res.ok) {
        toast.success('Tokens assigned successfully');
        setAssignForm({
          userId: '',
          amount: 100,
          reason: ''
        });
        fetchUsers();
      } else {
        const error = await res.json();
        toast.error(error.error || 'Failed to assign tokens');
      }
    } catch (error) {
      console.error('Error assigning tokens:', error);
      toast.error('Failed to assign tokens');
    } finally {
      setShowLoadingPopup(false);
    }
  };

  // Filter functions with search
  const filteredPackages = packages.filter(pkg =>
    pkg.name.toLowerCase().includes(packageSearch.toLowerCase()) ||
    pkg.description.toLowerCase().includes(packageSearch.toLowerCase()) ||
    pkg.tokenAmount.toString().includes(packageSearch)
  );

  const filteredRates = usageRates.filter(rate =>
    rate.service.toLowerCase().includes(rateSearch.toLowerCase()) ||
    rate.description.toLowerCase().includes(rateSearch.toLowerCase()) ||
    rate.unit.toLowerCase().includes(rateSearch.toLowerCase())
  );

  const filteredUsers = users.filter(user =>
  (user.name?.toLowerCase() || '').includes(userSearch.toLowerCase()) ||
  user.email.toLowerCase().includes(userSearch.toLowerCase()) ||
  user.role.toLowerCase().includes(userSearch.toLowerCase())
);

  // Pagination calculations
  const indexOfLastPackage = currentPackagePage * itemsPerPage;
  const indexOfFirstPackage = indexOfLastPackage - itemsPerPage;
  const currentPackages = filteredPackages.slice(indexOfFirstPackage, indexOfLastPackage);
  const totalPackagePages = Math.ceil(filteredPackages.length / itemsPerPage);

  const indexOfLastRate = currentRatePage * itemsPerPage;
  const indexOfFirstRate = indexOfLastRate - itemsPerPage;
  const currentRates = filteredRates.slice(indexOfFirstRate, indexOfLastRate);
  const totalRatePages = Math.ceil(filteredRates.length / itemsPerPage);

  const indexOfLastUser = currentUserPage * itemsPerPage;
  const indexOfFirstUser = indexOfLastUser - itemsPerPage;
  const currentUsers = filteredUsers.slice(indexOfFirstUser, indexOfLastUser);
  const totalUserPages = Math.ceil(filteredUsers.length / itemsPerPage);

  // Pagination handlers
  const paginatePackages = (pageNumber: number) => setCurrentPackagePage(pageNumber);
  const paginateRates = (pageNumber: number) => setCurrentRatePage(pageNumber);
  const paginateUsers = (pageNumber: number) => setCurrentUserPage(pageNumber);

  const formatPrice = (price: number) => {
    return `₦${(price / 100).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatNumber = (num: number) => {
    return num.toLocaleString();
  };

  const getStatusBadge = (isActive: boolean) => {
    return isActive 
      ? 'bg-gradient-to-r from-emerald-100 to-green-100 text-emerald-800 border-emerald-300'
      : 'bg-gradient-to-r from-slate-100 to-gray-100 text-slate-800 border-slate-300';
  };

  const getRoleBadge = (role: string) => {
    switch (role.toLowerCase()) {
      case 'admin':
        return 'bg-gradient-to-r from-purple-100 to-violet-100 text-purple-800 border-purple-300';
      case 'premium':
        return 'bg-gradient-to-r from-amber-100 to-yellow-100 text-amber-800 border-amber-300';
      default:
        return 'bg-gradient-to-r from-blue-100 to-indigo-100 text-blue-800 border-blue-300';
    }
  };

  if (session?.user?.role !== 'admin') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-white/95 to-purple-50/95 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="bg-gradient-to-br from-white/95 to-purple-50/95 rounded-2xl shadow-lg p-8 border border-purple-300 backdrop-blur-sm">
            <div className="text-center py-16">
              <div className="w-24 h-24 bg-gradient-to-r from-purple-500 to-violet-600 rounded-full flex items-center justify-center mx-auto mb-6">
                <i className="fas fa-lock text-4xl text-white"></i>
              </div>
              <h1 className="text-3xl font-bold text-slate-800 mb-4">Access Restricted</h1>
              <p className="text-slate-600 text-lg mb-6">This area is only accessible by administrators.</p>
              <button
                onClick={() => window.location.href = '/dashboard'}
                className="px-8 py-4 bg-gradient-to-r from-purple-500 to-violet-600 text-white rounded-2xl hover:from-purple-600 hover:to-violet-700 transition-all duration-300 flex items-center font-bold shadow-lg hover:shadow-xl transform hover:scale-105 cursor-pointer mx-auto"
              >
                <i className="fas fa-arrow-left mr-4"></i>
                Return to Dashboard
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (loading && !showLoadingPopup) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-white/95 to-purple-50/95 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="bg-gradient-to-br from-white/80 to-purple-50/80 rounded-2xl p-8 border border-purple-300 backdrop-blur-sm shadow-lg">
            <div className="animate-pulse">
              <div className="h-8 bg-slate-300 rounded-xl w-1/4 mb-8"></div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[1, 2, 3].map(i => (
                  <div key={i} className="bg-slate-200 rounded-2xl p-6 h-64"></div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="flex min-h-screen bg-background">
        {/* SIDEBAR */}
        <aside className={cn(
          "fixed md:sticky top-0 h-screen z-50 shadow-lg overflow-y-auto transition-all duration-300 ease-in-out",
          isSidebarOpen ? "w-64" : "w-0 md:w-0",
          "bg-gradient-to-b from-slate-800 via-purple-900 to-violet-900 flex flex-col"
        )}>
          <div className="p-6 border-b border-purple-700 flex items-center justify-between flex-shrink-0">
            <Link href="/dashboard/admin" className="text-xl font-bold text-white hover:text-purple-200 transition-colors">
              <img src="/logo.png" alt="Acemedix Academy" className="h-8" />
              <span className="ml-2 text-sm text-purple-300">Admin</span>
            </Link>
            <button className="md:hidden text-white hover:text-purple-200" onClick={() => setIsSidebarOpen(false)}>
              <i className="fas fa-times" />
            </button>
            <button className="hidden md:block text-white hover:text-purple-200" onClick={() => setIsSidebarOpen(!isSidebarOpen)}>
              <i className={`fas fa-${isSidebarOpen ? 'chevron-left' : 'chevron-right'}`} />
            </button>
          </div>

          <nav className="flex-1 overflow-y-auto px-4 py-6 space-y-2">
            {navItems.map((item, index) => (
              <div key={item.title} className="border-b border-purple-700/50 last:border-b-0">
                {item.children ? (
                  <>
                    <button
                      onClick={() => toggleMenu(item.title)}
                      className="block w-full text-left rounded-xl px-4 py-3 text-white hover:bg-purple-700/30 flex items-center justify-between group"
                    >
                      <span className="flex items-center">
                        <i className={`fas ${item.icon} mr-3 text-lg ${getIconColor(index)} group-hover:scale-110 transition-transform`} />
                        {item.title}
                      </span>
                      <i className={`fas fa-chevron-${openMenus.includes(item.title) ? 'down' : 'right'} text-purple-300 text-xs`} />
                    </button>
                    {openMenus.includes(item.title) && (
                      <div className="ml-4 space-y-1 mt-2">
                        {item.children.map((child, childIndex) => (
                          <Link
                            key={child.title}
                            href={child.href}
                            className={cn(
                              "block w-full text-left rounded-lg px-4 py-2 text-sm text-purple-100 hover:text-white hover:bg-purple-600/30 flex items-center group",
                              child.href === '/dashboard/admin/tokens' && child.target === activeTab ? 'bg-purple-700/40' : ''
                            )}
                          >
                            <i className={`fas ${child.icon} mr-2 ${getChildIconColor(childIndex)} group-hover:scale-110 transition-transform`} />
                            {child.title}
                          </Link>
                        ))}
                      </div>
                    )}
                  </>
                ) : (
                  <Link
                    href={item.href!}
                    className="block w-full text-left rounded-xl px-4 py-3 text-white hover:bg-purple-700/30 flex items-center group"
                  >
                    <i className={`fas ${item.icon} mr-3 text-lg ${getIconColor(index)} group-hover:scale-110 transition-transform`} />
                    {item.title}
                  </Link>
                )}
              </div>
            ))}
            <form action="/api/auth/signout" method="post">
              <button className="block w-full text-left rounded-xl px-4 py-3 text-white hover:bg-purple-700/30 flex items-center group mt-4">
                <i className="fas fa-sign-out-alt mr-3 text-lg text-rose-400 group-hover:scale-110 transition-transform" />
                Logout
              </button>
            </form>
          </nav>
        </aside>

        {/* MAIN CONTENT */}
        <main className="flex-1 flex flex-col min-h-screen overflow-y-auto w-full">
          {/* Top Bar */}
          <header className="flex items-center justify-between bg-white shadow-sm px-4 md:px-6 py-4 border-b border-purple-50 dark:bg-gray-900 dark:border-gray-800">
            <div className="flex items-center space-x-2 md:space-x-4">
              <button
                className="text-foreground hover:text-primary p-2 rounded-lg hover:bg-purple-100"
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              >
                <i className="fas fa-bars text-lg"></i>
              </button>
              <h2 className="text-lg md:text-xl font-semibold">Admin Token Management</h2>
            </div>
            <div className="flex items-center space-x-2 md:space-x-4">
              <div className="hidden sm:block">
                <div className="px-4 py-2 bg-gradient-to-r from-purple-100 to-violet-100 rounded-xl border border-purple-300">
                  <div className="flex items-center">
                    <i className="fas fa-user-shield text-purple-600 mr-2"></i>
                    <span className="font-semibold text-purple-800">Administrator</span>
                  </div>
                </div>
              </div>
              <img
                src={`https://ui-avatars.com/api/?name=${encodeURIComponent(session?.user?.name || session?.user?.email || 'Admin')}&background=7c3aed&color=ffffff`}
                alt="avatar"
                className="h-8 w-8 rounded-full border-2 border-purple-300"
              />
              <button
                onClick={() => document.documentElement.classList.toggle('dark')}
                className="p-2 rounded-lg hover:bg-purple-100"
              >
                <i className="fas fa-moon text-purple-600"></i>
              </button>
            </div>
          </header>

          {/* Admin Badge Mobile */}
          <div className="sm:hidden mx-4 mt-4">
            <div className="px-4 py-2 bg-gradient-to-r from-purple-100 to-violet-100 rounded-xl border border-purple-300">
              <div className="flex items-center justify-center">
                <i className="fas fa-user-shield text-purple-600 mr-2"></i>
                <span className="font-semibold text-purple-800">Administrator</span>
              </div>
            </div>
          </div>

          {/* Breadcrumbs */}
          <nav className="bg-gradient-to-r from-purple-50/80 to-violet-100/60 rounded-xl p-4 mb-6 shadow-inner border border-purple-200/50 mx-4 md:mx-6 mt-4">
            <div className="flex items-center gap-2 md:gap-3 text-sm">
              <Link href="/dashboard/admin" className="text-purple-600 hover:text-purple-800 font-medium flex items-center">
                <i className="fas fa-home mr-1 md:mr-2"></i>
                <span className="hidden sm:inline">Admin Dashboard</span>
              </Link>
              <i className="fas fa-chevron-right text-purple-600/60 text-xs"></i>
              <span className="text-purple-800 font-semibold flex items-center">
                <i className="fas fa-coins mr-1 md:mr-2"></i>
                Token Management
              </span>
            </div>
          </nav>

          {/* Page Content */}
          <div className="flex-1 p-4 md:p-6 overflow-y-auto bg-card/95 pb-20">
            {/* Header Section */}
            <div className="bg-gradient-to-br from-white/95 to-purple-50/95 rounded-2xl shadow-lg p-6 md:p-8 border border-purple-300 backdrop-blur-sm mb-8">
              <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
                <div className="flex-1">
                  <h2 className="text-2xl md:text-3xl font-bold flex items-center justify-center lg:justify-start text-slate-800">
                    <i className="fas fa-shield-alt mr-3 md:mr-4 text-purple-500"></i>
                    Admin Token Management
                  </h2>
                  <p className="text-slate-600 mt-2 md:mt-3 text-base md:text-lg text-center lg:text-left">
                    Manage token packages, usage rates, user assignments, and analytics
                  </p>
                </div>
                <div className="bg-gradient-to-r from-purple-500 to-violet-600 rounded-2xl p-5 md:p-6 shadow-lg w-full lg:w-auto">
                  <div className="text-center">
                    <div className="text-sm text-purple-100 mb-2 flex items-center justify-center">
                      <i className="fas fa-user-shield mr-2"></i>
                      Admin Privileges Active
                    </div>
                    <div className="text-2xl md:text-3xl font-bold text-white">
                      {session?.user?.name || 'Administrator'}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Analytics Summary - Always visible */}
            <div className="bg-gradient-to-br from-white/95 to-purple-50/95 rounded-2xl shadow-lg p-6 mb-8 border border-purple-300 backdrop-blur-sm">
              <h3 className="text-xl font-bold text-slate-800 mb-6 flex items-center">
                <i className="fas fa-chart-bar mr-4 text-purple-500"></i>
                Token Analytics Overview
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                <div className="bg-gradient-to-br from-purple-50/80 to-violet-50/80 p-6 rounded-2xl border border-purple-300">
                  <div className="text-3xl font-bold text-slate-800 mb-2">{formatNumber(analytics.totalTokensSold)}</div>
                  <div className="text-sm text-slate-600">Total Tokens Sold</div>
                </div>
                <div className="bg-gradient-to-br from-emerald-50/80 to-green-50/80 p-6 rounded-2xl border border-emerald-300">
                  <div className="text-3xl font-bold text-slate-800 mb-2">{formatPrice(analytics.totalRevenue)}</div>
                  <div className="text-sm text-slate-600">Total Revenue</div>
                </div>
                <div className="bg-gradient-to-br from-amber-50/80 to-yellow-50/80 p-6 rounded-2xl border border-amber-300">
                  <div className="text-3xl font-bold text-slate-800 mb-2">{analytics.activePackages}</div>
                  <div className="text-sm text-slate-600">Active Packages</div>
                </div>
                <div className="bg-gradient-to-br from-blue-50/80 to-indigo-50/80 p-6 rounded-2xl border border-blue-300">
                  <div className="text-3xl font-bold text-slate-800 mb-2">{analytics.totalUsers}</div>
                  <div className="text-sm text-slate-600">Total Users</div>
                </div>
              </div>
            </div>

            {/* Tabs Section - Full width tabs */}
            <div className="w-full mb-8">
              <div className="flex border-b border-slate-300 overflow-x-auto">
                {(['packages', 'rates', 'assign', 'analytics'] as AdminTabType[]).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => {
                      setActiveTab(tab);
                      // Reset pagination when switching tabs
                      setCurrentPackagePage(1);
                      setCurrentRatePage(1);
                      setCurrentUserPage(1);
                      // Reset search
                      setPackageSearch('');
                      setRateSearch('');
                      setUserSearch('');
                    }}
                    className={cn(
                      "flex-1 min-w-[120px] px-4 md:px-6 py-3 md:py-4 text-sm md:text-base font-bold transition-all duration-300 flex items-center justify-center border-b-2",
                      activeTab === tab
                        ? 'border-purple-500 text-purple-600 bg-purple-50/50'
                        : 'border-transparent text-slate-600 hover:text-purple-500 hover:bg-slate-50/50'
                    )}
                  >
                    <i className={`fas fa-${
                      tab === 'packages' ? 'box' : 
                      tab === 'rates' ? 'tachometer-alt' : 
                      tab === 'assign' ? 'user-plus' : 
                      'chart-pie'
                    } mr-2 md:mr-3`}></i>
                    {tab === 'packages' ? 'Packages' : 
                     tab === 'rates' ? 'Usage Rates' : 
                     tab === 'assign' ? 'Assign Tokens' : 
                     'Analytics'}
                  </button>
                ))}
              </div>
            </div>

            {/* Main Tab Content */}
            <div className="bg-gradient-to-br from-white/95 to-purple-50/95 rounded-2xl shadow-lg p-5 md:p-8 border border-purple-300 backdrop-blur-sm">
              {/* PACKAGES TAB */}
              {activeTab === 'packages' && (
                <div className="space-y-8">
                  {/* Create New Package Form */}
                  <div className="bg-gradient-to-br from-purple-50/80 to-violet-50/80 rounded-2xl p-6 md:p-8 border border-purple-300 backdrop-blur-sm">
                    <h3 className="text-xl font-bold text-slate-800 mb-6 flex items-center">
                      <i className="fas fa-plus-circle mr-4 text-purple-500"></i>
                      Create New Token Package
                    </h3>
                    <form onSubmit={handleCreatePackage} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-base font-semibold text-slate-700 mb-3">Package Name</label>
                        <input
                          type="text"
                          value={newPackage.name}
                          onChange={(e) => setNewPackage({ ...newPackage, name: e.target.value })}
                          className="w-full p-4 border-2 border-slate-300 rounded-xl focus:border-purple-500 focus:ring-4 focus:ring-purple-100 transition-all duration-200 text-lg bg-white/80 backdrop-blur-sm"
                          placeholder="e.g., Starter Pack"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-base font-semibold text-slate-700 mb-3">Description</label>
                        <input
                          type="text"
                          value={newPackage.description}
                          onChange={(e) => setNewPackage({ ...newPackage, description: e.target.value })}
                          className="w-full p-4 border-2 border-slate-300 rounded-xl focus:border-purple-500 focus:ring-4 focus:ring-purple-100 transition-all duration-200 text-lg bg-white/80 backdrop-blur-sm"
                          placeholder="Brief description"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-base font-semibold text-slate-700 mb-3">Token Amount</label>
                        <input
                          type="number"
                          value={newPackage.tokenAmount}
                          onChange={(e) => setNewPackage({ ...newPackage, tokenAmount: parseInt(e.target.value) })}
                          className="w-full p-4 border-2 border-slate-300 rounded-xl focus:border-purple-500 focus:ring-4 focus:ring-purple-100 transition-all duration-200 text-lg bg-white/80 backdrop-blur-sm"
                          min="1"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-base font-semibold text-slate-700 mb-3">Price (Kobo)</label>
                        <input
                          type="number"
                          value={newPackage.price}
                          onChange={(e) => setNewPackage({ ...newPackage, price: parseInt(e.target.value) })}
                          className="w-full p-4 border-2 border-slate-300 rounded-xl focus:border-purple-500 focus:ring-4 focus:ring-purple-100 transition-all duration-200 text-lg bg-white/80 backdrop-blur-sm"
                          min="1"
                          required
                        />
                      </div>
                      <div className="md:col-span-2">
                        <button
                          type="submit"
                          className="px-8 py-4 bg-gradient-to-r from-purple-500 to-violet-600 text-white rounded-2xl hover:from-purple-600 hover:to-violet-700 transition-all duration-300 flex items-center font-bold shadow-lg hover:shadow-xl transform hover:scale-105 cursor-pointer"
                        >
                          <i className="fas fa-plus mr-4"></i>
                          Create Package
                        </button>
                      </div>
                    </form>
                  </div>

                  {/* Packages List */}
                  <div>
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                      <h3 className="text-xl font-bold text-slate-800 flex items-center">
                        <i className="fas fa-boxes mr-4 text-purple-500"></i>
                        Existing Token Packages
                      </h3>
                      <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
                        <div className="relative flex-1 md:flex-none md:w-64">
                          <input
                            type="text"
                            value={packageSearch}
                            onChange={(e) => setPackageSearch(e.target.value)}
                            className="w-full p-3 pl-10 border-2 border-slate-300 rounded-xl focus:border-purple-500 focus:ring-4 focus:ring-purple-100 bg-white/80 backdrop-blur-sm"
                            placeholder="Search packages..."
                          />
                          <i className="fas fa-search absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400"></i>
                        </div>
                        <span className="px-4 py-2 bg-gradient-to-r from-slate-100/80 to-purple-100/80 rounded-xl border border-slate-300 text-slate-700 font-semibold whitespace-nowrap">
                          {filteredPackages.length} package{filteredPackages.length !== 1 ? 's' : ''}
                        </span>
                      </div>
                    </div>

                    {filteredPackages.length === 0 ? (
                      <div className="text-center py-16 bg-gradient-to-br from-slate-50/80 to-purple-50/80 rounded-2xl border-2 border-dashed border-slate-400 backdrop-blur-sm">
                        <i className="fas fa-box-open text-5xl text-slate-400 mb-6"></i>
                        <p className="text-slate-500 text-xl mb-4 font-semibold">No token packages found</p>
                        <p className="text-slate-400 text-lg">Create your first token package to get started.</p>
                      </div>
                    ) : (
                      <>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                          {currentPackages.map((pkg) => (
                            <div
                              key={pkg.id}
                              className={`border-2 rounded-2xl p-6 transition-all duration-300 hover:shadow-xl backdrop-blur-sm ${
                                pkg.isActive
                                  ? 'border-emerald-300 bg-gradient-to-br from-emerald-50/80 to-green-50/80 hover:border-emerald-400'
                                  : 'border-slate-300 bg-gradient-to-br from-slate-50/80 to-gray-50/80 hover:border-slate-400'
                              }`}
                            >
                              {editingPackage?.id === pkg.id ? (
                                <form onSubmit={handleUpdatePackage} className="space-y-4">
                                  <input
                                    type="text"
                                    value={editingPackage.name}
                                    onChange={(e) => setEditingPackage({ ...editingPackage, name: e.target.value })}
                                    className="w-full p-3 border-2 border-purple-300 rounded-xl text-lg font-bold text-slate-800 bg-white/80"
                                    required
                                  />
                                  <input
                                    type="text"
                                    value={editingPackage.description}
                                    onChange={(e) => setEditingPackage({ ...editingPackage, description: e.target.value })}
                                    className="w-full p-3 border-2 border-slate-300 rounded-xl text-slate-600 bg-white/80"
                                    required
                                  />
                                  <div className="grid grid-cols-2 gap-4">
                                    <input
                                      type="number"
                                      value={editingPackage.tokenAmount}
                                      onChange={(e) => setEditingPackage({ ...editingPackage, tokenAmount: parseInt(e.target.value) })}
                                      className="w-full p-3 border-2 border-slate-300 rounded-xl bg-white/80"
                                      min="1"
                                      required
                                    />
                                    <input
                                      type="number"
                                      value={editingPackage.price}
                                      onChange={(e) => setEditingPackage({ ...editingPackage, price: parseInt(e.target.value) })}
                                      className="w-full p-3 border-2 border-slate-300 rounded-xl bg-white/80"
                                      min="1"
                                      required
                                    />
                                  </div>
                                  <div className="flex space-x-3">
                                    <button
                                      type="submit"
                                      className="flex-1 px-4 py-3 bg-gradient-to-r from-purple-500 to-violet-600 text-white rounded-xl hover:from-purple-600 hover:to-violet-700 transition-all duration-300 font-semibold"
                                    >
                                      Save
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setEditingPackage(null)}
                                      className="flex-1 px-4 py-3 bg-gradient-to-r from-slate-500 to-gray-600 text-white rounded-xl hover:from-slate-600 hover:to-gray-700 transition-all duration-300 font-semibold"
                                    >
                                      Cancel
                                    </button>
                                  </div>
                                </form>
                              ) : (
                                <>
                                  <div className="flex justify-between items-start mb-4">
                                    <div>
                                      <h4 className="text-xl font-bold text-slate-800">{pkg.name}</h4>
                                      <p className="text-slate-600 text-sm mt-1">{pkg.description}</p>
                                    </div>
                                    <span className={`px-3 py-1 rounded-xl text-sm font-semibold border backdrop-blur-sm ${getStatusBadge(pkg.isActive)}`}>
                                      {pkg.isActive ? 'Active' : 'Inactive'}
                                    </span>
                                  </div>
                                  
                                  <div className="space-y-4 mb-6">
                                    <div className="flex justify-between items-center">
                                      <span className="text-slate-600">Token Amount:</span>
                                      <span className="text-xl font-bold text-slate-800">{formatNumber(pkg.tokenAmount)} tokens</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                      <span className="text-slate-600">Price:</span>
                                      <span className="text-xl font-bold text-slate-800">{formatPrice(pkg.price)}</span>
                                    </div>
                                    <div className="text-sm text-slate-500">
                                      <i className="far fa-clock mr-2"></i>
                                      Created {formatDate(pkg.createdAt)}
                                    </div>
                                  </div>
                                  
                                  <div className="flex space-x-3">
                                    <button
                                      onClick={() => setEditingPackage(pkg)}
                                      className="flex-1 px-4 py-3 bg-gradient-to-r from-purple-500 to-violet-600 text-white rounded-xl hover:from-purple-600 hover:to-violet-700 transition-all duration-300 font-semibold"
                                    >
                                      <i className="fas fa-edit mr-2"></i>
                                      Edit
                                    </button>
                                    <button
                                      onClick={() => handleTogglePackage(pkg)}
                                      className={`flex-1 px-4 py-3 rounded-xl transition-all duration-300 font-semibold ${
                                        pkg.isActive
                                          ? 'bg-gradient-to-r from-amber-500 to-yellow-600 text-white hover:from-amber-600 hover:to-yellow-700'
                                          : 'bg-gradient-to-r from-emerald-500 to-green-600 text-white hover:from-emerald-600 hover:to-green-700'
                                      }`}
                                    >
                                      <i className={`fas fa-${pkg.isActive ? 'pause' : 'play'} mr-2`}></i>
                                      {pkg.isActive ? 'Deactivate' : 'Activate'}
                                    </button>
                                    <button
                                      onClick={() => handleDeletePackage(pkg)}
                                      className="px-4 py-3 bg-gradient-to-r from-rose-500 to-red-600 text-white rounded-xl hover:from-rose-600 hover:to-red-700 transition-all duration-300 font-semibold"
                                    >
                                      <i className="fas fa-trash"></i>
                                    </button>
                                  </div>
                                </>
                              )}
                            </div>
                          ))}
                        </div>

                        {/* Pagination */}
                        {totalPackagePages > 1 && (
                          <div className="flex justify-center items-center mt-8 space-x-4">
                            <button
                              onClick={() => paginatePackages(currentPackagePage - 1)}
                              disabled={currentPackagePage === 1}
                              className="px-4 py-2 bg-gradient-to-r from-slate-100 to-purple-100 border border-slate-300 rounded-xl hover:from-purple-100 hover:to-violet-100 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300"
                            >
                              <i className="fas fa-chevron-left mr-2"></i>
                              Previous
                            </button>
                            <div className="flex space-x-2">
                              {Array.from({ length: totalPackagePages }, (_, i) => i + 1).map(number => (
                                <button
                                  key={number}
                                  onClick={() => paginatePackages(number)}
                                  className={`w-10 h-10 rounded-xl transition-all duration-300 ${
                                    currentPackagePage === number
                                      ? 'bg-gradient-to-r from-purple-500 to-violet-600 text-white shadow-lg'
                                      : 'bg-gradient-to-r from-slate-100 to-purple-100 border border-slate-300 hover:from-purple-100 hover:to-violet-100'
                                  }`}
                                >
                                  {number}
                                </button>
                              ))}
                            </div>
                            <button
                              onClick={() => paginatePackages(currentPackagePage + 1)}
                              disabled={currentPackagePage === totalPackagePages}
                              className="px-4 py-2 bg-gradient-to-r from-slate-100 to-purple-100 border border-slate-300 rounded-xl hover:from-purple-100 hover:to-violet-100 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300"
                            >
                              Next
                              <i className="fas fa-chevron-right ml-2"></i>
                            </button>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              )}

              {/* USAGE RATES TAB */}
              {activeTab === 'rates' && (
                <div className="space-y-8">
                  {/* Create New Rate Form */}
                  <div className="bg-gradient-to-br from-purple-50/80 to-violet-50/80 rounded-2xl p-6 md:p-8 border border-purple-300 backdrop-blur-sm">
                    <h3 className="text-xl font-bold text-slate-800 mb-6 flex items-center">
                      <i className="fas fa-plus-circle mr-4 text-purple-500"></i>
                      Create New Usage Rate
                    </h3>
                    <form onSubmit={handleCreateRate} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-base font-semibold text-slate-700 mb-3">Service Name</label>
                        <input
                          type="text"
                          value={newRate.service}
                          onChange={(e) => setNewRate({ ...newRate, service: e.target.value })}
                          className="w-full p-4 border-2 border-slate-300 rounded-xl focus:border-purple-500 focus:ring-4 focus:ring-purple-100 transition-all duration-200 text-lg bg-white/80 backdrop-blur-sm"
                          placeholder="e.g., cbt_question"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-base font-semibold text-slate-700 mb-3">Unit</label>
                        <select
                          value={newRate.unit}
                          onChange={(e) => setNewRate({ ...newRate, unit: e.target.value })}
                          className="w-full p-4 border-2 border-slate-300 rounded-xl focus:border-purple-500 focus:ring-4 focus:ring-purple-100 transition-all duration-200 text-lg bg-white/80 backdrop-blur-sm cursor-pointer"
                          required
                        >
                          <option value="question">Question</option>
                          <option value="second">Second</option>
                          <option value="word">Word</option>
                          <option value="analysis">Analysis</option>
                          <option value="session">Session</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-base font-semibold text-slate-700 mb-3">Rate (tokens per unit)</label>
                        <input
                          type="number"
                          step="0.01"
                          value={newRate.rate}
                          onChange={(e) => setNewRate({ ...newRate, rate: parseFloat(e.target.value) })}
                          className="w-full p-4 border-2 border-slate-300 rounded-xl focus:border-purple-500 focus:ring-4 focus:ring-purple-100 transition-all duration-200 text-lg bg-white/80 backdrop-blur-sm"
                          min="0.01"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-base font-semibold text-slate-700 mb-3">Description</label>
                        <input
                          type="text"
                          value={newRate.description}
                          onChange={(e) => setNewRate({ ...newRate, description: e.target.value })}
                          className="w-full p-4 border-2 border-slate-300 rounded-xl focus:border-purple-500 focus:ring-4 focus:ring-purple-100 transition-all duration-200 text-lg bg-white/80 backdrop-blur-sm"
                          required
                        />
                      </div>
                      <div className="md:col-span-2">
                        <button
                          type="submit"
                          className="px-8 py-4 bg-gradient-to-r from-purple-500 to-violet-600 text-white rounded-2xl hover:from-purple-600 hover:to-violet-700 transition-all duration-300 flex items-center font-bold shadow-lg hover:shadow-xl transform hover:scale-105 cursor-pointer"
                        >
                          <i className="fas fa-plus mr-4"></i>
                          Create Usage Rate
                        </button>
                      </div>
                    </form>
                  </div>

                  {/* Rates List */}
                  <div>
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                      <h3 className="text-xl font-bold text-slate-800 flex items-center">
                        <i className="fas fa-tachometer-alt mr-4 text-purple-500"></i>
                        Current Usage Rates
                      </h3>
                      <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
                        <div className="relative flex-1 md:flex-none md:w-64">
                          <input
                            type="text"
                            value={rateSearch}
                            onChange={(e) => setRateSearch(e.target.value)}
                            className="w-full p-3 pl-10 border-2 border-slate-300 rounded-xl focus:border-purple-500 focus:ring-4 focus:ring-purple-100 bg-white/80 backdrop-blur-sm"
                            placeholder="Search rates..."
                          />
                          <i className="fas fa-search absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400"></i>
                        </div>
                        <span className="px-4 py-2 bg-gradient-to-r from-slate-100/80 to-purple-100/80 rounded-xl border border-slate-300 text-slate-700 font-semibold whitespace-nowrap">
                          {filteredRates.length} rate{filteredRates.length !== 1 ? 's' : ''}
                        </span>
                      </div>
                    </div>

                    {filteredRates.length === 0 ? (
                      <div className="text-center py-16 bg-gradient-to-br from-slate-50/80 to-purple-50/80 rounded-2xl border-2 border-dashed border-slate-400 backdrop-blur-sm">
                        <i className="fas fa-sliders-h text-5xl text-slate-400 mb-6"></i>
                        <p className="text-slate-500 text-xl mb-4 font-semibold">No usage rates found</p>
                        <p className="text-slate-400 text-lg">Create usage rates to define token consumption.</p>
                      </div>
                    ) : (
                      <>
                        <div className="space-y-6">
                          {currentRates.map((rate) => (
                            <div
                              key={rate.id}
                              className={`border-2 rounded-2xl p-6 transition-all duration-300 hover:shadow-xl backdrop-blur-sm ${
                                rate.isActive
                                  ? 'border-purple-300 bg-gradient-to-br from-purple-50/80 to-violet-50/80 hover:border-purple-400'
                                  : 'border-slate-300 bg-gradient-to-br from-slate-50/80 to-gray-50/80 hover:border-slate-400'
                              }`}
                            >
                              {editingRate?.id === rate.id ? (
                                <form onSubmit={handleUpdateRate} className="space-y-4">
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <input
                                      type="text"
                                      value={editingRate.service}
                                      onChange={(e) => setEditingRate({ ...editingRate, service: e.target.value })}
                                      className="p-3 border-2 border-purple-300 rounded-xl text-lg font-bold text-slate-800 bg-white/80"
                                      required
                                    />
                                    <select
                                      value={editingRate.unit}
                                      onChange={(e) => setEditingRate({ ...editingRate, unit: e.target.value })}
                                      className="p-3 border-2 border-slate-300 rounded-xl bg-white/80 cursor-pointer"
                                      required
                                    >
                                      <option value="question">Question</option>
                                      <option value="second">Second</option>
                                      <option value="word">Word</option>
                                      <option value="analysis">Analysis</option>
                                      <option value="session">Session</option>
                                    </select>
                                  </div>
                                  <input
                                    type="text"
                                    value={editingRate.description}
                                    onChange={(e) => setEditingRate({ ...editingRate, description: e.target.value })}
                                    className="w-full p-3 border-2 border-slate-300 rounded-xl text-slate-600 bg-white/80"
                                    required
                                  />
                                  <div className="grid grid-cols-2 gap-4">
                                    <input
                                      type="number"
                                      step="0.01"
                                      value={editingRate.rate}
                                      onChange={(e) => setEditingRate({ ...editingRate, rate: parseFloat(e.target.value) })}
                                      className="p-3 border-2 border-slate-300 rounded-xl bg-white/80"
                                      min="0.01"
                                      required
                                    />
                                    <div className="flex space-x-3">
                                      <button
                                        type="submit"
                                        className="flex-1 px-4 py-3 bg-gradient-to-r from-purple-500 to-violet-600 text-white rounded-xl hover:from-purple-600 hover:to-violet-700 transition-all duration-300 font-semibold"
                                      >
                                        Save
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => setEditingRate(null)}
                                        className="flex-1 px-4 py-3 bg-gradient-to-r from-slate-500 to-gray-600 text-white rounded-xl hover:from-slate-600 hover:to-gray-700 transition-all duration-300 font-semibold"
                                      >
                                        Cancel
                                      </button>
                                    </div>
                                  </div>
                                </form>
                              ) : (
                                <>
                                  <div className="flex justify-between items-start mb-4">
                                    <div>
                                      <h4 className="text-xl font-bold text-slate-800">{rate.service}</h4>
                                      <p className="text-slate-600 text-sm mt-1">{rate.description}</p>
                                    </div>
                                    <span className={`px-3 py-1 rounded-xl text-sm font-semibold border backdrop-blur-sm ${getStatusBadge(rate.isActive)}`}>
                                      {rate.isActive ? 'Active' : 'Inactive'}
                                    </span>
                                  </div>
                                  
                                  <div className="grid grid-cols-2 gap-6 mb-6">
                                    <div>
                                      <div className="text-slate-600 text-sm mb-1">Rate per unit:</div>
                                      <div className="text-2xl font-bold text-slate-800">{rate.rate} tokens</div>
                                    </div>
                                    <div>
                                      <div className="text-slate-600 text-sm mb-1">Unit:</div>
                                      <div className="text-lg font-semibold text-slate-800 capitalize">{rate.unit}</div>
                                    </div>
                                  </div>
                                  
                                  <div className="flex space-x-3">
                                    <button
                                      onClick={() => setEditingRate(rate)}
                                      className="flex-1 px-4 py-3 bg-gradient-to-r from-purple-500 to-violet-600 text-white rounded-xl hover:from-purple-600 hover:to-violet-700 transition-all duration-300 font-semibold"
                                    >
                                      <i className="fas fa-edit mr-2"></i>
                                      Edit
                                    </button>
                                    <button
                                      onClick={() => handleToggleRate(rate)}
                                      className={`flex-1 px-4 py-3 rounded-xl transition-all duration-300 font-semibold ${
                                        rate.isActive
                                          ? 'bg-gradient-to-r from-amber-500 to-yellow-600 text-white hover:from-amber-600 hover:to-yellow-700'
                                          : 'bg-gradient-to-r from-emerald-500 to-green-600 text-white hover:from-emerald-600 hover:to-green-700'
                                      }`}
                                    >
                                      <i className={`fas fa-${rate.isActive ? 'pause' : 'play'} mr-2`}></i>
                                      {rate.isActive ? 'Deactivate' : 'Activate'}
                                    </button>
                                  </div>
                                </>
                              )}
                            </div>
                          ))}
                        </div>

                        {/* Pagination */}
                        {totalRatePages > 1 && (
                          <div className="flex justify-center items-center mt-8 space-x-4">
                            <button
                              onClick={() => paginateRates(currentRatePage - 1)}
                              disabled={currentRatePage === 1}
                              className="px-4 py-2 bg-gradient-to-r from-slate-100 to-purple-100 border border-slate-300 rounded-xl hover:from-purple-100 hover:to-violet-100 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300"
                            >
                              <i className="fas fa-chevron-left mr-2"></i>
                              Previous
                            </button>
                            <div className="flex space-x-2">
                              {Array.from({ length: totalRatePages }, (_, i) => i + 1).map(number => (
                                <button
                                  key={number}
                                  onClick={() => paginateRates(number)}
                                  className={`w-10 h-10 rounded-xl transition-all duration-300 ${
                                    currentRatePage === number
                                      ? 'bg-gradient-to-r from-purple-500 to-violet-600 text-white shadow-lg'
                                      : 'bg-gradient-to-r from-slate-100 to-purple-100 border border-slate-300 hover:from-purple-100 hover:to-violet-100'
                                  }`}
                                >
                                  {number}
                                </button>
                              ))}
                            </div>
                            <button
                              onClick={() => paginateRates(currentRatePage + 1)}
                              disabled={currentRatePage === totalRatePages}
                              className="px-4 py-2 bg-gradient-to-r from-slate-100 to-purple-100 border border-slate-300 rounded-xl hover:from-purple-100 hover:to-violet-100 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300"
                            >
                              Next
                              <i className="fas fa-chevron-right ml-2"></i>
                            </button>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              )}

              {/* ASSIGN TOKENS TAB */}
              {activeTab === 'assign' && (
                <div className="space-y-8">
                  {/* Assign Tokens Form */}
                  <div className="bg-gradient-to-br from-purple-50/80 to-violet-50/80 rounded-2xl p-6 md:p-8 border border-purple-300 backdrop-blur-sm">
                    <h3 className="text-xl font-bold text-slate-800 mb-6 flex items-center">
                      <i className="fas fa-gift mr-4 text-purple-500"></i>
                      Assign Tokens to Users
                    </h3>
                    <form onSubmit={handleAssignTokens} className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <label className="block text-base font-semibold text-slate-700 mb-3">Select User</label>
                          <select
                            value={assignForm.userId}
                            onChange={(e) => setAssignForm({ ...assignForm, userId: e.target.value })}
                            className="w-full p-4 border-2 border-slate-300 rounded-xl focus:border-purple-500 focus:ring-4 focus:ring-purple-100 transition-all duration-200 text-lg bg-white/80 backdrop-blur-sm cursor-pointer"
                            required
                          >
                            <option value="">Choose a user...</option>
                            {users.map(user => (
                              <option key={user.id} value={user.id}>
                                {user.name || user.email} ({user.tokenBalance} tokens)
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-base font-semibold text-slate-700 mb-3">Token Amount</label>
                          <input
                            type="number"
                            value={assignForm.amount}
                            onChange={(e) => setAssignForm({ ...assignForm, amount: parseInt(e.target.value) })}
                            className="w-full p-4 border-2 border-slate-300 rounded-xl focus:border-purple-500 focus:ring-4 focus:ring-purple-100 transition-all duration-200 text-lg bg-white/80 backdrop-blur-sm"
                            min="1"
                            required
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-base font-semibold text-slate-700 mb-3">Reason for Assignment</label>
                        <input
                          type="text"
                          value={assignForm.reason}
                          onChange={(e) => setAssignForm({ ...assignForm, reason: e.target.value })}
                          className="w-full p-4 border-2 border-slate-300 rounded-xl focus:border-purple-500 focus:ring-4 focus:ring-purple-100 transition-all duration-200 text-lg bg-white/80 backdrop-blur-sm"
                          placeholder="e.g., Welcome bonus, Promotional tokens, Compensation"
                          required
                        />
                      </div>
                      <div>
                        <button
                          type="submit"
                          className="px-8 py-4 bg-gradient-to-r from-purple-500 to-violet-600 text-white rounded-2xl hover:from-purple-600 hover:to-violet-700 transition-all duration-300 flex items-center font-bold shadow-lg hover:shadow-xl transform hover:scale-105 cursor-pointer"
                        >
                          <i className="fas fa-paper-plane mr-4"></i>
                          Assign Tokens
                        </button>
                      </div>
                    </form>
                  </div>

                  {/* Users List */}
                  <div>
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                      <h3 className="text-xl font-bold text-slate-800 flex items-center">
                        <i className="fas fa-users mr-4 text-purple-500"></i>
                        User Directory
                      </h3>
                      <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
                        <div className="relative flex-1 md:flex-none md:w-64">
                          <input
                            type="text"
                            value={userSearch}
                            onChange={(e) => setUserSearch(e.target.value)}
                            className="w-full p-3 pl-10 border-2 border-slate-300 rounded-xl focus:border-purple-500 focus:ring-4 focus:ring-purple-100 bg-white/80 backdrop-blur-sm"
                            placeholder="Search users..."
                          />
                          <i className="fas fa-search absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400"></i>
                        </div>
                        <span className="px-4 py-2 bg-gradient-to-r from-slate-100/80 to-purple-100/80 rounded-xl border border-slate-300 text-slate-700 font-semibold whitespace-nowrap">
                          {filteredUsers.length} user{filteredUsers.length !== 1 ? 's' : ''}
                        </span>
                      </div>
                    </div>

                    {filteredUsers.length === 0 ? (
                      <div className="text-center py-16 bg-gradient-to-br from-slate-50/80 to-purple-50/80 rounded-2xl border-2 border-dashed border-slate-400 backdrop-blur-sm">
                        <i className="fas fa-user-friends text-5xl text-slate-400 mb-6"></i>
                        <p className="text-slate-500 text-xl mb-4 font-semibold">No users found</p>
                        <p className="text-slate-400 text-lg">User data will appear here.</p>
                      </div>
                    ) : (
                      <>
                        <div className="overflow-x-auto rounded-2xl border border-slate-300">
                          <div className="min-w-full">
                            <div className="bg-gradient-to-r from-slate-100/80 to-purple-100/80 rounded-t-2xl p-4 md:p-0">
                              <div className="hidden md:grid md:grid-cols-5 gap-4 py-5 px-6">
                                <div className="font-bold text-slate-700 flex items-center justify-center">
                                  <i className="fas fa-user mr-3"></i>
                                  User
                                </div>
                                <div className="font-bold text-slate-700 flex items-center justify-center">
                                  <i className="fas fa-shield-alt mr-3"></i>
                                  Role
                                </div>
                                <div className="font-bold text-slate-700 flex items-center justify-center">
                                  <i className="fas fa-coins mr-3"></i>
                                  Token Balance
                                </div>
                                <div className="font-bold text-slate-700 flex items-center justify-center">
                                  <i className="fas fa-calendar mr-3"></i>
                                  Last Active
                                </div>
                                <div className="font-bold text-slate-700 flex items-center justify-center">
                                  <i className="fas fa-cog mr-3"></i>
                                  Actions
                                </div>
                              </div>
                            </div>
                            
                            <div className="divide-y divide-slate-200">
                              {currentUsers.map((user, index) => (
                                <div
                                  key={user.id}
                                  className={`transition-all duration-300 hover:bg-gradient-to-r hover:from-purple-50/50 hover:to-violet-50/50 p-4 md:p-0 ${
                                    index % 2 === 0 ? 'bg-gradient-to-r from-white/80 to-slate-50/80' : 'bg-gradient-to-r from-white/80 to-purple-50/80'
                                  }`}
                                >
                                  {/* Mobile View */}
                                  <div className="md:hidden space-y-4 p-4">
                                    <div className="flex justify-between items-center">
                                      <div className="flex items-center">
                                        <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-violet-600 rounded-full flex items-center justify-center mr-3">
                                          <span className="text-white font-bold">
                                            {(user.name?.[0] || user.email?.[0] || 'U').toUpperCase()}
                                          </span>
                                        </div>
                                        <div>
                                          <div className="font-semibold text-slate-800">{user.name || 'No Name'}</div>
                                          <div className="text-sm text-slate-500 truncate max-w-[200px]">{user.email}</div>
                                        </div>
                                      </div>
                                      <span className={`px-3 py-1 rounded-xl text-xs font-semibold border backdrop-blur-sm ${getRoleBadge(user.role)}`}>
                                        {user.role}
                                      </span>
                                    </div>
                                    
                                    <div className="grid grid-cols-2 gap-4">
                                      <div>
                                        <div className="text-sm text-slate-600 mb-1">Token Balance:</div>
                                        <div className="flex items-center">
                                          <span className="font-bold text-lg text-amber-600 mr-2">
                                            {formatNumber(user.tokenBalance)}
                                          </span>
                                          <span className="text-slate-500 text-sm">tokens</span>
                                        </div>
                                      </div>
                                      <div>
                                        <div className="text-sm text-slate-600 mb-1">Last Active:</div>
                                        <div className="text-slate-700">
                                          {user.lastActive ? formatDate(user.lastActive) : 'Never'}
                                        </div>
                                      </div>
                                    </div>
                                    
                                    <button
                                      onClick={() => {
                                        setAssignForm({
                                          userId: user.id,
                                          amount: 100,
                                          reason: 'Manual assignment'
                                        });
                                        window.scrollTo({ top: 0, behavior: 'smooth' });
                                      }}
                                      className="w-full px-4 py-2 bg-gradient-to-r from-purple-500 to-violet-600 text-white rounded-xl hover:from-purple-600 hover:to-violet-700 transition-all duration-300 flex items-center justify-center text-sm font-semibold"
                                    >
                                      <i className="fas fa-gift mr-2"></i>
                                      Assign Tokens
                                    </button>
                                  </div>
                                  
                                  {/* Desktop View */}
                                  <div className="hidden md:grid md:grid-cols-5 gap-4 py-5 px-6">
                                    <td className="py-5 px-6">
                                      <div className="flex items-center">
                                        <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-violet-600 rounded-full flex items-center justify-center mr-3">
                                          <span className="text-white font-bold">
                                            {(user.name?.[0] || user.email?.[0] || 'U').toUpperCase()}
                                          </span>
                                        </div>
                                        <div>
                                          <div className="font-semibold text-slate-800">{user.name || 'No Name'}</div>
                                          <div className="text-sm text-slate-500">{user.email}</div>
                                        </div>
                                      </div>
                                    </td>
                                    <td className="py-5 px-6">
                                      <span className={`px-3 py-1 rounded-xl text-sm font-semibold border backdrop-blur-sm ${getRoleBadge(user.role)}`}>
                                        {user.role}
                                      </span>
                                    </td>
                                    <td className="py-5 px-6">
                                      <div className="flex items-center">
                                        <span className="font-bold text-xl text-amber-600 mr-3">
                                          {formatNumber(user.tokenBalance)}
                                        </span>
                                        <span className="text-slate-500 font-semibold">tokens</span>
                                      </div>
                                    </td>
                                    <td className="py-5 px-6">
                                      <div className="text-slate-700">
                                        {user.lastActive ? formatDate(user.lastActive) : 'Never'}
                                      </div>
                                    </td>
                                    <td className="py-5 px-6">
                                      <button
                                        onClick={() => {
                                          setAssignForm({
                                            userId: user.id,
                                            amount: 100,
                                            reason: 'Manual assignment'
                                          });
                                          window.scrollTo({ top: 0, behavior: 'smooth' });
                                        }}
                                        className="px-4 py-2 bg-gradient-to-r from-purple-500 to-violet-600 text-white rounded-xl hover:from-purple-600 hover:to-violet-700 transition-all duration-300 flex items-center text-sm font-semibold"
                                      >
                                        <i className="fas fa-gift mr-2"></i>
                                        Assign Tokens
                                      </button>
                                    </td>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>

                        {/* Pagination */}
                        {totalUserPages > 1 && (
                          <div className="flex justify-center items-center mt-8 space-x-4">
                            <button
                              onClick={() => paginateUsers(currentUserPage - 1)}
                              disabled={currentUserPage === 1}
                              className="px-4 py-2 bg-gradient-to-r from-slate-100 to-purple-100 border border-slate-300 rounded-xl hover:from-purple-100 hover:to-violet-100 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300"
                            >
                              <i className="fas fa-chevron-left mr-2"></i>
                              Previous
                            </button>
                            <div className="flex space-x-2">
                              {Array.from({ length: totalUserPages }, (_, i) => i + 1).map(number => (
                                <button
                                  key={number}
                                  onClick={() => paginateUsers(number)}
                                  className={`w-10 h-10 rounded-xl transition-all duration-300 ${
                                    currentUserPage === number
                                      ? 'bg-gradient-to-r from-purple-500 to-violet-600 text-white shadow-lg'
                                      : 'bg-gradient-to-r from-slate-100 to-purple-100 border border-slate-300 hover:from-purple-100 hover:to-violet-100'
                                  }`}
                                >
                                  {number}
                                </button>
                              ))}
                            </div>
                            <button
                              onClick={() => paginateUsers(currentUserPage + 1)}
                              disabled={currentUserPage === totalUserPages}
                              className="px-4 py-2 bg-gradient-to-r from-slate-100 to-purple-100 border border-slate-300 rounded-xl hover:from-purple-100 hover:to-violet-100 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300"
                            >
                              Next
                              <i className="fas fa-chevron-right ml-2"></i>
                            </button>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              )}

              {/* ANALYTICS TAB */}
              {activeTab === 'analytics' && (
                <div>
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                    <h3 className="text-xl font-bold text-slate-800 flex items-center">
                      <i className="fas fa-chart-pie mr-4 text-purple-500"></i>
                      Token Analytics Dashboard
                    </h3>
                    <div className="flex items-center space-x-4">
                      <div className="px-4 py-2 bg-gradient-to-r from-emerald-100 to-green-100 border border-emerald-300 rounded-xl">
                        <div className="flex items-center">
                          <i className="fas fa-sync-alt text-emerald-600 mr-2"></i>
                          <span className="text-emerald-800 font-semibold">Auto-refresh: 5min</span>
                        </div>
                      </div>
                      <button
                        onClick={fetchAnalytics}
                        className="px-4 py-2 bg-gradient-to-r from-purple-500 to-violet-600 text-white rounded-xl hover:from-purple-600 hover:to-violet-700 transition-all duration-300 flex items-center"
                      >
                        <i className="fas fa-redo mr-2"></i>
                        Refresh
                      </button>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Revenue Breakdown */}
                    <div className="bg-gradient-to-br from-white/80 to-purple-50/80 rounded-2xl p-6 md:p-8 border border-purple-300 backdrop-blur-sm">
                      <h4 className="font-bold text-lg text-slate-800 mb-6 flex items-center">
                        <i className="fas fa-chart-line mr-3 text-emerald-500"></i>
                        Revenue Breakdown
                      </h4>
                      <div className="space-y-6">
                        <div>
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-slate-600">Total Revenue:</span>
                            <span className="text-xl font-bold text-emerald-600">{formatPrice(analytics.totalRevenue)}</span>
                          </div>
                          <div className="w-full bg-slate-200 rounded-full h-2">
                            <div 
                              className="bg-gradient-to-r from-emerald-500 to-green-600 h-2 rounded-full" 
                              style={{ width: '100%' }}
                            ></div>
                          </div>
                        </div>
                        <div>
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-slate-600">Average Price per Token:</span>
                            <span className="font-semibold text-slate-800">
                              {analytics.totalTokensSold > 0 
                                ? formatPrice(Math.round(analytics.totalRevenue / analytics.totalTokensSold * 100))
                                : 'N/A'}
                            </span>
                          </div>
                          <div className="w-full bg-slate-200 rounded-full h-2">
                            <div 
                              className="bg-gradient-to-r from-blue-500 to-indigo-600 h-2 rounded-full" 
                              style={{ width: '75%' }}
                            ></div>
                          </div>
                        </div>
                        <div>
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-slate-600">Revenue per Active User:</span>
                            <span className="font-semibold text-slate-800">
                              {analytics.totalUsers > 0 
                                ? formatPrice(Math.round(analytics.totalRevenue / analytics.totalUsers))
                                : 'N/A'}
                            </span>
                          </div>
                          <div className="w-full bg-slate-200 rounded-full h-2">
                            <div 
                              className="bg-gradient-to-r from-purple-500 to-violet-600 h-2 rounded-full" 
                              style={{ width: '60%' }}
                            ></div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* User Statistics */}
                    <div className="bg-gradient-to-br from-white/80 to-blue-50/80 rounded-2xl p-6 md:p-8 border border-blue-300 backdrop-blur-sm">
                      <h4 className="font-bold text-lg text-slate-800 mb-6 flex items-center">
                        <i className="fas fa-users mr-3 text-blue-500"></i>
                        User Statistics
                      </h4>
                      <div className="space-y-6">
                        <div>
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-slate-600">Total Users:</span>
                            <span className="text-xl font-bold text-blue-600">{formatNumber(analytics.totalUsers)}</span>
                          </div>
                          <div className="w-full bg-slate-200 rounded-full h-2">
                            <div 
                              className="bg-gradient-to-r from-blue-500 to-indigo-600 h-2 rounded-full" 
                              style={{ width: `${Math.min(100, analytics.totalUsers / 1000 * 100)}%` }}
                            ></div>
                          </div>
                        </div>
                        <div>
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-slate-600">Avg Tokens per User:</span>
                            <span className="font-semibold text-slate-800">
                              {analytics.totalUsers > 0 
                                ? formatNumber(Math.round(analytics.totalTokensSold / analytics.totalUsers))
                                : '0'} tokens
                            </span>
                          </div>
                          <div className="w-full bg-slate-200 rounded-full h-2">
                            <div 
                              className="bg-gradient-to-r from-purple-500 to-violet-600 h-2 rounded-full" 
                              style={{ width: `${Math.min(100, (analytics.totalTokensSold / analytics.totalUsers) / 1000 * 100)}%` }}
                            ></div>
                          </div>
                        </div>
                        <div>
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-slate-600">Active Packages:</span>
                            <span className="font-bold text-emerald-600">{analytics.activePackages}</span>
                          </div>
                          <div className="w-full bg-slate-200 rounded-full h-2">
                            <div 
                              className="bg-gradient-to-r from-emerald-500 to-green-600 h-2 rounded-full" 
                              style={{ width: `${Math.min(100, analytics.activePackages / 20 * 100)}%` }}
                            ></div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Token Distribution */}
                    <div className="lg:col-span-2 bg-gradient-to-br from-white/80 to-amber-50/80 rounded-2xl p-6 md:p-8 border border-amber-300 backdrop-blur-sm">
                      <h4 className="font-bold text-lg text-slate-800 mb-6 flex items-center">
                        <i className="fas fa-coins mr-3 text-amber-500"></i>
                        Token Distribution
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="text-center p-6 bg-gradient-to-br from-white/50 to-amber-50/50 rounded-2xl border border-amber-200">
                          <div className="text-4xl font-bold text-amber-600 mb-2">{formatNumber(analytics.totalTokensSold)}</div>
                          <div className="text-slate-700 font-semibold">Total Tokens Sold</div>
                          <div className="text-sm text-slate-500 mt-2">Lifetime sales</div>
                        </div>
                        <div className="text-center p-6 bg-gradient-to-br from-white/50 to-emerald-50/50 rounded-2xl border border-emerald-200">
                          <div className="text-4xl font-bold text-emerald-600 mb-2">
                            {analytics.totalTokensSold > 0 
                              ? Math.round(analytics.totalRevenue / analytics.totalTokensSold / 100)
                              : 0}
                          </div>
                          <div className="text-slate-700 font-semibold">Avg. ₦ per Token</div>
                          <div className="text-sm text-slate-500 mt-2">Average price</div>
                        </div>
                        <div className="text-center p-6 bg-gradient-to-br from-white/50 to-purple-50/50 rounded-2xl border border-purple-200">
                          <div className="text-4xl font-bold text-purple-600 mb-2">
                            {analytics.activePackages}
                          </div>
                          <div className="text-slate-700 font-semibold">Active Packages</div>
                          <div className="text-sm text-slate-500 mt-2">Currently available</div>
                        </div>
                      </div>
                    </div>

                    {/* Quick Actions */}
                    <div className="lg:col-span-2 bg-gradient-to-br from-white/80 to-slate-50/80 rounded-2xl p-6 md:p-8 border border-slate-300 backdrop-blur-sm">
                      <h4 className="font-bold text-lg text-slate-800 mb-6 flex items-center">
                        <i className="fas fa-bolt mr-3 text-purple-500"></i>
                        Quick Actions
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <button
                          onClick={() => setActiveTab('packages')}
                          className="p-4 bg-gradient-to-r from-purple-50 to-violet-50 border border-purple-300 rounded-xl hover:from-purple-100 hover:to-violet-100 transition-all duration-300 flex flex-col items-center"
                        >
                          <i className="fas fa-plus-circle text-2xl text-purple-500 mb-2"></i>
                          <span className="font-semibold text-slate-800">New Package</span>
                        </button>
                        <button
                          onClick={() => setActiveTab('rates')}
                          className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-300 rounded-xl hover:from-blue-100 hover:to-indigo-100 transition-all duration-300 flex flex-col items-center"
                        >
                          <i className="fas fa-tachometer-alt text-2xl text-blue-500 mb-2"></i>
                          <span className="font-semibold text-slate-800">New Rate</span>
                        </button>
                        <button
                          onClick={() => setActiveTab('assign')}
                          className="p-4 bg-gradient-to-r from-emerald-50 to-green-50 border border-emerald-300 rounded-xl hover:from-emerald-100 hover:to-green-100 transition-all duration-300 flex flex-col items-center"
                        >
                          <i className="fas fa-user-plus text-2xl text-emerald-500 mb-2"></i>
                          <span className="font-semibold text-slate-800">Assign Tokens</span>
                        </button>
                        <button
                          onClick={fetchAnalytics}
                          className="p-4 bg-gradient-to-r from-amber-50 to-yellow-50 border border-amber-300 rounded-xl hover:from-amber-100 hover:to-yellow-100 transition-all duration-300 flex flex-col items-center"
                        >
                          <i className="fas fa-redo text-2xl text-amber-500 mb-2"></i>
                          <span className="font-semibold text-slate-800">Refresh Data</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>

      {/* Loading Popup
      {showLoadingPopup && (
        <div className="fixed inset-0 bg-white/40 dark:bg-black/30 backdrop-blur-lg flex items-center justify-center z-50">
          <div className="bg-gradient-to-br from-white/95 to-purple-50/95 rounded-2xl p-6 md:p-8 flex flex-col items-center min-w-[300px] md:min-w-[400px] max-w-md mx-4 border border-purple-300 shadow-xl backdrop-blur-sm">
            <div className="relative mb-4 md:mb-6">
              <div className="animate-spin rounded-full h-12 w-12 md:h-14 md:w-14 border-b-2 border-purple-500"></div>
              <div className="absolute inset-0 rounded-full h-12 w-12 md:h-14 md:w-14 border-t-2 border-purple-300 animate-pulse"></div>
            </div>
            <p className="text-slate-800 font-bold mb-2 md:mb-3 text-center text-base md:text-lg">{loadingMessage}</p>
            <p className="text-slate-500 text-xs md:text-sm text-center">Please wait...</p>
          </div>
        </div>
      )} */}

      {/* Footer */}
      <footer className="fixed bottom-0 left-0 right-0 z-10 bg-gradient-to-r from-purple-50 to-violet-50 dark:from-gray-900 dark:to-gray-800 border-t border-purple-100 dark:border-gray-700 py-4 md:py-6">
        <div className="max-w-7xl mx-auto px-4 md:px-6 text-center text-xs md:text-sm text-slate-600">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="mb-2 md:mb-0">
              © 2025 Acemedix Academy Admin Dashboard. All rights reserved.
            </div>
            <div className="flex items-center space-x-4">
              <span className="flex items-center">
                <i className="fas fa-user-shield text-purple-500 mr-2"></i>
                Administrator Mode
              </span>
              <span className="hidden md:inline">|</span>
              <span className="text-slate-500">
                Last updated: {new Date().toLocaleDateString()}
              </span>
            </div>
          </div>
        </div>
      </footer>
    </>
  );
};

export default AdminTokensPage;