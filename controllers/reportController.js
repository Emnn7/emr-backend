const Report = require('../models/Report');
const { generatePatientDemographicsReport } = require('../services/reportService');

exports.generateReport = async (req, res) => {
  try {
    const { type, startDate, endDate } = req.body;
    
    let reportData;
    switch(type) {
      case 'patientDemographics':
        reportData = await generatePatientDemographicsReport(startDate, endDate);
        break;
      case 'appointmentAnalysis':
        reportData = await generateAppointmentAnalysisReport(startDate, endDate);
        break;
      // Add other report types
      default:
        return res.status(400).json({ error: 'Invalid report type' });
    }

    const report = await Report.create({
      type,
      parameters: { startDate, endDate },
      generatedBy: req.user._id,
      data: reportData
    });

    res.json(report);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getReportHistory = async (req, res) => {
  try {
    const reports = await Report.find({ generatedBy: req.user._id })
      .sort('-createdAt');
    res.json(reports);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};