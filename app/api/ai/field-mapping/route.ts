import { NextRequest, NextResponse } from 'next/server';
import { aiMappingService } from '@/lib/services/ai-mapping.service';
import { DatabaseField, DocumentField } from '@/types';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { databaseFields, documentFields } = body;

    if (!databaseFields || !Array.isArray(databaseFields)) {
      return NextResponse.json(
        { success: false, error: '缺少或无效的databaseFields参数' },
        { status: 400 }
      );
    }

    if (!documentFields || !Array.isArray(documentFields)) {
      return NextResponse.json(
        { success: false, error: '缺少或无效的documentFields参数' },
        { status: 400 }
      );
    }

    if (databaseFields.length === 0) {
      return NextResponse.json(
        { success: false, error: '源数据库字段不能为空' },
        { status: 400 }
      );
    }

    if (documentFields.length === 0) {
      return NextResponse.json(
        { success: false, error: '目标文档字段不能为空' },
        { status: 400 }
      );
    }

    const mappings = await aiMappingService.suggestFieldMappings(
      databaseFields as DatabaseField[],
      documentFields as DocumentField[]
    );

    return NextResponse.json({
      success: true,
      data: mappings,
      message: `AI智能匹配成功，推荐了${mappings.length}个字段映射`
    });
  } catch (error) {
    console.error('AI字段映射失败', { error: (error as Error).message });
    
    const errorMessage = (error as Error).message;
    
    return NextResponse.json(
      { 
        success: false, 
        error: errorMessage,
        hint: '请检查config/config.json中的AI配置，确保apiKey已正确设置'
      },
      { status: 500 }
    );
  }
}
