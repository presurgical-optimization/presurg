// app/doctor/page.tsx — Uses real /api/doctor JSON; only Instructions editable; History kept
"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { z } from "zod";
import { User, LogOut, ChevronDown, ChevronUp, Lock } from "lucide-react";

/* ------------------------- Auth schema (unchanged) ------------------------- */
const MeSchema = z.object({
  user: z.object({
    id: z.number(),
    name: z.string(),
    role: z.enum(["doctor", "patient"]),
  }),
});

type Me = z.infer<typeof MeSchema>["user"];

/* ------------------------- API schema (matches your sample) ------------------------- */
const InstructionSchema = z
  .object({
    type: z.string(),
    title: z.string().optional(),
    // dosage 可能是字串或物件（key 為 string，值任意）
    dosage: z.union([z.string(), z.record(z.string(), z.any())]).optional(),
    // window 是任意 key/value 的物件
    window: z.record(z.string(), z.any()).optional(),
    enabled: z.boolean().optional(),
    itemKey: z.string().optional(),
    orderIndex: z.number().optional(),
    description: z.string().optional(),
    indications: z.array(z.string()).optional(),
  })
  .passthrough();

const VersionSchema = z.object({
  id: z.number(),
  versionNo: z.number(),
  createdAt: z.string(),
  author: z.object({ id: z.number(), name: z.string() }),
  instructions: z.array(InstructionSchema),
});

const SurgerySchema = z.object({
  id: z.number(),
  status: z.string(),
  guideline: z.object({
    name: z.string(),
    description: z.string().optional().nullable(),
  }),
  latestVersion: VersionSchema,
  history: z.array(VersionSchema),
});

const PatientSchema = z.object({
  id: z.number(),
  name: z.string(),
  dob: z.string().optional().nullable(),
  surgeries: z.array(SurgerySchema),
});

const ApiSchema = z.object({
  data: z.array(PatientSchema),
});

type ApiResponse = z.infer<typeof ApiSchema>;

/* ------------------------- UI types ------------------------- */
export type LegacySurgeryRow = {
  index: number;
  date: string;
  name: string;
  definition?: string;
  details?: string[];
};
export type LegacyPatientRow = {
  id: number;
  name: string;
  mrn: string;
  patient_id?: string;
  dob?: string;
  status: string;
  note?: string;
  surgeries: LegacySurgeryRow[];
};

export type UiInstruction = z.infer<typeof InstructionSchema>;
export type UiVersion = {
  id: number;
  versionNo: number;
  createdAt: string;
  author: { id: number; name: string };
  instructions: UiInstruction[];
};
export type UiSurgery = {
  id: number;
  index: number;
  status: string;
  guideline: { name: string; description?: string | null };
  latestVersion: UiVersion;
  versions: UiVersion[]; // from history
};
export type UiPatient = {
  id: number;
  name: string;
  dob?: string | null;
  mrn?: string | null;
  patient_id?: string | null;
  note?: string | null;
  surgeries: UiSurgery[];
};
 
const RawSurgerySchema = z.object({
  id: z.number(),
  patientId: z.number(),
  status: z.string(),
  // ... 其他欄位
  patient: z.object({ id: z.number(), name: z.string(), ssn: z.string() }),
  guideline: z.object({ id: z.number(), name: z.string() }),
  // ... 其他欄位
}).passthrough(); // 使用 passthrough 以免遺漏欄位導致驗證失敗

const RawApiSchema = z.object({
  surgeries: z.array(RawSurgerySchema),
});
export type RawApiResponse = z.infer<typeof RawApiSchema>;
/* ------------------------- Utils ------------------------- */
const API_URL = "/api/doctor"; // src/app/api/doctor/route.ts
const FALLBACK_DOCTOR = { name: "Dr. Amelia Carter", id: "D0001" };

function formatInstructions(items: UiInstruction[]): string {
  if (!items || items.length === 0) return "(no instructions)";
  const lines: string[] = [];
  items
    .slice()
    .sort((a, b) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0))
    .forEach((it, idx) => {
      const header = it.title ?? it.type ?? `Item ${idx + 1}`;
      lines.push(`• ${header}`);

      // dosage can be string or object
      if (typeof it.dosage === "string" && it.dosage.trim()) {
        lines.push(`  - dosage: ${it.dosage}`);
      } else if (it.dosage && typeof it.dosage === "object") {
        for (const [k, v] of Object.entries(it.dosage)) {
          lines.push(`  - dosage.${k}: ${String(v)}`);
        }
      }

      if (it.window && typeof it.window === "object") {
        const parts = Object.entries(it.window).map(([k, v]) => `${k}=${String(v)}`);
        if (parts.length) lines.push(`  - window: ${parts.join(", ")}`);
      }

      if (it.description) lines.push(`  - note: ${it.description}`);
      if (it.indications?.length) lines.push(`  - indications: ${it.indications.join("; ")}`);
    });
  return lines
    .map((l) => `<div style="margin-left:${l.startsWith("•") ? "0" : "1.5em"}">${l}</div>`)
    .join("");
}

