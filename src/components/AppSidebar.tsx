import {
  Calendar,
  Home,
  Users,
  BookOpen,
  PlusCircle,
  Settings,
  BarChart3,
  MessageSquare,
  Search,
  Filter,
} from "lucide-react";
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

// Navigation items
const navigationItems = [
  {
    title: "Dashboard",
    url: "/",
    icon: Home,
    isActive: true,
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
    title: "Books",
    url: "/books",
    icon: BookOpen,
  },
  {
    title: "Calendar",
    url: "/calendar",
    icon: Calendar,
  },
  {
    title: "Messages",
    url: "/messages",
    icon: MessageSquare,
  },
];

const quickActions = [
  {
    title: "Add Lead",
    url: "/leads/new",
    icon: PlusCircle,
  },
  {
    title: "Search",
    url: "/search",
    icon: Search,
  },
  {
    title: "Filters",
    url: "/filters",
    icon: Filter,
  },
];

import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";

export function AppSidebar() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
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
                    isActive={item.isActive}
                    className="w-full justify-start gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200 hover:bg-blue-50 hover:text-blue-700 data-[active=true]:bg-blue-100 data-[active=true]:text-blue-700"
                  >
                    <a href={item.url} className="flex items-center gap-3">
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </a>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
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
                    <a href={item.url} className="flex items-center gap-3">
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </a>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-4">
        <div className="flex items-center space-x-3 rounded-lg bg-gray-50/80 p-3">
          <Avatar className="h-8 w-8">
            <AvatarImage src="" />
            <AvatarFallback className="bg-blue-100 text-blue-700 text-xs font-medium">
              {user?.email?.charAt(0).toUpperCase() || "U"}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">
              {user?.user_metadata?.full_name || user?.email?.split('@')[0] || "User"}
            </p>
            <p className="text-xs text-gray-600 truncate">{user?.email}</p>
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-8 w-8 p-0"
            onClick={handleSignOut}
            title="Sign out"
          >
            <Settings className="h-4 w-4" />
          </Button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
