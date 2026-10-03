import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import { useEffect } from 'react';
import { Platform } from 'react-native';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

// 通知が許可されていない。端末の設定アプリで許可してもらう必要がある
export class NotificationPermissionError extends Error {
  constructor() {
    super('通知が許可されていません');
  }
}

export async function scheduleVisitReminder(weekday: number, hour: number, minute: number): Promise<string> {
  if (Platform.OS === 'web') throw new Error('通知の設定はiOS・Android版で利用できます。');

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('visit-reminders', {
      name: '参拝リマインダー',
      description: '神社へのお参りを思い出すための通知',
      importance: Notifications.AndroidImportance.DEFAULT,
      vibrationPattern: [0, 180, 100, 180],
      lightColor: '#FF6FAF',
    });
  }

  const existing = await Notifications.getPermissionsAsync();
  const permission = existing.granted ? existing : await Notifications.requestPermissionsAsync();
  if (!permission.granted) throw new NotificationPermissionError();

  return Notifications.scheduleNotificationAsync({
    content: {
      title: '神さまに会いにいきませんか？ ⛩️',
      body: '近くの神社へ、今週のご縁を結びにいきましょう。',
      sound: true,
      data: { url: '/map', kind: 'visit-reminder' },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
      weekday,
      hour,
      minute,
      channelId: 'visit-reminders',
    },
  });
}

// リマインダーの通知を押してアプリを開いたとき、「めぐる」タブを開く
export function useVisitReminderTap() {
  useEffect(() => {
    if (Platform.OS === 'web') return;
    function open(response: Notifications.NotificationResponse | null) {
      if (response?.notification.request.content.data?.kind !== 'visit-reminder') return;
      router.navigate('/map');
      // 次にこの画面が作られたとき、同じ通知でもう一度開かないようにする
      Notifications.clearLastNotificationResponseAsync().catch(() => {});
    }
    open(Notifications.getLastNotificationResponse());
    const subscription = Notifications.addNotificationResponseReceivedListener(open);
    return () => subscription.remove();
  }, []);
}

export async function cancelVisitReminder(notificationId: string | null): Promise<void> {
  if (!notificationId || Platform.OS === 'web') return;
  await Notifications.cancelScheduledNotificationAsync(notificationId);
}
