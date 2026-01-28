import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import MappingFormFields from '@/components/mappings/MappingFormFields';

// 模拟数据
const mockDatabases = [
  { id: 'db1', name: '数据库1', type: 'mysql' },
  { id: 'db2', name: '数据库2', type: 'postgresql' }
];

const mockTables = [
  { name: '表1', type: 'table' },
  { name: '表2', type: 'view' }
];

const mockWecomAccounts = [
  { id: 'account1', name: '企业微信1', corpId: 'corp1' },
  { id: 'account2', name: '企业微信2', corpId: 'corp2' }
];

const mockDocuments = [
  { id: 'doc1', name: '文档1', accountId: 'account1' },
  { id: 'doc2', name: '文档2', accountId: 'account1' }
];

const mockSheets = [
  { sheet_id: 'sheet1', title: '子表1' },
  { sheet_id: 'sheet2', title: '子表2' }
];

// 默认props
const defaultProps = {
  name: '测试映射',
  onNameChange: jest.fn(),
  selectedDatabase: '',
  onDatabaseChange: jest.fn(),
  databases: mockDatabases,
  loadingDatabases: false,
  selectedTable: '',
  onTableChange: jest.fn(),
  tables: mockTables,
  loadingTables: false,
  refreshingTables: false,
  onRefreshTables: jest.fn(),
  selectedWeComAccount: '',
  onWeComAccountChange: jest.fn(),
  wecomAccounts: mockWecomAccounts,
  loadingWeComAccounts: false,
  selectedDocument: '',
  onDocumentChange: jest.fn(),
  documents: mockDocuments,
  loadingDocuments: false,
  selectedSheet: '',
  onSheetChange: jest.fn(),
  sheets: mockSheets,
  loadingSheets: false,
  refreshingSheets: false,
  onRefreshSheets: jest.fn(),
  isConfigLocked: false
};

describe('MappingFormFields Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders correctly with default props', () => {
    render(<MappingFormFields {...defaultProps} />);
    
    // 检查基本元素是否渲染
    expect(screen.getByLabelText(/映射名称/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/源名称/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/目标名称/i)).toBeInTheDocument();
  });

  test('calls onNameChange when name input changes', () => {
    render(<MappingFormFields {...defaultProps} />);
    
    const nameInput = screen.getByLabelText(/映射名称/i);
    fireEvent.change(nameInput, { target: { value: '新映射名称' } });
    
    expect(defaultProps.onNameChange).toHaveBeenCalledWith('新映射名称');
  });

  test('calls onDatabaseChange when database select changes', () => {
    render(<MappingFormFields {...defaultProps} />);
    
    const databaseSelect = screen.getByLabelText(/源名称/i);
    fireEvent.change(databaseSelect, { target: { value: 'db1' } });
    
    expect(defaultProps.onDatabaseChange).toHaveBeenCalledWith('db1');
  });

  test('calls onTableChange when table select changes', () => {
    render(<MappingFormFields {...{ ...defaultProps, selectedDatabase: 'db1' }} />);
    
    const tableSelect = screen.getByRole('combobox', { name: /源表/i });
    fireEvent.change(tableSelect, { target: { value: '表1' } });
    
    expect(defaultProps.onTableChange).toHaveBeenCalledWith('表1');
  });

  test('calls onWeComAccountChange when wecom account select changes', () => {
    render(<MappingFormFields {...defaultProps} />);
    
    const wecomAccountSelect = screen.getByLabelText(/目标名称/i);
    fireEvent.change(wecomAccountSelect, { target: { value: 'account1' } });
    
    expect(defaultProps.onWeComAccountChange).toHaveBeenCalledWith('account1');
  });

  test('calls onDocumentChange when document select changes', () => {
    render(<MappingFormFields {...{ ...defaultProps, selectedWeComAccount: 'account1' }} />);
    
    const documentSelect = screen.getByRole('combobox', { name: /目标文档/i });
    fireEvent.change(documentSelect, { target: { value: 'doc1' } });
    
    expect(defaultProps.onDocumentChange).toHaveBeenCalledWith('doc1');
  });

  test('calls onSheetChange when sheet select changes', () => {
    render(<MappingFormFields {...{ ...defaultProps, selectedWeComAccount: 'account1', selectedDocument: 'doc1' }} />);
    
    const sheetSelect = screen.getByRole('combobox', { name: /目标子表/i });
    fireEvent.change(sheetSelect, { target: { value: 'sheet1' } });
    
    expect(defaultProps.onSheetChange).toHaveBeenCalledWith('sheet1');
  });

  test('calls onRefreshTables when refresh button is clicked', () => {
    render(<MappingFormFields {...{ ...defaultProps, selectedDatabase: 'db1' }} />);
    
    const refreshButton = screen.getByLabelText(/刷新表格数据/i);
    fireEvent.click(refreshButton);
    
    expect(defaultProps.onRefreshTables).toHaveBeenCalled();
  });

  test('shows loading state for databases', () => {
    render(<MappingFormFields {...{ ...defaultProps, loadingDatabases: true }} />);
    
    const databaseSelect = screen.getByLabelText(/源名称/i);
    expect(screen.getByText(/加载中/i)).toBeInTheDocument();
  });

  test('shows loading state for tables', () => {
    render(<MappingFormFields {...{ ...defaultProps, selectedDatabase: 'db1', loadingTables: true }} />);
    
    const tableSelect = screen.getByRole('combobox', { name: /源表/i });
    expect(screen.getByText(/加载中/i)).toBeInTheDocument();
  });

  test('disables refresh button when refreshingTables is true', () => {
    render(<MappingFormFields {...{ ...defaultProps, selectedDatabase: 'db1', refreshingTables: true }} />);
    
    const refreshButton = screen.getByLabelText(/刷新表格数据/i);
    expect(refreshButton).toBeDisabled();
  });
});
