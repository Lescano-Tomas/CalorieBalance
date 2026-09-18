import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { DailyLogRepository } from '../database/repository';
import { DailyLog } from '../types';

interface ChartsScreenProps {
  onDataChanged?: () => void;
}

export const ChartsScreen: React.FC<ChartsScreenProps> = () => {
  const [period, setPeriod] = useState<'week' | 'month'>('week');
  const [logs, setLogs] = useState<DailyLog[]>([]);
  const [selectedBar, setSelectedBar] = useState<string | null>(null);

  useEffect(() => {
    loadLogs();
  }, [period]);

  const loadLogs = async () => {
    try {
      const all = await DailyLogRepository.getAllLogs();
      setLogs(all);
    } catch (err) {
      console.error('Error loading chart logs:', err);
    }
  };

  // Helper to get past 7 days logs
  const getWeekDays = () => {
    const days = [];
    const dayNames = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    const now = new Date();

    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(now.getDate() - i);
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const dateStr = `${year}-${month}-${day}`;

      const matchedLog = logs.find((l) => l.date === dateStr);
      days.push({
        dateStr,
        dayName: dayNames[d.getDay()],
        dayNumber: d.getDate(),
        calories: matchedLog ? matchedLog.calories_consumed : 0,
        target: matchedLog ? matchedLog.target_calories : 1800,
        hasLog: !!matchedLog,
      });
    }
    return days;
  };

  const weekData = getWeekDays();

  // Find day with lowest calories (best deficit) among days that have logs
  const loggedDays = weekData.filter((d) => d.hasLog && d.calories > 0);
  let bestDayDate: string | null = null;
  if (loggedDays.length > 0) {
    const minCal = Math.min(...loggedDays.map((d) => d.calories));
    const best = loggedDays.find((d) => d.calories === minCal);
    if (best) bestDayDate = best.dateStr;
  }

  // Calculate average deficit
  const totalCalories = loggedDays.reduce((sum, d) => sum + d.calories, 0);
  const avgCalories = loggedDays.length > 0 ? Math.round(totalCalories / loggedDays.length) : 1800;
  const avgDiff = avgCalories - 1800;

  // Chart Y-axis parameters
  const chartMin = 1200;
  const chartMax = 2200;
  const chartRange = chartMax - chartMin;

  const getYPercent = (val: number) => {
    const clamped = Math.min(Math.max(val, chartMin), chartMax);
    return ((clamped - chartMin) / chartRange) * 100;
  };

  return (
    <View style={styles.screenWrapper}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header & Trend */}
        <View style={styles.topSection}>
          <View>
            <Text style={styles.periodBadge}>ANÁLISIS DE TENDENCIA</Text>
            <Text style={styles.mainTitle}>Evolución Calórica</Text>
          </View>
          <View style={styles.trendBadge}>
            <MaterialIcons
              name={avgDiff <= 0 ? 'trending-down' : 'trending-up'}
              size={16}
              color={colors.onSecondaryFixed}
            />
            <Text style={styles.trendBadgeText}>
              {avgDiff <= 0 ? `${avgDiff} kcal prom.` : `+${avgDiff} kcal prom.`}
            </Text>
          </View>
        </View>

        {/* View Switcher: Semana vs Mes */}
        <View style={styles.switcherContainer}>
          <TouchableOpacity
            style={[
              styles.switcherTab,
              period === 'week' && styles.switcherTabActive,
            ]}
            onPress={() => setPeriod('week')}
            activeOpacity={0.8}
          >
            <MaterialIcons
              name="calendar-view-week"
              size={16}
              color={period === 'week' ? colors.primary : colors.onSurfaceVariant}
            />
            <Text
              style={[
                styles.switcherText,
                period === 'week' && styles.switcherTextActive,
              ]}
            >
              Semana Actual
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.switcherTab,
              period === 'month' && styles.switcherTabActive,
            ]}
            onPress={() => setPeriod('month')}
            activeOpacity={0.8}
          >
            <MaterialIcons
              name="calendar-view-month"
              size={16}
              color={period === 'month' ? colors.primary : colors.onSurfaceVariant}
            />
            <Text
              style={[
                styles.switcherText,
                period === 'month' && styles.switcherTextActive,
              ]}
            >
              Mes Completo
            </Text>
          </TouchableOpacity>
        </View>

        {/* Chart Container */}
        <View style={styles.chartCard}>
          {/* Target Reference Info */}
          <View style={styles.chartHeader}>
            <View style={styles.legendItem}>
              <View style={styles.legendDot} />
              <Text style={styles.legendText}>Límite objetivo calórico</Text>
            </View>
            <View style={styles.targetPill}>
              <MaterialIcons name="flag" size={14} color={colors.primary} />
              <Text style={styles.targetPillText}>1.800 kcal / día</Text>
            </View>
          </View>

          {/* Chart Canvas */}
          <View style={styles.canvasContainer}>
            {/* Guide Lines & Y-ticks */}
            {[2200, 2000, 1800, 1600, 1400].map((tick) => {
              const bottomPercent = getYPercent(tick);
              const isTarget = tick === 1800;
              return (
                <View
                  key={tick}
                  style={[styles.guideRow, { bottom: `${bottomPercent}%` }]}
                >
                  <Text
                    style={[
                      styles.yTickText,
                      isTarget && { color: colors.primary, fontWeight: '700' },
                    ]}
                  >
                    {tick.toLocaleString()}
                  </Text>
                  <View
                    style={[
                      styles.guideLine,
                      isTarget && styles.targetGuideLine,
                    ]}
                  />
                  {isTarget && (
                    <View style={styles.targetFlag}>
                      <Text style={styles.targetFlagText}>UMBRAL</Text>
                    </View>
                  )}
                </View>
              );
            })}

            {/* Week Bars */}
            <View style={styles.barsContainer}>
              {weekData.map((d) => {
                const heightPercent = d.calories > 0 ? getYPercent(d.calories) : 0;
                const isDeficit = d.calories <= 1800;
                const isBest = d.dateStr === bestDayDate;
                const isSelected = selectedBar === d.dateStr;

                return (
                  <TouchableOpacity
                    key={d.dateStr}
                    style={styles.barColumn}
                    onPress={() => setSelectedBar(isSelected ? null : d.dateStr)}
                    activeOpacity={0.8}
                  >
                    {/* Tooltip / Star */}
                    <View style={styles.barTopArea}>
                      {isBest && (
                        <MaterialIcons
                          name="star"
                          size={14}
                          color={colors.secondary}
                          style={styles.starIcon}
                        />
                      )}
                      {(isSelected || isBest) && d.calories > 0 && (
                        <View style={styles.tooltip}>
                          <Text style={styles.tooltipText}>{d.calories}</Text>
                        </View>
                      )}
                    </View>

                    {/* Bar Pillar */}
                    <View style={styles.pillarWrapper}>
                      <View
                        style={[
                          styles.pillar,
                          {
                            height: `${Math.max(heightPercent, 4)}%`,
                            backgroundColor:
                              d.calories === 0
                                ? colors.surfaceContainerHighest
                                : isDeficit
                                ? isBest
                                  ? colors.secondary
                                  : colors.secondaryFixedDim
                                : colors.tertiaryFixedDim,
                          },
                        ]}
                      />
                    </View>

                    {/* Day Label */}
                    <Text
                      style={[
                        styles.barDayLabel,
                        isBest && { color: colors.primary, fontWeight: '700' },
                      ]}
                    >
                      {d.dayName}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </View>

        {/* Weekly Insights Cards */}
        <View style={styles.insightsGrid}>
          <View style={styles.insightCard}>
            <Text style={styles.insightLabel}>PROMEDIO</Text>
            <Text style={styles.insightVal}>{avgCalories} kcal</Text>
            <Text style={styles.insightSub}>
              {avgDiff <= 0 ? 'Ritmo sostenible' : 'Ligero exceso'}
            </Text>
          </View>

          <View style={styles.insightCard}>
            <Text style={styles.insightLabel}>DÍAS EN META</Text>
            <Text style={[styles.insightVal, { color: colors.secondary }]}>
              {loggedDays.filter((d) => d.calories <= 1800).length} de {loggedDays.length}
            </Text>
            <Text style={styles.insightSub}>Semana actual</Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  screenWrapper: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 110,
    maxWidth: 540,
    marginHorizontal: 'auto',
    width: '100%',
  },
  topSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  periodBadge: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.primary,
    letterSpacing: 0.8,
  },
  mainTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.onSurface,
    letterSpacing: -0.5,
  },
  trendBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.secondaryFixed,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  trendBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.onSecondaryFixed,
  },
  switcherContainer: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceContainer,
    borderRadius: 24,
    padding: 4,
    marginBottom: 16,
  },
  switcherTab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  switcherTabActive: {
    backgroundColor: colors.surfaceContainerLowest,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  switcherText: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.onSurfaceVariant,
  },
  switcherTextActive: {
    color: colors.primary,
    fontWeight: '700',
  },
  chartCard: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: 24,
    padding: 18,
    shadowColor: '#665576',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 2,
    marginBottom: 16,
  },
  chartHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.secondary,
  },
  legendText: {
    fontSize: 12,
    color: colors.onSurfaceVariant,
  },
  targetPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.primaryFixed,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 14,
  },
  targetPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.onPrimaryFixed,
  },
  canvasContainer: {
    height: 250,
    position: 'relative',
    paddingLeft: 46,
    paddingBottom: 24,
  },
  guideRow: {
    position: 'absolute',
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
  },
  yTickText: {
    width: 44,
    fontSize: 10,
    color: colors.outline,
    fontWeight: '500',
  },
  guideLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.surfaceContainerHighest,
  },
  targetGuideLine: {
    borderTopWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: colors.primaryContainer,
    backgroundColor: 'transparent',
  },
  targetFlag: {
    position: 'absolute',
    right: 0,
    top: -10,
    backgroundColor: colors.primary,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  targetFlagText: {
    fontSize: 8,
    fontWeight: '700',
    color: colors.onPrimary,
  },
  barsContainer: {
    position: 'absolute',
    left: 48,
    right: 0,
    top: 0,
    bottom: 24,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-around',
  },
  barColumn: {
    flex: 1,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingHorizontal: 4,
  },
  barTopArea: {
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  starIcon: {
    marginBottom: 2,
  },
  tooltip: {
    backgroundColor: colors.surfaceContainer,
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
  },
  tooltipText: {
    fontSize: 9,
    fontWeight: '600',
    color: colors.onSurfaceVariant,
  },
  pillarWrapper: {
    width: 26,
    height: '100%',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  pillar: {
    width: '100%',
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  barDayLabel: {
    fontSize: 11,
    color: colors.onSurface,
    fontWeight: '500',
    marginTop: 6,
  },
  insightsGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  insightCard: {
    flex: 1,
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: 20,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  insightLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.onSurfaceVariant,
    letterSpacing: 0.8,
  },
  insightVal: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.onSurface,
    marginTop: 4,
  },
  insightSub: {
    fontSize: 11,
    color: colors.onSurfaceVariant,
    marginTop: 2,
  },
});
