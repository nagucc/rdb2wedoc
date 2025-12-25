import { NextRequest, NextResponse } from 'next/server';
import { fieldMappingService } from '@/lib/services/field-mapping.service';
import { Logger } from '@/lib/utils/helpers';

// 获取映射预览
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { databaseId, documentId, tableName, sheetId, mappings, limit } = body;

    if (!databaseId || !documentId || !tableName || !sheetId || !mappings) {
      return NextResponse.json(
        { success: false, error: '缺少必要参数' },
        { status: 400 }
      );
    }

    // 获取映射预览
    const preview = await fieldMappingService.getMappingPreview(
      databaseId,
      documentId,
      tableName,
      sheetId,
      mappings,
      limit || 10
    );

    return NextResponse.json({
      success: true,
      data: preview
    });
  } catch (error) {
    Logger.error('获取映射预览失败', { error: (error as Error).message });
    return NextResponse.json(
      { success: false, error: '获取预览失败' },
      { status: 500 }
    );
  }
}
