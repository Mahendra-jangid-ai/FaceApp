/**
 * Hindi/English Localization for FaceAuth Pro
 * Supports NHAI field workers who may prefer Hindi
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

const I18N_KEY = '@faceauth_language';

export type Language = 'en' | 'hi';

interface Translations {
  [key: string]: { en: string; hi: string };
}

const translations: Translations = {
  // Home Screen
  'home.title': { en: 'FaceAuth Pro', hi: 'FaceAuth Pro' },
  'home.subtitle': { en: 'Secure Offline Face Recognition & Attendance', hi: 'सुरक्षित ऑफलाइन चेहरा पहचान और उपस्थिति' },
  'home.enrolled': { en: 'Enrolled', hi: 'नामांकित' },
  'home.authToday': { en: 'Auth Today', hi: 'आज प्रमाणित' },
  'home.attendance': { en: 'Attendance', hi: 'उपस्थिति' },
  'home.success': { en: 'Success', hi: 'सफलता' },

  // Actions
  'action.markAttendance': { en: 'Mark Attendance', hi: 'उपस्थिति दर्ज करें' },
  'action.checkInOut': { en: 'Check-in / Check-out with GPS verification', hi: 'GPS सत्यापन के साथ चेक-इन / चेक-आउट' },
  'action.authenticate': { en: 'Authenticate', hi: 'प्रमाणित करें' },
  'action.authDesc': { en: 'Liveness + anti-spoof + face recognition', hi: 'लाइवनेस + एंटी-स्पूफ + चेहरा पहचान' },
  'action.enroll': { en: 'Enroll New User', hi: 'नया उपयोगकर्ता दर्ज करें' },
  'action.enrollDesc': { en: 'Register face with encrypted embedding storage', hi: 'एन्क्रिप्टेड एम्बेडिंग स्टोरेज के साथ चेहरा पंजीकरण' },
  'action.dashboard': { en: 'Dashboard', hi: 'डैशबोर्ड' },
  'action.history': { en: 'History', hi: 'इतिहास' },
  'action.settings': { en: 'Settings', hi: 'सेटिंग्स' },

  // Authentication
  'auth.ready': { en: 'Ready to Authenticate', hi: 'प्रमाणित करने के लिए तैयार' },
  'auth.startVerification': { en: 'Start Verification', hi: 'सत्यापन शुरू करें' },
  'auth.blink': { en: 'Blink your eyes', hi: 'अपनी आँखें झपकाएँ' },
  'auth.smile': { en: 'Smile', hi: 'मुस्कुराएँ' },
  'auth.turnLeft': { en: 'Turn head left', hi: 'सिर बाईं ओर घुमाएँ' },
  'auth.turnRight': { en: 'Turn head right', hi: 'सिर दाईं ओर घुमाएँ' },
  'auth.authenticated': { en: 'Authenticated', hi: 'प्रमाणित' },
  'auth.notRecognized': { en: 'Not Recognized', hi: 'पहचाना नहीं गया' },
  'auth.livenessVerified': { en: 'Liveness Verified', hi: 'लाइवनेस सत्यापित' },
  'auth.antiSpoofPassed': { en: 'Anti-Spoof Passed', hi: 'एंटी-स्पूफ पास' },
  'auth.checkedIn': { en: 'Checked In', hi: 'चेक-इन' },
  'auth.checkedOut': { en: 'Checked Out', hi: 'चेक-आउट' },
  'auth.spoofDetected': { en: 'Spoof Detected', hi: 'स्पूफ का पता चला' },
  'auth.confidence': { en: 'Confidence', hi: 'विश्वसनीयता' },
  'auth.done': { en: 'Done', hi: 'पूरा' },
  'auth.tryAgain': { en: 'Try Again', hi: 'पुन: प्रयास करें' },
  'auth.goBack': { en: 'Go Back', hi: 'वापस जाएँ' },

  // Enrollment
  'enroll.positionFace': { en: 'Position your face in the frame', hi: 'अपना चेहरा फ्रेम में रखें' },
  'enroll.captured': { en: 'Face Captured', hi: 'चेहरा कैप्चर किया' },
  'enroll.fullName': { en: 'Full Name', hi: 'पूरा नाम' },
  'enroll.employeeId': { en: 'Employee ID', hi: 'कर्मचारी आईडी' },
  'enroll.save': { en: 'Save Enrollment', hi: 'नामांकन सहेजें' },
  'enroll.success': { en: 'Enrolled Successfully!', hi: 'सफलतापूर्वक नामांकित!' },
  'enroll.duplicate': { en: 'Duplicate Face Detected', hi: 'डुप्लिकेट चेहरा पाया गया' },
  'enroll.duplicateMsg': { en: 'This face matches an already enrolled user', hi: 'यह चेहरा पहले से नामांकित उपयोगकर्ता से मेल खाता है' },

  // Attendance
  'attendance.onSite': { en: 'On Site', hi: 'साइट पर' },
  'attendance.completed': { en: 'Completed', hi: 'पूर्ण' },
  'attendance.checkIn': { en: 'Check In', hi: 'चेक इन' },
  'attendance.checkOut': { en: 'Check Out', hi: 'चेक आउट' },
  'attendance.today': { en: "Today's Attendance", hi: 'आज की उपस्थिति' },
  'attendance.gpsVerified': { en: 'GPS Verified', hi: 'GPS सत्यापित' },

  // General
  'general.online': { en: 'Online', hi: 'ऑनलाइन' },
  'general.offline': { en: 'Offline Mode', hi: 'ऑफलाइन मोड' },
  'general.camera': { en: 'Camera permission required', hi: 'कैमरा अनुमति आवश्यक' },
  'general.grantPermission': { en: 'Grant Permission', hi: 'अनुमति दें' },
};

let currentLanguage: Language = 'en';

export async function loadLanguage(): Promise<Language> {
  const saved = await AsyncStorage.getItem(I18N_KEY);
  currentLanguage = (saved as Language) || 'en';
  return currentLanguage;
}

export async function setLanguage(lang: Language): Promise<void> {
  currentLanguage = lang;
  await AsyncStorage.setItem(I18N_KEY, lang);
}

export function getLanguage(): Language {
  return currentLanguage;
}

export function t(key: string): string {
  const entry = translations[key];
  if (!entry) return key;
  return entry[currentLanguage] || entry.en || key;
}

export function toggleLanguage(): Language {
  const next = currentLanguage === 'en' ? 'hi' : 'en';
  currentLanguage = next;
  setLanguage(next);
  return next;
}
