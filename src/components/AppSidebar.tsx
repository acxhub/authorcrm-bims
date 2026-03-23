import {
  Calendar,
  Home,
  Users,
  BookOpen,
  PlusCircle,
  Settings,
  BarChart3,
  MessageSquare,
  Upload,
  DollarSign,
  Trophy,
  Receipt,
  CheckSquare,
  Archive,
  LogOut,
  ChevronUp,
  User,
  Gauge,
  Bell,
  Clock,
} from "lucide-react";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useAuth, useProfile } from "@/hooks/useAuth";
import { useNavigate, Link, useLocation } from "react-router-dom";

// Navigation items
const navigationItems = [
  {
    title: "Dashboard",
    url: "/",
    icon: Home,
  },
  {
    title: "Leads",
    url: "/leads",
    icon: Users,
  },
  {
    title: "Pipeline",
    url: "/pipeline",
    icon: BarChart3,
  },
  {
    title: "Sold Deals",
    url: "/sold-dashboard",
    icon: DollarSign,
  },
  {
    title: "Sales Board",
    url: "/sales-board",
    icon: Trophy,
  },
  {
    title: "Commissions",
    url: "/commissions",
    icon: Receipt,
  },
  {
    title: "Reminders",
    url: "/reminders",
    icon: CheckSquare,
  },
  {
    title: "Notifications",
    url: "/notifications",
    icon: Bell,
  },
];

const quickActions = [
  {
    title: "Add Lead",
    url: "/leads?action=create",
    icon: PlusCircle,
  },
  {
    title: "Import Leads",
    url: "/leads/import",
    icon: Upload,
  },
];

export function AppSidebar() {
  const { user, signOut } = useAuth();
  const { profile } = useProfile();
  const navigate = useNavigate();
  const location = useLocation();

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  const isActive = (path: string) => {
    if (path === '/') {
      return location.pathname === '/';
    }
    return location.pathname.startsWith(path);
  };

  return (
    <Sidebar className="border-r border-gray-200/60 bg-white/80 backdrop-blur-md">
      <SidebarHeader className="p-6">
        <div className="flex items-center space-x-3">
          <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
            <BookOpen className="h-5 w-5 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Author CRM</h2>
            <p className="text-xs text-gray-600">Manage your leads</p>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent className="px-4">
        <SidebarGroup>
          <SidebarGroupLabel className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">
            Navigation
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-1">
              {navigationItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={isActive(item.url)}
                    className="w-full justify-start gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200 hover:bg-blue-50 hover:text-blue-700 data-[active=true]:bg-blue-100 data-[active=true]:text-blue-700"
                  >
                    <Link to={item.url} className="flex items-center gap-3">
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
              {/* Leads Cockpit - leads_manager only */}
              {profile?.role === 'leads_manager' && (
                <SidebarMenuItem key="Leads Cockpit">
                  <SidebarMenuButton
                    asChild
                    isActive={isActive('/lead-manager')}
                    className="w-full justify-start gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200 hover:bg-blue-50 hover:text-blue-700 data-[active=true]:bg-blue-100 data-[active=true]:text-blue-700"
                  >
                    <Link to="/lead-manager" className="flex items-center gap-3">
                      <Gauge className="h-4 w-4" />
                      <span>Leads Cockpit</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
              {/* Admin pages - leads_manager and sales_manager */}
              {(profile?.role === 'leads_manager' || profile?.role === 'sales_manager') && (
                <>
                  <SidebarMenuItem key="Admin Panel">
                    <SidebarMenuButton
                      asChild
                      isActive={isActive('/admin')}
                      className="w-full justify-start gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200 hover:bg-blue-50 hover:text-blue-700 data-[active=true]:bg-blue-100 data-[active=true]:text-blue-700"
                    >
                      <Link to="/admin" className="flex items-center gap-3">
                        <Settings className="h-4 w-4" />
                        <span>Admin Panel</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem key="User Management">
                    <SidebarMenuButton
                      asChild
                      isActive={isActive('/admin/users')}
                      className="w-full justify-start gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200 hover:bg-blue-50 hover:text-blue-700 data-[active=true]:bg-blue-100 data-[active=true]:text-blue-700"
                    >
                      <Link to="/admin/users" className="flex items-center gap-3">
                        <Users className="h-4 w-4" />
                        <span>User Management</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem key="Archive">
                    <SidebarMenuButton
                      asChild
                      isActive={isActive('/admin/archive')}
                      className="w-full justify-start gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200 hover:bg-blue-50 hover:text-blue-700 data-[active=true]:bg-blue-100 data-[active=true]:text-blue-700"
                    >
                      <Link to="/admin/archive" className="flex items-center gap-3">
                        <Archive className="h-4 w-4" />
                        <span>Archive</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem key="Attendance Report">
                    <SidebarMenuButton
                      asChild
                      isActive={isActive('/admin/attendance')}
                      className="w-full justify-start gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200 hover:bg-blue-50 hover:text-blue-700 data-[active=true]:bg-blue-100 data-[active=true]:text-blue-700"
                    >
                      <Link to="/admin/attendance" className="flex items-center gap-3">
                        <Clock className="h-4 w-4" />
                        <span>Attendance</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </>
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarSeparator className="my-4" />

        <SidebarGroup>
          <SidebarGroupLabel className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">
            Quick Actions
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-1">
              {quickActions.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    className="w-full justify-start gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200 hover:bg-gray-50 hover:text-gray-700"
                  >
                    <Link to={item.url} className="flex items-center gap-3">
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-4">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center space-x-3 rounded-lg bg-gray-50/80 hover:bg-gray-100/80 p-3 w-full transition-colors">
              <Avatar className="h-9 w-9 border-2 border-white shadow-sm">
                <AvatarImage src={profile?.avatar_url || ""} />
                <AvatarFallback className="bg-blue-100 text-blue-700 text-sm font-medium">
                  {profile?.full_name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || 
                   user?.email?.charAt(0).toUpperCase() || "U"}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0 text-left">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {profile?.full_name || user?.email?.split('@')[0] || "User"}
                </p>
                <p className="text-xs text-gray-500 truncate capitalize">
                  {profile?.role?.replace('_', ' ') || "User"}
                </p>
              </div>
              <ChevronUp className="h-4 w-4 text-gray-400" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56" side="top">
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium">{profile?.full_name || "User"}</p>
                <p className="text-xs text-gray-500 truncate">{user?.email}</p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-red-600 focus:text-red-600 focus:bg-red-50 cursor-pointer" onClick={handleSignOut}>
              <LogOut className="mr-2 h-4 w-4" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
