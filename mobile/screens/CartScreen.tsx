import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  Alert,
  TextInput,
} from 'react-native';
import { THEME } from '../theme';
import { useCartStore, CartItem } from '../store/cartStore';
import { useUserStore } from '../store/userStore';
import { MenuItem } from '../components/MenuCard';

interface CartScreenProps {
  onOrderSuccess: () => void;
  menuItems?: MenuItem[];
}

export const CartScreen: React.FC<CartScreenProps> = ({ onOrderSuccess, menuItems }) => {
  const currentUser = useUserStore((state) => state.currentUser);
  const tableNumber = useUserStore((state) => state.tableNumber);

  const [submitting, setSubmitting] = useState(false);
  const [guestTableNumber, setGuestTableNumber] = useState(tableNumber || '4');
  const [guestName, setGuestName] = useState('');
  
  React.useEffect(() => {
    if (tableNumber) {
      setGuestTableNumber(tableNumber);
    }
  }, [tableNumber]);

  const cartItems = useCartStore((state) => state.items);
  const addItem = useCartStore((state) => state.addItem);
  const updateQuantity = useCartStore((state) => state.updateQuantity);
  const removeItemCompletely = useCartStore((state) => state.removeItemCompletely);
  const clearCart = useCartStore((state) => state.clearCart);
  const addGuestOrder = useCartStore((state) => state.addGuestOrder);

  const backendUrl = Platform.OS === 'android' ? 'http://10.0.2.2:5000' : 'http://localhost:5000';

  // Cost calculations
  const subtotal = cartItems.reduce((acc, item) => acc + item.price * item.quantity, 0);
  const tax = subtotal * 0.08;
  const delivery = subtotal > 0 ? 3.0 : 0;
  const total = subtotal + tax + delivery;

  const handleCheckout = async () => {
    if (cartItems.length === 0) {
      Alert.alert('Empty Cart', 'Your shopping cart is empty.');
      return;
    }

    setSubmitting(true);
    try {
      // 1. Structure database request payload
      const orderPayload = {
        userId: currentUser ? currentUser.id : 'guest',
        items: cartItems.map((item) => ({
          menuItemId: item.id,
          quantity: item.quantity,
        })),
      };

      // 2. Submit order to Express REST backend
      const response = await fetch(`${backendUrl}/api/orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(orderPayload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to submit order');
      }

      // 3. If guest checkout, add order receipt to local Zustand store
      if (!currentUser) {
        addGuestOrder({
          ...data,
          // Support custom guest table and name in the history display
          guestTable: guestTableNumber,
          guestName: guestName || 'Guest',
        });
      }

      // 4. Clear cart state and notify
      clearCart();
      Alert.alert(
        '🎉 Order Confirmed!',
        `Your order has been placed successfully.\nTotal Amount: $${total.toFixed(2)}`,
        [{ text: 'Great!', onPress: onOrderSuccess }]
      );
    } catch (err: any) {
      console.error(err);
      Alert.alert('Checkout Failed', err.message || 'Something went wrong during checkout.');
    } finally {
      setSubmitting(false);
    }
  };

  const renderCartItem = ({ item }: { item: CartItem }) => (
    <View style={styles.cartCard}>
      <View style={styles.cartHeader}>
        <Text style={styles.cartEmoji}>{item.icon || '🍔'}</Text>
        <View style={styles.cartDetails}>
          <Text style={styles.cartItemName}>{item.name}</Text>
          <Text style={styles.cartItemPrice}>${item.price.toFixed(2)} each</Text>
        </View>
        <TouchableOpacity 
          onPress={() => removeItemCompletely(item.id)} 
          style={styles.deleteBtn}
        >
          <Text style={styles.deleteBtnText}>🗑️</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.cartFooter}>
        <Text style={styles.cartItemTotal}>
          Total: ${(item.price * item.quantity).toFixed(2)}
        </Text>
        <View style={styles.quantityControls}>
          <TouchableOpacity
            style={styles.qtyBtn}
            onPress={() => updateQuantity(item.id, item.quantity - 1)}
          >
            <Text style={styles.qtyBtnText}>-</Text>
          </TouchableOpacity>
          <Text style={styles.qtyText}>{item.quantity}</Text>
          <TouchableOpacity
            style={styles.qtyBtn}
            onPress={() => updateQuantity(item.id, item.quantity + 1)}
          >
            <Text style={styles.qtyBtnText}>+</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  const renderFooter = () => {
    // 1. Calculate pairings
    const hasMains = cartItems.some((item) => {
      const menuItm = menuItems?.find(m => m.id === item.id);
      return menuItm?.category.toLowerCase() === 'main' || item.name.toLowerCase().includes('burger') || item.name.toLowerCase().includes('salmon');
    });

    // Determine recommendations
    let recommended: MenuItem[] = [];
    if (menuItems && menuItems.length > 0) {
      if (hasMains) {
        // Has mains -> recommend beverages or appetizers that are NOT already in the cart
        recommended = menuItems.filter((m) => 
          (m.category.toLowerCase() === 'appetizer' || m.category.toLowerCase() === 'beverage') &&
          !cartItems.some((cartItem) => cartItem.id === m.id)
        );
      } else {
        // Has only appetizers/desserts/etc -> recommend mains that are NOT already in the cart
        recommended = menuItems.filter((m) => 
          m.category.toLowerCase() === 'main' &&
          !cartItems.some((cartItem) => cartItem.id === m.id)
        );
      }
    }

    // Fallback if recommended is empty
    if (recommended.length === 0 && menuItems) {
      recommended = menuItems.filter(m => !cartItems.some(cartItem => cartItem.id === m.id));
    }

    return (
      <View style={styles.footerContainer}>
        {/* 1. Cross-Selling Recommendations Section */}
        {recommended.length > 0 && (
          <View style={styles.pairingsSection}>
            <Text style={styles.pairingsTitle}>🍷 Perfect Pairings For Your Meal</Text>
            <Text style={styles.pairingsSub}>Add these chef recommendations to complete your table</Text>
            
            <FlatList
              horizontal
              data={recommended.slice(0, 4)}
              keyExtractor={(item) => item.id}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.pairingsScroll}
              renderItem={({ item }) => (
                <View style={styles.pairingCard}>
                  <Text style={styles.pairingIcon}>{item.icon}</Text>
                  <View style={styles.pairingDetails}>
                    <Text style={styles.pairingName} numberOfLines={1}>{item.name}</Text>
                    <Text style={styles.pairingPrice}>${item.price.toFixed(2)}</Text>
                  </View>
                  <TouchableOpacity
                    style={styles.addPairingBtn}
                    onPress={() => {
                      addItem({
                        id: item.id,
                        name: item.name,
                        price: item.price,
                        icon: item.icon,
                      });
                      Alert.alert('Added Pairing', `${item.name} has been added to your cart.`);
                    }}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.addPairingBtnText}>➕ Add</Text>
                  </TouchableOpacity>
                </View>
              )}
            />
          </View>
        )}

        {/* 2. Pricing Tally Summary Card */}
        <View style={styles.summaryCardInside}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Subtotal</Text>
            <Text style={styles.summaryVal}>${subtotal.toFixed(2)}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Tax (8%)</Text>
            <Text style={styles.summaryVal}>${tax.toFixed(2)}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Delivery Service</Text>
            <Text style={styles.summaryVal}>${delivery.toFixed(2)}</Text>
          </View>
          <View style={[styles.summaryRow, styles.totalRow]}>
            <Text style={styles.totalLabel}>Grand Total</Text>
            <Text style={styles.totalVal}>${total.toFixed(2)}</Text>
          </View>

          {!currentUser && (
            <View style={styles.guestDetailsCard}>
              <Text style={styles.guestDetailsTitle}>Guest Details (Optional)</Text>
              
              <View style={styles.guestInputRow}>
                <View style={[styles.guestInputWrapper, { flex: 1, marginRight: THEME.spacing.sm }]}>
                  <Text style={styles.guestInputLabel}>Table #</Text>
                  <TextInput
                    style={styles.guestInput}
                    placeholder="e.g. 4"
                    placeholderTextColor={THEME.colors.textSecondary}
                    value={guestTableNumber}
                    onChangeText={setGuestTableNumber}
                    keyboardType="numeric"
                  />
                </View>
                
                <View style={[styles.guestInputWrapper, { flex: 2 }]}>
                  <Text style={styles.guestInputLabel}>Guest Name</Text>
                  <TextInput
                    style={styles.guestInput}
                    placeholder="e.g. Alex"
                    placeholderTextColor={THEME.colors.textSecondary}
                    value={guestName}
                    onChangeText={setGuestName}
                  />
                </View>
              </View>
            </View>
          )}

          <TouchableOpacity
            style={styles.checkoutBtn}
            onPress={handleCheckout}
            disabled={submitting}
            activeOpacity={0.8}
          >
            {submitting ? (
              <ActivityIndicator size="small" color={THEME.colors.background} />
            ) : (
              <Text style={styles.checkoutBtnText}>
                {currentUser ? 'Place Relational Order' : 'Place Guest Order'}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {cartItems.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyEmoji}>🛒</Text>
          <Text style={styles.emptyText}>Your shopping cart is empty.</Text>
          <Text style={styles.emptySubText}>
            Speak to our AI waiter or browse our digital menu to add delicious dishes!
          </Text>
        </View>
      ) : (
        <View style={styles.activeContainer}>
          <FlatList
            data={cartItems}
            keyExtractor={(item) => item.id}
            renderItem={renderCartItem}
            contentContainerStyle={styles.listContent}
            ListFooterComponent={renderFooter}
          />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.colors.background,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: THEME.spacing.lg,
  },
  emptyEmoji: {
    fontSize: 64,
    marginBottom: THEME.spacing.md,
  },
  emptyText: {
    color: THEME.colors.text,
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: THEME.spacing.xs,
  },
  emptySubText: {
    color: THEME.colors.textSecondary,
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
  },
  activeContainer: {
    flex: 1,
  },
  listContent: {
    padding: THEME.spacing.md,
  },
  cartCard: {
    backgroundColor: THEME.colors.card,
    borderRadius: THEME.radius.md,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    padding: THEME.spacing.md,
    marginBottom: THEME.spacing.md,
  },
  cartHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: THEME.spacing.sm,
  },
  cartEmoji: {
    fontSize: 32,
    marginRight: THEME.spacing.sm,
  },
  cartDetails: {
    flex: 1,
  },
  cartItemName: {
    color: THEME.colors.text,
    fontSize: 16,
    fontWeight: 'bold',
  },
  cartItemPrice: {
    color: THEME.colors.textSecondary,
    fontSize: 12,
  },
  deleteBtn: {
    padding: THEME.spacing.xs,
  },
  deleteBtnText: {
    fontSize: 18,
  },
  cartFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: THEME.colors.border,
    paddingTop: THEME.spacing.sm,
    marginTop: THEME.spacing.xs,
  },
  cartItemTotal: {
    color: THEME.colors.primary,
    fontWeight: 'bold',
    fontSize: 14,
  },
  quantityControls: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.colors.background,
    borderRadius: THEME.radius.sm,
    borderWidth: 1,
    borderColor: THEME.colors.border,
  },
  qtyBtn: {
    paddingHorizontal: THEME.spacing.sm + 2,
    paddingVertical: THEME.spacing.xs,
  },
  qtyBtnText: {
    color: THEME.colors.primary,
    fontWeight: 'bold',
    fontSize: 18,
  },
  qtyText: {
    color: THEME.colors.text,
    fontWeight: 'bold',
    paddingHorizontal: THEME.spacing.sm,
  },
  footerContainer: {
    paddingBottom: THEME.spacing.xl,
  },
  pairingsSection: {
    marginTop: THEME.spacing.md,
    paddingVertical: THEME.spacing.sm,
  },
  pairingsTitle: {
    color: THEME.colors.primary,
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  pairingsSub: {
    color: THEME.colors.textSecondary,
    fontSize: 11,
    marginBottom: THEME.spacing.md,
  },
  pairingsScroll: {
    paddingVertical: 4,
  },
  pairingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.colors.card,
    borderRadius: THEME.radius.md,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    padding: THEME.spacing.sm,
    marginRight: THEME.spacing.sm,
    width: 220,
    justifyContent: 'space-between',
  },
  pairingIcon: {
    fontSize: 24,
    marginRight: THEME.spacing.sm,
  },
  pairingDetails: {
    flex: 1,
    marginRight: THEME.spacing.xs,
  },
  pairingName: {
    color: THEME.colors.text,
    fontSize: 12,
    fontWeight: 'bold',
  },
  pairingPrice: {
    color: THEME.colors.primary,
    fontSize: 11,
    fontWeight: 'bold',
    marginTop: 2,
  },
  addPairingBtn: {
    backgroundColor: 'rgba(220, 165, 76, 0.12)',
    borderColor: 'rgba(220, 165, 76, 0.25)',
    borderWidth: 1,
    borderRadius: THEME.radius.sm,
    paddingHorizontal: THEME.spacing.sm,
    paddingVertical: 4,
  },
  addPairingBtnText: {
    color: THEME.colors.primary,
    fontSize: 10,
    fontWeight: 'bold',
  },
  summaryCardInside: {
    backgroundColor: THEME.colors.card,
    borderRadius: THEME.radius.lg,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    padding: THEME.spacing.lg,
    marginTop: THEME.spacing.md,
    marginBottom: THEME.spacing.xl,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 5,
    elevation: 5,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: THEME.spacing.xs,
  },
  summaryLabel: {
    color: THEME.colors.textSecondary,
    fontSize: 13,
  },
  summaryVal: {
    color: THEME.colors.text,
    fontSize: 13,
  },
  totalRow: {
    borderTopColor: THEME.colors.border,
    borderTopWidth: 1,
    paddingTop: THEME.spacing.xs,
    marginTop: THEME.spacing.xs,
    marginBottom: THEME.spacing.md,
  },
  totalLabel: {
    color: THEME.colors.text,
    fontWeight: 'bold',
    fontSize: 16,
  },
  totalVal: {
    color: THEME.colors.primary,
    fontWeight: 'bold',
    fontSize: 20,
  },
  checkoutBtn: {
    backgroundColor: THEME.colors.primary,
    paddingVertical: THEME.spacing.md,
    borderRadius: THEME.radius.md,
    alignItems: 'center',
  },
  checkoutBtnText: {
    color: THEME.colors.background,
    fontWeight: 'bold',
    fontSize: 16,
  },
  guestDetailsCard: {
    backgroundColor: THEME.colors.background,
    borderRadius: THEME.radius.md,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    padding: THEME.spacing.md,
    marginBottom: THEME.spacing.md,
  },
  guestDetailsTitle: {
    color: THEME.colors.primary,
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: THEME.spacing.sm,
  },
  guestInputRow: {
    flexDirection: 'row',
  },
  guestInputWrapper: {
    marginBottom: 0,
  },
  guestInputLabel: {
    color: THEME.colors.textSecondary,
    fontSize: 10,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  guestInput: {
    backgroundColor: THEME.colors.card,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    borderRadius: THEME.radius.sm,
    color: THEME.colors.text,
    paddingHorizontal: THEME.spacing.sm,
    paddingVertical: Platform.OS === 'ios' ? 8 : 4,
    fontSize: 12,
  },
});
