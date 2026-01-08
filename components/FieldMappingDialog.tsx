'use client';

import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { FieldMappingUI, DatabaseField, DocumentField } from '@/types';

interface FieldMappingDialogProps {
  show: boolean;
  onClose: () => void;
  onSave: (mapping: FieldMappingUI) => void;
  mapping?: FieldMappingUI | null;
  databaseFields: DatabaseField[];
  documentFields: DocumentField[];
  loadingDatabaseFields: boolean;
  loadingDocumentFields: boolean;
}

export default function FieldMappingDialog({
  show,
  onClose,
  onSave,
  mapping,
  databaseFields,
  documentFields,
  loadingDatabaseFields,
  loadingDocumentFields
}: FieldMappingDialogProps) {
  const [formData, setFormData] = useState<FieldMappingUI>({
    id: `field_${Date.now()}`,
    databaseColumn: '',
    documentField: '',
    documentFieldId: '',
    dataType: 'string',
    transform: '',
    defaultValue: '',
    required: false,
    description: ''
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  // 当编辑的映射项变化时，更新表单数据
  useEffect(() => {
    if (mapping) {
      setFormData(mapping);
    } else {
      setFormData({
        id: `field_${Date.now()}`,
        databaseColumn: '',
        documentField: '',
        documentFieldId: '',
        dataType: 'string',
        transform: '',
        defaultValue: '',
        required: false,
        description: ''
      });
    }
    setErrors({});
  }, [mapping]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const target = e.target as HTMLInputElement;
    const { name, value, type } = target;
    const checked = target.type === 'checkbox' ? target.checked : undefined;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleDocumentFieldChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    const selectedField = documentFields.find(f => f.id === value);
    
    setFormData(prev => ({
      ...prev,
      documentFieldId: value,
      documentField: selectedField?.name || ''
    }));
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.databaseColumn) {
      newErrors.databaseColumn = '请选择源字段';
    }

    if (!formData.documentFieldId) {
      newErrors.documentField = '请选择目标字段';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = () => {
    if (validateForm()) {
      onSave(formData);
      onClose();
    }
  };

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50 animate-fade-in">
      <div 
        className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 对话框头部 */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
            {mapping ? '编辑字段映射' : '添加字段映射'}
          </h3>
          <button
            onClick={onClose}
            className="flex items-center justify-center w-8 h-8 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            aria-label="关闭"
          >
            <X className="h-5 w-5 text-gray-500 dark:text-gray-400" />
          </button>
        </div>

        {/* 对话框内容 */}
        <div className="p-6 space-y-6">
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            {/* 源字段 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1 dark:text-gray-300">
                源字段 <span className="text-red-500">*</span>
              </label>
              <select
                name="databaseColumn"
                value={formData.databaseColumn}
                onChange={handleInputChange}
                disabled={loadingDatabaseFields}
                className={`block w-full rounded-md border ${errors.databaseColumn ? 'border-red-500' : 'border-gray-300'} shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-3 py-2 dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:focus:border-indigo-500 dark:focus:ring-indigo-500 disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed dark:disabled:bg-gray-700 dark:disabled:text-gray-400`}
              >
                <option value="">请选择源字段</option>
                {loadingDatabaseFields ? (
                  <option disabled>加载中...</option>
                ) : databaseFields.length === 0 ? (
                  <option disabled>暂无可用字段</option>
                ) : (
                  databaseFields.map((field) => (
                    <option key={field.name} value={field.name}>
                      {field.name} ({field.type})
                    </option>
                  ))
                )}
              </select>
              {errors.databaseColumn && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.databaseColumn}</p>
              )}
            </div>

            {/* 目标字段 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1 dark:text-gray-300">
                目标字段 <span className="text-red-500">*</span>
              </label>
              <select
                name="documentFieldId"
                value={formData.documentFieldId}
                onChange={handleDocumentFieldChange}
                disabled={loadingDocumentFields}
                className={`block w-full rounded-md border ${errors.documentField ? 'border-red-500' : 'border-gray-300'} shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-3 py-2 dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:focus:border-indigo-500 dark:focus:ring-indigo-500 disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed dark:disabled:bg-gray-700 dark:disabled:text-gray-400`}
              >
                <option value="">请选择目标字段</option>
                {loadingDocumentFields ? (
                  <option disabled>加载中...</option>
                ) : documentFields.length === 0 ? (
                  <option disabled>暂无可用字段</option>
                ) : (
                  documentFields.map((field) => (
                    <option key={field.id} value={field.id}>
                      {field.name} ({field.type})
                    </option>
                  ))
                )}
              </select>
              {errors.documentField && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.documentField}</p>
              )}
            </div>

            {/* 数据类型 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1 dark:text-gray-300">
                数据类型
              </label>
              <select
                name="dataType"
                value={formData.dataType}
                disabled
                title="该功能暂未开放"
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-3 py-2 border dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:focus:border-indigo-500 dark:focus:ring-indigo-500 disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed dark:disabled:bg-gray-700 dark:disabled:text-gray-400"
              >
                <option value="string">字符串</option>
                <option value="number">数字</option>
                <option value="date">日期</option>
                <option value="boolean">布尔值</option>
                <option value="json">JSON</option>
              </select>
            </div>

            {/* 必填字段 */}
            <div className="flex items-center justify-center p-4">
              <div className="flex items-center">
                <input
                  id="required"
                  name="required"
                  type="checkbox"
                  checked={formData.required}
                  onChange={handleInputChange}
                  className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded dark:focus:ring-indigo-600 dark:ring-offset-gray-800 dark:bg-gray-700 dark:border-gray-600"
                />
                <label htmlFor="required" className="ml-2 block text-sm text-gray-900 dark:text-white">
                  字段必填
                </label>
              </div>
            </div>

            {/* 转换规则 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1 dark:text-gray-300">
                转换规则
              </label>
              <input
                type="text"
                name="transform"
                value={formData.transform}
                disabled
                title="该功能暂未开放"
                placeholder="例如: toUpperCase()"
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-3 py-2 border dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:focus:border-indigo-500 dark:focus:ring-indigo-500 disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed dark:disabled:bg-gray-700 dark:disabled:text-gray-400"
              />
            </div>

            {/* 默认值 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1 dark:text-gray-300">
                默认值
              </label>
              <input
                type="text"
                name="defaultValue"
                value={formData.defaultValue}
                disabled
                title="该功能暂未开放"
                placeholder="例如: N/A"
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-3 py-2 border dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:focus:border-indigo-500 dark:focus:ring-indigo-500 disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed dark:disabled:bg-gray-700 dark:disabled:text-gray-400"
              />
            </div>
          </div>

          {/* 描述 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1 dark:text-gray-300">
              描述
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              placeholder="输入字段映射说明（可选）"
              rows={3}
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-3 py-2 dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:focus:border-indigo-500 dark:focus:ring-indigo-500"
            />
          </div>
        </div>

        {/* 对话框底部 */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 dark:border-gray-700">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-lg shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600 transition-colors"
          >
            取消
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
          >
            保存
          </button>
        </div>
      </div>
    </div>
  );
}
