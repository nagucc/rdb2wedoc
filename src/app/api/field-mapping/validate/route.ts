import { NextRequest, NextResponse } from 'next/server';
import { fieldMappingService } from '@/lib/services/field-mapping.service';
import { Logger } from '@/lib/utils/helpers';

// 验证字段映射配置
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { databaseId, documentId, tableName, sheetId, mappings } = body;

    if (!databaseId || !documentId || !tableName || !sheetId || !mappings) {
      return NextResponse.json(
        { success: false, error: '缺少必要参数' },
        { status: 400 }
      );
    }

    // 获取数据库字段
    const databaseFields = await fieldMappingService.getDatabaseFields(
      databaseId,
      tableName
    );

    // 获取文档字段
    const documentFields = await fieldMappingService.getDocumentFields(
      documentId,
      sheetId
    );

    // 验证映射
    const validation = fieldMappingService.validateFieldMappings(
      mappings,
      databaseFields,
      documentFields
    );

    return NextResponse.json({
      success: true,
      data: validation
    });
  } catch (error) {
    Logger.error('验证字段映射失败', { error: (error as Error).message });
    return NextResponse.json(
      { success: false, error: '验证失败' },
      { status: 500 }
    );
  }
}
