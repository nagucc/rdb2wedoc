# GenericReferenceDialog 使用指南

## 概述

`GenericReferenceDialog` 是一个可复用的通用对话框组件，用于显示与主页面当前展示对象相关联的对象列表。该组件支持高度自定义，适用于各种场景。

## 功能特性

- ✅ 支持传入关联对象数据集合
- ✅ 提供可配置的列表项展示模板
- ✅ 包含分页或滚动加载机制
- ✅ 允许自定义标题和操作按钮
- ✅ 实现响应式布局适配不同屏幕尺寸
- ✅ 遵循组件化开发原则，低耦合高内聚
- ✅ 提供清晰的 API 接口

## Props 接口

```typescript
interface GenericReferenceDialogProps<T = any> {
  show: boolean;                              // 是否显示对话框
  onClose: () => void;                        // 关闭回调函数
  title: string;                              // 对话框标题
  subtitle?: string;                          // 副标题（可选）
  icon?: ReactNode;                           // 标题图标（可选）
  items: T[];                                 // 数据项列表
  loading?: boolean;                          // 加载状态
  renderItem: (item: T, index: number) => ReactNode;  // 渲染单个列表项
  onItemClick?: (item: T, index: number) => void;     // 点击列表项回调
  emptyState?: {                              // 空状态配置（可选）
    icon?: ReactNode;
    title: string;
    description: string;
  };
  maxHeight?: string;                         // 最大高度（默认：500px）
  maxWidth?: string;                          // 最大宽度（默认：2xl）
  className?: string;                         // 自定义类名
  showCloseButton?: boolean;                  // 是否显示关闭按钮（默认：true）
  closeOnOverlayClick?: boolean;              // 点击遮罩层是否关闭（默认：true）
  enableVirtualScroll?: boolean;              // 启用虚拟滚动（默认：false）
  pageSize?: number;                          // 每页数量
  onLoadMore?: () => void;                    // 加载更多回调
  hasMore?: boolean;                          // 是否还有更多数据
}
```

## 使用示例

### 基础用法

```tsx
import GenericReferenceDialog from './GenericReferenceDialog';

interface User {
  id: string;
  name: string;
  email: string;
}

function UserListDialog({ show, onClose, users }: { show: boolean; onClose: () => void; users: User[] }) {
  const renderUserItem = (user: User) => (
    <div className="p-4 border rounded-lg">
      <h4 className="font-semibold">{user.name}</h4>
      <p className="text-sm text-gray-600">{user.email}</p>
    </div>
  );

  return (
    <GenericReferenceDialog<User>
      show={show}
      onClose={onClose}
      title="用户列表"
      items={users}
      renderItem={renderUserItem}
    />
  );
}
```

### 带图标和副标题

```tsx
import { Users } from 'lucide-react';

<GenericReferenceDialog<User>
  show={show}
  onClose={onClose}
  title="用户列表"
  subtitle={`共 ${users.length} 位用户`}
  icon={<Users className="h-5 w-5 text-purple-600" />}
  items={users}
  renderItem={renderUserItem}
/>
```

### 自定义空状态

```tsx
<GenericReferenceDialog<User>
  show={show}
  onClose={onClose}
  title="用户列表"
  items={users}
  renderItem={renderUserItem}
  emptyState={{
    icon: <Users className="h-16 w-16 text-gray-400" />,
    title: '暂无用户',
    description: '当前还没有添加任何用户'
  }}
/>
```

### 启用虚拟滚动

```tsx
const [page, setPage] = useState(1);
const [hasMore, setHasMore] = useState(true);

const handleLoadMore = () => {
  setPage(prev => prev + 1);
  fetchMoreData(page + 1);
};

<GenericReferenceDialog<User>
  show={show}
  onClose={onClose}
  title="用户列表"
  items={users}
  renderItem={renderUserItem}
  enableVirtualScroll={true}
  pageSize={20}
  onLoadMore={handleLoadMore}
  hasMore={hasMore}
/>
```

### 响应式布局

```tsx
<GenericReferenceDialog<User>
  show={show}
  onClose={onClose}
  title="用户列表"
  items={users}
  renderItem={renderUserItem}
  maxWidth="lg"  // sm, md, lg, xl, 2xl, 3xl, 4xl, 5xl, full
  maxHeight="600px"
/>
```

## 实际应用示例：数据映射引用列表

