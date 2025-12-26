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
    const { name, sourceType, sourceName, targetType, targetName, fieldMappings, status } = body;
    
    if (!name || !sourceType || !sourceName || !targetType || !targetName || !fieldMappings) {
      return NextResponse.json(
        { success: false, error: '缺少必要参数：名称、源类型、源名称、目标类型、目标名称和字段映射' },
        { status: 400 }
      );
    }
    
    const newMapping = {
      id: `mapping_${Date.now()}`,
      name,
      sourceType,
      sourceName,
      targetType,
      targetName,
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

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, name, sourceType, sourceName, targetType, targetName, fieldMappings, status } = body;
    
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
      sourceType: sourceType || existingMapping.sourceType,
      sourceName: sourceName || existingMapping.sourceName,
      targetType: targetType || existingMapping.targetType,
      targetName: targetName || existingMapping.targetName,
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