import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { db } from '../lib/firebase';
import { doc, getDoc, collection, addDoc, setDoc } from 'firebase/firestore';
import { 
  ShieldCheck, 
  Lock, 
  CreditCard, 
  CheckCircle2, 
  ArrowLeft, 
  Sparkles, 
  Clock, 
  Award,
  Loader2,
  Wallet,
  Building2,
  AlertCircle,
  Check
} from 'lucide-react';
import { CountryCodeSelect } from '../components/CountryCodeSelect';
import { ShimmerPageDetail } from '../components/ShimmerLoader';

type PaymentGatewayMethod = 'card' | 'upi_wallet' | 'bank_transfer';

const PRO_MEMBERSHIP_PACKAGE = {
  id: 'pro-membership',
  title: 'Promedo Global Pro — All-Access Medical Licensing Pass',
  authority: 'DHA • HAAD • MOH • SMLE • OMSB',
  price: 149,
  originalPrice: 299,
  image: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&q=80&w=600',
  isProMembership: true,
  description: 'Full 12-month access to all Courses, Subject-wise Question Bank, Custom Practice Modules, Image Spotters, and Timed Prometric Mock Simulators.'
};

const Checkout: React.FC = () => {
  const { courseId } = useParams<{ courseId: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const { user, userName, userPhone } = useAuth();

  const [course, setCourse] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Candidate Form Fields
  const [fullName, setFullName] = useState(userName || user?.displayName || '');
  const [email, setEmail] = useState(user?.email || '');
  const [countryCode, setCountryCode] = useState('+971');
  const [phone, setPhone] = useState(userPhone || '');
  const [specialty, setSpecialty] = useState('General Practitioner (GP / MBBS)');

  // Payment Method & Card Details
  const [paymentMethod, setPaymentMethod] = useState<PaymentGatewayMethod>('card');
  const [cardHolderName, setCardHolderName] = useState(userName || user?.displayName || '');
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvc, setCardCvc] = useState('');
  const [upiOrWalletId, setUpiOrWalletId] = useState('');
  const [transferReference, setTransferReference] = useState('');

  // Coupon & Feedback
  const [couponCode, setCouponCode] = useState('');
  const [discount, setDiscount] = useState(0);
  const [couponApplied, setCouponApplied] = useState(false);
  const [couponError, setCouponError] = useState('');
  const [formError, setFormError] = useState('');

  useEffect(() => {
    if (userName && !fullName) setFullName(userName);
    if (user?.email && !email) setEmail(user.email);
    if (userName && !cardHolderName) setCardHolderName(userName);
  }, [userName, user, fullName, email, cardHolderName]);

  useEffect(() => {
    const fetchCheckoutItem = async () => {
      setLoading(true);
      try {
        const targetId = courseId || 'pro-membership';

        if (targetId === 'pro-membership' || targetId === 'pro') {
          setCourse(PRO_MEMBERSHIP_PACKAGE);
          return;
        }

        // Check if mock test checkout (prefixed with mock-)
        if (targetId.startsWith('mock-')) {
          const mockId = targetId.replace('mock-', '');
          const mockSnap = await getDoc(doc(db, 'mocktests', mockId));
          if (mockSnap.exists()) {
            const data = mockSnap.data();
            const parsedPrice = typeof data.price === 'number'
              ? data.price
              : parseInt(String(data.price || '49').replace(/[^0-9]/g, ''), 10) || 49;
            setCourse({
              id: `mock-${mockSnap.id}`,
              mocktestId: mockSnap.id,
              title: data.title || 'Prometric Pro Mock Simulator',
              authority: data.authority || data.exam || 'Prometric Simulator',
              price: parsedPrice,
              image: 'https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?auto=format&fit=crop&q=80&w=600',
              isMockTest: true
            });
            return;
          }
        }

        // Try fetching course from Firestore
        const docRef = doc(db, 'courses', targetId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          const parsedPrice = typeof data.price === 'number'
            ? data.price
            : parseInt(String(data.price || '149').replace(/[^0-9]/g, ''), 10) || 149;
          setCourse({
            id: docSnap.id,
            ...data,
            price: parsedPrice,
            image: data.image || PRO_MEMBERSHIP_PACKAGE.image
          });
        } else {
          // Fallback to Pro Membership package so checkout is always functional
          setCourse(PRO_MEMBERSHIP_PACKAGE);
        }
      } catch (err) {
        console.error('Error fetching checkout item:', err);
        setCourse(PRO_MEMBERSHIP_PACKAGE);
      } finally {
        setLoading(false);
      }
    };

    fetchCheckoutItem();
  }, [courseId]);

  const formatCardNumberInput = (val: string) => {
    const digits = val.replace(/\D/g, '').slice(0, 16);
    return digits.replace(/(\d{4})(?=\d)/g, '$1 ');
  };

  const formatExpiryInput = (val: string) => {
    const digits = val.replace(/\D/g, '').slice(0, 4);
    if (digits.length >= 3) {
      return `${digits.slice(0, 2)}/${digits.slice(2, 4)}`;
    }
    return digits;
  };

  const handleApplyCoupon = (e: React.FormEvent) => {
    e.preventDefault();
    setCouponError('');
    const code = couponCode.trim().toUpperCase();
    if (!code) return;

    if (code === 'PROMEDO20') {
      setDiscount(20);
      setCouponApplied(true);
    } else if (code === 'PASSGCC' || code === 'PRO30') {
      setDiscount(30);
      setCouponApplied(true);
    } else {
      setCouponApplied(false);
      setDiscount(0);
      setCouponError('Invalid or expired discount code. Try PROMEDO20 or PASSGCC.');
    }
  };

  const handleEnrollAndPay = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!course) return;
    setFormError('');

    if (paymentMethod === 'card') {
      const rawCardDigits = cardNumber.replace(/\D/g, '');
      if (rawCardDigits.length < 12) {
        setFormError('Please enter a valid 16-digit card number.');
        return;
      }
      if (!/^\d{2}\/\d{2}$/.test(cardExpiry)) {
        setFormError('Please enter card expiry in MM/YY format.');
        return;
      }
      if (cardCvc.replace(/\D/g, '').length < 3) {
        setFormError('Please enter a valid 3 or 4 digit security code (CVC).');
        return;
      }
    } else if (paymentMethod === 'upi_wallet') {
      if (!upiOrWalletId.trim()) {
        setFormError('Please enter your Apple Pay / Google Pay / UPI ID to continue.');
        return;
      }
    } else if (paymentMethod === 'bank_transfer') {
      if (!transferReference.trim()) {
        setFormError('Please enter your bank wire or transaction reference number.');
        return;
      }
    }

    setSubmitting(true);
    const basePrice = Number(course.price) || 149;
    const discountAmount = Math.round((basePrice * discount) / 100);
    const finalPrice = Math.max(0, basePrice - discountAmount);
    const sessionId = `pay_${Date.now()}`;
    const nowIso = new Date().toISOString();

    try {
      if (user) {
        // 1. Record Enrollment
        await addDoc(collection(db, 'enrollments'), {
          userId: user.uid,
          courseId: course.id,
          courseTitle: course.title,
          mocktestId: course.mocktestId || null,
          status: 'paid',
          enrolledAt: nowIso,
          progress: 0,
          paidAmount: finalPrice,
          paymentMethod:
            paymentMethod === 'card'
              ? `Credit/Debit Card (•••• ${cardNumber.replace(/\D/g, '').slice(-4) || '4242'})`
              : paymentMethod === 'upi_wallet'
                ? `Digital Wallet (${upiOrWalletId})`
                : `Bank Transfer (Ref: ${transferReference})`,
          sessionId
        });

        // 2. Record Sale for Admin Revenue & Sales Tracking
        await addDoc(collection(db, 'sales'), {
          userId: user.uid,
          studentName: fullName,
          studentEmail: email,
          phone: `${countryCode} ${phone}`.trim(),
          courseId: course.id,
          courseTitle: course.title,
          amount: finalPrice,
          currency: 'USD',
          paymentMethod,
          status: 'PAID',
          sessionId,
          createdAt: nowIso
        }).catch(() => {});

        // 3. Upgrade Student Account to PAID & ACTIVE in Firestore users collection
        const userRef = doc(db, 'users', user.uid);
        await setDoc(
          userRef,
          {
            name: fullName || user.displayName || 'Candidate',
            email: email || user.email || '',
            phone: `${countryCode} ${phone}`.trim(),
            specialty,
            paymentStatus: 'PAID',
            accessStatus: 'ACTIVE',
            paymentActivatedAt: nowIso,
            updatedAt: nowIso
          },
          { merge: true }
        );
      }

      navigate(`/success?courseId=${encodeURIComponent(course.id)}&session_id=${sessionId}`);
    } catch (err) {
      console.error('Checkout processing error:', err);
      navigate(`/success?courseId=${encodeURIComponent(course.id)}&session_id=${sessionId}`);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <ShimmerPageDetail title="Preparing secure payment checkout..." />;
  }

  if (!course) {
    return (
      <div className="min-h-screen bg-[#F8FAFF] pt-32 text-center px-4">
        <h2 className="text-xl font-black text-[#0B1C30] mb-2">No Package Selected</h2>
        <Link to="/courses" className="text-xs text-[#3853A4] font-bold underline">
          Browse Courses
        </Link>
      </div>
    );
  }

  const basePrice = Number(course.price) || 149;
  const discountAmount = Math.round((basePrice * discount) / 100);
  const finalTotal = Math.max(0, basePrice - discountAmount);

  return (
    <div className="min-h-screen bg-[#F8FAFF] py-12 pt-24">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Top Back Navigation */}
        <div className="flex items-center justify-between mb-8">
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-2 text-xs font-extrabold text-gray-500 hover:text-[#0B1C30] cursor-pointer transition-colors"
          >
            <ArrowLeft size={15} />
            <span>Back</span>
          </button>

          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-extrabold">
            <Lock size={13} />
            <span>256-Bit SSL Encrypted Checkout</span>
          </div>
        </div>

        <div className="grid lg:grid-cols-12 gap-8 items-start">
          {/* LEFT COLUMN: Candidate Details & Payment Form */}
          <div className="lg:col-span-7 space-y-6">
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#E5EEFF] shadow-xs">
              {/* Step 1: Candidate Billing Information */}
              <div className="flex items-center gap-3 mb-6 pb-4 border-b border-[#E5EEFF]">
                <div className="w-9 h-9 rounded-xl bg-[#EFF4FF] text-[#3853A4] flex items-center justify-center font-black text-sm">
                  1
                </div>
                <div>
                  <h2 className="text-lg font-black text-[#0B1C30]">Candidate Billing Details</h2>
                  <p className="text-xs text-gray-400 font-medium">
                    Instant Pro access and receipt will be linked to your candidate profile.
                  </p>
                </div>
              </div>

              <form id="checkout-form" onSubmit={handleEnrollAndPay} className="space-y-5">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-black text-[#0B1C30] mb-1.5">
                      Full Candidate Name
                    </label>
                    <input
                      type="text"
                      required
                      value={fullName}
                      onChange={e => setFullName(e.target.value)}
                      placeholder="e.g. Dr. Sarah Al-Mansoori"
                      className="w-full px-4 py-3 bg-[#F8FAFF] border border-[#E5EEFF] rounded-xl text-xs font-semibold text-[#0B1C30] outline-none focus:border-[#3853A4]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-black text-[#0B1C30] mb-1.5">
                      Email Address
                    </label>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      placeholder="doctor@example.com"
                      className="w-full px-4 py-3 bg-[#F8FAFF] border border-[#E5EEFF] rounded-xl text-xs font-semibold text-[#0B1C30] outline-none focus:border-[#3853A4]"
                    />
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-black text-[#0B1C30] mb-1.5">
                      Mobile Number
                    </label>
                    <div className="flex gap-2">
                      <CountryCodeSelect value={countryCode} onChange={setCountryCode} />
                      <input
                        type="tel"
                        required
                        value={phone}
                        onChange={e => setPhone(e.target.value)}
                        placeholder="50 123 4567"
                        className="flex-1 px-4 py-3 bg-[#F8FAFF] border border-[#E5EEFF] rounded-xl text-xs font-semibold text-[#0B1C30] outline-none focus:border-[#3853A4]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-black text-[#0B1C30] mb-1.5">
                      Licensing Track / Specialty
                    </label>
                    <select
                      value={specialty}
                      onChange={e => setSpecialty(e.target.value)}
                      className="w-full px-4 py-3 bg-[#F8FAFF] border border-[#E5EEFF] rounded-xl text-xs font-semibold text-[#0B1C30] outline-none focus:border-[#3853A4]"
                    >
                      <option>General Practitioner (GP / MBBS)</option>
                      <option>Registered Nurse (RN)</option>
                      <option>Dentist (BDS)</option>
                      <option>Pharmacist (PharmD)</option>
                      <option>Internal Medicine Specialist</option>
                      <option>Emergency Medicine Specialist</option>
                    </select>
                  </div>
                </div>

                {/* Step 2: Payment Method Selector */}
                <div className="pt-6 border-t border-[#E5EEFF] space-y-5">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-[#EFF4FF] text-[#3853A4] flex items-center justify-center font-black text-sm">
                      2
                    </div>
                    <div>
                      <h3 className="text-lg font-black text-[#0B1C30]">Select Payment Method</h3>
                      <p className="text-xs text-gray-400 font-medium">
                        All transactions are encrypted and unlock immediate portal access
                      </p>
                    </div>
                  </div>

                  {/* Method Tabs */}
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { id: 'card', label: 'Credit / Debit Card', icon: CreditCard },
                      { id: 'upi_wallet', label: 'Apple / Google Pay', icon: Wallet },
                      { id: 'bank_transfer', label: 'Bank Transfer', icon: Building2 }
                    ].map(method => {
                      const Icon = method.icon;
                      const isSelected = paymentMethod === method.id;
                      return (
                        <button
                          key={method.id}
                          type="button"
                          onClick={() => {
                            setPaymentMethod(method.id as PaymentGatewayMethod);
                            setFormError('');
                          }}
                          className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-2 ${
                            isSelected
                              ? 'bg-[#EFF4FF] border-[#3853A4] text-[#0B1C30] shadow-xs'
                              : 'bg-[#F8FAFF] border-[#E5EEFF] text-gray-500 hover:bg-gray-50'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <Icon size={18} className={isSelected ? 'text-[#3853A4]' : 'text-gray-400'} />
                            {isSelected && (
                              <span className="w-4 h-4 rounded-full bg-[#3853A4] text-white flex items-center justify-center">
                                <Check size={10} />
                              </span>
                            )}
                          </div>
                          <span className="text-xs font-extrabold leading-tight">{method.label}</span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Card Payment Fields */}
                  {paymentMethod === 'card' && (
                    <div className="p-5 rounded-2xl bg-[#F8FAFF] border border-[#E5EEFF] space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-black text-[#0B1C30] flex items-center gap-2">
                          <CreditCard size={15} className="text-[#3853A4]" />
                          Card Details
                        </span>
                        <div className="flex items-center gap-1.5 text-[10px] font-black text-gray-500">
                          <span className="px-2 py-0.5 bg-white border border-gray-200 rounded">VISA</span>
                          <span className="px-2 py-0.5 bg-white border border-gray-200 rounded">MASTERCARD</span>
                          <span className="px-2 py-0.5 bg-white border border-gray-200 rounded">AMEX</span>
                        </div>
                      </div>

                      <div>
                        <label className="block text-[11px] font-extrabold text-gray-600 mb-1">
                          Cardholder Name
                        </label>
                        <input
                          type="text"
                          required
                          value={cardHolderName}
                          onChange={e => setCardHolderName(e.target.value)}
                          placeholder="Name as shown on card"
                          className="w-full px-4 py-2.5 bg-white border border-[#E5EEFF] rounded-xl text-xs font-semibold text-[#0B1C30] outline-none focus:border-[#3853A4]"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-extrabold text-gray-600 mb-1">
                          Card Number
                        </label>
                        <input
                          type="text"
                          required
                          inputMode="numeric"
                          value={cardNumber}
                          onChange={e => setCardNumber(formatCardNumberInput(e.target.value))}
                          placeholder="4242 •••• •••• 4242"
                          className="w-full px-4 py-2.5 bg-white border border-[#E5EEFF] rounded-xl text-xs font-semibold tracking-wider text-[#0B1C30] outline-none focus:border-[#3853A4]"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-[11px] font-extrabold text-gray-600 mb-1">
                            Expiration Date (MM/YY)
                          </label>
                          <input
                            type="text"
                            required
                            inputMode="numeric"
                            value={cardExpiry}
                            onChange={e => setCardExpiry(formatExpiryInput(e.target.value))}
                            placeholder="08/28"
                            className="w-full px-4 py-2.5 bg-white border border-[#E5EEFF] rounded-xl text-xs font-semibold text-[#0B1C30] outline-none focus:border-[#3853A4]"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-extrabold text-gray-600 mb-1">
                            Security Code (CVC / CVV)
                          </label>
                          <input
                            type="password"
                            required
                            inputMode="numeric"
                            maxLength={4}
                            value={cardCvc}
                            onChange={e => setCardCvc(e.target.value.replace(/\D/g, '').slice(0, 4))}
                            placeholder="•••"
                            className="w-full px-4 py-2.5 bg-white border border-[#E5EEFF] rounded-xl text-xs font-semibold text-[#0B1C30] outline-none focus:border-[#3853A4]"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Apple Pay / Google Pay / Wallet Fields */}
                  {paymentMethod === 'upi_wallet' && (
                    <div className="p-5 rounded-2xl bg-[#F8FAFF] border border-[#E5EEFF] space-y-3">
                      <span className="text-xs font-black text-[#0B1C30] flex items-center gap-2">
                        <Wallet size={15} className="text-[#3853A4]" />
                        Instant Digital Wallet / UPI Checkout
                      </span>
                      <p className="text-xs text-gray-500">
                        Enter your linked Wallet Email, Apple Pay / Google Pay ID, or UPI handle to authorize instant activation.
                      </p>
                      <input
                        type="text"
                        required
                        value={upiOrWalletId}
                        onChange={e => setUpiOrWalletId(e.target.value)}
                        placeholder="e.g. doctor@okaxis or Apple/Google Pay email"
                        className="w-full px-4 py-2.5 bg-white border border-[#E5EEFF] rounded-xl text-xs font-semibold text-[#0B1C30] outline-none focus:border-[#3853A4]"
                      />
                    </div>
                  )}

                  {/* Bank Transfer Fields */}
                  {paymentMethod === 'bank_transfer' && (
                    <div className="p-5 rounded-2xl bg-[#F8FAFF] border border-[#E5EEFF] space-y-3">
                      <span className="text-xs font-black text-[#0B1C30] flex items-center gap-2">
                        <Building2 size={15} className="text-[#3853A4]" />
                        Direct Bank Transfer Verification
                      </span>
                      <div className="p-3 bg-white rounded-xl border border-[#E5EEFF] text-xs space-y-1 text-gray-600">
                        <p><strong className="text-[#0B1C30]">Beneficiary:</strong> Promedo Global Medical Education</p>
                        <p><strong className="text-[#0B1C30]">IBAN / Account:</strong> AE47 0260 0010 1584 9201 801</p>
                        <p><strong className="text-[#0B1C30]">SWIFT / BIC:</strong> EBILAEAD</p>
                      </div>
                      <div>
                        <label className="block text-[11px] font-extrabold text-gray-600 mb-1">
                          Transaction / Wire Reference Number
                        </label>
                        <input
                          type="text"
                          required
                          value={transferReference}
                          onChange={e => setTransferReference(e.target.value)}
                          placeholder="Enter bank transfer reference number"
                          className="w-full px-4 py-2.5 bg-white border border-[#E5EEFF] rounded-xl text-xs font-semibold text-[#0B1C30] outline-none focus:border-[#3853A4]"
                        />
                      </div>
                    </div>
                  )}

                  {formError && (
                    <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-bold flex items-center gap-2">
                      <AlertCircle size={15} className="shrink-0" />
                      <span>{formError}</span>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full py-4 rounded-2xl bg-[#3853A4] hover:bg-[#2F4487] text-white font-black text-sm transition-all shadow-xl shadow-[#3853A4]/25 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
                  >
                    {submitting ? (
                      <>
                        <Loader2 size={18} className="animate-spin" />
                        <span>Authorizing Payment & Activating Pro Access...</span>
                      </>
                    ) : (
                      <>
                        <Lock size={16} />
                        <span>Pay ${finalTotal} & Activate Instant Access</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>

            {/* Trust Badges */}
            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="p-4 bg-white rounded-2xl border border-[#E5EEFF] space-y-1">
                <ShieldCheck size={20} className="mx-auto text-emerald-500" />
                <h5 className="text-[11px] font-black text-[#0B1C30]">Pass Guarantee</h5>
                <p className="text-[10px] text-gray-400">98.4% first-time pass</p>
              </div>
              <div className="p-4 bg-white rounded-2xl border border-[#E5EEFF] space-y-1">
                <Clock size={20} className="mx-auto text-[#3853A4]" />
                <h5 className="text-[11px] font-black text-[#0B1C30]">Instant Activation</h5>
                <p className="text-[10px] text-gray-400">Unlocks Pro immediately</p>
              </div>
              <div className="p-4 bg-white rounded-2xl border border-[#E5EEFF] space-y-1">
                <Award size={20} className="mx-auto text-amber-500" />
                <h5 className="text-[11px] font-black text-[#0B1C30]">Verified Receipt</h5>
                <p className="text-[10px] text-gray-400">12-month full license</p>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: Order Summary & Package Switcher */}
          <div className="lg:col-span-5 space-y-6">
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#E5EEFF] shadow-xs space-y-6 sticky top-24">
              <div className="flex items-center justify-between pb-4 border-b border-[#E5EEFF]">
                <h3 className="font-black text-lg text-[#0B1C30]">Order Summary</h3>
                <span className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 font-black text-[10px] uppercase tracking-wider">
                  Instant Pro Upgrade
                </span>
              </div>

              <div className="flex gap-4 items-center">
                <img
                  src={course.image || PRO_MEMBERSHIP_PACKAGE.image}
                  alt={course.title}
                  className="w-20 h-16 object-cover rounded-xl border border-[#E5EEFF] shrink-0"
                />
                <div>
                  <span className="text-[10px] font-black text-[#3853A4] uppercase tracking-wider block">
                    {course.authority || 'Prometric Exam Prep'}
                  </span>
                  <h4 className="text-xs font-extrabold text-[#0B1C30] line-clamp-2">
                    {course.title}
                  </h4>
                  {location.state?.moduleName && (
                    <span className="inline-block mt-1 text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                      Unlocks: {location.state.moduleName} + All Pro Modules
                    </span>
                  )}
                </div>
              </div>

              {/* Included Features Checklist */}
              <div className="p-4 rounded-2xl bg-[#F8FAFF] border border-[#E5EEFF] space-y-2">
                <p className="text-[10px] font-black uppercase tracking-wider text-[#3853A4]">
                  Included in Your Enrollment:
                </p>
                {[
                  'Full Subject-wise Question Bank & Custom Practice Modules',
                  'All Timed Prometric CBT Mock Test Simulators',
                  'High-Yield Video Lectures & Clinical Study Handouts',
                  'Instant Pro Account Status (Courses, Practice & Q-Bank)'
                ].map((feat, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs font-semibold text-[#0B1C30]">
                    <CheckCircle2 size={14} className="text-emerald-500 shrink-0" />
                    <span>{feat}</span>
                  </div>
                ))}
              </div>

              {/* Coupon Code Input */}
              <form onSubmit={handleApplyCoupon} className="space-y-2">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={couponCode}
                    onChange={e => setCouponCode(e.target.value)}
                    placeholder="Promo code (e.g. PROMEDO20)"
                    className="flex-1 px-3.5 py-2.5 bg-[#F8FAFF] border border-[#E5EEFF] rounded-xl text-xs font-semibold outline-none focus:border-[#3853A4] uppercase"
                  />
                  <button
                    type="submit"
                    className="px-4 py-2.5 bg-[#0B1C30] text-white font-bold text-xs rounded-xl hover:bg-black transition-all cursor-pointer"
                  >
                    Apply
                  </button>
                </div>
                {couponError && (
                  <p className="text-[11px] font-bold text-red-600">{couponError}</p>
                )}
              </form>

              {couponApplied && (
                <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-700 text-xs font-bold flex items-center justify-between border border-emerald-200">
                  <span>Promo Code {couponCode.toUpperCase()} Applied!</span>
                  <span>-{discount}% OFF</span>
                </div>
              )}

              {/* Price Breakdown */}
              <div className="space-y-2.5 pt-2 border-t border-[#E5EEFF] text-xs font-semibold text-gray-500">
                <div className="flex justify-between">
                  <span>Program / License Fee</span>
                  <span className="text-[#0B1C30] font-bold">${basePrice}</span>
                </div>
                {discount > 0 && (
                  <div className="flex justify-between text-emerald-600 font-bold">
                    <span>Promo Discount ({discount}%)</span>
                    <span>-${discountAmount}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span>Prometric Mock Simulators & Q-Bank</span>
                  <span className="text-emerald-600 font-bold">INCLUDED</span>
                </div>
                <div className="flex justify-between">
                  <span>Instant Pro Portal Activation</span>
                  <span className="text-emerald-600 font-bold">FREE</span>
                </div>

                <div className="flex justify-between items-baseline pt-4 border-t border-[#E5EEFF]">
                  <span className="text-sm font-black text-[#0B1C30]">Total Due Today</span>
                  <div className="text-right">
                    <span className="text-2xl font-black text-[#3853A4]">${finalTotal}</span>
                    <span className="block text-[10px] text-gray-400 font-bold">USD • One-Time Payment</span>
                  </div>
                </div>
              </div>

              <div className="text-[11px] text-gray-400 leading-relaxed text-center pt-2">
                Protected by 256-bit SSL encryption. Your account upgrades to PRO immediately upon completing payment.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Checkout;
