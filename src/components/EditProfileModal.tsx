import React, { useState, useEffect } from 'react';
import { 
  X, 
  User, 
  GraduationCap, 
  MapPin, 
  Camera, 
  CheckCircle2, 
  AlertCircle, 
  Save, 
  Phone, 
  Mail, 
  Building2, 
  Calendar, 
  BookOpen, 
  Award,
  Upload,
  Trash2,
  Lock,
  Sparkles
} from 'lucide-react';
import { updateProfile } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { UserProfileData, saveUserProfile } from '../lib/userProfileService';

interface EditProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialProfile: Partial<UserProfileData>;
  onProfileUpdated: (updated: Partial<UserProfileData>) => void;
}

const QUALIFICATION_OPTIONS = [
  'MBBS (Bachelor of Medicine, Bachelor of Surgery)',
  'BDS (Bachelor of Dental Surgery)',
  'BSc Nursing / Post Basic Nursing',
  'Diploma in General Nursing & Midwifery (GNM)',
  'PharmD / Bachelor of Pharmacy (B.Pharm)',
  'Bachelor of Physiotherapy (BPT / DPT)',
  'Radiology & Medical Imaging Technology',
  'Medical Laboratory Technology (MLT / MLSc)',
  'MD / MS / DNB (Postgraduate Specialist)',
  'Other Healthcare Degree'
];

const YEAR_SEMESTER_OPTIONS = [
  '1st Year',
  '2nd Year',
  '3rd Year',
  '4th Year',
  '5th Year / Final Year',
  'Clinical Internship / Housemanship',
  'Postgraduate / Resident Doctor',
  'Graduated & Practicing Specialist',
  'Other'
];

const GCC_COUNTRIES = [
  'United Arab Emirates',
  'Saudi Arabia',
  'Oman',
  'Qatar',
  'Bahrain',
  'Kuwait',
  'India',
  'Pakistan',
  'Philippines',
  'Egypt',
  'Jordan',
  'United Kingdom',
  'United States',
  'Canada',
  'Other'
];

