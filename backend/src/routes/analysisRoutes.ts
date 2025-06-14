import { Router } from 'express';
import { AnalysisController } from '../controllers/analysisController';
import { ReportController } from '../controllers/reportController';
import { rateLimiter } from '../middleware/rateLimiter';

const router = Router();
const analysisController = new AnalysisController();
const reportController = new ReportController();

router.post('/start', rateLimiter, analysisController.startAnalysis.bind(analysisController));
router.get('/history', analysisController.getAnalysisHistory.bind(analysisController));
router.get('/:id/status', analysisController.getAnalysisStatus.bind(analysisController));
router.get('/:id/pdf', reportController.generatePDFReport.bind(reportController));
router.get('/:id/csv', reportController.exportCSV.bind(reportController));
router.get('/:id/report', reportController.generatePDFReport.bind(reportController));
router.get('/:id/export', reportController.exportCSV.bind(reportController));
router.get('/:id/preview', reportController.getReportPreview.bind(reportController));
router.get('/:id', analysisController.getAnalysis.bind(analysisController));
router.delete('/:id', analysisController.deleteAnalysis.bind(analysisController));

export default router;