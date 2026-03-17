import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ShoppingBag,
  GlassWater,
  Droplets,
  IceCream,
  Gift,
  Sparkles,
  X,
  Plus,
  Minus,
  ArrowRight,
  CheckCircle,
  ArrowLeft,
  Smartphone,
  ReceiptText,
  Printer
} from 'lucide-react';
import { getPaymentById, requestPayment } from '../lib/api';

const UPI_ID = 'd.afsar@axl';
const STALL_NAME = 'Drinks N Sweets';
const PENDING_REQUEST_STORAGE_KEY = 'stall_pending_request_id';

const PRODUCTS = [
  {
    id: 1,
    name: 'Mojitos',
    price: 39,
    category: 'Drinks',
    description: 'Classic refreshing mint and lime cooler to beat the heat.',
    icon: <GlassWater className="w-8 h-8 text-green-500" />,
    color: 'bg-green-100',
    border: 'border-green-200'
  },
  {
    id: 2,
    name: 'Nannari',
    price: 19,
    category: 'Drinks',
    description: 'Traditional cooling herbal root extract syrup.',
    icon: <Droplets className="w-8 h-8 text-amber-600" />,
    color: 'bg-amber-100',
    border: 'border-amber-200'
  },
  {
    id: 3,
    name: 'Sweet n salt',
    price: 19,
    category: 'Drinks',
    description: 'Balanced thirst-quencher with a hint of fresh lemon.',
    icon: <GlassWater className="w-8 h-8 text-blue-500" />,
    color: 'bg-blue-100',
    border: 'border-blue-200'
  },
  {
    id: 4,
    name: 'StrawBerry',
    price: 19,
    category: 'Drinks',
    description: 'Sweet, fruity, and vibrant strawberry refreshment.',
    icon: <GlassWater className="w-8 h-8 text-pink-500" />,
    color: 'bg-pink-100',
    border: 'border-pink-200'
  },
  {
    id: 5,
    name: 'Apricot Delight',
    price: 79,
    category: 'Iced Blended',
    description: 'Our signature thick, creamy, chilled apricot special.',
    icon: <IceCream className="w-8 h-8 text-orange-500" />,
    color: 'bg-orange-100',
    border: 'border-orange-200'
  },
  {
    id: 6,
    name: 'Apricot Delight + Mojitos',
    price: 109,
    category: 'Combos',
    description: 'The ultimate combo. Save big with our best sellers together.',
    icon: <Gift className="w-8 h-8 text-purple-500" />,
    color: 'bg-purple-100',
    border: 'border-purple-200'
  }
];

function toSerializableItems(items) {
  return items.map((item) => ({
    id: item.id,
    name: item.name,
    price: item.price,
    quantity: item.quantity,
    category: item.category
  }));
}

