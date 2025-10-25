"use client"; // 标记为客户端组件以使用 useState

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
    <button 
        onClick={toggleOverlay}
        // 使用 style 屬性定義所有視覺樣式
        style={{ 
            backgroundColor: '#1D4C6F', // 您的目標顏色
            position: 'fixed',
            bottom: '2rem',         // 等同於 bottom-6
            right: '1.5rem',          // 等同於 right-6
            width: '5.7rem',            // 等同於 w-16
            height: '5.7rem',           // 等同於 h-16

            borderRadius: '50%',      // 等同於 rounded-full
            color: 'white',           // 等同於 text-white
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '0.9rem',      // 等同於 text-xs
            padding: '0.25rem',       // 等同於 p-1
            boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)', // 等同於 shadow-lg
            opacity: 0.95,
            zIndex: 999,              // 等同於 z-[999]
            cursor: 'pointer',
            border: 'none',
            transition: 'filter 0.3s ease-in-out', // 添加過渡效果
        }}
        aria-label="Pill Instruction"
      >
        <Pill className="h-6.5 w-6.5 mb-0.5" />
        Recognition
      </button>

      {/* =================================================== */}
      {/* *** 2. 全螢幕覆蓋層 (Full-screen Overlay) - 條件渲染實現「跳轉」 *** */}
      {/* =================================================== */}
      {isOverlayOpen && (
        <div 
          className="fixed inset-0 w-full h-full bg-white z-[1000] overflow-y-auto"
        >
          <div className="max-w-4xl mx-auto p-8">
            
            {/* 關閉按鈕 */}
            <button 
              onClick={toggleOverlay}
              className="absolute top-4 right-6 text-5xl font-light text-gray-500 hover:text-gray-800"
              aria-label="Close"
            >
              &times;
            </button>
            
            {/* 覆蓋層標題 */}
            <h2 className="text-4xl font-bold text-center mb-8" style={{ color: PRIMARY_COLOR }}>
              Drug image analysis and recognition
            </h2>
            
            {/* 上傳內容區塊 */}
            <div className="border-2 border-dashed border-gray-400 p-16 text-center rounded-lg bg-gray-50">
                <p className="text-lg text-gray-600 mb-4">
                    Please click or drag to upload a drug image
                </p>
                <input 
                    type="file" 
                    id="drug-file-upload"
                    accept="image/*" 
                    className="hidden" // 隱藏原生 input
                    onChange={handleFileChange}
                />

                {/* 2. 【新增】按鈕和狀態文字容器 */}
                <div className="flex justify-center items-center space-x-2">
                    {/* 3. 【新增】模擬按鈕的 <label> 元素 - 顯示英文，並作為用戶點擊的按鈕 */}
                    <label 
                        htmlFor="drug-file-upload" // **【重要】連結到隱藏的 input**
                        className="cursor-pointer px-4 py-2 border rounded-md font-semibold text-sm text-white transition-colors"
                        style={{ backgroundColor: PRIMARY_COLOR, borderColor: PRIMARY_COLOR }} 
                    >
                        Choose File {/* **【英文按鈕文字】** */}
                    </label>

                    {/* 4. 【新增】顯示檔案名稱的 <span> 元素 - 顯示英文狀態 */}
                    <span className="text-sm text-gray-600 border border-gray-300 rounded-md px-3 py-2 w-64 text-left truncate">
                        {selectedFileName} {/* 顯示 "No file chosen" 或檔案名稱 */}
                    </span>
                </div>

            </div>

            {/* =================================================== */}
            {/* *** 【修正】手動輸入欄位區塊 (Pill Attributes Input) *** */}
            {/* =================================================== */}
            <div className="mt-8 mb-8 p-6 bg-white border border-gray-300 rounded-lg shadow-md">
                <h3 className="text-xl font-bold mb-4" style={{ color: PRIMARY_COLOR }}>
                    Manual Pill Attributes
                </h3>
                
                {/* 關鍵修正：將 md:grid-cols-3 改為 grid-cols-3，確保三個欄位在單一列上平行排列 */}
                <div className="grid grid-cols-3 gap-6"> 
                    {/* 1. Pill Words */}
                    <div className="flex flex-col">
                        <label htmlFor="pill-words" className="text-sm font-medium text-gray-700 mb-1">
                            Pill Words (Imprint)
                        </label>
                        <input
                            id="pill-words"
                            type="text"
                            value={pillWords}
                            onChange={(e) => setPillWords(e.target.value)}
                            placeholder="e.g., A/342, Mylan"
                            className="p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                        />
                    </div>
                    
                    {/* 2. Pill Color */}
                    <div className="flex flex-col">
                        <label htmlFor="pill-color" className="text-sm font-medium text-gray-700 mb-1">
                            Pill Color
                        </label>
                        <input
                            id="pill-color"
                            type="text"
                            value={pillColor}
                            onChange={(e) => setPillColor(e.target.value)}
                            placeholder="e.g., Red, White"

                            className="p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                        />
                    </div>

                    {/* 3. Pill Shape */}
                    <div className="flex flex-col">
                        <label htmlFor="pill-shape" className="text-sm font-medium text-gray-700 mb-1">
                            Pill Shape
                        </label>
                        <input
                            id="pill-shape"
                            type="text"
                            value={pillShape}
                            onChange={(e) => setPillShape(e.target.value)}
                            placeholder="e.g., Round, Oval"
                            className="p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                        />
                    </div>
                </div>
            </div>

            {/* 識別結果 placeholder */}
            <div className="mt-8 p-6 bg-white border rounded-lg shadow-md">
                <h3 className="text-xl font-semibold mb-3">Analysis Summary</h3>
                <p className="text-gray-500">outcomes</p>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}