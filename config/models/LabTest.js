const mongoose = require('mongoose');

const labTestSchema = new mongoose.Schema({
  testName: { 
    type: String, 
    required: true,
   enum: [
  // Hematology Tests
  'CBC', 
  'Peripheral Blood Smear',
  'Reticulocyte Count',
  'Erythrocyte Sedimentation Rate (ESR)', 
  'Prothrombin Time (PT)', 
  'International Normalized Ratio (INR)',
  'Activated Partial Thromboplastin Time (aPTT)', 
  'Fibrinogen', 
  'D-dimer', 
  'Platelet Function Tests',
  'Hemoglobin Electrophoresis', 
  'Sickle Cell Screening',

  // Clinical Chemistry Tests
  'Basic Metabolic Panel (BMP)', 
  'Comprehensive Metabolic Panel (CMP)', 
  'Lipid Panel', 
  'Liver Function Tests (LFT)', 
  'Total Bilirubin', 
  'Direct Bilirubin',
  'Alkaline Phosphatase (ALP)', 
  'Alanine Aminotransferase (ALT)', 
  'Aspartate Aminotransferase (AST)', 
  'Calcium', 

  // Kidney Function
  'Blood Urea Nitrogen (BUN)', 
  'Creatinine', 

  // Endocrinology Tests
  'Thyroid Panel', 
  'Thyroid Stimulating Hormone (TSH)', 
  'Free T3', 
  'Free T4', 
  'Thyroid Antibodies',

  // Glucose and Metabolism
  'Blood Glucose', 
  'Hemoglobin A1c', 
  'Oral Glucose Tolerance Test (OGTT)',

  // Urinary Tests
  'Urinalysis', 
  'Urine Culture', 
  'Urine Pregnancy Test', 
  'Urine Protein', 

  // Lipid & Cardiovascular Tests
  'LDL Cholesterol', 
  'HDL Cholesterol', 
  'Triglycerides', 
  'Total Cholesterol', 

  // Infectious Disease Tests
  'HIV Test', 
  'Hepatitis B Surface Antigen', 
  'Hepatitis C Antibody', 
  'Tuberculosis (TB) Test', 
  'Streptococcus Test', 

  // Cancer Screening Tests
  'Prostate-Specific Antigen (PSA)', 
  'Pap Smear', 
  'Mammogram', 
  'Colonoscopy', 

  // Miscellaneous Tests
  'Vitamin D', 
  'Iron Studies', 
  'Vitamin B12', 
  'Folate', 
  'C-Reactive Protein (CRP)', 
  'Antinuclear Antibody (ANA)', 
  'Lactate Dehydrogenase (LDH)', 
  'Creatine Kinase (CK)', 
  'Arterial Blood Gas (ABG)', 
  'Ferritin', 
  'D-dimer'
]
  },
  result: { type: String, required: true },
  unit: { type: String, required: true },
  normalRange: { type: String, required: true },
  interpretation: { type: String },
  dateOfTest: { type: Date, default: Date.now },
  performedBy: { type: String },
  patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('LabTest', labTestSchema);