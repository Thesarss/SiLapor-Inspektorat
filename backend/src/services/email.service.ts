import nodemailer from 'nodemailer';
import { User, Report, FollowUp } from '../types';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

const EMAIL_FROM = process.env.EMAIL_FROM || 'noreply@example.com';

export const EmailService = {
  async sendReportNotification(user: User, report: Report): Promise<void> {
    const mailOptions = {
      from: EMAIL_FROM,
      to: user.email,
      subject: `[Pelaporan Evaluasi] Laporan Baru: ${report.title}`,
      html: `
        <h2>Laporan Permasalahan Baru</h2>
        <p>Halo ${user.name},</p>
        <p>Anda telah ditugaskan untuk menindaklanjuti laporan berikut:</p>
        <div style="background: #f5f5f5; padding: 15px; border-radius: 5px; margin: 15px 0;">
          <h3>${report.title}</h3>
          <p>${report.description}</p>
        </div>
        <p>Silakan login ke sistem untuk memberikan tindak lanjut.</p>
        <p>Terima kasih.</p>
      `,
    };

    await transporter.sendMail(mailOptions);
  },

  async sendApprovalNotification(user: User, followUp: FollowUp): Promise<void> {
    const mailOptions = {
      from: EMAIL_FROM,
      to: user.email,
      subject: '[Pelaporan Evaluasi] Tindak Lanjut Disetujui',
      html: `
        <h2>Tindak Lanjut Disetujui</h2>
        <p>Halo ${user.name},</p>
        <p>Tindak lanjut Anda telah disetujui oleh admin.</p>
        ${followUp.admin_notes ? `
        <div style="background: #e8f5e9; padding: 15px; border-radius: 5px; margin: 15px 0;">
          <strong>Catatan Admin:</strong>
          <p>${followUp.admin_notes}</p>
        </div>
        ` : ''}
        <p>Terima kasih atas kerjasamanya.</p>
      `,
    };

    await transporter.sendMail(mailOptions);
  },

  async sendRejectionNotification(
    user: User,
    followUp: FollowUp,
    reason: string
  ): Promise<void> {
    const mailOptions = {
      from: EMAIL_FROM,
      to: user.email,
      subject: '[Pelaporan Evaluasi] Tindak Lanjut Ditolak',
      html: `
        <h2>Tindak Lanjut Ditolak</h2>
        <p>Halo ${user.name},</p>
        <p>Tindak lanjut Anda telah ditolak oleh admin dengan alasan berikut:</p>
        <div style="background: #ffebee; padding: 15px; border-radius: 5px; margin: 15px 0;">
          <strong>Alasan Penolakan:</strong>
          <p>${reason}</p>
        </div>
        <p>Silakan login ke sistem untuk memperbaiki dan mengirim ulang tindak lanjut Anda.</p>
        <p>Terima kasih.</p>
      `,
    };

    await transporter.sendMail(mailOptions);
  },
};
