import {
  Calendar,
  IndianRupee,
  GraduationCap,
  ClipboardList,
} from "lucide-react";
export function ParentOverviewCard() {
  return (
  <div className="rounded-2xl border border-border-soft bg-white p-5 shadow-soft hover:shadow-lg transition-all duration-300">
    <h2 className="text-lg font-semibold">Child Overview</h2>

    <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">

      {/* Attendance */}
      <div className="rounded-xl bg-emerald-50 p-4 transition-all duration-300 hover:scale-[1.02]">
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500">Attendance</p>
          <Calendar size={18} className="text-emerald-600" />
        </div>

        <h3 className="mt-3 text-2xl font-bold text-emerald-600">
          92%
        </h3>
      </div>

      {/* Fees */}
      <div className="rounded-xl bg-emerald-50 p-4 transition-all duration-300 hover:scale-[1.02]">
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500">Pending Fees</p>
          <IndianRupee size={18} className="text-amber-600" />
        </div>

        <h3 className="mt-3 text-2xl font-bold text-amber-600">
          ₹12,000
        </h3>

        <button className="mt-3 rounded-lg bg-amber-500 px-3 py-1 text-xs font-medium text-white hover:bg-amber-600">
          Pay Now
        </button>
      </div>

      {/* Grades */}
      <div className="rounded-xl bg-emerald-50 p-4 transition-all duration-300 hover:scale-[1.02]">
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500">Latest Grade</p>
          <GraduationCap size={18} className="text-blue-600" />
        </div>

        <h3 className="mt-3 text-2xl font-bold text-blue-600">
          A
        </h3>
      </div>

      {/* Assignments */}
      <div className="rounded-xl bg-emerald-50 p-4 transition-all duration-300 hover:scale-[1.02]">
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500">Assignments Due</p>
          <ClipboardList size={18} className="text-rose-600" />
        </div>

        <h3 className="mt-3 text-2xl font-bold text-rose-600">
          2
        </h3>
      </div>

    </div>
  </div>
);
}