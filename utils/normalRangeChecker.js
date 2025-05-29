const normalRanges = {
    temperature: { min: 36.1, max: 37.2, unit: '°C' },
    heartRate: { min: 60, max: 100, unit: 'bpm' },
    bloodPressure: {
      systolic: { min: 90, max: 120 },
      diastolic: { min: 60, max: 80 },
      unit: 'mmHg'
    },
    respiratoryRate: { min: 12, max: 20, unit: 'breaths/min' },
    oxygenSaturation: { min: 95, max: 100, unit: '%' },
    bloodSugar: { 
      fasting: { min: 70, max: 100, unit: 'mg/dL' },
      nonFasting: { min: 70, max: 140, unit: 'mg/dL' }
    }
  };
  
  const checkNormalRange = (type, value, options = {}) => {
    if (!normalRanges[type]) return { isNormal: true, range: 'N/A' };
  
    if (type === 'bloodPressure') {
      const systolicNormal = value.systolic >= normalRanges.bloodPressure.systolic.min && 
                            value.systolic <= normalRanges.bloodPressure.systolic.max;
      const diastolicNormal = value.diastolic >= normalRanges.bloodPressure.diastolic.min && 
                             value.diastolic <= normalRanges.bloodPressure.diastolic.max;
      
      return {
        isNormal: systolicNormal && diastolicNormal,
        range: `${normalRanges.bloodPressure.systolic.min}-${normalRanges.bloodPressure.systolic.max}/${normalRanges.bloodPressure.diastolic.min}-${normalRanges.bloodPressure.diastolic.max} ${normalRanges.bloodPressure.unit}`,
        systolicNormal,
        diastolicNormal
      };
    }
  
    if (type === 'bloodSugar') {
      const range = options.fasting ? normalRanges.bloodSugar.fasting : normalRanges.bloodSugar.nonFasting;
      const isNormal = value >= range.min && value <= range.max;
      
      return {
        isNormal,
        range: `${range.min}-${range.max} ${range.unit}`,
        isFasting: options.fasting
      };
    }
  
    const range = normalRanges[type];
    const isNormal = value >= range.min && value <= range.max;
  
    return {
      isNormal,
      range: `${range.min}-${range.max} ${range.unit}`
    };
  };
  
  module.exports = { checkNormalRange };