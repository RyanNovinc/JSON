import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import { useTheme } from '../contexts/ThemeContext';
import Markdown from 'react-native-markdown-display';

type NavigationProp = StackNavigationProp<RootStackParamList>;

export default function MethodologyScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { themeColor } = useTheme();

  const markdownContent = `# How JSON\.fit Calculates Volume

JSON\.fit's workout programs are built on per-muscle volume landmarks — research-backed weekly set targets calibrated to each muscle's recovery capacity.

## Per-Muscle Volume Targets

Different muscles have different productive volume ranges. Hamstrings tolerate less weekly volume than chest. Side delts can absorb more sets than quads. The app accounts for this rather than applying a single "X sets per muscle" rule.

Each muscle has four landmarks:

- **MV** (Maintenance Volume) — the floor to retain muscle
- **MEV** (Minimum Effective Volume) — the minimum to grow
- **MAV** (Maximum Adaptive Volume) — the productive sweet spot
- **MRV** (Maximum Recoverable Volume) — the ceiling above which gains stop

Your selected volume tier (Take It Easy / Build Steady / Push Hard) and training experience determine where in MAV your targets land.

## Effective Set Counting

Volume is measured in **effective sets**:
- Primary muscle work counts as **1.0 set**
- Secondary muscle work counts as **0.5 set**

So a Barbell Row contributes 1.0 set to upper back and 0.5 sets each to lats, biceps, and rear delts. This fractional convention matches the most current research (Pelland et al. 2025) and reflects how compounds actually train multiple muscles simultaneously.

## Research Foundation

JSON\.fit's volume targets are synthesised from peer-reviewed meta-analyses and established practitioner frameworks:

- **[Pelland et al. 2025](https://pubmed.ncbi.nlm.nih.gov/41343037/)** — Most current dose-response meta-regression. 67 studies, 2,058 subjects.
- **[Schoenfeld et al. 2017](https://pubmed.ncbi.nlm.nih.gov/27433992/)** — Foundational dose-response meta-analysis establishing the 10+ sets per week threshold.
- **[Krieger 2010](https://pubmed.ncbi.nlm.nih.gov/20300012/)** — Multi-set vs single-set meta-analysis.
- **Currier et al. 2023** — Bayesian network meta-analysis covering volume, intensity, and frequency.
- **Robinson et al. 2024** — Meta-regression on training proximity to failure.
- **[Renaissance Periodization (Israetel)](https://rpstrength.com/blogs/articles/training-volume-landmarks-muscle-growth)** — Volume landmark framework (MV/MEV/MAV/MRV).
- **[Stronger By Science (Nuckols)](https://www.strongerbyscience.com/volume/)** — Independent volume research analysis.
- **IUSCA Position Stand 2021** — International consensus on hypertrophy training.

A small number of auxiliary muscles (neck, obliques, hip abductors, hip adductors, serratus anterior, tibialis anterior) don't have peer-reviewed volume landmark research. Their values are practitioner-derived estimates and noted as such.

## Full Reference List

The complete list of citations with PubMed and DOI links is published openly at [json.fit/volume-references.md](https://json.fit/volume-references.md).

## Why This Matters

Most workout apps either give everyone the same set targets regardless of muscle, or they don't show you the research basis at all. JSON\.fit does both: per-muscle calibration and full transparency. Your program isn't a guess — it's calibrated to the same evidence elite coaches use.

Volume landmark research is an active field. JSON\.fit's targets will be updated as new meta-analyses are published.`;

  const handleLinkPress = (url: string) => {
    Linking.openURL(url);
  };

  const markdownStyles = {
    // Container styles
    body: {
      color: '#ffffff',
      fontSize: 16,
      lineHeight: 24,
    },
    
    // Headers
    heading1: {
      color: '#ffffff',
      fontSize: 24,
      fontWeight: 'bold',
      marginBottom: 16,
      marginTop: 0,
    },
    heading2: {
      color: themeColor,
      fontSize: 20,
      fontWeight: 'bold',
      marginTop: 24,
      marginBottom: 12,
    },
    heading3: {
      color: '#ffffff',
      fontSize: 18,
      fontWeight: 'bold',
      marginTop: 20,
      marginBottom: 8,
    },
    
    // Text styles
    paragraph: {
      color: '#ffffff',
      fontSize: 16,
      lineHeight: 24,
      marginBottom: 12,
    },
    strong: {
      color: '#ffffff',
      fontWeight: '600',
    },
    
    // Lists
    bullet_list: {
      marginBottom: 12,
    },
    list_item: {
      color: '#ffffff',
      fontSize: 16,
      lineHeight: 24,
      marginBottom: 6,
    },
    
    // Links
    link: {
      color: themeColor,
      textDecorationLine: 'underline',
    },
    
    // Text wrapper
    text: {
      color: '#ffffff',
    },
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          onPress={() => navigation.goBack()} 
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={20} color={themeColor} />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Methodology</Text>
        </View>
        <View style={styles.placeholder} />
      </View>

      {/* Content */}
      <ScrollView 
        style={styles.content}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={[styles.contentCard, { borderColor: '#27272a' }]}>
          <Markdown 
            style={markdownStyles}
            onLinkPress={handleLinkPress}
          >
            {markdownContent}
          </Markdown>
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
    paddingBottom: 16,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#18181b',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerContent: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 4,
  },
  placeholder: {
    width: 44,
    height: 44,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 32,
  },
  contentCard: {
    backgroundColor: '#18181b',
    borderRadius: 16,
    borderWidth: 1,
    padding: 20,
    marginBottom: 16,
  },
});