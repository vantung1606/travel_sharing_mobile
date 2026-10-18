import FontAwesome from '@expo/vector-icons/FontAwesome';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Platform, StyleSheet, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '@/components/Themed';
import { WF_COLORS } from '@/constants/Colors';

export interface ActionSheetOption {
  key: string;
  label: string;
  icon?: React.ComponentProps<typeof FontAwesome>['name'];
  destructive?: boolean;
  active?: boolean;
  onPress: () => void;
}

interface ActionSheetProps {
  visible: boolean;
  title?: string;
  options: ActionSheetOption[];
  onClose: () => void;
}

const USE_NATIVE_DRIVER = Platform.OS !== 'web';

/** Bottom sheet hành động dùng chung (sắp xếp, menu bài viết...). */
export function ActionSheet({ visible, title, options, onClose }: ActionSheetProps) {
  const anim = useRef(new Animated.Value(0)).current;
  const [mounted, setMounted] = useState(visible);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (visible) {
      setMounted(true);
      Animated.timing(anim, {
        toValue: 1,
        duration: 220,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: USE_NATIVE_DRIVER,
      }).start();
    } else if (mounted) {
      Animated.timing(anim, {
        toValue: 0,
        duration: 180,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: USE_NATIVE_DRIVER,
      }).start(() => setMounted(false));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  if (!mounted) return null;

  const backdropOpacity = anim;
  const translateY = anim.interpolate({ inputRange: [0, 1], outputRange: [40, 0] });

  return (
    <View style={styles.root}>
      <Animated.View style={[styles.backdrop, { opacity: backdropOpacity }]}>
        <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={onClose} />
      </Animated.View>

      <Animated.View
        style={[
          styles.sheet,
          { paddingBottom: Math.max(insets.bottom, 14) + 8, transform: [{ translateY }] },
        ]}>
        <View style={styles.handle} />
        {title ? <Text style={styles.title}>{title}</Text> : null}
        <View style={{ marginTop: 6 }}>
          {options.map((option) => (
            <TouchableOpacity
              key={option.key}
              activeOpacity={0.7}
              style={styles.option}
              onPress={() => {
                onClose();
                setTimeout(() => option.onPress(), 120);
              }}>
              {option.icon ? (
                <View style={[styles.iconWrap, option.destructive && styles.iconWrapDanger]}>
                  <FontAwesome
                    name={option.icon}
                    size={14}
                    color={option.destructive ? '#E11D48' : WF_COLORS.primary}
                  />
                </View>
              ) : null}
              <Text style={[styles.optionLabel, option.destructive && styles.optionLabelDanger]}>
                {option.label}
              </Text>
              {option.active ? (
                <FontAwesome name="check" size={14} color={WF_COLORS.primary} />
              ) : null}
            </TouchableOpacity>
          ))}
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    justifyContent: 'flex-end',
    zIndex: 50,
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
  },
  sheet: {
    backgroundColor: WF_COLORS.white,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingHorizontal: 16,
    paddingTop: 10,
  },
  handle: {
    alignSelf: 'center',
    width: 42,
    height: 4,
    borderRadius: 2,
    backgroundColor: WF_COLORS.slate200,
    marginBottom: 10,
  },
  title: {
    fontSize: 14,
    fontWeight: '800',
    color: WF_COLORS.slate900,
    marginBottom: 4,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: WF_COLORS.slate100,
  },
  iconWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: WF_COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrapDanger: {
    backgroundColor: WF_COLORS.roseLight,
  },
  optionLabel: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: WF_COLORS.slate900,
  },
  optionLabelDanger: {
    color: '#E11D48',
  },
});
