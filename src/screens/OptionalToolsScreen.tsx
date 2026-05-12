import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import { useTheme } from '../contexts/ThemeContext';

type NavigationProp = StackNavigationProp<RootStackParamList>;

interface ToolCard {
  id: string;
  title: string;
  description: string;
  icon: string;
  navigationTarget: string;
}

const optionalTools: ToolCard[] = [
  {
    id: 'favoriteExercises',
    title: 'Favorite Exercises',
    description: 'Add and organize exercises you love',
    icon: 'heart-outline',
    navigationTarget: 'FavoriteExercises',
  },
];

// ── Helper ────────────────────────────────────────────────────────

function hexA(hex: string, alpha: number): string {
  const h = hex.replace('#', '');
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export default function OptionalToolsScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { themeColor } = useTheme();

  const handleToolPress = (tool: ToolCard) => {
    if (tool.navigationTarget) {
      navigation.navigate(tool.navigationTarget as any);
    }
  };

  const renderToolCard = (tool: ToolCard) => {
    return (
      <TouchableOpacity
        key={tool.id}
        style={styles.setupItem}
        onPress={() => handleToolPress(tool)}
        activeOpacity={0.8}
      >
        <View
          style={[
            styles.iconContainer,
            {
              backgroundColor: hexA(themeColor, 0.12),
              borderColor: hexA(themeColor, 0.3),
            },
          ]}
        >
          <Ionicons name={tool.icon as any} size={22} color={themeColor} />
        </View>

        <View style={styles.itemDetails}>
          <Text style={styles.itemTitle}>{tool.title}</Text>
          <Text style={styles.itemDescription}>{tool.description}</Text>
        </View>

        <View style={styles.itemAction}>
          <Ionicons name="chevron-forward" size={18} color="#55555f" />
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backButton}
            activeOpacity={0.7}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Ionicons name="chevron-back" size={22} color="#fff" />
          </TouchableOpacity>

          <Text style={styles.headerLabel}>TOOLS</Text>
          <View style={styles.backButtonSpacer} />
        </View>

        {/* Title block */}
        <View style={styles.titleBlock}>
          <Text style={styles.title}>Profile tools</Text>
          <Text style={styles.subtitle}>MANAGE YOUR WORKOUT PREFERENCES</Text>
        </View>

        {/* Tool list */}
        <View style={styles.content}>
          {optionalTools.map((tool) => renderToolCard(tool))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#0a0a0f',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backButtonSpacer: {
    width: 38,
    height: 38,
  },
  headerLabel: {
    color: '#9898a4',
    fontSize: 11,
    letterSpacing: 1.4,
    fontFamily: 'DMMono-Medium',
  },

  // Title block
  titleBlock: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 20,
  },
  title: {
    color: '#f0f0f2',
    fontSize: 26,
    fontWeight: '700',
    letterSpacing: -0.5,
    fontFamily: 'Outfit-Bold',
    lineHeight: 30,
  },
  subtitle: {
    color: '#55555f',
    fontSize: 11,
    letterSpacing: 1.3,
    marginTop: 6,
    fontFamily: 'DMMono-Medium',
  },

  // Content
  content: {
    paddingHorizontal: 16,
  },

  // Tool item rows (same style as RequiredSetupScreen setup items)
  setupItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    backgroundColor: '#0a0a0f',
    borderColor: 'rgba(255,255,255,0.05)',
    marginBottom: 10,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 11,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemDetails: {
    flex: 1,
    gap: 4,
  },
  itemTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#f0f0f2',
    letterSpacing: -0.2,
    fontFamily: 'Outfit-SemiBold',
  },
  itemDescription: {
    fontSize: 12,
    color: '#9898a4',
    lineHeight: 16,
    fontFamily: 'Outfit-Regular',
  },
  itemAction: {
    paddingLeft: 4,
  },
});