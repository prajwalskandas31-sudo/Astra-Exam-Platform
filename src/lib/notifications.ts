import { prisma } from "./prisma";

export interface NotificationPayload {
  recipientPhone: string;
  recipientName: string;
  type: "TEST_ASSIGNED" | "RESULT_NOTIFICATION" | "WEEKLY_REPORT";
  channel?: "WHATSAPP" | "EMAIL";
  testTitle?: string;
  score?: number;
  accuracy?: number;
  rank?: number;
  reportUrl?: string;
  organizationId?: string | null;
}

export class NotificationService {
  /**
   * Dispatch a notification. No real provider is wired up yet, so messages are
   * logged to the console and recorded in NotificationLog (visible to that institute in Admin → Notification Logs).
   */
  static async sendNotification(payload: NotificationPayload): Promise<{ success: boolean; logId: string }> {
    const { recipientPhone, recipientName, type, testTitle, score, accuracy, rank, reportUrl, channel = "WHATSAPP", organizationId = null } = payload;

    let messageText = "";
    switch (type) {
      case "RESULT_NOTIFICATION":
        messageText = `📚 *Astra Result Alert*\nHello ${recipientName}, performance update for *${testTitle}*:\n• Score: ${score} marks\n• Accuracy: ${accuracy}%${rank ? `\n• Rank: #${rank}` : ""}\n\nView detailed report: ${reportUrl}`;
        break;
      case "TEST_ASSIGNED":
        messageText = `📝 *Astra Alert*\nHello ${recipientName}, a new exam *${testTitle}* has been assigned to you.\n\nAccess test: ${reportUrl}`;
        break;
      case "WEEKLY_REPORT":
        messageText = `📊 *Astra Weekly Summary*\nHello ${recipientName}, your weekly performance report is ready.\n\nView summary: ${reportUrl}`;
        break;
    }

    if (process.env.NODE_ENV !== "production") {
      console.log(`[NOTIFICATION_SIMULATOR:${channel}] → ${recipientPhone}\n${messageText}`);
    }

    const log = await prisma.notificationLog.create({
      data: {
        recipientPhone,
        type: `${type}_${channel}`,
        status: "SENT",
        payload: JSON.stringify({ recipientName, testTitle, score, accuracy, rank, channel, messageText }),
        reportUrl,
        organizationId
      }
    });

    return { success: true, logId: log.id };
  }
}
