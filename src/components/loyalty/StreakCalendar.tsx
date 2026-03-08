import React, { useMemo } from "react";
import { View, Text, StyleSheet } from "react-native";
import { colors } from "../../theme/colors";
import { fonts } from "../../theme/fonts";
import { spacing } from "../../theme/spacing";

interface StreakCalendarProps {
  currentStreak: number;
  lastAttendanceDate: number;
}

const DAY_LABELS = ["S", "M", "T", "W", "T", "F", "S"];
const TOTAL_DAYS = 28;

export function StreakCalendar({
  currentStreak,
  lastAttendanceDate,
}: StreakCalendarProps) {
  const { weeks, monthLabel } = useMemo(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());


    const attendedSet = new Set<string>();
    if (currentStreak > 0 && lastAttendanceDate > 0) {
      const lastDate = new Date(lastAttendanceDate * 1000);
      const lastDay = new Date(
        lastDate.getFullYear(),
        lastDate.getMonth(),
        lastDate.getDate()
      );

      for (let i = 0; i < currentStreak; i++) {
        const d = new Date(lastDay);
        d.setDate(d.getDate() - i);
        attendedSet.add(d.toDateString());
      }
    }


    const startDate = new Date(today);
    startDate.setDate(startDate.getDate() - (TOTAL_DAYS - 1));


    const dayOfWeek = startDate.getDay();
    startDate.setDate(startDate.getDate() - dayOfWeek);

    const totalCells =
      TOTAL_DAYS + dayOfWeek + (6 - today.getDay());
    const weeksArr: Array<
      Array<{
        date: Date;
        attended: boolean;
        isToday: boolean;
        inRange: boolean;
      }>
    > = [];
    let currentWeek: typeof weeksArr[number] = [];

    for (let i = 0; i < totalCells; i++) {
      const d = new Date(startDate);
      d.setDate(d.getDate() + i);

      const rangeStart = new Date(today);
      rangeStart.setDate(rangeStart.getDate() - (TOTAL_DAYS - 1));

      currentWeek.push({
        date: d,
        attended: attendedSet.has(d.toDateString()),
        isToday: d.toDateString() === today.toDateString(),
        inRange: d >= rangeStart && d <= today,
      });

      if (currentWeek.length === 7) {
        weeksArr.push(currentWeek);
        currentWeek = [];
      }
    }
    if (currentWeek.length > 0) {
      weeksArr.push(currentWeek);
    }

    const mLabel = today.toLocaleDateString("en-US", {
      month: "long",
      year: "numeric",
    });

    return { weeks: weeksArr, monthLabel: mLabel };
  }, [currentStreak, lastAttendanceDate]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Attendance Calendar</Text>
      <Text style={styles.subtitle}>Last 4 weeks</Text>


      <View style={styles.headerRow}>
        {DAY_LABELS.map((label, i) => (
          <View key={i} style={styles.headerCell}>
            <Text style={styles.headerLabel}>{label}</Text>
          </View>
        ))}
      </View>


      {weeks.map((week, wi) => (
        <View key={wi} style={styles.weekRow}>
          {week.map((day, di) => {
            const isAttended = day.attended && day.inRange;
            const isFuture = day.date > new Date();

            return (
              <View
                key={di}
                style={[
                  styles.dayCell,
                  isAttended && styles.dayCellAttended,
                  day.isToday && styles.dayCellToday,
                  !day.inRange && styles.dayCellOutOfRange,
                ]}
              >
                <Text
                  style={[
                    styles.dayText,
                    isAttended && styles.dayTextAttended,
                    day.isToday && styles.dayTextToday,
                    !day.inRange && styles.dayTextOutOfRange,
                    isFuture && styles.dayTextFuture,
                  ]}
                >
                  {day.date.getDate()}
                </Text>
                {isAttended && <View style={styles.attendedDot} />}
              </View>
            );
          })}
        </View>
      ))}


      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: colors.primary }]} />
          <Text style={styles.legendText}>Attended</Text>
        </View>
        <View style={styles.legendItem}>
          <View
            style={[
              styles.legendDot,
              {
                backgroundColor: colors.transparent,
                borderWidth: 1,
                borderColor: colors.primary,
              },
            ]}
          />
          <Text style={styles.legendText}>Today</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingTop: spacing.xs,
  },
  title: {
    fontSize: 16,
    fontFamily: fonts.headingSemiBold,
    color: colors.text,
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 12,
    fontFamily: fonts.body,
    color: colors.textMuted,
    marginBottom: spacing.md,
  },
  headerRow: {
    flexDirection: "row",
    marginBottom: spacing.xs,
  },
  headerCell: {
    flex: 1,
    alignItems: "center",
  },
  headerLabel: {
    fontSize: 11,
    fontFamily: fonts.bodySemiBold,
    color: colors.textMuted,
  },
  weekRow: {
    flexDirection: "row",
    marginBottom: 4,
  },
  dayCell: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    height: 36,
    borderRadius: 8,
    position: "relative",
  },
  dayCellAttended: {
    backgroundColor: colors.primaryMuted,
  },
  dayCellToday: {
    borderWidth: 1,
    borderColor: colors.primary,
  },
  dayCellOutOfRange: {
    opacity: 0.3,
  },
  dayText: {
    fontSize: 13,
    fontFamily: fonts.bodyMedium,
    color: colors.textSecondary,
  },
  dayTextAttended: {
    color: colors.primary,
    fontFamily: fonts.bodySemiBold,
  },
  dayTextToday: {
    color: colors.primary,
    fontFamily: fonts.bodySemiBold,
  },
  dayTextOutOfRange: {
    color: colors.textMuted,
  },
  dayTextFuture: {
    color: colors.textMuted,
  },
  attendedDot: {
    position: "absolute",
    bottom: 3,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.primary,
  },
  legend: {
    flexDirection: "row",
    justifyContent: "center",
    gap: spacing.lg,
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendText: {
    fontSize: 11,
    fontFamily: fonts.body,
    color: colors.textMuted,
  },
});
