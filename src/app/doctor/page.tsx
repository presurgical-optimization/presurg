"use client";

import React, { useState } from 'react';
import { User, LogOut, Calendar, Tag, Info, ChevronDown, ChevronUp } from 'lucide-react'; // 確保所有需要的圖示都已引入

// 模擬醫生資訊
const doctorInfo = {
  name: "Carrie Huang",
  id: "D9876",
};

// 模擬病人列表 (新增了詳細資訊)
const patientList = [
  { 
    id: 1, name: "Patient 1", mrn: "P001", patient_id: "123455", dob: "1980/01/15", 
    status: "Optimization Complete", note: "高血壓史，需確認麻醉評估。",
    surgeries: [
      { 
        index: 1, date: "10/10/2025 10:00", name: "Appendectomy", 
        definition: "Surgical removal of the appendix, usually performed to treat acute appendicitis.",
        details: [
          "Fasting: The patient should fast for at least 6–8 hours before surgery (no food or drink).",
          "Allergies: Check for any drug allergies, especially to antibiotics or anesthetics.",
          "Informed Consent: Explain the surgical procedure, possible risks, and obtain written consent.",
          "Bowel Preparation: Usually not required for uncomplicated appendectomy, but may be considered for laparoscopic procedures.",
          "IV Access: Establish intravenous line for fluids and medications.",
          "Preoperative Antibiotics: Administer broad-spectrum antibiotics (e.g., ceftriaxone + metronidazole) to reduce infection risk.",
          "Vital Signs and Assessment: Record baseline temperature, blood pressure, heart rate, and pain level."
        ]
      },
      { index: 2, date: "10/20/2025 12:00", name: "Cholecystectomy", definition: "Removal of the gallbladder.", details: ["Fasting: 8 hours", "Informed Consent: Done"] },
      { index: 3, date: "12/19/2025 15:00", name: "Knee Arthroscopy", definition: "Minimally invasive knee surgery.", details: ["Fasting: 6 hours", "Consent: Done", "Pre-Op Check: Complete"] },
    ]
  },
  // 為了簡化，其他病人可以只提供基礎數據
  { id: 2, name: "Patient 2", mrn: "P002", patient_id: "123456", dob: "1995/05/20", status: "Optimization Complete", note: "無特殊問題，已準備手術。", surgeries: [] },
  { id: 3, name: "Patient 3", mrn: "P003", patient_id: "123457", dob: "1972/11/05", status: "Waiting for Lab", note: "等待 INR 報告。", surgeries: [] },
  { id: 4, name: "Patient 4", mrn: "P004", patient_id: "123458", dob: "2000/03/10", status: "Initial Intake", note: "新病人，資料待補齊。", surgeries: [] },
];
// const patientList = [
//   { id: 1, name: "Patient 1", mrn: "P001", dob: "1980/01/15", status: "Pre-Op Check", note: "高血壓史，需確認麻醉評估。" },
//   { id: 2, name: "Patient 2", mrn: "P002", dob: "1995/05/20", status: "Optimization Complete", note: "無特殊問題，已準備手術。" },
//   { id: 3, name: "Patient 3", mrn: "P003", dob: "1972/11/05", status: "Waiting for Lab", note: "等待 INR 報告。" },
//   { id: 4, name: "Patient 4", mrn: "P004", dob: "2000/03/10", status: "Initial Intake", note: "新病人，資料待補齊。" },
// ];