export const EditProfileModal: React.FC<EditProfileModalProps> = ({
  isOpen,
  onClose,
  initialProfile,
  onProfileUpdated
}) => {
  const [activeTab, setActiveTab] = useState<'personal' | 'academic' | 'location'>('personal');

  // Form Fields State
  const [name, setName] = useState(initialProfile.name || '');
  const [phone, setPhone] = useState(initialProfile.phone || '');
  const [dateOfBirth, setDateOfBirth] = useState(initialProfile.dateOfBirth || '');
  const [gender, setGender] = useState(initialProfile.gender || 'Male');
  const [photoURL, setPhotoURL] = useState(initialProfile.photoURL || '');

  // Academic Fields
  const [institution, setInstitution] = useState(initialProfile.institution || '');
  const [qualification, setQualification] = useState(initialProfile.qualification || QUALIFICATION_OPTIONS[0]);
  const [course, setCourse] = useState(initialProfile.course || 'Medicine & Surgery');
  const [currentYear, setCurrentYear] = useState(initialProfile.currentYear || YEAR_SEMESTER_OPTIONS[4]);
  const [studentId, setStudentId] = useState(initialProfile.studentId || '');
  const [examPreparingFor, setExamPreparingFor] = useState(initialProfile.examPreparingFor || 'DHA (Dubai Health Authority)');

  // Location Fields
  const [country, setCountry] = useState(initialProfile.country || 'United Arab Emirates');
  const [state, setState] = useState(initialProfile.state || 'Dubai');
  const [city, setCity] = useState(initialProfile.city || 'Dubai');
  const [address, setAddress] = useState(initialProfile.address || '');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Sync state whenever initialProfile changes or modal opens
  useEffect(() => {
    if (isOpen && initialProfile) {
      setName(initialProfile.name || '');
      setPhone(initialProfile.phone || '');
      setDateOfBirth(initialProfile.dateOfBirth || '');
      setGender(initialProfile.gender || 'Male');
      setPhotoURL(initialProfile.photoURL || '');

      setInstitution(initialProfile.institution || '');
      setQualification(initialProfile.qualification || QUALIFICATION_OPTIONS[0]);
      setCourse(initialProfile.course || 'Medicine & Surgery');
      setCurrentYear(initialProfile.currentYear || YEAR_SEMESTER_OPTIONS[4]);
      setStudentId(initialProfile.studentId || '');
      setExamPreparingFor(initialProfile.examPreparingFor || 'DHA (Dubai Health Authority)');

      setCountry(initialProfile.country || 'United Arab Emirates');
      setState(initialProfile.state || 'Dubai');
      setCity(initialProfile.city || 'Dubai');
      setAddress(initialProfile.address || '');
      setError('');
      setSuccess('');
    }
  }, [isOpen, initialProfile]);

  if (!isOpen) return null;

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      setError('Profile photo size must be less than 2MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      if (typeof event.target?.result === 'string') {
        setPhotoURL(event.target.result);
        setError('');
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    // Validations
    if (!name.trim()) {
      setError('Full Name is required.');
      setActiveTab('personal');
      return;
    }

    if (!phone.trim()) {
      setError('Phone number is required.');
      setActiveTab('personal');
      return;
    }

    if (!institution.trim()) {
      setError('Institution / School / College Name is required.');
      setActiveTab('academic');
      return;
    }

    if (!country.trim() || !state.trim() || !city.trim()) {
      setError('Country, State/Emirate, and City are required.');
      setActiveTab('location');
      return;
    }

    setLoading(true);

    try {
      const uid = auth.currentUser?.uid || initialProfile.uid;
      if (!uid) {
        throw new Error('User authentication session expired. Please log in again.');
      }

      // Update Firebase Auth display name and photoURL
      if (auth.currentUser) {
        try {
          await updateProfile(auth.currentUser, {
            displayName: name.trim(),
            photoURL: photoURL || ''
          });
        } catch (authErr) {
          console.warn("Could not update auth profile:", authErr);
        }
      }

      const updatedPayload: Partial<UserProfileData> = {
        name: name.trim(),
        phone: phone.trim(),
        dateOfBirth,
        gender,
        photoURL,
        institution: institution.trim(),
        qualification,
        course: course.trim(),
        currentYear,
        studentId: studentId.trim(),
        examPreparingFor,
        country: country.trim(),
        state: state.trim(),
        city: city.trim(),
        address: address.trim()
      };

      await saveUserProfile(uid, updatedPayload);

      setSuccess('Profile updated successfully!');
      onProfileUpdated(updatedPayload);

      setTimeout(() => {
        onClose();
      }, 1200);
    } catch (err: any) {
      console.error("Error updating profile:", err);
      setError(err.message || 'Failed to update profile details. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white rounded-3xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl border border-slate-100 overflow-hidden">
        
        {/* Modal Header */}
        <div className="px-6 py-5 bg-[#1B2234] text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#3853A4] text-white flex items-center justify-center font-bold shadow-sm">
              <User size={20} />
            </div>
            <div>
              <h2 className="text-lg font-black font-display tracking-tight text-white">Edit Student Profile</h2>
              <p className="text-xs text-blue-200/90 font-medium">Update your academic records, contact info, and personal details</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-xl transition-colors cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 px-6 pt-4 border-b border-slate-100 bg-slate-50/50 shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('personal')}
            className={`px-4 py-2.5 rounded-t-xl font-bold text-xs flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
              activeTab === 'personal'
                ? 'border-[#3853A4] text-[#3853A4] bg-white shadow-xs'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <User size={15} />
            <span>Personal Info</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('academic')}
            className={`px-4 py-2.5 rounded-t-xl font-bold text-xs flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
              activeTab === 'academic'
                ? 'border-[#3853A4] text-[#3853A4] bg-white shadow-xs'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <GraduationCap size={15} />
            <span>Academic Info</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('location')}
            className={`px-4 py-2.5 rounded-t-xl font-bold text-xs flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
              activeTab === 'location'
                ? 'border-[#3853A4] text-[#3853A4] bg-white shadow-xs'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <MapPin size={15} />
            <span>Location Info</span>
          </button>
        </div>

        {/* Modal Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-2xl text-xs font-bold flex items-center gap-2.5">
              <AlertCircle size={18} className="text-red-600 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl text-xs font-bold flex items-center gap-2.5">
              <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
              <span>{success}</span>
            </div>
          )}

          {/* TAB 1: PERSONAL INFORMATION */}
          {activeTab === 'personal' && (
            <div className="space-y-6">
              
              {/* Profile Photo Section */}
              <div className="flex flex-col sm:flex-row items-center gap-5 p-4 bg-blue-50/50 rounded-2xl border border-blue-100">
                <div className="relative group shrink-0">
                  <div className="w-20 h-20 rounded-2xl overflow-hidden bg-white border-2 border-[#3853A4]/20 shadow-sm flex items-center justify-center">
                    {photoURL ? (
                      <img src={photoURL} alt="Avatar" className="w-full h-full object-cover" />
                    ) : (
                      <User size={36} className="text-[#3853A4]" />
                    )}
                  </div>
                  <label 
                    htmlFor="edit-modal-photo-upload" 
                    className="absolute -bottom-1.5 -right-1.5 p-2 bg-[#3853A4] text-white rounded-lg shadow-md cursor-pointer hover:bg-[#2F4487] transition-all"
                  >
                    <Camera size={13} />
                    <input 
                      id="edit-modal-photo-upload" 
                      type="file" 
                      accept="image/*" 
                      onChange={handlePhotoUpload} 
                      className="hidden" 
                    />
                  </label>
                </div>

                <div className="space-y-1.5 text-center sm:text-left flex-1">
                  <h4 className="font-extrabold text-slate-800 text-xs uppercase tracking-wider">Profile Photo (Optional)</h4>
                  <p className="text-xs text-slate-500">Upload a professional headshot for official Promedo transcripts.</p>
                  <div className="flex items-center gap-2 justify-center sm:justify-start pt-1">
                    <label 
                      htmlFor="edit-modal-photo-upload"
                      className="px-3 py-1.5 bg-[#3853A4] hover:bg-[#2F4487] text-white font-bold text-xs rounded-xl transition-all cursor-pointer inline-flex items-center gap-1 shadow-2xs"
                    >
                      <Upload size={12} />
                      <span>Upload Image</span>
                    </label>
                    {photoURL && (
                      <button
                        type="button"
                        onClick={() => setPhotoURL('')}
                        className="px-3 py-1.5 bg-white border border-slate-200 hover:border-red-200 text-slate-600 hover:text-red-600 font-bold text-xs rounded-xl transition-all cursor-pointer inline-flex items-center gap-1"
                      >
                        <Trash2 size={12} />
                        <span>Remove</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                {/* Full Name */}
                <div>
                  <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-1.5">
                    Full Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-2xl text-xs font-bold text-slate-800 outline-none focus:border-[#3853A4] focus:ring-2 focus:ring-[#3853A4]/15 transition-all"
                    placeholder="Dr. John Smith"
                    required
                  />
                </div>

                {/* Email Address (Read-only protected by Auth) */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider">
                      Email Address
                    </label>
                    <span className="text-[10px] text-slate-400 font-semibold flex items-center gap-1">
                      <Lock size={10} /> Protected Auth ID
                    </span>
                  </div>
                  <input
                    type="email"
                    value={initialProfile.email || ''}
                    disabled
                    className="w-full px-4 py-2.5 bg-slate-100 border border-slate-200 rounded-2xl text-xs font-bold text-slate-500 outline-none cursor-not-allowed"
                  />
                </div>

                {/* Phone Number */}
                <div>
                  <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-1.5">
                    Phone Number (With Country Code) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-2xl text-xs font-bold text-slate-800 outline-none focus:border-[#3853A4] focus:ring-2 focus:ring-[#3853A4]/15 transition-all"
                    placeholder="+971 50 123 4567"
                    required
                  />
                </div>

                {/* Date of Birth */}
                <div>
                  <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-1.5">
                    Date of Birth <span className="text-slate-400 font-normal">(Optional)</span>
                  </label>
                  <input
                    type="date"
                    value={dateOfBirth}
                    onChange={(e) => setDateOfBirth(e.target.value)}
                    className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-2xl text-xs font-bold text-slate-800 outline-none focus:border-[#3853A4] focus:ring-2 focus:ring-[#3853A4]/15 transition-all"
                  />
                </div>

                {/* Gender */}
                <div className="sm:col-span-2">
                  <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-1.5">
                    Gender <span className="text-slate-400 font-normal">(Optional)</span>
                  </label>
                  <div className="grid grid-cols-4 gap-2">
                    {['Male', 'Female', 'Other', 'Prefer not to say'].map((g) => (
                      <button
                        key={g}
                        type="button"
                        onClick={() => setGender(g)}
                        className={`py-2 px-3 rounded-xl text-xs font-bold transition-all border cursor-pointer text-center ${
                          gender === g
                            ? 'bg-[#3853A4] text-white border-[#3853A4] shadow-2xs'
                            : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        {g}
                      </button>
                    ))}
                  </div>
                </div>

              </div>
            </div>
          )}

          {/* TAB 2: ACADEMIC INFORMATION */}
          {activeTab === 'academic' && (
            <div className="space-y-4">
              {/* Institution / College */}
              <div>
                <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-1.5">
                  Institution / School / College Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={institution}
                  onChange={(e) => setInstitution(e.target.value)}
                  className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-2xl text-xs font-bold text-slate-800 outline-none focus:border-[#3853A4] focus:ring-2 focus:ring-[#3853A4]/15 transition-all"
                  placeholder="e.g. Dubai Medical College / King Edward Medical University"
                  required
                />
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                {/* Qualification */}
                <div>
                  <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-1.5">
                    Qualification / Education Level <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={qualification}
                    onChange={(e) => setQualification(e.target.value)}
                    className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-2xl text-xs font-bold text-slate-800 outline-none focus:border-[#3853A4] focus:ring-2 focus:ring-[#3853A4]/15 transition-all cursor-pointer"
                  >
                    {QUALIFICATION_OPTIONS.map((q) => (
                      <option key={q} value={q}>{q}</option>
                    ))}
                  </select>
                </div>

                {/* Course / Program */}
                <div>
                  <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-1.5">
                    Course / Program <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={course}
                    onChange={(e) => setCourse(e.target.value)}
                    className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-2xl text-xs font-bold text-slate-800 outline-none focus:border-[#3853A4] focus:ring-2 focus:ring-[#3853A4]/15 transition-all"
                    placeholder="e.g. General Medicine / Dentistry / Nursing"
                    required
                  />
                </div>

                {/* Current Year / Semester */}
                <div>
                  <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-1.5">
                    Current Year / Semester <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={currentYear}
                    onChange={(e) => setCurrentYear(e.target.value)}
                    className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-2xl text-xs font-bold text-slate-800 outline-none focus:border-[#3853A4] focus:ring-2 focus:ring-[#3853A4]/15 transition-all cursor-pointer"
                  >
                    {YEAR_SEMESTER_OPTIONS.map((y) => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                </div>

                {/* Student ID (Optional) */}
                <div>
                  <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-1.5">
                    Student ID <span className="text-slate-400 font-normal">(Optional)</span>
                  </label>
                  <input
                    type="text"
                    value={studentId}
                    onChange={(e) => setStudentId(e.target.value)}
                    className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-2xl text-xs font-bold text-slate-800 outline-none focus:border-[#3853A4] focus:ring-2 focus:ring-[#3853A4]/15 transition-all"
                    placeholder="e.g. STU-2026-889"
                  />
                </div>
              </div>

              {/* Target Licensing Exam */}
              <div>
                <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-1.5">
                  Target GCC Licensing Exam
                </label>
                <select
                  value={examPreparingFor}
                  onChange={(e) => setExamPreparingFor(e.target.value)}
                  className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-2xl text-xs font-bold text-slate-800 outline-none focus:border-[#3853A4] focus:ring-2 focus:ring-[#3853A4]/15 transition-all cursor-pointer"
                >
                  <option value="DHA (Dubai Health Authority)">DHA - Dubai Health Authority</option>
                  <option value="HAAD / DOH (Abu Dhabi Health Authority)">HAAD / DOH - Abu Dhabi Department of Health</option>
                  <option value="MOHAP (UAE Ministry of Health)">MOHAP - UAE Ministry of Health & Prevention</option>
                  <option value="SMLE (Saudi Medical Licensing Exam)">SMLE - Saudi Commission (SCFHS)</option>
                  <option value="OMSB (Oman Medical Specialty Board)">OMSB - Oman Medical Specialty Board</option>
                  <option value="QCHP (Qatar Prometric Exam)">QCHP / DHP - Qatar Council</option>
                  <option value="NHRA (Bahrain Health Regulatory Authority)">NHRA - Bahrain Regulatory Authority</option>
                  <option value="GP Prometric (General Practice)">GP Prometric (General Practice)</option>
                  <option value="Nursing Prometric">Nursing Prometric Licensure</option>
                  <option value="Dental Prometric">Dental Prometric</option>
                  <option value="Other">Other Licensing Exam</option>
                </select>
              </div>

            </div>
          )}

          {/* TAB 3: LOCATION INFORMATION */}
          {activeTab === 'location' && (
            <div className="space-y-4">
              <div className="grid sm:grid-cols-3 gap-4">
                {/* Country */}
                <div>
                  <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-1.5">
                    Country <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                    className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-2xl text-xs font-bold text-slate-800 outline-none focus:border-[#3853A4] focus:ring-2 focus:ring-[#3853A4]/15 transition-all cursor-pointer"
                  >
                    {GCC_COUNTRIES.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                {/* State / Emirate */}
                <div>
                  <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-1.5">
                    State / Emirate <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                    className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-2xl text-xs font-bold text-slate-800 outline-none focus:border-[#3853A4] focus:ring-2 focus:ring-[#3853A4]/15 transition-all"
                    placeholder="e.g. Dubai / Abu Dhabi / Riyadh"
                    required
                  />
                </div>

                {/* City */}
                <div>
                  <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-1.5">
                    City <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-2xl text-xs font-bold text-slate-800 outline-none focus:border-[#3853A4] focus:ring-2 focus:ring-[#3853A4]/15 transition-all"
                    placeholder="e.g. Dubai"
                    required
                  />
                </div>
              </div>

              {/* Full Address */}
              <div>
                <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-1.5">
                  Full Residential Address <span className="text-slate-400 font-normal">(Optional)</span>
                </label>
                <textarea
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  rows={3}
                  className="w-full px-4 py-3 bg-white border border-slate-200 rounded-2xl text-xs font-bold text-slate-800 outline-none focus:border-[#3853A4] focus:ring-2 focus:ring-[#3853A4]/15 transition-all"
                  placeholder="Street name, Building number, Apartment, Villa..."
                />
              </div>
            </div>
          )}

          {/* Modal Footer Controls */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-2xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-all cursor-pointer"
            >
              Cancel
            </button>

            <div className="flex items-center gap-2">
              {activeTab !== 'personal' && (
                <button
                  type="button"
                  onClick={() => setActiveTab(activeTab === 'location' ? 'academic' : 'personal')}
                  className="px-4 py-2.5 rounded-2xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-all cursor-pointer"
                >
                  Previous
                </button>
              )}

              {activeTab !== 'location' ? (
                <button
                  type="button"
                  onClick={() => setActiveTab(activeTab === 'personal' ? 'academic' : 'location')}
                  className="px-5 py-2.5 rounded-2xl bg-[#3853A4] hover:bg-[#2F4487] text-white text-xs font-bold transition-all shadow-md cursor-pointer"
                >
                  Next Section
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={loading}
                  className="px-6 py-2.5 rounded-2xl bg-[#3853A4] hover:bg-[#2F4487] text-white text-xs font-bold transition-all shadow-md flex items-center gap-2 cursor-pointer disabled:opacity-60"
                >
                  {loading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Saving Profile...</span>
                    </>
                  ) : (
                    <>
                      <Save size={15} />
                      <span>Save Changes</span>
                    </>
                  )}
                </button>
              )}
            </div>
          </div>

        </form>

      </div>
    </div>
  );
};
