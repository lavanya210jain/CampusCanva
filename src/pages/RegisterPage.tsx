import { ThemeToggle } from '../components/common/ThemeToggle';
import { PhoneInput } from "../components/common/PhoneInput";
import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Layers,
  GraduationCap,
  Briefcase,
  UserCheck,
  Eye,
  EyeOff,
  ArrowRight,
  ShieldAlert,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { UserType } from "../types";

export const RegisterPage: React.FC = () => {
  const { register } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  // Common Fields
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [userType, setUserType] = useState<UserType>("STUDENT");

  // Student Subtype Fields
  const [rollNumber, setRollNumber] = useState("");
  const [department, setDepartment] = useState(
    "Computer Science & Engineering",
  );
  const [batchYear, setBatchYear] = useState("2025");

  // Alumni Subtype Fields
  const [graduationYear, setGraduationYear] = useState("2023");
  const [currentCompany, setCurrentCompany] = useState("");

  // Faculty Subtype Fields
  const [employeeNo, setEmployeeNo] = useState("");
  const [facultyDept, setFacultyDept] = useState(
    "Computer Science & Engineering",
  );
  const [designation, setDesignation] = useState("Assistant Professor");

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    if (password !== confirmPassword) {
      setErrorMsg("Passwords do not match.");
      return;
    }
    if (password.length < 8) {
      setErrorMsg("Password should be at least 8 characters.");
      return;
    }

    setLoading(true);
    try {
      const specializedData: {
        student?: {
          roll_number: string;
          department: string;
          batch_year: number;
        };
        alumni?: { graduation_year: number; current_company: string };
        faculty?: {
          employee_no: string;
          department: string;
          designation: string;
        };
      } = {};

      if (userType === "STUDENT") {
        if (!rollNumber.trim())
          throw new Error("Roll number is required for students.");
        specializedData.student = {
          roll_number: rollNumber.trim(),
          department,
          batch_year: parseInt(batchYear, 10),
        };
      } else if (userType === "ALUMNI") {
        if (!currentCompany.trim())
          throw new Error("Current company is required for alumni.");
        specializedData.alumni = {
          graduation_year: parseInt(graduationYear, 10),
          current_company: currentCompany.trim(),
        };
      } else if (userType === "FACULTY") {
        if (!employeeNo.trim())
          throw new Error("Employee number is required for faculty.");
        specializedData.faculty = {
          employee_no: employeeNo.trim(),
          department: facultyDept,
          designation,
        };
      }

      await register(
        {
          full_name: fullName.trim(),
          email: email.trim(),
          phone: phone.trim() || undefined,
          user_type: userType,
          password,
          avatar_url: `https://images.unsplash.com/photo-${
            userType === "STUDENT"
              ? "1534528741775-53994a69daeb"
              : userType === "FACULTY"
                ? "1472099645785-5658abf4ff4e"
                : "1500648767791-00dcc994a43e"
          }?auto=format&fit=crop&w=300&q=80`,
        },
        specializedData,
      );

      navigate("/dashboard");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Registration failed";
      setErrorMsg(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col justify-center py-10 sm:px-6 lg:px-8">
      <div className="absolute right-4 top-4"><ThemeToggle /></div>
      <div className="sm:mx-auto sm:w-full sm:max-w-lg text-center">
        <Link to="/" className="inline-flex items-center gap-3 group">
          <div className="w-12 h-12 rounded-2xl bg-teal-600 flex items-center justify-center text-white shadow-lg shadow-teal-100 dark:shadow-black/10">
            <Layers className="w-6 h-6" />
          </div>
          <span className="font-extrabold text-2xl tracking-tight text-slate-900 dark:text-slate-100">
            CampusCanva
          </span>
        </Link>
        <h2 className="mt-3 text-2xl font-bold text-slate-900 dark:text-slate-100">
          Create Campus Identity
        </h2>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          Already registered?{" "}
          <Link
            to="/login"
            className="font-semibold text-teal-600 dark:text-teal-300 hover:text-teal-500 dark:hover:text-teal-400"
          >
            Sign in here
          </Link>
        </p>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-lg">
        <div className="bg-white dark:bg-slate-900 py-8 px-6 sm:px-10 shadow-xl border border-slate-200/80 dark:border-slate-800/80 rounded-3xl space-y-6">
          {errorMsg && (
            <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950 border border-rose-200 dark:border-rose-800 text-xs font-semibold text-rose-700 dark:text-rose-300 flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Role Selector (ISA Hierarchy) */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-200 mb-2">
                Campus Persona (ISA Specialization) *
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setUserType("STUDENT")}
                  className={`flex flex-col items-center justify-center p-3 rounded-2xl border text-xs font-bold transition ${
                    userType === "STUDENT"
                      ? "bg-teal-50 dark:bg-teal-950 border-teal-500 text-teal-700 dark:text-teal-300 shadow-xs"
                      : "bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-900"
                  }`}
                >
                  <GraduationCap className="w-5 h-5 mb-1" />
                  <span>Student</span>
                </button>

                <button
                  type="button"
                  onClick={() => setUserType("ALUMNI")}
                  className={`flex flex-col items-center justify-center p-3 rounded-2xl border text-xs font-bold transition ${
                    userType === "ALUMNI"
                      ? "bg-amber-50 dark:bg-amber-950 border-amber-500 text-amber-700 dark:text-amber-300 shadow-xs"
                      : "bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-900"
                  }`}
                >
                  <Briefcase className="w-5 h-5 mb-1" />
                  <span>Alumni</span>
                </button>

                <button
                  type="button"
                  onClick={() => setUserType("FACULTY")}
                  className={`flex flex-col items-center justify-center p-3 rounded-2xl border text-xs font-bold transition ${
                    userType === "FACULTY"
                      ? "bg-orange-50 dark:bg-orange-950 border-orange-500 text-orange-700 dark:text-orange-300 shadow-xs"
                      : "bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-900"
                  }`}
                >
                  <UserCheck className="w-5 h-5 mb-1" />
                  <span>Faculty</span>
                </button>
              </div>
            </div>

            {/* Base User Details */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-200 mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Your full name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-hidden focus:bg-white dark:focus:bg-slate-900 focus:border-teal-500 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-200 mb-1">
                  Email Address *
                </label>
                <input
                  type="email"
                  required
                  placeholder="you@nsut.ac.in"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-hidden focus:bg-white dark:focus:bg-slate-900 focus:border-teal-500 transition"
                />
              </div>
            </div>

            <PhoneInput id="register-phone" value={phone} onChange={setPhone} />

            {/* Passwords */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-200 mb-1">
                  Password *
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Min 8 characters"
                    className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-hidden focus:bg-white dark:focus:bg-slate-900 focus:border-teal-500 transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-200 mb-1">
                  Confirm Password *
                </label>
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repeat password"
                  className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-hidden focus:bg-white dark:focus:bg-slate-900 focus:border-teal-500 transition"
                />
              </div>
            </div>

            {/* CONDITIONAL SPECIALIZATION FIELDS */}
            <div className="pt-2">
              {userType === "STUDENT" && (
                <div className="p-4 rounded-2xl bg-teal-50/50 dark:bg-teal-950/50 border border-teal-100 dark:border-teal-800 space-y-3 animate-fade-in">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-teal-700 dark:text-teal-300 block">
                    Student Sub-Entity Attributes
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1">
                        Roll Number *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="Your roll number"
                        value={rollNumber}
                        onChange={(e) => setRollNumber(e.target.value)}
                        className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-teal-200 dark:border-teal-800 rounded-xl text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1">
                        Batch Year *
                      </label>
                      <input
                        type="number"
                        required
                        value={batchYear}
                        onChange={(e) => setBatchYear(e.target.value)}
                        className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-teal-200 dark:border-teal-800 rounded-xl text-xs"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1">
                      Department
                    </label>
                    <input
                      type="text"
                      value={department}
                      onChange={(e) => setDepartment(e.target.value)}
                      className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-teal-200 dark:border-teal-800 rounded-xl text-xs"
                    />
                  </div>
                </div>
              )}

              {userType === "ALUMNI" && (
                <div className="p-4 rounded-2xl bg-amber-50/50 dark:bg-amber-950/50 border border-amber-100 dark:border-amber-800 space-y-3 animate-fade-in">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-300 block">
                    Alumni Sub-Entity Attributes
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1">
                        Graduation Year *
                      </label>
                      <input
                        type="number"
                        required
                        value={graduationYear}
                        onChange={(e) => setGraduationYear(e.target.value)}
                        className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-amber-200 dark:border-amber-800 rounded-xl text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1">
                        Current Company *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Google India"
                        value={currentCompany}
                        onChange={(e) => setCurrentCompany(e.target.value)}
                        className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-amber-200 dark:border-amber-800 rounded-xl text-xs"
                      />
                    </div>
                  </div>
                </div>
              )}

              {userType === "FACULTY" && (
                <div className="p-4 rounded-2xl bg-orange-50/50 dark:bg-orange-950/50 border border-orange-100 dark:border-orange-800 space-y-3 animate-fade-in">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-orange-700 dark:text-orange-300 block">
                    Faculty Sub-Entity Attributes
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1">
                        Employee Number *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="FAC-CSE-104"
                        value={employeeNo}
                        onChange={(e) => setEmployeeNo(e.target.value)}
                        className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-orange-200 dark:border-orange-800 rounded-xl text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1">
                        Designation *
                      </label>
                      <input
                        type="text"
                        required
                        value={designation}
                        onChange={(e) => setDesignation(e.target.value)}
                        className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-orange-200 dark:border-orange-800 rounded-xl text-xs"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1">
                      Department
                    </label>
                    <input
                      type="text"
                      value={facultyDept}
                      onChange={(e) => setFacultyDept(e.target.value)}
                      className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-orange-200 dark:border-orange-800 rounded-xl text-xs"
                    />
                  </div>
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-teal-600 hover:bg-teal-700 text-white font-bold text-sm rounded-xl shadow-md shadow-teal-100 dark:shadow-black/10 transition disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <span>
                {loading ? "Creating Account..." : "Complete Registration"}
              </span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
