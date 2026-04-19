// Biometric prompt placeholder. The user opted to keep dependencies tight,
// so this currently no-ops but the interface is here so screens can adopt
// react-native-biometrics later without changing call sites.

export const BiometricAuth = {
  async isAvailable(): Promise<boolean> {
    return false;
  },

  async authenticate(_reason: string): Promise<boolean> {
    return true;
  },
};
