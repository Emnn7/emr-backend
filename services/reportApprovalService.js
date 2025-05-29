class ReportApprovalService {
    static async createRequest(receptionistId, patientId) {
      const request = await ReportRequest.create({
        patient: patientId,
        requestedBy: receptionistId,
        status: 'pending'
      });
      
      // Notify admin (implement your notification system)
      await Notification.create({
        recipient: 'admin',
        message: `New report request for patient ${patientId}`
      });
  
      return request;
    }
  }
  
  module.exports = ReportApprovalService;