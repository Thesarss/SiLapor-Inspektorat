import { MetricsModel, Metric, FindingsCategory } from '../models/metrics.model';
import * as fs from 'fs';
import * as path from 'path';

const UPLOADS_DIR = path.join(__dirname, '../../uploads/metrics');

// Ensure uploads directory exists
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

export const MetricsService = {
  async getAllCategories(): Promise<FindingsCategory[]> {
    return MetricsModel.getAllCategories();
  },

  async uploadMetric(
    reportId: string,
    categoryId: string,
    title: string,
    description: string,
    findingNumber: string,
    severity: 'low' | 'medium' | 'high' | 'critical',
    file: Express.Multer.File,
    uploadedBy: string
  ): Promise<Metric> {
    // Validate category exists
    const category = await MetricsModel.getCategoryById(categoryId);
    if (!category) {
      throw new Error('Category not found');
    }

    // Save file
    const fileName = `${Date.now()}-${file.originalname}`;
    const filePath = path.join(UPLOADS_DIR, fileName);
    fs.writeFileSync(filePath, file.buffer);

    // Create metric record
    const metric = await MetricsModel.create(
      reportId,
      categoryId,
      title,
      description,
      findingNumber,
      severity,
      file.originalname,
      filePath,
      file.size,
      uploadedBy
    );

    return metric;
  },

  async getMetricsByReport(reportId: string): Promise<Metric[]> {
    return MetricsModel.findByReportId(reportId);
  },

  async getMetricsGroupedByCategory(reportId: string): Promise<Array<{
    category: FindingsCategory;
    metrics: Metric[];
  }>> {
    const categories = await MetricsModel.getAllCategories();
    const result = [];

    for (const category of categories) {
      const metrics = await MetricsModel.findByReportAndCategory(reportId, category.id);
      if (metrics.length > 0) {
        result.push({ category, metrics });
      }
    }

    return result;
  },

  async updateMetricStatus(
    metricId: string,
    status: 'open' | 'in_progress' | 'resolved' | 'closed'
  ): Promise<Metric | null> {
    return MetricsModel.updateStatus(metricId, status);
  },

  async deleteMetric(metricId: string): Promise<boolean> {
    const metric = await MetricsModel.findById(metricId);
    if (metric && metric.file_path) {
      try {
        fs.unlinkSync(metric.file_path);
      } catch (error) {
        console.error('Failed to delete file:', error);
      }
    }
    return MetricsModel.delete(metricId);
  },

  async downloadMetricFile(metricId: string): Promise<{ filePath: string; fileName: string } | null> {
    const metric = await MetricsModel.findById(metricId);
    if (!metric || !metric.file_path) {
      return null;
    }
    return {
      filePath: metric.file_path,
      fileName: metric.file_name || 'metric-file',
    };
  },

  async getMetricsStatistics(reportId: string) {
    return MetricsModel.getStatistics(reportId);
  },
};
