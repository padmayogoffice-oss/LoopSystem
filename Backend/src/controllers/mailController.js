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
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
    });

    // Create professional HTML email template with sender information
    const htmlContent = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${subject}</title>
        <style>
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            color: #1a1a1a;
            background-color: #f4f4f4;
          }
          
          .email-container {
            max-width: 650px;
            margin: 0 auto;
            background-color: #ffffff;
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
          }
          
          .email-header {
            background: linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%);
            padding: 30px 20px;
            text-align: center;
            color: white;
          }
          
          .email-header h1 {
            font-size: 28px;
            margin-bottom: 8px;
            font-weight: 600;
          }
          
          .email-header p {
            font-size: 14px;
            opacity: 0.9;
          }
          
          .email-body {
            padding: 40px 30px;
            background-color: #ffffff;
          }
          
          .email-footer {
            padding: 20px 30px;
            background-color: #f8f9fa;
            border-top: 1px solid #e9ecef;
            font-size: 12px;
            color: #6c757d;
            text-align: center;
          }
          
          .sender-info {
            background-color: #f8f9fa;
            padding: 15px;
            border-radius: 8px;
            margin-bottom: 25px;
            border-left: 4px solid #4F46E5;
          }
          
          .sender-info p {
            margin: 5px 0;
            font-size: 14px;
          }
          
          .sender-label {
            font-weight: 600;
            color: #4F46E5;
            min-width: 70px;
            display: inline-block;
          }
          
          .email-subject {
            font-size: 24px;
            font-weight: 600;
            color: #1a1a1a;
            margin-bottom: 25px;
            padding-bottom: 15px;
            border-bottom: 2px solid #e9ecef;
          }
          
          .email-content {
            font-size: 16px;
            color: #2c3e50;
            margin-bottom: 30px;
            line-height: 1.8;
          }
          
          .email-content p {
            margin-bottom: 15px;
          }
          
          .meta-info {
            background-color: #f8f9fa;
            padding: 15px;
            border-radius: 8px;
            margin-top: 25px;
            font-size: 13px;
            color: #6c757d;
          }
          
          .meta-info span {
            font-weight: 600;
            color: #4F46E5;
          }
          
          .button {
            display: inline-block;
            padding: 10px 20px;
            background-color: #4F46E5;
            color: white;
            text-decoration: none;
            border-radius: 6px;
            margin-top: 20px;
            font-size: 14px;
          }
          
          @media only screen and (max-width: 600px) {
            .email-body {
              padding: 25px 20px;
            }
            .email-subject {
              font-size: 20px;
            }
          }
        </style>
      </head>
      <body style="margin: 0; padding: 20px; background-color: #f4f4f4;">
        <div class="email-container">
          <!-- Header Section -->
          <div class="email-header">
            <h1>Looping Mail System</h1>
            <p>Automated Email Delivery Service</p>
          </div>
          
          <!-- Body Section -->
          <div class="email-body">
            <!-- Sender Information -->
            <div class="sender-info">
              <p><span class="sender-label">From:</span> ${senderEmail}</p>
              <p><span class="sender-label">To:</span> ${to}</p>
              <p><span class="sender-label">Date:</span> ${formattedDate}</p>
            </div>
            
            <!-- Subject -->
            <div class="email-subject">
              ${subject}
            </div>
            
            <!-- Email Content -->
            <div class="email-content">
              ${content.replace(/\n/g, "<br>").replace(/ /g, " ")}
            </div>
            
            <!-- Meta Information -->
            <div class="meta-info">
              <p><span>📧 Message ID:</span> ${Date.now()}-${Math.random().toString(36).substr(2, 9)}</p>
              <p><span>🔄 Loop Number:</span> This is an automated loop email</p>
              <p><span>⏰ Sent at:</span> ${formattedDate}</p>
            </div>
          </div>
          
          <!-- Footer Section -->
          <div class="email-footer">
            <p>This is an automated email sent from Looping Mail System</p>
            <p>© ${new Date().getFullYear()} Looping Mail System. All rights reserved.</p>
            <p style="margin-top: 10px; font-size: 11px;">
              This is a system-generated email. Please do not reply to this message.
            </p>
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
