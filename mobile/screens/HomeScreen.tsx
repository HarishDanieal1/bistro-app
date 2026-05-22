import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { THEME } from '../theme';
import { useUserStore } from '../store/userStore';
import { MenuItem } from '../components/MenuCard';

interface HomeScreenProps {
  onNavigateToMenu: () => void;
  onOpenAIWaiter: () => void;
  featuredItems: MenuItem[];
}

export const HomeScreen: React.FC<HomeScreenProps> = ({
  onNavigateToMenu,
  onOpenAIWaiter,
  featuredItems,
}) => {
  const currentUser = useUserStore((state) => state.currentUser);
  const tableNumber = useUserStore((state) => state.tableNumber);
  const setTableNumber = useUserStore((state) => state.setTableNumber);
  
  const [scanning, setScanning] = useState(false);

  const handleScanQRCode = () => {
    setScanning(true);
    setTimeout(() => {
      const tables = ['3', '5', '6', '8', '9', '12'];
      const randomTable = tables[Math.floor(Math.random() * tables.length)];
      setTableNumber(randomTable);
      setScanning(false);
    }, 1600);
  };

  const suggestionChips = [
    "Add classic wagyu burger",
    "Bring me 2 truffle fries",
    "Do you have sparkling water?",
    "Remove caesar salad",
  ];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Welcome Hero Banner */}
      <View style={styles.heroCard}>
        {currentUser ? (
          <>
            <Text style={styles.welcomeText}>Welcome back,</Text>
            <Text style={styles.userNameText}>{currentUser.name} ✨</Text>
            <Text style={styles.heroSubText}>
              Experience conversational dining at its finest with our automated AI Waiter.{"\n"}
              How can we help you today?
            </Text>
            <TouchableOpacity style={styles.primaryBtn} onPress={onNavigateToMenu}>
              <Text style={styles.primaryBtnText}>Browse Digital Menu</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <Text style={styles.userNameText}>WELCOME TO OUR BISTRO RESTURANT,</Text>
            <Text style={styles.heroSubText}>
              Experience conversational dining at its finest with our automated AI Waiter{"\n"}
              How can we help you today {tableNumber ? `(Dining at Table #${tableNumber})` : ''}
            </Text>
            <View style={styles.heroButtonsRow}>
              <TouchableOpacity style={[styles.primaryBtn, { flex: 1.2, marginRight: 8 }]} onPress={onNavigateToMenu}>
                <Text style={styles.primaryBtnText}>Browse Menu</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.scanBtn} onPress={handleScanQRCode}>
                <Text style={styles.scanBtnText}>
                  📷 {tableNumber ? `Table #${tableNumber}` : 'Scan Table QR'}
                </Text>
              </TouchableOpacity>
            </View>
          </>
        )}
      </View>

      {/* AI Assistant Banner */}
      <View style={styles.aiStatusCard}>
        <View style={styles.aiStatusHeader}>
          <View style={styles.pulseContainer}>
            <View style={styles.pulseInner} />
            <Text style={styles.aiEmoji}>🤵</Text>
          </View>
          <View>
            <Text style={styles.aiStatusTitle}>AI Waiter is Online</Text>
            <Text style={styles.aiStatusSub}>Powered by Gemini Generative AI</Text>
          </View>
        </View>
        <Text style={styles.aiDescription}>
          Order dishes, ask menu questions, customize quantities, or clear your cart by speaking directly to the digital waiter.
        </Text>
        <TouchableOpacity style={styles.aiButton} onPress={onOpenAIWaiter}>
          <Text style={styles.aiButtonText}>🎙️ Talk to Waiter</Text>
        </TouchableOpacity>
      </View>

      {/* suggestion chips */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Try Saying These</Text>
        <Text style={styles.sectionSub}>Press to launch AI Waiter assistant</Text>
      </View>
      <View style={styles.chipsContainer}>
        {suggestionChips.map((chip, idx) => (
          <TouchableOpacity
            key={idx}
            style={styles.chip}
            onPress={onOpenAIWaiter}
          >
            <Text style={styles.chipText}>💬 "{chip}"</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Featured items */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Chef's Recommendations</Text>
        <TouchableOpacity onPress={onNavigateToMenu}>
          <Text style={styles.seeAllText}>See All</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.horizontalScroll}
      >
        {featuredItems.slice(0, 3).map((item) => (
          <TouchableOpacity
            key={item.id}
            style={styles.featuredCard}
            onPress={onNavigateToMenu}
          >
            <Text style={styles.featuredIcon}>{item.icon}</Text>
            <Text style={styles.featuredName}>{item.name}</Text>
            <Text style={styles.featuredCategory}>{item.category.toUpperCase()}</Text>
            <Text style={styles.featuredPrice}>${item.price.toFixed(2)}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Table QR Scanner Simulator Modal */}
      <Modal visible={scanning} transparent={true} animationType="fade">
        <View style={styles.scannerModalOverlay}>
          <View style={styles.scannerContainer}>
            <Text style={styles.scannerTitle}>📷 TABLE QR SCANNER</Text>
            <Text style={styles.scannerSubtitle}>Align dining table QR code inside the frame</Text>

            <View style={styles.viewfinder}>
              <View style={[styles.corner, styles.topLeft]} />
              <View style={[styles.corner, styles.topRight]} />
              <View style={[styles.corner, styles.bottomLeft]} />
              <View style={[styles.corner, styles.bottomRight]} />
              <View style={styles.laserLine} />
            </View>

            <ActivityIndicator size="large" color={THEME.colors.primary} style={{ marginTop: 32 }} />
            <Text style={styles.scannerDecodingText}>Accessing Camera Feed & Decoding...</Text>

            <TouchableOpacity style={styles.cancelScanBtn} onPress={() => setScanning(false)}>
              <Text style={styles.cancelScanBtnText}>Cancel Scan</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.colors.background,
  },
  content: {
    padding: THEME.spacing.md,
    paddingBottom: THEME.spacing.xl * 2,
  },
  heroCard: {
    backgroundColor: THEME.colors.card,
    borderRadius: THEME.radius.lg,
    padding: THEME.spacing.lg,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    marginBottom: THEME.spacing.lg,
  },
  welcomeText: {
    color: THEME.colors.textSecondary,
    fontSize: 14,
    fontWeight: 'bold',
  },
  userNameText: {
    color: THEME.colors.text,
    fontSize: 28,
    fontWeight: 'bold',
    marginVertical: THEME.spacing.xs,
  },
  heroSubText: {
    color: THEME.colors.textSecondary,
    fontSize: 13,
    lineHeight: 18,
    marginBottom: THEME.spacing.md,
  },
  primaryBtn: {
    backgroundColor: THEME.colors.primary,
    paddingVertical: THEME.spacing.sm + 2,
    borderRadius: THEME.radius.sm,
    alignItems: 'center',
  },
  primaryBtnText: {
    color: THEME.colors.background,
    fontWeight: 'bold',
    fontSize: 14,
  },
  aiStatusCard: {
    backgroundColor: 'rgba(220, 165, 76, 0.04)',
    borderColor: 'rgba(220, 165, 76, 0.15)',
    borderWidth: 1,
    borderRadius: THEME.radius.lg,
    padding: THEME.spacing.md,
    marginBottom: THEME.spacing.lg,
  },
  aiStatusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: THEME.spacing.sm,
  },
  pulseContainer: {
    width: 40,
    height: 40,
    borderRadius: THEME.radius.round,
    backgroundColor: THEME.colors.card,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: THEME.spacing.sm,
    borderWidth: 1,
    borderColor: 'rgba(220, 165, 76, 0.3)',
  },
  pulseInner: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    borderRadius: THEME.radius.round,
    backgroundColor: THEME.colors.primary,
    opacity: 0.15,
  },
  aiEmoji: {
    fontSize: 22,
  },
  aiStatusTitle: {
    color: THEME.colors.text,
    fontSize: 15,
    fontWeight: 'bold',
  },
  aiStatusSub: {
    color: THEME.colors.primary,
    fontSize: 11,
    fontWeight: 'bold',
  },
  aiDescription: {
    color: THEME.colors.textSecondary,
    fontSize: 12,
    lineHeight: 18,
    marginBottom: THEME.spacing.md,
  },
  aiButton: {
    backgroundColor: 'rgba(220, 165, 76, 0.12)',
    paddingVertical: THEME.spacing.sm,
    borderRadius: THEME.radius.sm,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(220, 165, 76, 0.25)',
  },
  aiButtonText: {
    color: THEME.colors.primary,
    fontWeight: 'bold',
    fontSize: 13,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: THEME.spacing.md,
    marginBottom: THEME.spacing.sm,
  },
  sectionTitle: {
    color: THEME.colors.text,
    fontSize: 17,
    fontWeight: 'bold',
  },
  sectionSub: {
    color: THEME.colors.textSecondary,
    fontSize: 10,
    fontWeight: 'bold',
  },
  seeAllText: {
    color: THEME.colors.primary,
    fontWeight: 'bold',
    fontSize: 13,
  },
  chipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: THEME.spacing.lg,
  },
  chip: {
    backgroundColor: THEME.colors.card,
    borderColor: THEME.colors.border,
    borderWidth: 1,
    borderRadius: THEME.radius.round,
    paddingHorizontal: THEME.spacing.sm + 2,
    paddingVertical: THEME.spacing.xs + 2,
    marginRight: THEME.spacing.xs,
    marginBottom: THEME.spacing.xs,
  },
  chipText: {
    color: THEME.colors.text,
    fontSize: 11,
    fontWeight: '500',
  },
  horizontalScroll: {
    paddingRight: THEME.spacing.xl,
  },
  featuredCard: {
    backgroundColor: THEME.colors.card,
    borderColor: THEME.colors.border,
    borderWidth: 1,
    borderRadius: THEME.radius.md,
    padding: THEME.spacing.md,
    width: 140,
    marginRight: THEME.spacing.md,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 3,
  },
  featuredIcon: {
    fontSize: 36,
    marginBottom: THEME.spacing.xs,
  },
  featuredName: {
    color: THEME.colors.text,
    fontWeight: 'bold',
    fontSize: 13,
    textAlign: 'center',
    height: 36,
  },
  featuredCategory: {
    color: THEME.colors.textSecondary,
    fontSize: 8,
    fontWeight: 'bold',
    letterSpacing: 0.5,
    marginVertical: 4,
  },
  featuredPrice: {
    color: THEME.colors.primary,
    fontWeight: 'bold',
    fontSize: 15,
  },
  heroButtonsRow: {
    flexDirection: 'row',
    marginTop: THEME.spacing.sm,
  },
  scanBtn: {
    flex: 1,
    backgroundColor: 'rgba(220, 165, 76, 0.1)',
    borderColor: 'rgba(220, 165, 76, 0.25)',
    borderWidth: 1,
    borderRadius: THEME.radius.sm,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: THEME.spacing.sm + 2,
  },
  scanBtnText: {
    color: THEME.colors.primary,
    fontWeight: 'bold',
    fontSize: 13,
  },
  scannerModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(10, 10, 12, 0.96)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: THEME.spacing.xl,
  },
  scannerContainer: {
    width: '100%',
    maxWidth: 320,
    alignItems: 'center',
  },
  scannerTitle: {
    color: THEME.colors.primary,
    fontSize: 18,
    fontWeight: 'bold',
    letterSpacing: 1.5,
    marginBottom: 4,
  },
  scannerSubtitle: {
    color: THEME.colors.textSecondary,
    fontSize: 12,
    marginBottom: 32,
    textAlign: 'center',
  },
  viewfinder: {
    width: 200,
    height: 200,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  corner: {
    position: 'absolute',
    width: 20,
    height: 20,
    borderColor: THEME.colors.primary,
  },
  topLeft: {
    top: -2,
    left: -2,
    borderTopWidth: 3,
    borderLeftWidth: 3,
  },
  topRight: {
    top: -2,
    right: -2,
    borderTopWidth: 3,
    borderRightWidth: 3,
  },
  bottomLeft: {
    bottom: -2,
    left: -2,
    borderBottomWidth: 3,
    borderLeftWidth: 3,
  },
  bottomRight: {
    bottom: -2,
    right: -2,
    borderBottomWidth: 3,
    borderRightWidth: 3,
  },
  laserLine: {
    width: '90%',
    height: 2,
    backgroundColor: THEME.colors.primary,
    shadowColor: THEME.colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 5,
    elevation: 5,
  },
  scannerDecodingText: {
    color: THEME.colors.textSecondary,
    fontSize: 13,
    fontStyle: 'italic',
    marginTop: 16,
  },
  cancelScanBtn: {
    marginTop: 40,
    paddingVertical: THEME.spacing.sm,
    paddingHorizontal: THEME.spacing.lg,
    borderRadius: THEME.radius.sm,
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
    borderColor: 'rgba(239, 68, 68, 0.2)',
    borderWidth: 1,
  },
  cancelScanBtnText: {
    color: THEME.colors.danger,
    fontWeight: 'bold',
    fontSize: 13,
  },
});
