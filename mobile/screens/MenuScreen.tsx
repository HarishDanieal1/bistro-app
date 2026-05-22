import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { THEME } from '../theme';
import { MenuCard, MenuItem } from '../components/MenuCard';

interface MenuScreenProps {
  items: MenuItem[];
  loading: boolean;
  error: string | null;
  onAdd: (item: MenuItem) => void;
  onRefresh: () => void;
}

const CATEGORIES = ['all', 'main', 'appetizer', 'salad', 'dessert', 'beverage'];

export const MenuScreen: React.FC<MenuScreenProps> = ({
  items,
  loading,
  error,
  onAdd,
  onRefresh,
}) => {
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // 1. Filter items by category & search query
  const filteredItems = items.filter((item) => {
    const matchesCategory =
      selectedCategory === 'all' || item.category.toLowerCase() === selectedCategory;
    const matchesSearch =
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const renderHeader = () => (
    <View style={styles.headerContainer}>
      {/* Search Input */}
      <View style={styles.searchWrapper}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search delicious dishes..."
          placeholderTextColor={THEME.colors.textSecondary}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearBtn}>
            <Text style={styles.clearBtnText}>×</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Category Tabs */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.categoryScrollContent}
        style={styles.categoryScroll}
      >
        {CATEGORIES.map((category) => {
          const isActive = selectedCategory === category;
          return (
            <TouchableOpacity
              key={category}
              style={[styles.categoryTab, isActive ? styles.categoryTabActive : {}]}
              onPress={() => setSelectedCategory(category)}
            >
              <Text style={[styles.categoryText, isActive ? styles.categoryTextActive : {}]}>
                {category.toUpperCase()}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={THEME.colors.primary} />
        <Text style={styles.loadingText}>Synchronizing kitchen menu...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centerContainer}>
        <View style={styles.errorBox}>
          <Text style={styles.errorTitle}>⚠️ Kitchen Offline</Text>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={onRefresh}>
            <Text style={styles.retryBtnText}>Retry Connection</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <FlatList
      data={filteredItems}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => <MenuCard item={item} onAdd={onAdd} />}
      ListHeaderComponent={renderHeader}
      contentContainerStyle={styles.listContent}
      style={styles.container}
      ListEmptyComponent={
        <Text style={styles.emptyText}>No matches found. Try another query!</Text>
      }
    />
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.colors.background,
  },
  listContent: {
    padding: THEME.spacing.md,
    paddingBottom: THEME.spacing.xl * 2,
  },
  headerContainer: {
    marginBottom: THEME.spacing.md,
  },
  searchWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.colors.card,
    borderColor: THEME.colors.border,
    borderWidth: 1,
    borderRadius: THEME.radius.md,
    paddingHorizontal: THEME.spacing.md,
    marginBottom: THEME.spacing.md,
  },
  searchInput: {
    flex: 1,
    color: THEME.colors.text,
    paddingVertical: THEME.spacing.sm + 2,
    fontSize: 14,
  },
  clearBtn: {
    padding: 4,
  },
  clearBtnText: {
    color: THEME.colors.textSecondary,
    fontSize: 20,
    fontWeight: 'bold',
  },
  categoryScroll: {
    flexDirection: 'row',
    paddingVertical: 4,
  },
  categoryScrollContent: {
    paddingRight: THEME.spacing.xl,
  },
  categoryTab: {
    paddingHorizontal: THEME.spacing.sm + 6,
    paddingVertical: THEME.spacing.xs + 4,
    borderRadius: THEME.radius.sm,
    backgroundColor: THEME.colors.card,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    marginRight: THEME.spacing.sm,
  },
  categoryTabActive: {
    backgroundColor: THEME.colors.primary,
    borderColor: THEME.colors.primary,
  },
  categoryText: {
    color: THEME.colors.textSecondary,
    fontSize: 10,
    fontWeight: 'bold',
  },
  categoryTextActive: {
    color: THEME.colors.background,
  },
  centerContainer: {
    flex: 1,
    backgroundColor: THEME.colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    padding: THEME.spacing.md,
  },
  loadingText: {
    color: THEME.colors.textSecondary,
    fontSize: 14,
    marginTop: THEME.spacing.md,
    fontStyle: 'italic',
  },
  errorBox: {
    backgroundColor: THEME.colors.card,
    borderRadius: THEME.radius.lg,
    borderWidth: 1,
    borderColor: THEME.colors.danger,
    padding: THEME.spacing.lg,
    alignItems: 'center',
    width: '100%',
    maxWidth: 350,
  },
  errorTitle: {
    color: THEME.colors.danger,
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: THEME.spacing.xs,
  },
  errorText: {
    color: THEME.colors.textSecondary,
    fontSize: 13,
    textAlign: 'center',
    marginBottom: THEME.spacing.md,
  },
  retryBtn: {
    backgroundColor: THEME.colors.danger,
    paddingHorizontal: THEME.spacing.lg,
    paddingVertical: THEME.spacing.sm,
    borderRadius: THEME.radius.sm,
  },
  retryBtnText: {
    color: THEME.colors.text,
    fontWeight: 'bold',
    fontSize: 12,
  },
  emptyText: {
    color: THEME.colors.textSecondary,
    textAlign: 'center',
    marginTop: THEME.spacing.xl,
    fontStyle: 'italic',
  },
});
