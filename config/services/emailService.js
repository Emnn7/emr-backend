const nodemailer = require('nodemailer');
const pug = require('pug');
const htmlToText = require('html-to-text');
const path = require('path');

class Email {
  constructor(user, url) {
    this.to = user.email;
    this.firstName = user.firstName;
    this.lastName = user.lastName;
    this.url = url;
    this.from = `EMR System <${process.env.EMAIL_FROM}>`;
  }

  newTransport() {
    if (process.env.NODE_ENV === 'production') {
      return nodemailer.createTransport({
        service: 'SendGrid',
        auth: {
          user: process.env.SENDGRID_USERNAME,
          pass: process.env.SENDGRID_PASSWORD
        }
      });
    }

    return nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: process.env.EMAIL_PORT,
      auth: {
        user: process.env.EMAIL_USERNAME,
        pass: process.env.EMAIL_PASSWORD
      }
    });
  }

  async send(template, subject) {
    const html = pug.renderFile(
      path.join(__dirname, `../views/email/${template}.pug`),
      {
        firstName: this.firstName,
        lastName: this.lastName,
        url: this.url,
        subject
      }
    );

    const mailOptions = {
      from: this.from,
      to: this.to,
      subject,
      html,
      text: htmlToText.fromString(html)
    };

    await this.newTransport().sendMail(mailOptions);
  }

  async sendWelcome() {
    await this.send('welcome', 'Welcome to the EMR System!');
  }

  async sendPasswordReset() {
    await this.send('passwordReset', 'Your password reset token (valid for only 10 minutes)');
  }
}

const sendAppointmentConfirmation = async ({
  patientEmail,
  patientName,
  doctorName,
  date,
  time,
  reason
}) => {
  const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT,
    auth: {
      user: process.env.EMAIL_USERNAME,
      pass: process.env.EMAIL_PASSWORD
    }
  });

  const mailOptions = {
    from: process.env.EMAIL_FROM,
    to: patientEmail,
    subject: 'Appointment Confirmation',
    html: `
      <h1>Appointment Confirmation</h1>
      <p>Dear ${patientName},</p>
      <p>Your appointment with Dr. ${doctorName} has been confirmed.</p>
      <p><strong>Date:</strong> ${new Date(date).toDateString()}</p>
      <p><strong>Time:</strong> ${time}</p>
      <p><strong>Reason:</strong> ${reason}</p>
      <p>Please arrive 15 minutes before your scheduled time.</p>
      <p>Thank you,</p>
      <p>EMR System</p>
    `
  };

  await transporter.sendMail(mailOptions);
};

const sendLabOrderNotification = async ({
  patientName,
  doctorName,
  tests,
  orderDate
}) => {
  const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT,
    auth: {
      user: process.env.EMAIL_USERNAME,
      pass: process.env.EMAIL_PASSWORD
    }
  });

  const mailOptions = {
    from: process.env.EMAIL_FROM,
    to: process.env.LAB_EMAIL || 'lab@example.com',
    subject: 'New Lab Order',
    html: `
      <h1>New Lab Order</h1>
      <p><strong>Patient:</strong> ${patientName}</p>
      <p><strong>Ordered by:</strong> Dr. ${doctorName}</p>
      <p><strong>Tests:</strong> ${tests}</p>
      <p><strong>Order Date:</strong> ${new Date(orderDate).toLocaleString()}</p>
      <p>Please process this order as soon as possible.</p>
      <p>Thank you,</p>
      <p>EMR System</p>
    `
  };

  await transporter.sendMail(mailOptions);
};

const sendPasswordReset = async ({ email, name, resetURL }) => {
  const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT,
    auth: {
      user: process.env.EMAIL_USERNAME,
      pass: process.env.EMAIL_PASSWORD
    }
  });

  const mailOptions = {
    from: process.env.EMAIL_FROM,
    to: email,
    subject: 'Your password reset token (valid for 10 min)',
    html: `
      <h1>Password Reset</h1>
      <p>Dear ${name},</p>
      <p>You have requested a password reset. Please click the link below to reset your password:</p>
      <p><a href="${resetURL}">${resetURL}</a></p>
      <p>This link is valid for 10 minutes only.</p>
      <p>If you didn't request this, please ignore this email.</p>
      <p>Thank you,</p>
      <p>EMR System</p>
    `
  };

  await transporter.sendMail(mailOptions);
};

module.exports = {
  Email,
  sendAppointmentConfirmation,
  sendLabOrderNotification,
  sendPasswordReset
};
