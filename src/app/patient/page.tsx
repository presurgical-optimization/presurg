"use client"; // 标记为客户端组件以使用 useState
import DrugRecognitionLauncher from "./DrugRecognitionLauncher";
import React, { useState } from 'react';
import { User, X, Calendar, MapPin, Tag, Pill } from 'lucide-react'; // 圖示
const PRIMARY_COLOR = '#1D4C6F';

export default function PresurgicalOptimizationPage() {
  // 状态：用于控制下拉菜单的显示/隐藏
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  // 【新增】狀態 1：用於儲存選中的檔案名稱 (顯示英文訊息)
  const [selectedFileName, setSelectedFileName] = useState("No file chosen");

  // 【重要：修正您錯誤的地方】新增狀態：用於儲存手動輸入的藥丸資訊
  const [pillWords, setPillWords] = useState(''); // <-- 這裡必須定義
  const [pillColor, setPillColor] = useState(''); // <-- 這裡必須定義
  const [pillShape, setPillShape] = useState(''); // <-- 這裡必須定義

  // 示例病人基本信息
  const patientInfo = {
    name: "Emily Johnson",
    dob: "1985 年 3 月 15 日",
    mrn: "12345678", // 待顯示
    role: "Patient",
  };

  // 状态：用于控制下拉菜单的显示/隐藏
  const toggleProfile = () => {
    setIsProfileOpen(!isProfileOpen);
  };

  // *** isOverlayOpen(新增) 狀態 2：用於控制全屏覆蓋層的顯示/隱藏 ***
  const [isOverlayOpen , setIsOverlayOpen] = useState(false); // <-- 這行很重要

  // *** 切换全屏覆蓋層的函数 ***
  const toggleOverlay = () => { // <-- 這是您程式碼中缺少的定義
    setIsOverlayOpen(!isOverlayOpen);
  };

  // 處理檔案變化的函數：當用戶選擇檔案時會調用此函式
  const handleFileChange = (event) => { 
    const file = event.target.files[0]; // 獲取用戶選擇的第一個檔案

    if (file) {
      // 如果選擇了檔案，將其名稱設定為 selectedFileName 狀態
      setSelectedFileName(file.name); 
    } else {
      // 如果沒有選擇檔案（例如點擊了取消），重置為預設英文訊息
      setSelectedFileName("No file chosen");
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-100">
      
      {/* --- 標題欄--- */}
      <header className="w-full p-4 flex items-center shadow-md"
    style={{ backgroundColor: '#1D4C6F' }}>
        {/* Hackathon Logo */}
        <div className="flex-none mt-[-30px] ml-[-5px]">
            <h1 
        className="text-xl font-serif italic font-bold tracking-widest opacity-35"
        style={{ color: 'white' }}>Hackathon</h1>
        </div>

        {/* 中间 */}
        <div className="absolute left-1/2 transform -translate-x-1/2">
            <p className="text-4xl font-serif italic font-bold text-white tracking-widest">
                {patientInfo.name}
            </p>
        </div>

        {/* --- 右侧用户图标及下拉菜单容器 --- */}
        <div className="relative ml-auto">
          <button 
            onClick={toggleProfile}
            // 【修改 1】：将 hover 颜色改为 bg-blue-100，使其更浅，与 Banner 背景更协调
            className="p-2 rounded-full hover:bg-white/10 transition-colors"
            aria-label="Toggle Patient Profile"
          >
            {/* 【修改 2】：移除 text-blue-300，使用内联样式设置自定义颜色 */}
            <User 
                className="h-8 w-8 cursor-pointer"
                style={{ color: 'white' }}
            />
          </button>

          {/* 下拉菜单 (Dropdown Content) */}
          {isProfileOpen && (
            <div className="absolute right-0 mt-3 w-72 bg-white rounded-lg shadow-xl py-3 z-10 border border-gray-200">
              <div className="px-4 pb-2 border-b">
                <h3 className="text-lg font-bold text-gray-900">{patientInfo.name}</h3>
                <p className="text-xs text-gray-500">UserId: {patientInfo.mrn}</p>
              </div>
              <div className="p-4 text-sm text-gray-700 space-y-2">
                <div className="flex items-center">
                  <Calendar className="h-4 w-4 mr-2 text-gray-400" />
                  Birthday: {patientInfo.dob}
                </div>
                <div className="flex items-center">
                  <Tag className="h-4 w-4 mr-2 text-gray-400" />
                  Role: {patientInfo.role}
                  
                </div>
                {/* 您可以在这里添加更多基本信息 */}
              </div>
              <div className="pt-2 border-t text-center">
                <button className="text-sm text-indigo-600 hover:text-indigo-800 transition-colors">
                  Log out
                </button>
              </div>
            </div>
          )}
        </div>
      </header>

      {/* --- 中间主要内容框架 (Summary Content) --- */}
      <main className="flex-grow bg-white p-8 shadow-inner">
        <div className="max-w-4xl mx-auto">
          {/* 这里是 Summary 的主体内容，为了简洁，使用占位符，但您可以使用您之前完整的表格代码替换这里 */}
          <h2 className="text-3xl font-bold text-center mt-[-1.7rem] mb-2" style={{ color: '#1D4C6F' }}>

            Presurgical Optimization Summary
          </h2>

          <div className="space-y-4">
            <h3 className="text-xl font-semibold" style={{ color: '#1D4C6F'}}>Patient Information Placeholder</h3>
            <div className="h-20 bg-white rounded p-4 border" style={{ borderColor: '#1D4C6F' }}>
              <p>Patient Information Placeholder</p>
            </div>

            <h3 className="text-xl font-semibold" style={{ color: '#1D4C6F' }}>Preoperative Testing</h3>
            <div className="h-40 bg-white rounded p-4 border" style={{ borderColor: '#1D4C6F' }}>
            </div>
            
            <h3 className="text-xl font-semibold" style={{ color: '#1D4C6F' }}>Medication Instructions</h3>
            <div className="h-32 bg-white rounded p-4 border" style={{ borderColor: '#1D4C6F' }}>
              <p>Table content placeholder...</p>
            </div >
          </div>

        </div>
      </main>

    {/* =================================================== */}
    {/* *** 1. 右下角的浮動圓形按鈕 (Pill Instruction Button) *** */}
    {/* =================================================== */}
    <DrugRecognitionLauncher userId={105} />
    </div>
  );
}