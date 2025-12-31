import { NextRequest, NextResponse } from 'next/server';
import { 
  getMappings, 
  getMappingById, 
  saveMapping, 
  deleteMapping,
  updateMappingStatus 
} from '@/lib/config/storage';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const mappingId = searchParams.get('id');
    
    if (mappingId) {
      const mapping = getMappingById(mappingId);
      
      if (!mapping) {
        return NextResponse.json(
          { success: false, error: '映射配置不存在' },
          { status: 404 }
        );
      }
      
      return NextResponse.json({
        success: true,
        data: mapping
      });
    }
    
    const mappings = getMappings();
    
    return NextResponse.json({
      success: true,
      data: mappings
    });
  } catch (error) {
    console.error('获取映射配置失败', { error: (error as Error).message });
    return NextResponse.json(
      { success: false, error: '获取映射配置失败' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, sourceDatabaseId, sourceTableName, targetDocId, targetSheetId, fieldMappings, status } = body;
    
    if (!name || !sourceDatabaseId || !sourceTableName || !targetDocId || !targetSheetId || !fieldMappings) {
      return NextResponse.json(
        { success: false, error: '缺少必要参数：名称、源数据库ID、源表名、目标文档ID、目标工作表ID和字段映射' },
        { status: 400 }
      );
    }

    if (typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: '映射名称不能为空' },
        { status: 400 }
      );
    }

    if (typeof sourceDatabaseId !== 'string' || sourceDatabaseId.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: '源数据库ID不能为空' },
        { status: 400 }
      );
    }

    if (typeof sourceTableName !== 'string' || sourceTableName.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: '源表名不能为空' },
        { status: 400 }
      );
    }

    if (typeof targetDocId !== 'string' || targetDocId.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: '目标文档ID不能为空' },
        { status: 400 }
      );
    }

    if (typeof targetSheetId !== 'string' || targetSheetId.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: '目标工作表ID不能为空' },
        { status: 400 }
      );
    }

    if (!Array.isArray(fieldMappings) || fieldMappings.length === 0) {
      return NextResponse.json(
        { success: false, error: '字段映射必须是非空数组' },
        { status: 400 }
      );
    }

    const validStatuses = ['draft', 'active', 'inactive'];
    if (status && !validStatuses.includes(status)) {
      return NextResponse.json(
        { success: false, error: `无效的状态：${status}，必须是 ${validStatuses.join(', ')} 之一` },
        { status: 400 }
      );
    }

    const sourceFieldSet = new Set<string>();
    const targetFieldSet = new Set<string>();

    for (let i = 0; i < fieldMappings.length; i++) {
      const mapping = fieldMappings[i];

      if (!mapping.sourceField || typeof mapping.sourceField !== 'string' || mapping.sourceField.trim().length === 0) {
        return NextResponse.json(
          { success: false, error: `第 ${i + 1} 个字段映射的源字段不能为空` },
          { status: 400 }
        );
      }

      if (!mapping.targetField || typeof mapping.targetField !== 'string' || mapping.targetField.trim().length === 0) {
        return NextResponse.json(
          { success: false, error: `第 ${i + 1} 个字段映射的目标字段不能为空` },
          { status: 400 }
        );
      }

      const sourceField = mapping.sourceField.trim();
      const targetField = mapping.targetField.trim();

      if (sourceFieldSet.has(sourceField)) {
        return NextResponse.json(
          { success: false, error: `源字段 "${sourceField}" 被重复映射` },
          { status: 400 }
        );
      }
      sourceFieldSet.add(sourceField);

      if (targetFieldSet.has(targetField)) {
        return NextResponse.json(
          { success: false, error: `目标字段 "${targetField}" 被重复映射` },
          { status: 400 }
        );
      }
      targetFieldSet.add(targetField);

      const validDataTypes = ['string', 'number', 'date', 'boolean', 'json'];
      if (!mapping.dataType || !validDataTypes.includes(mapping.dataType)) {
        return NextResponse.json(
          { success: false, error: `第 ${i + 1} 个字段映射的数据类型无效，必须是 ${validDataTypes.join(', ')} 之一` },
          { status: 400 }
        );
      }

      if (mapping.transformRule) {
        const validTransforms = ['trim', 'toUpperCase', 'toLowerCase', 'toDate', 'toNumber', 'toString', 'toBoolean'];
        if (!validTransforms.includes(mapping.transformRule)) {
          return NextResponse.json(
            { success: false, error: `第 ${i + 1} 个字段映射的转换规则 "${mapping.transformRule}" 无效` },
            { status: 400 }
          );
        }
      }

      if (mapping.defaultValue) {
        if (!validateDefaultValue(mapping.defaultValue, mapping.dataType)) {
          return NextResponse.json(
            { success: false, error: `第 ${i + 1} 个字段映射的默认值 "${mapping.defaultValue}" 不符合数据类型 ${mapping.dataType} 的要求` },
            { status: 400 }
          );
        }
      }
    }
    
    const newMapping = {
      id: `mapping_${Date.now()}`,
      name,
      sourceDatabaseId,
      sourceTableName,
      targetDocId,
      targetSheetId,
      fieldMappings,
      status: status || 'draft',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    const saved = saveMapping(newMapping);
    
    if (!saved) {
      return NextResponse.json(
        { success: false, error: '保存映射配置失败' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({
      success: true,
      data: newMapping,
      message: '映射配置创建成功'
    });
  } catch (error) {
    console.error('创建映射配置失败', { error: (error as Error).message });
    return NextResponse.json(
      { success: false, error: '创建映射配置失败' },
      { status: 500 }
    );
  }
}

function validateDefaultValue(value: string, dataType: string): boolean {
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
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, name, sourceDatabaseId, sourceTableName, targetDocId, targetSheetId, fieldMappings, status } = body;
    
    if (!id) {
      return NextResponse.json(
        { success: false, error: '缺少映射ID' },
        { status: 400 }
      );
    }
    
    const existingMapping = getMappingById(id);
    
    if (!existingMapping) {
      return NextResponse.json(
        { success: false, error: '映射配置不存在' },
        { status: 404 }
      );
    }
    
    const updatedMapping = {
      ...existingMapping,
      name: name || existingMapping.name,
      sourceDatabaseId: sourceDatabaseId || existingMapping.sourceDatabaseId,
      sourceTableName: sourceTableName || existingMapping.sourceTableName,
      targetDocId: targetDocId || existingMapping.targetDocId,
      targetSheetId: targetSheetId || existingMapping.targetSheetId,
      fieldMappings: fieldMappings || existingMapping.fieldMappings,
      status: status !== undefined ? status : existingMapping.status,
      updatedAt: new Date().toISOString()
    };
    
    const saved = saveMapping(updatedMapping);
    
    if (!saved) {
      return NextResponse.json(
        { success: false, error: '更新映射配置失败' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({
      success: true,
      data: updatedMapping,
      message: '映射配置更新成功'
    });
  } catch (error) {
    console.error('更新映射配置失败', { error: (error as Error).message });
    return NextResponse.json(
      { success: false, error: '更新映射配置失败' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const mappingId = searchParams.get('id');
    
    if (!mappingId) {
      return NextResponse.json(
        { success: false, error: '缺少映射ID' },
        { status: 400 }
      );
    }
    
    const deleted = deleteMapping(mappingId);
    
    if (!deleted) {
      return NextResponse.json(
        { success: false, error: '删除映射配置失败' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({
      success: true,
      message: '映射配置删除成功'
    });
  } catch (error) {
    console.error('删除映射配置失败', { error: (error as Error).message });
    return NextResponse.json(
      { success: false, error: '删除映射配置失败' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, status } = body;
    
    if (!id || !status) {
      return NextResponse.json(
        { success: false, error: '缺少映射ID或状态' },
        { status: 400 }
      );
    }
    
    const updated = updateMappingStatus(id, status);
    
    if (!updated) {
      return NextResponse.json(
        { success: false, error: '更新映射状态失败' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({
      success: true,
      message: '映射状态更新成功'
    });
  } catch (error) {
    console.error('更新映射状态失败', { error: (error as Error).message });
    return NextResponse.json(
      { success: false, error: '更新映射状态失败' },
      { status: 500 }
    );
  }
}