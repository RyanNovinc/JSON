import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, differenceInDays, differenceInHours, differenceInMinutes } from 'date-fns';
import { RootStackParamList } from '../navigation/AppNavigator';
import { countdownService } from '../services/api';
import { Countdown } from '../types';
import { useAuth } from '../hooks/useAuth';

type HomeScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Main'>;

function CountdownCard({ countdown, onDelete, onToggleFavorite }: { 
  countdown: Countdown; 
  onDelete: () => void;
  onToggleFavorite: () => void;
}) {
  const [timeLeft, setTimeLeft] = useState('');

  useEffect(() => {
    const calculateTimeLeft = () => {
      const now = new Date();
      const target = new Date(countdown.targetDate);
      
      const days = differenceInDays(target, now);
      const hours = differenceInHours(target, now) % 24;
      const minutes = differenceInMinutes(target, now) % 60;

      if (days > 0) {
        setTimeLeft(`${days}d ${hours}h ${minutes}m`);
      } else if (hours > 0) {
        setTimeLeft(`${hours}h ${minutes}m`);
      } else if (minutes > 0) {
        setTimeLeft(`${minutes} minutes`);
      } else {
        setTimeLeft('Expired');
      }
    };

    calculateTimeLeft();
    const interval = setInterval(calculateTimeLeft, 60000); // Update every minute

    return () => clearInterval(interval);
  }, [countdown.targetDate]);

  return (
    <View style={[styles.card, { backgroundColor: countdown.color || '#1a1a1a' }]}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle}>{countdown.title}</Text>
        <View style={styles.cardActions}>
          <TouchableOpacity onPress={onToggleFavorite}>
            <Ionicons 
              name={countdown.isFavorite ? 'star' : 'star-outline'} 
              size={24} 
              color={countdown.isFavorite ? '#FFD700' : '#fff'}
            />
          </TouchableOpacity>
          <TouchableOpacity onPress={onDelete} style={styles.deleteButton}>
            <Ionicons name="trash-outline" size={24} color="#ff4444" />
          </TouchableOpacity>
        </View>
      </View>
      
      <Text style={styles.timeLeft}>{timeLeft}</Text>
      <Text style={styles.targetDate}>
        {format(new Date(countdown.targetDate), 'PPP')}
      </Text>
    </View>
  );
}

export default function HomeScreen() {
  const navigation = useNavigation<HomeScreenNavigationProp>();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const { data: countdowns, isLoading, refetch } = useQuery({
    queryKey: ['countdowns'],
    queryFn: countdownService.getAll,
  });

  const deleteMutation = useMutation({
    mutationFn: countdownService.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['countdowns'] });
    },
  });

  const toggleFavoriteMutation = useMutation({
    mutationFn: countdownService.toggleFavorite,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['countdowns'] });
    },
  });

  const handleDelete = (id: number) => {
    Alert.alert(
      'Delete Countdown',
      'Are you sure you want to delete this countdown?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: () => deleteMutation.mutate(id)
        },
      ]
    );
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  const sortedCountdowns = countdowns?.sort((a, b) => {
    if (a.isFavorite && !b.isFavorite) return -1;
    if (!a.isFavorite && b.isFavorite) return 1;
    return new Date(a.targetDate).getTime() - new Date(b.targetDate).getTime();
  });

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.greeting}>Hello, {user?.name || 'there'}!</Text>
        <Text style={styles.subtitle}>Your Countdowns</Text>
      </View>

      <FlatList
        data={sortedCountdowns}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <CountdownCard
            countdown={item}
            onDelete={() => handleDelete(item.id)}
            onToggleFavorite={() => toggleFavoriteMutation.mutate(item.id)}
          />
        )}
        refreshControl={
          <RefreshControl refreshing={false} onRefresh={refetch} />
        }
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="calendar-outline" size={64} color="#666" />
            <Text style={styles.emptyText}>No countdowns yet</Text>
            <Text style={styles.emptySubtext}>Tap the + button to create one</Text>
          </View>
        }
      />

      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('CreateCountdown')}
      >
        <Ionicons name="add" size={30} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
  },
  header: {
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  greeting: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
  },
  subtitle: {
    fontSize: 16,
    color: '#888',
    marginTop: 5,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 100,
  },
  card: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 15,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 15,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#fff',
    flex: 1,
  },
  cardActions: {
    flexDirection: 'row',
    gap: 15,
  },
  deleteButton: {
    marginLeft: 10,
  },
  timeLeft: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 5,
  },
  targetDate: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 100,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#666',
    marginTop: 20,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#555',
    marginTop: 5,
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 100,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
});