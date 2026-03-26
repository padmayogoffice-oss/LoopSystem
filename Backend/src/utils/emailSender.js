import nodemailer from "nodemailer";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

// Verify environment variables
console.log("Email Configuration Check:");
console.log("ZOHO_USER:", process.env.ZOHO_USER ? "✓ Set" : "✗ Missing");
console.log(
  "ZOHO_APP_PASSWORD:",
  process.env.ZOHO_APP_PASSWORD ? "✓ Set" : "✗ Missing",
);

// Try multiple ports that might be allowed on cloud platforms
const smtpPorts = [25, 587, 465, 2525, 8025];
let activeTransporter = null;
let workingPort = null;

// Function to test different SMTP ports
const getWorkingTransporter = async () => {
  if (activeTransporter) return activeTransporter;

  for (const port of smtpPorts) {
    try {
      console.log(`Testing Zoho SMTP on port ${port}...`);

      const transporter = nodemailer.createTransport({
        host: "smtp.zoho.in",
        port: port,
        secure: port === 465, // true for 465, false for other ports
        auth: {
          user: process.env.ZOHO_USER,
          pass: process.env.ZOHO_APP_PASSWORD,
        },
        tls: {
          rejectUnauthorized: false,
        },
        connectionTimeout: 10000,
        greetingTimeout: 10000,
        socketTimeout: 10000,
      });

      // Test the connection
      await transporter.verify();
      console.log(`✓ SMTP working on port ${port}`);
      activeTransporter = transporter;
      workingPort = port;
      return transporter;
    } catch (error) {
      console.log(`✗ Port ${port} failed: ${error.message}`);
    }
  }

  console.error("✗ No working SMTP port found");
  return null;
};

// Initialize transporter asynchronously
let transporter = null;
let transporterInitialized = false;

const initTransporter = async () => {
  if (!transporterInitialized) {
    transporter = await getWorkingTransporter();
    transporterInitialized = true;
  }
  return transporter;
};

// Call initialization
initTransporter();

// Send single email using Nodemailer
export const sendEmail = async (to, subject, html, attachments = []) => {
  try {
    console.log(`Attempting to send email to: ${to}`);

    // Get working transporter
    const transporterInstance = await initTransporter();

    if (!transporterInstance) {
      throw new Error("No working SMTP connection available");
    }

    console.log(`Using SMTP port: ${workingPort}`);

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

    const info = await transporterInstance.sendMail(mailOptions);
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
