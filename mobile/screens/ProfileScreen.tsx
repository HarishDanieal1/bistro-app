import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  ScrollView,
  TextInput,
  Modal,
  Alert,
} from 'react-native';
import { THEME } from '../theme';
import { useUserStore } from '../store/userStore';
import { useCartStore } from '../store/cartStore';

// ==========================================
// TYPES AND INTERFACES
// ==========================================

interface OrderHistoryItem {
  id: string;
  total: number;
  status: string;
  createdAt: string;
  items: Array<{
    id: string;
    quantity: number;
    price: number;
    menuItem: {
      name: string;
      icon: string;
    } | null;
  }>;
}

interface AdminAnalyticsData {
  totalSales: number;
  completedOrders: number;
  pendingOrders: number;
  averageTicket: number;
  categorySales: {
    main: number;
    appetizer: number;
    dessert: number;
    beverage: number;
  };
  weeklyTrend: Array<{ day: string; revenue: number }>;
}

interface AdminCustomer {
  id: string;
  email: string;
  name: string;
  role: string;
  createdAt: string;
  orderCount: number;
  totalSpend: number;
}

interface AdminMenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  icon: string;
  category: string;
  available: boolean;
}

interface AdminOrder {
  id: string;
  total: number;
  status: string;
  createdAt: string;
  user: {
    name: string;
    email: string;
  } | null;
  items: Array<{
    id: string;
    quantity: number;
    price: number;
    menuItem: {
      name: string;
      icon: string;
    } | null;
  }>;
}

interface ProfileScreenProps {
  onOpenLogin?: () => void;
  onRefreshMenu?: () => void;
}

type AdminTab = 'analytics' | 'menu' | 'customers' | 'orders';

