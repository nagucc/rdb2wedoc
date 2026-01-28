'use client';

import React from 'react';
import { RefreshCw } from 'lucide-react';

/**
 * MappingFormFields 组件用于渲染映射配置的表单字段
 * 
 * 该组件包含以下功能：
 * - 映射名称输入
 * - 源数据库和表选择
 * - 目标企业微信账户、文档和子表选择
 * - 表数据刷新功能
 * - 各种加载状态处理
 * 
 * 组件设计遵循以下原则：
 * - 清晰的属性接口定义
 * - 完整的事件处理
 * - 响应式布局设计
 * - 支持深色模式
 * - 良好的用户体验（加载状态、禁用状态等）
 * 
 * 适用场景：
 * - 创建映射配置页面
 * - 编辑映射配置页面
 * - 任何需要配置数据源到目标映射的场景
 */

// 定义组件的属性接口
export interface MappingFormFieldsProps {
  // 映射名称
  name: string;
  onNameChange: (value: string) => void;
  
  // 源数据库
  selectedDatabase: string;
  onDatabaseChange: (value: string) => void;
  databases: { id: string; name: string; type: string }[];
  loadingDatabases: boolean;
  
  // 源表
  selectedTable: string;
  onTableChange: (value: string) => void;
  tables: { name: string; type: string }[];
  loadingTables: boolean;
  refreshingTables: boolean;
  onRefreshTables: () => void;
  
  // 目标企业微信账户
  selectedWeComAccount: string;
  onWeComAccountChange: (value: string) => void;
  wecomAccounts: { id: string; name: string; corpId: string }[];
  loadingWeComAccounts: boolean;
  
  // 目标文档和子表
  selectedDocument: string;
  onDocumentChange: (value: string) => void;
  documents: { id: string; name: string; accountId: string }[];
  loadingDocuments: boolean;
  
  selectedSheet: string;
  onSheetChange: (value: string) => void;
  sheets: { sheet_id: string; title: string }[];
  loadingSheets: boolean;
  refreshingSheets: boolean;
  onRefreshSheets: () => void;
  
  // 配置锁定状态
  isConfigLocked: boolean;
}

