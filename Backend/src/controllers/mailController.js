import { scheduleEmails } from "../utils/emailSender.js";

export const sendLoopingMails = async (req, res) => {
  try {
    const { to, subject, content, timeValue, timeUnit, count } = req.body;
    const attachments = req.files || [];

    // Validate inputs
    if (!to || !subject || !content) {
      return res.status(400).json({
        success: false,
        message: "To, Subject, and Content are required fields",
      });
    }

    if (!timeValue || !timeUnit || !count) {
      return res.status(400).json({
        success: false,
        message: "Time value, unit, and count are required",
      });
    }

    const countNum = parseInt(count);
    if (isNaN(countNum) || countNum < 1 || countNum > 100) {
      return res.status(400).json({
        success: false,
        message: "Count must be a number between 1 and 100",
      });
    }

    const timeValueNum = parseInt(timeValue);
    if (isNaN(timeValueNum) || timeValueNum < 1) {
      return res.status(400).json({
        success: false,
        message: "Time value must be a positive number",
      });
    }

    // Validate email format for recipient
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(to)) {
      return res.status(400).json({
        success: false,
        message: "Invalid recipient email format",
      });
    }

    // Validate attachments limit
    if (attachments.length > 5) {
      return res.status(400).json({
        success: false,
        message: "Maximum 5 attachments allowed",
      });
    }

    // Get sender email from environment
    const senderEmail = process.env.FROM_EMAIL || "info@padmayog.in";
    const currentDate = new Date();
    const formattedDate = currentDate.toLocaleString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

    // Create a clean, professional email template (inbox-friendly)
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${subject}</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
          
          <!-- Simple, clean header -->
          <div style="border-bottom: 2px solid #4F46E5; padding-bottom: 10px; margin-bottom: 20px;">
            <h2 style="color: #4F46E5; margin: 0;">Padmayog Agrotech</h2>
            <p style="color: #666; margin: 5px 0 0 0; font-size: 12px;">pune,maharashtra,India</p>
          </div>
          
          <!-- Personal greeting -->
          <p style="font-size: 16px;">Hello,</p>
          
          <!-- Main content (user's message) -->
          <div style="margin: 20px 0; padding: 0;">
            ${content.replace(/\n/g, "<br>")}
          </div>
          
          <!-- Simple signature -->
          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
            <p style="margin: 5px 0;">Best regards,</p>
            <p style="margin: 5px 0; font-weight: bold;">Padmayog Agrotech Team</p>
           
          </div>
          
        </div>
      </body>
      </html>
    `;

    // Schedule the emails to the recipient
    const result = scheduleEmails(
      to,
      subject,
      htmlContent,
      attachments,
      timeValueNum,
      timeUnit,
      countNum,
      res,
    );

    res.status(200).json({
      success: true,
      message: `Started sending ${countNum} emails to ${to} every ${timeValueNum} ${timeUnit}`,
      details: {
        recipient: to,
        sender: senderEmail,
        subject: subject,
        totalEmails: countNum,
        interval: `${timeValueNum} ${timeUnit}`,
        startTime: result.startTime,
        intervalId: result.intervalId,
      },
    });
  } catch (error) {
    console.error("Error in sendLoopingMails:", error);
    res.status(500).json({
      success: false,
      message: "Error sending emails",
      error: error.message,
    });
  }
};
