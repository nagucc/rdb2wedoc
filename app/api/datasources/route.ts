import { NextResponse } from 'next/server';
import { dataSourceService } from '@/lib/services/datasource.service';
import { getDatabases } from '@/lib/config/storage';

export async function GET() {
  try {
    const connections = getDatabases();
    
    const allMetrics = await Promise.all(
      connections.map(async (conn) => {
        return await dataSourceService.getDataSourceMetrics(conn.id);
      })
    );

    const stats = await dataSourceService.getDataSourceStats();

    return NextResponse.json({
      success: true,
      data: {
        metrics: allMetrics,
        stats
      }
    });
  } catch (error) {
    console.error('Error fetching data source metrics:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch data source metrics'
      },
      { status: 500 }
    );
  }
}
