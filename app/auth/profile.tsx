import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Modal,
  FlatList,
  ActivityIndicator,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STATES_AND_DISTRICTS: Record<string, string[]> = {
  'Andhra Pradesh': ['Guntur', 'Krishna', 'West Godavari', 'East Godavari'],
  'Telangana': ['Hyderabad', 'Karimnagar', 'Warangal', 'Nalgonda'],
  'Tamil Nadu': ['Chennai', 'Coimbatore', 'Madurai', 'Salem'],
  'Karnataka': ['Bengaluru Urban', 'Mysuru', 'Mangaluru', 'Hubballi-Dharwad'],
  'Kerala': ['Thiruvananthapuram', 'Ernakulam', 'Kozhikode', 'Thrissur'],
  'West Bengal': ['Kolkata', 'Howrah', 'North 24 Parganas', 'South 24 Parganas'],
  'Odisha': ['Bhubaneswar', 'Cuttack', 'Puri', 'Balasore'],
  'Gujarat': ['Ahmedabad', 'Surat', 'Vadodara', 'Rajkot'],
  'Maharashtra': ['Mumbai', 'Pune', 'Nagpur', 'Nashik'],
  'Rajasthan': ['Jaipur', 'Jodhpur', 'Udaipur', 'Kota'],
  'Punjab': ['Ludhiana', 'Amritsar', 'Jalandhar', 'Patiala'],
  'Haryana': ['Faridabad', 'Gurugram', 'Hisar', 'Rohtak'],
};

const STATE_LIST = Object.keys(STATES_AND_DISTRICTS);
const LANGUAGES = ['Telugu', 'Hindi', 'English'];

type PickerTarget = 'state' | 'district';

