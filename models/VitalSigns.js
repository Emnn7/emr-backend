const mongoose = require('mongoose');

const vitalSignsSchema = new mongoose.Schema({
  patient: {
    type: mongoose.Schema.ObjectId,
    ref: 'Patient',
    required: [true, 'Vital signs must belong to a patient']
  },
  appointment: {
    type: mongoose.Schema.ObjectId,
    ref: 'Appointment'
  },
  temperature: {
    value: {
      type: Number,
      min: [30, 'Temperature must be above 30°C'],
      max: [45, 'Temperature must be below 45°C']
    },
    unit: {
      type: String,
      default: '°C'
    }
  },
  heartRate: {
    value: {
      type: Number,
      min: [30, 'Heart rate must be above 30 bpm'],
      max: [200, 'Heart rate must be below 200 bpm']
    },
    unit: {
      type: String,
      default: 'bpm'
    }
  },
  bloodPressure: {
    systolic: {
      type: Number,
      min: [70, 'Systolic must be above 70 mmHg'],
      max: [200, 'Systolic must be below 200 mmHg']
    },
    diastolic: {
      type: Number,
      min: [40, 'Diastolic must be above 40 mmHg'],
      max: [120, 'Diastolic must be below 120 mmHg']
    },
    unit: {
      type: String,
      default: 'mmHg'
    }
  },
  respiratoryRate: {
    value: {
      type: Number,
      min: [10, 'Respiratory rate must be above 10 breaths/min'],
      max: [40, 'Respiratory rate must be below 40 breaths/min']
    },
    unit: {
      type: String,
      default: 'breaths/min'
    }
  },
  oxygenSaturation: {
    value: {
      type: Number,
      min: [70, 'Oxygen saturation must be above 70%'],
      max: [100, 'Oxygen saturation must be below 100%']
    },
    unit: {
      type: String,
      default: '%'
    }
  },
  height: {
    value: {
      type: Number,
      min: [50, 'Height must be above 50 cm'],
      max: [250, 'Height must be below 250 cm']
    },
    unit: {
      type: String,
      default: 'cm'
    }
  },
  weight: {
    value: {
      type: Number,
      min: [2, 'Weight must be above 2 kg'],
      max: [200, 'Weight must be below 200 kg']
    },
    unit: {
      type: String,
      default: 'kg'
    }
  },
  bmi: {
    value: {
      type: Number,
      min: [10, 'BMI must be above 10'],
      max: [50, 'BMI must be below 50']
    },
    classification: {
      type: String,
      enum: [
        'Underweight',
        'Normal weight',
        'Overweight',
        'Obese Class I',
        'Obese Class II',
        'Obese Class III'
      ]
    }
  },
  bloodSugar: {
    value: {
      type: Number,
      min: [50, 'Blood sugar must be above 50 mg/dL'],
      max: [500, 'Blood sugar must be below 500 mg/dL']
    },
    unit: {
      type: String,
      default: 'mg/dL'
    },
    fasting: {
      type: Boolean,
      default: false
    }
  },
  recordedBy: {
    type: mongoose.Schema.ObjectId,
    ref: 'LabAssistant',
    required: [true, 'Please provide lab assistant ID']
  },
  notes: {
    type: String,
    trim: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

vitalSignsSchema.pre('save', function(next) {
  // Calculate BMI if height and weight are provided
  if (this.height && this.height.value && this.weight && this.weight.value) {
    const heightInMeters = this.height.value / 100;
    this.bmi = {
      value: parseFloat(
        (this.weight.value / (heightInMeters * heightInMeters)).toFixed(1)
      )
    };

    // Classify BMI
    if (this.bmi.value < 18.5) {
      this.bmi.classification = 'Underweight';
    } else if (this.bmi.value >= 18.5 && this.bmi.value < 25) {
      this.bmi.classification = 'Normal weight';
    } else if (this.bmi.value >= 25 && this.bmi.value < 30) {
      this.bmi.classification = 'Overweight';
    } else if (this.bmi.value >= 30 && this.bmi.value < 35) {
      this.bmi.classification = 'Obese Class I';
    } else if (this.bmi.value >= 35 && this.bmi.value < 40) {
      this.bmi.classification = 'Obese Class II';
    } else {
      this.bmi.classification = 'Obese Class III';
    }
  }
  next();
});

vitalSignsSchema.pre(/^find/, function(next) {
  this.populate({
    path: 'patient',
    select: 'firstName lastName phone dateOfBirth gender'
  }).populate({
    path: 'recordedBy',
    select: 'firstName lastName'
  });
  next();
});

const VitalSigns = mongoose.model('VitalSigns', vitalSignsSchema);

module.exports = VitalSigns;