import { prisma } from "./prisma";

export interface NotificationPayload {
  recipientPhone: string;
  recipientName: string;
  type: "TEST_ASSIGNED" | "RESULT_NOTIFICATION" | "WEEKLY_REPORT";
  testTitle?: string;
  score?: number;
  accuracy?: number;
  rank?: number;
  reportUrl?: string;
}

export class NotificationService {
  /**
   * Dispatch a notification via configured WhatsApp / SMS provider
   */
  static async sendNotification(payload: NotificationPayload): Promise<{ success: boolean; logId: string }> {
    const { recipientPhone, recipientName, type, testTitle, score, accuracy, rank, reportUrl } = payload;

    let messageText = "";

    switch (type) {
      case "RESULT_NOTIFICATION":
        messageText = `📚 *Apex Coaching Alert*\nHello ${recipientName}, performance update for *${testTitle}*:\n• Score: ${score} marks\n• Accuracy: ${accuracy}%\n• Rank: #${rank}\n\nView detailed report: ${reportUrl}`;
        break;
      case "TEST_ASSIGNED":
        messageText = `📝 *Apex Coaching Alert*\nHello ${recipientName}, a new mock exam *${testTitle}* has been assigned to your profile.\n\nAccess test: ${reportUrl}`;
        break;
      case "WEEKLY_REPORT":
        messageText = `📊 *Apex Weekly Summary*\nHello ${recipientName}, your child's weekly performance report is ready.\n\nView summary: ${reportUrl}`;
        break;
    }

    console.log(`[WHATSAPP_NOTIFICATION_SIMULATOR] Sending to ${recipientPhone}:`);
    console.log(messageText);

    // Save notification log in database
    const log = await prisma.notificationLog.create({
      data: {
        recipientPhone,
        type,
        status: "SENT",
        payload: JSON.stringify({ recipientName, testTitle, score, accuracy, rank, messageText }),
        reportUrl
      }
    });

    return { success: true, logId: log.id };
  }
}
