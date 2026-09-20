import React, { useState, useEffect } from 'react';
import { StyleSheet, View, ActivityIndicator } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { Header, BottomNav } from '@/frontend/components/common';
import { OnboardingModal } from '@/frontend/components/onboarding';
import { DailyLogScreen } from '@/frontend/screens/daily-log/DailyLogScreen';
import { HistoryScreen } from '@/frontend/screens/history/HistoryScreen';
import { ChartsScreen } from '@/frontend/screens/charts/ChartsScreen';
import { ProfileScreen } from '@/frontend/screens/profile/ProfileScreen';
import { ChatScreen } from '@/frontend/screens/chat';
import { colors } from '@/frontend/theme';
import { ScreenType, UserProfile } from '@/types';
import { getDatabase } from '@/data/local/db';
import { DailyLogRepository, UserProfileRepository } from '@/data/repositories';

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<ScreenType>('daily');
  const [dbReady, setDbReady] = useState<boolean>(false);
  const [isTodayInDeficit, setIsTodayInDeficit] = useState<boolean>(true);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [showOnboarding, setShowOnboarding] = useState<boolean>(false);

  useEffect(() => {
    async function setup() {
      try {
        await getDatabase();
        const profile = await UserProfileRepository.getActiveProfile();
        if (profile) {
          setUserProfile(profile);
        } else {
          // No profile configured yet, trigger onboarding wizard
          setShowOnboarding(true);
        }
        await checkTodayStatus(profile?.target_calories || 1800);
        setDbReady(true);
      } catch (err) {
        console.error('Failed to initialize database or profile:', err);
        setDbReady(true);
      }
    }
    setup();
  }, []);

  const checkTodayStatus = async (targetCal: number = 1800) => {
    try {
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const day = String(now.getDate()).padStart(2, '0');
      const todayStr = `${year}-${month}-${day}`;
      const log = await DailyLogRepository.getByDate(todayStr);
      if (log) {
        setIsTodayInDeficit(log.calories_consumed <= (log.target_calories || targetCal));
      } else {
        setIsTodayInDeficit(true);
      }
    } catch (e) {
      console.warn('Status check:', e);
    }
  };

  const handleProfileCompleted = async (newProfile: UserProfile) => {
    setUserProfile(newProfile);
    setShowOnboarding(false);
    await checkTodayStatus(newProfile.target_calories);
  };

  const getSubtitle = () => {
    switch (currentScreen) {
      case 'daily':
        return userProfile?.name ? `Hola, ${userProfile.name}` : 'Carga Diaria';
      case 'chat':
        return 'Asistente Nutricional';
      case 'charts':
        return 'Gráficos';
      case 'history':
        return 'Historial & Pasados';
      case 'profile':
        return 'Mi Perfil & Metas';
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
        
        {/* Top Header with Transversal Badge and Profile Trigger */}
        <Header
          subtitle={getSubtitle()}
          isDeficit={isTodayInDeficit}
          onPressProfile={() => setCurrentScreen('profile')}
        />

        {/* Main Screen Content */}
        <View style={styles.mainContainer}>
          {currentScreen === 'daily' && (
            <DailyLogScreen
              onDataChanged={() => checkTodayStatus(userProfile?.target_calories || 1800)}
              userProfile={userProfile}
            />
          )}
          {currentScreen === 'chat' && (
            <ChatScreen
              onDataChanged={() => checkTodayStatus(userProfile?.target_calories || 1800)}
              userProfile={userProfile}
            />
          )}
          {currentScreen === 'charts' && <ChartsScreen />}
          {currentScreen === 'history' && (
            <HistoryScreen
              onDataChanged={() => checkTodayStatus(userProfile?.target_calories || 1800)}
            />
          )}
          {currentScreen === 'profile' && (
            <ProfileScreen
              userProfile={userProfile}
              onProfileUpdated={async (updated) => {
                setUserProfile(updated);
                await checkTodayStatus(updated.target_calories);
              }}
              onOpenOnboarding={() => setShowOnboarding(true)}
            />
          )}
        </View>

        {/* Bottom Tab Bar */}
        <BottomNav
          currentScreen={currentScreen}
          onSelectScreen={setCurrentScreen}
        />

        {/* Onboarding / Profile Recalculation Modal */}
        <OnboardingModal
          visible={showOnboarding}
          onClose={userProfile ? () => setShowOnboarding(false) : undefined}
          onCompleted={handleProfileCompleted}
          initialProfile={userProfile}
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