```tsx
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Link2, FileText, ArrowRight } from 'lucide-react';
import GenericReferenceDialog from './GenericReferenceDialog';

interface MappingConfig {
  id: string;
  name: string;
  sourceDatabaseId: string;
  // ... 其他字段
}

export default function MappingReferenceList({
  show,
  onClose,
  databaseId,
  databaseName
}: {
  show: boolean;
  onClose: () => void;
  databaseId: string;
  databaseName?: string;
}) {
  const router = useRouter();
  const [mappings, setMappings] = useState<MappingConfig[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (show && databaseId) {
      fetchMappings();
    }
  }, [show, databaseId]);

  const fetchMappings = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/mappings');
      const data = await response.json();

      if (data.success) {
        const filteredMappings = data.data.filter(
          (mapping: MappingConfig) => mapping.sourceDatabaseId === databaseId
        );
        setMappings(filteredMappings);
      }
    } catch (err) {
      console.error('Error fetching mappings:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleMappingClick = (mapping: MappingConfig) => {
    router.push(`/mappings/edit/${mapping.id}`);
    onClose();
  };

  const renderMappingItem = (mapping: MappingConfig) => (
    <div className="group flex items-center gap-4 rounded-xl border border-gray-200 bg-white p-4 transition-all hover:border-purple-300 hover:shadow-md dark:border-gray-700 dark:bg-gray-800/50 dark:hover:border-purple-700">
      <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-blue-100 dark:bg-blue-900/20">
        <FileText className="h-6 w-6 text-blue-600 dark:text-blue-400" />
      </div>

      <div className="flex min-w-0 flex-1">
        <div className="min-w-0 flex-1">
          <h4 className="truncate text-sm font-semibold text-gray-900 dark:text-white">
            {mapping.name}
          </h4>
        </div>

        <div className="flex items-center gap-2 opacity-0 transition-opacity group-hover:opacity-100">
          <span className="text-xs text-purple-600 dark:text-purple-400">
            查看详情
          </span>
          <ArrowRight className="h-4 w-4 text-purple-600 dark:text-purple-400" />
        </div>
      </div>
    </div>
  );

  return (
    <GenericReferenceDialog<MappingConfig>
      show={show}
      onClose={onClose}
      title="数据映射引用"
      subtitle={`${databaseName || '数据源'} · ${mappings.length} 个映射`}
      icon={<Link2 className="h-5 w-5 text-purple-600 dark:text-purple-400" />}
      items={mappings}
      loading={loading}
      renderItem={renderMappingItem}
      onItemClick={handleMappingClick}
      emptyState={{
        icon: <Link2 className="h-16 w-16" />,
        title: '暂无数据映射',
        description: '该数据源尚未被任何数据映射引用'
      }}
      maxHeight="500px"
      maxWidth="2xl"
      closeOnOverlayClick={true}
    />
  );
}
```

## 最佳实践

1. **类型安全**：始终使用 TypeScript 泛型来确保类型安全
   ```tsx
   <GenericReferenceDialog<User> ... />
   ```

2. **性能优化**：对于大型数据集，启用虚拟滚动
   ```tsx
   enableVirtualScroll={true}
   ```

3. **用户体验**：提供有意义的空状态和加载状态
   ```tsx
   emptyState={{ ... }}
   loading={true}
   ```

4. **响应式设计**：根据内容选择合适的最大宽度
   ```tsx
   maxWidth="lg"  // 适合移动端
   maxWidth="2xl" // 适合桌面端
   ```

5. **可访问性**：为关闭按钮提供 aria-label
   ```tsx
   <button aria-label="关闭">...</button>
   ```

## 组件设计原则

- **低耦合**：组件不依赖具体业务逻辑，只负责展示和交互
- **高内聚**：所有对话框相关的功能都在一个组件中
- **可复用**：通过 props 实现高度自定义
- **类型安全**：使用 TypeScript 泛型确保类型正确
- **响应式**：支持不同屏幕尺寸的适配
- **可扩展**：支持虚拟滚动等高级功能

## 注意事项

1. 确保 `renderItem` 返回的元素有适当的点击区域
2. 使用 `onItemClick` 处理列表项点击事件
3. 对于大量数据，建议启用虚拟滚动
4. 关闭对话框时记得清理相关状态
5. 确保所有必需的 props 都已提供