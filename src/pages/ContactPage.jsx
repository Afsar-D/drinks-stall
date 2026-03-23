import { Link } from 'react-router-dom';
import { ArrowLeft, Phone } from 'lucide-react';

export default function ContactPage() {
  const CONTACT_NUMBERS = ['8185057629', '7075722377', '9441919465'];

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

      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-12 text-center">
          <div className="mb-8">
            <div className="w-20 h-20 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Phone className="w-10 h-10 text-orange-600" />
            </div>
            
            <h2 className="text-4xl font-black text-slate-900 mb-4">Get in Touch</h2>
            <p className="text-slate-600 text-lg max-w-2xl mx-auto mb-8">
              Have questions about our menu, orders, or anything else? Reach out directly!
            </p>
          </div>

          <div className="bg-linear-to-r from-orange-50 to-pink-50 rounded-2xl p-12 border border-orange-200 mb-8">
            <p className="text-slate-600 font-semibold mb-4">Call or Text</p>
            <div className="flex flex-col gap-4 items-center">
              {CONTACT_NUMBERS.map((number) => (
                <a
                  key={number}
                  href={`tel:${number}`}
                  className="inline-flex items-center justify-center gap-3 px-8 py-4 bg-linear-to-r from-orange-500 to-pink-500 text-white rounded-full font-bold text-xl hover:shadow-lg transition-shadow w-full max-w-sm"
                >
                  <Phone className="w-6 h-6" />
                  {number}
                </a>
              ))}
            </div>
          </div>

          <div className="space-y-4 text-slate-600">
            <p className="flex items-center justify-center gap-2">
              {/* <span className="font-semibold">Afsar</span> - Available daily for inquiries */}
            </p>
            <p className="text-sm">
              Call to place orders, ask questions, or for any special requests
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
