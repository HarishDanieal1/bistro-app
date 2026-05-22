import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Platform,
  SafeAreaView,
} from 'react-native';
import { THEME } from '../theme';
import { useUserStore, DiningPreferences } from '../store/userStore';

interface DiningPreferencesModalProps {
  visible: boolean;
  onClose: () => void;
}

const DIETARY_OPTIONS = ['None', 'Vegan', 'Vegetarian', 'Gluten-Free', 'Keto', 'Halal'];
const SPICE_OPTIONS = ['Mild', 'Medium', 'Hot', 'Extra Hot'];
const ALLERGY_OPTIONS = ['Nuts', 'Dairy', 'Shellfish', 'Gluten', 'Eggs', 'Soy'];

export const DiningPreferencesModal: React.FC<DiningPreferencesModalProps> = ({
  visible,
  onClose,
}) => {
  const preferences = useUserStore((state) => state.preferences);
  const setPreferences = useUserStore((state) => state.setPreferences);

  const [dietary, setDietary] = useState(preferences.dietary);
  const [spice, setSpice] = useState(preferences.spice);
  const [allergies, setAllergies] = useState<string[]>(preferences.allergies);
  const [tasteNote, setTasteNote] = useState(preferences.tasteNote);

  const handleToggleAllergy = (allergy: string) => {
    setAllergies((prev) =>
      prev.includes(allergy)
        ? prev.filter((a) => a !== allergy)
        : [...prev, allergy]
    );
  };

  const handleSave = () => {
    setPreferences({
      dietary,
      spice,
      allergies,
      tasteNote,
    });
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.sheetContainer}>
            {/* Header */}
            <View style={styles.header}>
              <View>
                <Text style={styles.headerTitle}>✨ AI Dining Assistant</Text>
                <Text style={styles.headerSubtitle}>Customize your dream restaurant experience</Text>
              </View>
              <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                <Text style={styles.closeBtnText}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent}>
              {/* Intro Banner */}
              <View style={styles.banner}>
                <Text style={styles.bannerText}>
                  🤵 Your AI Waiter uses this dining profile to inspect menu ingredients, issue allergy alerts, and recommend tailored culinary pairings.
                </Text>
              </View>

              {/* Dietary Plan Selection */}
              <Text style={styles.sectionLabel}>🥗 Dietary Profile</Text>
              <View style={styles.optionsRow}>
                {DIETARY_OPTIONS.map((option) => {
                  const isActive = dietary === option;
                  return (
                    <TouchableOpacity
                      key={option}
                      style={[styles.optionBtn, isActive && styles.optionBtnActive]}
                      onPress={() => setDietary(option)}
                    >
                      <Text style={[styles.optionText, isActive && styles.optionTextActive]}>
                        {option}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Spice Tolerance Selection */}
              <Text style={styles.sectionLabel}>🌶️ Spice Tolerance</Text>
              <View style={styles.optionsRow}>
                {SPICE_OPTIONS.map((option) => {
                  const isActive = spice === option;
                  return (
                    <TouchableOpacity
                      key={option}
                      style={[styles.optionBtn, isActive && styles.optionBtnActive]}
                      onPress={() => setSpice(option)}
                    >
                      <Text style={[styles.optionText, isActive && styles.optionTextActive]}>
                        {option}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Allergies Selection (Multi-select) */}
              <Text style={styles.sectionLabel}>⚠️ Allergies & Intolerances</Text>
              <View style={styles.optionsRow}>
                {ALLERGY_OPTIONS.map((option) => {
                  const isActive = allergies.includes(option);
                  return (
                    <TouchableOpacity
                      key={option}
                      style={[styles.optionBtn, isActive && styles.allergyBtnActive]}
                      onPress={() => handleToggleAllergy(option)}
                    >
                      <Text style={[styles.optionText, isActive && styles.allergyTextActive]}>
                        {isActive ? `✓ ${option}` : option}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Custom Culinary Dream Notes */}
              <Text style={styles.sectionLabel}>💭 Taste Preferences & Dream Meal Notes</Text>
              <TextInput
                style={styles.textInput}
                placeholder="e.g. 'I prefer citrusy profiles, extra garlic, and low sodium. I am dreaming of a cheese-loaded, savory appetizer!'"
                placeholderTextColor={THEME.colors.textSecondary}
                multiline={true}
                numberOfLines={4}
                value={tasteNote}
                onChangeText={setTasteNote}
              />
            </ScrollView>

            {/* Footer Actions */}
            <View style={styles.footer}>
              <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
                <Text style={styles.cancelBtnText}>Discard</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
                <Text style={styles.saveBtnText}>Save Profile</Text>
              </TouchableOpacity>
            </View>
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'flex-end',
  },
  safeArea: {
    maxHeight: '90%',
  },
  sheetContainer: {
    backgroundColor: THEME.colors.background,
    borderTopLeftRadius: THEME.radius.lg,
    borderTopRightRadius: THEME.radius.lg,
    borderTopWidth: 1,
    borderTopColor: THEME.colors.border,
    paddingHorizontal: THEME.spacing.md,
    paddingTop: THEME.spacing.md,
    paddingBottom: Platform.OS === 'ios' ? 20 : THEME.spacing.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.border,
    paddingBottom: THEME.spacing.sm,
    marginBottom: THEME.spacing.md,
  },
  headerTitle: {
    color: THEME.colors.primary,
    fontSize: 18,
    fontWeight: 'bold',
  },
  headerSubtitle: {
    color: THEME.colors.textSecondary,
    fontSize: 11,
    marginTop: 2,
  },
  closeBtn: {
    padding: THEME.spacing.xs,
  },
  closeBtnText: {
    color: THEME.colors.textSecondary,
    fontSize: 18,
    fontWeight: 'bold',
  },
  scrollContent: {
    paddingBottom: THEME.spacing.xl,
  },
  banner: {
    backgroundColor: 'rgba(220, 165, 76, 0.06)',
    borderColor: 'rgba(220, 165, 76, 0.15)',
    borderWidth: 1,
    borderRadius: THEME.radius.md,
    padding: THEME.spacing.md,
    marginBottom: THEME.spacing.md,
  },
  bannerText: {
    color: THEME.colors.text,
    fontSize: 12,
    lineHeight: 16,
  },
  sectionLabel: {
    color: THEME.colors.primary,
    fontSize: 11,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    marginTop: THEME.spacing.md,
    marginBottom: THEME.spacing.xs + 2,
    letterSpacing: 0.5,
  },
  optionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -4,
  },
  optionBtn: {
    backgroundColor: THEME.colors.card,
    borderColor: THEME.colors.border,
    borderWidth: 1,
    paddingHorizontal: THEME.spacing.md,
    paddingVertical: 8,
    borderRadius: THEME.radius.sm,
    margin: 4,
  },
  optionBtnActive: {
    backgroundColor: 'rgba(220, 165, 76, 0.12)',
    borderColor: THEME.colors.primary,
  },
  allergyBtnActive: {
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderColor: THEME.colors.danger,
  },
  optionText: {
    color: THEME.colors.textSecondary,
    fontSize: 11,
    fontWeight: 'bold',
  },
  optionTextActive: {
    color: THEME.colors.primary,
  },
  allergyTextActive: {
    color: THEME.colors.danger,
  },
  textInput: {
    backgroundColor: THEME.colors.card,
    borderColor: THEME.colors.border,
    borderWidth: 1,
    borderRadius: THEME.radius.md,
    color: THEME.colors.text,
    padding: THEME.spacing.md,
    fontSize: 13,
    lineHeight: 18,
    height: 100,
    textAlignVertical: 'top',
    marginTop: THEME.spacing.xs,
  },
  footer: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: THEME.colors.border,
    paddingTop: THEME.spacing.md,
    marginTop: THEME.spacing.md,
  },
  cancelBtn: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderColor: THEME.colors.border,
    borderWidth: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: THEME.radius.md,
    marginRight: THEME.spacing.sm,
  },
  cancelBtnText: {
    color: THEME.colors.textSecondary,
    fontWeight: 'bold',
    fontSize: 13,
  },
  saveBtn: {
    flex: 1,
    backgroundColor: THEME.colors.primary,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: THEME.radius.md,
    marginLeft: THEME.spacing.sm,
  },
  saveBtnText: {
    color: THEME.colors.background,
    fontWeight: 'bold',
    fontSize: 13,
  },
});
