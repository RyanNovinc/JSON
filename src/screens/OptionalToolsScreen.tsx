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

export default function OptionalToolsScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { themeColor, themeColorLight } = useTheme();

  const handleToolPress = (tool: ToolCard) => {
    if (tool.navigationTarget) {
      navigation.navigate(tool.navigationTarget as any);
    }
  };

  const renderToolCard = (tool: ToolCard, index: number) => {
    return (
      <TouchableOpacity
        key={tool.id}
        style={[styles.card, { 
          borderColor: themeColor, 
          shadowColor: themeColor 
        }]}
        activeOpacity={0.8}
        onPress={() => handleToolPress(tool)}
      >
        <View style={styles.cardContent}>
          <View style={styles.iconContainer}>
            <Ionicons 
              name={tool.icon as any} 
              size={32} 
              color={themeColor}
            />
          </View>
          
          <View style={styles.textContainer}>
            <Text style={[styles.cardTitle, { textShadowColor: themeColorLight }]}>
              {tool.title}
            </Text>
            <Text style={[styles.cardDescription, { color: '#71717a' }]}>
              {tool.description}
            </Text>
          </View>
          
          <View style={styles.arrowContainer}>
            <Ionicons 
              name="chevron-forward" 
              size={24} 
              color="#71717a"
            />
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 120 }}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={themeColor} />
          </TouchableOpacity>
          <View style={styles.headerContent}>
            <Text style={styles.headerTitle}>Profile Tools</Text>
            <Text style={styles.headerSubtitle}>
              Manage your workout preferences
            </Text>
          </View>
          <View style={styles.placeholder} />
        </View>

        <View style={styles.cardsContainer}>
          {optionalTools.map((tool, index) => 
            renderToolCard(tool, index)
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0b',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 10,
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#1a1a1b',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerContent: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#71717a',
  },
  cardsContainer: {
    paddingHorizontal: 16,
    gap: 16,
  },
  card: {
    backgroundColor: '#1a1a1b',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#22d3ee',
    padding: 20,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    marginRight: 16,
  },
  textContainer: {
    flex: 1,
    paddingRight: 16,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 4,
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
    textShadowOpacity: 0.3,
  },
  cardDescription: {
    fontSize: 14,
    fontWeight: '600',
  },
  arrowContainer: {
    marginLeft: 'auto',
  },
  placeholder: {
    width: 44,
    height: 44,
  },
});