const MappingFormFields: React.FC<MappingFormFieldsProps> = ({
  name,
  onNameChange,
  selectedDatabase,
  onDatabaseChange,
  databases,
  loadingDatabases,
  selectedTable,
  onTableChange,
  tables,
  loadingTables,
  refreshingTables,
  onRefreshTables,
  selectedWeComAccount,
  onWeComAccountChange,
  wecomAccounts,
  loadingWeComAccounts,
  selectedDocument,
  onDocumentChange,
  documents,
  loadingDocuments,
  selectedSheet,
  onSheetChange,
  sheets,
  loadingSheets,
  refreshingSheets,
  onRefreshSheets,
  isConfigLocked
}) => {
  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
      {/* 映射名称 */}
      <div className="sm:col-span-2">
        <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          映射名称 <span className="text-red-500">*</span>
        </label>
        <input
          id="name"
          name="name"
          type="text"
          value={name}
          onChange={(e) => onNameChange(e.target.value)}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-3 py-2 border dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:focus:border-indigo-500 dark:focus:ring-indigo-500"
          placeholder="请输入映射名称"
          required
        />
      </div>

      {/* 源数据库 */}
      <div>
        <label htmlFor="sourceDatabase" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          源名称 <span className="text-red-500">*</span>
          {isConfigLocked && (
            <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300">
              已锁定
            </span>
          )}
        </label>
        <select
          id="sourceDatabase"
          name="sourceDatabase"
          value={selectedDatabase}
          onChange={(e) => onDatabaseChange(e.target.value)}
          disabled={isConfigLocked}
          className={`mt-1 block w-full rounded-md shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-3 py-2 border dark:focus:border-indigo-500 dark:focus:ring-indigo-500 ${
            isConfigLocked 
              ? 'border-gray-200 bg-gray-50 text-gray-500 cursor-not-allowed dark:border-gray-600 dark:bg-gray-800 dark:text-gray-500' 
              : 'border-gray-300 bg-white text-gray-900 dark:border-gray-600 dark:bg-gray-700 dark:text-white'
          }`}
          required
        >
          <option value="">请选择数据库</option>
          {loadingDatabases ? (
            <option disabled>加载中...</option>
          ) : databases.length === 0 ? (
            <option disabled>暂无可用数据库</option>
          ) : (
            databases.map((db) => (
              <option key={db.id} value={db.id}>
                {db.name} ({db.type})
              </option>
            ))
          )}
        </select>
        
        {/* 源表 */}
        {selectedDatabase && (
          <div className="flex gap-2">
            <select
              id="sourceTable"
              name="sourceTable"
              aria-label="源表"
              value={selectedTable}
              onChange={(e) => onTableChange(e.target.value)}
              disabled={isConfigLocked}
              className={`mt-2 flex-1 block w-full rounded-md shadow-sm focus:border:indigo-500 focus:ring-indigo-500 sm:text-sm px-3 py-2 border dark:focus:border-indigo-500 dark:focus:ring-indigo-500 ${
                isConfigLocked 
                  ? 'border-gray-200 bg-gray-50 text-gray-500 cursor-not-allowed dark:border-gray-600 dark:bg-gray-800 dark:text-gray-500' 
                  : 'border-gray-300 bg-white text-gray-900 dark:border-gray-600 dark:bg-gray-700 dark:text-white'
              }`}
              required
            >
              <option value="">请选择表</option>
              {loadingTables || refreshingTables ? (
                <option disabled>加载中...</option>
              ) : tables.length === 0 ? (
                <option disabled>暂无可用表</option>
              ) : (
                tables.map((table) => (
                  <option key={table.name} value={table.name}>
                    {table.name} ({table.type})
                  </option>
                ))
              )}
            </select>
            <button
              type="button"
              onClick={onRefreshTables}
              disabled={refreshingTables || !selectedDatabase || isConfigLocked}
              className="mt-2 flex items-center justify-center w-10 h-10 rounded-md border border-gray-300 bg-white text-gray-600 hover:bg-gray-50 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600 dark:hover:text-white dark:focus:ring-offset-gray-800"
              aria-label="刷新表格数据"
            >
              <RefreshCw 
                className={`w-6 h-6 ${refreshingTables ? 'animate-spin' : ''}`} 
              />
            </button>
          </div>
        )}
      </div>

      {/* 目标企业微信账户 */}
      <div>
        <label htmlFor="targetWeComAccount" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          目标名称 <span className="text-red-500">*</span>
          {isConfigLocked && (
            <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300">
              已锁定
            </span>
          )}
        </label>
        <select
          id="targetWeComAccount"
          name="targetWeComAccount"
          value={selectedWeComAccount}
          onChange={(e) => onWeComAccountChange(e.target.value)}
          disabled={isConfigLocked}
          className={`mt-1 block w-full rounded-md shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-3 py-2 border dark:focus:border-indigo-500 dark:focus:ring-indigo-500 ${
            isConfigLocked 
              ? 'border-gray-200 bg-gray-50 text-gray-500 cursor-not-allowed dark:border-gray-600 dark:bg-gray-800 dark:text-gray-500' 
              : 'border-gray-300 bg-white text-gray-900 dark:border-gray-600 dark:bg-gray-700 dark:text-white'
          }`}
          required
        >
          <option value="">请选择企业微信账户</option>
          {loadingWeComAccounts ? (
            <option disabled>加载中...</option>
          ) : wecomAccounts.length === 0 ? (
            <option disabled>暂无可用账户</option>
          ) : (
            wecomAccounts.map((account) => (
              <option key={account.id} value={account.id}>
                {account.name}
              </option>
            ))
          )}
        </select>
        
        {/* 目标文档 */}
        {selectedWeComAccount && (
          <select
            id="targetDocument"
            name="targetDocument"
            aria-label="目标文档"
            value={selectedDocument}
            onChange={(e) => onDocumentChange(e.target.value)}
            disabled={isConfigLocked}
            className={`mt-2 block w-full rounded-md shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-3 py-2 border dark:focus:border-indigo-500 dark:focus:ring-indigo-500 ${
              isConfigLocked 
                ? 'border-gray-200 bg-gray-50 text-gray-500 cursor-not-allowed dark:border-gray-600 dark:bg-gray-800 dark:text-gray-500' 
                : 'border-gray-300 bg-white text-gray-900 dark:border-gray-600 dark:bg-gray-700 dark:text-white'
            }`}
            required
          >
            <option value="">请选择智能表格</option>
            {loadingDocuments ? (
              <option disabled>加载中...</option>
            ) : documents.length === 0 ? (
              <option disabled>暂无可用文档</option>
            ) : (
              documents.map((doc) => (
                <option key={doc.id} value={doc.id}>
                  {doc.name}
                </option>
              ))
            )}
          </select>
        )}
        
        {/* 目标子表 */}
        {selectedDocument && (
          <div className="flex gap-2">
            <select
              id="targetSheet"
              name="targetSheet"
              aria-label="目标子表"
              value={selectedSheet}
              onChange={(e) => onSheetChange(e.target.value)}
              disabled={isConfigLocked}
              className={`mt-2 flex-1 block w-full rounded-md shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-3 py-2 border dark:focus:border-indigo-500 dark:focus:ring-indigo-500 ${
                isConfigLocked 
                  ? 'border-gray-200 bg-gray-50 text-gray-500 cursor-not-allowed dark:border-gray-600 dark:bg-gray-800 dark:text-gray-500' 
                  : 'border-gray-300 bg-white text-gray-900 dark:border-gray-600 dark:bg-gray-700 dark:text-white'
              }`}
              required
            >
              <option value="">请选择子表</option>
              {loadingSheets || refreshingSheets ? (
                <option disabled>加载中...</option>
              ) : sheets.length === 0 ? (
                <option disabled>暂无可用子表</option>
              ) : (
                sheets.map((sheet) => (
                  <option key={sheet.sheet_id} value={sheet.sheet_id}>
                    {sheet.title}
                  </option>
                ))
              )}
            </select>
            <button
              type="button"
              onClick={onRefreshSheets}
              disabled={refreshingSheets || !selectedDocument || isConfigLocked}
              className="mt-2 flex items-center justify-center w-10 h-10 rounded-md border border-gray-300 bg-white text-gray-600 hover:bg-gray-50 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600 dark:hover:text-white dark:focus:ring-offset-gray-800"
              aria-label="刷新子表数据"
            >
              <RefreshCw 
                className={`w-6 h-6 ${refreshingSheets ? 'animate-spin' : ''}`} 
              />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default MappingFormFields;
