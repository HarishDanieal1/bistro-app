import React, { useState, useEffect } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  StatusBar,
  Modal,
} from 'react-native';
import { THEME } from './theme';
import { useUserStore } from './store/userStore';
import { useCartStore } from './store/cartStore';
import { LoginScreen } from './screens/LoginScreen';
import { HomeScreen } from './screens/HomeScreen';
import { MenuScreen } from './screens/MenuScreen';
import { CartScreen } from './screens/CartScreen';
import { ProfileScreen } from './screens/ProfileScreen';
import { AIWaiterModal } from './components/AIWaiterModal';
import { MenuItem } from './components/MenuCard';

export default function App() {
  const [activeTab, setActiveTab] = useState<'home' | 'menu' | 'cart' | 'profile'>('home');
  const [aiModalVisible, setAiModalVisible] = useState(false);
  const [autoStartListen, setAutoStartListen] = useState(false);
  const [loginModalVisible, setLoginModalVisible] = useState(false);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [loadingMenu, setLoadingMenu] = useState(true);
  const [menuError, setMenuError] = useState<string | null>(null);

  // Dynamic cart addition popup tracking (origin: manual vs AI curated)
  const [addedItemPopup, setAddedItemPopup] = useState<{
    item: MenuItem;
    addedByAI: boolean;
    visible: boolean;
  } | null>(null);

  // Auto-dismiss the popup overlay after 4 seconds
  useEffect(() => {
    if (addedItemPopup && addedItemPopup.visible) {
      const timer = setTimeout(() => {
        setAddedItemPopup(prev => prev ? { ...prev, visible: false } : null);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [addedItemPopup]);

  const currentUser = useUserStore((state) => state.currentUser);
  const tableNumber = useUserStore((state) => state.tableNumber);
  const logout = useUserStore((state) => state.logout);
  const cartItems = useCartStore((state) => state.items);
  const addItem = useCartStore((state) => state.addItem);
  const clearCart = useCartStore((state) => state.clearCart);

  const handleSignOut = () => {
    clearCart();
    logout();
  };

  const totalCartCount = cartItems.reduce((acc, item) => acc + item.quantity, 0);

  const backendUrl = Platform.OS === 'android' ? 'http://10.0.2.2:5000' : 'http://localhost:5000';

  // 1. Fetch live menu items on mount
  const fetchMenu = async () => {
    setLoadingMenu(true);
    setMenuError(null);
    try {
      const response = await fetch(`${backendUrl}/api/menu`);
      if (!response.ok) {
        throw new Error(`Failed to load menu (${response.status})`);
      }
      const data = await response.json();
      
      // Normalize menu data structure
      const items: MenuItem[] = Array.isArray(data) ? data : data.items ?? [];
      setMenuItems(items);
    } catch (err: any) {
      console.warn('Backend menu fetch error, using fallbacks:', err.message);
      setMenuError(err.message || 'Connection error. Check backend server.');
    } finally {
      setLoadingMenu(false);
    }
  };

  useEffect(() => {
    fetchMenu();
  }, [currentUser, activeTab]);

  // Silent background polling to synchronize kitchen menu changes in real-time
  useEffect(() => {
    const interval = setInterval(() => {
      const quietFetchMenu = async () => {
        try {
          const response = await fetch(`${backendUrl}/api/menu`);
          if (response.ok) {
            const data = await response.json();
            const items: MenuItem[] = Array.isArray(data) ? data : data.items ?? [];
            setMenuItems(items);
          }
        } catch (err) {
          // ignore background fetch errors to keep UI flow seamless
        }
      };
      quietFetchMenu();
    }, 6000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (currentUser && loginModalVisible) {
      setLoginModalVisible(false);
    }
  }, [currentUser, loginModalVisible]);

  // Quick action from HomeScreen to menu tab
  const handleNavigateToMenu = () => setActiveTab('menu');

  // Triggered from HomeScreen or Header
  const handleOpenAIWaiter = (startWithListen: boolean) => {
    setAutoStartListen(startWithListen);
    setAiModalVisible(true);
  };

  // Triggered on menu add to order
  const handleAddItemToCart = (item: MenuItem) => {
    addItem({
      id: item.id,
      name: item.name,
      price: item.price,
      icon: item.icon,
      quantity: 1,
    });
    setAddedItemPopup({
      item,
      addedByAI: false,
      visible: true,
    });
  };

  // 2. Render appropriate screen content based on active tab
  const renderScreenContent = () => {
    switch (activeTab) {
      case 'home':
        return (
          <HomeScreen
            onNavigateToMenu={handleNavigateToMenu}
            onOpenAIWaiter={() => handleOpenAIWaiter(true)}
            featuredItems={menuItems}
          />
        );
      case 'menu':
        return (
          <MenuScreen
            items={menuItems}
            loading={loadingMenu}
            error={menuError}
            onAdd={handleAddItemToCart}
            onRefresh={fetchMenu}
          />
        );
      case 'cart':
        return (
          <CartScreen
            onOrderSuccess={() => setActiveTab('profile')}
            menuItems={menuItems}
          />
        );
      case 'profile':
        return (
          <ProfileScreen
            onOpenLogin={() => setLoginModalVisible(true)}
            onRefreshMenu={fetchMenu}
          />
        );
      default:
        return <HomeScreen onNavigateToMenu={handleNavigateToMenu} onOpenAIWaiter={() => handleOpenAIWaiter(true)} featuredItems={menuItems} />;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Top Premium Custom Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerBrand}>THE INTELLIGENT BISTRO</Text>
          {currentUser && (
            <Text style={styles.headerUserGreeting}>
              Table #{tableNumber || '4'} • {currentUser.name}
            </Text>
          )}
        </View>
        
        <View style={styles.headerActions}>
          {/* Floating Conversational AI Waiter Button */}
          <TouchableOpacity
            style={styles.aiHeaderBtn}
            onPress={() => handleOpenAIWaiter(false)}
            activeOpacity={0.8}
          >
            <Text style={styles.aiHeaderBtnText}>🤵 Waiter</Text>
          </TouchableOpacity>

          {/* Conditional Sign In / Sign Out Button */}
          {currentUser ? (
            <TouchableOpacity
              style={styles.signOutHeaderBtn}
              onPress={handleSignOut}
              activeOpacity={0.8}
            >
              <Text style={styles.signOutHeaderBtnText}>🚪 Sign Out</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={styles.signInHeaderBtn}
              onPress={() => setLoginModalVisible(true)}
              activeOpacity={0.8}
            >
              <Text style={styles.signInHeaderBtnText}>🔑 Sign In</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Active Tab Screen Area */}
      <View style={styles.screenWrapper}>{renderScreenContent()}</View>

      {/* Glassmorphic Floating Bottom Tab Bar */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'home' ? styles.tabItemActive : {}]}
          onPress={() => setActiveTab('home')}
        >
          <Text style={styles.tabIcon}>🏠</Text>
          <Text style={[styles.tabLabel, activeTab === 'home' ? styles.tabLabelActive : {}]}>
            Home
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'menu' ? styles.tabItemActive : {}]}
          onPress={() => setActiveTab('menu')}
        >
          <Text style={styles.tabIcon}>🍽️</Text>
          <Text style={[styles.tabLabel, activeTab === 'menu' ? styles.tabLabelActive : {}]}>
            Menu
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'cart' ? styles.tabItemActive : {}]}
          onPress={() => setActiveTab('cart')}
        >
          <View>
            <Text style={styles.tabIcon}>🛒</Text>
            {totalCartCount > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{totalCartCount}</Text>
              </View>
            )}
          </View>
          <Text style={[styles.tabLabel, activeTab === 'cart' ? styles.tabLabelActive : {}]}>
            Cart
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'profile' ? styles.tabItemActive : {}]}
          onPress={() => setActiveTab('profile')}
        >
          <Text style={styles.tabIcon}>👤</Text>
          <Text style={[styles.tabLabel, activeTab === 'profile' ? styles.tabLabelActive : {}]}>
            Profile
          </Text>
        </TouchableOpacity>
      </View>

      {/* AI Waiter Assistant Conversational modal sheet */}
      <AIWaiterModal
        visible={aiModalVisible}
        autoStartListen={autoStartListen}
        onClose={() => {
          setAiModalVisible(false);
          setAutoStartListen(false);
        }}
        menuItems={menuItems}
        onItemAddedByAI={(item) => {
          setAddedItemPopup({
            item,
            addedByAI: true,
            visible: true,
          });
        }}
      />

      {/* Premium Ingredients & Cart Addition Confirmation Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={!!addedItemPopup?.visible}
        onRequestClose={() => {
          setAddedItemPopup(prev => prev ? { ...prev, visible: false } : null);
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.popupCard}>
            {/* Header */}
            <View style={styles.popupHeader}>
              <Text style={styles.popupHeaderSubtitle}>SUCCESSFULLY ADDED</Text>
              <Text style={styles.popupHeaderTitle}>Dish Added to Order!</Text>
            </View>

            {/* Food Info Row */}
            <View style={styles.popupFoodInfo}>
              <View style={styles.popupFoodIconBg}>
                <Text style={styles.popupFoodIcon}>{addedItemPopup?.item.icon || '🍽️'}</Text>
              </View>
              <View style={styles.popupFoodDetails}>
                <Text style={styles.popupFoodName}>{addedItemPopup?.item.name}</Text>
                <Text style={styles.popupFoodPrice}>${addedItemPopup?.item.price.toFixed(2)}</Text>
              </View>
            </View>

            {/* Custom Origin Badge */}
            <View style={styles.popupOriginWrapper}>
              {addedItemPopup?.addedByAI ? (
                <View style={styles.aiBadge}>
                  <Text style={styles.aiBadgeText}>✨ CURATED BY AI WAITER</Text>
                </View>
              ) : (
                <View style={styles.manualBadge}>
                  <Text style={styles.manualBadgeText}>✋ HAND-ADDED</Text>
                </View>
              )}
            </View>

            {/* Ingredients Section */}
            <View style={styles.popupIngredientsSection}>
              <Text style={styles.popupIngredientsTitle}>Ingredients Used</Text>
              <View style={styles.ingredientsPillContainer}>
                {addedItemPopup?.item.ingredients ? (
                  addedItemPopup.item.ingredients.split(',').map((ingredient, idx) => (
                    <View key={idx} style={styles.ingredientPill}>
                      <Text style={styles.ingredientPillText}>{ingredient.trim()}</Text>
                    </View>
                  ))
                ) : (
                  <View style={styles.ingredientPill}>
                    <Text style={styles.ingredientPillText}>Premium Chef Selection</Text>
                  </View>
                )}
              </View>
            </View>

            {/* Actions / Confirmation Footer */}
            <TouchableOpacity
              style={styles.popupConfirmBtn}
              onPress={() => {
                setAddedItemPopup(prev => prev ? { ...prev, visible: false } : null);
              }}
              activeOpacity={0.8}
            >
              <Text style={styles.popupConfirmBtnText}>Confirm Order Selection</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Login Modal Sheet */}
      <Modal
        animationType="slide"
        transparent={false}
        visible={loginModalVisible}
        onRequestClose={() => setLoginModalVisible(false)}
      >
        <LoginScreen onClose={() => setLoginModalVisible(false)} />
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    height: (Platform.OS === 'web' ? '100vh' : '100%') as any,
    width: (Platform.OS === 'web' ? '100vw' : '100%') as any,
    backgroundColor: THEME.colors.background,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  authContainer: {
    flex: 1,
    height: (Platform.OS === 'web' ? '100vh' : '100%') as any,
    width: (Platform.OS === 'web' ? '100vw' : '100%') as any,
    backgroundColor: THEME.colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: THEME.spacing.md,
    paddingVertical: THEME.spacing.sm + 2,
    backgroundColor: THEME.colors.card,
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.border,
  },
  headerBrand: {
    color: THEME.colors.primary,
    fontSize: 14,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  headerUserGreeting: {
    color: THEME.colors.textSecondary,
    fontSize: 11,
    fontWeight: 'bold',
    marginTop: 2,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  aiHeaderBtn: {
    backgroundColor: THEME.colors.primary,
    paddingHorizontal: THEME.spacing.md,
    paddingVertical: THEME.spacing.xs + 2,
    borderRadius: THEME.radius.sm,
    shadowColor: THEME.colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  },
  aiHeaderBtnText: {
    color: THEME.colors.background,
    fontWeight: 'bold',
    fontSize: 13,
  },
  signOutHeaderBtn: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderColor: 'rgba(239, 68, 68, 0.25)',
    borderWidth: 1,
    paddingHorizontal: THEME.spacing.sm + 2,
    paddingVertical: THEME.spacing.xs + 2,
    borderRadius: THEME.radius.sm,
    marginLeft: THEME.spacing.sm,
  },
  signOutHeaderBtnText: {
    color: THEME.colors.danger,
    fontWeight: 'bold',
    fontSize: 12,
  },
  signInHeaderBtn: {
    backgroundColor: 'rgba(220, 165, 76, 0.12)',
    borderColor: 'rgba(220, 165, 76, 0.25)',
    borderWidth: 1,
    paddingHorizontal: THEME.spacing.sm + 2,
    paddingVertical: THEME.spacing.xs + 2,
    borderRadius: THEME.radius.sm,
    marginLeft: THEME.spacing.sm,
  },
  signInHeaderBtnText: {
    color: THEME.colors.primary,
    fontWeight: 'bold',
    fontSize: 12,
  },
  screenWrapper: {
    flex: 1,
    height: (Platform.OS === 'web' ? 'calc(100vh - 120px)' : 'auto') as any,
    width: '100%',
  },
  tabBar: {
    flexDirection: 'row',
    height: 64,
    backgroundColor: THEME.colors.card,
    borderTopWidth: 1,
    borderTopColor: THEME.colors.border,
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingBottom: Platform.OS === 'ios' ? 12 : 0,
  },
  tabItem: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    height: '100%',
    opacity: 0.6,
  },
  tabItemActive: {
    opacity: 1,
  },
  tabIcon: {
    fontSize: 20,
    marginBottom: 2,
  },
  tabLabel: {
    color: THEME.colors.textSecondary,
    fontSize: 10,
    fontWeight: '600',
  },
  tabLabelActive: {
    color: THEME.colors.primary,
    fontWeight: 'bold',
  },
  badge: {
    position: 'absolute',
    right: -10,
    top: -4,
    backgroundColor: THEME.colors.primary,
    borderRadius: THEME.radius.round,
    width: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeText: {
    color: THEME.colors.background,
    fontSize: 9,
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: THEME.spacing.lg,
  },
  popupCard: {
    backgroundColor: '#1E1E1E',
    borderRadius: THEME.radius.lg,
    borderWidth: 1,
    borderColor: 'rgba(220, 165, 76, 0.35)', // gold with transparency
    width: '90%',
    maxWidth: 380,
    padding: THEME.spacing.lg,
    shadowColor: THEME.colors.primary,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
    elevation: 10,
  },
  popupHeader: {
    alignItems: 'center',
    marginBottom: THEME.spacing.md,
  },
  popupHeaderSubtitle: {
    color: THEME.colors.primary,
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 1.5,
    marginBottom: 4,
  },
  popupHeaderTitle: {
    color: THEME.colors.text,
    fontSize: 22,
    fontWeight: 'bold',
  },
  popupFoodInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: THEME.radius.md,
    padding: THEME.spacing.md,
    marginBottom: THEME.spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  popupFoodIconBg: {
    width: 56,
    height: 56,
    borderRadius: THEME.radius.sm,
    backgroundColor: 'rgba(220, 165, 76, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(220, 165, 76, 0.2)',
  },
  popupFoodIcon: {
    fontSize: 32,
  },
  popupFoodDetails: {
    marginLeft: THEME.spacing.md,
    flex: 1,
  },
  popupFoodName: {
    color: THEME.colors.text,
    fontSize: 18,
    fontWeight: 'bold',
  },
  popupFoodPrice: {
    color: THEME.colors.primary,
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 2,
  },
  popupOriginWrapper: {
    alignItems: 'center',
    marginBottom: THEME.spacing.md,
  },
  aiBadge: {
    backgroundColor: 'rgba(220, 165, 76, 0.15)',
    borderColor: '#dca54c',
    borderWidth: 1,
    borderRadius: THEME.radius.round,
    paddingHorizontal: THEME.spacing.md,
    paddingVertical: THEME.spacing.xs + 2,
    shadowColor: THEME.colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  aiBadgeText: {
    color: '#dca54c',
    fontSize: 11,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  manualBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderColor: 'rgba(255, 255, 255, 0.15)',
    borderWidth: 1,
    borderRadius: THEME.radius.round,
    paddingHorizontal: THEME.spacing.md,
    paddingVertical: THEME.spacing.xs + 2,
  },
  manualBadgeText: {
    color: THEME.colors.textSecondary,
    fontSize: 11,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  popupIngredientsSection: {
    marginBottom: THEME.spacing.lg,
  },
  popupIngredientsTitle: {
    color: THEME.colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
    marginBottom: THEME.spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  ingredientsPillContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -4,
  },
  ingredientPill: {
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    margin: 4,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  ingredientPillText: {
    color: THEME.colors.text,
    fontSize: 12,
  },
  popupConfirmBtn: {
    backgroundColor: THEME.colors.primary,
    borderRadius: THEME.radius.md,
    paddingVertical: THEME.spacing.md,
    alignItems: 'center',
    shadowColor: THEME.colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
    elevation: 5,
  },
  popupConfirmBtnText: {
    color: '#121212',
    fontSize: 14,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
});