export default function ProfileScreen() {
  const router = useRouter();

  const [name, setName] = useState('');
  const [selectedState, setSelectedState] = useState('');
  const [selectedDistrict, setSelectedDistrict] = useState('');
  const [selectedLanguage, setSelectedLanguage] = useState('');
  const [pickerVisible, setPickerVisible] = useState(false);
  const [pickerTarget, setPickerTarget] = useState<PickerTarget>('state');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);

  const districtList = selectedState ? STATES_AND_DISTRICTS[selectedState] ?? [] : [];

  function openPicker(target: PickerTarget) {
    setPickerTarget(target);
    setPickerVisible(true);
  }

  function handlePickerSelect(value: string) {
    if (pickerTarget === 'state') {
      setSelectedState(value);
      setSelectedDistrict(''); // reset district when state changes
      clearError('state');
    } else {
      setSelectedDistrict(value);
      clearError('district');
    }
    setPickerVisible(false);
  }

  function clearError(field: string) {
    setErrors((prev) => {
      const next = { ...prev };
      delete next[field];
      return next;
    });
  }

  function validate(): boolean {
    const newErrors: Record<string, string> = {};
    const trimmedName = name.trim();
    if (!trimmedName) {
      newErrors.name = 'Full name is required';
    } else if (trimmedName.length < 2) {
      newErrors.name = 'Name must be at least 2 characters';
    } else if (trimmedName.length > 80) {
      newErrors.name = 'Name must be 80 characters or fewer';
    }
    if (!selectedState) newErrors.state = 'Please select your state';
    if (!selectedDistrict) newErrors.district = 'Please select your district';
    if (!selectedLanguage) newErrors.language = 'Please select a language';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  async function handleSave() {
    if (!validate()) return;
    setIsSaving(true);
    try {
      const phone = await AsyncStorage.getItem('aquaprana_phone');
      const user = {
        _id: Date.now().toString(),
        phone: phone ?? '',
        name: name.trim(),
        state: selectedState,
        district: selectedDistrict,
        language: selectedLanguage,
        created_at: new Date().toISOString(),
      };
      await AsyncStorage.setItem('aquaprana_user', JSON.stringify(user));
      router.replace('/(tabs)/');
    } catch {
      setErrors({ general: 'Failed to save profile. Please try again.' });
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <SafeAreaView style={styles.header}>
        <View style={styles.headerRow}>
          <View style={styles.headerIconWrap}>
            <Ionicons name="person-circle-outline" size={32} color="#1E7AB8" />
          </View>
          <View style={styles.headerTextWrap}>
            <Text style={styles.headerTitle}>Set up your profile</Text>
            <Text style={styles.headerSubtitle}>Tell us a bit about yourself</Text>
          </View>
        </View>
        {/* Step indicator */}
        <View style={styles.stepIndicator}>
          <View style={styles.stepDotDone}>
            <Ionicons name="checkmark" size={12} color="#fff" />
          </View>
          <View style={styles.stepLine} />
          <View style={styles.stepDotActive}>
            <Text style={styles.stepDotActiveText}>2</Text>
          </View>
        </View>
      </SafeAreaView>

      <KeyboardAvoidingView
        style={styles.body}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Name */}
          <FieldLabel label="Full Name" required />
          <TextInput
            style={[styles.textInput, errors.name ? styles.inputErrorBorder : null]}
            value={name}
            onChangeText={(v) => {
              setName(v);
              clearError('name');
            }}
            placeholder="e.g. Ravi Kumar"
            placeholderTextColor="#a0aec0"
            maxLength={80}
            returnKeyType="done"
          />
          {!!errors.name && <ErrorText message={errors.name} />}

          {/* State */}
          <FieldLabel label="State" required />
          <TouchableOpacity
            style={[styles.pickerButton, errors.state ? styles.inputErrorBorder : null]}
            onPress={() => openPicker('state')}
            activeOpacity={0.7}
          >
            <Text style={selectedState ? styles.pickerButtonText : styles.pickerButtonPlaceholder}>
              {selectedState || 'Select your state'}
            </Text>
            <Ionicons name="chevron-down" size={18} color="#718096" />
          </TouchableOpacity>
          {!!errors.state && <ErrorText message={errors.state} />}

          {/* District */}
          <FieldLabel label="District" required />
          <TouchableOpacity
            style={[
              styles.pickerButton,
              !selectedState && styles.pickerButtonDisabled,
              errors.district ? styles.inputErrorBorder : null,
            ]}
            onPress={() => selectedState && openPicker('district')}
            activeOpacity={selectedState ? 0.7 : 1}
          >
            <Text
              style={
                selectedDistrict
                  ? styles.pickerButtonText
                  : styles.pickerButtonPlaceholder
              }
            >
              {selectedDistrict || (selectedState ? 'Select your district' : 'Select state first')}
            </Text>
            <Ionicons name="chevron-down" size={18} color="#718096" />
          </TouchableOpacity>
          {!!errors.district && <ErrorText message={errors.district} />}

          {/* Language */}
          <FieldLabel label="Preferred Language" required />
          <View style={styles.languageRow}>
            {LANGUAGES.map((lang) => (
              <TouchableOpacity
                key={lang}
                style={[
                  styles.langButton,
                  selectedLanguage === lang && styles.langButtonActive,
                  errors.language ? styles.inputErrorBorder : null,
                ]}
                onPress={() => {
                  setSelectedLanguage(lang);
                  clearError('language');
                }}
                activeOpacity={0.75}
              >
                <Text
                  style={
                    selectedLanguage === lang ? styles.langButtonActiveText : styles.langButtonText
                  }
                >
                  {lang}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          {!!errors.language && <ErrorText message={errors.language} />}

          {!!errors.general && (
            <View style={styles.generalErrorBox}>
              <Ionicons name="warning-outline" size={16} color="#e74c3c" />
              <Text style={styles.generalErrorText}>{errors.general}</Text>
            </View>
          )}

          {/* Save button */}
          <TouchableOpacity
            style={[styles.saveButton, isSaving && styles.saveButtonDisabled]}
            onPress={handleSave}
            activeOpacity={0.85}
            disabled={isSaving}
          >
            {isSaving ? (
              <ActivityIndicator color="#ffffff" size="small" />
            ) : (
              <>
                <Text style={styles.saveButtonText}>Save & Continue</Text>
                <Ionicons name="arrow-forward-circle" size={20} color="#ffffff" />
              </>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Picker Modal */}
      <Modal
        visible={pickerVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setPickerVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setPickerVisible(false)}
        >
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {pickerTarget === 'state' ? 'Select State' : 'Select District'}
              </Text>
              <TouchableOpacity onPress={() => setPickerVisible(false)} style={styles.modalClose}>
                <Ionicons name="close" size={22} color="#718096" />
              </TouchableOpacity>
            </View>
            <FlatList
              data={pickerTarget === 'state' ? STATE_LIST : districtList}
              keyExtractor={(item) => item}
              showsVerticalScrollIndicator={false}
              renderItem={({ item }) => {
                const isSelected =
                  pickerTarget === 'state'
                    ? item === selectedState
                    : item === selectedDistrict;
                return (
                  <TouchableOpacity
                    style={[styles.modalItem, isSelected && styles.modalItemSelected]}
                    onPress={() => handlePickerSelect(item)}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.modalItemText, isSelected && styles.modalItemTextSelected]}>
                      {item}
                    </Text>
                    {isSelected && <Ionicons name="checkmark" size={18} color="#1E7AB8" />}
                  </TouchableOpacity>
                );
              }}
              contentContainerStyle={{ paddingBottom: 24 }}
            />
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

function FieldLabel({ label, required }: { label: string; required?: boolean }) {
  return (
    <Text style={styles.fieldLabel}>
      {label}
      {required && <Text style={styles.fieldLabelRequired}> *</Text>}
    </Text>
  );
}

function ErrorText({ message }: { message: string }) {
  return (
    <Text style={styles.errorText}>
      <Ionicons name="alert-circle-outline" size={13} color="#e74c3c" /> {message}
    </Text>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1E7AB8',
  },
  header: {
    backgroundColor: '#1E7AB8',
    paddingTop: 16,
    paddingBottom: 24,
    paddingHorizontal: 24,
    gap: 16,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  headerIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTextWrap: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#ffffff',
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#d0e9f7',
    marginTop: 2,
  },
  stepIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 4,
  },
  stepDotDone: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#27ae60',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepLine: {
    flex: 1,
    height: 2,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  stepDotActive: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepDotActiveText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1E7AB8',
  },
  body: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 28,
    paddingBottom: 48,
    gap: 6,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a202c',
    marginTop: 14,
    marginBottom: 6,
  },
  fieldLabelRequired: {
    color: '#e74c3c',
  },
  textInput: {
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#1a202c',
    backgroundColor: '#f7f8fa',
    minHeight: 52,
  },
  inputErrorBorder: {
    borderColor: '#e74c3c',
  },
  pickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#f7f8fa',
    minHeight: 52,
  },
  pickerButtonDisabled: {
    opacity: 0.55,
  },
  pickerButtonText: {
    fontSize: 16,
    color: '#1a202c',
    flex: 1,
  },
  pickerButtonPlaceholder: {
    fontSize: 16,
    color: '#a0aec0',
    flex: 1,
  },
  languageRow: {
    flexDirection: 'row',
    gap: 10,
  },
  langButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    backgroundColor: '#f7f8fa',
    alignItems: 'center',
    minHeight: 52,
    justifyContent: 'center',
  },
  langButtonActive: {
    backgroundColor: '#1E7AB8',
    borderColor: '#1E7AB8',
  },
  langButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1a202c',
  },
  langButtonActiveText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#ffffff',
  },
  errorText: {
    fontSize: 12,
    color: '#e74c3c',
    marginTop: 2,
  },
  generalErrorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#fdf2f2',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#f5c6c6',
    marginTop: 8,
  },
  generalErrorText: {
    fontSize: 13,
    color: '#e74c3c',
    flex: 1,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1E7AB8',
    borderRadius: 14,
    paddingVertical: 16,
    minHeight: 56,
    gap: 8,
    marginTop: 24,
    shadowColor: '#1E7AB8',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  saveButtonDisabled: {
    backgroundColor: '#90c4e4',
    elevation: 0,
    shadowOpacity: 0,
  },
  saveButtonText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#ffffff',
  },
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '70%',
    paddingTop: 12,
  },
  modalHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#e2e8f0',
    alignSelf: 'center',
    marginBottom: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    marginBottom: 4,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1a202c',
  },
  modalClose: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f4f8',
    minHeight: 52,
  },
  modalItemSelected: {
    backgroundColor: '#e8f4fd',
  },
  modalItemText: {
    fontSize: 15,
    color: '#1a202c',
    flex: 1,
  },
  modalItemTextSelected: {
    color: '#1E7AB8',
    fontWeight: '600',
  },
});
