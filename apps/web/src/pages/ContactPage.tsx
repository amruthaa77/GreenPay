import React, { useState } from 'react';
import { businessConfig } from '@greenpay/config';
import { Mail, Phone, MapPin, ShieldCheck, Send, CheckCircle2 } from 'lucide-react';

export const ContactPage: React.FC = () => {
  const [submitted, setSubmitted] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: 'General Inquiry',
    message: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.email || !formData.message) return;
    setSubmitted(true);
  };

  return (
    <div className="min-h-screen py-16 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto space-y-12">
      
      {/* Header */}
      <div className="text-center space-y-4">
        <span className="micro-label text-[#D7FF35]">COMMUNICATIONS & GRIEVANCE REDRESSAL</span>
        <h1 className="text-3xl sm:text-5xl font-light text-white tracking-tight">
          Contact GreenPay
        </h1>
        <p className="max-w-xl mx-auto text-sm text-[#A7B9A8] font-light">
          Have a question regarding household waste weighment, your Green Score, or data protection rights?
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        
        {/* Left: Contact Details */}
        <div className="p-8 rounded-2xl bg-[#0D4935]/80 border border-white/10 shadow-card-dark space-y-6 text-xs text-[#A7B9A8]">
          <div>
            <h2 className="text-base font-semibold text-white">Office & Operations</h2>
            <p className="mt-1 text-[#A7B9A8]">
              {businessConfig.legalName || 'GreenPay Research Project'}
            </p>
          </div>

          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <MapPin className="w-4 h-4 text-[#D7FF35] mt-0.5 shrink-0" />
              <div>
                <span className="block font-semibold text-white">Registered Address</span>
                <span>{businessConfig.registeredAddress || 'Bengaluru, Karnataka, India'}</span>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Mail className="w-4 h-4 text-[#D7FF35] mt-0.5 shrink-0" />
              <div>
                <span className="block font-semibold text-white">General Inquiries</span>
                <a
                  href={`mailto:${businessConfig.contactEmail || 'contact@greenpay.blr'}`}
                  className="text-white hover:text-[#D7FF35] transition"
                >
                  {businessConfig.contactEmail || 'contact@greenpay.blr'}
                </a>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Phone className="w-4 h-4 text-[#D7FF35] mt-0.5 shrink-0" />
              <div>
                <span className="block font-semibold text-white">Helpline</span>
                <a
                  href={`tel:${businessConfig.contactPhone || '+918025534410'}`}
                  className="text-white hover:text-[#D7FF35] transition"
                >
                  {businessConfig.contactPhone || '+91 80 2553 4410'}
                </a>
              </div>
            </div>
          </div>

          {/* DPDP Grievance Box */}
          <div className="p-4 rounded-xl bg-[#062B20]/90 border border-white/10 space-y-2">
            <div className="flex items-center gap-2 font-semibold text-white">
              <ShieldCheck className="w-4 h-4 text-[#D7FF35]" />
              <span>DPDP Act 2023 Grievance Officer</span>
            </div>
            <p className="text-[11px] text-[#A7B9A8]">
              For personal data access requests, rectification, or erasure grievances:
            </p>
            <div className="text-[11px] font-mono text-[#A7B9A8]">
              Officer: {businessConfig.grievanceOfficerName || 'Grievance Officer'}<br />
              Email:{' '}
              <a
                href={`mailto:${businessConfig.grievanceOfficerEmail || 'grievance@greenpay.blr'}`}
                className="text-[#D7FF35] hover:underline"
              >
                {businessConfig.grievanceOfficerEmail || 'grievance@greenpay.blr'}
              </a>
            </div>
          </div>
        </div>

        {/* Right: Message Form */}
        <div className="p-8 rounded-2xl bg-[#0D4935]/80 border border-white/10 shadow-card-dark space-y-6">
          <h2 className="text-base font-semibold text-white">Send Us a Direct Message</h2>
          
          {submitted ? (
            <div className="p-6 rounded-xl bg-[#D7FF35]/10 border border-[#D7FF35]/30 text-center space-y-3">
              <CheckCircle2 className="w-8 h-8 text-[#D7FF35] mx-auto" />
              <div className="font-semibold text-white text-sm">Message Recorded</div>
              <p className="text-xs text-[#A7B9A8]">
                Thank you for reaching out. We have logged your query and our team will respond within 2 municipal working days.
              </p>
              <button
                type="button"
                onClick={() => setSubmitted(false)}
                className="text-xs font-mono text-[#D7FF35] hover:underline pt-2"
              >
                Send another message
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              <div className="space-y-1">
                <label htmlFor="contact-name" className="block text-[#A7B9A8] font-medium">Your Name</label>
                <input
                  id="contact-name"
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#041B15] border border-white/15 text-white placeholder-[#A7B9A8] focus:outline-none focus:border-[#D7FF35]"
                  placeholder="e.g. Ramesh Kumar"
                />
              </div>

              <div className="space-y-1">
                <label htmlFor="contact-email" className="block text-[#A7B9A8] font-medium">Email Address</label>
                <input
                  id="contact-email"
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#041B15] border border-white/15 text-white placeholder-[#A7B9A8] focus:outline-none focus:border-[#D7FF35]"
                  placeholder="ramesh@example.com"
                />
              </div>

              <div className="space-y-1">
                <label htmlFor="contact-subject" className="block text-[#A7B9A8] font-medium">Subject Category</label>
                <select
                  id="contact-subject"
                  value={formData.subject}
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#041B15] border border-white/15 text-white focus:outline-none focus:border-[#D7FF35]"
                >
                  <option value="General Inquiry">General Inquiry</option>
                  <option value="Weighment Dispute">Weighment Dispute</option>
                  <option value="QR Code Replacement">QR Code Replacement</option>
                  <option value="DPDP Privacy Request">DPDP Privacy Request</option>
                </select>
              </div>

              <div className="space-y-1">
                <label htmlFor="contact-message" className="block text-[#A7B9A8] font-medium">Message Details</label>
                <textarea
                  id="contact-message"
                  required
                  rows={4}
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#041B15] border border-white/15 text-white placeholder-[#A7B9A8] focus:outline-none focus:border-[#D7FF35]"
                  placeholder="Describe your inquiry or grievance clearly..."
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 rounded-xl bg-[#D7FF35] hover:bg-[#C4F020] text-[#041B15] font-mono text-xs font-bold uppercase tracking-wider transition shadow-glow-lime flex items-center justify-center gap-2"
              >
                <Send className="w-4 h-4" />
                <span>Submit Inquiry</span>
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
