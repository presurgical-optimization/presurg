// app/doctor/page.tsx  ← 檔名可依你實際路徑
"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { z } from "zod";
import { User, LogOut, ChevronDown, ChevronUp } from "lucide-react";

/* ------------------------- Zod Schemas ------------------------- */
const MeSchema = z.object({
  user: z.object({
    id: z.number(),
    name: z.string(),
    role: z.enum(["doctor", "patient"]),
  }),
});
type Me = z.infer<typeof MeSchema>["user"];

type SurgeryRow = {
  index: number;
  date: string;
  name: string;
  definition?: string;
  details?: string[];
};

type PatientRow = {
  id: number;
  name: string;
  mrn: string;
  patient_id?: string;
  dob?: string;
  status: string;
  note?: string;
  surgeries: SurgeryRow[];
};

/* ------------------------- 假資料（仍保留） ------------------------- */
// 預設顯示先用假資料，等 /api/auth/me 回來再覆蓋醫師姓名與 ID
const FALLBACK_DOCTOR = { name: "Carrie Huang", id: "D9876" };

const historyVersions = [
  { version: 1, date: "2025/10/01 09:30", editor: "Dr. Chen", content: "Record baseline temperature, blood pressure, heart rate, and pain level. (Initial Draft)" },
  { version: 2, date: "2025/10/05 14:00", editor: "Dr. Huang", content: "Record baseline temperature, blood pressure, heart rate, and pain level. **Note:** Check for pre-existing low blood pressure." },
  { version: 3, date: "2025/10/09 08:00", editor: "Dr. Wang", content: "Record baseline temperature, blood pressure, heart rate, and pain level. **Final Check:** ECG results are normal." },
];

const initialPatientList: PatientRow[] = [
  {
    id: 1,
    name: "Patient 1",
    mrn: "P001",
    patient_id: "123455",
    dob: "1980/01/15",
    status: "Optimization Complete",
    note: "高血壓史，需確認麻醉評估。",
    surgeries: [
      {
        index: 1,
        date: "10/10/2025 10:00",
        name: "Appendectomy",
        definition: "Surgical removal of the appendix, usually performed to treat acute appendicitis.",
        details: [
          "Fasting: The patient should fast for at least 6–8 hours before surgery (no food or drink).",
          "Allergies: Check for any drug allergies, especially to antibiotics or anesthetics.",
          "Informed Consent: Explain the surgical procedure, possible risks, and obtain written consent.",
          "Bowel Preparation: Usually not required for uncomplicated appendectomy, but may be considered for laparoscopic procedures.",
          "IV Access: Establish intravenous line for fluids and medications.",
          "Preoperative Antibiotics: Administer broad-spectrum antibiotics (e.g., ceftriaxone + metronidazole) to reduce infection risk.",
          "Vital Signs and Assessment: Record baseline temperature, blood pressure, heart rate, and pain level.",
        ],
      },
      { index: 2, date: "10/20/2025 12:00", name: "Cholecystectomy", definition: "Removal of the gallbladder.", details: ["Fasting: 8 hours", "Informed Consent: Done"] },
      { index: 3, date: "12/19/2025 15:00", name: "Knee Arthroscopy", definition: "Minimally invasive knee surgery.", details: ["Fasting: 6 hours", "Consent: Done", "Pre-Op Check: Complete"] },
    ],
  },
  {
    id: 2,
    name: "Patient 2",
    mrn: "P002",
    patient_id: "123456",
    dob: "1995/05/20",
    status: "Optimization Complete",
    note: "無特殊問題，已準備手術。",
    surgeries: [
      {
        index: 1,
        date: "10/10/2025 10:00",
        name: "Appendectomy",
        definition: "Surgical removal of the appendix, usually performed to treat acute appendicitis.",
        details: [
          "Fasting: The patient should fast for at least 6–8 hours before surgery (no food or drink).",
          "Allergies: Check for any drug allergies, especially to antibiotics or anesthetics.",
          "Informed Consent: Explain the surgical procedure, possible risks, and obtain written consent.",
          "Bowel Preparation: Usually not required for uncomplicated appendectomy, but may be considered for laparoscopic procedures.",
          "IV Access: Establish intravenous line for fluids and medications.",
          "Preoperative Antibiotics: Administer broad-spectrum antibiotics (e.g., ceftriaxone + metronidazole) to reduce infection risk.",
          "Vital Signs and Assessment: Record baseline temperature, blood pressure, heart rate, and pain level.",
        ],
      },
      { index: 2, date: "10/20/2025 12:00", name: "Hysterectomy", definition: "Removal of the gallbladder.", details: ["Fasting: 8 hours", "Informed Consent: Done"] },
      { index: 3, date: "12/19/2025 15:00", name: "Carotid Endarterectomy", definition: "Minimally invasive knee surgery.", details: ["Fasting: 6 hours", "Consent: Done", "Pre-Op Check: Complete"] },
    ],
  },
  { id: 3, name: "Patient 3", mrn: "P003", patient_id: "123457", dob: "1972/11/05", status: "Waiting for Lab", note: "等待 INR 報告。", surgeries: [] },
  { id: 4, name: "Patient 4", mrn: "P004", patient_id: "123458", dob: "2000/03/10", status: "Initial Intake", note: "新病人，資料待補齊。", surgeries: [] },
];