export default function StallPage() {
  const [cart, setCart] = useState([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [checkoutStep, setCheckoutStep] = useState('cart');
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [nameError, setNameError] = useState(false);
  const [showPayConfirm, setShowPayConfirm] = useState(false);
  const [requestError, setRequestError] = useState('');
  const [isSubmittingRequest, setIsSubmittingRequest] = useState(false);
  const [currentRequestId, setCurrentRequestId] = useState('');
  const [orderId, setOrderId] = useState('');
  const [orderDate, setOrderDate] = useState('');
  const [cancelNote, setCancelNote] = useState('');
  const [submittedOrder, setSubmittedOrder] = useState(null);
  const [trackerRequestId, setTrackerRequestId] = useState('');
  const [trackerError, setTrackerError] = useState('');
  const [trackerLoading, setTrackerLoading] = useState(false);
  const [trackedPayment, setTrackedPayment] = useState(null);

  const cartTotal = cart.reduce((total, item) => total + item.price * item.quantity, 0);
  const cartItemCount = cart.reduce((count, item) => count + item.quantity, 0);

  const addToCart = (product) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.id === product.id);
      if (existing) {
        return prev.map((item) =>
          item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prev, { ...product, quantity: 1 }];
    });

    if (cart.length === 0) {
      setIsCartOpen(true);
    }
  };

  const removeFromCart = (productId) => {
    setCart((prev) => prev.filter((item) => item.id !== productId));
  };

  const updateQuantity = (productId, delta) => {
    setCart((prev) =>
      prev.map((item) => {
        if (item.id !== productId) {
          return item;
        }
        const nextQuantity = item.quantity + delta;
        return nextQuantity > 0 ? { ...item, quantity: nextQuantity } : item;
      })
    );
  };

  const handleCloseCart = () => {
    setIsCartOpen(false);
    setShowPayConfirm(false);

    setTimeout(() => {
      if (checkoutStep === 'success' || checkoutStep === 'cancelled') {
        setCart([]);
        setCustomerName('');
        setCustomerEmail('');
        setSubmittedOrder(null);
        setCurrentRequestId('');
        setOrderId('');
        setOrderDate('');
        setCancelNote('');
        try {
          localStorage.removeItem(PENDING_REQUEST_STORAGE_KEY);
        } catch {
          // Ignore storage failures.
        }
      }
      setCheckoutStep('cart');
      setNameError(false);
      setRequestError('');
    }, 250);
  };

  const handlePlaceOrder = () => {
    if (!customerName.trim()) {
      setNameError(true);
      return;
    }
    setCheckoutStep('payment');
  };

  const handleSendPaymentForApproval = async () => {
    if (!customerName.trim() || cart.length === 0) {
      return;
    }

    setIsSubmittingRequest(true);
    setRequestError('');

    const snapshot = {
      customerName: customerName.trim(),
      customerEmail: customerEmail.trim(),
      items: cart.map((item) => ({ ...item })),
      total: cartTotal
    };

    try {
      const result = await requestPayment({
        customerName: snapshot.customerName,
        customerEmail: snapshot.customerEmail,
        items: toSerializableItems(snapshot.items),
        total: snapshot.total
      });

      setSubmittedOrder(snapshot);
      setCurrentRequestId(result.requestId);
      try {
        localStorage.setItem(PENDING_REQUEST_STORAGE_KEY, result.requestId);
      } catch {
        // Ignore storage failures and continue normal flow.
      }
      setShowPayConfirm(false);
      setCheckoutStep('awaiting');
    } catch {
      setRequestError('Unable to submit payment request. Please try again.');
    } finally {
      setIsSubmittingRequest(false);
    }
  };

  useEffect(() => {
    if (checkoutStep !== 'awaiting' || !currentRequestId) {
      return;
    }

    const pollStatus = async () => {
      if (document.hidden) {
        return;
      }

      try {
        const payment = await getPaymentById(currentRequestId);
        if (payment.status === 'approved') {
          setOrderId(payment.orderId || '');
          setOrderDate(payment.orderDate || '');
          setCheckoutStep('success');
          try {
            localStorage.removeItem(PENDING_REQUEST_STORAGE_KEY);
          } catch {
            // Ignore storage failures.
          }
        } else if (payment.status === 'cancelled') {
          setCancelNote('Payment was not received. Please place a new order or contact the stall admin.');
          setCheckoutStep('cancelled');
          try {
            localStorage.removeItem(PENDING_REQUEST_STORAGE_KEY);
          } catch {
            // Ignore storage failures.
          }
        }
      } catch {
        // Keep retrying silently while user is waiting.
      }
    };

    pollStatus();
    const interval = setInterval(pollStatus, 10000);
    return () => clearInterval(interval);
  }, [checkoutStep, currentRequestId]);

  useEffect(() => {
    try {
      const savedRequestId = localStorage.getItem(PENDING_REQUEST_STORAGE_KEY);
      if (savedRequestId) {
        setTrackerRequestId(savedRequestId);
      }
    } catch {
      // Ignore storage failures.
    }
  }, []);

  const handleTrackInvoice = async () => {
    const normalizedRequestId = trackerRequestId.trim().toUpperCase();

    if (!normalizedRequestId) {
      setTrackerError('Enter your request ID to track invoice status.');
      setTrackedPayment(null);
      return;
    }

    setTrackerLoading(true);
    setTrackerError('');

    try {
      const payment = await getPaymentById(normalizedRequestId);
      setTrackedPayment(payment);

      if (payment.status === 'approved') {
        try {
          localStorage.removeItem(PENDING_REQUEST_STORAGE_KEY);
        } catch {
          // Ignore storage failures.
        }
      }
    } catch {
      setTrackedPayment(null);
      setTrackerError('No request found. Check your request ID and try again.');
    } finally {
      setTrackerLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const getUpiUrl = (amount) => {
    return `upi://pay?pa=${UPI_ID}&pn=${encodeURIComponent(STALL_NAME)}&am=${amount}&cu=INR`;
  };

  const getQrUrl = (amount) => {
    const upiString = getUpiUrl(amount);
    return `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(upiString)}&margin=10`;
  };

  const displayOrder = submittedOrder || {
    customerName,
    items: cart,
    total: cartTotal
  };

  return (
    <div className="min-h-screen bg-gray-50 font-sans selection:bg-pink-300 selection:text-pink-900">
      <style>
        {`
          @media print {
            body * { visibility: hidden; }
            #printable-invoice, #printable-invoice * { visibility: visible; }
            #printable-invoice { position: absolute; left: 0; top: 0; width: 100%; }
            .no-print { display: none !important; }
          }
        `}
      </style>

      <nav className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-gray-100 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-2">
              <IceCream className="text-orange-500 w-6 h-6" />
              <span className="text-xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-orange-500 to-pink-500">
                Drinks N Sweets
              </span>
            </div>

            <div className="flex items-center">
              <button
                onClick={() => setIsCartOpen(true)}
                className="relative p-2 text-gray-600 hover:text-orange-600 transition-colors rounded-full hover:bg-orange-50"
              >
                <ShoppingBag className="w-6 h-6" />
                {cartItemCount > 0 && (
                  <span className="absolute top-0 right-0 -mt-1 -mr-1 flex h-5 w-5 items-center justify-center rounded-full bg-gradient-to-tr from-pink-500 to-red-500 text-[10px] font-bold text-white shadow-sm">
                    {cartItemCount}
                  </span>
                )}
              </button>

              <Link
                to="/admin"
                className="ml-2 px-3 py-2 rounded-full border border-gray-200 text-xs font-bold text-gray-700 hover:bg-gray-100 transition-colors no-print"
              >
                Admin
              </Link>
            </div>
          </div>
        </div>
      </nav>

      <div className="relative overflow-hidden bg-white">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-orange-200 rounded-full mix-blend-multiply blur-3xl opacity-40 animate-blob"></div>
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-yellow-200 rounded-full mix-blend-multiply blur-3xl opacity-40 animate-blob animation-delay-2000"></div>
        <div className="absolute -bottom-8 left-1/3 w-96 h-96 bg-pink-200 rounded-full mix-blend-multiply blur-3xl opacity-40 animate-blob animation-delay-4000"></div>

        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 pt-20 pb-24 text-center">
          <span className="inline-block py-1 px-3 rounded-full bg-orange-100 text-orange-700 text-sm font-semibold tracking-wide mb-4 border border-orange-200">
            Farewell Party Specials
          </span>
          <h1 className="text-5xl md:text-7xl font-extrabold text-gray-900 tracking-tight mb-6">
            Refresh & Recharge <br />
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-orange-500 via-pink-500 to-purple-500">at Our Stall.</span>
          </h1>
          <p className="mt-4 text-xl text-gray-600 max-w-2xl mx-auto mb-10">
            From classic Mojitos to our signature Apricot Delight. Grab a cool drink, snag a sweet combo, and enjoy the farewell party.
          </p>
          <a href="#menu" className="inline-flex px-8 py-4 bg-gray-900 text-white rounded-full font-bold text-lg hover:bg-gray-800 transition-all hover:scale-105 shadow-xl hover:shadow-2xl items-center gap-2">
            View Menu <ArrowRight className="w-5 h-5" />
          </a>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="bg-white rounded-3xl border border-gray-200 shadow-sm p-6">
          <h2 className="text-2xl font-black text-gray-900">Track Your Invoice</h2>
          <p className="text-gray-600 mt-1 text-sm">Closed the payment window? Enter your request ID and check invoice status anytime.</p>

          <div className="mt-4 flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              value={trackerRequestId}
              onChange={(event) => {
                setTrackerRequestId(event.target.value);
                setTrackerError('');
              }}
              placeholder="Example: PAY-123456"
              className="w-full sm:flex-1 px-4 py-3 rounded-xl border border-gray-200 bg-white shadow-sm focus:ring-2 focus:ring-orange-500 focus:outline-none"
            />
            <button
              onClick={handleTrackInvoice}
              disabled={trackerLoading}
              className="sm:w-auto rounded-full bg-gray-900 px-6 py-3 text-sm font-bold text-white hover:bg-gray-800 transition-colors disabled:opacity-60"
            >
              {trackerLoading ? 'Checking...' : 'Track Invoice'}
            </button>
          </div>

          {trackerError && <p className="text-red-500 text-xs font-medium mt-3">{trackerError}</p>}

          {trackedPayment && (
            <div className="mt-5 rounded-2xl border border-gray-200 bg-gray-50 p-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <p className="text-sm text-gray-700">
                  <span className="font-bold">Request:</span> {trackedPayment.id}
                </p>
                <p className={`text-xs font-bold px-3 py-1 rounded-full w-fit ${
                  trackedPayment.status === 'approved'
                    ? 'bg-green-100 text-green-700'
                    : trackedPayment.status === 'cancelled'
                      ? 'bg-rose-100 text-rose-700'
                    : 'bg-amber-100 text-amber-700'
                }`}>
                  {trackedPayment.status === 'approved'
                    ? 'Approved'
                    : trackedPayment.status === 'cancelled'
                      ? 'Payment Not Received'
                      : 'Pending Approval'}
                </p>
              </div>
              <p className="mt-2 text-sm text-gray-700">
                <span className="font-bold">Customer:</span> {trackedPayment.customerName}
              </p>
              <p className="mt-1 text-sm text-gray-700">
                <span className="font-bold">Total:</span> Rs.{Number(trackedPayment.total).toFixed(2)}
              </p>
              {trackedPayment.status === 'approved' && (
                <p className="mt-1 text-sm text-gray-700">
                  <span className="font-bold">Invoice:</span> {trackedPayment.orderId} ({trackedPayment.orderDate})
                </p>
              )}
              {trackedPayment.status === 'cancelled' && (
                <p className="mt-1 text-sm text-rose-700 font-medium">
                  Payment was not received. Please place a new order.
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      <div id="menu" className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <h2 className="text-3xl font-bold text-gray-900">Our Menu</h2>
        <p className="text-gray-500 mt-2 mb-10">Iced, blended, and perfectly sweet.</p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {PRODUCTS.map((product) => (
            <div
              key={product.id}
              className="group relative bg-white rounded-3xl p-6 shadow-sm border border-gray-100 hover:shadow-xl transition-all duration-300 hover:-translate-y-1 overflow-hidden flex flex-col"
            >
              <div className={`absolute top-0 right-0 w-32 h-32 ${product.color} rounded-bl-full -z-10 opacity-50 group-hover:scale-110 transition-transform duration-500`}></div>
              <div className="flex justify-between items-start mb-6">
                <div className={`w-16 h-16 rounded-2xl ${product.color} flex items-center justify-center border ${product.border} shadow-inner`}>
                  {product.icon}
                </div>
                <span className="text-xs font-bold uppercase tracking-wider text-gray-500 bg-gray-100 px-3 py-1 rounded-full">{product.category}</span>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">{product.name}</h3>
              <p className="text-gray-500 text-sm mb-6 grow">{product.description}</p>
              <div className="flex items-center justify-between mt-auto">
                <span className="text-2xl font-black text-gray-900">Rs.{product.price}</span>
                <button
                  onClick={() => addToCart(product)}
                  className="bg-gray-900 text-white px-5 py-2.5 rounded-full font-semibold hover:bg-orange-500 transition-colors active:scale-95 flex items-center gap-2 shadow-md"
                >
                  <Plus className="w-4 h-4" /> Add
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <footer className="bg-gray-900 text-white py-12 border-t border-gray-800">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2">
            <Sparkles className="text-orange-400 w-6 h-6" />
            <span className="text-xl font-bold">Drinks N Sweets</span>
          </div>
          <p className="text-gray-400 text-sm text-center md:text-left">
            Farewell Party Food Stall.<br />
            Come grab a drink and say your goodbyes.
          </p>
        </div>
      </footer>

      {isCartOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm transition-opacity no-print" onClick={handleCloseCart}></div>

          <div className="fixed inset-y-0 right-0 flex max-w-full pl-10 w-full sm:w-auto">
            <div className="w-screen max-w-md transform transition ease-in-out duration-500 sm:duration-700">
              <div className="flex h-full flex-col bg-white shadow-2xl relative overflow-hidden">
                {checkoutStep === 'cart' && (
                  <>
                    <div className="flex items-start justify-between px-6 py-6 border-b border-gray-100">
                      <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                        <ShoppingBag className="w-6 h-6 text-orange-500" />
                        Your Order
                      </h2>
                      <button onClick={handleCloseCart} className="relative p-2 text-gray-400 hover:text-gray-500 hover:bg-gray-100 rounded-full transition-colors">
                        <X className="w-6 h-6" />
                      </button>
                    </div>

                    <div className="flex-1 overflow-y-auto px-6 py-6 sm:px-6">
                      {cart.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-center space-y-4">
                          <div className="w-24 h-24 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                            <GlassWater className="w-10 h-10 text-gray-300" />
                          </div>
                          <p className="text-xl font-semibold text-gray-900">Your cup is empty</p>
                          <p className="text-gray-500">Add some drinks to your order.</p>
                          <button onClick={handleCloseCart} className="mt-4 px-6 py-3 bg-orange-50 text-orange-700 font-semibold rounded-full hover:bg-orange-100 transition-colors">
                            See Menu
                          </button>
                        </div>
                      ) : (
                        <ul className="space-y-6">
                          {cart.map((item) => (
                            <li key={item.id} className="flex py-2">
                              <div className={`h-20 w-20 shrink-0 overflow-hidden rounded-2xl ${item.color} border ${item.border} flex items-center justify-center`}>
                                {item.icon}
                              </div>

                              <div className="ml-4 flex flex-1 flex-col justify-center">
                                <div className="flex justify-between text-base font-bold text-gray-900">
                                  <h3>{item.name}</h3>
                                  <p className="ml-4">Rs.{(item.price * item.quantity).toFixed(2)}</p>
                                </div>
                                <p className="text-sm text-gray-500">{item.category}</p>
                                <div className="flex flex-1 items-end justify-between mt-2">
                                  <div className="flex items-center border border-gray-200 rounded-full overflow-hidden">
                                    <button onClick={() => updateQuantity(item.id, -1)} className="px-3 py-1 bg-gray-50 hover:bg-gray-100 text-gray-600 transition-colors">
                                      <Minus className="w-3 h-3" />
                                    </button>
                                    <span className="px-3 py-1 text-sm font-semibold text-gray-900 w-8 text-center bg-white">{item.quantity}</span>
                                    <button onClick={() => updateQuantity(item.id, 1)} className="px-3 py-1 bg-gray-50 hover:bg-gray-100 text-gray-600 transition-colors">
                                      <Plus className="w-3 h-3" />
                                    </button>
                                  </div>
                                  <button type="button" onClick={() => removeFromCart(item.id)} className="font-medium text-red-500 hover:text-red-600 text-sm hover:underline">
                                    Remove
                                  </button>
                                </div>
                              </div>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>

                    {cart.length > 0 && (
                      <div className="border-t border-gray-100 px-6 py-6 sm:px-6 bg-gray-50 flex flex-col gap-4">
                        <div>
                          <label htmlFor="customerName" className="block text-sm font-bold text-gray-700 mb-1">
                            Who is this order for? <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            id="customerName"
                            value={customerName}
                            onChange={(event) => {
                              setCustomerName(event.target.value);
                              setNameError(false);
                            }}
                            placeholder="Enter your name"
                            className={`w-full px-4 py-3 rounded-xl border bg-white shadow-sm focus:ring-2 focus:ring-orange-500 focus:outline-none transition-colors ${
                              nameError ? 'border-red-500 focus:ring-red-500' : 'border-gray-200'
                            }`}
                          />
                          {nameError && <p className="text-red-500 text-xs mt-1 font-medium">Please enter your name to proceed.</p>}
                        </div>

                        <div>
                          <label htmlFor="customerEmail" className="block text-sm font-bold text-gray-700 mb-1">
                            Email (to receive invoice) <span className="text-gray-400 text-xs font-normal">(optional)</span>
                          </label>
                          <input
                            type="email"
                            id="customerEmail"
                            value={customerEmail}
                            onChange={(event) => {
                              setCustomerEmail(event.target.value);
                            }}
                            placeholder="your@email.com"
                            className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white shadow-sm focus:ring-2 focus:ring-orange-500 focus:outline-none transition-colors"
                          />
                          <p className="text-gray-500 text-xs mt-1">We'll send your invoice here when your order is approved.</p>
                        </div>

                        <div className="flex justify-between text-lg font-bold text-gray-900 mt-2">
                          <p>Total to Pay</p>
                          <p>Rs.{cartTotal.toFixed(2)}</p>
                        </div>

                        <button onClick={handlePlaceOrder} className="w-full flex items-center justify-center gap-2 rounded-full bg-gray-900 px-6 py-4 text-base font-bold text-white shadow-xl hover:bg-orange-500 transition-all active:scale-[0.98]">
                          Proceed to Pay <ArrowRight className="w-5 h-5" />
                        </button>
                      </div>
                    )}
                  </>
                )}

                {checkoutStep === 'payment' && (
                  <div className="flex flex-col h-full">
                    <div className="flex items-center px-6 py-6 border-b border-gray-100">
                      <button onClick={() => setCheckoutStep('cart')} className="p-2 mr-2 text-gray-600 hover:bg-gray-100 rounded-full transition-colors">
                        <ArrowLeft className="w-6 h-6" />
                      </button>
                      <h2 className="text-2xl font-bold text-gray-900 flex-1">Payment</h2>
                      <button onClick={handleCloseCart} className="p-2 text-gray-400 hover:bg-gray-100 rounded-full transition-colors">
                        <X className="w-6 h-6" />
                      </button>
                    </div>

                    <div className="flex-1 overflow-y-auto px-6 py-8 flex flex-col items-center">
                      <div className="w-full bg-orange-50 rounded-2xl p-6 text-center border border-orange-100 mb-8">
                        <p className="text-orange-800 font-medium mb-1">Amount to Pay</p>
                        <h3 className="text-4xl font-black text-orange-600">Rs.{cartTotal.toFixed(2)}</h3>
                        <p className="text-sm text-orange-700 mt-2 font-medium bg-orange-200/50 inline-block px-3 py-1 rounded-full">Order for: {customerName}</p>
                      </div>

                      <div className="bg-white p-4 rounded-3xl shadow-lg border border-gray-100 mb-6">
                        <img src={getQrUrl(cartTotal)} alt="UPI QR Code" className="w-56 h-56 object-contain rounded-xl" />
                      </div>
                      <p className="text-gray-500 text-sm font-medium mb-8 text-center">
                        Scan with any UPI App <br /> (GPay, PhonePe, Paytm)
                      </p>

                      <div className="w-full space-y-4 mt-auto">
                        <a href={getUpiUrl(cartTotal)} className="w-full flex items-center justify-center gap-2 rounded-full border-2 border-gray-900 bg-white px-6 py-4 text-base font-bold text-gray-900 hover:bg-gray-50 transition-colors md:hidden">
                          <Smartphone className="w-5 h-5" /> Pay via UPI App
                        </a>
                        <button onClick={() => setShowPayConfirm(true)} className="w-full flex items-center justify-center gap-2 rounded-full bg-green-500 px-6 py-4 text-base font-bold text-white shadow-xl hover:bg-green-600 transition-all active:scale-[0.98]">
                          <CheckCircle className="w-5 h-5" /> I Have Paid
                        </button>
                      </div>
                    </div>

                    {showPayConfirm && (
                      <div className="absolute inset-0 z-10 flex items-center justify-center bg-gray-900/60 backdrop-blur-sm p-6">
                        <div className="bg-white rounded-3xl shadow-2xl p-6 w-full max-w-sm text-center">
                          <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <CheckCircle className="w-7 h-7 text-green-500" />
                          </div>
                          <h3 className="text-xl font-black text-gray-900 mb-2">Confirm Payment?</h3>
                          <p className="text-gray-500 text-sm mb-6">Send payment request to admin. Invoice is generated only after approval.</p>
                          {requestError && <p className="text-red-500 text-xs font-medium mb-4">{requestError}</p>}
                          <div className="flex gap-3">
                            <button onClick={() => setShowPayConfirm(false)} className="flex-1 py-3 rounded-full border-2 border-gray-200 text-gray-700 font-bold hover:bg-gray-50 transition-colors">
                              No, Go Back
                            </button>
                            <button onClick={handleSendPaymentForApproval} disabled={isSubmittingRequest} className="flex-1 py-3 rounded-full bg-green-500 text-white font-bold hover:bg-green-600 transition-colors shadow-lg disabled:opacity-60 disabled:cursor-not-allowed">
                              {isSubmittingRequest ? 'Sending...' : 'Send Request'}
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {checkoutStep === 'awaiting' && (
                  <div className="flex flex-col h-full">
                    <div className="flex items-center px-6 py-6 border-b border-gray-100">
                      <button onClick={() => setCheckoutStep('payment')} className="p-2 mr-2 text-gray-600 hover:bg-gray-100 rounded-full transition-colors">
                        <ArrowLeft className="w-6 h-6" />
                      </button>
                      <h2 className="text-2xl font-bold text-gray-900 flex-1">Awaiting Approval</h2>
                      <button onClick={handleCloseCart} className="p-2 text-gray-400 hover:bg-gray-100 rounded-full transition-colors">
                        <X className="w-6 h-6" />
                      </button>
                    </div>

                    <div className="flex-1 overflow-y-auto px-6 py-8 flex flex-col items-center justify-center text-center">
                      <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mb-5">
                        <ReceiptText className="w-8 h-8 text-amber-600" />
                      </div>
                      <h3 className="text-2xl font-black text-gray-900 mb-2">Payment Request Sent</h3>
                      <p className="text-gray-600 max-w-sm mb-4">Your payment is waiting for admin verification. Invoice will appear here immediately after approval.</p>
                      <p className="text-xs font-bold text-gray-500 bg-gray-100 rounded-full px-3 py-1">Request ID: {currentRequestId}</p>
                    </div>
                  </div>
                )}

                {checkoutStep === 'cancelled' && (
                  <div className="flex flex-col h-full">
                    <div className="flex items-center px-6 py-6 border-b border-gray-100">
                      <h2 className="text-2xl font-bold text-gray-900 flex-1">Order Cancelled</h2>
                      <button onClick={handleCloseCart} className="p-2 text-gray-400 hover:bg-gray-100 rounded-full transition-colors">
                        <X className="w-6 h-6" />
                      </button>
                    </div>

                    <div className="flex-1 overflow-y-auto px-6 py-8 flex flex-col items-center justify-center text-center">
                      <div className="w-16 h-16 bg-rose-100 rounded-full flex items-center justify-center mb-5">
                        <X className="w-8 h-8 text-rose-600" />
                      </div>
                      <h3 className="text-2xl font-black text-gray-900 mb-2">Payment Not Received</h3>
                      <p className="text-gray-600 max-w-sm mb-4">{cancelNote || 'This request was cancelled by admin.'}</p>
                      <p className="text-xs font-bold text-gray-500 bg-gray-100 rounded-full px-3 py-1 mb-5">Request ID: {currentRequestId}</p>
                      <button onClick={handleCloseCart} className="rounded-full bg-gray-900 px-6 py-3 text-sm font-bold text-white hover:bg-gray-800 transition-colors">
                        Start New Order
                      </button>
                    </div>
                  </div>
                )}

                {checkoutStep === 'success' && (
                  <div className="flex flex-col h-full bg-gray-100">
                    <div className="flex items-center justify-between px-6 py-4 bg-white border-b border-gray-200 no-print">
                      <h2 className="text-xl font-bold text-gray-900">Receipt</h2>
                      <div className="flex gap-2">
                        <button onClick={handlePrint} className="p-2 text-gray-600 hover:bg-gray-100 rounded-full transition-colors">
                          <Printer className="w-5 h-5" />
                        </button>
                        <button onClick={handleCloseCart} className="p-2 text-gray-400 hover:bg-gray-100 rounded-full transition-colors">
                          <X className="w-6 h-6" />
                        </button>
                      </div>
                    </div>

                    <div className="flex-1 overflow-y-auto p-6" id="printable-invoice">
                      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 relative overflow-hidden">
                        <div className="text-center mb-6">
                          <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                            <CheckCircle className="w-6 h-6 text-green-500" />
                          </div>
                          <h2 className="text-2xl font-black text-gray-900">Drinks N Sweets</h2>
                          <p className="text-sm text-gray-500">Farewell Stall Payment Receipt</p>
                        </div>

                        <div className="border-t border-b border-dashed border-gray-200 py-4 mb-4 space-y-2 text-sm text-gray-600">
                          <div className="flex justify-between">
                            <span className="font-medium">Customer:</span>
                            <span className="text-gray-900 font-bold">{displayOrder.customerName}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="font-medium">Order ID:</span>
                            <span className="text-gray-900 font-bold">{orderId}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="font-medium">Date & Time:</span>
                            <span className="text-gray-900">{orderDate}</span>
                          </div>
                        </div>

                        <div className="mb-4">
                          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Order Details</h3>
                          <ul className="space-y-3">
                            {displayOrder.items.map((item) => (
                              <li key={item.id} className="flex justify-between text-sm">
                                <div className="flex items-center gap-2">
                                  <span className="font-bold text-gray-900 w-5">{item.quantity}x</span>
                                  <span className="text-gray-700">{item.name}</span>
                                </div>
                                <span className="font-medium text-gray-900">Rs.{(item.price * item.quantity).toFixed(2)}</span>
                              </li>
                            ))}
                          </ul>
                        </div>

                        <div className="border-t border-gray-200 pt-4 mt-2">
                          <div className="flex justify-between items-end">
                            <span className="text-base font-bold text-gray-900">Total Paid</span>
                            <span className="text-2xl font-black text-green-600">Rs.{displayOrder.total.toFixed(2)}</span>
                          </div>
                          <p className="text-xs text-gray-500 text-right mt-1">Paid via UPI ({UPI_ID})</p>
                        </div>
                      </div>

                      <div className="text-center mt-6 space-y-2 no-print">
                        <p className="text-sm text-gray-500 font-medium flex items-center justify-center gap-1">
                          <ReceiptText className="w-4 h-4" /> Please show this receipt at the counter.
                        </p>
                      </div>
                    </div>

                    <div className="p-6 bg-white border-t border-gray-200 no-print">
                      <button onClick={handleCloseCart} className="w-full rounded-full bg-gray-900 px-6 py-4 text-base font-bold text-white shadow-lg hover:bg-gray-800 transition-all active:scale-[0.98]">
                        Start New Order
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
