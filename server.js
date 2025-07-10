const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const morgan = require('morgan');
const helmet = require('helmet');
const cors = require('./config/cors');
const path = require('path');
const corsMiddleware = require('./middlewares/corsMiddleware');
const cookieParser = require('cookie-parser');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const hpp = require('hpp');
const compression = require('compression');
const rateLimit = require('express-rate-limit');

// Load environment variables
dotenv.config({ path: './.env' });

// Initialize Express app
const app = express();

// Security: Set HTTP headers
app.use(helmet());

// Logging (only in development)
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Rate limiting
const limiter = rateLimit({
  max: process.env.RATE_LIMIT_MAX || 100,
  windowMs: process.env.RATE_LIMIT_WINDOW_MS || 60 * 60 * 1000,
  message: 'Too many requests from this IP, please try again in an hour!',
});
app.use('/api', limiter);

// Body parsing
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// Cookie parser
app.use(cookieParser());

// CORS
app.use(cors);
app.use(corsMiddleware);

// Data sanitization
app.use(mongoSanitize());
app.use(xss());

// Prevent HTTP parameter pollution
app.use(hpp());

// Compression
app.use(compression());

// Add this before your static file middleware
app.use((req, res, next) => {
  if (req.url.endsWith('.avif')) {
    res.set('Content-Type', 'image/avif');
  }
  next();
});
// Static files
app.use('/api/uploads', express.static(path.join(__dirname, 'uploads'), {
  setHeaders: (res) => {
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Cross-Origin-Resource-Policy', 'cross-origin');
    res.set('Access-Control-Expose-Headers', 'Content-Length');
    res.set('Content-Type', 'image/*'); // Add proper content type
  }
}));
// Request logger
app.use((req, res, next) => {
  console.log('Incoming request:', req.method, req.originalUrl);
  next();
});

// Audit log middleware (MOVED HERE AFTER app is initialized)
const auditLogMiddleware = require('./middlewares/auditLogMiddleware');
app.use(auditLogMiddleware);

// Routes
const setupRoutes = require('./routes/setupRoutes');
const authRoutes = require('./routes/authRoutes');
const adminRoutes = require('./routes/adminRoutes');
const patientRoutes = require('./routes/patientRoutes');
const appointmentRoutes = require('./routes/appointmentRoutes');
const doctorRoutes = require('./routes/doctorRoutes');
const labOrderRoutes = require('./routes/labOrderRoutes');
const labReportRoutes = require('./routes/labReportRoutes');
const prescriptionRoutes = require('./routes/prescriptionRoutes');
const billingRoutes = require('./routes/billingRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const medicalReportRoutes = require('./routes/medicalReportRoutes');
const reportRoutes = require('./routes/reportRoutes');
const settingRoutes = require('./routes/settingRoutes');
const labTestRoutes = require('./routes/labTestRoutes');
const vitalSignsRoutes = require('./routes/vitalSignsRoutes');
const medicalHistoryRoutes = require('./routes/medicalHistoryRoutes');
const consultationRoutes = require('./routes/consultationRoutes');
const labTestCatalogRoutes = require('./routes/labTestCatalogRoutes');
const procedureCodeRoutes = require('./routes/procedureCodeRoutes')
const patientProcedureRoutes = require('./routes/patientProcedureRoutes')
const diagnosticRoutes = require('./routes/diagnosticRoutes');
const labPaymentRoutes = require('./routes/labPaymentRoutes');



app.use('/api/setup', setupRoutes);
app.use('/api/auth', authRoutes);
console.log('Auth routes mounted at /api/auth');
app.use('/api/admin', adminRoutes);
app.use('/api/patients', patientRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/doctors', doctorRoutes);
app.use('/api/lab-orders', labOrderRoutes);
app.use('/api/lab-reports', labReportRoutes);
app.use('/api/prescriptions', prescriptionRoutes);
app.use('/api/billings', billingRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/medical-reports', medicalReportRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/settings', settingRoutes);
app.use('/api/lab-tests', labTestRoutes);
app.use('/api/vitalSigns', vitalSignsRoutes);
app.use('/api/medicalHistory', medicalHistoryRoutes);
app.use('/api/consultations', consultationRoutes);
app.use('/api/lab-tests/catalog', labTestCatalogRoutes);
app.use('/api/procedure-codes', procedureCodeRoutes);
app.use('/api/patient-procedures', patientProcedureRoutes);
app.use('/api/diagnostics', diagnosticRoutes);
app.use('/api/lab-payments', labPaymentRoutes);


// Handle unhandled routes
const AppError = require('./utils/appError');
app.all('*', (req, res, next) => {
  next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404));
});

// Global error handling middleware
const errorHandler = require('./middlewares/errorMiddleware');
app.use(errorHandler);

// Database connection
const DB = process.env.MONGODB_URI.replace(
  '<PASSWORD>',
  process.env.MONGODB_PASSWORD
);

mongoose
  .connect(DB, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log('DB connection successful!'));

// Start the server
const port = process.env.PORT || 5000;
const server = app.listen(port, () => {
  console.log(`App running on port ${port}...`);
});

// Graceful shutdown for unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.log('UNHANDLED REJECTION! 💥 Shutting down...');
  console.log(err.name, err.message);
  server.close(() => {
    process.exit(1);
  });
});

// Graceful shutdown for uncaught exceptions
process.on('uncaughtException', (err) => {
  console.log('UNCAUGHT EXCEPTION! 💥 Shutting down...');
  console.log(err.name, err.message);
  server.close(() => {
    process.exit(1);
  });
});

module.exports = app;
