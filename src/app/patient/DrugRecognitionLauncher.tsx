"use client";

import React, { useState } from "react";
import { Pill } from "lucide-react";

// Define response
type ApiResponse = {
  image_checked: { mime: string; size: number };
  inputs_used: { imprint: string; color: string; shape: string };
  user_med_list_count: number;
  versionIds: number[];
  decision: {
    matched: boolean;
    identified_name: string | null;
    confidence: number | null;
    reason: string | null;
    medication: { title: string | null; description: string | null } | null;
    message?: string;
  };
  verification: { strategy: string; links: { label: string; url: string }[] };
};

const PRIMARY_COLOR = "#1D4C6F";

// Define componment function
export default function DrugRecognitionLauncher({ userId }: { userId: number }) {
  // 狀態：控制 overlay 是否開啟
  const [isOverlayOpen, setIsOverlayOpen] = useState(false);

  // 狀態：上傳相關
  const [fileObj, setFileObj] = useState<File | null>(null);
  const [fileName, setFileName] = useState("No file chosen");

  // 狀態：手動輸入欄位
  const [pillWords, setPillWords] = useState("");
  const [pillColor, setPillColor] = useState("");
  const [pillShape, setPillShape] = useState("");

  // 狀態：API 呼叫
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [apiResp, setApiResp] = useState<ApiResponse | null>(null);

  // 選擇圖片
  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] || null;
    setFileObj(f);
    setFileName(f ? f.name : "No file chosen");
  }

  // 送出表單
  async function handleSubmit() {
    try {
      setLoading(true);
      setApiError(null);
      setApiResp(null);

      if (!userId) {
        setApiError("Lack of userId");
        return;
      }
      if (!fileObj) {
        setApiError("Please upload picture");
        return;
      }

      // Add attributes into form
      const fd = new FormData();
      fd.append("userId", String(userId));
      fd.append("image", fileObj);
      if (pillWords) fd.append("imprint", pillWords.trim());
      if (pillColor) fd.append("color", pillColor.trim());
      if (pillShape) fd.append("shape", pillShape.trim());

      const res = await fetch("/api/openAI", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) {
        setApiError(data?.error || `HTTP ${res.status}`);
        return;
      }

      setApiResp(data as ApiResponse);
    } catch (err: unknown) {
        const message =
            err instanceof Error ? err.message : "上傳失敗";
        setApiError(message);
    } finally {
        setLoading(false);
    }
  }

  return (
    <>
      {/* ✅ 右下角圓形浮動按鈕（FAB） */}
      <button
        onClick={() => setIsOverlayOpen(true)}
        aria-label="Pill Recognition"
        className="fixed z-[999] shadow-lg hover:brightness-110 active:brightness-95 transition"
        style={{
          bottom: "1.5rem", // right圖的位置：right-6/bottom-6
          right: "1.5rem",
          width: "5.7rem",
          height: "5.7rem",
          borderRadius: "50%",
          backgroundColor: PRIMARY_COLOR,
          color: "white",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          border: "none",
          cursor: "pointer",
        }}
      >
        {/* 若有安裝 lucide-react 就用圖示，沒有就註解掉 */}
        {<Pill className="w-6 h-6 mb-1" />}
        <span className="text-sm">Recognition</span>
      </button>

      {/* 全螢幕 Overlay */}
      {isOverlayOpen && (
        <div className="fixed inset-0 z-[1000] bg-white overflow-y-auto">
          <div className="max-w-4xl mx-auto p-8 relative">
            {/* 關閉按鈕 */}
            <button
              onClick={() => setIsOverlayOpen(false)}
              className="absolute right-6 top-4 text-5xl text-gray-500 hover:text-gray-800"
              aria-label="Close overlay"
            >
              &times;
            </button>

            <h2
              className="text-4xl font-bold text-center mb-8"
              style={{ color: PRIMARY_COLOR }}
            >
              Drug Image Analysis and Recognition
            </h2>

            {/* 上傳區 */}
            <div className="border-2 border-dashed border-gray-400 rounded-lg bg-gray-50 p-12 text-center">
              <p className="text-gray-600 mb-4">
                Please click or drag to upload a drug image
              </p>

              <input
                id="drug-upload"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileChange}
              />

              <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                <label
                  htmlFor="drug-upload"
                  className="cursor-pointer px-4 py-2 rounded-md text-white font-semibold"
                  style={{ backgroundColor: PRIMARY_COLOR }}
                >
                  Choose File
                </label>
                <span className="text-sm text-gray-700 border border-gray-300 rounded-md px-3 py-2 w-64 truncate">
                  {fileName}
                </span>
              </div>
            </div>

            {/* 手動輸入欄位 */}
            <div className="mt-8 p-6 bg-white border border-gray-300 rounded-lg shadow-md">
              <h3
                className="text-xl font-bold mb-4"
                style={{ color: PRIMARY_COLOR }}
              >
                Manual Pill Attributes
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                <div>
                  <label className="text-sm text-gray-700 mb-1 block">
                    Pill Words (Imprint)
                  </label>
                  <input
                    value={pillWords}
                    onChange={(e) => setPillWords(e.target.value)}
                    placeholder="e.g., A/342"
                    className="p-2 border border-gray-300 text-gray-800 rounded-md w-full focus:outline-none focus:ring-2 focus:ring-[#1D4C6F] focus:border-[#1D4C6F] placeholder-gray-400"
                  />
                </div>
                <div>
                  <label className="text-sm text-gray-700 mb-1 block">
                    Pill Color
                  </label>
                  <input
                    value={pillColor}
                    onChange={(e) => setPillColor(e.target.value)}
                    placeholder="e.g., White"
                    className="p-2 border border-gray-300 text-gray-800 rounded-md w-full focus:outline-none focus:ring-2 focus:ring-[#1D4C6F] focus:border-[#1D4C6F] placeholder-gray-400"
                  />
                </div>
                <div>
                  <label className="text-sm text-gray-700 mb-1 block">
                    Pill Shape
                  </label>
                  <input
                    value={pillShape}
                    onChange={(e) => setPillShape(e.target.value)}
                    placeholder="e.g., Round"
                    className="p-2 border border-gray-300 text-gray-800 rounded-md w-full focus:outline-none focus:ring-2 focus:ring-[#1D4C6F] focus:border-[#1D4C6F] placeholder-gray-400"
                  />
                </div>
              </div>

              <div className="mt-6 flex items-center gap-3">
                <button
                  onClick={handleSubmit}
                  disabled={loading}
                  className="px-4 py-2 rounded-md text-white font-semibold disabled:opacity-50"
                  style={{ backgroundColor: PRIMARY_COLOR }}
                >
                  {loading ? "Loading…" : "Delivered"}
                </button>
                {apiError && (
                  <span className="text-sm text-red-600">Error：{apiError}</span>
                )}
              </div>
            </div>

            {/* 顯示結果 */}
            {apiResp && (
            <div className="mt-8 p-6 bg-gray-50 border border-gray-300 rounded-lg shadow-md space-y-2 text-gray-800">
                <h3 className="text-xl font-bold mb-2 text-[#1D4C6F]">Analysis Summary</h3>
                
                <div>
                Input file：
                <span className="font-medium">{apiResp.image_checked?.mime}</span>
                （{apiResp.image_checked?.size} bytes）
                </div>

                <div>
                Pill name：
                <span className="font-semibold">{apiResp.decision?.identified_name ?? "-"}</span>
                </div>

                <div>
                Is the prescription signed ：
                <span
                    className={
                    apiResp.decision?.matched
                        ? "text-green-600 font-semibold"
                        : "text-red-600 font-semibold"
                    }
                >
                    {apiResp.decision?.matched ? "Yes" : "No"}
                </span>
                </div>

                <div>Confidence score：{apiResp.decision?.confidence ?? "-"}</div>
                <div>Reason：{apiResp.decision?.reason ?? "-"}</div>

                {!apiResp.decision?.matched && apiResp.decision?.message && (
                <div className="text-gray-700">{apiResp.decision.message}</div>
                )}

                {apiResp.decision?.medication && (
                <div className="mt-2 p-3 bg-white border border-gray-200 rounded-md">
                    <div>
                    Prescription Description：
                    <span className="text-gray-700">
                        {apiResp.decision.medication.description ?? "-"}
                    </span>
                    </div>
                </div>
                )}

                <div className="pt-2">
                {apiResp.verification?.links?.map((l) => (
                    <a
                    key={l.url}
                    href={l.url}
                    target="_blank"
                    className="underline mr-3 text-blue-600 hover:text-blue-800"
                    >
                    {l.label}
                    </a>
                ))}
                </div>
            </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