export default function DoctorViewPage() {
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  // 【新狀態】：追蹤目前滑鼠懸停/選中的病人
  const [selectedPatient, setSelectedPatient] = useState(null); // null 或 patient object

  const toggleProfile = () => {
    setIsProfileOpen(!isProfileOpen);
  };

  // 當滑鼠移到按鈕上時，設定選中的病人
  const handlePatientHover = (patient) => {
    setSelectedPatient(patient);
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: '#F0F0F0' }}> 
      
      {/* ... (Header 保持不變) ... */}
      <header 
        // 移除 mb-8 讓 header 和 main 之間的空間更緊湊
        className="w-full p-4 flex items-center shadow-lg relative" 
        // 使用您要求的深藍色主題
        style={{ backgroundColor: '#1D4C6F' }} 
      >
        {/* Hackathon Logo (左上角 - 複製您提供的樣式) */}
        <div className="flex-none mt-[-30px] ml-[-5px]">
            <h1 
                className="text-xl font-serif italic font-bold tracking-widest opacity-35"
                style={{ color: 'white' }}>Hackathon</h1> 
        </div>

        {/* 中间 - Doctor's Name */}
        <div className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2">
            <p className="text-4xl font-serif italic font-bold text-white tracking-widest">
                {doctorInfo.name}
            </p>
        </div>

        {/* --- 右侧用户图标及下拉菜单容器 --- */}
        <div className="relative ml-auto">
          <button 
            onClick={toggleProfile}
            className="p-2 rounded-full hover:bg-white/10 transition-colors" 
            aria-label="Toggle Doctor Profile"
          >
            {/* User 圖標使用白色以配合深色背景 */}
            <User 
                className="h-8 w-8 cursor-pointer text-white" 
            />
          </button>

          {/* 下拉菜单 (Dropdown Content) */}
          {isProfileOpen && (
            <div className="absolute right-0 mt-3 w-64 bg-white rounded-lg shadow-xl py-3 z-10 border border-gray-200">
              <div className="px-4 pb-2 border-b">
                <h3 className="text-lg font-bold text-gray-900">{doctorInfo.name}</h3>
                <p className="text-xs text-gray-500">ID: {doctorInfo.id}</p>
              </div>
              <div className="pt-2 border-t text-center">
                <button className="flex items-center justify-center w-full py-2 text-sm text-red-600 hover:bg-red-50 transition-colors">
                    <LogOut className="h-4 w-4 mr-2" />
                    Log out
                </button>
              </div>
            </div>
          )}
        </div>
      </header>

      {/* --- 主要內容區 (Main Content) --- */}
      <main className="flex-grow flex p-8">
        
        {/* --- 左側：病人列表 (w-1/4) --- 補回按鈕渲染邏輯 */}
        <div className="w-1/5 flex flex-col justify-start items-center pr-4 space-y-4">
            {patientList.map((patient) => (
              <button
                key={patient.id}
                onMouseEnter={() => handlePatientHover(patient)}
                className={`
                  w-full py-6 px-4 rounded-xl text-center transition-all duration-300 ease-in-out
                  font-extrabold text-xl tracking-wider text-gray-800
                  ${selectedPatient?.id === patient.id 
                    ? 'bg-[#D0E6F0]' // 選中時的背景色（取代 style）
                    : 'bg-[#EBF4F8]' // 默認的背景色（取代 style）
                  }
                `}
                style={{ 
                    // backgroundColor: selectedPatient?.id === patient.id ? '#D0E6F0' : '#EBF4F8',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.06)' 
                }}
              >
                {patient.name}
              </button>
            ))}
        </div>

        {/* --- 右側：病人資訊顯示 (w-2/3) --- */}
        <div className="w-4/5 pl-4">
          <div 
            // 【修改點 A】：新增 relative 讓 Edit 按鈕可以絕對定位
            className="w-full h-full p-8 rounded-xl shadow-2xl flex flex-col relative" 
            style={{ 
                backgroundColor: 'white',
                border: '1px solid #cce8f5' 
            }}
          >
            {/* 條件渲染：根據是否有選中的病人顯示內容 */}
            {selectedPatient ? (
              <div className="text-gray-700"> 
                
                {/* 1. 病人姓名 (Patient Name) - 匹配圖片樣式 */}
                <h2 className="text-2xl font-extrabold mb-1" style={{ color: '#1D4C6F' }}>
                  {selectedPatient.name}
                </h2>
                
                {/* 2. 基本資訊 - 匹配圖片樣式 */}
                <div className="text-base space-y-1 mb-6 text-gray-700">
                    <p>MRN: <span className="font-semibold">{selectedPatient.mrn}</span></p>
                    {/* patient_id 需要在 patientList 中添加 */}
                    <p>ID: <span className="font-semibold">{selectedPatient.patient_id || 'N/A'}</span></p>
                    <p>Current Status: <span className="font-semibold text-green-600">{selectedPatient.status}</span></p>
                </div>

                {/* 3. 【整合新組件】手術歷史表格 */}
                {selectedPatient.surgeries && selectedPatient.surgeries.length > 0 ? (
                    <SurgeryTable surgeries={selectedPatient.surgeries} />
                ) : (
                    <p className="mt-8 text-center text-gray-500">No Surgery Record</p>
                )}
                
              </div>
            ) : (
              // 預設提示訊息 - 垂直居中
              <div className="flex flex-col items-center justify-center h-full text-center">
                <p className="text-4xl font-extrabold opacity-50" style={{ color: '#1D4C6F' }}>
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

// 【新增組件：可編輯的表格行】
const EditableRow = ({columnName, initialValue, isSurgeryName = false}) => {
    // state: 追蹤該行是否處於編輯模式 (true: 顯示輸入框; false: 顯示文字)
    const [isEditing, setIsEditing] = useState(false)
    // state：儲存用戶在編輯模式下輸入的值。初始值為傳入的 initialValue
    const [editedValue, setEditedValue] = useState(initialValue)

    // 處理「儲存」按鈕點擊的函數
    const handleSave = () => {
        // 實際的資料庫更新 API 呼叫將在未來加到這裡
        // 目前只是在控制台輸出儲存的內容，模擬儲存操作
        console.log(`Saving ${columnName}: ${editedValue}`)
        setIsEditing(false);
    };

    const handleEdit = () => {
        // 將編輯狀態設為 true，切換到編輯模式 (顯示輸入框)。
        setIsEditing(true)
    }

    // 根據 isEditing 狀態，渲染值或輸入控制項的函數
    const renderValue = () => {
        // 判斷輸入為長短文本
        const isLongText = (editedValue && editedValue.length > 50) || (editedValue && editedValue.includes('\n'));

        if (isEditing) {
            return isLongText ? (
                <textarea
                      value={editedValue} // 輸入框的值綁定到 editedValue 狀態。
                      onChange={(e) => setEditedValue(e.target.value)} // 輸入時同步更新狀態。
                      className="w-full border border-gray-300 p-1 rounded resize-y min-h-[50px] text-gray-700"
                />
            ) : (
                // 如果是短文本，渲染 <input type="text">
                <input
                  type="text"
                  value={editedValue} // 輸入框的值綁定到 editedValue 狀態。
                  onChange={(e) => setEditedValue(e.target.value)} // 輸入時同步更新狀態。
                  className="w-full border border-gray-300 p-1 rounded text-gray-700"
                />
            );
        }

        const valueClass = isSurgeryName ? "text-blue-700 font-semibold whitespace-pre-wrap" : "text-gray-700 whitespace-pre-wrap";
        return <span className={valueClass}>{editedValue}</span>;
    }

    // 組件的實際渲染結果
    return (
      // 使用 div 模擬表格行，應用邊界和間隔
        <div className="flex items-start bg-white hover:bg-gray-50 transition-colors py-3 px-4 border-b border-gray-200">
            
            {/* 1. 欄位名稱 (Column Name) - 約 25% 寬度，固定不縮 (flex-[0_0_25%]) */}
            <div className="font-semibold text-gray-800 pt-1 flex-[0_0_25%]">
                {columnName}
            </div>

            {/* 2. 值 / 輸入框 (Value / Input) - 約 65% 寬度，可伸展 (flex-[1_1_65%]) */}
            <div className="flex-[1_1_65%] mr-4">
                {renderValue()}
            </div>

            {/* 3. 動作按鈕 (Action) - 約 10% 寬度，固定不縮 (flex-[0_0_10%])，推到最右 */}
            <div className="flex-[0_0_10%] flex justify-end pt-1">
                {isEditing ? (
                    <button 
                        onClick={handleSave} 
                        className="text-white bg-green-500 hover:bg-green-600 text-xs px-3 py-1 rounded" 
                    >
                        Save
                    </button>
                ) : (
                    <button 
                        onClick={handleEdit} 
                        className="text-gray-700 border border-gray-400 hover:bg-gray-200 text-xs px-3 py-1 rounded" 
                    >
                        Edit
                    </button>
                )}
            </div>
        </div>
//     // 表格的行元素，設置背景色、hover 效果和過渡動畫。
//     <tr className="bg-white hover:bg-gray-50 transition-colors">
//       {/* 第一欄：欄位名稱 (Label) */}
//       <td className="px-4 py-2 font-semibold w-1/4 align-top">{columnName}</td>
//       {/* 第二欄：值 (Value) */}
//       <td className="px-4 py-2 w-2/4 align-top">
//         {renderValue()} {/* 渲染值或輸入框 */}
//       </td>
//       {/* 第三欄：動作按鈕 (Action) */}
//       <td className="px-4 py-2 w-1/12 text-center align-top">
//         
//         {isEditing ? (
//           <button 
//             onClick={handleSave} // 點擊執行儲存模擬
//             className="text-white bg-green-500 hover:bg-green-600 text-xs px-3 py-1 rounded" // Save 按鈕的綠色樣式
//           >
//             Save
//           </button>
//         ) : (
//           <button 
//             onClick={handleEdit} // 點擊切換到編輯模式
//             className="text-gray-700 border border-gray-400 hover:bg-gray-200 text-xs px-3 py-1 rounded" // Edit 按鈕的邊框樣式
//           >
//             Edit
//           </button>
//         )}
//       </td>
//     </tr>
  );
}

// 【新增組件：可展開的手術表格】
const SurgeryTable = ({ surgeries }) => {
  const [expandedIndex, setExpandedIndex] = useState(null);

  const toggleDetails = (index) => {
    setExpandedIndex(expandedIndex === index ? null : index);
  };

  return (
    <div className="mt-8 text-base">
      {/* 匹配您的圖片樣式：Table 位於左上角 */}
      <div className="text-sm font-light mb-2 text-gray-500">Table</div>

      <table className="min-w-full divide-y divide-gray-200 border-t border-gray-200">
        
        {/* 表格標頭 */}
        <thead className="bg-gray-50 text-gray-600 uppercase tracking-wider text-xs">
          <tr>
            <th className="px-4 py-2 text-left font-bold w-1/12">Index</th>
            <th className="px-6 py-2 text-left font-bold w-3/12">Date/Time</th>
            <th className="px-6 py-2 text-left font-bold w-8/12">Surgery Name / Notes</th>
          </tr>
        </thead>
        
        {/* 表格內容 */}
        <tbody className="bg-white divide-y divide-gray-200">
          {surgeries.map((surgery, index) => (
            <React.Fragment key={surgery.index}>
              
              {/* 可點擊的表格行 */}
              <tr 
                onClick={() => toggleDetails(index)}
                className="cursor-pointer hover:bg-blue-50 transition-colors"
              >
                <td className="px-4 py-3 font-medium text-gray-900 w-1/12">{surgery.index}</td>
                <td className="px-6 py-3 text-gray-700 whitespace-nowrap w-3/12">{surgery.date}</td>
                <td className="px-6 py-3 text-blue-800 font-medium flex justify-between items-center w-8/12">
                    <span>{surgery.name}</span>
                    <span className="flex-shrink-0 ml-4">
                        {expandedIndex === index ? (
                            <ChevronUp className="h-4 w-4 text-gray-500" />
                        ) : (
                            <ChevronDown className="h-4 w-4 text-gray-500" />
                        )}
                    </span>
                </td>
              </tr>
              
              {/* 展開的詳細資訊行 */}
              {expandedIndex === index && (
                     <tr>
                  {/* 【修改點 1】：移除 p-6 padding，改為 p-0，讓 EditableRow 內部控制 padding */}
                  <td colSpan="3" className="p-0 bg-gray-50 text-base"> 
                    <div className="space-y-0"> {/* 【修改點 2】：移除 space-y-4 */}
                      
                      {/* 【修改點 3】：移除內部的 table/thead，直接使用 div 容器 */}
                      <div className="divide-y divide-gray-200 border border-gray-300">
                        {/* 這裡不再需要 Column Name/Value/Action 的標題列 */}
                        
                        {/* Surgery Name */}
                        <EditableRow
                            columnName="1. Surgery Name:" 
                            initialValue={surgery.name} 
                            isSurgeryName={true}
                        />
                        {/* Date/Time */}
                        <EditableRow
                            columnName="2. Date/Time:" 
                            initialValue={surgery.date}
                        />
                        {/* Definition */}
                        {surgery.definition && (
                            <EditableRow
                                columnName="3. Definition:"
                                initialValue={surgery.definition}
                            />
                        )}
                        {/* 術前考量列表 - 轉為表格行 */}
                        {surgery.details?.map((detail, detailIndex) => {
                            const separatorIndex = detail.indexOf(':');
                            // 修正：確保 title 包含冒號，content 移除前導空白
                            const title = separatorIndex !== -1 ? detail.substring(0, separatorIndex + 1) : detail;
                            const content = separatorIndex !== -1 ? detail.substring(separatorIndex + 1) : '';
                            
                            // 【修改點 4】：調整編號，從 4. 開始
                            const numberedTitle = `${detailIndex + 4}. ${title}`;
                            
                            return (
                                <EditableRow    
                                    key={detailIndex}
                                    columnName={numberedTitle} // 使用 columnName
                                    initialValue={content.trim()} // 清理內容前的空白
                                    />
                            );
                        })}
                      </div>
                      <div className="text-gray-800 mt-4">
                        <ul className="space-y-3 list-disc list-inside ml-4">
                        </ul>
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