/* ------------------------- Page ------------------------- */
export default function DoctorViewPage() {
  const router = useRouter();

  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [doctorInfo, setDoctorInfo] = useState<{ name: string; id: string | number }>(FALLBACK_DOCTOR);
  const [patientList, setPatientList] = useState<UiPatient[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<UiPatient | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Fetch doctor info
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/auth/me", { credentials: "include", cache: "no-store" });
        if (!res.ok) {
          if (res.status === 401) { router.push("/"); return; }
          const j = await res.json().catch(() => ({}));
          throw new Error(j?.error ?? `HTTP ${res.status}`);
        }
        const data = await res.json();
        const parsed = MeSchema.safeParse(data);
        if (!parsed.success) throw new Error("Unexpected /api/auth/me response");
        const me = parsed.data.user;
        if (me.role !== "doctor") { router.push("/"); return; }
        setDoctorInfo({ name: me.name, id: me.id });
      } catch (e) {
        setError(e instanceof Error ? e.message : "Network error");
      }
    })();
  }, [router]);

  // Fetch patients & surgeries
  
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(API_URL, { credentials: "include", cache: "no-store" });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const raw = await res.json();
        
        // ❌ 移除或修改：ApiSchema.safeParse(raw)
        // ✅ 使用新的 Schema (RawApiSchema) 來驗證扁平的手術列表
        const parsed = RawApiSchema.safeParse(raw); 
        if (!parsed.success) {
            console.error("API Response Parsing Error:", parsed.error);
            throw new Error("Unexpected /api/doctor response structure.");
        }

        const api: RawApiResponse = parsed.data; // 注意：這裡的類型從 ApiResponse 變為 RawApiResponse

        // 1. 按患者 ID 分組手術
        const patientsMap = new Map<number, UiPatient>();

        api.surgeries.forEach((s) => {
          const patientId = s.patient.id;
          
          // 確保每個手術都有一個初始版本和歷史版本（儘管它們是空的或佔位符）
          // ⚠️ 注意: latestVersion 和 history 數據是缺失的，必須使用**佔位符**
          const placeholderVersion: UiVersion = {
             id: 0, // 佔位 ID
             versionNo: 1, 
             createdAt: new Date().toISOString(),
             author: { id: s.doctorId as number , name: 'System/Unknown' }, 
             instructions: [],
          };


          // 轉換手術數據到 UiSurgery 格式
          const uiSurgery: UiSurgery = {
            id: s.id,
            // 由於這裡不再是單個患者的陣列，idx 無法準確代表索引，但我們仍可使用一個序列號
            index: s.id, // 使用 id 作為臨時 index，或在最後再修正
            status: s.status,
            guideline: { 
                name: s.guideline.name, 
                // 由於原始 API 響應沒有 description，我們必須使用 null
                description: null 
            },
            latestVersion: placeholderVersion,
            versions: [placeholderVersion], // 用佔位符創建一個單一的歷史版本
          };

          if (!patientsMap.has(patientId)) {
            // 如果是新患者，則創建新的 UiPatient 項目
            patientsMap.set(patientId, {
              id: patientId,
              name: s.patient.name,
              dob: null, // 原始數據沒有 dob，設為 null
              mrn: null, // 硬編碼
              patient_id: null, // 硬編碼
              note: null, // 硬編碼
              surgeries: [uiSurgery],
            });
          } else {
            // 如果患者已存在，則將手術加入其列表
            patientsMap.get(patientId)!.surgeries.push(uiSurgery);
          }
        });

        // 2. 轉換 Map 為最終的 UiPatient[] 陣列
        const uiPatients: UiPatient[] = Array.from(patientsMap.values()).map(p => {
             // 修正 surgeries 陣列中的 index 欄位
             p.surgeries = p.surgeries.map((s, idx) => ({ ...s, index: idx + 1 }));
             return p;
        });


        setPatientList(uiPatients);
        if (uiPatients.length > 0) setSelectedPatient(uiPatients[0]);

      } catch (e) {
        setError(e instanceof Error ? e.message : "Network error");
      }
    })();
  }, []);

  const toggleProfile = () => setIsProfileOpen((v) => !v);
  const handlePatientHover = (patient: UiPatient) => setSelectedPatient(patient);

  const handleLogout = async () => {
    try { await fetch("/api/auth/logout", { method: "POST", credentials: "include" }); } catch {}
    router.push("/");
  };

  const prettyDOB = (dob?: string | null) => (dob ? new Date(dob).toLocaleDateString() : "N/A");

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: "#F0F0F0" }}>
      {/* Header */}
      <header className="w-full p-4 flex items-center shadow-lg relative" style={{ backgroundColor: "#1D4C6F" }}>
        <div className="flex-none -mt-[30px] -ml-[5px]">
          <h1 className="text-xl font-serif italic font-bold tracking-widest opacity-35 text-white">Hackathon</h1>
        </div>

        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
          <p className="text-4xl font-serif italic font-bold text-white tracking-widest">{doctorInfo.name}</p>
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
                <button onClick={handleLogout} className="flex items-center justify-center w-full py-2 text-sm text-red-600 hover:bg-red-50 transition-colors">
                  <LogOut className="h-4 w-4 mr-2" />
                  Log out
                </button>
              </div>
            </div>
          )}
        </div>
      </header>

      {/* Error */}
      {error && <div className="mx-auto mt-4 text-sm text-red-600">❌ {error}</div>}

      {/* Main */}
      <main className="flex-grow flex p-8">
        {/* Left: patients */}
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

        {/* Right: details */}
        <div className="w-4/5 pl-4">
          <div className="w-full h-full p-8 rounded-xl shadow-2xl flex flex-col relative" style={{ backgroundColor: "white", border: "1px solid #cce8f5" }}>
            {selectedPatient ? (
              <div className="text-gray-700">
                <h2 className="text-2xl font-extrabold mb-1" style={{ color: "#1D4C6F" }}>
                  {selectedPatient.name}
                </h2>

                <div className="text-base space-y-1 mb-6 text-gray-700">
                  <p>DOB: <span className="font-semibold">{prettyDOB(selectedPatient.dob)}</span></p>
                </div>

                {selectedPatient.surgeries && selectedPatient.surgeries.length > 0 ? (
                  <SurgeryTable surgeries={selectedPatient.surgeries} />
                ) : (
                  <p className="mt-8 text-center text-gray-500">No Surgery Record</p>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <p className="text-4xl font-extrabold opacity-50" style={{ color: "#1D4C6F" }}>Patient Info</p>
                <p className="mt-4 text-gray-500">將滑鼠移至左側病人姓名，以查看詳細資訊。</p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

/* ------------------------- EditableRow ------------------------- */
const EditableRow = ({
  columnName,
  initialValue,
  isInstructions = false,
  canEdit = true,
  onViewHistory,
}: {
  columnName: string;
  initialValue: string;
  isInstructions?: boolean;
  canEdit?: boolean;
  onViewHistory?: () => void;
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedValue, setEditedValue] = useState<string>(initialValue);

  const handleSave = () => {
    console.log(`Saving ${columnName}:`, editedValue); // fake save only
    setIsEditing(false);
  };

  const isLongText = (editedValue?.length ?? 0) > 80 || editedValue.includes("\n");

  const handleTextChange = (
    e: React.ChangeEvent<HTMLTextAreaElement | HTMLInputElement>
  ) => setEditedValue(e.target.value);

  return (
    <div className="flex items-start bg-white hover:bg-gray-50 transition-colors py-3 px-4 border-b border-gray-200">
      <div className="font-semibold text-gray-800 pt-1 flex-[0_0_25%]">{columnName}</div>

      <div className="flex-[1_1_65%] mr-4">
        {isEditing ? (
          isLongText ? (
            <textarea
              value={editedValue}
              onChange={handleTextChange}
              className="w-full border border-gray-300 p-1 rounded resize-y min-h-[80px] text-gray-700"
            />
          ) : (
            <input
              type="text"
              value={editedValue}
              onChange={handleTextChange}
              className="w-full border border-gray-300 p-1 rounded text-gray-700"
            />
          )
        ) : isInstructions ? (
          <div
            className="text-gray-700 leading-relaxed"
            dangerouslySetInnerHTML={{ __html: editedValue }}
          />
        ): (
          <span className="text-gray-700 whitespace-pre-wrap">{editedValue}</span>
        )}
      </div>

      <div className="w-28 flex flex-col justify-start items-end pt-1 space-y-2">
        {canEdit ? (
          isEditing ? (
            <button onClick={handleSave} className="text-white bg-green-500 hover:bg-green-600 text-xs px-3 py-1 rounded">Save</button>
          ) : (
            <button onClick={() => setIsEditing(true)} className="text-gray-700 border border-gray-400 hover:bg-gray-200 text-xs px-3 py-1 rounded">Edit</button>
          )
        ) : (
          <div className="flex items-center text-gray-400 text-xs select-none"><Lock className="h-3.5 w-3.5 mr-1" /> Locked</div>
        )}

        {isInstructions && !isEditing && (
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

/* ------------------------- Surgery Table ------------------------- */
const SurgeryTable = ({ surgeries }: { surgeries: UiSurgery[] }) => {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [historyList, setHistoryList] = useState<UiVersion[]>([]);

  const toggleDetails = (index: number) => setExpandedIndex(expandedIndex === index ? null : index);
  const openHistory = (versions: UiVersion[]) => { setHistoryList(versions); setIsHistoryOpen(true); };

  return (
    <div className="mt-8 text-base">
      {isHistoryOpen && (
        <HistoryModal versions={historyList} onClose={() => setIsHistoryOpen(false)} />
      )}
      <div className="text-sm font-light mb-2 text-gray-500">Table</div>

      <table className="min-w-full divide-y divide-gray-200 border-t border-gray-200">
        <thead className="bg-gray-50 text-gray-600 uppercase tracking-wider text-xs">
          <tr>
            <th className="px-4 py-2 text-left font-bold w-1/12">Index</th>
            <th className="px-6 py-2 text-left font-bold w-3/12">Status</th>
            <th className="px-6 py-2 text-left font-bold w-8/12">Guideline</th>
          </tr>
        </thead>

        <tbody className="bg-white divide-y divide-gray-200">
          {surgeries.map((s, idx) => (
            <React.Fragment key={s.id}>
              <tr onClick={() => toggleDetails(idx)} className="cursor-pointer hover:bg-blue-50 transition-colors">
                <td className="px-4 py-3 font-medium text-gray-900 w-1/12">{s.index}</td>
                <td className="px-6 py-3 text-gray-700 whitespace-nowrap w-3/12">{s.status}</td>
                <td className="px-6 py-3 text-blue-800 font-medium flex justify-between items-center w-8/12">
                  <span>{s.guideline.name}</span>
                  {expandedIndex === idx ? <ChevronUp className="h-4 w-4 text-gray-500" /> : <ChevronDown className="h-4 w-4 text-gray-500" />}
                </td>
              </tr>

              {expandedIndex === idx && (
                <tr>
                  <td colSpan={3} className="p-0 bg-gray-50 text-base">
                    <div className="divide-y divide-gray-200 border border-gray-300">
                      <EditableRow columnName="1. Guideline Name:" initialValue={s.guideline.name} canEdit={false} />
                      <EditableRow columnName="2. Guideline Description:" initialValue={s.guideline.description ?? ""} canEdit={false} />
                      <EditableRow
                        columnName="3. Latest Version:"
                        initialValue={`v${s.latestVersion.versionNo} · ${new Date(s.latestVersion.createdAt).toLocaleString()} · ${s.latestVersion.author.name}`}
                        canEdit={false}
                      />
                      {/* Only editable field */}
                      <EditableRow
                        columnName="4. Instructions:"
                        initialValue={formatInstructions(s.latestVersion.instructions)}
                        isInstructions
                        canEdit
                        onViewHistory={() => openHistory(s.versions)}
                      />
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

/* ------------------------- History Modal ------------------------- */
const HistoryModal = ({ versions, onClose }: { versions: UiVersion[]; onClose: () => void }) => {
  const [currentPage, setCurrentPage] = useState(versions.length > 0 ? versions.length - 1 : 0); // default to latest
  if (!versions || versions.length === 0) return null;
  const current = versions[currentPage];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-xl shadow-2xl w-full max-w-4xl max-h-[80vh] flex flex-col">
        <h3 className="text-2xl font-bold mb-4 border-b pb-2 text-gray-800">Version History</h3>

        <div className="flex-grow overflow-y-auto p-4 border rounded-lg bg-gray-50 mb-4">
          <p className="text-lg font-semibold mb-2">Version {current.versionNo} / {versions.length}</p>
          <p className="text-sm text-gray-500 mb-4">Edited by {current.author.name} on {new Date(current.createdAt).toLocaleString()}</p>
          <div className="text-gray-700 whitespace-pre-wrap border p-4 bg-white rounded-md min-h-[150px]">
            {formatInstructions(current.instructions)}
          </div>
        </div>

        <div className="flex justify-between items-center pt-2">
          <button onClick={onClose} className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300 text-gray-700">Close</button>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setCurrentPage((p) => Math.max(0, p - 1))}
              disabled={currentPage === 0}
              className={`px-4 py-2 rounded transition-colors ${currentPage === 0 ? "bg-gray-100 text-gray-400 cursor-not-allowed" : "bg-gray-400 text-white hover:bg-blue-900"}`}
            >
              Prev Ver.
            </button>
            {versions.length > 1 && (
              <button
                onClick={() => setCurrentPage((p) => Math.min(versions.length - 1, p + 1))}
                disabled={currentPage === versions.length - 1}
                className={`px-4 py-2 rounded transition-colors ${currentPage === versions.length - 1 ? "bg-gray-100 text-gray-400 cursor-not-allowed" : "bg-gray-400 text-white hover:bg-blue-900"}`}
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