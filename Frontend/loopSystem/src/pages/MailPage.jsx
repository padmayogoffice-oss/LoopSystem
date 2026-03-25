import React, { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api from "../utils/api";
import { toast } from "react-toastify";
import { FiSend, FiPaperclip, FiLogOut } from "react-icons/fi";
import TimeSelector from "../components/TimeSelector";

const MailPage = () => {
  const [to, setTo] = useState("");
  const [subject, setSubject] = useState("");
  const [content, setContent] = useState("");
  const [timeValue, setTimeValue] = useState("1");
  const [timeUnit, setTimeUnit] = useState("seconds");
  const [count, setCount] = useState("1");
  const [attachments, setAttachments] = useState([]);
  const [sending, setSending] = useState(false);
  const fileInputRef = useRef(null);
  const { logout } = useAuth();
  const navigate = useNavigate();

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    setAttachments((prev) => [...prev, ...files]);
  };

  const removeAttachment = (index) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!to || !subject || !content) {
      toast.error("Please fill in all required fields");
      return;
    }

    if (parseInt(count) > 100) {
      toast.error("Maximum 100 emails allowed");
      return;
    }

    setSending(true);

    const formData = new FormData();
    formData.append("to", to);
    formData.append("subject", subject);
    formData.append("content", content);
    formData.append("timeValue", timeValue);
    formData.append("timeUnit", timeUnit);
    formData.append("count", count);

    attachments.forEach((file) => {
      formData.append("attachments", file);
    });

    try {
      // The correct endpoint - api baseURL already has /api
      const response = await api.post("/mail/send-loop", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      toast.success(response.data.message);

      // Clear form
      setTo("");
      setSubject("");
      setContent("");
      setAttachments([]);
      setTimeValue("1");
      setCount("1");

      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } catch (error) {
      console.error("Send error:", error);
      toast.error(error.response?.data?.message || "Error sending emails");
    } finally {
      setSending(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            Compose Loop Mail
          </h1>
          <button
            onClick={handleLogout}
            className="flex items-center px-4 py-2 text-gray-600 hover:text-gray-800"
          >
            <FiLogOut className="mr-2" />
            Logout
          </button>
        </div>

        {/* Main Form */}
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {/* To Field */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                To <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="recipient@example.com"
                required
              />
            </div>

            {/* Subject Field */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Subject <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Email subject"
                required
              />
            </div>

            {/* Email Content */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Message <span className="text-red-500">*</span>
              </label>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows="8"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Write your email here..."
                required
              />
            </div>

            {/* Attachments */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Attachments
              </label>
              <div className="flex items-center space-x-4">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  <FiPaperclip className="mr-2" />
                  Add Files
                </button>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  multiple
                  className="hidden"
                />
                <span className="text-sm text-gray-500">
                  Max 5 files, 10MB each
                </span>
              </div>

              {/* Attachment List */}
              {attachments.length > 0 && (
                <div className="mt-4 space-y-2">
                  {attachments.map((file, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between bg-gray-50 p-2 rounded"
                    >
                      <span className="text-sm text-gray-600">{file.name}</span>
                      <button
                        type="button"
                        onClick={() => removeAttachment(index)}
                        className="text-red-500 hover:text-red-700"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Time and Count Selection */}
            <TimeSelector
              timeValue={timeValue}
              setTimeValue={setTimeValue}
              timeUnit={timeUnit}
              setTimeUnit={setTimeUnit}
              count={count}
              setCount={setCount}
            />

            {/* Send Button */}
            <div className="flex justify-end pt-4">
              <button
                type="submit"
                disabled={sending}
                className="flex items-center px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                <FiSend className="mr-2" />
                {sending ? "Sending..." : "Send Loop Emails"}
              </button>
            </div>
          </form>
        </div>

        {/* Info Box */}
        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="text-sm font-medium text-blue-800 mb-2">
            How it works:
          </h3>
          <p className="text-sm text-blue-600">
            This will send {count} emails to {to || "[recipient]"} every{" "}
            {timeValue} {timeUnit}. Maximum 100 emails per session to prevent
            spam.
          </p>
        </div>
      </div>
    </div>
  );
};

export default MailPage;
