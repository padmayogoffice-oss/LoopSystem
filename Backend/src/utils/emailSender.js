import nodemailer from "nodemailer";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

// Verify environment variables are loaded
console.log("Email Configuration Check:");
console.log("ZOHO_USER:", process.env.ZOHO_USER ? "✓ Set" : "✗ Missing");
console.log(
  "ZOHO_APP_PASSWORD:",
  process.env.ZOHO_APP_PASSWORD ? "✓ Set" : "✗ Missing",
);

// Create transporter with working Zoho SMTP configuration
const transporter = nodemailer.createTransport({
  host: "smtp.zoho.in",
  port: 465,
  secure: true, // true for 465, false for other ports
  auth: {
    user: process.env.ZOHO_USER,
    pass: process.env.ZOHO_APP_PASSWORD,
  },
  tls: {
    rejectUnauthorized: false,
  },
  connectionTimeout: 10000, // 10 seconds timeout
  greetingTimeout: 10000,
  socketTimeout: 10000,
});

// Verify transporter connection (don't await, let it run in background)
transporter.verify((error, success) => {
  if (error) {
    console.error(
      "\x1b[31m%s\x1b[0m",
      "✗ Zoho Email transporter error:",
      error.message,
    );
    console.log("\x1b[33m%s\x1b[0m", "Please check:");
    console.log("  1. ZOHO_USER is correct:", process.env.ZOHO_USER);
    console.log(
      "  2. ZOHO_APP_PASSWORD is correct (app password, not regular password)",
    );
    console.log("  3. App password is generated from Zoho account settings");
    console.log("  4. IMAP/SMTP access is enabled in Zoho settings");
    console.log("  5. Check if your IP is allowed in Zoho security settings");
  } else {
    console.log(
      "\x1b[32m%s\x1b[0m",
      "✓ Zoho Email server is ready to send messages",
    );
    console.log(`✓ Email account: ${process.env.ZOHO_USER}`);
  }
});

// Send single email
export const sendEmail = async (to, subject, html, attachments = []) => {
  try {
    console.log(`Attempting to send email to: ${to}`);

    const mailOptions = {
      from: `"Looping Mail System" <${process.env.ZOHO_USER}>`,
      to: to,
      subject: subject,
      html: html,
      attachments: attachments.map((file) => ({
        filename: file.originalname,
        content: file.buffer,
        contentType: file.mimetype,
      })),
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(
      `✓ Email sent successfully to ${to}, MessageId: ${info.messageId}`,
    );
    return {
      success: true,
      messageId: info.messageId,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    console.error(`✗ Email sending error to ${to}:`, error.message);
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
