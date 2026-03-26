import sgMail from "@sendgrid/mail";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

// Get SendGrid configuration from environment
const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY;
const FROM_EMAIL = process.env.FROM_EMAIL;

// Verify environment variables
console.log("Email Configuration Check:");
console.log("SENDGRID_API_KEY:", SENDGRID_API_KEY ? "✓ Set" : "✗ Missing");
console.log("FROM_EMAIL:", FROM_EMAIL ? "✓ Set" : "✗ Missing");

// Initialize SendGrid
if (SENDGRID_API_KEY) {
  sgMail.setApiKey(SENDGRID_API_KEY);
}

// Test SendGrid connection
const testSendGridConnection = async () => {
  if (!SENDGRID_API_KEY || !FROM_EMAIL) {
    console.error(
      "\x1b[31m%s\x1b[0m",
      "✗ SendGrid not configured. Missing API key or FROM_EMAIL",
    );
    return false;
  }

  try {
    // Send a test email to verify configuration
    await sgMail.send({
      to: FROM_EMAIL,
      from: FROM_EMAIL,
      subject: "SendGrid Connection Test",
      text: "SendGrid is working correctly for Looping Mail System!",
    });
    console.log("\x1b[32m%s\x1b[0m", "✓ SendGrid is ready to send messages");
    console.log(`✓ From email: ${FROM_EMAIL}`);
    return true;
  } catch (error) {
    console.error("\x1b[31m%s\x1b[0m", "✗ SendGrid error:", error.message);
    if (error.response) {
      console.error("Error details:", error.response.body);
    }
    console.log("\x1b[33m%s\x1b[0m", "Please check:");
    console.log("  1. SENDGRID_API_KEY is correct");
    console.log("  2. FROM_EMAIL is verified in SendGrid");
    console.log("  3. You have sufficient credits/tier");
    return false;
  }
};

// Call test in background
testSendGridConnection();

// Send single email using SendGrid
export const sendEmail = async (to, subject, html, attachments = []) => {
  try {
    console.log(`Attempting to send email to: ${to}`);

    if (!SENDGRID_API_KEY || !FROM_EMAIL) {
      throw new Error("SendGrid not configured. Missing API key or FROM_EMAIL");
    }

    const msg = {
      to: to,
      from: FROM_EMAIL,
      subject: subject,
      html: html,
    };

    // Add attachments if any
    if (attachments && attachments.length > 0) {
      msg.attachments = attachments.map((file) => ({
        content: file.buffer.toString("base64"),
        filename: file.originalname,
        type: file.mimetype,
        disposition: "attachment",
      }));
    }

    const response = await sgMail.send(msg);
    console.log(`✓ Email sent successfully to ${to}`);
    return {
      success: true,
      messageId:
        response[0]?.headers?.["x-message-id"] || Date.now().toString(),
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    console.error(`✗ Email sending error to ${to}:`, error.message);
    if (error.response) {
      console.error("SendGrid Error:", error.response.body);
    }
    throw new Error(`Failed to send email: ${error.message}`);
  }
};

// Convert time to milliseconds
const convertToMs = (value, unit) => {
  const numValue = parseInt(value);
  switch (unit) {
    case "seconds":
      return numValue * 1000;
    case "minutes":
      return numValue * 60 * 1000;
    case "hours":
      return numValue * 60 * 60 * 1000;
    case "days":
      return numValue * 24 * 60 * 60 * 1000;
    default:
      return numValue * 1000;
  }
};

// Store active intervals
const activeIntervals = new Map();

// Schedule multiple emails with error handling and retry logic
export const scheduleEmails = (
  to,
  subject,
  html,
  attachments,
  timeValue,
  timeUnit,
  count,
  res,
) => {
  let sentCount = 0;
  let isCancelled = false;
  let failedAttempts = 0;
  const MAX_RETRIES = 3;

  // Convert time to milliseconds
  const timeInMs = Math.max(convertToMs(timeValue, timeUnit), 3000); // Minimum 3 seconds
  const intervalId = Date.now().toString();

  const sendNextEmail = async () => {
    if (isCancelled || sentCount >= parseInt(count)) {
      if (activeIntervals.has(intervalId)) {
        clearInterval(activeIntervals.get(intervalId));
        activeIntervals.delete(intervalId);
      }
      return;
    }

    try {
      const result = await sendEmail(to, subject, html, attachments);
      sentCount++;
      failedAttempts = 0; // Reset failed attempts on success
      console.log(
        `📧 Email ${sentCount}/${count} sent to ${to} at ${new Date().toISOString()}`,
      );

      if (sentCount === parseInt(count)) {
        console.log(`✓ All ${count} emails sent successfully to ${to}`);
        if (activeIntervals.has(intervalId)) {
          clearInterval(activeIntervals.get(intervalId));
          activeIntervals.delete(intervalId);
        }
      }
    } catch (error) {
      failedAttempts++;
      console.error(`✗ Error sending email ${sentCount + 1}:`, error.message);

      // Retry logic
      if (failedAttempts <= MAX_RETRIES) {
        console.log(`Retrying... Attempt ${failedAttempts}/${MAX_RETRIES}`);
        // Retry after 5 seconds
        setTimeout(() => {
          if (!isCancelled && sentCount < parseInt(count)) {
            sendNextEmail();
          }
        }, 5000);
      } else {
        console.error(
          `✗ Failed to send email after ${MAX_RETRIES} attempts. Stopping.`,
        );
        isCancelled = true;
        if (activeIntervals.has(intervalId)) {
          clearInterval(activeIntervals.get(intervalId));
          activeIntervals.delete(intervalId);
        }
      }
    }
  };

  // Start sending emails
  const interval = setInterval(sendNextEmail, timeInMs);
  activeIntervals.set(intervalId, interval);

  // Send first email immediately
  setTimeout(sendNextEmail, 0);

  return {
    message: `Started sending ${count} emails to ${to} every ${timeValue} ${timeUnit}`,
    intervalId,
    totalEmails: count,
    timeInterval: `${timeValue} ${timeUnit}`,
    actualDelay: `${timeInMs / 1000} seconds`,
    startTime: new Date().toISOString(),
  };
};

// Cancel all active email schedules
export const cancelAllSchedules = () => {
  for (const [id, interval] of activeIntervals) {
    clearInterval(interval);
    activeIntervals.delete(id);
  }
  return { cancelled: activeIntervals.size };
};
