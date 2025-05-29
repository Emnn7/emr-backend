const Patient = require('../models/Patient');

exports.generatePatientDemographicsReport = async (startDate, endDate) => {
  const patients = await Patient.find({
    createdAt: { $gte: new Date(startDate), $lte: new Date(endDate) }
  });
  
  // Process data into report format
  const ageGroups = {
    '0-18': 0,
    '19-35': 0,
    '36-50': 0,
    '51+': 0
  };
  
  patients.forEach(patient => {
    const age = calculateAge(patient.dob);
    if (age <= 18) ageGroups['0-18']++;
    else if (age <= 35) ageGroups['19-35']++;
    else if (age <= 50) ageGroups['36-50']++;
    else ageGroups['51+']++;
  });
  
  return {
    columns: ['Age Group', 'Count', 'Percentage'],
    rows: Object.entries(ageGroups).map(([group, count]) => ({
      'Age Group': group,
      'Count': count,
      'Percentage': `${Math.round((count / patients.length) * 100)}%`
    }))
  };
};