'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { RefreshCw, AlertCircle, XCircle, CheckCircle } from 'lucide-react';
import { authService } from '@/lib/services/authService';
import Header from '@/components/layout/Header';
import { FieldMappingUI } from '@/types';

interface DatabaseConnection {
  id: string;
  name: string;
  type: string;
  host: string;
  port: number;
  username: string;
  database: string;
}

interface Table {
  name: string;
  type: string;
}

interface WeComAccount {
  id: string;
  name: string;
  corpId: string;
}

interface WecomSmartSheet {
  id: string;
  name: string;
  accountId: string;
}

interface Sheet {
  sheet_id: string;
  title: string;
}

interface DatabaseField {
  name: string;
  type: string;
  nullable: boolean;
  default?: string;
}

interface DocumentField {
  id: string;
  name: string;
  type: string;
}

interface MappingFormData {
  name: string;
  sourceDatabaseId: string;
  sourceTableName: string;
  targetDocId: string;
  targetSheetId: string;
  status: 'active' | 'inactive' | 'draft';
  fieldMappings: FieldMappingUI[];
}

export default function CreateMappingPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<{ username: string } | null>(null);
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [showConnectionErrorDialog, setShowConnectionErrorDialog] = useState(false);
  const [connectionErrorDetails, setConnectionErrorDetails] = useState<{
    errorType: string;
    errorMessage: string;
    solution: string;
  } | null>(null);

  const [formData, setFormData] = useState<MappingFormData>({
    name: '',
    sourceDatabaseId: '',
    sourceTableName: '',
    targetDocId: '',
    targetSheetId: '',
    status: 'draft',
    fieldMappings: []
  });

  const [fieldMappings, setFieldMappings] = useState<FieldMappingUI[]>([]);

  const [databases, setDatabases] = useState<DatabaseConnection[]>([]);
  const [tables, setTables] = useState<Table[]>([]);
  const [selectedDatabase, setSelectedDatabase] = useState<string>('');
  const [selectedTable, setSelectedTable] = useState<string>('');
  const [loadingDatabases, setLoadingDatabases] = useState(false);
  const [loadingTables, setLoadingTables] = useState(false);
  const [refreshingTables, setRefreshingTables] = useState(false);

  const [databaseFields, setDatabaseFields] = useState<DatabaseField[]>([]);
  const [documentFields, setDocumentFields] = useState<DocumentField[]>([]);
  const [loadingDatabaseFields, setLoadingDatabaseFields] = useState(false);
  const [loadingDocumentFields, setLoadingDocumentFields] = useState(false);

  const [wecomAccounts, setWeComAccounts] = useState<WeComAccount[]>([]);
  const [documents, setDocuments] = useState<WecomSmartSheet[]>([]);
  const [sheets, setSheets] = useState<Sheet[]>([]);
  const [selectedWeComAccount, setSelectedWeComAccount] = useState<string>('');
  const [selectedDocument, setSelectedDocument] = useState<string>('');
  const [selectedSheet, setSelectedSheet] = useState<string>('');
  const [loadingWeComAccounts, setLoadingWeComAccounts] = useState(false);
  const [loadingDocuments, setLoadingDocuments] = useState(false);
  const [loadingSheets, setLoadingSheets] = useState(false);

  useEffect(() => {
    setMounted(true);
    const user = authService.getCurrentUser();
    if (!user) {
      router.push('/login');
      return;
    }
    setCurrentUser(user);
  }, [router]);

  useEffect(() => {
    const fetchDatabases = async () => {
      try {
        setLoadingDatabases(true);
        const response = await fetch('/api/databases');
        const result = await response.json();
        if (result.success) {
          setDatabases(result.data);
        }
      } catch (error) {
        console.error('Failed to fetch databases:', error);
      } finally {
        setLoadingDatabases(false);
      }
    };

    fetchDatabases();
  }, []);

  useEffect(() => {
    if (!selectedDatabase) {
      setTables([]);
      setSelectedTable('');
      return;
    }

    const fetchTables = async () => {
      try {
        setLoadingTables(true);
        const response = await fetch(`/api/databases/${selectedDatabase}/tables`);
        const result = await response.json();
        if (result.success) {
          setTables(result.data);
          setSelectedTable('');
        } else {
          throw new Error(result.error || '获取表格数据失败');
        }
      } catch (error) {
        console.error('Failed to fetch tables:', error);
        handleConnectionError(error);
        setTables([]);
      } finally {
        setLoadingTables(false);
      }
    };

    fetchTables();
  }, [selectedDatabase]);

  const handleRefreshTables = async () => {
    if (!selectedDatabase) return;
    
    try {
      setRefreshingTables(true);
      const response = await fetch(`/api/databases/${selectedDatabase}/tables`);
      const result = await response.json();
      if (result.success) {
        setTables(result.data);
      } else {
        throw new Error(result.error || '刷新表格数据失败');
      }
    } catch (error) {
      console.error('Failed to refresh tables:', error);
      handleConnectionError(error);
      setError('刷新表格数据失败');
    } finally {
      setRefreshingTables(false);
    }
  };

  useEffect(() => {
    const fetchWeComAccounts = async () => {
      try {
        setLoadingWeComAccounts(true);
        const response = await fetch('/api/wecom-accounts');
        const result = await response.json();
        if (result.success) {
          setWeComAccounts(result.data);
        }
      } catch (error) {
        console.error('Failed to fetch WeCom accounts:', error);
      } finally {
        setLoadingWeComAccounts(false);
      }
    };

    fetchWeComAccounts();
  }, []);

  useEffect(() => {
    if (!selectedWeComAccount) {
      setDocuments([]);
      setSelectedDocument('');
      setSheets([]);
      setSelectedSheet('');
      return;
    }

    const fetchDocuments = async () => {
      try {
        setLoadingDocuments(true);
        const response = await fetch(`/api/wecom-accounts/${selectedWeComAccount}/documents`);
        const result = await response.json();
        if (result.success) {
          setDocuments(result.data);
          setSelectedDocument('');
          setSheets([]);
          setSelectedSheet('');
        }
      } catch (error) {
        console.error('Failed to fetch documents:', error);
        setDocuments([]);
      } finally {
        setLoadingDocuments(false);
      }
    };

    fetchDocuments();
  }, [selectedWeComAccount]);

  useEffect(() => {
    if (!selectedDocument) {
      setSheets([]);
      setSelectedSheet('');
      return;
    }

    const fetchSheets = async () => {
      try {
        setLoadingSheets(true);
        const response = await fetch(`/api/documents/${selectedDocument}/sheets`);
        const result = await response.json();
        if (result.success) {
          setSheets(result.data);
          setSelectedSheet('');
        }
      } catch (error) {
        console.error('Failed to fetch sheets:', error);
        setSheets([]);
      } finally {
        setLoadingSheets(false);
      }
    };

    fetchSheets();
  }, [selectedDocument]);

  useEffect(() => {
    if (!selectedDatabase || !selectedTable) {
      setDatabaseFields([]);
      return;
    }

    const fetchDatabaseFields = async () => {
      try {
        setLoadingDatabaseFields(true);
        const response = await fetch(`/api/field-mapping/database-fields?databaseId=${selectedDatabase}&tableName=${selectedTable}`);
        const result = await response.json();
        if (result.success) {
          setDatabaseFields(result.data);
        }
      } catch (error) {
        console.error('Failed to fetch database fields:', error);
        setDatabaseFields([]);
      } finally {
        setLoadingDatabaseFields(false);
      }
    };

    fetchDatabaseFields();
  }, [selectedDatabase, selectedTable]);

  useEffect(() => {
    if (!selectedDocument || !selectedSheet) {
      setDocumentFields([]);
      return;
    }

    const fetchDocumentFields = async () => {
      try {
        setLoadingDocumentFields(true);
        const response = await fetch(`/api/field-mapping/document-fields?documentId=${selectedDocument}&sheetId=${selectedSheet}`);
        const result = await response.json();
        if (result.success) {
          setDocumentFields(result.data);
        }
      } catch (error) {
        console.error('Failed to fetch document fields:', error);
        setDocumentFields([]);
      } finally {
        setLoadingDocumentFields(false);
      }
    };

    fetchDocumentFields();
  }, [selectedDocument, selectedSheet]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const addFieldMapping = () => {
    const newMapping: FieldMappingUI = {
      id: `field_${Date.now()}`,
      databaseColumn: '',
      documentField: '',
      dataType: 'string',
      transform: '',
      defaultValue: '',
      required: false,
      description: ''
    };
    setFieldMappings(prev => [...prev, newMapping]);
  };

  const updateFieldMapping = (index: number, field: keyof FieldMappingUI, value: any) => {
    setFieldMappings(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      
      if (field === 'documentField') {
        const selectedField = documentFields.find(f => f.id === value);
        if (selectedField) {
          updated[index].documentField = selectedField.name;
          updated[index].documentFieldId = selectedField.id;
        }
      }
      
      return updated;
    });
  };

  const removeFieldMapping = (index: number) => {
    setFieldMappings(prev => prev.filter((_, i) => i !== index));
  };

  const validateForm = (): boolean => {
    const trimmedName = formData.name.trim();
    if (!trimmedName) {
      setError('映射名称不能为空');
      return false;
    }

    if (!selectedDatabase) {
      setError('请选择数据库（当前选择：无）');
      return false;
    }
    if (!selectedTable) {
      setError('请选择表（当前选择：无）');
      return false;
    }

    if (!selectedWeComAccount) {
      setError('请选择企业微信账户（当前选择：无）');
      return false;
    }
    if (!selectedDocument) {
      setError('请选择智能表格（当前选择：无）');
      return false;
    }
    if (!selectedSheet) {
      setError('请选择子表（当前选择：无）');
      return false;
    }

    if (fieldMappings.length === 0) {
      setError('至少需要添加一个字段映射（当前映射数量：0）');
      return false;
    }

    const sourceFieldSet = new Set<string>();
    const targetFieldSet = new Set<string>();

    for (let i = 0; i < fieldMappings.length; i++) {
      const mapping = fieldMappings[i];
      const trimmedSourceField = mapping.databaseColumn.trim();
      const trimmedTargetField = mapping.documentField.trim();

      if (!trimmedSourceField) {
        setError(`第 ${i + 1} 个字段映射的源字段不能为空（当前值："${mapping.databaseColumn}"）`);
        return false;
      }
      if (!trimmedTargetField) {
        setError(`第 ${i + 1} 个字段映射的目标字段不能为空（当前值："${mapping.documentField}"）`);
        return false;
      }

      const sourceField = trimmedSourceField;
      const targetField = trimmedTargetField;

      if (sourceFieldSet.has(sourceField)) {
        setError(`源字段 "${sourceField}" 被重复映射（第 ${sourceFieldSet.size + 1} 次映射）`);
        return false;
      }
      sourceFieldSet.add(sourceField);

      if (targetFieldSet.has(targetField)) {
        setError(`目标字段 "${targetField}" 被重复映射（第 ${targetFieldSet.size + 1} 次映射）`);
        return false;
      }
      targetFieldSet.add(targetField);

      const dbField = databaseFields.find(f => f.name === sourceField);
      if (!dbField) {
        setError(`源字段 "${sourceField}" 在数据库表中不存在（可用字段：${databaseFields.map(f => f.name).join(', ')}）`);
        return false;
      }

      const docField = documentFields.find(f => f.id === mapping.documentFieldId);
      if (!docField) {
        setError(`目标字段 "${targetField}" 在文档中不存在（可用字段：${documentFields.map(f => f.name).join(', ')}）`);
        return false;
      }

      const validDataTypes = ['string', 'number', 'date', 'boolean', 'json'];
      if (!validDataTypes.includes(mapping.dataType)) {
        setError(`第 ${i + 1} 个字段映射的数据类型 "${mapping.dataType}" 无效（有效类型：${validDataTypes.join(', ')}）`);
        return false;
      }

      if (mapping.required && !dbField.nullable && !mapping.defaultValue) {
        setError(`第 ${i + 1} 个字段映射标记为必填，但源字段 "${sourceField}" 不可为空且未设置默认值`);
        return false;
      }

      if (mapping.transform) {
        const validTransforms = ['trim', 'toUpperCase', 'toLowerCase', 'toDate', 'toNumber', 'toString', 'toBoolean'];
        if (!validTransforms.includes(mapping.transform)) {
          setError(`第 ${i + 1} 个字段映射的转换规则 "${mapping.transform}" 无效（有效规则：${validTransforms.join(', ')}）`);
          return false;
        }
      }

      if (mapping.defaultValue) {
        if (!validateDefaultValue(mapping.defaultValue, mapping.dataType)) {
          setError(`第 ${i + 1} 个字段映射的默认值 "${mapping.defaultValue}" 不符合数据类型 ${mapping.dataType} 的要求`);
          return false;
        }
      }
    }

    return true;
  };

  const validateDefaultValue = (value: string, dataType: string): boolean => {
    if (!value) return true;

    try {
      switch (dataType) {
        case 'number':
          return !isNaN(Number(value));
        case 'boolean':
          return ['true', 'false', '1', '0'].includes(value.toLowerCase());
        case 'date':
          return !isNaN(Date.parse(value));
        case 'json':
          try {
            JSON.parse(value);
            return true;
          } catch {
            return false;
          }
        case 'string':
        default:
          return true;
      }
    } catch {
      return false;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      const selectedWeComAccountData = wecomAccounts.find(acc => acc.id === selectedWeComAccount);
      const selectedDocumentData = documents.find(doc => doc.id === selectedDocument);
      const selectedSheetData = sheets.find(sheet => sheet.sheet_id === selectedSheet);

      const submissionData = {
        name: formData.name,
        sourceDatabaseId: selectedDatabase,
        sourceTableName: selectedTable,
        targetDocId: selectedDocument,
        targetSheetId: selectedSheet,
        status: formData.status,
        fieldMappings: fieldMappings,
        corpId: selectedWeComAccountData?.corpId,
        targetName: selectedWeComAccountData?.name,
        documentName: selectedDocumentData?.name,
        sheetName: selectedSheetData?.title
      };

      const response = await fetch('/api/mappings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(submissionData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '创建映射配置失败');
      }

      const result = await response.json();
      setSuccess(true);
      setTimeout(() => {
        router.push('/dashboard');
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : '创建映射配置失败');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    router.back();
  };

  const handleConnectionError = (error: any) => {
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    let errorType = '连接错误';
    let solution = '请检查网络连接和数据库配置后重试';

    if (errorMessage.includes('ETIMEDOUT') || errorMessage.includes('timeout')) {
      errorType = '连接超时';
      solution = '数据库连接超时，请检查：\n1. 数据库服务器是否正常运行\n2. 网络连接是否稳定\n3. 防火墙设置是否允许连接\n4. 数据库地址和端口是否正确';
    } else if (errorMessage.includes('ECONNREFUSED')) {
      errorType = '连接被拒绝';
      solution = '无法连接到数据库，请检查：\n1. 数据库服务是否已启动\n2. 数据库地址和端口是否正确\n3. 是否有足够的权限访问数据库';
    } else if (errorMessage.includes('ENOTFOUND')) {
      errorType = '主机未找到';
      solution = '无法找到数据库主机，请检查：\n1. 数据库地址是否正确\n2. DNS解析是否正常\n3. 网络连接是否正常';
    }

    setConnectionErrorDetails({
      errorType,
      errorMessage: errorMessage.substring(0, 200),
      solution
    });
    setShowConnectionErrorDialog(true);
  };

  if (!mounted || !currentUser) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      <Header showPageTitle={false} />

      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white shadow rounded-lg dark:bg-gray-800 dark:border dark:border-gray-700">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">创建数据映射</h1>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">配置数据源到数据目标的映射关系</p>
            </div>

          <form onSubmit={handleSubmit} className="px-6 py-6 space-y-6">
            {error && (
              <div className="rounded-md bg-red-50 p-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm font-medium text-red-800">{error}</p>
                  </div>
                </div>
              </div>
            )}

            {success && (
              <div className="rounded-md bg-green-50 p-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm font-medium text-green-800">映射配置创建成功！正在跳转...</p>
                  </div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  映射名称 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-3 py-2 border dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:focus:border-indigo-500 dark:focus:ring-indigo-500"
                  placeholder="请输入映射名称"
                  required
                />
              </div>

              <div>
                <label htmlFor="status" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  状态
                </label>
                <select
                  id="status"
                  name="status"
                  value={formData.status}
                  onChange={handleInputChange}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-3 py-2 border dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:focus:border-indigo-500 dark:focus:ring-indigo-500"
                >
                  <option value="draft">草稿</option>
                  <option value="active">激活</option>
                  <option value="inactive">未激活</option>
                </select>
              </div>

              <div>
                <label htmlFor="sourceName" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  源名称 <span className="text-red-500">*</span>
                </label>
                <select
                      id="sourceDatabase"
                      value={selectedDatabase}
                      onChange={(e) => setSelectedDatabase(e.target.value)}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-3 py-2 border dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:focus:border-indigo-500 dark:focus:ring-indigo-500"
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
                    {selectedDatabase && (
                      <div className="flex gap-2">
                        <select
                          id="sourceTable"
                          value={selectedTable}
                          onChange={(e) => setSelectedTable(e.target.value)}
                          className="mt-2 flex-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-3 py-2 border dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:focus:border-indigo-500 dark:focus:ring-indigo-500"
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
                          onClick={handleRefreshTables}
                          disabled={refreshingTables || !selectedDatabase}
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

              <div>
                <label htmlFor="targetName" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  目标名称 <span className="text-red-500">*</span>
                </label>
                <select
                  id="targetWeComAccount"
                  value={selectedWeComAccount}
                  onChange={(e) => setSelectedWeComAccount(e.target.value)}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-3 py-2 border dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:focus:border-indigo-500 dark:focus:ring-indigo-500"
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
                {selectedWeComAccount && (
                  <select
                    id="targetDocument"
                    value={selectedDocument}
                    onChange={(e) => setSelectedDocument(e.target.value)}
                    className="mt-2 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-3 py-2 border dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:focus:border-indigo-500 dark:focus:ring-indigo-500"
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
                {selectedDocument && (
                  <select
                    id="targetSheet"
                    value={selectedSheet}
                    onChange={(e) => setSelectedSheet(e.target.value)}
                    className="mt-2 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-3 py-2 border dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:focus:border-indigo-500 dark:focus:ring-indigo-500"
                    required
                  >
                    <option value="">请选择子表</option>
                    {loadingSheets ? (
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
                )}
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">字段映射</h3>
                <button
                  type="button"
                  onClick={addFieldMapping}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  <svg className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                  </svg>
                  添加字段映射
                </button>
              </div>

              {fieldMappings.length === 0 ? (
                <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300 dark:bg-gray-700 dark:border-gray-600">
                  <svg className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                    <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">暂无字段映射，点击上方按钮添加</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {fieldMappings.map((mapping, index) => (
                    <div key={mapping.id} className="bg-gray-50 rounded-lg p-4 border border-gray-200 dark:bg-gray-700 dark:border-gray-600">
                      <div className="flex items-start justify-between mb-4">
                        <h4 className="text-sm font-medium text-gray-900 dark:text-white">字段映射 #{index + 1}</h4>
                        <button
                          type="button"
                          onClick={() => removeFieldMapping(index)}
                          className="text-red-600 hover:text-red-800 text-sm dark:text-red-400 dark:hover:text-red-300"
                        >
                          删除
                        </button>
                      </div>

                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1 dark:text-gray-300">
                            源字段 <span className="text-red-500">*</span>
                          </label>
                          <select
                            value={mapping.databaseColumn}
                            onChange={(e) => updateFieldMapping(index, 'databaseColumn', e.target.value)}
                            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-3 py-2 border dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:focus:border-indigo-500 dark:focus:ring-indigo-500"
                            required
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
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1 dark:text-gray-300">
                            目标字段 <span className="text-red-500">*</span>
                          </label>
                          <select
                            value={mapping.documentFieldId || mapping.documentField}
                            onChange={(e) => updateFieldMapping(index, 'documentField', e.target.value)}
                            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-3 py-2 border dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:focus:border-indigo-500 dark:focus:ring-indigo-500"
                            required
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
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1 dark:text-gray-300">
                            数据类型
                          </label>
                          <select
                            value={mapping.dataType}
                            onChange={(e) => updateFieldMapping(index, 'dataType', e.target.value)}
                            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-3 py-2 border dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:focus:border-indigo-500 dark:focus:ring-indigo-500"
                          >
                            <option value="string">字符串</option>
                            <option value="number">数字</option>
                            <option value="date">日期</option>
                            <option value="boolean">布尔值</option>
                            <option value="json">JSON</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1 dark:text-gray-300">
                            默认值
                          </label>
                          <input
                            type="text"
                            value={mapping.defaultValue}
                            onChange={(e) => updateFieldMapping(index, 'defaultValue', e.target.value)}
                            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-3 py-2 border dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:focus:border-indigo-500 dark:focus:ring-indigo-500"
                            placeholder="例如: N/A"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1 dark:text-gray-300">
                            转换规则
                          </label>
                          <input
                            type="text"
                            value={mapping.transform}
                            onChange={(e) => updateFieldMapping(index, 'transform', e.target.value)}
                            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-3 py-2 border dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:focus:border-indigo-500 dark:focus:ring-indigo-500"
                            placeholder="例如: toUpperCase()"
                          />
                        </div>

                        <div className="flex items-center">
                          <input
                            type="checkbox"
                            id={`required-${index}`}
                            checked={mapping.required}
                            onChange={(e) => updateFieldMapping(index, 'required', e.target.checked)}
                            className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded dark:bg-gray-800 dark:border-gray-600"
                          />
                          <label htmlFor={`required-${index}`} className="ml-2 block text-sm text-gray-900 dark:text-gray-300">
                            必填字段
                          </label>
                        </div>

                        <div className="sm:col-span-2">
                          <label className="block text-sm font-medium text-gray-700 mb-1 dark:text-gray-300">
                            描述
                          </label>
                          <textarea
                            value={mapping.description}
                            onChange={(e) => updateFieldMapping(index, 'description', e.target.value)}
                            rows={2}
                            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-3 py-2 border dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:focus:border-indigo-500 dark:focus:ring-indigo-500"
                            placeholder="字段映射说明"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex items-center justify-end space-x-4 pt-6 border-t border-gray-200 dark:border-gray-700">
              <Link
                href="/dashboard"
                className="px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
              >
                取消
              </Link>
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? '保存中...' : '保存映射'}
              </button>
            </div>
          </form>
        </div>
      </div>
      </main>

      {showConnectionErrorDialog && connectionErrorDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="mx-4 w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl dark:bg-gray-800">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/20">
                <AlertCircle className="h-6 w-6 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {connectionErrorDetails.errorType}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  数据库连接失败
                </p>
              </div>
            </div>

            <div className="mb-6 space-y-4">
              <div className="rounded-lg bg-gray-50 p-4 dark:bg-gray-700/50">
                <div className="mb-2 text-sm font-medium text-gray-900 dark:text-white">
                  错误信息
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  {connectionErrorDetails.errorMessage}
                </div>
              </div>

              <div className="rounded-lg bg-blue-50 p-4 dark:bg-blue-900/20">
                <div className="mb-2 text-sm font-medium text-gray-900 dark:text-white">
                  解决建议
                </div>
                <div className="whitespace-pre-line text-sm text-gray-600 dark:text-gray-400">
                  {connectionErrorDetails.solution}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => {
                  setShowConnectionErrorDialog(false);
                  setConnectionErrorDetails(null);
                }}
                className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
              >
                关闭
              </button>
              <button
                onClick={() => {
                  setShowConnectionErrorDialog(false);
                  setConnectionErrorDetails(null);
                  handleRefreshTables();
                }}
                className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700"
              >
                <RefreshCw className="h-4 w-4" />
                重试
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}