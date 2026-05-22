import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { THEME } from '../theme';

export interface MenuItem {
  id: string;
  name: string;
  description: string;
  ingredients?: string;
  price: number;
  icon: string;
  category: string;
  available: boolean;
}

interface MenuCardProps {
  item: MenuItem;
  onAdd: (item: MenuItem) => void;
}

export const MenuCard: React.FC<MenuCardProps> = ({ item, onAdd }) => {
  const isAvailable = item.available !== false;

  return (
    <View style={[styles.card, !isAvailable && styles.cardDisabled]}>
      <View style={styles.header}>
        <View style={styles.iconContainer}>
          <Text style={styles.icon}>{item.icon || '🍽️'}</Text>
        </View>
        <View style={styles.badgeRow}>
          {!isAvailable && (
            <View style={styles.soldOutBadge}>
              <Text style={styles.soldOutText}>SOLD OUT</Text>
            </View>
          )}
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{item.category.toUpperCase()}</Text>
          </View>
        </View>
      </View>
      
      <View style={styles.body}>
        <Text style={styles.name}>{item.name}</Text>
        <Text style={styles.description} numberOfLines={2}>
          {item.description}
        </Text>
      </View>
      
      <View style={styles.footer}>
        <Text style={styles.price}>${item.price.toFixed(2)}</Text>
        <TouchableOpacity 
          style={[styles.button, !isAvailable && styles.buttonDisabled]} 
          onPress={() => onAdd(item)}
          disabled={!isAvailable}
          activeOpacity={0.7}
        >
          <Text style={[styles.buttonText, !isAvailable && styles.buttonTextDisabled]}>
            {isAvailable ? '+ Add' : 'Sold Out'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: THEME.colors.card,
    borderRadius: THEME.radius.md,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    padding: THEME.spacing.md,
    marginBottom: THEME.spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  cardDisabled: {
    opacity: 0.6,
    borderColor: 'rgba(239, 68, 68, 0.2)',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: THEME.spacing.sm,
  },
  iconContainer: {
    backgroundColor: THEME.colors.background,
    width: 50,
    height: 50,
    borderRadius: THEME.radius.sm,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: THEME.colors.border,
  },
  icon: {
    fontSize: 28,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  soldOutBadge: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    paddingHorizontal: THEME.spacing.sm,
    paddingVertical: THEME.spacing.xs,
    borderRadius: THEME.radius.sm,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.4)',
    marginRight: THEME.spacing.xs,
  },
  soldOutText: {
    color: '#EF4444',
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  badge: {
    backgroundColor: 'rgba(220, 165, 76, 0.12)',
    paddingHorizontal: THEME.spacing.sm,
    paddingVertical: THEME.spacing.xs,
    borderRadius: THEME.radius.sm,
    borderWidth: 1,
    borderColor: 'rgba(220, 165, 76, 0.2)',
  },
  badgeText: {
    color: THEME.colors.primary,
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  body: {
    marginBottom: THEME.spacing.md,
  },
  name: {
    color: THEME.colors.text,
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  description: {
    color: THEME.colors.textSecondary,
    fontSize: 13,
    lineHeight: 18,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: THEME.colors.border,
    paddingTop: THEME.spacing.sm,
  },
  price: {
    color: THEME.colors.primary,
    fontSize: 20,
    fontWeight: 'bold',
  },
  button: {
    backgroundColor: THEME.colors.primary,
    paddingHorizontal: THEME.spacing.md,
    paddingVertical: THEME.spacing.xs + 2,
    borderRadius: THEME.radius.sm,
  },
  buttonDisabled: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: THEME.colors.border,
  },
  buttonText: {
    color: THEME.colors.background,
    fontWeight: 'bold',
    fontSize: 14,
  },
  buttonTextDisabled: {
    color: THEME.colors.textSecondary,
  },
});
