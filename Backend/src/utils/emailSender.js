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

// Create transporter with Zoho SMTP configuration
const transporter = nodemailer.createTransport({
  host: "smtp.zoho.in",
  port: 465, // Using 465 for SSL instead of 587
  secure: true, // true for 465, false for other ports
  auth: {
    user: process.env.ZOHO_USER,
    pass: process.env.ZOHO_APP_PASSWORD,
  },
  tls: {
    rejectUnauthorized: false,
  },
  debug: true, // Enable debug output
  logger: true, // Enable logger
});

// Verify transporter connection
const verifyTransporter = async () => {
  try {
    await transporter.verify();
    console.log(
      "\x1b[32m%s\x1b[0m",
      "✓ Zoho Email server is ready to send messages",
    );
    console.log(`✓ Email account: ${process.env.ZOHO_USER}`);
    return true;
  } catch (error) {
    console.error(
      "\x1b[31m%s\x1b[0m",
      "✗ Zoho Email transporter error:",
      error.message,
    );
    console.log("\x1b[33m%s\x1b[0m", "Please check:");
    console.log("  1. ZOHO_USER is correct: info@padmayog.in");
    console.log(
      "  2. ZOHO_APP_PASSWORD is correct (app password, not regular password)",
    );
    console.log("  3. App password is generated from Zoho account settings");
    console.log("  4. IMAP/SMTP access is enabled in Zoho settings");
    return false;
  }
};

// Call verification
verifyTransporter();

// Send single email
export const sendEmail = async (to, subject, html, attachments = []) => {
  try {
    // Log email attempt
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

// Store active intervals to potentially cancel them
const activeIntervals = new Map();

// Schedule multiple emails
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

  // Convert time to milliseconds
  const timeInMs = convertToMs(timeValue, timeUnit);
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
      console.error(`✗ Error sending email ${sentCount + 1}:`, error.message);
      isCancelled = true;
      if (activeIntervals.has(intervalId)) {
        clearInterval(activeIntervals.get(intervalId));
        activeIntervals.delete(intervalId);
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
    startTime: new Date().toISOString(),
  };
};

// Cancel all active email schedules (optional utility)
export const cancelAllSchedules = () => {
  for (const [id, interval] of activeIntervals) {
    clearInterval(interval);
    activeIntervals.delete(id);
  }
  return { cancelled: activeIntervals.size };
};
