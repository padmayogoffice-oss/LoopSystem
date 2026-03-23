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
    const senderEmail =
      process.env.ZOHO_USER || process.env.EMAIL_USER || "noreply@loopmail.com";
    const currentDate = new Date();
    const formattedDate = currentDate.toLocaleString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });

    // Create simple HTML email template
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            margin: 0;
            padding: 20px;
          }
          .email-container {
            max-width: 600px;
            margin: 0 auto;
            background-color: #fff;
            border: 1px solid #ddd;
            border-radius: 5px;
            padding: 20px;
          }
          .sender-info {
            border-bottom: 1px solid #eee;
            padding-bottom: 10px;
            margin-bottom: 20px;
          }
          .sender-info p {
            margin: 5px 0;
            font-size: 14px;
          }
          .subject {
            font-size: 18px;
            font-weight: bold;
            margin-bottom: 15px;
            color: #444;
          }
          .content {
            margin-bottom: 20px;
          }
        </style>
      </head>
      <body>
        <div class="email-container">
          <div class="sender-info">
            <p><strong>From:</strong> ${senderEmail}</p>
            <p><strong>To:</strong> ${to}</p>
            <p><strong>Date:</strong> ${formattedDate}</p>
          </div>
          
          <div class="subject">
            ${subject}
          </div>
          
          <div class="content">
            ${content.replace(/\n/g, "<br>")}
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
