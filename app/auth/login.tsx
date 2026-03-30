import { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

type Step = 'phone' | 'otp' | 'verifying';

export default function LoginScreen() {
  const router = useRouter();

  const [step, setStep] = useState<Step>('phone');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState<string[]>(['', '', '', '', '', '']);
  const [phoneError, setPhoneError] = useState('');
  const [otpError, setOtpError] = useState('');
  const [countdown, setCountdown] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  const otpRefs = useRef<(TextInput | null)[]>([]);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, []);

  function startCountdown() {
    setCountdown(60);
    countdownRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          if (countdownRef.current) clearInterval(countdownRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }

  function validatePhone(value: string): string {
    if (!value || value.length !== 10) return 'Enter a valid 10-digit mobile number';
    if (!/^[6-9]/.test(value)) return 'Mobile number must start with 6, 7, 8, or 9';
    return '';
  }

  function handleSendOtp() {
    const err = validatePhone(phone);
    if (err) {
      setPhoneError(err);
      return;
    }
    setPhoneError('');
    setStep('otp');
    startCountdown();
  }

  function handleOtpChange(index: number, value: string) {
    // Accept only digits
    const digit = value.replace(/[^0-9]/g, '').slice(-1);
    const newOtp = [...otp];
    newOtp[index] = digit;
    setOtp(newOtp);
    setOtpError('');

    if (digit && index < 5) {
      otpRefs.current[index + 1]?.focus();
    }
  }

  function handleOtpKeyPress(index: number, key: string) {
    if (key === 'Backspace') {
      if (otp[index] === '' && index > 0) {
        const newOtp = [...otp];
        newOtp[index - 1] = '';
        setOtp(newOtp);
        otpRefs.current[index - 1]?.focus();
      }
    }
  }

  function handleResendOtp() {
    if (countdown > 0) return;
    setOtp(['', '', '', '', '', '']);
    setOtpError('');
    startCountdown();
    otpRefs.current[0]?.focus();
  }

  async function handleVerifyOtp() {
    const code = otp.join('');
    if (code.length !== 6) {
      setOtpError('Please enter the complete 6-digit OTP');
      return;
    }

    // MVP: accept any 6-digit code
    setIsLoading(true);
    setStep('verifying');

    try {
      // Simulate network delay
      await new Promise((res) => setTimeout(res, 800));

      const token = `mock_token_${Date.now()}`;
      await AsyncStorage.setItem('aquaprana_token', token);
      await AsyncStorage.setItem('aquaprana_phone', phone);

      // Check if user profile already set up
      const user = await AsyncStorage.getItem('aquaprana_user');
      if (user) {
        router.replace('/(tabs)/');
      } else {
        router.push('/auth/profile');
      }
    } catch {
      setOtpError('Verification failed. Please try again.');
      setStep('otp');
    } finally {
      setIsLoading(false);
    }
  }

  function handleBack() {
    if (step === 'otp' || step === 'verifying') {
      setStep('phone');
      setOtp(['', '', '', '', '', '']);
      setOtpError('');
      if (countdownRef.current) clearInterval(countdownRef.current);
      setCountdown(0);
    } else {
      router.back();
    }
  }

  return (
    <View style={styles.container}>
      {/* Blue Header */}
      <SafeAreaView style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={handleBack} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={24} color="#ffffff" />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <View style={styles.headerIconWrap}>
            <Ionicons name="water" size={36} color="#1E7AB8" />
          </View>
          <Text style={styles.headerTitle}>Welcome to AquaPrana</Text>
          <Text style={styles.headerSubtitle}>
            {step === 'phone'
              ? 'Enter your mobile number to continue'
              : step === 'verifying'
              ? 'Verifying your code...'
              : `OTP sent to +91 ${phone}`}
          </Text>
        </View>
      </SafeAreaView>

      {/* White Body */}
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
          {step === 'phone' && (
            <PhoneStep
              phone={phone}
              error={phoneError}
              onChangePhone={(v) => {
                setPhone(v);
                if (phoneError) setPhoneError('');
              }}
              onSend={handleSendOtp}
            />
          )}

          {(step === 'otp' || step === 'verifying') && (
            <OtpStep
              otp={otp}
              error={otpError}
              countdown={countdown}
              isLoading={isLoading}
              otpRefs={otpRefs}
              onOtpChange={handleOtpChange}
              onOtpKeyPress={handleOtpKeyPress}
              onVerify={handleVerifyOtp}
              onResend={handleResendOtp}
            />
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

// ---- Phone Step ----
function PhoneStep({
  phone,
  error,
  onChangePhone,
  onSend,
}: {
  phone: string;
  error: string;
  onChangePhone: (v: string) => void;
  onSend: () => void;
}) {
  return (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Enter Mobile Number</Text>
      <Text style={styles.stepSubtitle}>
        We'll send a one-time password to verify your number
      </Text>

      <View style={[styles.phoneInputRow, error ? styles.inputError : null]}>
        <View style={styles.prefixBox}>
          <Text style={styles.prefixText}>+91</Text>
        </View>
        <TextInput
          style={styles.phoneInput}
          value={phone}
          onChangeText={(v) => onChangePhone(v.replace(/[^0-9]/g, '').slice(0, 10))}
          placeholder="10-digit mobile number"
          placeholderTextColor="#a0aec0"
          keyboardType="numeric"
          maxLength={10}
          returnKeyType="done"
          onSubmitEditing={onSend}
        />
      </View>

      {!!error && (
        <Text style={styles.errorText}>
          <Ionicons name="alert-circle-outline" size={13} color="#e74c3c" /> {error}
        </Text>
      )}

      <TouchableOpacity
        style={styles.primaryButton}
        onPress={onSend}
        activeOpacity={0.85}
      >
        <Text style={styles.primaryButtonText}>Send OTP</Text>
        <Ionicons name="send" size={18} color="#ffffff" />
      </TouchableOpacity>

      <Text style={styles.termsText}>
        By continuing, you agree to our Terms of Service and Privacy Policy.
      </Text>
    </View>
  );
}

// ---- OTP Step ----
function OtpStep({
  otp,
  error,
  countdown,
  isLoading,
  otpRefs,
  onOtpChange,
  onOtpKeyPress,
  onVerify,
  onResend,
}: {
  otp: string[];
  error: string;
  countdown: number;
  isLoading: boolean;
  otpRefs: React.MutableRefObject<(TextInput | null)[]>;
  onOtpChange: (i: number, v: string) => void;
  onOtpKeyPress: (i: number, key: string) => void;
  onVerify: () => void;
  onResend: () => void;
}) {
  return (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Enter OTP</Text>
      <Text style={styles.stepSubtitle}>
        Enter the 6-digit code sent to your number
      </Text>

      <View style={styles.otpRow}>
        {otp.map((digit, index) => (
          <TextInput
            key={index}
            ref={(r) => {
              otpRefs.current[index] = r;
            }}
            style={[styles.otpBox, digit ? styles.otpBoxFilled : null, error ? styles.otpBoxError : null]}
            value={digit}
            onChangeText={(v) => onOtpChange(index, v)}
            onKeyPress={({ nativeEvent }) => onOtpKeyPress(index, nativeEvent.key)}
            keyboardType="numeric"
            maxLength={1}
            textAlign="center"
            selectTextOnFocus
            editable={!isLoading}
          />
        ))}
      </View>

      {!!error && (
        <Text style={styles.errorText}>
          <Ionicons name="alert-circle-outline" size={13} color="#e74c3c" /> {error}
        </Text>
      )}

      {/* Resend */}
      <View style={styles.resendRow}>
        {countdown > 0 ? (
          <Text style={styles.countdownText}>Resend OTP in {countdown}s</Text>
        ) : (
          <TouchableOpacity onPress={onResend} activeOpacity={0.7}>
            <Text style={styles.resendLink}>Resend OTP</Text>
          </TouchableOpacity>
        )}
      </View>

      <TouchableOpacity
        style={[styles.primaryButton, isLoading && styles.primaryButtonDisabled]}
        onPress={onVerify}
        activeOpacity={0.85}
        disabled={isLoading}
      >
        {isLoading ? (
          <ActivityIndicator color="#ffffff" size="small" />
        ) : (
          <>
            <Text style={styles.primaryButtonText}>Verify & Continue</Text>
            <Ionicons name="checkmark-circle" size={18} color="#ffffff" />
          </>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1E7AB8',
  },
  header: {
    backgroundColor: '#1E7AB8',
    paddingTop: 12,
    paddingBottom: 28,
    paddingHorizontal: 20,
  },
  backButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  headerContent: {
    alignItems: 'center',
    marginTop: 16,
    gap: 10,
  },
  headerIconWrap: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#ffffff',
    textAlign: 'center',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#d0e9f7',
    textAlign: 'center',
  },
  body: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 40,
  },
  stepContainer: {
    flex: 1,
    gap: 16,
  },
  stepTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1a202c',
  },
  stepSubtitle: {
    fontSize: 14,
    color: '#718096',
    marginBottom: 8,
  },
  phoneInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    backgroundColor: '#f7f8fa',
    overflow: 'hidden',
    minHeight: 56,
  },
  inputError: {
    borderColor: '#e74c3c',
  },
  prefixBox: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#e8f4fd',
    borderRightWidth: 1.5,
    borderRightColor: '#e2e8f0',
    minHeight: 56,
    justifyContent: 'center',
  },
  prefixText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E7AB8',
  },
  phoneInput: {
    flex: 1,
    fontSize: 18,
    color: '#1a202c',
    paddingHorizontal: 16,
    paddingVertical: 14,
    letterSpacing: 1,
  },
  otpRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
    marginTop: 8,
    marginBottom: 4,
  },
  otpBox: {
    flex: 1,
    height: 56,
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    fontSize: 22,
    fontWeight: '700',
    color: '#1a202c',
    backgroundColor: '#f7f8fa',
    textAlign: 'center',
  },
  otpBoxFilled: {
    borderColor: '#1E7AB8',
    backgroundColor: '#e8f4fd',
  },
  otpBoxError: {
    borderColor: '#e74c3c',
  },
  errorText: {
    fontSize: 13,
    color: '#e74c3c',
    marginTop: -4,
  },
  resendRow: {
    alignItems: 'center',
    marginTop: 4,
    marginBottom: 4,
  },
  countdownText: {
    fontSize: 13,
    color: '#718096',
  },
  resendLink: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E7AB8',
    textDecorationLine: 'underline',
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1E7AB8',
    borderRadius: 14,
    paddingVertical: 16,
    minHeight: 56,
    gap: 8,
    marginTop: 8,
    shadowColor: '#1E7AB8',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryButtonDisabled: {
    backgroundColor: '#90c4e4',
    elevation: 0,
    shadowOpacity: 0,
  },
  primaryButtonText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#ffffff',
  },
  termsText: {
    fontSize: 12,
    color: '#a0aec0',
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 18,
  },
});
