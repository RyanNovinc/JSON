import React from 'react';
import { Modal, ModalProps } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider, initialWindowMetrics } from 'react-native-safe-area-context';

/**
 * Drop-in replacement for react-native's <Modal>.
 *
 * On Android a Modal is a detached native window: it is NOT a descendant of the
 * app root, so it inherits neither the GestureHandlerRootView nor the
 * SafeAreaProvider from App.tsx. The visible symptoms are:
 *
 *   - RNGH touchables/gestures inside the modal silently receive no touches
 *     (iOS is unaffected — RNGH attaches recognizers directly to views there).
 *   - useSafeAreaInsets() inside the modal resolves against the wrong window.
 *
 * Re-rooting both contexts inside the modal fixes both. initialMetrics avoids a
 * first-frame inset flash. Both wrappers are transparent, zero-chrome, flex:1
 * views, so a transparent/bottom-sheet modal lays out exactly as it did before.
 */
export default function AppModal({ children, ...modalProps }: ModalProps) {
  return (
    <Modal {...modalProps}>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SafeAreaProvider initialMetrics={initialWindowMetrics}>
          {children}
        </SafeAreaProvider>
      </GestureHandlerRootView>
    </Modal>
  );
}
