import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Plus, 
  Search, 
  Filter, 
  MoreHorizontal, 
  Edit, 
  Trash2, 
  UserCheck, 
  UserX, 
  Key,
  AlertCircle,
  Users,
  Shield,
  Activity
} from 'lucide-react';
import { useUsers } from '@/hooks/useUsers';
import { useProfile } from '@/hooks/useAuth';
import { CreateUserForm } from './CreateUserForm';
import { EditUserForm } from './EditUserForm';
import type { UserProfile, UserRole, UsersFilter, CreateUserRequest, UpdateUserRequest } from '@/lib/api/users';

const roleLabels: Record<UserRole, string> = {
  leads_manager: 'Leads Manager',
  sales_manager: 'Sales Manager',
  sales: 'Sales',
};

const roleColors: Record<UserRole, string> = {
  leads_manager: 'bg-purple-100 text-purple-800',
  sales_manager: 'bg-blue-100 text-blue-800',
  sales: 'bg-green-100 text-green-800',
};

export const UserManagement: React.FC = () => {
  const { profile } = useProfile();
  const [filters, setFilters] = React.useState<UsersFilter>({});
  const [page, setPage] = React.useState(1);
  const [searchTerm, setSearchTerm] = React.useState('');
  const [showCreateDialog, setShowCreateDialog] = React.useState(false);
  const [editingUser, setEditingUser] = React.useState<UserProfile | null>(null);
  const [resetPasswordUser, setResetPasswordUser] = React.useState<UserProfile | null>(null);
  const [newPassword, setNewPassword] = React.useState('');

  const {
    users,
    total,
    loading,
    error,
    createUser,
    updateUser,
    deleteUser,
    toggleUserStatus,
    resetPassword,
    refresh,
  } = useUsers(filters, page, 10);

  // Check if current user has permission to manage users
  const canManageUsers = profile?.role === 'leads_manager' || profile?.role === 'sales_manager';

  React.useEffect(() => {
    const delayedSearch = setTimeout(() => {
      setFilters(prev => ({ ...prev, search: searchTerm || undefined }));
      setPage(1);
    }, 300);

    return () => clearTimeout(delayedSearch);
  }, [searchTerm]);

  const handleCreateUser = async (data: CreateUserRequest) => {
    const result = await createUser(data);
    if (result) {
      setShowCreateDialog(false);
    }
  };

  const handleUpdateUser = async (data: UpdateUserRequest) => {
    if (!editingUser) return;
    const result = await updateUser(editingUser.id, data);
    if (result) {
      setEditingUser(null);
    }
  };

  const handleDeleteUser = async (user: UserProfile) => {
    if (user.id === profile?.id) {
      alert('You cannot delete your own account');
      return;
    }
    await deleteUser(user.id);
  };

  const handleToggleStatus = async (user: UserProfile) => {
    if (user.id === profile?.id) {
      alert('You cannot deactivate your own account');
      return;
    }
    await toggleUserStatus(user.id);
  };

  const handleResetPassword = async () => {
    if (!resetPasswordUser || !newPassword) return;
    const success = await resetPassword(resetPasswordUser.id, newPassword);
    if (success) {
      setResetPasswordUser(null);
      setNewPassword('');
    }
  };

  const totalPages = Math.ceil(total / 10);

  if (!canManageUsers) {
    return (
      <Card className="w-full max-w-4xl mx-auto">
        <CardContent className="p-6">
          <Alert className="border-red-200 bg-red-50">
            <AlertCircle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800">
              Access Denied: Only Leads Managers can access user management.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">User Management</h1>
          <p className="text-muted-foreground">
            Manage system users, roles, and permissions
          </p>
        </div>
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add User
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create New User</DialogTitle>
              <DialogDescription>
                Add a new user to the system with appropriate permissions
              </DialogDescription>
            </DialogHeader>
            <CreateUserForm
              onSubmit={handleCreateUser}
              onCancel={() => setShowCreateDialog(false)}
              loading={loading}
            />
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Users className="h-8 w-8 text-blue-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Total Users</p>
                <p className="text-2xl font-bold">{total}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Shield className="h-8 w-8 text-purple-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Leads Managers</p>
                <p className="text-2xl font-bold">
                  {users.filter(u => u.role === 'leads_manager').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Activity className="h-8 w-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Active Users</p>
                <p className="text-2xl font-bold">
                  {users.filter(u => u.is_active).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <UserX className="h-8 w-8 text-red-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Inactive Users</p>
                <p className="text-2xl font-bold">
                  {users.filter(u => !u.is_active).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Filter className="h-5 w-5 mr-2" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="search">Search Users</Label>
              <div className="relative mt-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="Search by name or email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="role-filter">Filter by Role</Label>
              <Select
                value={filters.role || 'all'}
                onValueChange={(value) => {
                  setFilters(prev => ({ 
                    ...prev, 
                    role: value === 'all' ? undefined : value as UserRole 
                  }));
                  setPage(1);
                }}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="All roles" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Roles</SelectItem>
                  {Object.entries(roleLabels).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="status-filter">Filter by Status</Label>
              <Select
                value={filters.is_active === undefined ? 'all' : filters.is_active ? 'active' : 'inactive'}
                onValueChange={(value) => {
                  setFilters(prev => ({ 
                    ...prev, 
                    is_active: value === 'all' ? undefined : value === 'active' 
                  }));
                  setPage(1);
                }}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Users Table */}
      <Card>
        <CardHeader>
          <CardTitle>Users ({total})</CardTitle>
          <CardDescription>
            Manage user accounts, roles, and permissions
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <Alert className="mb-4 border-red-200 bg-red-50">
              <AlertCircle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-800">
                {error}
              </AlertDescription>
            </Alert>
          )}

          {loading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{user.full_name || 'No name'}</div>
                          <div className="text-sm text-muted-foreground">{user.email}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={roleColors[user.role || 'sales']}>
                          {roleLabels[user.role || 'sales']}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={user.is_active ? 'default' : 'secondary'}>
                          {user.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {user.created_at ? new Date(user.created_at).toLocaleDateString() : 'Unknown'}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuItem onClick={() => setEditingUser(user)}>
                              <Edit className="h-4 w-4 mr-2" />
                              Edit User
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => setResetPasswordUser(user)}
                            >
                              <Key className="h-4 w-4 mr-2" />
                              Reset Password
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => handleToggleStatus(user)}
                              disabled={user.id === profile?.id}
                            >
                              {user.is_active ? (
                                <>
                                  <UserX className="h-4 w-4 mr-2" />
                                  Deactivate
                                </>
                              ) : (
                                <>
                                  <UserCheck className="h-4 w-4 mr-2" />
                                  Activate
                                </>
                              )}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <DropdownMenuItem 
                                  className="text-red-600"
                                  onSelect={(e) => e.preventDefault()}
                                  disabled={user.id === profile?.id}
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Delete User
                                </DropdownMenuItem>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete User</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Are you sure you want to delete {user.full_name || user.email}? 
                                    This action cannot be undone and will remove all associated data.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => handleDeleteUser(user)}
                                    className="bg-red-600 hover:bg-red-700"
                                  >
                                    Delete
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <p className="text-sm text-muted-foreground">
                    Showing {(page - 1) * 10 + 1} to {Math.min(page * 10, total)} of {total} users
                  </p>
                  <div className="flex space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(page - 1)}
                      disabled={page === 1}
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(page + 1)}
                      disabled={page === totalPages}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Edit User Dialog */}
      <Dialog open={!!editingUser} onOpenChange={(open) => !open && setEditingUser(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>
              Update user information and permissions
            </DialogDescription>
          </DialogHeader>
          {editingUser && (
            <EditUserForm
              user={editingUser}
              onSubmit={handleUpdateUser}
              onCancel={() => setEditingUser(null)}
              loading={loading}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Reset Password Dialog */}
      <Dialog open={!!resetPasswordUser} onOpenChange={(open) => !open && setResetPasswordUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset Password</DialogTitle>
            <DialogDescription>
              Set a new password for {resetPasswordUser?.full_name || resetPasswordUser?.email}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="new-password">New Password</Label>
              <Input
                id="new-password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new password (min. 8 characters)"
                className="mt-1"
              />
            </div>
            <div className="flex justify-end space-x-3">
              <Button
                variant="outline"
                onClick={() => {
                  setResetPasswordUser(null);
                  setNewPassword('');
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={handleResetPassword}
                disabled={!newPassword || newPassword.length < 8 || loading}
              >
                {loading ? 'Resetting...' : 'Reset Password'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}; 