import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Mail, AlertTriangle, CheckCircle, Phone } from 'lucide-react';

export default function ContactPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    message: ''
  });
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState(null);

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const phoneRegex = /^[0-9+\-\s()]{7,}$/;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value
    }));
    // Clear error for this field when user starts typing
    if (errors[name]) {
      setErrors((prev) => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!emailRegex.test(formData.email.trim())) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (!formData.phone.trim()) {
      newErrors.phone = 'Phone number is required';
    } else if (!phoneRegex.test(formData.phone.trim())) {
      newErrors.phone = 'Please enter a valid phone number';
    }

    if (!formData.message.trim()) {
      newErrors.message = 'Message is required';
    } else if (formData.message.trim().length < 10) {
      newErrors.message = 'Message must be at least 10 characters';
    }

    return newErrors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitStatus(null);

    const newErrors = validateForm();
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setIsSubmitting(true);
    setErrors({});

    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name.trim(),
          email: formData.email.trim(),
          phone: formData.phone.trim(),
          message: formData.message.trim()
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to submit message');
      }

      setSubmitStatus({ type: 'success', message: 'Thank you! We\'ve received your message and will get back to you soon.' });
      setFormData({ name: '', email: '', phone: '', message: '' });
    } catch (error) {
      setSubmitStatus({
        type: 'error',
        message: error instanceof Error ? error.message : 'Failed to submit message. Please try again.'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-linear-to-br from-orange-50 to-pink-50">
      <nav className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-gray-100 shadow-sm">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <h1 className="text-xl font-extrabold bg-clip-text text-transparent bg-linear-to-r from-orange-500 to-pink-500">
              Contact Us
            </h1>
            <Link
              to="/"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-gray-200 bg-white text-gray-700 font-semibold hover:bg-gray-50 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" /> Back to Stall
            </Link>
          </div>
        </div>
      </nav>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Contact Information */}
          <div className="space-y-8">
            <div>
              <h2 className="text-3xl font-black text-slate-900 mb-4">Get in Touch</h2>
              <p className="text-slate-600 leading-relaxed">
                Have questions about our products or services? We'd love to hear from you. Fill out the form and we'll get back to you as soon as possible.
              </p>
            </div>

            <div className="space-y-6">
              <div className="flex gap-4">
                <div className="shrink-0">
                  <Mail className="w-6 h-6 text-orange-500" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 mb-1">Email</h3>
                  <p className="text-slate-600">Contact Afsar for any questions</p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="shrink-0">
                  <Phone className="w-6 h-6 text-orange-500" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 mb-1">Phone</h3>
                  <p className="text-slate-600">
                    Afsar - <a href="tel:8185057629" className="font-semibold text-orange-700 hover:text-orange-800">8185057629</a>
                  </p>
                </div>
              </div>

              <div className="bg-linear-to-br from-orange-100 to-pink-100 rounded-2xl p-6 border border-orange-200">
                <p className="text-slate-700">
                  <span className="font-bold">Hours:</span> Available daily for inquiries
                </p>
                <p className="text-slate-600 text-sm mt-2">
                  Contact us anytime and we'll respond at your earliest convenience.
                </p>
              </div>
            </div>
          </div>

          {/* Contact Form */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Name Field */}
              <div>
                <label htmlFor="name" className="block text-sm font-bold text-slate-900 mb-2">
                  Name
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="Your name"
                  className={`w-full px-4 py-3 rounded-lg border-2 transition-colors ${
                    errors.name
                      ? 'border-red-300 bg-red-50 focus:outline-none focus:border-red-500'
                      : 'border-gray-200 bg-gray-50 focus:outline-none focus:border-orange-500'
                  }`}
                  disabled={isSubmitting}
                />
                {errors.name && <p className="text-red-600 text-sm mt-1">{errors.name}</p>}
              </div>

              {/* Email Field */}
              <div>
                <label htmlFor="email" className="block text-sm font-bold text-slate-900 mb-2">
                  Email
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="your@email.com"
                  className={`w-full px-4 py-3 rounded-lg border-2 transition-colors ${
                    errors.email
                      ? 'border-red-300 bg-red-50 focus:outline-none focus:border-red-500'
                      : 'border-gray-200 bg-gray-50 focus:outline-none focus:border-orange-500'
                  }`}
                  disabled={isSubmitting}
                />
                {errors.email && <p className="text-red-600 text-sm mt-1">{errors.email}</p>}
              </div>

              {/* Phone Field */}
              <div>
                <label htmlFor="phone" className="block text-sm font-bold text-slate-900 mb-2">
                  Phone Number
                </label>
                <input
                  type="tel"
                  id="phone"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="+91 12345 67890"
                  className={`w-full px-4 py-3 rounded-lg border-2 transition-colors ${
                    errors.phone
                      ? 'border-red-300 bg-red-50 focus:outline-none focus:border-red-500'
                      : 'border-gray-200 bg-gray-50 focus:outline-none focus:border-orange-500'
                  }`}
                  disabled={isSubmitting}
                />
                {errors.phone && <p className="text-red-600 text-sm mt-1">{errors.phone}</p>}
              </div>

              {/* Message Field */}
              <div>
                <label htmlFor="message" className="block text-sm font-bold text-slate-900 mb-2">
                  Message
                </label>
                <textarea
                  id="message"
                  name="message"
                  value={formData.message}
                  onChange={handleChange}
                  placeholder="Write your message here..."
                  rows={5}
                  className={`w-full px-4 py-3 rounded-lg border-2 transition-colors resize-none ${
                    errors.message
                      ? 'border-red-300 bg-red-50 focus:outline-none focus:border-red-500'
                      : 'border-gray-200 bg-gray-50 focus:outline-none focus:border-orange-500'
                  }`}
                  disabled={isSubmitting}
                />
                {errors.message && <p className="text-red-600 text-sm mt-1">{errors.message}</p>}
              </div>

              {/* Status Messages */}
              {submitStatus && (
                <div
                  className={`flex gap-3 p-4 rounded-lg ${
                    submitStatus.type === 'success'
                      ? 'bg-green-50 border border-green-200'
                      : 'bg-red-50 border border-red-200'
                  }`}
                >
                  {submitStatus.type === 'success' ? (
                    <CheckCircle className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
                  ) : (
                    <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                  )}
                  <p
                    className={`text-sm ${
                      submitStatus.type === 'success' ? 'text-green-700' : 'text-red-700'
                    }`}
                  >
                    {submitStatus.message}
                  </p>
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full px-6 py-3 bg-linear-to-r from-orange-500 to-pink-500 text-white font-bold rounded-lg hover:shadow-lg transition-shadow disabled:opacity-75 disabled:cursor-not-allowed"
              >
                {isSubmitting ? 'Sending...' : 'Send Message'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
