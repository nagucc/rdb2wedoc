'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { RefreshCw, User, LogOut, ArrowLeft } from 'lucide-react';
import { authService } from '@/lib/services/authService';
import { FieldMappingUI, MappingConfigUI } from '@/types';

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

interface IntelligentDocument {
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

export default function EditMappingPage() {
  const router = useRouter();
  const params = useParams();
  const mappingId = params.id as string;
  
  const [currentUser, setCurrentUser] = useState<{ username: string } | null>(null);
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

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
  const [documents, setDocuments] = useState<IntelligentDocument[]>([]);
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
    const fetchMapping = async () => {
      try {
        setInitialLoading(true);
        const response = await fetch(`/api/mappings?id=${mappingId}`);
        const result = await response.json();
        
        if (result.success && result.data) {
          const mapping = result.data as MappingConfigUI;
          
          const processedFieldMappings = mapping.fieldMappings.map(fm => ({
            ...fm,
            documentField: fm.documentFieldId || fm.documentField
          }));
          
          setFormData({
            name: mapping.name,
            sourceDatabaseId: mapping.sourceDatabaseId,
            sourceTableName: mapping.sourceTableName,
            targetDocId: mapping.targetDocId,
            targetSheetId: mapping.targetSheetId,
            status: mapping.status,
            fieldMappings: processedFieldMappings
          });
          setSelectedDatabase(mapping.sourceDatabaseId);
          setSelectedTable(mapping.sourceTableName);
          setSelectedDocument(mapping.targetDocId);
          setSelectedSheet(mapping.targetSheetId);
          setFieldMappings(processedFieldMappings);
        } else {
          setError('加载映射配置失败');
        }
      } catch (error) {
        console.error('Failed to fetch mapping:', error);
        setError('加载映射配置失败');
      } finally {
        setInitialLoading(false);
      }
    };

    fetchMapping();
  }, [mappingId]);

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
        }
      } catch (error) {
        console.error('Failed to fetch tables:', error);
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
      }
    } catch (error) {
      console.error('Failed to refresh tables:', error);
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

  const handleLogout = async () => {
    try {
      await authService.logout();
      router.push('/login');
    } catch (error) {
      console.error('登出失败:', error);
    }
  };

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
      setError('请选择数据库');
      return false;
    }
    if (!selectedTable) {
      setError('请选择表');
      return false;
    }

    if (!selectedWeComAccount) {
      setError('请选择企业微信账户');
      return false;
    }
    if (!selectedDocument) {
      setError('请选择智能文档');
      return false;
    }
    if (!selectedSheet) {
      setError('请选择子表');
      return false;
    }

    if (fieldMappings.length === 0) {
      setError('至少需要添加一个字段映射');
      return false;
    }

    const sourceFieldSet = new Set<string>();
    const targetFieldSet = new Set<string>();

    for (let i = 0; i < fieldMappings.length; i++) {
      const mapping = fieldMappings[i];
      const trimmedSourceField = mapping.databaseColumn.trim();
      const trimmedTargetField = mapping.documentField.trim();

      if (!trimmedSourceField) {
        setError(`第 ${i + 1} 个字段映射的源字段不能为空`);
        return false;
      }
      if (!trimmedTargetField) {
        setError(`第 ${i + 1} 个字段映射的目标字段不能为空`);
        return false;
      }

      const sourceField = trimmedSourceField;
      const targetField = trimmedTargetField;

      if (sourceFieldSet.has(sourceField)) {
        setError(`源字段 "${sourceField}" 被重复映射`);
        return false;
      }
      sourceFieldSet.add(sourceField);

      if (targetFieldSet.has(targetField)) {
        setError(`目标字段 "${targetField}" 被重复映射`);
        return false;
      }
      targetFieldSet.add(targetField);

      const dbField = databaseFields.find(f => f.name === sourceField);
      if (!dbField) {
        setError(`源字段 "${sourceField}" 在数据库表中不存在`);
        return false;
      }

      const docField = documentFields.find(f => f.id === mapping.documentFieldId);
      if (!docField) {
        setError(`目标字段 "${targetField}" 在文档中不存在`);
        return false;
      }

      const validDataTypes = ['string', 'number', 'date', 'boolean', 'json'];
      if (!validDataTypes.includes(mapping.dataType)) {
        setError(`第 ${i + 1} 个字段映射的数据类型无效`);
        return false;
      }

      if (mapping.transform) {
        const validTransforms = ['trim', 'toUpperCase', 'toLowerCase', 'toDate', 'toNumber', 'toString', 'toBoolean'];
        if (!validTransforms.includes(mapping.transform)) {
          setError(`第 ${i + 1} 个字段映射的转换规则无效`);
          return false;
        }
      }

      if (mapping.defaultValue) {
        if (!validateDefaultValue(mapping.defaultValue, mapping.dataType)) {
          setError(`第 ${i + 1} 个字段映射的默认值不符合数据类型要求`);
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
        id: mappingId,
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
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(submissionData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '更新映射配置失败');
      }

      const result = await response.json();
      setSuccess(true);
      setTimeout(() => {
        router.push('/mappings');
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : '更新映射配置失败');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    router.back();
  };

  if (!mounted || !currentUser) {
    return null;
  }

  if (initialLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
        <RefreshCw className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      <header className="border-b border-gray-200 bg-white/80 backdrop-blur-sm dark:border-gray-700 dark:bg-gray-800/80">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link href="/mappings" className="flex items-center gap-3 transition-transform hover:scale-105 active:scale-95">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-purple-600">
                <RefreshCw className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                  RDB2WeDoc
                </h1>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  数据库到企业微信文档同步系统
                </p>
              </div>
            </Link>
            <nav className="flex items-center gap-4">
              <div className="flex items-center gap-2 rounded-lg bg-blue-100 px-3 py-2 dark:bg-blue-900/20">
                <span className="text-sm font-medium text-blue-700 dark:text-blue-400">
                  编辑数据映射
                </span>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 rounded-lg bg-gray-100 px-3 py-2 dark:bg-gray-700">
                  <User className="h-4 w-4 text-gray-600 dark:text-gray-300" />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {currentUser.username}
                  </span>
                </div>
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700"
                >
                  <LogOut className="h-4 w-4" />
                  退出
                </button>
              </div>
            </nav>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white shadow rounded-lg dark:bg-gray-800 dark:border dark:border-gray-700">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-4">
                <Link
                  href="/mappings"
                  className="flex items-center gap-2 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors"
                >
                  <ArrowLeft className="h-5 w-5" />
                  返回
                </Link>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900 dark:text-white">编辑数据映射</h1>
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">修改数据源到数据目标的映射关系</p>
                </div>
              </div>
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
                      <p className="text-sm font-medium text-green-800">映射配置更新成功！正在跳转...</p>
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
                    className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                    placeholder="输入映射名称"
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
                    className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                  >
                    <option value="draft">草稿</option>
                    <option value="active">启用</option>
                    <option value="inactive">禁用</option>
                  </select>
                </div>
              </div>

              <div className="border-t border-gray-200 pt-6 dark:border-gray-700">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">数据源配置</h3>
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                  <div>
                    <label htmlFor="sourceDatabaseId" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      数据库 <span className="text-red-500">*</span>
                    </label>
                    <select
                      id="sourceDatabaseId"
                      value={selectedDatabase}
                      onChange={(e) => setSelectedDatabase(e.target.value)}
                      disabled={loadingDatabases}
                      className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-gray-600 dark:bg-gray-700 dark:text-white disabled:opacity-50"
                      required
                    >
                      <option value="">选择数据库</option>
                      {databases.map((db) => (
                        <option key={db.id} value={db.id}>
                          {db.name} ({db.type})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label htmlFor="sourceTableName" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      表 <span className="text-red-500">*</span>
                    </label>
                    <div className="flex gap-2">
                      <select
                        id="sourceTableName"
                        value={selectedTable}
                        onChange={(e) => setSelectedTable(e.target.value)}
                        disabled={loadingTables || !selectedDatabase}
                        className="mt-1 flex-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-gray-600 dark:bg-gray-700 dark:text-white disabled:opacity-50"
                        required
                      >
                        <option value="">选择表</option>
                        {tables.map((table) => (
                          <option key={table.name} value={table.name}>
                            {table.name}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={handleRefreshTables}
                        disabled={refreshingTables || !selectedDatabase}
                        className="mt-1 px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors disabled:opacity-50 dark:bg-gray-700 dark:hover:bg-gray-600"
                        title="刷新表列表"
                      >
                        <RefreshCw className={`h-4 w-4 ${refreshingTables ? 'animate-spin' : ''}`} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="border-t border-gray-200 pt-6 dark:border-gray-700">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">数据目标配置</h3>
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
                  <div>
                    <label htmlFor="wecomAccountId" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      企业微信账户 <span className="text-red-500">*</span>
                    </label>
                    <select
                      id="wecomAccountId"
                      value={selectedWeComAccount}
                      onChange={(e) => setSelectedWeComAccount(e.target.value)}
                      disabled={loadingWeComAccounts}
                      className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-gray-600 dark:bg-gray-700 dark:text-white disabled:opacity-50"
                      required
                    >
                      <option value="">选择企业微信账户</option>
                      {wecomAccounts.map((account) => (
                        <option key={account.id} value={account.id}>
                          {account.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label htmlFor="targetDocId" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      智能文档 <span className="text-red-500">*</span>
                    </label>
                    <select
                      id="targetDocId"
                      value={selectedDocument}
                      onChange={(e) => setSelectedDocument(e.target.value)}
                      disabled={loadingDocuments || !selectedWeComAccount}
                      className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-gray-600 dark:bg-gray-700 dark:text-white disabled:opacity-50"
                      required
                    >
                      <option value="">选择智能文档</option>
                      {documents.map((doc) => (
                        <option key={doc.id} value={doc.id}>
                          {doc.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label htmlFor="targetSheetId" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      子表 <span className="text-red-500">*</span>
                    </label>
                    <select
                      id="targetSheetId"
                      value={selectedSheet}
                      onChange={(e) => setSelectedSheet(e.target.value)}
                      disabled={loadingSheets || !selectedDocument}
                      className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-gray-600 dark:bg-gray-700 dark:text-white disabled:opacity-50"
                      required
                    >
                      <option value="">选择子表</option>
                      {sheets.map((sheet) => (
                        <option key={sheet.sheet_id} value={sheet.sheet_id}>
                          {sheet.title}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div className="border-t border-gray-200 pt-6 dark:border-gray-700">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white">字段映射</h3>
                  <button
                    type="button"
                    onClick={addFieldMapping}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 transition-colors"
                  >
                    添加字段映射
                  </button>
                </div>

                {fieldMappings.length === 0 ? (
                  <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                    暂无字段映射，点击上方按钮添加
                  </div>
                ) : (
                  <div className="space-y-4">
                    {fieldMappings.map((mapping, index) => (
                      <div key={mapping.id} className="border border-gray-200 rounded-lg p-4 dark:border-gray-700">
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                              源字段 <span className="text-red-500">*</span>
                            </label>
                            <select
                              value={mapping.databaseColumn}
                              onChange={(e) => updateFieldMapping(index, 'databaseColumn', e.target.value)}
                              disabled={loadingDatabaseFields}
                              className="block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-gray-600 dark:bg-gray-700 dark:text-white disabled:opacity-50"
                              required
                            >
                              <option value="">选择源字段</option>
                              {databaseFields.map((field) => (
                                <option key={field.name} value={field.name}>
                                  {field.name} ({field.type})
                                </option>
                              ))}
                            </select>
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                              目标字段 <span className="text-red-500">*</span>
                            </label>
                            <select
                              value={mapping.documentFieldId || mapping.documentField}
                              onChange={(e) => updateFieldMapping(index, 'documentField', e.target.value)}
                              disabled={loadingDocumentFields}
                              className="block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-gray-600 dark:bg-gray-700 dark:text-white disabled:opacity-50"
                              required
                            >
                              <option value="">选择目标字段</option>
                              {documentFields.map((field) => (
                                <option key={field.id} value={field.id}>
                                  {field.name} ({field.type})
                                </option>
                              ))}
                            </select>
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                              数据类型
                            </label>
                            <select
                              value={mapping.dataType}
                              onChange={(e) => updateFieldMapping(index, 'dataType', e.target.value)}
                              className="block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                            >
                              <option value="string">字符串</option>
                              <option value="number">数字</option>
                              <option value="date">日期</option>
                              <option value="boolean">布尔值</option>
                              <option value="json">JSON</option>
                            </select>
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                              转换规则
                            </label>
                            <select
                              value={mapping.transform}
                              onChange={(e) => updateFieldMapping(index, 'transform', e.target.value)}
                              className="block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                            >
                              <option value="">无转换</option>
                              <option value="trim">去除空格</option>
                              <option value="toUpperCase">转大写</option>
                              <option value="toLowerCase">转小写</option>
                              <option value="toDate">转日期</option>
                              <option value="toNumber">转数字</option>
                              <option value="toString">转字符串</option>
                              <option value="toBoolean">转布尔值</option>
                            </select>
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                              默认值
                            </label>
                            <input
                              type="text"
                              value={mapping.defaultValue}
                              onChange={(e) => updateFieldMapping(index, 'defaultValue', e.target.value)}
                              className="block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                              placeholder="可选"
                            />
                          </div>

                          <div className="flex items-end">
                            <label className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                checked={mapping.required}
                                onChange={(e) => updateFieldMapping(index, 'required', e.target.checked)}
                                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700"
                              />
                              <span className="text-sm text-gray-700 dark:text-gray-300">必填</span>
                            </label>
                          </div>

                          <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                              描述
                            </label>
                            <input
                              type="text"
                              value={mapping.description}
                              onChange={(e) => updateFieldMapping(index, 'description', e.target.value)}
                              className="block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                              placeholder="可选描述"
                            />
                          </div>

                          <div className="flex items-end">
                            <button
                              type="button"
                              onClick={() => removeFieldMapping(index)}
                              className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-md text-sm font-medium hover:bg-red-700 transition-colors"
                            >
                              删除
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-3 pt-6 border-t border-gray-200 dark:border-gray-700">
                <button
                  type="button"
                  onClick={handleCancel}
                  className="px-6 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
                >
                  取消
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-6 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? '保存中...' : '保存更改'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
}
