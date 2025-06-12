import { Router } from 'express';
import { ReportController } from '../controllers/reportController';

const router = Router();
const reportController = new ReportController();

router.get('/:id/pdf', reportController.generatePDFReport.bind(reportController));
router.get('/:id/csv', reportController.exportCSV.bind(reportController));
router.get('/:id/preview', reportController.getReportPreview.bind(reportController));

export default router;