export const ProfileScreen: React.FC<ProfileScreenProps> = ({ onOpenLogin, onRefreshMenu }) => {
  // General User States
  const [orders, setOrders] = useState<OrderHistoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const currentUser = useUserStore((state) => state.currentUser);
  const guestOrders = useCartStore((state) => state.guestOrders);

  // Admin Console States
  const [isAdminMode, setIsAdminMode] = useState(false);
  const [adminTab, setAdminTab] = useState<AdminTab>('analytics');
  
  // Tab-specific Loaded States
  const [analytics, setAnalytics] = useState<AdminAnalyticsData | null>(null);
  const [adminMenu, setAdminMenu] = useState<AdminMenuItem[]>([]);
  const [customers, setCustomers] = useState<AdminCustomer[]>([]);
  const [adminOrders, setAdminOrders] = useState<AdminOrder[]>([]);
  const [adminLoading, setAdminLoading] = useState(false);

  // Filters & Search
  const [menuSearch, setMenuSearch] = useState('');
  const [menuFilter, setMenuFilter] = useState<'all' | 'main' | 'appetizer' | 'salad' | 'dessert' | 'beverage'>('all');
  const [customerSearch, setCustomerSearch] = useState('');
  const [orderFilter, setOrderFilter] = useState<'all' | 'pending' | 'completed' | 'cancelled'>('all');

  // Menu Form Modal States
  const [isMenuModalOpen, setIsMenuModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<AdminMenuItem | null>(null);
  const [formName, setFormName] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formPrice, setFormPrice] = useState('');
  const [formIcon, setFormIcon] = useState('🍔');
  const [formCategory, setFormCategory] = useState('main');
  const [formAvailable, setFormAvailable] = useState(true);
  const [submittingForm, setSubmittingForm] = useState(false);

  const backendUrl = Platform.OS === 'android' ? 'http://10.0.2.2:5000' : 'http://localhost:5000';

  // ==========================================
  // API DATA FETCHERS
  // ==========================================

  // Customer order history
  const fetchOrderHistory = async () => {
    if (!currentUser) return;
    setLoading(true);
    try {
      const response = await fetch(`${backendUrl}/api/orders?userId=${currentUser.id}`);
      if (!response.ok) throw new Error('Failed to retrieve history');
      const data = await response.json();
      setOrders(data);
    } catch (err) {
      console.error('Fetch history error:', err);
    } finally {
      setLoading(false);
    }
  };

  // Admin Tab Fetcher Orchestrator
  const fetchAdminData = async (tab: AdminTab) => {
    setAdminLoading(true);
    try {
      if (tab === 'analytics') {
        const res = await fetch(`${backendUrl}/api/admin/analytics`);
        if (!res.ok) throw new Error('Failed to load analytics');
        const data = await res.json();
        setAnalytics(data);
      } else if (tab === 'menu') {
        const res = await fetch(`${backendUrl}/api/menu`);
        if (!res.ok) throw new Error('Failed to load menu');
        const data = await res.json();
        setAdminMenu(data);
      } else if (tab === 'customers') {
        const res = await fetch(`${backendUrl}/api/admin/users`);
        if (!res.ok) throw new Error('Failed to load customers');
        const data = await res.json();
        setCustomers(data);
      } else if (tab === 'orders') {
        const res = await fetch(`${backendUrl}/api/admin/orders`);
        if (!res.ok) throw new Error('Failed to load bistro orders');
        const data = await res.json();
        setAdminOrders(data);
      }
    } catch (err) {
      console.error(`Fetch admin tab [${tab}] error:`, err);
    } finally {
      setAdminLoading(false);
    }
  };

  useEffect(() => {
    if (currentUser) {
      fetchOrderHistory();
    } else {
      setOrders(guestOrders);
    }
  }, [currentUser, guestOrders]);

  // Trigger admin data fetching when switching tabs or turning on admin mode
  useEffect(() => {
    if (isAdminMode && currentUser?.role === 'admin') {
      fetchAdminData(adminTab);
    }
  }, [isAdminMode, adminTab]);

  // ==========================================
  // OPERATIONAL ACTION HANDLERS (ADMIN)
  // ==========================================

  // Live order status updates
  const handleUpdateOrderStatus = async (orderId: string, status: 'pending' | 'completed' | 'cancelled') => {
    try {
      const res = await fetch(`${backendUrl}/api/orders/${orderId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error('Failed to update status');
      
      // Refresh current feed immediately
      fetchAdminData('orders');
      
      // Notify beautifully
      if (Platform.OS === 'web') {
        alert(`Order status updated to ${status}!`);
      } else {
        Alert.alert('Status Updated', `Order has been successfully marked as ${status}.`);
      }
    } catch (err: any) {
      console.error('Update status error:', err);
      if (Platform.OS === 'web') {
        alert('Error: ' + err.message);
      } else {
        Alert.alert('Error', err.message);
      }
    }
  };

  // Toggle availability from list
  const handleToggleMenuAvailability = async (item: AdminMenuItem) => {
    try {
      const res = await fetch(`${backendUrl}/api/menu/${item.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ available: !item.available }),
      });
      if (!res.ok) throw new Error('Failed to update item availability');
      
      // Update local state directly for responsive feedback
      setAdminMenu(prev => prev.map(m => m.id === item.id ? { ...m, available: !m.available } : m));
      onRefreshMenu?.();
    } catch (err) {
      console.error('Toggle availability error:', err);
    }
  };

  // Delete Menu Item
  const handleDeleteMenuItem = (itemId: string, itemName: string) => {
    const performDelete = async () => {
      try {
        const res = await fetch(`${backendUrl}/api/menu/${itemId}`, {
          method: 'DELETE',
        });
        if (!res.ok) throw new Error('Failed to delete menu item');
        
        // Refresh local list
        setAdminMenu(prev => prev.filter(m => m.id !== itemId));
        onRefreshMenu?.();
        if (Platform.OS === 'web') {
          alert(`"${itemName}" deleted successfully.`);
        } else {
          Alert.alert('Deleted', `"${itemName}" has been removed from the menu.`);
        }
      } catch (err: any) {
        console.error('Delete item error:', err);
        if (Platform.OS === 'web') {
          alert('Error: ' + err.message);
        } else {
          Alert.alert('Error', err.message);
        }
      }
    };

    if (Platform.OS === 'web') {
      const confirm = window.confirm(`Are you sure you want to delete "${itemName}"? This will safely remove it from the menu while preserving customer order history.`);
      if (confirm) performDelete();
    } else {
      Alert.alert(
        'Confirm Delete',
        `Are you sure you want to delete "${itemName}"? This will safely remove it from the menu while preserving customer order history.`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Delete', style: 'destructive', onPress: performDelete }
        ]
      );
    }
  };

  // Open Form Modal for Create or Edit
  const openMenuForm = (item?: AdminMenuItem) => {
    if (item) {
      setEditingItem(item);
      setFormName(item.name);
      setFormDesc(item.description);
      setFormPrice(item.price.toString());
      setFormIcon(item.icon);
      setFormCategory(item.category);
      setFormAvailable(item.available);
    } else {
      setEditingItem(null);
      setFormName('');
      setFormDesc('');
      setFormPrice('');
      setFormIcon('🍔');
      setFormCategory('main');
      setFormAvailable(true);
    }
    setIsMenuModalOpen(true);
  };

  // Form Submit Handler
  const handleSaveMenuItem = async () => {
    if (!formName || !formDesc || !formPrice || !formIcon || !formCategory) {
      if (Platform.OS === 'web') alert('All fields are required.');
      else Alert.alert('Invalid Form', 'Please fill in all details.');
      return;
    }

    const priceNum = parseFloat(formPrice);
    if (isNaN(priceNum) || priceNum <= 0) {
      if (Platform.OS === 'web') alert('Please enter a valid price.');
      else Alert.alert('Invalid Price', 'Price must be a positive number.');
      return;
    }

    setSubmittingForm(true);
    try {
      const payload = {
        name: formName,
        description: formDesc,
        price: priceNum,
        icon: formIcon,
        category: formCategory,
        available: formAvailable,
      };

      let url = `${backendUrl}/api/menu`;
      let method = 'POST';

      if (editingItem) {
        url = `${backendUrl}/api/menu/${editingItem.id}`;
        method = 'PUT';
      }

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error(`Failed to save menu item (${res.status})`);
      
      setIsMenuModalOpen(false);
      fetchAdminData('menu'); // refresh whole list
      onRefreshMenu?.();
      
      const successMsg = editingItem ? 'Menu item updated!' : 'New menu item created!';
      if (Platform.OS === 'web') alert(successMsg);
      else Alert.alert('Success', successMsg);
    } catch (err: any) {
      console.error('Save item error:', err);
      if (Platform.OS === 'web') alert('Error: ' + err.message);
      else Alert.alert('Error', err.message);
    } finally {
      setSubmittingForm(false);
    }
  };

  // ==========================================
  // SUB-TAB VIEW RENDERERS
  // ==========================================

  // Tab 1: Analytics Dashboard
  const renderAnalyticsTab = () => {
    if (adminLoading || !analytics) {
      return (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="small" color={THEME.colors.primary} />
          <Text style={styles.loadingText}>Computing bistro statistics...</Text>
        </View>
      );
    }

    // Weekly Revenue calculations
    const weeklyTrend = analytics.weeklyTrend || [];
    const maxRevenue = Math.max(...weeklyTrend.map(t => t.revenue), 1);

    // Categories Calculations
    const categoryIcons: Record<string, string> = {
      main: '🍔 Mains',
      appetizer: '🍟 Apps',
      salad: '🥗 Salads',
      dessert: '🍰 Desserts',
      beverage: '🥤 Drinks',
    };

    const catSales = analytics.categorySales || { main: 0, appetizer: 0, salad: 0, dessert: 0, beverage: 0 };
    const totalCatSales = Object.values(catSales).reduce((a, b) => a + b, 0) || 1;

    return (
      <ScrollView contentContainerStyle={styles.adminScrollContent}>
        {/* Core Metric Cards */}
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Text style={styles.statIcon}>💰</Text>
            <Text style={styles.statLabel}>Gross Sales</Text>
            <Text style={styles.statVal}>${analytics.totalSales.toFixed(2)}</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statIcon}>🎟️</Text>
            <Text style={styles.statLabel}>Avg Ticket</Text>
            <Text style={styles.statVal}>${analytics.averageTicket.toFixed(2)}</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statIcon}>⏳</Text>
            <Text style={styles.statLabel}>Pending Orders</Text>
            <Text style={styles.statVal}>{analytics.pendingOrders}</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statIcon}>✅</Text>
            <Text style={styles.statLabel}>Completed</Text>
            <Text style={styles.statVal}>{analytics.completedOrders}</Text>
          </View>
        </View>

        {/* CSS Glassmorphic Chart */}
        <View style={styles.chartSection}>
          <Text style={styles.sectionTitle}>📈 Weekly Sales Curves</Text>
          
          <View style={styles.chartWrapper}>
            {/* Background grid guides */}
            <View style={styles.gridLines}>
              <View style={styles.gridLine} />
              <View style={styles.gridLine} />
              <View style={styles.gridLine} />
              <View style={styles.gridLine} />
            </View>

            <View style={styles.chartBarsRow}>
              {weeklyTrend.map((t, index) => {
                const heightPercent = (t.revenue / maxRevenue) * 100;
                return (
                  <View key={index} style={styles.chartColumn}>
                    {t.revenue > 0 && (
                      <Text style={styles.chartBarValue}>${Math.round(t.revenue)}</Text>
                    )}
                    <View style={styles.chartBarOuter}>
                      <View style={[styles.chartBarInner, { height: `${heightPercent}%` }]} />
                    </View>
                    <Text style={styles.chartBarLabel}>{t.day}</Text>
                  </View>
                );
              })}
            </View>
          </View>
        </View>

        {/* Category Breakdown Progress indicators */}
        <View style={styles.breakdownSection}>
          <Text style={styles.sectionTitle}>🍽️ Sales Share by Category</Text>
          
          {Object.entries(catSales).map(([category, value]) => {
            const pct = (value / totalCatSales) * 100;
            return (
              <View key={category} style={styles.breakdownRow}>
                <View style={styles.breakdownHeader}>
                  <Text style={styles.breakdownName}>{categoryIcons[category] || category}</Text>
                  <Text style={styles.breakdownPrice}>
                    ${value.toFixed(2)} ({Math.round(pct)}%)
                  </Text>
                </View>
                <View style={styles.progressTrack}>
                  <View style={[styles.progressFill, { width: `${pct}%` }]} />
                </View>
              </View>
            );
          })}
        </View>
      </ScrollView>
    );
  };

  // Tab 2: Menu CRUD Manager
  const renderMenuTab = () => {
    const filteredMenu = adminMenu.filter(item => {
      const matchSearch = item.name.toLowerCase().includes(menuSearch.toLowerCase()) || 
                          item.description.toLowerCase().includes(menuSearch.toLowerCase());
      const matchCat = menuFilter === 'all' || item.category === menuFilter;
      return matchSearch && matchCat;
    });

    return (
      <View style={styles.adminTabWrapper}>
        <View style={styles.searchFilterHeader}>
          <TextInput
            style={styles.searchBarInput}
            placeholder="Search menu dishes..."
            placeholderTextColor={THEME.colors.textSecondary}
            value={menuSearch}
            onChangeText={setMenuSearch}
          />
          <TouchableOpacity style={styles.addMenuBtn} onPress={() => openMenuForm()}>
            <Text style={styles.addMenuBtnText}>➕ Add Item</Text>
          </TouchableOpacity>
        </View>

        {/* Category horizontal filters */}
        <View style={styles.horizontalFilterScroll}>
          {(['all', 'main', 'appetizer', 'salad', 'dessert', 'beverage'] as const).map(cat => (
            <TouchableOpacity
              key={cat}
              style={[styles.filterTag, menuFilter === cat && styles.filterTagActive]}
              onPress={() => setMenuFilter(cat)}
            >
              <Text style={[styles.filterTagText, menuFilter === cat && styles.filterTagTextActive]}>
                {cat.charAt(0).toUpperCase() + cat.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {adminLoading ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="small" color={THEME.colors.primary} />
            <Text style={styles.loadingText}>Fetching menu catalog...</Text>
          </View>
        ) : (
          <FlatList
            data={filteredMenu}
            keyExtractor={item => item.id}
            renderItem={({ item }) => (
              <View style={[styles.menuManagerCard, !item.available && styles.menuCardSoldOut]}>
                <View style={styles.menuCardLeft}>
                  <Text style={styles.menuItemEmoji}>{item.icon}</Text>
                  <View style={styles.menuItemTextDetails}>
                    <View style={styles.menuTitlePriceRow}>
                      <Text style={styles.menuItemName}>{item.name}</Text>
                      <Text style={styles.menuItemPrice}>${item.price.toFixed(2)}</Text>
                    </View>
                    <Text style={styles.menuItemDesc} numberOfLines={2}>{item.description}</Text>
                    <View style={styles.menuCardTagRow}>
                      <Text style={styles.menuMiniBadge}>{item.category.toUpperCase()}</Text>
                      <Text style={[
                        styles.menuMiniBadge, 
                        item.available ? styles.badgeGreen : styles.badgeGray
                      ]}>
                        {item.available ? 'AVAILABLE' : 'SOLD OUT'}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Operations & actions panel */}
                <View style={styles.menuCardActions}>
                  <TouchableOpacity
                    style={[styles.actionIconButton, item.available ? styles.actionIconGreen : styles.actionIconGray]}
                    onPress={() => handleToggleMenuAvailability(item)}
                  >
                    <Text style={styles.actionIconButtonText}>{item.available ? '✓ ON' : '✗ OFF'}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.actionIconButton, styles.actionIconEdit]}
                    onPress={() => openMenuForm(item)}
                  >
                    <Text style={styles.actionIconButtonText}>✏️ Edit</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.actionIconButton, styles.actionIconDelete]}
                    onPress={() => handleDeleteMenuItem(item.id, item.name)}
                  >
                    <Text style={styles.actionIconButtonText}>🗑️ Del</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
            contentContainerStyle={styles.adminListContent}
            ListEmptyComponent={
              <Text style={styles.emptyText}>No menu items found. 🍽️</Text>
            }
          />
        )}
      </View>
    );
  };

  // Tab 3: Customer Directory
  const renderCustomersTab = () => {
    const filteredCustomers = customers.filter(c => 
      c.name.toLowerCase().includes(customerSearch.toLowerCase()) || 
      c.email.toLowerCase().includes(customerSearch.toLowerCase())
    );

    return (
      <View style={styles.adminTabWrapper}>
        <View style={styles.singleSearchHeader}>
          <TextInput
            style={styles.searchBarInput}
            placeholder="Search customers by name or email..."
            placeholderTextColor={THEME.colors.textSecondary}
            value={customerSearch}
            onChangeText={setCustomerSearch}
          />
        </View>

        {adminLoading ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="small" color={THEME.colors.primary} />
            <Text style={styles.loadingText}>Retrieving customer accounts...</Text>
          </View>
        ) : (
          <FlatList
            data={filteredCustomers}
            keyExtractor={item => item.id}
            renderItem={({ item }) => {
              const joinDate = new Date(item.createdAt).toLocaleDateString(undefined, {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
              });

              return (
                <View style={styles.customerRow}>
                  <View style={styles.customerAvatarMini}>
                    <Text style={styles.customerAvatarText}>👤</Text>
                  </View>
                  
                  <View style={styles.customerInfoDetails}>
                    <Text style={styles.customerNameText}>{item.name}</Text>
                    <Text style={styles.customerEmailText}>{item.email}</Text>
                    <Text style={styles.customerJoinedText}>Joined: {joinDate}</Text>
                  </View>

                  <View style={styles.customerStatsBadges}>
                    <View style={styles.miniStatsBadge}>
                      <Text style={styles.miniStatsBadgeText}>📦 {item.orderCount} Orders</Text>
                    </View>
                    <View style={[styles.miniStatsBadge, styles.miniSpendBadge]}>
                      <Text style={[styles.miniStatsBadgeText, styles.miniSpendBadgeText]}>
                        💰 ${item.totalSpend.toFixed(2)}
                      </Text>
                    </View>
                  </View>
                </View>
              );
            }}
            contentContainerStyle={styles.adminListContent}
            ListEmptyComponent={
              <Text style={styles.emptyText}>No registered customers found. 👥</Text>
            }
          />
        )}
      </View>
    );
  };

  // Tab 4: Bistro Operations Manager (Live Orders)
  const renderOrdersTab = () => {
    const filteredOrders = adminOrders.filter(order => 
      orderFilter === 'all' || order.status === orderFilter
    );

    return (
      <View style={styles.adminTabWrapper}>
        {/* Status filters */}
        <View style={styles.horizontalFilterScroll}>
          {(['all', 'pending', 'completed', 'cancelled'] as const).map(status => (
            <TouchableOpacity
              key={status}
              style={[styles.filterTag, orderFilter === status && styles.filterTagActive]}
              onPress={() => setOrderFilter(status)}
            >
              <Text style={[styles.filterTagText, orderFilter === status && styles.filterTagTextActive]}>
                {status.toUpperCase()}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {adminLoading ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="small" color={THEME.colors.primary} />
            <Text style={styles.loadingText}>Fetching active tables order feed...</Text>
          </View>
        ) : (
          <FlatList
            data={filteredOrders}
            keyExtractor={item => item.id}
            renderItem={({ item }) => {
              const formattedDate = new Date(item.createdAt).toLocaleDateString(undefined, {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              });

              // Status highlight left border colors
              let statusBorder = THEME.colors.border;
              if (item.status === 'pending') statusBorder = THEME.colors.primary;
              else if (item.status === 'completed') statusBorder = THEME.colors.success;
              else if (item.status === 'cancelled') statusBorder = THEME.colors.danger;

              return (
                <View style={[styles.orderCard, { borderLeftWidth: 4, borderLeftColor: statusBorder }]}>
                  <View style={styles.orderHeader}>
                    <View>
                      <Text style={styles.orderId}>Order #{item.id.slice(-6).toUpperCase()}</Text>
                      <Text style={styles.orderDate}>{formattedDate}</Text>
                    </View>
                    <View style={[
                      styles.statusBadge, 
                      item.status === 'completed' && styles.statusBadgeCompleted,
                      item.status === 'pending' && styles.statusBadgePending,
                      item.status === 'cancelled' && styles.statusBadgeCancelled
                    ]}>
                      <Text style={[
                        styles.statusText,
                        item.status === 'completed' && styles.statusTextCompleted,
                        item.status === 'pending' && styles.statusTextPending,
                        item.status === 'cancelled' && styles.statusTextCancelled
                      ]}>
                        {item.status.toUpperCase()}
                      </Text>
                    </View>
                  </View>

                  {/* Customer details for admin */}
                  <View style={styles.adminOrderMeta}>
                    <Text style={styles.adminOrderCustName}>
                      👥 Customer: <Text style={styles.whiteText}>{item.user ? item.user.name : 'Guest Customer'}</Text>
                    </Text>
                    <Text style={styles.adminOrderCustEmail}>
                      ✉️ Email: <Text style={styles.whiteText}>{item.user ? item.user.email : 'guest@bistro.com'}</Text>
                    </Text>
                  </View>

                  {/* Order Sub-items */}
                  <View style={styles.itemsList}>
                    {item.items.map((subItem) => (
                      <View key={subItem.id} style={styles.subItemRow}>
                        <Text style={styles.subItemDetails}>
                          {subItem.menuItem ? subItem.menuItem.icon : '🍽️'} {subItem.menuItem ? subItem.menuItem.name : 'Unknown Item'} x {subItem.quantity}
                        </Text>
                        <Text style={styles.subItemPrice}>
                          ${(subItem.price * subItem.quantity).toFixed(2)}
                        </Text>
                      </View>
                    ))}
                  </View>

                  <View style={styles.orderFooter}>
                    <View>
                      <Text style={styles.totalLabel}>Grand Total</Text>
                      <Text style={styles.totalPrice}>${item.total.toFixed(2)}</Text>
                    </View>

                    {/* Operational Action Buttons */}
                    {item.status === 'pending' && (
                      <View style={styles.orderActionRowButtons}>
                        <TouchableOpacity
                          style={[styles.orderActionBtn, styles.orderActionBtnCancel]}
                          onPress={() => handleUpdateOrderStatus(item.id, 'cancelled')}
                        >
                          <Text style={styles.orderActionBtnText}>✗ Cancel</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.orderActionBtn, styles.orderActionBtnComplete]}
                          onPress={() => handleUpdateOrderStatus(item.id, 'completed')}
                        >
                          <Text style={styles.orderActionBtnText}>✓ Complete</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                </View>
              );
            }}
            contentContainerStyle={styles.adminListContent}
            ListEmptyComponent={
              <Text style={styles.emptyText}>No bistro orders match this filter. 📋</Text>
            }
          />
        )}
      </View>
    );
  };

  // ==========================================
  // CUSTOMER PERSONAL PROFILE / DEFAULT RENDER
  // ==========================================

  const renderOrderItem = ({ item }: { item: OrderHistoryItem }) => {
    const formattedDate = new Date(item.createdAt).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    return (
      <View style={styles.orderCard}>
        <View style={styles.orderHeader}>
          <View>
            <Text style={styles.orderId}>Order #{item.id.slice(-6).toUpperCase()}</Text>
            <Text style={styles.orderDate}>{formattedDate}</Text>
          </View>
          <View style={[
            styles.statusBadge, 
            item.status === 'completed' ? styles.statusBadgeCompleted : styles.statusBadgePending
          ]}>
            <Text style={[
              styles.statusText,
              item.status === 'completed' ? styles.statusTextCompleted : styles.statusTextPending
            ]}>
              {item.status.toUpperCase()}
            </Text>
          </View>
        </View>

        {/* Order Sub-items */}
        <View style={styles.itemsList}>
          {item.items.map((subItem) => (
            <View key={subItem.id} style={styles.subItemRow}>
              <Text style={styles.subItemDetails}>
                {subItem.menuItem ? subItem.menuItem.icon : '🍽️'} {subItem.menuItem ? subItem.menuItem.name : 'Deleted Item'} x {subItem.quantity}
              </Text>
              <Text style={styles.subItemPrice}>
                ${(subItem.price * subItem.quantity).toFixed(2)}
              </Text>
            </View>
          ))}
        </View>

        <View style={styles.orderFooter}>
          <Text style={styles.totalLabel}>Total Paid</Text>
          <Text style={styles.totalPrice}>${item.total.toFixed(2)}</Text>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Profile Card Header */}
      {currentUser ? (
        <View style={styles.profileCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>👤</Text>
          </View>
          <View style={styles.profileDetails}>
            <Text style={styles.profileName}>{currentUser.name}</Text>
            <Text style={styles.profileEmail}>{currentUser.email}</Text>
            <View style={styles.roleBadge}>
              <Text style={styles.roleText}>{currentUser.role.toUpperCase()}</Text>
            </View>
          </View>
        </View>
      ) : (
        <View style={styles.guestProfileCard}>
          <View style={styles.avatarGuest}>
            <Text style={styles.avatarText}>🔑</Text>
          </View>
          <View style={styles.profileDetails}>
            <Text style={styles.profileName}>Browsing as Guest</Text>
            <Text style={styles.guestCardSub}>Sign in to unlock reservations, reward points, and live order sync.</Text>
            {onOpenLogin && (
              <TouchableOpacity style={styles.guestLoginBtn} onPress={onOpenLogin}>
                <Text style={styles.guestLoginBtnText}>Sign In / Create Account</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}

      {/* Conditionally Render: Admin Selector Console */}
      {currentUser?.role === 'admin' && (
        <View style={styles.consoleToggleContainer}>
          <TouchableOpacity 
            style={[styles.consoleToggleBtn, !isAdminMode && styles.consoleToggleBtnActive]} 
            onPress={() => setIsAdminMode(false)}
          >
            <Text style={[styles.consoleToggleText, !isAdminMode && styles.consoleToggleTextActive]}>
              👤 Profile History
            </Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.consoleToggleBtn, isAdminMode && styles.consoleToggleBtnActive]} 
            onPress={() => setIsAdminMode(true)}
          >
            <Text style={[styles.consoleToggleText, isAdminMode && styles.consoleToggleTextActive]}>
              🛡️ Admin Console
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Render Portal or Customer view */}
      {isAdminMode && currentUser?.role === 'admin' ? (
        // ==========================================
        // ADMIN CONSOLE INTERFACE
        // ==========================================
        <View style={styles.adminConsoleArea}>
          {/* Sub Navigation Tabs */}
          <View style={styles.adminSubTabBar}>
            <TouchableOpacity
              style={[styles.adminSubTabItem, adminTab === 'analytics' && styles.adminSubTabItemActive]}
              onPress={() => setAdminTab('analytics')}
            >
              <Text style={[styles.adminSubTabIcon, adminTab === 'analytics' && styles.adminSubTabIconActive]}>📈</Text>
              <Text style={[styles.adminSubTabLabel, adminTab === 'analytics' && styles.adminSubTabLabelActive]}>Analytics</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.adminSubTabItem, adminTab === 'menu' && styles.adminSubTabItemActive]}
              onPress={() => setAdminTab('menu')}
            >
              <Text style={[styles.adminSubTabIcon, adminTab === 'menu' && styles.adminSubTabIconActive]}>🍽️</Text>
              <Text style={[styles.adminSubTabLabel, adminTab === 'menu' && styles.adminSubTabLabelActive]}>Menu</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.adminSubTabItem, adminTab === 'customers' && styles.adminSubTabItemActive]}
              onPress={() => setAdminTab('customers')}
            >
              <Text style={[styles.adminSubTabIcon, adminTab === 'customers' && styles.adminSubTabIconActive]}>👥</Text>
              <Text style={[styles.adminSubTabLabel, adminTab === 'customers' && styles.adminSubTabLabelActive]}>Customers</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.adminSubTabItem, adminTab === 'orders' && styles.adminSubTabItemActive]}
              onPress={() => setAdminTab('orders')}
            >
              <Text style={[styles.adminSubTabIcon, adminTab === 'orders' && styles.adminSubTabIconActive]}>📋</Text>
              <Text style={[styles.adminSubTabLabel, adminTab === 'orders' && styles.adminSubTabLabelActive]}>Orders</Text>
            </TouchableOpacity>
          </View>

          {/* Core active views */}
          <View style={styles.adminBodyContainer}>
            {adminTab === 'analytics' && renderAnalyticsTab()}
            {adminTab === 'menu' && renderMenuTab()}
            {adminTab === 'customers' && renderCustomersTab()}
            {adminTab === 'orders' && renderOrdersTab()}
          </View>
        </View>
      ) : (
        // ==========================================
        // CUSTOMER VIEW / GUEST VIEW INTERFACE
        // ==========================================
        <View style={styles.customerConsoleArea}>
          <View style={styles.historyHeader}>
            <Text style={styles.historyTitle}>
              {currentUser ? 'Your Order History' : 'Recent Guest Orders'}
            </Text>
            {currentUser && (
              <TouchableOpacity onPress={fetchOrderHistory} disabled={loading} style={styles.refreshBtn}>
                <Text style={styles.refreshBtnText}>🔄 Refresh</Text>
              </TouchableOpacity>
            )}
          </View>

          {loading && orders.length === 0 ? (
            <View style={styles.centerContainer}>
              <ActivityIndicator size="small" color={THEME.colors.primary} />
              <Text style={styles.loadingText}>Fetching order logs...</Text>
            </View>
          ) : (
            <FlatList
              data={orders}
              keyExtractor={(item) => item.id}
              renderItem={renderOrderItem}
              contentContainerStyle={styles.listContent}
              style={styles.historyList}
              ListEmptyComponent={
                <Text style={styles.emptyText}>You haven't placed any orders yet. 🍽️</Text>
              }
            />
          )}
        </View>
      )}

      {/* ==========================================
          ADD/EDIT MENU ITEM FORM MODAL (ADMIN ONLY)
          ========================================== */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={isMenuModalOpen}
        onRequestClose={() => setIsMenuModalOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContentSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingItem ? '✏️ Edit Menu Item' : '✨ Add New Menu Item'}
              </Text>
              <TouchableOpacity onPress={() => setIsMenuModalOpen(false)} style={styles.closeBtnIcon}>
                <Text style={styles.closeBtnIconText}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.modalFormScrollContent}>
              <Text style={styles.fieldLabel}>Dish Name</Text>
              <TextInput
                style={styles.formInput}
                placeholder="e.g. Truffle Steak Fries"
                placeholderTextColor={THEME.colors.textSecondary}
                value={formName}
                onChangeText={setFormName}
              />

              <Text style={styles.fieldLabel}>Price ($ USD)</Text>
              <TextInput
                style={styles.formInput}
                placeholder="e.g. 14.50"
                placeholderTextColor={THEME.colors.textSecondary}
                keyboardType="decimal-pad"
                value={formPrice}
                onChangeText={setFormPrice}
              />

              <Text style={styles.fieldLabel}>Emoji / Icon</Text>
              <TextInput
                style={styles.formInput}
                placeholder="e.g. 🍟"
                placeholderTextColor={THEME.colors.textSecondary}
                value={formIcon}
                onChangeText={setFormIcon}
              />

              <Text style={styles.fieldLabel}>Category</Text>
              <View style={styles.categoryRadioGroup}>
                {(['main', 'appetizer', 'salad', 'dessert', 'beverage'] as const).map(cat => (
                  <TouchableOpacity
                    key={cat}
                    style={[styles.radioItem, formCategory === cat && styles.radioItemActive]}
                    onPress={() => setFormCategory(cat)}
                  >
                    <Text style={[styles.radioItemText, formCategory === cat && styles.radioItemTextActive]}>
                      {cat.toUpperCase()}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.fieldLabel}>Description</Text>
              <TextInput
                style={[styles.formInput, styles.multilineInput]}
                placeholder="Description of the ingredients and culinary details..."
                placeholderTextColor={THEME.colors.textSecondary}
                multiline={true}
                numberOfLines={3}
                value={formDesc}
                onChangeText={setFormDesc}
              />

              {/* Availability Slider/Button selector */}
              <View style={styles.availabilityFormRow}>
                <Text style={styles.fieldLabel}>In-Stock Availability</Text>
                <TouchableOpacity 
                  style={[styles.toggleSelector, formAvailable ? styles.toggleGreen : styles.toggleGray]}
                  onPress={() => setFormAvailable(!formAvailable)}
                >
                  <Text style={styles.toggleText}>{formAvailable ? '✓ IN-STOCK (ON)' : '✗ SOLD-OUT (OFF)'}</Text>
                </TouchableOpacity>
              </View>

              {/* Form buttons */}
              <View style={styles.formActionButtonsRow}>
                <TouchableOpacity 
                  style={[styles.formBtn, styles.formBtnCancel]}
                  onPress={() => setIsMenuModalOpen(false)}
                  disabled={submittingForm}
                >
                  <Text style={styles.formBtnTextCancel}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.formBtn, styles.formBtnSave]}
                  onPress={handleSaveMenuItem}
                  disabled={submittingForm}
                >
                  {submittingForm ? (
                    <ActivityIndicator size="small" color={THEME.colors.background} />
                  ) : (
                    <Text style={styles.formBtnTextSave}>Save Dish</Text>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.colors.background,
  },
  profileCard: {
    backgroundColor: THEME.colors.card,
    borderRadius: THEME.radius.lg,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    padding: THEME.spacing.md,
    margin: THEME.spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 5,
    elevation: 3,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: THEME.radius.round,
    backgroundColor: THEME.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: THEME.spacing.md,
  },
  avatarText: {
    fontSize: 32,
  },
  profileDetails: {
    flex: 1,
  },
  profileName: {
    color: THEME.colors.text,
    fontSize: 18,
    fontWeight: 'bold',
  },
  profileEmail: {
    color: THEME.colors.textSecondary,
    fontSize: 12,
    marginBottom: 4,
  },
  roleBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(220, 165, 76, 0.12)',
    paddingHorizontal: THEME.spacing.sm,
    paddingVertical: 2,
    borderRadius: THEME.radius.sm,
    borderWidth: 1,
    borderColor: 'rgba(220, 165, 76, 0.25)',
  },
  roleText: {
    color: THEME.colors.primary,
    fontSize: 9,
    fontWeight: 'bold',
  },

  guestProfileCard: {
    backgroundColor: THEME.colors.card,
    borderRadius: THEME.radius.lg,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    padding: THEME.spacing.md,
    margin: THEME.spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 5,
    elevation: 3,
  },
  avatarGuest: {
    width: 60,
    height: 60,
    borderRadius: THEME.radius.round,
    backgroundColor: 'rgba(220, 165, 76, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: THEME.spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(220, 165, 76, 0.3)',
  },
  guestCardSub: {
    color: THEME.colors.textSecondary,
    fontSize: 11,
    lineHeight: 15,
    marginVertical: THEME.spacing.xs,
  },
  guestLoginBtn: {
    backgroundColor: THEME.colors.primary,
    paddingVertical: THEME.spacing.xs + 2,
    paddingHorizontal: THEME.spacing.sm,
    borderRadius: THEME.radius.sm,
    alignSelf: 'flex-start',
    marginTop: THEME.spacing.xs,
  },
  guestLoginBtnText: {
    color: THEME.colors.background,
    fontSize: 11,
    fontWeight: 'bold',
  },
  consoleToggleContainer: {
    flexDirection: 'row',
    backgroundColor: THEME.colors.card,
    marginHorizontal: THEME.spacing.md,
    marginBottom: THEME.spacing.md,
    padding: 4,
    borderRadius: THEME.radius.md,
    borderWidth: 1,
    borderColor: THEME.colors.border,
  },
  consoleToggleBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: THEME.radius.sm,
  },
  consoleToggleBtnActive: {
    backgroundColor: 'rgba(220, 165, 76, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(220, 165, 76, 0.3)',
  },
  consoleToggleText: {
    color: THEME.colors.textSecondary,
    fontSize: 12,
    fontWeight: 'bold',
  },
  consoleToggleTextActive: {
    color: THEME.colors.primary,
  },
  customerConsoleArea: {
    flex: 1,
  },
  adminConsoleArea: {
    flex: 1,
  },
  adminSubTabBar: {
    flexDirection: 'row',
    backgroundColor: THEME.colors.card,
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.border,
    paddingVertical: 4,
  },
  adminSubTabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  adminSubTabItemActive: {
    borderBottomColor: THEME.colors.primary,
  },
  adminSubTabIcon: {
    fontSize: 16,
    opacity: 0.6,
  },
  adminSubTabIconActive: {
    opacity: 1,
  },
  adminSubTabLabel: {
    color: THEME.colors.textSecondary,
    fontSize: 9,
    marginTop: 2,
    fontWeight: 'bold',
  },
  adminSubTabLabelActive: {
    color: THEME.colors.primary,
  },
  adminBodyContainer: {
    flex: 1,
  },
  adminScrollContent: {
    padding: THEME.spacing.md,
    paddingBottom: 80,
  },
  adminListContent: {
    paddingHorizontal: THEME.spacing.md,
    paddingBottom: 100,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: THEME.spacing.md,
  },
  statCard: {
    backgroundColor: THEME.colors.card,
    borderRadius: THEME.radius.md,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    width: '48%',
    padding: THEME.spacing.md,
    alignItems: 'center',
    marginBottom: THEME.spacing.sm + 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  statIcon: {
    fontSize: 22,
    marginBottom: 4,
  },
  statLabel: {
    color: THEME.colors.textSecondary,
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  statVal: {
    color: THEME.colors.text,
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 4,
  },
  chartSection: {
    backgroundColor: THEME.colors.card,
    borderRadius: THEME.radius.lg,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    padding: THEME.spacing.md,
    marginBottom: THEME.spacing.md,
  },
  sectionTitle: {
    color: THEME.colors.primary,
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: THEME.spacing.md,
  },
  chartWrapper: {
    height: 180,
    justifyContent: 'flex-end',
    position: 'relative',
    paddingTop: 20,
    paddingBottom: 20,
  },
  gridLines: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 20,
    bottom: 20,
    justifyContent: 'space-between',
  },
  gridLine: {
    height: 1,
    backgroundColor: THEME.colors.border,
    borderStyle: 'dashed' as any,
  },
  chartBarsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-end',
    height: '100%',
    zIndex: 2,
  },
  chartColumn: {
    alignItems: 'center',
    flex: 1,
  },
  chartBarValue: {
    color: THEME.colors.primary,
    fontSize: 8,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  chartBarOuter: {
    height: 100,
    width: 14,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 7,
    overflow: 'hidden',
    justifyContent: 'flex-end',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  chartBarInner: {
    backgroundColor: THEME.colors.primary,
    width: '100%',
    borderRadius: 7,
    shadowColor: THEME.colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 5,
  },
  chartBarLabel: {
    color: THEME.colors.textSecondary,
    fontSize: 9,
    marginTop: 6,
    fontWeight: '600',
  },
  breakdownSection: {
    backgroundColor: THEME.colors.card,
    borderRadius: THEME.radius.lg,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    padding: THEME.spacing.md,
    marginBottom: THEME.spacing.md,
  },
  breakdownRow: {
    marginBottom: THEME.spacing.sm + 4,
  },
  breakdownHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  breakdownName: {
    color: THEME.colors.text,
    fontSize: 12,
    fontWeight: 'bold',
  },
  breakdownPrice: {
    color: THEME.colors.textSecondary,
    fontSize: 11,
  },
  progressTrack: {
    height: 8,
    backgroundColor: '#2a2a32',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: THEME.colors.primary,
    borderRadius: 4,
  },
  adminTabWrapper: {
    flex: 1,
  },
  searchFilterHeader: {
    flexDirection: 'row',
    padding: THEME.spacing.md,
    paddingBottom: THEME.spacing.xs,
    alignItems: 'center',
  },
  searchBarInput: {
    flex: 1,
    backgroundColor: THEME.colors.card,
    color: THEME.colors.text,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    borderRadius: THEME.radius.md,
    paddingHorizontal: THEME.spacing.md,
    paddingVertical: Platform.OS === 'ios' ? 12 : 8,
    fontSize: 13,
  },
  addMenuBtn: {
    backgroundColor: THEME.colors.primary,
    paddingHorizontal: THEME.spacing.md,
    paddingVertical: Platform.OS === 'ios' ? 12 : 9,
    borderRadius: THEME.radius.md,
    marginLeft: THEME.spacing.sm,
  },
  addMenuBtnText: {
    color: THEME.colors.background,
    fontSize: 12,
    fontWeight: 'bold',
  },
  singleSearchHeader: {
    padding: THEME.spacing.md,
  },
  horizontalFilterScroll: {
    flexDirection: 'row',
    paddingHorizontal: THEME.spacing.md,
    paddingBottom: THEME.spacing.sm,
  },
  filterTag: {
    backgroundColor: THEME.colors.card,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    paddingHorizontal: THEME.spacing.md,
    paddingVertical: 6,
    borderRadius: THEME.radius.round,
    marginRight: THEME.spacing.xs + 2,
  },
  filterTagActive: {
    backgroundColor: 'rgba(220, 165, 76, 0.12)',
    borderColor: THEME.colors.primary,
  },
  filterTagText: {
    color: THEME.colors.textSecondary,
    fontSize: 11,
    fontWeight: '600',
  },
  filterTagTextActive: {
    color: THEME.colors.primary,
    fontWeight: 'bold',
  },
  menuManagerCard: {
    backgroundColor: THEME.colors.card,
    borderRadius: THEME.radius.md,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    padding: THEME.spacing.md,
    marginBottom: THEME.spacing.sm + 4,
  },
  menuCardSoldOut: {
    opacity: 0.65,
    borderStyle: 'dashed' as any,
  },
  menuCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: THEME.spacing.sm,
  },
  menuItemEmoji: {
    fontSize: 32,
    marginRight: THEME.spacing.md,
  },
  menuItemTextDetails: {
    flex: 1,
  },
  menuTitlePriceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  menuItemName: {
    color: THEME.colors.text,
    fontSize: 14,
    fontWeight: 'bold',
  },
  menuItemPrice: {
    color: THEME.colors.primary,
    fontSize: 14,
    fontWeight: 'bold',
  },
  menuItemDesc: {
    color: THEME.colors.textSecondary,
    fontSize: 11,
    marginTop: 2,
    lineHeight: 14,
  },
  menuCardTagRow: {
    flexDirection: 'row',
    marginTop: THEME.spacing.xs + 2,
  },
  menuMiniBadge: {
    fontSize: 8,
    color: THEME.colors.textSecondary,
    backgroundColor: 'rgba(255,255,255,0.06)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    fontWeight: 'bold',
    marginRight: 6,
    letterSpacing: 0.5,
  },
  badgeGreen: {
    color: THEME.colors.success,
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
  },
  badgeGray: {
    color: THEME.colors.textSecondary,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  menuCardActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    borderTopWidth: 1,
    borderTopColor: THEME.colors.border,
    paddingTop: THEME.spacing.sm,
    marginTop: 2,
  },
  actionIconButton: {
    paddingHorizontal: THEME.spacing.sm + 4,
    paddingVertical: 6,
    borderRadius: THEME.radius.sm,
    marginLeft: THEME.spacing.xs + 2,
  },
  actionIconButtonText: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  actionIconGreen: {
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    borderColor: 'rgba(16, 185, 129, 0.25)',
    borderWidth: 1,
  },
  actionIconGray: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1,
  },
  actionIconEdit: {
    backgroundColor: 'rgba(220,165,76,0.12)',
    borderColor: 'rgba(220,165,76,0.25)',
    borderWidth: 1,
  },
  actionIconDelete: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderColor: 'rgba(239, 68, 68, 0.25)',
    borderWidth: 1,
  },
  customerRow: {
    backgroundColor: THEME.colors.card,
    borderRadius: THEME.radius.md,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    padding: THEME.spacing.md,
    marginBottom: THEME.spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
  },
  customerAvatarMini: {
    width: 44,
    height: 44,
    borderRadius: THEME.radius.round,
    backgroundColor: THEME.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: THEME.spacing.md,
  },
  customerAvatarText: {
    fontSize: 20,
  },
  customerInfoDetails: {
    flex: 1,
  },
  customerNameText: {
    color: THEME.colors.text,
    fontSize: 14,
    fontWeight: 'bold',
  },
  customerEmailText: {
    color: THEME.colors.textSecondary,
    fontSize: 11,
    marginTop: 2,
  },
  customerJoinedText: {
    color: THEME.colors.textSecondary,
    fontSize: 9,
    marginTop: 2,
    fontStyle: 'italic',
  },
  customerStatsBadges: {
    alignItems: 'flex-end',
  },
  miniStatsBadge: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    paddingHorizontal: THEME.spacing.sm,
    paddingVertical: 4,
    borderRadius: THEME.radius.sm,
    marginBottom: 4,
  },
  miniSpendBadge: {
    backgroundColor: 'rgba(220, 165, 76, 0.12)',
  },
  miniStatsBadgeText: {
    color: THEME.colors.text,
    fontSize: 9,
    fontWeight: 'bold',
  },
  miniSpendBadgeText: {
    color: THEME.colors.primary,
  },
  adminOrderMeta: {
    backgroundColor: 'rgba(255,255,255,0.02)',
    padding: THEME.spacing.sm,
    borderRadius: THEME.radius.sm,
    marginBottom: THEME.spacing.sm,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  adminOrderCustName: {
    color: THEME.colors.textSecondary,
    fontSize: 11,
    fontWeight: '600',
  },
  adminOrderCustEmail: {
    color: THEME.colors.textSecondary,
    fontSize: 10,
    marginTop: 2,
  },
  whiteText: {
    color: THEME.colors.text,
    fontWeight: 'bold',
  },
  orderActionRowButtons: {
    flexDirection: 'row',
  },
  orderActionBtn: {
    paddingHorizontal: THEME.spacing.md,
    paddingVertical: THEME.spacing.xs + 2,
    borderRadius: THEME.radius.sm,
    marginLeft: THEME.spacing.sm,
  },
  orderActionBtnCancel: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderColor: 'rgba(239, 68, 68, 0.25)',
    borderWidth: 1,
  },
  orderActionBtnComplete: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderColor: 'rgba(16, 185, 129, 0.3)',
    borderWidth: 1,
  },
  orderActionBtnText: {
    color: THEME.colors.text,
    fontSize: 10,
    fontWeight: 'bold',
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: THEME.spacing.md,
    marginBottom: THEME.spacing.sm,
  },
  historyTitle: {
    color: THEME.colors.text,
    fontSize: 16,
    fontWeight: 'bold',
  },
  refreshBtn: {
    paddingHorizontal: THEME.spacing.sm,
    paddingVertical: THEME.spacing.xs,
  },
  refreshBtnText: {
    color: THEME.colors.primary,
    fontSize: 12,
    fontWeight: 'bold',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: THEME.spacing.xl * 2,
  },
  loadingText: {
    color: THEME.colors.textSecondary,
    fontSize: 12,
    marginTop: THEME.spacing.sm,
    fontStyle: 'italic',
  },
  historyList: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: THEME.spacing.md,
    paddingBottom: THEME.spacing.xl * 2,
  },
  orderCard: {
    backgroundColor: THEME.colors.card,
    borderRadius: THEME.radius.md,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    padding: THEME.spacing.md,
    marginBottom: THEME.spacing.md,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.border,
    paddingBottom: THEME.spacing.sm,
    marginBottom: THEME.spacing.sm,
  },
  orderId: {
    color: THEME.colors.text,
    fontSize: 14,
    fontWeight: 'bold',
  },
  orderDate: {
    color: THEME.colors.textSecondary,
    fontSize: 11,
  },
  statusBadge: {
    paddingHorizontal: THEME.spacing.sm,
    paddingVertical: 2,
    borderRadius: THEME.radius.sm,
  },
  statusBadgeCompleted: {
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
  },
  statusBadgePending: {
    backgroundColor: 'rgba(220, 165, 76, 0.12)',
  },
  statusBadgeCancelled: {
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
  },
  statusText: {
    fontSize: 9,
    fontWeight: 'bold',
  },
  statusTextCompleted: {
    color: THEME.colors.success,
  },
  statusTextPending: {
    color: THEME.colors.primary,
  },
  statusTextCancelled: {
    color: THEME.colors.danger,
  },
  itemsList: {
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.border,
    paddingBottom: THEME.spacing.sm,
    marginBottom: THEME.spacing.sm,
  },
  subItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 2,
  },
  subItemDetails: {
    color: THEME.colors.text,
    fontSize: 12,
  },
  subItemPrice: {
    color: THEME.colors.textSecondary,
    fontSize: 12,
  },
  orderFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalLabel: {
    color: THEME.colors.textSecondary,
    fontSize: 13,
  },
  totalPrice: {
    color: THEME.colors.primary,
    fontSize: 16,
    fontWeight: 'bold',
  },
  emptyText: {
    color: THEME.colors.textSecondary,
    textAlign: 'center',
    marginTop: THEME.spacing.xl,
    fontStyle: 'italic',
  },
  // Modal forms
  modalOverlay: {
    flex: 1,
    backgroundColor: THEME.colors.overlay,
    justifyContent: 'flex-end',
  },
  modalContentSheet: {
    backgroundColor: THEME.colors.background,
    borderTopLeftRadius: THEME.radius.lg,
    borderTopRightRadius: THEME.radius.lg,
    borderTopWidth: 1,
    borderTopColor: THEME.colors.border,
    height: '85%',
    padding: THEME.spacing.md,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.border,
    paddingBottom: THEME.spacing.sm,
    marginBottom: THEME.spacing.md,
  },
  modalTitle: {
    color: THEME.colors.text,
    fontSize: 16,
    fontWeight: 'bold',
  },
  closeBtnIcon: {
    padding: THEME.spacing.xs,
  },
  closeBtnIconText: {
    color: THEME.colors.textSecondary,
    fontSize: 16,
    fontWeight: 'bold',
  },
  modalFormScrollContent: {
    paddingBottom: THEME.spacing.xl * 2,
  },
  fieldLabel: {
    color: THEME.colors.primary,
    fontSize: 11,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    marginTop: THEME.spacing.sm + 4,
    marginBottom: 6,
    letterSpacing: 0.5,
  },
  formInput: {
    backgroundColor: THEME.colors.card,
    color: THEME.colors.text,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    borderRadius: THEME.radius.md,
    paddingHorizontal: THEME.spacing.md,
    paddingVertical: Platform.OS === 'ios' ? 12 : 8,
    fontSize: 14,
  },
  multilineInput: {
    height: 80,
    textAlignVertical: 'top',
  },
  categoryRadioGroup: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  radioItem: {
    backgroundColor: THEME.colors.card,
    borderColor: THEME.colors.border,
    borderWidth: 1,
    paddingHorizontal: THEME.spacing.md,
    paddingVertical: 8,
    borderRadius: THEME.radius.sm,
    marginRight: 6,
    marginBottom: 6,
  },
  radioItemActive: {
    backgroundColor: 'rgba(220, 165, 76, 0.12)',
    borderColor: THEME.colors.primary,
  },
  radioItemText: {
    color: THEME.colors.textSecondary,
    fontSize: 10,
    fontWeight: 'bold',
  },
  radioItemTextActive: {
    color: THEME.colors.primary,
  },
  availabilityFormRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: THEME.spacing.md,
    backgroundColor: THEME.colors.card,
    padding: THEME.spacing.sm + 4,
    borderRadius: THEME.radius.md,
    borderWidth: 1,
    borderColor: THEME.colors.border,
  },
  toggleSelector: {
    paddingHorizontal: THEME.spacing.md,
    paddingVertical: 8,
    borderRadius: THEME.radius.sm,
  },
  toggleGreen: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  toggleGray: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  toggleText: {
    color: THEME.colors.text,
    fontSize: 10,
    fontWeight: 'bold',
  },
  formActionButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: THEME.spacing.lg,
  },
  formBtn: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: THEME.radius.md,
  },
  formBtnCancel: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    marginRight: THEME.spacing.sm,
    borderWidth: 1,
    borderColor: THEME.colors.border,
  },
  formBtnSave: {
    backgroundColor: THEME.colors.primary,
    marginLeft: THEME.spacing.sm,
  },
  formBtnTextCancel: {
    color: THEME.colors.textSecondary,
    fontWeight: 'bold',
    fontSize: 13,
  },
  formBtnTextSave: {
    color: THEME.colors.background,
    fontWeight: 'bold',
    fontSize: 13,
  },
});
