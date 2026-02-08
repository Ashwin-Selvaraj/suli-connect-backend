/**
 * Attendance Service – Business logic for event-sourced attendance.
 * All calculations and event handling live here; controllers only delegate.
 */

import { prisma } from '../../prisma/client';
import type { AttendanceEventType, DeviceType, DailySummaryStatus } from '@prisma/client';

const MIN_SESSION_MINUTES = 15;

export type CheckInPayload = {
  latitude?: number;
  longitude?: number;
  accuracy?: number;
  locationId?: string;
  taskId?: string;
  deviceType?: DeviceType;
};

export type CheckOutPayload = CheckInPayload;

/** Insert a CHECK_IN event. Append-only; never overwrites. */
export async function insertCheckInEvent(
  userId: string,
  payload: CheckInPayload
): Promise<{ id: string; timestamp: Date; eventType: 'CHECK_IN' }> {
  const event = await prisma.attendanceEvent.create({
    data: {
      userId,
      eventType: 'CHECK_IN',
      latitude: payload.latitude,
      longitude: payload.longitude,
      accuracy: payload.accuracy,
      locationId: payload.locationId ?? undefined,
      taskId: payload.taskId ?? undefined,
      deviceType: payload.deviceType ?? 'MOBILE',
    },
    select: { id: true, timestamp: true, eventType: true },
  });
  return event as { id: string; timestamp: Date; eventType: 'CHECK_IN' };
}

/** Insert a CHECK_OUT event. Append-only; never overwrites. */
export async function insertCheckOutEvent(
  userId: string,
  payload: CheckOutPayload
): Promise<{ id: string; timestamp: Date; eventType: 'CHECK_OUT' }> {
  const event = await prisma.attendanceEvent.create({
    data: {
      userId,
      eventType: 'CHECK_OUT',
      latitude: payload.latitude,
      longitude: payload.longitude,
      accuracy: payload.accuracy,
      locationId: payload.locationId ?? undefined,
      taskId: payload.taskId ?? undefined,
      deviceType: payload.deviceType ?? 'MOBILE',
    },
    select: { id: true, timestamp: true, eventType: true },
  });
  return event as { id: string; timestamp: Date; eventType: 'CHECK_OUT' };
}

type EventRow = { id: string; eventType: AttendanceEventType; timestamp: Date };

/**
 * Compute daily summary from raw events.
 * - Pairs CHECK_IN → CHECK_OUT in order.
 * - Ignores CHECK_OUT without prior CHECK_IN.
 * - Ignores sessions < MIN_SESSION_MINUTES.
 * - totalBreakMinutes = gaps between sessions.
 * - NEEDS_VERIFICATION if last event is CHECK_IN with no pair.
 */
export async function computeAndStoreDailySummary(
  userId: string,
  date: Date
): Promise<{
  id: string;
  date: Date;
  firstCheckIn: Date | null;
  lastCheckOut: Date | null;
  totalWorkMinutes: number;
  totalBreakMinutes: number;
  sessionsCount: number;
  status: DailySummaryStatus;
}> {
  const dayStart = new Date(date);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(dayStart);
  dayEnd.setDate(dayEnd.getDate() + 1);

  const events = await prisma.attendanceEvent.findMany({
    where: {
      userId,
      timestamp: { gte: dayStart, lt: dayEnd },
    },
    orderBy: { timestamp: 'asc' },
    select: { id: true, eventType: true, timestamp: true },
  });

  const { firstCheckIn, lastCheckOut, totalWorkMinutes, totalBreakMinutes, sessionsCount, status } =
    computeFromEvents(events as EventRow[]);

  const summary = await prisma.attendanceDailySummary.upsert({
    where: {
      userId_date: { userId, date: dayStart },
    },
    create: {
      userId,
      date: dayStart,
      firstCheckIn: firstCheckIn ?? undefined,
      lastCheckOut: lastCheckOut ?? undefined,
      totalWorkMinutes,
      totalBreakMinutes,
      sessionsCount,
      status,
    },
    update: {
      firstCheckIn: firstCheckIn ?? undefined,
      lastCheckOut: lastCheckOut ?? undefined,
      totalWorkMinutes,
      totalBreakMinutes,
      sessionsCount,
      status,
    },
  });

  return {
    id: summary.id,
    date: summary.date,
    firstCheckIn: summary.firstCheckIn,
    lastCheckOut: summary.lastCheckOut,
    totalWorkMinutes: summary.totalWorkMinutes,
    totalBreakMinutes: summary.totalBreakMinutes,
    sessionsCount: summary.sessionsCount,
    status: summary.status,
  };
}

function computeFromEvents(events: EventRow[]): {
  firstCheckIn: Date | null;
  lastCheckOut: Date | null;
  totalWorkMinutes: number;
  totalBreakMinutes: number;
  sessionsCount: number;
  status: DailySummaryStatus;
} {
  let firstCheckIn: Date | null = null;
  let lastCheckOut: Date | null = null;
  let totalWorkMinutes = 0;
  let totalBreakMinutes = 0;
  let sessionsCount = 0;
  let pendingCheckIn: Date | null = null;
  let lastSessionEnd: Date | null = null;

  for (const e of events) {
    if (e.eventType === 'CHECK_IN') {
      // Ignore overlapping: new CHECK_IN without prior CHECK_OUT discards previous pending
      pendingCheckIn = e.timestamp;
      if (firstCheckIn === null) firstCheckIn = e.timestamp;
    } else {
      // CHECK_OUT
      if (pendingCheckIn !== null) {
        const sessionMinutes = Math.floor((e.timestamp.getTime() - pendingCheckIn.getTime()) / 60_000);
        if (sessionMinutes >= MIN_SESSION_MINUTES) {
          totalWorkMinutes += sessionMinutes;
          sessionsCount += 1;
          lastCheckOut = e.timestamp;
          // Break = time from last session end to this check-in
          if (lastSessionEnd !== null) {
            totalBreakMinutes += Math.floor(
              (pendingCheckIn.getTime() - lastSessionEnd.getTime()) / 60_000
            );
          }
          lastSessionEnd = e.timestamp;
        }
        pendingCheckIn = null;
      }
      // CHECK_OUT without prior CHECK_IN: ignored
    }
  }

  const hasOpenCheckIn = pendingCheckIn !== null;
  let status: DailySummaryStatus;
  if (sessionsCount === 0 && !hasOpenCheckIn) {
    status = 'ABSENT';
  } else if (hasOpenCheckIn) {
    status = 'NEEDS_VERIFICATION';
  } else if (sessionsCount > 0 && totalWorkMinutes >= 360) {
    status = 'PRESENT'; // 6+ hours
  } else {
    status = 'PARTIAL';
  }

  return {
    firstCheckIn,
    lastCheckOut,
    totalWorkMinutes,
    totalBreakMinutes,
    sessionsCount,
    status,
  };
}

/** Get daily summary for user and date. Computes if not yet stored. */
export async function getDailySummary(
  userId: string,
  date: Date
): Promise<{
  id: string;
  date: Date;
  firstCheckIn: Date | null;
  lastCheckOut: Date | null;
  totalWorkMinutes: number;
  totalBreakMinutes: number;
  sessionsCount: number;
  status: DailySummaryStatus;
}> {
  const dayStart = new Date(date);
  dayStart.setHours(0, 0, 0, 0);

  return computeAndStoreDailySummary(userId, dayStart);
}