/* ------------------------- 主頁面 ------------------------- */
export default function DoctorViewPage() {
  const router = useRouter();

  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [doctorInfo, setDoctorInfo] = useState<{ name: string; id: string | number }>(FALLBACK_DOCTOR);
  const [patientList, setPatientList] = useState<PatientRow[]>(initialPatientList);
  const [selectedPatient, setSelectedPatient] = useState<PatientRow | null>(null);
  const [error, setError] = useState<string | null>(null);

  // 從 /api/auth/me 拿醫師資訊（name / id）
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/auth/me", { credentials: "include", cache: "no-store" });
        if (!res.ok) {
          if (res.status === 401) {
            router.push("/"); // 未登入 → 回登入
            return;
          }
          const j = await res.json().catch(() => ({}));
          throw new Error(j?.error ?? `HTTP ${res.status}`);
        }
        const data = await res.json();
        const parsed = MeSchema.safeParse(data);
        if (!parsed.success) throw new Error("Unexpected /api/auth/me response");
        const me = parsed.data.user;
        if (me.role !== "doctor") {
          router.push("/"); // 非醫師 → 回首頁
          return;
        }
        setDoctorInfo({ name: me.name, id: me.id });
      } catch (e) {
        setError(e instanceof Error ? e.message : "Network error");
      }
    })();
  }, [router]);

  const toggleProfile = () => setIsProfileOpen((v) => !v);
  const handlePatientHover = (patient: PatientRow) => setSelectedPatient(patient);

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    } catch {}
    router.push("/");
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: "#F0F0F0" }}>
      {/* Header */}
      <header className="w-full p-4 flex items-center shadow-lg relative" style={{ backgroundColor: "#1D4C6F" }}>
        <div className="flex-none -mt-[30px] -ml-[5px]">
          <h1 className="text-xl font-serif italic font-bold tracking-widest opacity-35 text-white">Hackathon</h1>
        </div>

        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
          <p className="text-4xl font-serif italic font-bold text-white tracking-widest">
            {doctorInfo.name}
          </p>
        </div>

        <div className="relative ml-auto">
          <button onClick={toggleProfile} className="p-2 rounded-full hover:bg-white/10 transition-colors" aria-label="Toggle Doctor Profile">
            <User className="h-8 w-8 cursor-pointer text-white" />
          </button>

          {isProfileOpen && (
            <div className="absolute right-0 mt-3 w-64 bg-white rounded-lg shadow-xl py-3 z-10 border border-gray-200">
              <div className="px-4 pb-2 border-b">
                <h3 className="text-lg font-bold text-gray-900">{doctorInfo.name}</h3>
                <p className="text-xs text-gray-500">ID: {doctorInfo.id}</p>
              </div>
              <div className="pt-2 border-t text-center">
                <button
                  onClick={handleLogout}
                  className="flex items-center justify-center w-full py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Log out
                </button>
              </div>
            </div>
          )}
        </div>
      </header>

      {/* Error 提示（若有） */}
      {error && (
        <div className="mx-auto mt-4 text-sm text-red-600">
          ❌ {error}
        </div>
      )}

      {/* Main */}
      <main className="flex-grow flex p-8">
        {/* 左：病人列表 */}
        <div className="w-1/5 flex flex-col justify-start items-center pr-4 space-y-4">
          {patientList.map((patient) => (
            <button
              key={patient.id}
              onMouseEnter={() => handlePatientHover(patient)}
              className={`w-full py-6 px-4 rounded-xl text-center transition-all duration-300 ease-in-out font-extrabold text-xl tracking-wider text-gray-800 ${
                selectedPatient?.id === patient.id ? "bg-[#D0E6F0]" : "bg-[#EBF4F8]"
              }`}
              style={{ boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -2px rgba(0,0,0,0.06)" }}
            >
              {patient.name}
            </button>
          ))}
        </div>

        {/* 右：病人資訊 */}
        <div className="w-4/5 pl-4">
          <div className="w-full h-full p-8 rounded-xl shadow-2xl flex flex-col relative" style={{ backgroundColor: "white", border: "1px solid #cce8f5" }}>
            {selectedPatient ? (
              <div className="text-gray-700">
                <h2 className="text-2xl font-extrabold mb-1" style={{ color: "#1D4C6F" }}>
                  {selectedPatient.name}
                </h2>

                <div className="text-base space-y-1 mb-6 text-gray-700">
                  <p>
                    MRN: <span className="font-semibold">{selectedPatient.mrn}</span>
                  </p>
                  <p>
                    ID: <span className="font-semibold">{selectedPatient.patient_id || "N/A"}</span>
                  </p>
                  <p>
                    Current Status: <span className="font-semibold text-green-600">{selectedPatient.status}</span>
                  </p>
                </div>

                {selectedPatient.surgeries && selectedPatient.surgeries.length > 0 ? (
                  <SurgeryTable surgeries={selectedPatient.surgeries} />
                ) : (
                  <p className="mt-8 text-center text-gray-500">No Surgery Record</p>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <p className="text-4xl font-extrabold opacity-50" style={{ color: "#1D4C6F" }}>
                  Patient Info
                </p>
                <p className="mt-4 text-gray-500">將滑鼠移至左側病人姓名，以查看詳細資訊。</p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

/* ------------------------- 子元件：歷史彈窗 ------------------------- */
const HistoryModal = ({ versions, onClose }: { versions: typeof historyVersions; onClose: () => void }) => {
  const [currentPage, setCurrentPage] = useState(0);
  const currentVersion = versions[currentPage];
  const totalPages = versions.length;

  if (totalPages === 0) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-xl shadow-2xl w-full max-w-4xl max-h-[80vh] flex flex-col">
        <h3 className="text-2xl font-bold mb-4 border-b pb-2 text-gray-800">Version History: Vital Signs and Assessment</h3>

        <div className="flex-grow overflow-y-auto p-4 border rounded-lg bg-gray-50 mb-4">
          <p className="text-lg font-semibold mb-2">
            Version {currentVersion.version} / {totalPages}
          </p>
          <p className="text-sm text-gray-500 mb-4">
            Edited by {currentVersion.editor} on {currentVersion.date}
          </p>
          <div className="text-gray-700 whitespace-pre-wrap border p-4 bg-white rounded-md min-h-[150px]">
            {currentVersion.content}
          </div>
        </div>

        <div className="flex justify-between items-center pt-2">
          <button onClick={onClose} className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300 text-gray-700">
            Close
          </button>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setCurrentPage((p) => Math.max(0, p - 1))}
              disabled={currentPage === 0}
              className={`px-4 py-2 rounded transition-colors ${
                currentPage === 0 ? "bg-gray-100 text-gray-400 cursor-not-allowed" : "bg-gray-400 text-white hover:bg-blue-900"
              }`}
            >
              Prev Ver.
            </button>
            {totalPages > 1 && (
              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages - 1, p + 1))}
                disabled={currentPage === totalPages - 1}
                className={`px-4 py-2 rounded transition-colors ${
                  currentPage === totalPages - 1 ? "bg-gray-100 text-gray-400 cursor-not-allowed" : "bg-gray-400 text-white hover:bg-blue-900"
                }`}
              >
                Next Ver.
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

/* ------------------------- 子元件：可編輯行 ------------------------- */
const EditableRow = ({
  columnName,
  initialValue,
  isSurgeryName = false,
  isVitalSignsRow = false,
  onViewHistory,
}: {
  columnName: string;
  initialValue: string;
  isSurgeryName?: boolean;
  isVitalSignsRow?: boolean;
  onViewHistory?: () => void;
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedValue, setEditedValue] = useState(initialValue);

  const handleSave = () => {
    console.log(`Saving ${columnName}: ${editedValue}`);
    setIsEditing(false);
  };

  const isLongText = (editedValue && editedValue.length > 50) || (editedValue && editedValue.includes("\n"));

  return (
    <div className="flex items-start bg-white hover:bg-gray-50 transition-colors py-3 px-4 border-b border-gray-200">
      <div className="font-semibold text-gray-800 pt-1 flex-[0_0_25%]">{columnName}</div>

      <div className="flex-[1_1_65%] mr-4">
        {isEditing ? (
          isLongText ? (
            <textarea
              value={editedValue}
              onChange={(e) => setEditedValue(e.target.value)}
              className="w-full border border-gray-300 p-1 rounded resize-y min-h-[50px] text-gray-700"
            />
          ) : (
            <input
              type="text"
              value={editedValue}
              onChange={(e) => setEditedValue(e.target.value)}
              className="w-full border border-gray-300 p-1 rounded text-gray-700"
            />
          )
        ) : (
          <span className={isSurgeryName ? "text-blue-700 font-semibold whitespace-pre-wrap" : "text-gray-700 whitespace-pre-wrap"}>
            {editedValue}
          </span>
        )}
      </div>

      <div className="w-16 flex flex-col justify-start items-end pt-1 space-y-2">
        {isEditing ? (
          <button onClick={handleSave} className="text-white bg-green-500 hover:bg-green-600 text-xs px-3 py-1 rounded">
            Save
          </button>
        ) : (
          <button onClick={() => setIsEditing(true)} className="text-gray-700 border border-gray-400 hover:bg-gray-200 text-xs px-3 py-1 rounded">
            Edit
          </button>
        )}

        {isVitalSignsRow && !isEditing && (
          <button
            onClick={onViewHistory}
            className="text-white border text-xs px-1 py-1 rounded transition-colors"
            style={{ backgroundColor: "grey", boxShadow: "none" }}
          >
            History
          </button>
        )}
      </div>
    </div>
  );
};

/* ------------------------- 子元件：可展開的手術表格 ------------------------- */
const SurgeryTable = ({ surgeries }: { surgeries: SurgeryRow[] }) => {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  const toggleDetails = (index: number) => setExpandedIndex(expandedIndex === index ? null : index);
  const handleViewHistory = () => setIsHistoryOpen(true);

  return (
    <div className="mt-8 text-base">
      {isHistoryOpen && <HistoryModal versions={historyVersions} onClose={() => setIsHistoryOpen(false)} />}
      <div className="text-sm font-light mb-2 text-gray-500">Table</div>

      <table className="min-w-full divide-y divide-gray-200 border-t border-gray-200">
        <thead className="bg-gray-50 text-gray-600 uppercase tracking-wider text-xs">
          <tr>
            <th className="px-4 py-2 text-left font-bold w-1/12">Index</th>
            <th className="px-6 py-2 text-left font-bold w-3/12">Date/Time</th>
            <th className="px-6 py-2 text-left font-bold w-8/12">Surgery Name / Notes</th>
          </tr>
        </thead>

        <tbody className="bg-white divide-y divide-gray-200">
          {surgeries.map((surgery, index) => (
            <React.Fragment key={surgery.index}>
              <tr onClick={() => toggleDetails(index)} className="cursor-pointer hover:bg-blue-50 transition-colors">
                <td className="px-4 py-3 font-medium text-gray-900 w-1/12">{surgery.index}</td>
                <td className="px-6 py-3 text-gray-700 whitespace-nowrap w-3/12">{surgery.date}</td>
                <td className="px-6 py-3 text-blue-800 font-medium flex justify-between items-center w-8/12">
                  <span>{surgery.name}</span>
                  <span className="flex-shrink-0 ml-4">{expandedIndex === index ? <ChevronUp className="h-4 w-4 text-gray-500" /> : <ChevronDown className="h-4 w-4 text-gray-500" />}</span>
                </td>
              </tr>

              {expandedIndex === index && (
                <tr>
                  <td colSpan={3} className="p-0 bg-gray-50 text-base">
                    <div className="space-y-0">
                      <div className="divide-y divide-gray-200 border border-gray-300">
                        <EditableRow columnName="1. Surgery Name:" initialValue={surgery.name} isSurgeryName />
                        <EditableRow columnName="2. Date/Time:" initialValue={surgery.date} />
                        {surgery.definition && <EditableRow columnName="3. Definition:" initialValue={surgery.definition} />}
                        {surgery.details?.map((detail, detailIndex) => {
                          const separatorIndex = detail.indexOf(":");
                          const title = separatorIndex !== -1 ? detail.substring(0, separatorIndex + 1) : detail;
                          const content = separatorIndex !== -1 ? detail.substring(separatorIndex + 1) : "";
                          const numberedTitle = `${detailIndex + 4}. ${title}`;
                          const isVitalSigns = detailIndex + 4 === 10;
                          return (
                            <EditableRow
                              key={detailIndex}
                              columnName={numberedTitle}
                              initialValue={content.trim()}
                              isVitalSignsRow={isVitalSigns}
                              onViewHistory={handleViewHistory}
                            />
                          );
                        })}
                      </div>
                      <div className="text-gray-800 mt-4">
                        <ul className="space-y-3 list-disc list-inside ml-4" />
                      </div>
                    </div>
                  </td>
                </tr>
              )}
            </React.Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
};
