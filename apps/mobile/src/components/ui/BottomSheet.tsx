import React, { type ReactNode, useEffect, useRef } from 'react';
import {
  Animated,
  Modal,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MD3 } from '@/config/theme';

interface Props {
  visible: boolean;
  onClose: () => void;
  children: ReactNode;
}

export function BottomSheet({ visible, onClose, children }: Props) {
  const translateY = useRef(new Animated.Value(600)).current;
  const insets = useSafeAreaInsets();

  useEffect(() => {
    Animated.timing(translateY, {
      toValue: visible ? 0 : 600,
      duration: 220,
      useNativeDriver: true,
    }).start();
  }, [visible, translateY]);

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <Pressable style={styles.scrim} onPress={onClose} />
      <Animated.View
        style={[
          styles.sheet,
          { paddingBottom: insets.bottom + MD3.spacing.lg, transform: [{ translateY }] },
        ]}
      >
        <View style={styles.handle} />
        {children}
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  scrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: MD3.colors.scrim,
  },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: MD3.colors.surface,
    borderTopLeftRadius: MD3.shape.extraLarge,
    borderTopRightRadius: MD3.shape.extraLarge,
    paddingHorizontal: MD3.spacing.md,
    paddingTop: MD3.spacing.sm,
    ...MD3.elevation.level3,
  },
  handle: {
    alignSelf: 'center',
    width: 32,
    height: 4,
    backgroundColor: MD3.colors.outlineVariant,
    borderRadius: 2,
    marginBottom: MD3.spacing.md,
  },
});
