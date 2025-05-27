
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Plus, Search, Filter, MoreHorizontal, Phone, Mail, Calendar } from "lucide-react";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";

const Index = () => {
  const [searchQuery, setSearchQuery] = useState("");

  // Mock data for demonstration
  const metrics = [
    { title: "Total Leads", value: "1,247", change: "+12%", trend: "up" },
    { title: "Active Deals", value: "89", change: "+23%", trend: "up" },
    { title: "Conversion Rate", value: "24.3%", change: "+2.1%", trend: "up" },
    { title: "Revenue This Month", value: "$142,850", change: "+18%", trend: "up" },
  ];

  const recentLeads = [
    {
      id: 1,
      name: "Sarah Johnson",
      email: "sarah.j@email.com",
      book: "Mystery Novel Series",
      status: "Hot Lead",
      lastActivity: "2 hours ago",
      avatar: "SJ"
    },
    {
      id: 2,
      name: "Mike Chen",
      email: "mike.chen@email.com",
      book: "Tech Startup Guide",
      status: "In Progress",
      lastActivity: "1 day ago",
      avatar: "MC"
    },
    {
      id: 3,
      name: "Emily Davis",
      email: "emily.d@email.com",
      book: "Romance Collection",
      status: "New Lead",
      lastActivity: "3 days ago",
      avatar: "ED"
    }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Hot Lead": return "bg-red-100 text-red-800 border-red-200";
      case "In Progress": return "bg-blue-100 text-blue-800 border-blue-200";
      case "New Lead": return "bg-green-100 text-green-800 border-green-200";
      default: return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const handleQuickAction = (action: string, leadName: string) => {
    toast({
      title: `${action} initiated`,
      description: `${action} for ${leadName} has been started.`,
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md border-b border-gray-200/60 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">Author CRM</h1>
              <p className="text-sm text-gray-600">Manage your author leads with elegance</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search leads..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 w-80 bg-white/60 backdrop-blur-sm border-gray-200/60 focus:bg-white transition-all duration-200"
                />
              </div>
              <Button variant="outline" size="sm" className="bg-white/60 backdrop-blur-sm">
                <Filter className="h-4 w-4 mr-2" />
                Filter
              </Button>
              <Button className="bg-blue-600 hover:bg-blue-700 transition-all duration-200 shadow-lg hover:shadow-xl">
                <Plus className="h-4 w-4 mr-2" />
                Add Lead
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Metrics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {metrics.map((metric, index) => (
            <Card key={metric.title} className="bg-white/60 backdrop-blur-sm border-gray-200/60 hover:bg-white/80 transition-all duration-300 hover:shadow-lg hover:scale-[1.02] animate-fade-in" style={{ animationDelay: `${index * 100}ms` }}>
              <CardHeader className="pb-3">
                <CardDescription className="text-sm font-medium text-gray-600">
                  {metric.title}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-baseline justify-between">
                  <div className="text-2xl font-semibold text-gray-900">{metric.value}</div>
                  <Badge variant="secondary" className="bg-green-100 text-green-800 border-green-200">
                    {metric.change}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Recent Leads */}
          <div className="lg:col-span-2">
            <Card className="bg-white/60 backdrop-blur-sm border-gray-200/60">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg font-semibold text-gray-900">Recent Leads</CardTitle>
                  <Button variant="ghost" size="sm" className="text-blue-600 hover:text-blue-700">
                    View All
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {recentLeads.map((lead, index) => (
                  <div
                    key={lead.id}
                    className="flex items-center justify-between p-4 rounded-xl bg-white/40 backdrop-blur-sm border border-gray-200/40 hover:bg-white/60 transition-all duration-200 hover:shadow-md animate-fade-in"
                    style={{ animationDelay: `${(index + 4) * 100}ms` }}
                  >
                    <div className="flex items-center space-x-4">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src="" />
                        <AvatarFallback className="bg-blue-100 text-blue-700 font-medium">
                          {lead.avatar}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-medium text-gray-900">{lead.name}</div>
                        <div className="text-sm text-gray-600">{lead.book}</div>
                        <div className="text-xs text-gray-500">{lead.lastActivity}</div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <Badge className={`${getStatusColor(lead.status)} font-medium`}>
                        {lead.status}
                      </Badge>
                      <div className="flex space-x-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 hover:bg-blue-100 transition-colors duration-200"
                          onClick={() => handleQuickAction("Call", lead.name)}
                        >
                          <Phone className="h-4 w-4 text-gray-600" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 hover:bg-blue-100 transition-colors duration-200"
                          onClick={() => handleQuickAction("Email", lead.name)}
                        >
                          <Mail className="h-4 w-4 text-gray-600" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 hover:bg-blue-100 transition-colors duration-200"
                        >
                          <MoreHorizontal className="h-4 w-4 text-gray-600" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* Activity Feed */}
          <div>
            <Card className="bg-white/60 backdrop-blur-sm border-gray-200/60">
              <CardHeader>
                <CardTitle className="text-lg font-semibold text-gray-900">Recent Activity</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  {[
                    { action: "New lead added", user: "Sarah Johnson", time: "2 hours ago", icon: Plus },
                    { action: "Call scheduled", user: "Mike Chen", time: "4 hours ago", icon: Calendar },
                    { action: "Email sent", user: "Emily Davis", time: "1 day ago", icon: Mail },
                  ].map((activity, index) => (
                    <div
                      key={index}
                      className="flex items-start space-x-3 p-3 rounded-lg bg-white/40 backdrop-blur-sm hover:bg-white/60 transition-all duration-200 animate-fade-in"
                      style={{ animationDelay: `${(index + 7) * 100}ms` }}
                    >
                      <div className="flex-shrink-0">
                        <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
                          <activity.icon className="h-4 w-4 text-blue-600" />
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900">{activity.action}</p>
                        <p className="text-sm text-gray-600">{activity.user}</p>
                        <p className="text-xs text-gray-500">{activity.time}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Index;
