import React, { useState, useEffect } from 'react';
import { StyleSheet, View, ActivityIndicator } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { Header } from './src/components/Header';
import { BottomNav } from './src/components/BottomNav';
import { DailyLogScreen } from './src/screens/DailyLogScreen';
import { HistoryScreen } from './src/screens/HistoryScreen';
import { ChartsScreen } from './src/screens/ChartsScreen';
import { colors } from './src/theme/colors';
import { ScreenType } from './src/types';
import { getDatabase } from './src/database/db';
import { DailyLogRepository } from './src/database/repository';

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<ScreenType>('daily');
  const [dbReady, setDbReady] = useState<boolean>(false);
  const [isTodayInDeficit, setIsTodayInDeficit] = useState<boolean>(true);

  // Initialize SQLite database on startup
  useEffect(() => {
    async function setup() {
      try {
        await getDatabase();
        await checkTodayStatus();
        setDbReady(true);
      } catch (err) {
        console.error('Failed to initialize database:', err);
        setDbReady(true);
      }
    }
    setup();
  }, []);

  const checkTodayStatus = async () => {
    try {
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const day = String(now.getDate()).padStart(2, '0');
      const todayStr = `${year}-${month}-${day}`;
      const log = await DailyLogRepository.getByDate(todayStr);
      if (log) {
        setIsTodayInDeficit(log.calories_consumed <= log.target_calories);
      } else {
        setIsTodayInDeficit(true);
      }
    } catch (e) {
      console.warn('Status check:', e);
    }
  };

  const getSubtitle = () => {
    switch (currentScreen) {
      case 'daily':
        return 'Carga Diaria';
      case 'charts':
        return 'Gráficos';
      case 'history':
        return 'Historial & Pasados';
      default:
        return 'CalorieBalance';
    }
  };

  if (!dbReady) {
    return (
      <View style={styles.loadingScreen}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <StatusBar style="dark" />
        
        {/* Top Header */}
        <Header subtitle={getSubtitle()} isDeficit={isTodayInDeficit} />

        {/* Main Screen Body */}
        <View style={styles.mainContainer}>
          {currentScreen === 'daily' && (
            <DailyLogScreen onDataChanged={checkTodayStatus} />
          )}
          {currentScreen === 'charts' && <ChartsScreen />}
          {currentScreen === 'history' && (
            <HistoryScreen onDataChanged={checkTodayStatus} />
          )}
        </View>

        {/* Bottom Tab Bar */}
        <BottomNav
          currentScreen={currentScreen}
          onSelectScreen={setCurrentScreen}
        />
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  mainContainer: {
    flex: 1,
  },
  loadingScreen: {
    flex: 1,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
